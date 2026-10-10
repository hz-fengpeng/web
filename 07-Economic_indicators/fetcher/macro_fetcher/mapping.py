"""指标 → akshare 接口的取数规则表。

这是整个抓取器的**口径说明书**：每个指标取哪个接口的哪一列、期间怎么读、
要不要换算、1—2 月怎么处理。规则用数据声明而不是散在代码里的 if，
理由很实际——口径错误不会报错，只会静默写进一个看起来合理的数
（把「指数 104.3」当成「4.3%」、把中间价的 674.11 当成 6.7411 的汇率）。

取数全部走 akshare（见 `sources/akshare_src.py` 说明为什么不再自己解析）。
但 **akshare 只负责把数据拿下来，不负责口径**：选哪一列、怎么换算、
1—2 月怎么合并，仍然是这里的判断。上游改了表结构时，
`sources/akshare_src.py` 会因为找不到列名而**报错**，不会静默读错列。

三张表分工：`RULES` 取上游的某一列，`DERIVED` 由已抓到的观测算出来，
`UNSOURCED` 是**拿不到**、但在库里如实写成 missing 空行的那些。

五条硬约束，由 `tests/test_mapping.py` 守着：

1. `RULES`、`UNSOURCED`、`DERIVED` 三者两两不相交，且并集**恰好**等于目录里
   全部 109 个指标（P0 23 / P1 38 / P2 48）。新指标加进 `indicators.ts`
   却忘了在这里登记，测试立刻变红——**不允许有指标悄悄消失**。
2. `UNSOURCED` 里的每一条都要写理由，且以 `(a)` / `(b)` / `(c)` 开头
   （上游不发布 / 渠道取不到 / 计算指标输入未齐）。没有理由的空白是
   「忘了配」，不是「没有源」。
3. 每条规则的 `period_from` 与 `transform` 必须是已登记的名字。
4. `RULES` 里不得是计算指标（`isDerived`）；`DERIVED` 里的必须是，
   而且它的输入都要有取数规则、同属一个上游。
5. `window_months` 非 0 的规则，参数模板里必须真的用到窗口参数。
"""

from __future__ import annotations

from dataclasses import dataclass

from .periods import KINDS
from .sources.akshare_src import PERIOD_READERS
from .transforms import TRANSFORMS

# ── 各源的取数定位方式 ────────────────────────────────────────────────


@dataclass(frozen=True)
class AkSpec:
    """一个 akshare 接口 + 定位到某一列的方式。

    ★ 为什么按**列名**定位而不是列序号：
    akshare 的中文列名（`'当月同比增长'`）在接口内部就是给人看的，改动会在
    报错里直接显形；而按序号取，上游插一列就会静默取到隔壁的字段——
    症状是「值看着还行但对不上公布稿」，最难查的一类错。
    """

    #: akshare 的函数名
    func: str
    #: 期间列的读法（`PERIOD_READERS` 里的名字）
    period_from: str
    #: 行式表：取这些**列**，顺序即 transform 的输入顺序
    columns: tuple[str, ...] = ()
    #: 转置表：取这一**行**（统计局通用接口专用）。与 columns 二选一。
    row_label: str = ''
    #: 期间所在的列名。行式表用；转置表的期间在列名上。
    period_column: str = '月份'
    #: 传给 akshare 的固定参数，值里可用 `{since}` / `{since_year}`
    kwargs: tuple[tuple[str, str], ...] = ()
    #: 行筛选：列名 → 期望值（比对前 strip）。用于一张表里多个口径。
    row_filter: tuple[str, str] | None = None
    transform: str = 'single'
    #: 该接口一次调用最多覆盖多少个月（0 = 一次调用返回全量）。
    #: 中债的收益率曲线单次最多给一年，超出就报错；这类接口按此长度切片、
    #: 逐段调用。参数模板里用 `{window_start}` / `{window_end}`
    #:（ISO）或 `{window_start_compact}` / `{window_end_compact}`（YYYYMMDD）。
    window_months: int = 0


# ── 1—2 月合并的口径 ──────────────────────────────────────────────────

#: 按月单独发布，1 月有独立值（1、2 月都有当月值）
MONTHLY = 'monthly'
#: 源把 1—2 月合并发布，合并值挂在 2 月；1 月没有观测
MERGED = 'merged'
#: 源对 1 月、2 月都不给当月值（合并值只出现在「累计」序列里）
GAP = 'gap'

JAN_FEB = (MONTHLY, MERGED, GAP)


@dataclass(frozen=True)
class Rule:
    """一个指标的完整取数规则。

    `source` 记的是**上游站点**而不是 `akshare`：akshare 只是搬运方式，
    数据实际来自东方财富 / 国家统计局 / 外汇局。界面的数据源页要展示的
    是这个区别，而 `fetch_log.source_id` 也用它。
    """

    source: str
    spec: AkSpec
    jan_feb: str = MONTHLY
    note: str = ''

    def __post_init__(self) -> None:
        if self.jan_feb not in JAN_FEB:
            raise ValueError(f'未登记的 1—2 月口径：{self.jan_feb}')


# ── 23 个 P0 指标 ────────────────────────────────────────────────────
#
# 表里的每条 note 都记着「为什么是这一列」，因为下一个要改这里的人
# 面对的是一堆看起来都能用的候选列。

RULES: dict[str, Rule] = {
    # ── 东方财富（数据中心，月度覆盖最全）────────────────────────────
    'cn.ind_prod.yoy': Rule(
        source='eastmoney',
        spec=AkSpec(
            func='macro_china_gyzjz',
            columns=('同比增长',),
            period_from='cn_month',
        ),
        jan_feb=GAP,
        note='规上工业增加值当月同比。★ 该表只有「同比增长」与「累计增长」两列，'
             '后者是年初至今累计值，不是当月值。统计局对 1、2 月都不给当月值'
             '（实测两列在这两个月都是 NaN），如实跳过，不拿累计值冒充。',
    ),
    'cn.cpi.yoy': Rule(
        source='eastmoney',
        spec=AkSpec(
            func='macro_china_cpi',
            columns=('全国-同比增长',),
            period_from='cn_month',
        ),
        note='全国居民消费价格当月同比。同表还有「全国-当月」（指数 100.8 的定基值）、'
             '「全国-累计」（累计同比），都不是这个指标要的。',
    ),
    'cn.ppi.yoy': Rule(
        source='eastmoney',
        spec=AkSpec(
            func='macro_china_ppi',
            columns=('当月同比增长',),
            period_from='cn_month',
        ),
        note='工业生产者出厂价格当月同比。★ 该表列名是「当月同比增长」，'
             '而 CPI 表叫「全国-同比增长」——两张表的命名习惯不同，别照抄。',
    ),
    'cn.pmi.mfg': Rule(
        source='eastmoney',
        spec=AkSpec(
            func='macro_china_pmi',
            columns=('制造业-指数',),
            period_from='cn_month',
        ),
        note='制造业 PMI，指数值（50 为荣枯线），单位「点」不是「%」。'
             '★ 与 cn.pmi.non_mfg 同表，适配器的调用缓存保证只抓一次。',
    ),
    'cn.pmi.non_mfg': Rule(
        source='eastmoney',
        spec=AkSpec(
            func='macro_china_pmi',
            columns=('非制造业-指数',),
            period_from='cn_month',
        ),
        note='非制造业商务活动指数，与制造业 PMI 同表不同列。',
    ),
    'cn.retail.cum_yoy': Rule(
        source='eastmoney',
        spec=AkSpec(
            func='macro_china_consumer_goods_retail',
            columns=('累计-同比增长',),
            period_from='cn_month',
        ),
        jan_feb=MERGED,
        note='社会消费品零售总额累计同比。同表「同比增长」是当月同比，'
             '「累计-同比增长」才是本指标要的。★ 1 月行根本不存在，'
             '2 月行的累计列就是 1—2 月合计。',
    ),
    'cn.trade.export_yoy': Rule(
        source='eastmoney',
        spec=AkSpec(
            func='macro_china_hgjck',
            columns=('当月出口额-同比增长',),
            period_from='cn_month',
        ),
        note='出口金额当月同比（海关口径，美元计价）。同表还有「累计出口额-同比增长」，'
             '那是年初至今累计，不是当月。',
    ),
    'cn.trade.balance': Rule(
        source='eastmoney',
        spec=AkSpec(
            func='macro_china_hgjck',
            columns=('当月出口额-金额', '当月进口额-金额'),
            period_from='cn_month',
            transform='exports_minus_imports_100m',
        ),
        note='贸易差额 = 出口 − 进口。★ 金额列单位是**千美元**，指标单位是**亿美元**，'
             '÷1e5。换算写在变换里并有单测，不在这里手工算。',
    ),
    'cn.m1.yoy': Rule(
        source='eastmoney',
        spec=AkSpec(
            func='macro_china_money_supply',
            columns=('货币(M1)-同比增长',),
            period_from='cn_month',
        ),
        note='M1 同比。★ 该表列名是带全角括号的「货币(M1)-同比增长」，'
             '写错括号会直接报「没有列」，这是好事。',
    ),
    'cn.m2.yoy': Rule(
        source='eastmoney',
        spec=AkSpec(
            func='macro_china_money_supply',
            columns=('货币和准货币(M2)-同比增长',),
            period_from='cn_month',
        ),
        note='M2 同比，与 M1 同表不同列。注意 M2 的列名写作「货币和准货币(M2)」。',
    ),
    'cn.loan.new': Rule(
        source='eastmoney',
        spec=AkSpec(
            func='macro_china_new_financial_credit',
            columns=('当月',),
            period_from='cn_month',
        ),
        note='当月新增人民币贷款，单位亿元，已是需求口径，无需换算。'
             '★ 同表还有「累计」（年初至今），不是这个指标。',
    ),
    'cn.lpr.1y': Rule(
        source='eastmoney',
        spec=AkSpec(
            func='macro_china_lpr',
            columns=('LPR1Y',),
            period_column='TRADE_DATE',
            period_from='iso_month',
        ),
        note='1 年期 LPR。★ 该表的期间列叫 `TRADE_DATE`，是**报价日**（每月 20 日），'
             '所以要读成月份而不是日期——否则日度与月度两种粒度会混进同一个指标。'
             '报价日仍用于推 released_at，见 releases.py。'
             '2019-08 之前该列是 NaN，由窗口过滤掉。',
    ),
    'cn.lpr.5y': Rule(
        source='eastmoney',
        spec=AkSpec(
            func='macro_china_lpr',
            columns=('LPR5Y',),
            period_column='TRADE_DATE',
            period_from='iso_month',
        ),
        note='5 年期以上 LPR，与 1 年期同表。注意同表另有 `RATE_1`/`RATE_2` 两列，'
             '那是 2019 年 LPR 改革前的贷款基准利率，**不是 LPR**，别取。',
    ),
    'cn.fx_reserve.level': Rule(
        source='eastmoney',
        spec=AkSpec(
            func='macro_china_fx_gold',
            columns=('国家外汇储备-数值',),
            period_from='cn_month',
        ),
        note='官方外汇储备，单位亿美元。同表还有黄金储备的数值/同比/环比三列，'
             '以及外汇储备的同比与环比，都不是这个指标。',
    ),
    'cn.fiscal.revenue_cum_yoy': Rule(
        source='eastmoney',
        spec=AkSpec(
            func='macro_china_czsr',
            columns=('累计-同比增长',),
            period_from='cn_month',
        ),
        jan_feb=MERGED,
        note='全国一般公共预算收入累计同比。财政收支 1—2 月合并发布，'
             '表里没有 1 月行，2 月行的累计列即合计数。',
    ),

    # ── 国家统计局 ──────────────────────────────────────────────────
    'cn.gdp.yoy': Rule(
        source='nbs',
        spec=AkSpec(
            func='macro_china_nbs_nation',
            row_label='国内生产总值指数(上年同期=100)当季值',
            period_from='cn_quarter',
            kwargs=(('kind', '季度数据'),
                    ('path', '国民经济核算 > 国内生产总值指数'),
                    ('period', '{since_year}-')),
            transform='index_minus_100',
        ),
        note='GDP 当季同比。★ 取「当季值」那一行，不是「_累计值」——'
             '同表两行并存且量级相同、走势相似，取错不会报错。'
             '指数需减 100（104.3 → 4.3%）。核对（2025Q1）：105.4 → 5.4%，'
             '与公布值一致。',
    ),
    'cn.unemp.rate': Rule(
        source='nbs',
        spec=AkSpec(
            func='macro_china_urban_unemployment',
            columns=('value',),
            period_column='date',
            period_from='compact_month',
            row_filter=('item', '全国城镇调查失业率'),
        ),
        note='全国城镇调查失业率。同一张表里还有 31 个大城市、分年龄段、'
             '分户籍的失业率，用 row_filter 取全国口径。'
             '★ 该表的 item 列带**尾随空格**（`\'全国城镇调查失业率 \'`），'
             '适配器比对前会 strip。',
    ),

    # ── 国家外汇管理局 ───────────────────────────────────────────────
    'cn.fx_rate.usd_cny': Rule(
        source='safe',
        spec=AkSpec(
            func='currency_boc_safe',
            columns=('美元',),
            period_column='日期',
            period_from='iso_day',
            transform='divide_100',
        ),
        note='人民币兑美元中间价。★ 该表有 26 个币种列，取「美元」；'
             '数值是 673.67 这类口径，需 ÷100。'
             '日度序列只有**交易日**：周末与长假没有中间价，库里就不该有那些日期。'
             '核对（2026-10-08）：673.67 → 6.7367，与独立抓取的中国货币网数据一致。',
    ),

    # ── P1：国债收益率（东财 / 中债）──────────────────────────────────
    'cn.bond.gov_10y': Rule(
        source='eastmoney',
        spec=AkSpec(
            func='bond_zh_us_rate',
            columns=('中国国债收益率10年',),
            period_column='日期',
            period_from='iso_day',
            kwargs=(('start_date', '{since}-01'),),
        ),
        note='中债国债收益率曲线的 10 年期节点，日度、年化百分比。'
             '★ 同表还有 2 年 / 5 年 / 30 年，以及「10年-2年」这条期限利差'
             '和美国那一组列，都不是这一条。中国与美国两条取自**同一张表**，'
             '适配器的调用缓存保证两个指标只抓一次。',
    ),
    'us.bond.gov_10y': Rule(
        source='eastmoney',
        spec=AkSpec(
            func='bond_zh_us_rate',
            columns=('美国国债收益率10年',),
            period_column='日期',
            period_from='iso_day',
            kwargs=(('start_date', '{since}-01'),),
        ),
        note='美国 10 年期国债收益率，与 cn.bond.gov_10y 同表不同列。'
             '两地的交易日与收盘时刻都不同，这里按源给的日期轴原样落库、'
             '不做时点对齐；某天该列没有报价（NaN）就跳过那一天。',
    ),
    'cn.bond.gov_1y': Rule(
        source='chinabond',
        spec=AkSpec(
            func='bond_china_yield',
            columns=('1年',),
            period_column='日期',
            period_from='iso_day',
            row_filter=('曲线名称', '中债国债收益率曲线'),
            kwargs=(('start_date', '{window_start_compact}'),
                    ('end_date', '{window_end_compact}')),
            window_months=11,
        ),
        note='中债国债收益率曲线的 1 年期节点。★ 这张表一天给**多条曲线**'
             '（国债、中短期票据 AAA、商业银行普通债…），用 row_filter 只留'
             '「中债国债收益率曲线」；列名是「1年」，不是「1Y」。'
             '★ 接口单次最多覆盖一年（实测超范围直接报 No tables found），'
             '所以按 window_months 切片多次调用；切片写在规则里，适配器不猜。',
    ),

    # ── P1：铁路货运量（新浪）────────────────────────────────────────
    'cn.rail.freight_yoy': Rule(
        source='sina',
        spec=AkSpec(
            func='macro_china_society_traffic_volume',
            columns=('货运量同比增长',),
            period_column='统计时间',
            period_from='dot_month',
            row_filter=('统计对象', '铁路'),
        ),
        note='铁路货运量当月同比。★ 这是一张**长表**：一期三行'
             '（铁路 / 公路 / 合计），取错行会得到一条量级相同、走势相近的'
             '「全部运输方式」曲线——不报错，只是不是铁路。'
             '★ 期间列写作 `2026.8`（月不补零），用 dot_month 读。'
             '1、2 月常整行缺失（源本身没有），如实跳过，不拿累计值补。',
    ),
}

# ── 计算指标：由**已抓到的观测**算出来，不是上游的某一列 ──────────────
#
# 与 RULES 分开，因为它的输入不是「一张报表的某一列」，而是别的指标的观测：
# 抓完之后按期间对齐再算。check_against 会核对输入确实有取数规则、变换已登记，
# 且所有输入来自同一个上游——`fetch_log` 每个指标只记一个 `source_id`。


@dataclass(frozen=True)
class DerivedRule:
    """一个计算指标：输入指标 + 变换。"""

    inputs: tuple[str, ...]
    transform: str
    note: str = ''


DERIVED: dict[str, DerivedRule] = {
    'cn.bond.cn_us_spread': DerivedRule(
        inputs=('cn.bond.gov_10y', 'us.bond.gov_10y'),
        transform='cn_us_spread_bp',
        note='中美 10 年期国债利差 =（中国 10 年 − 美国 10 年）× 100，单位基点，'
             '与 `indicators.ts` 里这条指标的公式逐字一致。两个输入同表同日，'
             '任一侧当天缺报价就跳过那一期，不外推。',
    ),
}

# ── 拿不到源的指标 ────────────────────────────────────────────────────
#
# 这里每一条都会在库里写成 value=NULL / status='missing' 的真实空行，
# 并且清掉库里那些旧值。留着一个没有采集记录的数字，
# 比留一片空白危险得多：空白会被追问，假数不会。
#
# 「拿不到」有三种，理由要写清是哪一种——它决定下一个接手的人该不该继续找：
#   (a) 上游**根本不发布**这个口径 —— 换个源也拿不到，别再找了；
#   (b) 上游发布，但**我们能用的渠道取不到** —— 站点/接口的现状，以后可能补上；
#   (c) **计算指标**，输入还没接齐 —— 不是源的问题，输入到了就能算。
#
# P1/P2 一共 86 个指标，绝大多数落在 (b)，而它们**又挤在少数几个卡点上**：
# 统计局公开库的 JS 挑战页、渠道只有累计口径、渠道没有分项。共享的理由
# 写成常量，改一处就是改全部；每个条目仍然逐个登记，因为
# 「忘了登记」和「没有源」在库里长得一模一样，而前者必须让测试变红。

#: 卡住一大片的那一个：统计局新版公开库对高频访问返回 JS 挑战页（§14.2）。
_NBS_CHALLENGE = (
    '(b) 渠道取不到。这条序列只在国家统计局新版公开库（data.stats.gov.cn）里，'
    'akshare 的通用接口（macro_china_nbs_nation / macro_china_nbs_region）'
    '也走同一个站点，实测一律返回混淆过的 JS 挑战页，不绕过。'
    '站点恢复后按本文件末尾的说明填 path —— 适配器不用改。'
)

#: 省级 GDP：同一个卡点，只是走分省接口。
_PROVINCE_GDP = (
    '(b) 渠道取不到。省级 GDP 只有在统计局公开库的'
    '「分省季度数据 › 国民经济核算」里，akshare 的 macro_china_nbs_region '
    '走同一个站点、同样返回 JS 挑战页（见本文件末尾的说明）。'
    '站点恢复后按 province → region 映射填进 RULES 即可。'
)

#: 用电量 / 发电量：渠道给的是**年内累计**，不是当月口径。
_POWER_CUMULATIVE = (
    '(b) 渠道取不到。akshare 的 macro_china_society_electricity 是**年内累计**'
    '口径（实测 2024.12 = 98521 亿千瓦时 ≈ 全年用电量），既不是当月值，'
    '也不是规模以上工业发电量；按月序列只在统计局公开库，原因同上。'
    '指标口径明确写了不由相邻月份反推，所以这里也不做差分。'
)

#: 社零分项：东财那张表只有总量，另有一张是**价格**指数。
_RETAIL_ITEM = (
    '(b) 渠道取不到。akshare 的 macro_china_consumer_goods_retail 只有社零'
    '**总量**，没有分商品类别；macro_china_retail_price_index 是零售'
    '**价格**指数（且停在 2022-09），不是零售额。分项只在统计局公开库，'
    '原因同上。'
)

#: 贸易伙伴：海关那张表只有进出口总量。
_TRADE_PARTNER = (
    '(b) 渠道取不到。海关数据在 akshare 里只有 macro_china_hgjck 一张表，'
    '列是当月/累计的进出口金额与同比，**没有国别分项**；'
    '海关总署的国别表没有对应接口。'
)

#: 财新 PMI：金十的报告快照停更。
_CAIXIN = (
    '(b) 渠道取不到。akshare 的财新 PMI 走金十数据的报告快照，'
    '实测序列停在 2025-09（且同一期间有重复行，写入前还得去重）；'
    '财新自己的指数接口（yun.ccxe.com.cn）返回的不是 JSON。'
    '接进来会是一条停更一年多的序列，不如如实留空。'
)

#: 国际收支与外债：akshare 没有对应函数。
_BOP = (
    '(b) 渠道取不到。akshare 没有国际收支平衡表 / 全口径外债的接口；'
    '国家外汇管理局按季度发布的这些表需要单独接它的数据接口。'
)

#: UNSOURCED 的每条理由都必须以其中之一开头，说清「拿不到」是哪一种。
REASON_PREFIXES = ('(a)', '(b)', '(c)')

UNSOURCED: dict[str, str] = {
    'cn.ind_prod.mom': '(a) 上游不发布。国家统计局不公布季调后的工业增加值环比。'
                       '已核对 akshare 的 macro_china_gyzjz：'
                       '只有「同比增长」与「累计增长」两列，两个库里都没有环比。',
    'cn.fai.cum_yoy': '(b) 渠道取不到。统计局发布固投累计同比，但 akshare 的'
                      ' macro_china_gdzctz 只有「当月」「同比增长」「环比增长」'
                      '「自年初累计(亿元)」—— 最后一个是**金额**不是同比。'
                      '统计局的新版公开库有这条序列，但该站点目前对访问返回'
                      ' JS 挑战页，akshare 同样取不到。',
    'cn.re.cum_yoy': '(b) 渠道取不到。房地产开发投资累计同比只在统计局公开库'
                     '「房地产 › 房地产开发投资情况」叶子里，原因同上。',
    'cn.cpi_core.yoy': '(b) 渠道取不到。核心 CPI（扣除食品和能源）只在统计局'
                       '公开库「价格指数」分类下。东财的 CPI 表只有全国/城市/农村'
                       '三个口径，**没有核心列**，已核对。原因同上。',
    'cn.tsf.stock_yoy': '(b) 渠道取不到。akshare 的 macro_china_shrzgm 是'
                        '「社会融资规模**增量**统计」（商务数据中心），'
                        '指标要的是**存量同比**，两者不是一回事。'
                        '人民银行按表格页发布存量，尚未接入。',

    # ── P1：统计局公开库那一路（8 条）──────────────────────────────────
    'cn.fai.mfg_cum_yoy': _NBS_CHALLENGE,
    'cn.fai.infra_cum_yoy': _NBS_CHALLENGE,
    'cn.services.yoy': _NBS_CHALLENGE,
    'cn.income.disposable_cum_yoy': _NBS_CHALLENGE,
    'cn.income.consumption_cum_yoy': _NBS_CHALLENGE,
    'cn.income.disposable': _NBS_CHALLENGE,
    'cn.income.consumption': _NBS_CHALLENGE,
    'cn.gdp.nominal_yoy': (
        '(b) 渠道取不到。东财的 macro_china_gdp 给的是**累计**绝对值与累计名义'
        '同比，没有当季值；当季名义同比得用「本季累计 − 上季累计」再与去年同季'
        '相比，那是把累计差当成官方当季口径——两条序列量级相同、走势相近，'
        '写错不报错，正是本文件最怕的一类。统计局的当季表原因见 _NBS_CHALLENGE。'
    ),

    # ── P1：累计口径冒充当月（4 条）────────────────────────────────────
    'cn.power.generation': _POWER_CUMULATIVE,
    'cn.power.generation_yoy': _POWER_CUMULATIVE,
    'cn.power.consumption': _POWER_CUMULATIVE,
    'cn.power.consumption_yoy': _POWER_CUMULATIVE,

    # ── P1：渠道没有分项 / 没有对应表（18 条）──────────────────────────
    'cn.retail.food_yoy': _RETAIL_ITEM,
    'cn.retail.clothing_yoy': _RETAIL_ITEM,
    'cn.retail.auto_yoy': _RETAIL_ITEM,
    'cn.retail.appliance_yoy': _RETAIL_ITEM,
    'cn.retail.cosmetics_yoy': _RETAIL_ITEM,
    'cn.trade.us_export': _TRADE_PARTNER,
    'cn.trade.us_import': _TRADE_PARTNER,
    'cn.trade.eu_export': _TRADE_PARTNER,
    'cn.trade.eu_import': _TRADE_PARTNER,
    'cn.trade.asean_export': _TRADE_PARTNER,
    'cn.trade.asean_import': _TRADE_PARTNER,
    'cn.trade.jp_export': _TRADE_PARTNER,
    'cn.trade.jp_import': _TRADE_PARTNER,
    'cn.trade.kr_export': _TRADE_PARTNER,
    'cn.trade.kr_import': _TRADE_PARTNER,
    'cn.fiscal.fund_revenue_cum_yoy': (
        '(b) 渠道取不到。akshare 的 macro_china_czsr 是**一般公共预算**收支，'
        '政府性基金预算收入没有对应接口。财政部按表格页发布基金预算，尚未接入。'
    ),
    'cn.fiscal.land_revenue_cum_yoy': (
        '(b) 渠道取不到。理由与 cn.fiscal.fund_revenue_cum_yoy 相同：'
        '土地出让收入是政府性基金收入下的一个科目，只出现在财政部的表格页里。'
    ),
    'cn.loan.medium_long_yoy': (
        '(b) 渠道取不到。macro_china_new_financial_credit 只有当月与累计的'
        '**新增**人民币贷款，没有「中长期贷款余额」这一项；'
        '余额同比是人民银行的另一张表。'
    ),
    'cn.pmi.caixin_mfg': _CAIXIN,
    'cn.pmi.caixin_services': _CAIXIN,

    # ── P1：计算指标（1 条）────────────────────────────────────────────
    'cn.gdp.deflator_yoy': (
        '(c) 计算指标，本轮写不出值。公式在 `indicators.ts` 里'
        '（名义当季同比 ÷ 实际当季同比），而名义当季同比本身就没有源'
        '（见 cn.gdp.nominal_yoy）：两个输入缺一个，这里就不写一个半成品。'
    ),

    # ── P2：统计局公开库那一路（34 条）─────────────────────────────────
    'cn.population.total': _NBS_CHALLENGE,
    'cn.population.urbanization': _NBS_CHALLENGE,
    'cn.income.gini': _NBS_CHALLENGE,
    'cn.region.bj.gdp_cum_yoy': _PROVINCE_GDP,
    'cn.region.tj.gdp_cum_yoy': _PROVINCE_GDP,
    'cn.region.he.gdp_cum_yoy': _PROVINCE_GDP,
    'cn.region.sx.gdp_cum_yoy': _PROVINCE_GDP,
    'cn.region.nm.gdp_cum_yoy': _PROVINCE_GDP,
    'cn.region.ln.gdp_cum_yoy': _PROVINCE_GDP,
    'cn.region.jl.gdp_cum_yoy': _PROVINCE_GDP,
    'cn.region.hl.gdp_cum_yoy': _PROVINCE_GDP,
    'cn.region.sh.gdp_cum_yoy': _PROVINCE_GDP,
    'cn.region.js.gdp_cum_yoy': _PROVINCE_GDP,
    'cn.region.zj.gdp_cum_yoy': _PROVINCE_GDP,
    'cn.region.ah.gdp_cum_yoy': _PROVINCE_GDP,
    'cn.region.fj.gdp_cum_yoy': _PROVINCE_GDP,
    'cn.region.jx.gdp_cum_yoy': _PROVINCE_GDP,
    'cn.region.sd.gdp_cum_yoy': _PROVINCE_GDP,
    'cn.region.ha.gdp_cum_yoy': _PROVINCE_GDP,
    'cn.region.hb.gdp_cum_yoy': _PROVINCE_GDP,
    'cn.region.hn.gdp_cum_yoy': _PROVINCE_GDP,
    'cn.region.gd.gdp_cum_yoy': _PROVINCE_GDP,
    'cn.region.gx.gdp_cum_yoy': _PROVINCE_GDP,
    'cn.region.hi.gdp_cum_yoy': _PROVINCE_GDP,
    'cn.region.cq.gdp_cum_yoy': _PROVINCE_GDP,
    'cn.region.sc.gdp_cum_yoy': _PROVINCE_GDP,
    'cn.region.gz.gdp_cum_yoy': _PROVINCE_GDP,
    'cn.region.yn.gdp_cum_yoy': _PROVINCE_GDP,
    'cn.region.xz.gdp_cum_yoy': _PROVINCE_GDP,
    'cn.region.sn.gdp_cum_yoy': _PROVINCE_GDP,
    'cn.region.gs.gdp_cum_yoy': _PROVINCE_GDP,
    'cn.region.qh.gdp_cum_yoy': _PROVINCE_GDP,
    'cn.region.nx.gdp_cum_yoy': _PROVINCE_GDP,
    'cn.region.xj.gdp_cum_yoy': _PROVINCE_GDP,

    # ── P2：国际收支与外债（13 条）────────────────────────────────────
    'cn.bop.current': _BOP,
    'cn.bop.capital': _BOP,
    'cn.bop.financial': _BOP,
    'cn.bop.goods': _BOP,
    'cn.bop.services': _BOP,
    'cn.bop.primary_income': _BOP,
    'cn.bop.secondary_income': _BOP,
    'cn.bop.direct_investment': _BOP,
    'cn.bop.portfolio_investment': _BOP,
    'cn.bop.other_financial': _BOP,
    'cn.bop.reserve_assets': _BOP,
    'cn.bop.errors': _BOP,
    'cn.external_debt.balance': _BOP,

    # ── P2：计算指标（1 条）────────────────────────────────────────────
    'cn.keqiang.growth': (
        '(c) 计算指标，本轮写不出值。三个输入里只有铁路货运量当月同比有源'
        '（cn.rail.freight_yoy），全社会用电量当月同比（cn.power.consumption_yoy）'
        '与中长期人民币贷款余额同比（cn.loan.medium_long_yoy）都没有；'
        '权重写在 `indicators.ts` 的 note 里，缺一个也算不出来。'
    ),
}

# ── 留给下一个接手的人 ────────────────────────────────────────────────
#
# 上面那一大批标 (b) 的指标，卡点其实是**同一个**：统计局新版公开库
# （`data.stats.gov.cn/dg/website/publicrelease/web/external`）。
# P0 里 4 条、P1 里 8 条、P2 里 34 条（含 31 个省级 GDP）都堵在这里；
# 它们登记成 `_NBS_CHALLENGE` / `_PROVINCE_GDP` 两份共享理由。
#
# 这个库能通的时候，akshare 的通用接口 `macro_china_nbs_nation` 是可以用的
# （本文件里的 cn.gdp.yoy 就走它，且实测取到了正确的季度值）。它的三个参数：
#
#   kind='月度数据' / '季度数据' / '年度数据'
#       —— 对应旧接口的 code=1/2/3，在内部映射成请求头里的 route
#          （monthData / quarterData / yearData）。**这是季度库能通的关键**：
#          自己拼请求时缺 rootId 与 route，季度叶子一律 HTTP 500。
#   path='国民经济核算 > 国内生产总值指数'
#       —— `>` 分隔的目录路径，必须**指到叶子**。指到父节点不报错，
#          只是返回空表，看起来像「这个分类没有数据」。
#   period='2021-' / 'LAST10' / '2016-2023'
#
# 统计局把同一个序列按年份区间切成多个叶子
# （`全国居民消费价格分类指数 (上年同月=100) (2021-2025)` 与 `… (2026-)`），
# 所以补这几条时，一年区间一个 path，再把结果按期间合并——注意**空值不能
# 覆盖真值**：向某个叶子请求超范围的期间，它会照常返回这些期间、只是值为空，
# 合并顺序不对就会把真值挡在门外（症状是「只剩最近几个月有数」）。
#
# 但**先别急着写**：那个站点目前对所有请求（连目录树接口也一样）返回
# 一个混淆过的 JS 挑战页，HTTP 200、内容是 `<noscript>Please enable
# JavaScript…`。这是站点在表达「访问太快了」，不该去绕过。等它恢复后，
# 把上面的 path 填进 RULES 即可，适配器不用改。
#
# 另一条路（走过，不通）：东财 `RPT_ECONOMY_GDP.SUM_SAME` 是**累计**同比，
# 不是当季同比。实测 2024 年四期是 5.3/5.0/4.8/5.0，与官方累计口径吻合，
# 而当年当季值是 5.3/4.7/4.6/5.4。写进「当季同比」就是错值，
# 且错得不显眼——两条序列量级相同、走势相似。

# ── 自检 ─────────────────────────────────────────────────────────────


def sources_used() -> list[str]:
    """本次映射表用到的上游源 id，用于 `fetch_log` 与源健康度。"""
    return sorted({rule.source for rule in RULES.values()})


def check_against(catalog: dict) -> list[str]:
    """与目录比对，返回问题列表（空列表 = 通过）。

    覆盖范围是**全部指标**，不分层级：P1/P2 加进 `indicators.ts` 却忘了在
    这里登记，与 P0 漏登记是同一件事——它在库里既没有真实值、也没有 missing
    行，只会安静地留着上一份库里的旧数据，界面上看不出任何区别。
    P0 时代这条只查 P0，现在三层一起查。

    不做断言式的 import 期检查：调用方要在 CLI 里把它变成一条能读的错误信息，
    而不是一个 traceback。
    """
    problems: list[str] = []
    listed = set(catalog)

    for left, right, label in (
        (set(RULES), set(UNSOURCED), 'RULES 与 UNSOURCED'),
        (set(RULES), set(DERIVED), 'RULES 与 DERIVED'),
        (set(UNSOURCED), set(DERIVED), 'UNSOURCED 与 DERIVED'),
    ):
        overlap = left & right
        if overlap:
            problems.append(f'同时出现在 {label}：{", ".join(sorted(overlap))}')

    covered = set(RULES) | set(UNSOURCED) | set(DERIVED)
    for missing in sorted(listed - covered):
        problems.append(f'指标未登记取数规则（也不在 UNSOURCED / DERIVED 里）：{missing}')
    for extra in sorted(covered - listed):
        problems.append(f'规则指向的指标不在目录里：{extra}')

    for key, reason in UNSOURCED.items():
        if not reason.strip():
            problems.append(f'UNSOURCED 里 {key} 没写理由')
        elif not reason.lstrip().startswith(REASON_PREFIXES):
            problems.append(
                f'UNSOURCED 里 {key} 的理由没有标 (a)/(b)/(c)——'
                '不标就没法判断该不该继续找源')

    for key, rule in RULES.items():
        indicator = catalog.get(key)
        if indicator is None:
            continue
        if indicator.is_derived:
            problems.append(
                f'{key} 是计算指标（isDerived），应登记在 DERIVED 而不是 RULES')

        spec = rule.spec
        if spec.period_from not in PERIOD_READERS:
            problems.append(f'{key} 的期间读法未登记：{spec.period_from}')
        if spec.transform not in TRANSFORMS:
            problems.append(f'{key} 的变换未登记：{spec.transform}')
        if bool(spec.row_label) == bool(spec.columns):
            problems.append(f'{key} 必须且只能声明 row_label 或 columns 之一')
        if not spec.row_label and not spec.period_column:
            problems.append(f'{key} 的行式表没有声明期间列')
        if spec.period_column and spec.period_column in spec.columns:
            problems.append(f'{key} 把期间列 {spec.period_column} 也当成取值列了')
        if indicator.frequency not in KINDS:
            problems.append(f'{key} 的频率 {indicator.frequency} 不认识')
        if spec.window_months < 0:
            problems.append(f'{key} 的 window_months 不能为负：{spec.window_months}')
        if spec.window_months and not spec.kwargs:
            problems.append(f'{key} 声明了 window_months 却没有任何窗口参数')

    for key, rule in DERIVED.items():
        indicator = catalog.get(key)
        if indicator is None:
            continue
        if not indicator.is_derived:
            problems.append(
                f'{key} 登记在 DERIVED 里，但目录没把它标成计算指标（isDerived）')
        if not rule.inputs:
            problems.append(f'{key} 没有声明输入指标')
        for input_id in rule.inputs:
            if input_id not in RULES:
                problems.append(f'{key} 的输入 {input_id} 没有取数规则')
        if rule.transform not in TRANSFORMS:
            problems.append(f'{key} 的变换未登记：{rule.transform}')
        upstreams = {RULES[i].source for i in rule.inputs if i in RULES}
        if len(upstreams) > 1:
            # `fetch_log` 每条明细只记一个 source_id，输入跨源就没法如实登记
            problems.append(
                f'{key} 的输入来自不同的上游：{", ".join(sorted(upstreams))}')

    return problems


def derived_source(indicator_id: str) -> str | None:
    """计算指标的流水记在哪个源名下：它输入所在的源。

    自检保证输入同源，所以这里取出来的一定是唯一的那一个。
    返回 None 表示没法判断（输入缺规则），调用方应记成 `none`。
    """
    rule = DERIVED.get(indicator_id)
    if rule is None:
        return None
    upstreams = {RULES[i].source for i in rule.inputs if i in RULES}
    return upstreams.pop() if len(upstreams) == 1 else None
