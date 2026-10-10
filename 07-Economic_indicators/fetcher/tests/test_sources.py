"""适配器里**不联网也测得动**的那部分。

`akshare_src` 的绝大部分是「把上游的表搬下来」，真正属于我们的判断只有两处：
**期间怎么读**、**要分页的接口窗口怎么切**。两者都属于「错了不报错」的类型——
期间读错只是那几行被静默跳过（看起来像源没更新），窗口切错只是少了几段。
网络那一侧靠人工跑 `--dry-run` 看，这里只钉纯函数。
"""

from __future__ import annotations

import unittest
from datetime import date, timedelta

from macro_fetcher.sources import SourceError
from macro_fetcher.sources.akshare_src import (
    PERIOD_READERS,
    _add_months,
    _windows,
    cn_month,
    dot_month,
    iso_month,
)


class DotMonth(unittest.TestCase):
    """新浪系月度表：`2026.8`（月不补零）。"""

    def test_reads_a_month(self) -> None:
        self.assertEqual(dot_month('2026.8'), '2026-08')
        self.assertEqual(dot_month('2026.12'), '2026-12')
        self.assertEqual(dot_month('1952.12'), '1952-12')
        self.assertEqual(dot_month(' 2026.1 '), '2026-01')

    def test_rejects_things_that_are_not_this_format(self) -> None:
        # ★ 这一条是防「格式放宽到把别的写法也吃进来」：
        # 吃进来只会多几行期间怪异的观测，不报错。
        for text in ('2026-08', '2026年08月份', '202608', '', None, '2026.13', '2026.0'):
            with self.subTest(text=text):
                self.assertIsNone(dot_month(text))

    def test_is_registered(self) -> None:
        self.assertIs(PERIOD_READERS['dot_month'], dot_month)


class Registry(unittest.TestCase):
    def test_every_reader_is_callable_and_none_safe(self) -> None:
        """读不出期间的输入一律返回 None（跳过那一行），不抛异常。"""
        for name, reader in PERIOD_READERS.items():
            with self.subTest(reader=name):
                self.assertIsNone(reader(None))
                self.assertIsNone(reader(''))

    def test_neighbouring_readers_are_unchanged(self) -> None:
        """顺手钉住原有读法：加新读法时最容易碰坏的就是它们。"""
        self.assertEqual(cn_month('2026年08月份'), '2026-08')
        self.assertEqual(iso_month('2026-09-20'), '2026-09')


class Windows(unittest.TestCase):
    """分页接口的时间窗：首尾相接、覆盖整个区间、每段都短于上限。"""

    def test_covers_since_through_today_without_gaps(self) -> None:
        windows = _windows('2021-09', 11)
        self.assertTrue(windows)
        self.assertEqual(windows[0][0], '2021-09-01')
        self.assertEqual(windows[-1][1], date.today().isoformat())
        for (_, end), (next_start, _) in zip(windows, windows[1:]):
            self.assertEqual(
                date.fromisoformat(next_start),
                date.fromisoformat(end) + timedelta(days=1),
                '两段窗口之间漏了或重了几天')

    def test_each_window_stays_under_the_limit(self) -> None:
        """中债那条接口超过一年就报 No tables found，所以每段必须严格更短。"""
        for start, end in _windows('2021-09', 11):
            with self.subTest(start=start):
                self.assertLess(
                    date.fromisoformat(end),
                    _add_months(date.fromisoformat(start), 11))

    def test_single_window_when_the_span_fits(self) -> None:
        today = date.today()
        since = f'{today.year:04d}-{today.month:02d}'
        self.assertEqual(len(_windows(since, 11)), 1)

    def test_rejects_a_useless_window_length(self) -> None:
        with self.assertRaises(SourceError):
            _windows('2021-09', 0)


if __name__ == '__main__':
    unittest.main()
