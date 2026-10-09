"""发布日推算规则的单测。

这些日期是**推算的、不是官方发布时刻**（见 releases.py 的模块文档）。
既然要按它们画发布日历，就得把每条规则的实际产出钉死——
规则改一处而没改测试，等于悄悄改了整个发布日历。
"""

from __future__ import annotations

import unittest
from dataclasses import replace

from macro_fetcher import releases
from macro_fetcher.catalog import Indicator, load_catalog

#: 一个字段齐全的月度指标，各用例只改自己关心的那几个字段。
BASE = Indicator(
    id='cn.test', name_zh='测试', name_short='测试', category='growth',
    unit='%', frequency='month', value_type='yoy', seasonal_adj=False,
    decimals=1, is_headline=False, tier='P0', note=None,
)


def _indicator(**overrides) -> Indicator:
    return replace(BASE, **overrides)


class Rules(unittest.TestCase):
    def test_next_month_09(self) -> None:
        self.assertEqual(releases.next_month_09('2026-08'), '2026-09-09')

    def test_next_month_09_crosses_year(self) -> None:
        self.assertEqual(releases.next_month_09('2026-12'), '2027-01-09')

    def test_next_month_15(self) -> None:
        self.assertEqual(releases.next_month_15('2026-08'), '2026-09-15')

    def test_next_month_20(self) -> None:
        self.assertEqual(releases.next_month_20('2026-08'), '2026-09-20')

    def test_period_end_for_pmi(self) -> None:
        # 制造业 PMI 在当月最后一天发布：8 月 31 日、2 月 28 日
        self.assertEqual(releases.period_end('2026-08'), '2026-08-31')
        self.assertEqual(releases.period_end('2026-02'), '2026-02-28')

    def test_quarter_next_month_16(self) -> None:
        self.assertEqual(releases.quarter_next_month_16('2026Q2'), '2026-07-16')

    def test_year_next_january_17(self) -> None:
        self.assertEqual(releases.year_next_january_17('2025'), '2026-01-17')

    def test_lpr_quoted_same_month_on_20th(self) -> None:
        # 2026-09-20 是周日，顺延到周一 21 日
        self.assertEqual(releases.this_month_20_weekday('2026-09'), '2026-09-21')
        # 2026-08-20 是周四，不挪
        self.assertEqual(releases.this_month_20_weekday('2026-08'), '2026-08-20')


class LprNeverRollsToNextMonth(unittest.TestCase):
    """★ LPR 是**当月**报价，与统计局月度数据的「次月发布」惯例相反。

    把两者混起来会让每期 LPR 的发布日整整晚一个月，
    而日期看起来仍然是个正常的日期——发布日历上才会看出错位。
    """

    def test_lpr_release_is_in_the_same_month(self) -> None:
        for period in ('2026-01', '2026-06', '2026-12'):
            released = releases.this_month_20_weekday(period)
            self.assertTrue(released.startswith(period),
                            f'{period} 的 LPR 发布日推成了 {released}，跨月了')

    def test_month_end_weekend_rolls_into_next_month(self) -> None:
        # 2026-06-20 是周六 → 22 日周一，仍在 6 月内
        self.assertEqual(releases.this_month_20_weekday('2026-06'), '2026-06-22')


class RuleSelection(unittest.TestCase):
    def test_price_category_uses_9th(self) -> None:
        self.assertEqual(releases.rule_for(_indicator(category='price')), 'next_month_09')

    def test_fiscal_uses_20th(self) -> None:
        self.assertEqual(releases.rule_for(_indicator(category='fiscal')), 'next_month_20')

    def test_sentiment_uses_period_end(self) -> None:
        self.assertEqual(releases.rule_for(_indicator(category='sentiment')), 'period_end')

    def test_default_is_15th(self) -> None:
        self.assertEqual(releases.rule_for(_indicator(category='growth')), 'next_month_15')

    def test_lpr_wins_over_frequency(self) -> None:
        """LPR 的 id 前缀优先于频率/category 的通用规则。"""
        picked = releases.rule_for(_indicator(id='cn.lpr.1y', category='price'))
        self.assertEqual(picked, 'this_month_20_weekday')

    def test_daily_uses_same_period(self) -> None:
        self.assertEqual(releases.rule_for(_indicator(frequency='day')), 'same_period')

    def test_quarterly_uses_quarter_rule(self) -> None:
        self.assertEqual(releases.rule_for(_indicator(frequency='quarter')),
                         'quarter_next_month_16')


class ReleasedAt(unittest.TestCase):
    """`released_at()` 是外面真正调用的入口，它多了一层下界校验。"""

    def test_daily_series_releases_on_the_day(self) -> None:
        indicator = _indicator(id='cn.fx_rate.usd_cny', frequency='day', unit='CNY/USD')
        self.assertEqual(releases.released_at(indicator, '2026-08-31'), '2026-08-31')

    def test_monthly_release_is_after_the_period(self) -> None:
        released = releases.released_at(_indicator(category='price'), '2026-08')
        self.assertGreater(released, '2026-08-31')

    def test_lpr_release_is_before_period_end(self) -> None:
        """★ 回归用例：曾把下界写成 period_end，于是所有 LPR 都被判成规则错配。

        LPR 当月 20 日报价，天然早于月末。下界必须是**期间起点**。
        """
        released = releases.released_at(_indicator(id='cn.lpr.1y'), '2026-08')
        self.assertEqual(released, '2026-08-20')
        self.assertLess(released, '2026-08-31')

    def test_unknown_period_kind_returns_none(self) -> None:
        # 期间类型与规则不匹配（比如给季度规则喂月度期间）时给 None，
        # 由写入层把 released_at 留空，而不是编一个日期
        self.assertIsNone(releases.quarter_next_month_16('2026-08'))


class EveryP0IndicatorGetsAReleaseDate(unittest.TestCase):
    """目录里每个 P0 指标、每个期间形态，都要能算出一个发布日。

    漏掉一条规则的症状是那一类指标的 `released_at` 全是空的，
    发布日历页上整片空白——但不会有任何报错。
    """

    #: 每种频率配一个该频率的期间，不能一律喂月度期间——
    #: 季度指标拿到月度期间会算不出发布日，而那正是这条用例要拦的事。
    PERIODS = {'day': '2026-08-31', 'month': '2026-08',
               'quarter': '2026Q2', 'year': '2025'}

    def test_every_p0_indicator_gets_a_release_date(self) -> None:
        catalog = load_catalog()
        checked = 0
        for indicator in catalog.values():
            if indicator.tier != 'P0':
                continue
            period = self.PERIODS[indicator.frequency]
            released = releases.released_at(indicator, period)
            self.assertIsNotNone(
                released, f'{indicator.id}（{indicator.frequency}）算不出发布日')
            self.assertGreaterEqual(
                released, releases.period_start(period),
                f'{indicator.id} 的发布日 {released} 早于期间起点')
            checked += 1
        self.assertGreater(checked, 20, 'P0 指标数不对，覆盖面可能漏了')


if __name__ == '__main__':
    unittest.main()
