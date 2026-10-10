"""取数规则表的自检。

`mapping.py` 里那几张表的每一条都是**口径判断**，而口径错误的典型症状是
「不报错、只是数字不对」——所以在联网之前，先把能静态查出来的问题查掉。

这里守的五条（`mapping.py` 的模块说明里也写了）：

1. `RULES` / `UNSOURCED` / `DERIVED` 两两不相交，并集**恰好**等于目录里
   全部 109 个指标（P0 23 / P1 38 / P2 48）——指标悄悄消失是这里最怕的事；
2. `UNSOURCED` 每条都得有理由，且标明是 (a)/(b)/(c) 里的哪一种；
3. `period_from` 与 `transform` 必须是已登记的名字；
4. `row_label` 与 `columns` 二选一，且期间列不能同时是取值列；
5. `RULES` 不含计算指标，`DERIVED` 只含计算指标，且它的输入有规则、同源。

**不联网**：只读表结构和 `catalog.json`。
"""

from __future__ import annotations

import unittest

from macro_fetcher.catalog import load_catalog
from macro_fetcher.mapping import (
    DERIVED,
    GAP,
    JAN_FEB,
    MERGED,
    MONTHLY,
    REASON_PREFIXES,
    RULES,
    UNSOURCED,
    check_against,
    derived_source,
    sources_used,
)
from macro_fetcher.sources.akshare_src import PERIOD_READERS
from macro_fetcher.transforms import TRANSFORMS


class Coverage(unittest.TestCase):
    """覆盖范围：不多、不少，三个层级一起查。"""

    @classmethod
    def setUpClass(cls) -> None:
        cls.catalog = load_catalog()

    def test_every_indicator_is_accounted_for(self) -> None:
        """★ 最要紧的一条：新增指标却忘了登记，这里立刻变红。

        没有它的话，漏登记的指标在库里既没有真实值、也没有 missing 行——
        它只会**安静地保留着库里的旧数字**，而界面上看不出任何区别。
        这条以前只查 P0（那时只接了 P0），现在三层一起查。
        """
        self.assertEqual(set(RULES) | set(UNSOURCED) | set(DERIVED), set(self.catalog))

    def test_the_three_tables_are_disjoint(self) -> None:
        self.assertEqual(set(RULES) & set(UNSOURCED), set())
        self.assertEqual(set(RULES) & set(DERIVED), set())
        self.assertEqual(set(UNSOURCED) & set(DERIVED), set())

    def test_counts_are_what_the_docs_claim(self) -> None:
        """抓取器 README 写了这几个数，让它成为一个会被测的事实。"""
        self.assertEqual(len(self.catalog), 109)
        self.assertEqual(len(RULES), 22)
        self.assertEqual(len(UNSOURCED), 86)
        self.assertEqual(len(DERIVED), 1)

    def test_every_tier_is_registered(self) -> None:
        """三层都要有登记——只把 P0 填了、P1/P2 整层漏掉，这条会红。"""
        for tier, expected in (('P0', 23), ('P1', 38), ('P2', 48)):
            with self.subTest(tier=tier):
                listed = {i.id for i in self.catalog.values() if i.tier == tier}
                self.assertEqual(len(listed), expected)
                registered = listed & (set(RULES) | set(UNSOURCED) | set(DERIVED))
                self.assertEqual(registered, listed)

    def test_check_against_passes_on_the_real_catalog(self) -> None:
        self.assertEqual(check_against(self.catalog), [])


class UnsourcedReasons(unittest.TestCase):
    def test_every_unsourced_has_a_reason(self) -> None:
        for key, reason in UNSOURCED.items():
            with self.subTest(indicator=key):
                self.assertTrue(reason.strip(),
                                f'{key} 没有写理由——空白是「忘了配」，不是「没有源」')

    def test_reasons_say_which_kind_of_missing(self) -> None:
        """理由要区分「上游不发布」和「渠道取不到」。

        这个区别决定了下一个人该不该继续找源：前者别再找了，
        后者换个渠道可能就有。混在一起写，等于没写。

        第三类 (c) 是计算指标——它不是「找不到源」，而是输入还没接齐，
        修法完全不同（不用找源，去接输入）。
        """
        for key, reason in UNSOURCED.items():
            with self.subTest(indicator=key):
                self.assertTrue(reason.lstrip().startswith(REASON_PREFIXES),
                                f'{key} 的理由没有标 {REASON_PREFIXES}')


class SpecShape(unittest.TestCase):
    """每条规则的形状约束。"""

    def test_period_readers_are_registered(self) -> None:
        for key, rule in RULES.items():
            with self.subTest(indicator=key):
                self.assertIn(rule.spec.period_from, PERIOD_READERS)

    def test_transforms_are_registered(self) -> None:
        for key, rule in RULES.items():
            with self.subTest(indicator=key):
                self.assertIn(rule.spec.transform, TRANSFORMS)

    def test_row_label_xor_columns(self) -> None:
        """转置表用 row_label、行式表用 columns，两个都写或都不写都是错的。

        转置表按 columns 读只会读到 0 条（而且**不报错**），
        所以这条不能靠运行时才发现。
        """
        for key, rule in RULES.items():
            with self.subTest(indicator=key):
                spec = rule.spec
                self.assertNotEqual(bool(spec.row_label), bool(spec.columns),
                                    f'{key} 必须且只能声明其中一个')

    def test_row_tables_declare_a_period_column(self) -> None:
        for key, rule in RULES.items():
            if rule.spec.row_label:
                continue
            with self.subTest(indicator=key):
                self.assertTrue(rule.spec.period_column)

    def test_period_column_is_not_a_value_column(self) -> None:
        for key, rule in RULES.items():
            with self.subTest(indicator=key):
                self.assertNotIn(rule.spec.period_column, rule.spec.columns)

    def test_jan_feb_is_registered(self) -> None:
        for key, rule in RULES.items():
            with self.subTest(indicator=key):
                self.assertIn(rule.jan_feb, JAN_FEB)

    def test_multifield_rules_use_a_matching_transform(self) -> None:
        """声明了两个字段的规则，不能还用只取第一个字段的变换。

        贸易差额这正是「千美元当成亿美元」那次错值的位置：两个字段配了
        `single`，结果写进去的是出口额本身，而它在图上就是一条正常的曲线。
        """
        for key, rule in RULES.items():
            if len(rule.spec.columns) < 2:
                continue
            with self.subTest(indicator=key):
                self.assertNotEqual(rule.spec.transform, 'single',
                                    f'{key} 声明了多个取值列，却用 single 只取第一个')


class JanFebSemantics(unittest.TestCase):
    """1—2 月口径的登记要与源的实际行为一致。"""

    def test_merged_indicators_are_the_cumulative_ones(self) -> None:
        """合并口径只出现在「累计」序列上。

        CPI/PPI/PMI/失业率这些当月同比是**按月单独发布**的，
        把它们标成 merged 会让每年 1 月的观测凭空消失。
        """
        merged = {k for k, r in RULES.items() if r.jan_feb == MERGED}
        self.assertEqual(merged, {
            'cn.retail.cum_yoy',
            'cn.fiscal.revenue_cum_yoy',
        })

    def test_industrial_production_is_a_gap(self) -> None:
        """工业增加值 1、2 月都没有当月值（合计数只在累计序列里）。"""
        self.assertEqual(RULES['cn.ind_prod.yoy'].jan_feb, GAP)

    def test_monthly_is_the_default(self) -> None:
        self.assertEqual(
            {k for k, r in RULES.items() if r.jan_feb == MONTHLY},
            set(RULES) - {'cn.retail.cum_yoy', 'cn.fiscal.revenue_cum_yoy',
                          'cn.ind_prod.yoy'})


class Sources(unittest.TestCase):
    def test_upstream_sources_are_the_registered_set(self) -> None:
        """`source` 记的是**上游站点**，不是 akshare。

        界面的数据源页与 `fetch_log.source_id` 都按这个 id 聚合，
        改名字要同步改 `src/main/db/bootstrap.ts` 里的登记表
        （那边有测试钉住同一组 id）。
        """
        self.assertEqual(
            sources_used(), ['chinabond', 'eastmoney', 'nbs', 'safe', 'sina'])

    def test_no_rule_points_at_akshare_itself(self) -> None:
        for key, rule in RULES.items():
            with self.subTest(indicator=key):
                self.assertNotEqual(rule.source, 'akshare')

    def test_every_rule_has_a_note(self) -> None:
        """每条规则都要写「为什么是这一列」。

        下一个改这里的人面对的是一堆看起来都能用的候选列。
        """
        for key, rule in RULES.items():
            with self.subTest(indicator=key):
                self.assertTrue(rule.note.strip(), f'{key} 没有写 note')


class Derived(unittest.TestCase):
    """计算指标：输入必须真的存在，而且是**同一个上游**的。"""

    @classmethod
    def setUpClass(cls) -> None:
        cls.catalog = load_catalog()

    def test_catalog_marks_them_as_derived(self) -> None:
        """登记在 DERIVED 里、目录却没标 isDerived，等于把计算值当官方发布值。"""
        for key in DERIVED:
            with self.subTest(indicator=key):
                self.assertTrue(self.catalog[key].is_derived)

    def test_inputs_have_fetch_rules(self) -> None:
        for key, rule in DERIVED.items():
            with self.subTest(indicator=key):
                self.assertTrue(rule.inputs)
                for input_id in rule.inputs:
                    self.assertIn(input_id, RULES)

    def test_inputs_share_one_upstream(self) -> None:
        """`fetch_log` 每条明细只记一个 `source_id`——跨源就算不出来这个数。"""
        for key, rule in DERIVED.items():
            with self.subTest(indicator=key):
                self.assertEqual(
                    len({RULES[i].source for i in rule.inputs}), 1)
                self.assertIsNotNone(derived_source(key))

    def test_transforms_are_registered(self) -> None:
        for key, rule in DERIVED.items():
            with self.subTest(indicator=key):
                self.assertIn(rule.transform, TRANSFORMS)

    def test_every_derived_has_a_note(self) -> None:
        """写清用了哪两条、怎么算的——这条值的来历只有这句 note。"""
        for key, rule in DERIVED.items():
            with self.subTest(indicator=key):
                self.assertTrue(rule.note.strip(), f'{key} 没有写 note')


class Windows(unittest.TestCase):
    """需要分页调用的接口：模板里得真的用上窗口参数。"""

    def test_windowed_rules_use_a_window_parameter(self) -> None:
        for key, rule in RULES.items():
            if not rule.spec.window_months:
                continue
            with self.subTest(indicator=key):
                template = ' '.join(value for _, value in rule.spec.kwargs)
                self.assertTrue(
                    'window_start' in template or 'window_end' in template,
                    f'{key} 声明了 window_months，参数模板里却没有窗口参数')

    def test_non_windowed_rules_do_not_invent_windows(self) -> None:
        for key, rule in RULES.items():
            if rule.spec.window_months:
                continue
            with self.subTest(indicator=key):
                template = ' '.join(value for _, value in rule.spec.kwargs)
                self.assertNotIn('window_', template, f'{key} 没声明窗口却用了窗口参数')


if __name__ == '__main__':
    unittest.main()
