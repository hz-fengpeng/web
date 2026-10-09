"""发布日（`released_at`）的推算规则。

★ **这些日期是推算的，不是官方发布时刻。** 统计局和东财都不提供发布时刻，
只有期间和值。所以这里按各指标的**惯例发布节奏**倒推一个日期，
沿用内置数据一直在用的同一套约定（M1d 起发布日历页就是这么排的），
这样换数据前后日历页的行为一致。

推算值必须留下痕迹，做法有三处：
- 每次运行往 `fetch_log.message` 里写一句「发布日为按惯例推算」；
- `app_meta` 里记 `release_rule_version`；
- docs/08 §14.6 列出手上这套规则与它们的选法。

将来若接入统计局的发布库（`www.stats.gov.cn/sj/zxfb/`）拿到真实发布日，
应该写进一直空着的 `release_index` 表——那才是这张表的预期写方。
"""

from __future__ import annotations

from collections.abc import Callable
from datetime import date, timedelta

from .catalog import Indicator
from .periods import parse_period, shift_months

# 规则：期间字符串 → 发布日期（ISO 日期）
Release = Callable[[str], 'str | None']


def _end_of(period: str) -> str | None:
    parsed = parse_period(period)
    return None if parsed is None else parsed.end


def same_period(period: str) -> str | None:
    """当日发布（日度序列）。"""
    return _end_of(period)


def period_end(period: str) -> str | None:
    """期末当天发布。制造业 PMI 是这个节奏：当月最后一天上午出数。"""
    return _end_of(period)


def _next_month_day(period: str, day: int) -> str | None:
    parsed = parse_period(period)
    if parsed is None or parsed.kind != 'month':
        return None
    following = shift_months(period, 1)
    return f'{following}-{day:02d}'


def next_month_09(period: str) -> str | None:
    """物价数据：次月 9 日左右（CPI/PPI 同一天发布）。"""
    return _next_month_day(period, 9)


def next_month_15(period: str) -> str | None:
    """其余月度数据：次月 15 日左右（工业、消费、投资、外贸一组同发）。"""
    return _next_month_day(period, 15)


def next_month_20(period: str) -> str | None:
    """财政数据：次月 20 日左右。"""
    return _next_month_day(period, 20)


def this_month_20_weekday(period: str) -> str | None:
    """LPR：**当月** 20 日报价，遇周末顺延到下一个工作日。

    注意是当月不是次月——LPR 是当月值当月发布，与统计局的月度数据不同。
    """
    parsed = parse_period(period)
    if parsed is None or parsed.kind != 'month':
        return None
    quoted = date.fromisoformat(f'{period}-20')
    while quoted.weekday() >= 5:  # 5=周六 6=周日
        quoted += timedelta(days=1)
    return quoted.isoformat()


def quarter_next_month_16(period: str) -> str | None:
    """GDP：季末次月 16 日左右。"""
    parsed = parse_period(period)
    if parsed is None or parsed.kind != 'quarter':
        return None
    year, month = parsed.year, parsed.index * 3
    following = shift_months(f'{year}-{month:02d}', 1)
    return f'{following}-16'


def year_next_january_17(period: str) -> str | None:
    """年度数据：次年 1 月 17 日左右。"""
    parsed = parse_period(period)
    return None if parsed is None else f'{parsed.year + 1}-01-17'


RELEASES: dict[str, Release] = {
    'same_period': same_period,
    'period_end': period_end,
    'next_month_09': next_month_09,
    'next_month_15': next_month_15,
    'next_month_20': next_month_20,
    'this_month_20_weekday': this_month_20_weekday,
    'quarter_next_month_16': quarter_next_month_16,
    'year_next_january_17': year_next_january_17,
}

# 按指标属性选规则，与内置数据一直在用的约定一致。
# 逐条写死在映射表里也可以，但那张表已经有 23 行、以后还有 80 多行，
# 把「所有物价指标都是次月 9 日」抄 4 遍，改一次要改 4 处。
_BY_CATEGORY = {
    'price': 'next_month_09',
    'fiscal': 'next_month_20',
    'sentiment': 'period_end',
}


def rule_for(indicator: Indicator) -> str:
    """选出该指标的发布日规则名。"""
    if indicator.id.startswith('cn.lpr.'):
        return 'this_month_20_weekday'
    if indicator.frequency == 'day':
        return 'same_period'
    if indicator.frequency == 'quarter':
        return 'quarter_next_month_16'
    if indicator.frequency == 'year':
        return 'year_next_january_17'
    return _BY_CATEGORY.get(indicator.category, 'next_month_15')


def period_start(period: str) -> str | None:
    """期间的第一天。用来兜住「发布日早于期间」这种明显的规则错配。"""
    parsed = parse_period(period)
    if parsed is None:
        return None
    if parsed.kind == 'day':
        return parsed.text
    if parsed.kind == 'month':
        return f'{period}-01'
    if parsed.kind == 'quarter':
        return f'{parsed.year}-{parsed.index * 3 - 2:02d}-01'
    return f'{parsed.year}-01-01'


def released_at(indicator: Indicator, period: str) -> str | None:
    name = rule_for(indicator)
    result = RELEASES[name](period)
    # ★ 只检查「不早于期间开始」，**不检查「不早于期末」**：
    # LPR 是当月 20 日报价（例：2026-09 的 LPR 在 9 月 20 日公布），
    # 发布日天然早于月末。拿期末当下界会把正确的规则判成错误。
    start = period_start(period)
    if result is not None and start is not None and result < start:
        raise ValueError(
            f'{indicator.id} {period}: 推算的发布日 {result} 早于期间起点 {start}，'
            f'规则 {name} 与期间对不上',
        )
    return result
