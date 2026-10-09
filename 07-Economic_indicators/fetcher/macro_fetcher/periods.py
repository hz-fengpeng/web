"""期间（period）与期末日期（period_end）的规范化。

★ 这份实现必须与 `src/shared/period.ts` 逐条对齐。两边不一致的后果不是
报错，而是**排序错乱**：应用按 `period_end` 排序和取时间窗，期末算错一天，
最新一期就可能排到上期前面，图上出现折返。

为什么要有一份镜像而不是直接复用 TS：抓取器是离线 Python 工具，
跑在 Node 之外。规则本身很短，复制比跨语言桥接便宜；不一致由
`tests/test_periods.py` 里对照 TS 行为的固定用例钉住。
"""

from __future__ import annotations

import calendar
import re
from dataclasses import dataclass
from datetime import date

# 期间字符串的四种形态，与 src/shared/period.ts 的四个正则一致
_DAY_RE = re.compile(r'^(\d{4})-(\d{2})-(\d{2})$')
_MONTH_RE = re.compile(r'^(\d{4})-(\d{2})$')
_QUARTER_RE = re.compile(r'^(\d{4})Q([1-4])$')
_YEAR_RE = re.compile(r'^(\d{4})$')

# 与 types.ts 的 Frequency 一致
KINDS = ('day', 'month', 'quarter', 'year')


@dataclass(frozen=True)
class Period:
    """一个已解析的期间。`end` 是排序与跨频率对齐用的真实日期。"""

    kind: str
    year: int
    index: int  # 月=1..12，季=1..4，日=日，年恒为 1
    text: str  # 规范化后的期间字符串
    end: str  # 期末日期 ISO，如 '2026-08-31'


def month_end(year: int, month: int) -> str:
    """月末日期。用 calendar.monthrange 而不是 `第 0 天` 技巧——
    Python 的 date 没有 JS Date 那种「第 0 天回退」的语义。"""
    return date(year, month, calendar.monthrange(year, month)[1]).isoformat()


def parse_period(text: str) -> Period | None:
    """解析期间字符串；无法识别时返回 None（调用方决定是报错还是跳过）。"""
    m = _DAY_RE.match(text)
    if m:
        year, month, day = int(m[1]), int(m[2]), int(m[3])
        try:
            value = date(year, month, day)
        except ValueError:
            return None
        # 拒绝 2026-02-30 这种「正则过得去、日期不存在」的串
        if value.isoformat() != text:
            return None
        return Period('day', year, day, text, text)

    m = _MONTH_RE.match(text)
    if m:
        year, month = int(m[1]), int(m[2])
        if not 1 <= month <= 12:
            return None
        return Period('month', year, month, text, month_end(year, month))

    m = _QUARTER_RE.match(text)
    if m:
        year, quarter = int(m[1]), int(m[2])
        # 该季最后一个月是 quarter*3，期末即它的月末
        return Period('quarter', year, quarter, text, month_end(year, quarter * 3))

    m = _YEAR_RE.match(text)
    if m:
        year = int(m[1])
        return Period('year', year, 1, text, f'{year}-12-31')

    return None


def period_end(text: str) -> str:
    """期间 → 期末日期。与 `src/shared/period.ts` 的 `periodEnd()` 同义。"""
    parsed = parse_period(text)
    if parsed is None:
        raise ValueError(f'无法解析期间: {text}')
    return parsed.end


def month_period(year: int, month: int) -> str:
    return f'{year:04d}-{month:02d}'


def quarter_period(year: int, quarter: int) -> str:
    return f'{year:04d}Q{quarter}'


def months_between(start: str, end: str) -> list[str]:
    """闭区间内的所有月份期间，`'2021-09'` → `'2026-08'` 形式。"""
    y1, m1 = int(start[:4]), int(start[5:7])
    y2, m2 = int(end[:4]), int(end[5:7])
    out: list[str] = []
    year, month = y1, m1
    while (year, month) <= (y2, m2):
        out.append(month_period(year, month))
        year, month = (year + 1, 1) if month == 12 else (year, month + 1)
    return out


def quarters_between(start: str, end: str) -> list[str]:
    """闭区间内的所有季度期间，参数形如 `'2021Q3'` / `'2026Q2'`。"""
    y1, q1 = int(start[:4]), int(start[5])
    y2, q2 = int(end[:4]), int(end[5])
    out: list[str] = []
    year, quarter = y1, q1
    while (year, quarter) <= (y2, q2):
        out.append(quarter_period(year, quarter))
        year, quarter = (year + 1, 1) if quarter == 4 else (year, quarter + 1)
    return out


def years_between(start: str, end: str) -> list[str]:
    """闭区间内的所有年份期间（`'2021'` → `'2026'`）。"""
    return [str(year) for year in range(int(start), int(end) + 1)]


def shift_months(period: str, delta: int) -> str:
    """月度期间平移，用来推算发布日期（如 CPI 次月 9 日）。"""
    year, month = int(period[:4]), int(period[5:7])
    total = year * 12 + (month - 1) + delta
    return month_period(total // 12, total % 12 + 1)


def previous_day(text: str) -> str:
    from datetime import timedelta

    return (date.fromisoformat(text) - timedelta(days=1)).isoformat()
