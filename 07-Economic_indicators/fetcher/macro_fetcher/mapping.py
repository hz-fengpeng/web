"""指标 → akshare 接口的取数规则表。

这是整个抓取器的**口径说明书**：每个指标取哪个接口的哪一列、期间怎么读、
要不要换算、1—2 月怎么处理。规则用数据声明而不是散在代码里的 if，
理由很实际——口径错误不会报错，只会静默写进一个看起来合理的数
（把「指数 104.3」当成「4.3%」、把中间价的 674.11 当成 6.7411 的汇率）。

取数全部走 akshare（见 `sources/akshare_src.py` 说明为什么不再自己解析）。
但 **akshare 只负责把数据拿下来，不负责口径**：选哪一列、怎么换算、
1—2 月怎么合并，仍然是这里的判断。上游改了表结构时，
`sources/akshare_src.py` 会因为找不到列名而**报错**，不会静默读错列。

四条硬约束，由 `tests/test_mapping.py` 守着：

1. `RULES`、`UNSOURCED` 两张表两两不相交，且并集**恰好**等于目录里 P0 的 23 个指标。
   新指标加进 `indicators.ts` 却忘了在这里登记，测试立刻变红——
   **不允许有指标悄悄消失**。
2. `UNSOURCED` 里的每一条都要写理由。没有理由的空白是「忘了配」，不是「没有源」。
3. 每条规则的 `period_from` 与 `transform` 必须是已登记的名字。
4. `RULES` 里的指标不得是计算指标（`isDerived`）。
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
}

# ── 拿不到源的指标 ────────────────────────────────────────────────────
#
# 这里每一条都会在库里写成 value=NULL / status='missing' 的真实空行，
# 并且清掉库里那些旧值。留着一个没有采集记录的数字，
# 比留一片空白危险得多：空白会被追问，假数不会。
#
# 「拿不到」有两种，理由要写清是哪一种：
#   (a) 上游**根本不发布**这个口径 —— 换个源也拿不到，别再找了；
#   (b) 上游发布，但**我们能用的渠道取不到** —— 以后可能补上。

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
}

# ── 留给下一个接手的人 ────────────────────────────────────────────────
#
# 上面 4 条标 (b) 的指标，卡点其实是**同一个**：统计局新版公开库
# （`data.stats.gov.cn/dg/website/publicrelease/web/external`）。
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

    不做断言式的 import 期检查：调用方要在 CLI 里把它变成一条能读的错误信息，
    而不是一个 traceback。
    """
    problems: list[str] = []
    p0 = {key for key, indicator in catalog.items() if indicator.tier == 'P0'}

    overlap = set(RULES) & set(UNSOURCED)
    if overlap:
        problems.append(f'同时出现在 RULES 与 UNSOURCED：{", ".join(sorted(overlap))}')

    covered = set(RULES) | set(UNSOURCED)
    for missing in sorted(p0 - covered):
        problems.append(f'P0 指标未登记取数规则：{missing}')
    for extra in sorted(covered - p0):
        problems.append(f'规则指向的指标不存在或不是 P0：{extra}')

    for key, reason in UNSOURCED.items():
        if not reason.strip():
            problems.append(f'UNSOURCED 里 {key} 没写理由')

    for key, rule in RULES.items():
        indicator = catalog.get(key)
        if indicator is None:
            continue
        if indicator.is_derived:
            problems.append(f'{key} 是计算指标（isDerived），不应出现在取数表里')

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

    return problems
