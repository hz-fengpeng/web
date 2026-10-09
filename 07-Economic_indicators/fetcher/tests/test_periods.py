"""期间与期末：逐条对照 `src/shared/period.ts`。

对照表是 node 跑出来的（`fetcher/tools/export-periods.mjs`），不是手抄的。
手抄只能验「我以为对的那几条」，而算错一天的恰恰是我没想到的那条。
"""

from __future__ import annotations

import json
import unittest

from macro_fetcher import periods

from .support import FIXTURES

FIXTURE = FIXTURES / 'period_end.json'


class PeriodsAgainstTs(unittest.TestCase):
    """与 TS 生成的对照表逐条比对。"""

    @classmethod
    def setUpClass(cls) -> None:
        if not FIXTURE.exists():
            raise unittest.SkipTest(
                f'{FIXTURE} 不存在；先跑 node fetcher/tools/export-periods.mjs',
            )
        cls.data = json.loads(FIXTURE.read_text(encoding='utf-8'))

    def test_known_periods_match(self) -> None:
        for case in self.data['cases']:
            with self.subTest(period=case['period']):
                parsed = periods.parse_period(case['period'])
                self.assertIsNotNone(parsed, f'{case["period"]} 应当可解析')
                self.assertEqual(parsed.kind, case['kind'])
                self.assertEqual(parsed.end, case['end'])

    def test_invalid_periods_rejected(self) -> None:
        # 这些串在 TS 侧返回 null，Python 侧必须同样返回 None。
        # 若某侧擅自「宽容」了（比如把 2026-02-30 当成 3 月 2 日），
        # 库里就会多出一期不存在的观测。
        for text in self.data['invalid']:
            with self.subTest(period=text):
                self.assertIsNone(periods.parse_period(text))
                with self.assertRaises(ValueError):
                    periods.period_end(text)

    def test_fixture_is_not_empty(self) -> None:
        # 对照表被生成器写空时，上面两个用例会「全过」——所以钉一条数量下限。
        self.assertGreater(len(self.data['cases']), 30)


class PeriodEdgeCases(unittest.TestCase):
    """几条写死在用例里的边界，不依赖 fixture，读代码时能直接看到期望值。"""

    def test_leap_year_february(self) -> None:
        self.assertEqual(periods.period_end('2024-02'), '2024-02-29')
        self.assertEqual(periods.period_end('2023-02'), '2023-02-28')
        self.assertEqual(periods.period_end('1900-02'), '1900-02-28')  # 百年不闰
        self.assertEqual(periods.period_end('2000-02'), '2000-02-29')  # 四百年又闰

    def test_quarter_ends(self) -> None:
        self.assertEqual(periods.period_end('2026Q1'), '2026-03-31')
        self.assertEqual(periods.period_end('2026Q2'), '2026-06-30')
        self.assertEqual(periods.period_end('2026Q3'), '2026-09-30')
        self.assertEqual(periods.period_end('2026Q4'), '2026-12-31')

    def test_year_and_day_are_identity_like(self) -> None:
        self.assertEqual(periods.period_end('2026'), '2026-12-31')
        self.assertEqual(periods.period_end('2026-08-31'), '2026-08-31')

    def test_month_bounds(self) -> None:
        self.assertIsNone(periods.parse_period('2026-00'))
        self.assertIsNone(periods.parse_period('2026-13'))

    def test_month_period_pads(self) -> None:
        self.assertEqual(periods.month_period(2026, 1), '2026-01')
        self.assertEqual(periods.month_period(2026, 12), '2026-12')


class PeriodRanges(unittest.TestCase):
    def test_months_between_inclusive(self) -> None:
        self.assertEqual(periods.months_between('2025-11', '2026-02'),
                         ['2025-11', '2025-12', '2026-01', '2026-02'])
        self.assertEqual(periods.months_between('2026-02', '2026-02'), ['2026-02'])
        self.assertEqual(periods.months_between('2026-03', '2026-02'), [])

    def test_quarters_between_inclusive(self) -> None:
        self.assertEqual(periods.quarters_between('2025Q4', '2026Q2'),
                         ['2025Q4', '2026Q1', '2026Q2'])

    def test_shift_months_crosses_years(self) -> None:
        self.assertEqual(periods.shift_months('2025-12', 1), '2026-01')
        self.assertEqual(periods.shift_months('2026-01', -1), '2025-12')
        self.assertEqual(periods.shift_months('2026-05', 12), '2027-05')
        self.assertEqual(periods.shift_months('2026-05', 0), '2026-05')

    def test_previous_day_crosses_year(self) -> None:
        self.assertEqual(periods.previous_day('2026-01-01'), '2025-12-31')
        self.assertEqual(periods.previous_day('2024-03-01'), '2024-02-29')
