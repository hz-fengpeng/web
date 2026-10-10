"""命令行入口：抓取 → 变换 → 写库。

一次运行的完整流程，顺序是有讲究的：

1. **先自检再联网**（`mapping.check_against`）。映射表缺指标、写错 id，
   都不该花两分钟抓一遍才发现。
2. 抓取。单个指标失败**不中断整轮**——记进 `fetch_log` 标 `fail`，
   继续下一个。宁可写进 22 个指标的真实数据，也不要因为一个源改版就颗粒无收。
3. 变换、取整、1—2 月口径。取整按目录里的精度，全局只在这一处。
4. 算 `plan`（纯函数）。`--dry-run` 到此为止，打印差异、一个字节都不写。
5. 备份 → 清掉没人认领的值 → 写入 → 记 `fetch_log` / `app_meta`。

第 5 步里的「清掉」是这个工具的立身之本：应用对着**整库**声明「真实统计数据」，
所以库里不能有第二条来路的数据——既没有取数规则、也没被登记成无源的指标，
其观测一律清空（见 `_plan_unclaimed`）。这条不变量的完整说法是「有值的观测
都能在 `fetch_log` 里找到采集记录」，写在开发文档 §14.4。

退出码：0 全部成功；1 部分指标失败但已写入可用子集；2 致命（自检不过、库不对）。
"""

from __future__ import annotations

import argparse
import sys
from dataclasses import dataclass, field
from datetime import date
from pathlib import Path

from . import __version__, db, releases
from .catalog import Indicator, load_catalog, select
from .mapping import (
    DERIVED, GAP, MERGED, MONTHLY, RULES, UNSOURCED, Rule, check_against, derived_source,
)
from .periods import (
    months_between, parse_period, period_end, quarter_period, quarters_between,
    years_between,
)
from .sources import SourceError, SourcePoint, akshare_src
from .transforms import apply_transform

DEFAULT_DB = Path(__file__).resolve().parent.parent.parent / 'resources' / 'macro.db'
DEFAULT_FROM = '2021-09'


@dataclass
class Options:
    db: Path
    tier: str | None
    only: list[str] | None
    since: str
    dry_run: bool
    backup: bool
    keep_unsourced: bool


@dataclass
class Outcome:
    """一个指标的抓取结果。

    失败也留在列表里（`error` 非空），好让报告和 `fetch_log` 说清楚是谁失败了、
    为什么——整轮跑完只剩「少了三个指标」而无从查起，才是最费时间的失败。
    """

    indicator: Indicator
    observations: list[db.Observation] = field(default_factory=list)
    error: str | None = None
    #: 写进 `fetch_log` 的说明。计算指标在这里写清「由哪两条相减得到」——
    #: 流水是这条值唯一的来历，读者不该去猜。
    note: str = ''

    @property
    def ok(self) -> bool:
        return self.error is None


@dataclass
class Summary:
    """每个指标将写入的行数，供报告与 `fetch_log` 使用。"""

    new: dict[str, int] = field(default_factory=dict)
    revised: dict[str, int] = field(default_factory=dict)
    notes: list[str] = field(default_factory=list)
    #: 待清除的指标及其现有行数。**只是计划**——真正删在 `_purge` 里，
    #: 且只在落盘分支上调用。
    purges: dict[str, int] = field(default_factory=dict)

    def record(self, indicator_id: str, writes: list[db.PlannedWrite]) -> None:
        self.new[indicator_id] = sum(1 for w in writes if w.reason == 'new')
        # `filled`（原来是 missing、现在有值）也算一次写入，一并计进「修订」
        self.revised[indicator_id] = len(writes) - self.new[indicator_id]

    def rows_for(self, indicator_id: str) -> int:
        return self.new.get(indicator_id, 0) + self.revised.get(indicator_id, 0)


# ── 抓取 ──────────────────────────────────────────────────────────────


def fetch_all(indicators: list[Indicator],
              since: str, end_month: str, end_day: str) -> list[Outcome]:
    """逐个指标取数。**一个指标失败不影响其余指标。**

    这条不是防御性编程：统计局那一路随时可能整段失败（它对高频访问返回
    JS 挑战页），东财的某个报表也可能临时改字段。让整轮跑挂掉，
    结果是连已经拿到的那 15 个指标也写不进去。
    """
    outcomes: list[Outcome] = []
    for indicator in indicators:
        rule = RULES.get(indicator.id)
        if rule is None:
            continue  # 无源指标，由 _plan_unsourced 处理
        try:
            points = _fetch_one(indicator, rule, since, end_day)
            points = _apply_jan_feb(indicator, rule, points)
            # 发布日推算（`ValueError`）与取整也归这个指标名下：它们失败时
            # 该指标的整条序列都不该写，而不是写一半。
            observations = [_to_observation(indicator, point) for point in points]
        except (SourceError, ValueError) as exc:
            outcomes.append(Outcome(indicator, error=f'{type(exc).__name__}: {exc}'))
            continue
        outcomes.append(Outcome(indicator, observations))
    return outcomes


def derive_all(indicators: list[Indicator],
               outcomes: list[Outcome]) -> list[Outcome]:
    """计算指标：在**本轮抓到的观测**上按期间对齐再算。

    与 `fetch_all` 分开，是因为它的输入不是报表而是「别的指标的观测」：
    先抓完，再算。三条规矩：

    - **输入缺一个就不算**：输入本轮失败或没被选中，这条计算指标记成失败，
      而不是算一个只有一半输入的数；
    - **任一期输入缺值就跳过那一期**：不插值、不外推、不拿上期顶上；
    - **值取自输入的交集期间**：两个输入的日期轴不完全一样（两地的交易日
      不同），只在两边都有报价的日子算——指标口径里写了「不做时点对齐」。
    """
    by_id = {outcome.indicator.id: outcome for outcome in outcomes if outcome.ok}
    derived: list[Outcome] = []
    for indicator in indicators:
        rule = DERIVED.get(indicator.id)
        if rule is None:
            continue

        inputs: list[dict[str, float | None]] = []
        missing_input: str | None = None
        for input_id in rule.inputs:
            outcome = by_id.get(input_id)
            if outcome is None:
                missing_input = input_id
                break
            inputs.append({o.period: o.value for o in outcome.observations})
        if missing_input is not None:
            derived.append(Outcome(indicator, error=(
                f'{indicator.id}：输入 {missing_input} 本轮没有取到数据，'
                '计算指标不写半成品')))
            continue

        shared = set(inputs[0])
        for values in inputs[1:]:
            shared &= set(values)

        observations: list[db.Observation] = []
        for period in sorted(shared, key=period_end):
            raw = [values[period] for values in inputs]
            try:
                value = apply_transform(rule.transform, raw)
                released = releases.released_at(indicator, period)
            except ValueError as exc:
                derived.append(Outcome(indicator, error=f'{type(exc).__name__}: {exc}'))
                observations = []
                break
            if value is None:
                continue  # 输入缺值的那一期不写，而不是写个空值
            observations.append(db.Observation(
                indicator.id, period, round(value, indicator.decimals), 'ok', released))
        else:
            if not observations:
                # 输入都在、却一期都没算出来，多半是期间没对上（而不是「这段
                # 时间真的没有数据」）。与 `_fetch_one` 对 0 条观测的态度一致：
                # 报出来，别让它静默变成「这个指标没数据」。
                derived.append(Outcome(indicator, error=(
                    f'{indicator.id}：输入都有数据，但按期间对齐后一期都没算出来，'
                    '多半是输入之间的期间对不上')))
                continue
            derived.append(Outcome(indicator, observations, note=rule.note))
    return derived


def _fetch_one(indicator: Indicator, rule: Rule,
               since: str, end_day: str) -> list[SourcePoint]:
    points = akshare_src.fetch(rule.spec, indicator.id, since)

    # 时间窗在这里**统一**裁，适配器自己不裁。
    # akshare 的多数接口一次返回全量历史（中间价给到 1994 年），
    # 只有统计局系需要我们预先声明区间。裁在一处，两边不会不一致。
    # 下界取期间起点而不是期末：否则 2021-09 整个月会被自己的期末日期筛掉。
    lower = f'{since}-01'
    points = [p for p in points if lower <= period_end(p.period) <= end_day]

    # ★ 丢掉「有期间但没有值」的点。源的每个适配器都会给出它们：
    # 统计局的未发布期间是空字符串 `''`，东财的字段为 null。
    #
    # 不丢的后果不是「多一行空值」，而是**抹掉已有的真实值**：
    # `plan()` 看到 `值从 0.8 变成 None`，会判定为「值变了」，
    # 于是追加一行 revision+1、value=NULL、status='revised'——
    # 界面上那条真实观测就变成「已修订」的空值，且旧值被埋进历史版本里。
    # 而且这个错误的方向是「悄悄变空」，比报错难发现得多。
    #
    # 丢掉则是安全的：这个期间本轮没拿到值，库里原来的值就原样留着。
    points = [p for p in points if p.value is not None]

    # ★ 有取数规则却一条都没取到，当成**失败**而不是「这个指标没数据」。
    #
    # 这两件事在库里的表现完全一样（该指标本轮没有待写差异），但原因天差地别：
    # 前者是列名读错了、期间读法写错了、上游改版了——都是要立刻修的 bug；
    # 后者才是正常的「这段时间确实没有观测」。
    #
    # 这个检查是踩出来的：季度期间的正则漏了一个「第」字，GDP 的每一列都
    # 读不出期间，整条序列静默变成 0 条，而报告里它和「本月没有新数据」
    # 长得一模一样。
    if not points:
        raise SourceError(
            f'{indicator.id}：{rule.spec.func}() 调通了，但在 '
            f'{since} 之后没有解析出任何观测。'
            '多半是期间读法或列名对不上（而不是这段时间真的没有数据）——'
            '先核对 mapping.py 里这条规则的 columns / period_from。')

    return points


def _apply_jan_feb(indicator: Indicator, rule: Rule,
                   points: list[SourcePoint]) -> list[SourcePoint]:
    """按指标的 1—2 月口径处理。

    ★ 规则与源的实际行为不一致时**报错**，不悄悄丢数据。
    把「源其实按月发布了、规则却说合并」这种情况静默处理掉，症状是
    每年 1 月的观测凭空消失——这正是 docs/02 §3.4 记的经典陷阱。

    两种口径对「该有哪些月份」的要求不同，不能合并成一条判断：

    - `MERGED`：1 月**必须没有**值（1—2 月被并成一条挂在 2 月）。
      2 月有值才是正常的，而且那个值就是合计数。
    - `GAP`：1 月和 2 月**都不该有**当月值（合计数只在「累计」序列里）。
    """
    if rule.jan_feb == MONTHLY:
        return points

    # 规则声称不该出现的月份
    forbidden = (1,) if rule.jan_feb == MERGED else (1, 2)

    kept: list[SourcePoint] = []
    for point in points:
        parsed = parse_period(point.period)
        if parsed is None or parsed.kind != 'month' or parsed.index > 2:
            kept.append(point)
            continue
        if point.value is None:
            continue  # 源没给这个月的值，符合预期
        if parsed.index not in forbidden:
            kept.append(point)
            continue
        raise SourceError(
            f'{indicator.id}: 1—2 月口径标为 {rule.jan_feb}，'
            f'但源在 {point.period} 给出了值 {point.value}。'
            '规则与源的实际发布行为不一致，请核对 mapping.py 里这条规则。',
        )

    if rule.jan_feb == MERGED:
        # 2 月的值就是 1—2 月合计；标成 merged，界面才能说明「1 月为什么不在」
        kept = [SourcePoint(p.indicator_id, p.period, p.value,
                            'merged' if parse_period(p.period).index == 2 else p.status)
                for p in kept]
    return kept


def _to_observation(indicator: Indicator, point: SourcePoint) -> db.Observation:
    value = None if point.value is None else round(point.value, indicator.decimals)
    return db.Observation(
        indicator_id=indicator.id,
        period=point.period,
        value=value,
        status=point.status,
        released_at=releases.released_at(indicator, point.period),
    )


def _unsourced_observations(indicator: Indicator, since: str, cover_end: str,
                            today: str) -> list[db.Observation]:
    """没有免费源的指标：写真实的空行（`value=NULL`、`status='missing'`）。

    空行而不是「什么都没有」，是为了让这条指标在界面上仍然存在、
    并且明确标着「缺失」——而不是留一段看起来像「源还没更新」的静默历史。

    右端有两道限制，合起来的效果是**只标那些已经该发布却确实没有的期间**：

    1. 不超过 `cover_end`（本轮别的指标真正取到数据的最晚期间）。
    2. 只收**推算发布日已过**的期间。

    第二条是关键。只按「今天」截断的话，10 月初运行会给 9 月也写一行「缺失」，
    可 9 月的数据要 10 月 9 日才发布；季度指标更明显——Q3 的 GDP 要到
    10 月 16 日才出。把「还没到日子」标成「缺失」，等于在每个序列末尾
    常驻一段假告警，而假告警会让人不再看告警。
    """
    out: list[db.Observation] = []
    for period in _periods_for(indicator, since, cover_end):
        released = releases.released_at(indicator, period)
        if released is not None and released > today:
            continue  # 还没到发布日，不是缺失
        out.append(db.Observation(indicator.id, period, None, 'missing', released))
    return out


def _periods_for(indicator: Indicator, since: str, cover_end: str) -> list[str]:
    """按**指标自己的频率**列出期间。

    一律按月生成会把季度指标写成月度期间：`cn.gdp.yoy` 会得到
    「2026-08 缺失」这种不存在的期间，而 `released_at` 遇到月度期间
    又算不出季度发布日，于是静默返回 None。界面上就是一条既没有值、
    也没有发布日的僵尸序列。
    """
    if indicator.frequency == 'quarter':
        return quarters_between(_quarter_of(since), _quarter_of(cover_end))
    if indicator.frequency == 'year':
        return years_between(since[:4], cover_end[:4])
    if indicator.frequency == 'month':
        return months_between(since, cover_end)
    # 日度指标不可能「无源」——真要出现，宁可报错也不要默认按月猜
    raise ValueError(f'{indicator.id}: 无法为 {indicator.frequency} 频率生成期间')


def _quarter_of(period: str) -> str:
    """`'2021-09'` → `'2021Q3'`。"""
    return quarter_period(int(period[:4]), (int(period[5:7]) - 1) // 3 + 1)


def _cover_end(outcomes: list[Outcome]) -> str | None:
    """本轮真实取到数据的最晚月份；一个都没取到时返回 None。

    不假设各适配器返回的观测是升序的（东财按日期倒序返回），
    一律按 `period_end` 取最大——顺序假设是那种「今天对、换个大洲就错」的依赖。
    """
    months = [
        observation.period
        for outcome in outcomes if outcome.ok
        for observation in outcome.observations
        if parse_period(observation.period).kind == 'month'
    ]
    return max(months, key=period_end) if months else None


# ── 主流程 ────────────────────────────────────────────────────────────


def run(options: Options, out=sys.stdout) -> int:
    catalog = load_catalog()
    problems = check_against(catalog)
    if problems:
        print('取数规则表与指标目录不一致，未联网：', file=out)
        for problem in problems:
            print(f'  - {problem}', file=out)
        return 2

    try:
        indicators = select(catalog, options.tier, options.only)
    except ValueError as exc:
        print(f'指标筛选有误：{exc}', file=out)
        return 2

    if not options.db.exists():
        print(f'库不存在：{options.db}', file=out)
        return 2

    today = date.today()
    end_month = f'{today.year:04d}-{today.month:02d}'
    end_day = today.isoformat()

    scoped = [i for i in indicators if i.id in RULES or i.id in UNSOURCED or i.id in DERIVED]
    # 选了计算指标，就得把它的输入也捎上：`--only cn.bond.cn_us_spread` 时
    # 不带上两条 10 年期，它必然算不出来。输入按目录里的原始顺序追加。
    scoped_ids = {i.id for i in scoped}
    extra_ids = {input_id for i in scoped if i.id in DERIVED
                 for input_id in DERIVED[i.id].inputs} - scoped_ids
    if extra_ids:
        # 保持目录里的原始顺序：报告里每个指标的相对位置不随 --only 变化
        rank = {indicator_id: position for position, indicator_id in enumerate(catalog)}
        scoped = sorted(scoped + [catalog[i] for i in extra_ids if i in catalog],
                        key=lambda i: rank[i.id])
    sources = sorted({_source_of(i.id) for i in scoped} - {'none'})

    print(f'抓取 {len(scoped)} 个指标（源：{"、".join(sources)}）', file=out)
    print(f'时间窗 {options.since} ～ {end_month}，日度止于 {end_day}', file=out)

    # 每次运行从干净状态开始：缓存的是**单次运行内**同一张报表被多个指标
    # 复用的情况（PMI、海关、货币供应量各供两个指标）。
    akshare_src.reset_cache()
    outcomes = fetch_all(scoped, options.since, end_month, end_day)
    # 计算指标排在后头：它们的输入就是上面那批观测。
    outcomes += derive_all(scoped, outcomes)

    started_at = db.utc_now()
    # 只读打开：`--dry-run` 承诺不落盘，而写模式的 connect() 会发 PRAGMA
    # journal_mode，那是会改写库文件头的。
    connection = db.connect(options.db, read_only=options.dry_run)
    try:
        db.check_schema(connection)
        ids = [i.id for i in scoped]
        summary = Summary()

        # ★ 对接手一份**不是本工具写的**库的那一次，是换库，不是修订。
        #
        # 不区分的话，`plan()` 会把每一处「旧值 → 真实值」都判成一次修订，
        # 于是真实值以 revision=1、status='revised' 落库，revision=0 留着那个
        # 来路不明的数。后果有两个，都不轻：
        #   - 界面上满屏「已修订」，像是在说统计局改了数，而实际是我们在
        #     换掉一份旧库——这是错误的信息，不只是不好看；
        #   - 修订历史里躺着一条旧值，看起来像「上一版的真实统计」。
        # 实测合成时代第一次落盘产生了 2140 行这样的「修订」。
        #
        # 判据取自**库自己的内容**，不是一个标记位：本工具每次落盘都会
        # `delete_foreign_log`，所以正常重跑时这里为空、走的仍是修订；
        # 而对着旧库跑第一次，`fetch_log` 里还有别人写的流水，它非空。
        # 这比读 `app_meta` 更严——手工拼出来的库同样认得出来，
        # 也没有一个「忘了设标记位」的失败模式。
        known_sources = _known_sources()
        rebase = bool(db.foreign_log_counts(connection, known_sources))
        if rebase:
            _rebase_note(connection, scoped, summary)

        plan = _plan_sourced(connection, outcomes, ids, summary, rebase=rebase)
        plan += _plan_unsourced(connection, scoped, outcomes, options, summary,
                                today.isoformat())
        # 未纳入采集范围的指标与 `--tier` 无关：不管这次只跑哪一层，
        # 库里都不该留下没人认领的值。
        _plan_unclaimed(connection, catalog, summary)
        # 同理，采集流水也只该留下写这些观测的那几次。
        _plan_foreign_log(connection, summary)

        _print_summary(summary, plan, outcomes, options, out)
        if options.dry_run:
            print('\n--dry-run：以上差异未落盘。', file=out)
            return 1 if any(not o.ok for o in outcomes) else 0

        if options.backup:
            print(f'\n已备份原库到 {db.backup(options.db).name}', file=out)

        purged = _purge(connection, summary.purges)
        # 必须在 `_log` 之前：这一步删的是**别的来源**的流水，
        # 本次写的那些 source_id 都在 `known_sources` 里，不会被它碰到。
        stale_log = db.delete_foreign_log(connection, known_sources)
        written = db.apply(connection, plan, started_at)
        finished_at = db.utc_now()
        _log(connection, outcomes, summary, sources, started_at, finished_at)

        db.mark_fetched(connection, finished_at, sources)
        db.set_meta(connection, 'release_rule_version', '1')
        db.set_meta(connection, 'fetch_tool', f'macro_fetcher/{__version__}')
        if UNSOURCED:
            db.set_meta(connection, 'unsourced_indicators', ','.join(sorted(UNSOURCED)))

        removed = f'，清除无来源的值 {purged} 行' if purged else ''
        # 与「清除无来源的值 N 行」分开报：一个是观测，一个是流水，混成一个数字
        # 会让报告里那句最该被信任的话变得没法核对。
        dropped = f'，清除来源不明的流水 {stale_log} 条' if stale_log else ''
        print(f'\n写入 {written} 行{removed}{dropped}，'
              f'清理附属文件：{db.clear_sidecars(options.db) or "无"}', file=out)
        print(f'observation 现共 {db.observation_count(connection)} 行', file=out)
        return 1 if any(not o.ok for o in outcomes) else 0
    finally:
        connection.close()


def _rebase_note(connection, scoped: list[Indicator], summary: Summary) -> None:
    """登记「清掉这份旧库里的全部观测」这件事（只登记，不删）。

    删除仍然只在落盘那条分支上发生，所以 `--dry-run` 能把这一步如实打印出来，
    而不是承诺一个它没有模拟的动作。
    """
    for indicator in scoped:
        rows = db.counts_by_indicator(connection, [indicator.id]).get(indicator.id, 0)
        if rows:
            summary.purges[indicator.id] = rows
    total = sum(summary.purges.values())
    if total:
        summary.notes.append(
            '库里还有非本工具写的采集流水，这份库来历不明，'
            f'本次按**换库**处理：先清掉 {total} 行旧观测，'
            '真实值从 revision 0 开始，不产生假的「修订」记录',
        )


def _plan_sourced(connection, outcomes: list[Outcome], ids: list[str],
                  summary: Summary, rebase: bool = False) -> list[db.PlannedWrite]:
    # rebase 时把现存版本当成空的：那些行马上就会被 `_purge` 删掉，
    # 若在这里仍按它们比对，plan 出来的就不是「新增」而是「修订」。
    existing = {} if rebase else db.current_revisions(connection, ids)
    plan: list[db.PlannedWrite] = []
    for outcome in outcomes:
        if not outcome.ok:
            continue
        writes = db.plan(outcome.indicator, outcome.observations, existing)
        summary.record(outcome.indicator.id, writes)
        plan.extend(writes)
    return plan


def _plan_unsourced(connection, scoped: list[Indicator], outcomes: list[Outcome],
                    options: Options, summary: Summary,
                    today: str) -> list[db.PlannedWrite]:
    """无源指标：先清掉库里那些有值的旧行，再写真实的空行。

    留着旧值的后果不是「少了点东西」，而是没有采集记录的数继续显示。
    清空需要显式同意（默认执行、`--keep-unsourced` 保留），因为它是本次改造里
    唯一会删数据的动作。
    """
    unsourced = [i for i in scoped if i.id in UNSOURCED]
    if not unsourced:
        return []

    cover_end = _cover_end(outcomes)
    if cover_end is None:
        # 一个指标都没取到，就没有「应该有哪些月份」的依据。
        # 此时宁可不写，也不要按今天编出一段未来月份的缺失。
        summary.notes.append(
            '本轮没有任何指标取到数据，无源指标的空行也一并跳过（缺少覆盖范围依据）',
        )
        return []

    plan: list[db.PlannedWrite] = []
    for indicator in unsourced:
        # 「有值」才叫有无来源的值要清。上一轮自己写的空行不算——否则每次运行都会
        # 清掉再写回同一批空行，报告里那句「清除无来源的值 N 行」就成了假话。
        valued = db.valued_counts(connection, [indicator.id]).get(indicator.id, 0)
        rows = db.counts_by_indicator(connection, [indicator.id]).get(indicator.id, 0)
        existing = db.current_revisions(connection, [indicator.id])
        if valued and not options.keep_unsourced:
            # 计划清空：没有采集记录的旧值不能留。这里只登记，不删——
            # `--dry-run` 与落盘共用这条分支，删除动作只在落盘时发生。
            summary.purges[indicator.id] = rows
            summary.notes.append(
                f'{indicator.id}：将清除库里现有的值 {rows} 行（{UNSOURCED[indicator.id]}）',
            )
            existing = {}  # 清空后一切从零开始，新行都是 revision 0
        writes = db.plan(
            indicator,
            _unsourced_observations(indicator, options.since, cover_end, today),
            existing,
        )
        summary.record(indicator.id, writes)
        plan.extend(writes)
    return plan


def _plan_unclaimed(connection, catalog: dict[str, Indicator], summary: Summary) -> None:
    """清掉**没人认领**的指标的观测：既没有取数规则，也不在 `UNSOURCED` 里。

    ★ 这条是「库里每一条观测都必须是真实的」这个不变量的执行处。

    为什么不能留着（留着反正界面会标）：应用对**整库**声明「真实统计数据」，
    那句声明没有按指标区分的余地。库里只要还躺着一批没人认领的值，横幅、
    图表署名、CSV 出处列就会一起把它说成真实统计。
    实测第一次改造后残留在库里的这类值有 7911 行，占全库 76%，而它们和
    改造前的内置库逐字节相同。

    为什么不给它们也写空行（像 `UNSOURCED` 那样）：无源指标的空行是一条
    **声明**——「这些期间该有值而我们没有」。未纳入采集的指标连期间网格都还
    没人认领，编一套出来只是换了个地方合成。

    没有「保留」的开关：`--dry-run` 已经是不落盘的试跑路径，再留一个
    「保留这些值但仍然声称是真实库」的开关，就等于留了一条自我欺骗的路。
    """
    claimed = set(RULES) | set(UNSOURCED) | set(DERIVED)
    unknown = {i: n for i, n in db.counts_all_indicators(connection).items()
               if i not in claimed}
    if not unknown:
        return

    summary.purges.update(unknown)
    summary.notes.append(
        f'{len(unknown)} 个指标未纳入采集范围（无取数规则、也非登记的无源指标），'
        f'清除其观测共 {sum(unknown.values())} 行；'
        '这些指标在库里变成「暂无数据」，而不是顶着它们冒充真实统计',
    )
    # 观测行所属的指标不在指标目录里，是另一回事：说明库被外部改过。
    # 一并清掉，但要说出来——静默删掉一个目录里没有的 id，将来没人查得出来。
    catalog_ids = set(catalog)
    for indicator_id in sorted(set(unknown) - catalog_ids):
        summary.notes.append(f'  · {indicator_id} 不在指标目录里，一并清除')


def _known_sources() -> list[str]:
    """抓取器认可的 `fetch_log.source_id` = 取数规则里声明过的源。

    ★ 取**全集**，不是本次跑到的那些：`--only cn.cpi.yoy` 时只有 eastmoney
    在跑，但 nbs / safe 的流水仍然是合法的，清掉它们等于用一个单指标试跑
    毁掉整份采集记录。
    """
    return sorted({rule.source for rule in RULES.values()})


def _source_of(indicator_id: str) -> str:
    """这个指标的流水该记在哪个源名下。

    计算指标没有自己的上游，记在它输入所在的那个源下——自检保证输入同源。
    认不出来的记 `none`：宁可显眼，也不要随便挂到一个源上冒名。
    """
    rule = RULES.get(indicator_id)
    if rule is not None:
        return rule.source
    return derived_source(indicator_id) or 'none'


def _plan_foreign_log(connection, summary: Summary) -> None:
    """清掉 `fetch_log` 里不是本抓取器写的那些行。

    ★ 与 `_plan_unclaimed` 是同一条不变量的两半：那边管观测，这边管流水。
    这条同时是**换库判据**：主流程在算 plan 之前问一次 `foreign_log_counts`
    （见那里的注释），非空就按换库处理。清掉之后下一次运行它就是空的。
    只有观测干净是不够的——库里留着一条「内置示例数据文件 · 非真实统计
    数据 · 10465 条」的记录，而全库实际只有 2498 行；任何人打开这个文件
    都会先看到它，然后有理由怀疑整库。实测确实留着两条（535 行和 10465 行，
    都是合成时代的产物）。

    `fetch_log` 是**流水**，通常不该删——它记的是发生过的事。这两条是例外：
    它们记的是**另一个库**的历史。内置文件被整份换成真实数据之后，那两次
    「写入」在这个文件里没有留下任何对应的行。
    """
    foreign = db.foreign_log_counts(connection, _known_sources())
    if not foreign:
        return
    detail = '、'.join(f'{source} {count} 条' for source, count in sorted(foreign.items()))
    summary.notes.append(
        f'清除 {sum(foreign.values())} 条来源不在采集范围内的流水（{detail}）；'
        '它们记录的是合成时代那个内置文件，与库中现存观测对不上',
    )


def _purge(connection, purges: dict[str, int]) -> int:
    """执行 `_plan_unsourced` / `_plan_unclaimed` 登记的删除。返回实际删除的行数。"""
    removed = 0
    for indicator_id in purges:
        removed += db.delete_indicator(connection, indicator_id)
    return removed


def _log(connection, outcomes: list[Outcome], summary: Summary, sources: list[str],
         started_at: str, finished_at: str) -> None:
    # 明细行用**较早**的 started_at：`queries.ts` 的 sourceHealth 取
    # `ORDER BY started_at DESC LIMIT 1`，若明细行更晚就会顶掉汇总行，
    # 把「部分失败」显示成该源的最终状态。
    for outcome in outcomes:
        db.log_fetch(
            connection, _source_of(outcome.indicator.id),
            f'{started_at}-{outcome.indicator.id}', started_at,
            'ok' if outcome.ok else 'fail',
            summary.rows_for(outcome.indicator.id),
            outcome.error or outcome.note or '发布日为按惯例推算，非官方发布时刻',
            indicator_id=outcome.indicator.id,
        )

    for source in sources:
        failed = [o for o in outcomes if not o.ok and _source_of(o.indicator.id) == source]
        written = sum(summary.rows_for(o.indicator.id) for o in outcomes
                      if o.ok and _source_of(o.indicator.id) == source)
        db.log_fetch(
            connection, source, started_at, finished_at,
            'partial' if failed else 'ok', written,
            (f'{len(failed)} 个指标失败：'
             + '、'.join(o.indicator.id for o in failed))
            if failed else '全部成功；发布日为按惯例推算，非官方发布时刻',
        )


def _print_summary(summary: Summary, plan: list[db.PlannedWrite],
                   outcomes: list[Outcome], options: Options, out) -> None:
    # 失败列在最前：整轮跑完只剩「少了几个指标」而无从查起，最费时间。
    failed = [o for o in outcomes if not o.ok]
    if failed:
        print(f'\n{len(failed)} 个指标抓取失败（未写入，其余照常）：', file=out)
        for outcome in failed:
            print(f'  ✗ {outcome.indicator.id}：{outcome.error}', file=out)

    print('\n指标                          新增   修订', file=out)
    for indicator_id in sorted(set(summary.new) | set(summary.revised)):
        print(f'  {indicator_id:26s} {summary.new.get(indicator_id, 0):5d} '
              f'{summary.revised.get(indicator_id, 0):6d}', file=out)
    for note in summary.notes:
        print(f'  · {note}', file=out)
    if options.dry_run and plan:
        print('\n前 20 条差异：', file=out)
        for write in plan[:20]:
            observation = write.observation
            value = '—' if observation.value is None else f'{observation.value}'
            print(f'  [{write.reason:7s}] {observation.indicator_id:26s} '
                  f'{observation.period:10s} {value:>14s} '
                  f'-> revision {write.revision} ({write.status})', file=out)


# ── argparse ──────────────────────────────────────────────────────────


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog='python3 -m macro_fetcher',
        description='把真实宏观统计数据写入 resources/macro.db',
    )
    parser.add_argument('--db', type=Path, default=DEFAULT_DB,
                        help=f'目标库（默认 {DEFAULT_DB}）')
    parser.add_argument('--tier', default='P0',
                        help='指标层级，逗号分隔（默认 P0；传 all 表示全部已登记指标）')
    parser.add_argument('--only', default=None,
                        help='只跑这几个指标，逗号分隔')
    parser.add_argument('--from', dest='since', default=DEFAULT_FROM, metavar='YYYY-MM',
                        help=f'起始期间（默认 {DEFAULT_FROM}）')
    parser.add_argument('--dry-run', action='store_true',
                        help='只打印将要写入的差异，不落盘')
    parser.add_argument('--no-backup', action='store_true',
                        help='不备份原库（默认备份成 macro.db.bak-<时间戳>）')
    parser.add_argument('--keep-unsourced', action='store_true',
                        help='保留无源指标在库里的旧值（默认清掉，'
                             '以免没有采集记录的数字被当成真实统计展示）')
    parser.add_argument('--version', action='version', version=f'macro_fetcher {__version__}')
    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    since = parse_period(args.since)
    if since is None or since.kind != 'month':
        print(f'--from 需要是月度期间（YYYY-MM），收到：{args.since}')
        return 2
    options = Options(
        db=args.db,
        tier=None if args.tier in (None, 'all') else args.tier,
        only=[s.strip() for s in args.only.split(',') if s.strip()] if args.only else None,
        since=args.since,
        dry_run=args.dry_run,
        backup=not args.no_backup,
        keep_unsourced=args.keep_unsourced,
    )
    return run(options)
