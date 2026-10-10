"""变换的单测。

每个变换都必须有测试，理由是变换**错了不会报错**：
千美元当成亿美元只是数字小了 10 万倍，「上年同月=100」的指数当成百分比
只是整条序列大了 100——两者在图上都只是位置不同，看不出异常。
"""

from __future__ import annotations

import unittest

from macro_fetcher.transforms import (
    TRANSFORMS,
    apply_transform,
    cn_us_spread_bp,
    divide_100,
    exports_minus_imports_100m,
    index_minus_100,
    single,
)


class Single(unittest.TestCase):
    def test_passes_first_value_through(self) -> None:
        self.assertEqual(single([1.5]), 1.5)

    def test_none_stays_none(self) -> None:
        self.assertIsNone(single([None]))

    def test_empty_is_none(self) -> None:
        self.assertIsNone(single([]))

    def test_extra_values_ignored(self) -> None:
        # 声明了多个字段但变换只用第一个，是合法的（比如以后取「值 + 备注」）
        self.assertEqual(single([1.0, 2.0]), 1.0)


class IndexMinus100(unittest.TestCase):
    """统计局发指数（100.8），指标要百分比（0.8）。"""

    def test_subtracts_100(self) -> None:
        self.assertAlmostEqual(index_minus_100([101.0]), 1.0)

    def test_negative_is_preserved(self) -> None:
        # 通缩月份指数是 99.7，减 100 得 -0.3；写反符号会变成 +99.7
        self.assertAlmostEqual(index_minus_100([99.7]), -0.3, places=6)

    def test_missing_stays_missing(self) -> None:
        self.assertIsNone(index_minus_100([None]))

    def test_result_is_not_in_index_range(self) -> None:
        """钉住「忘了减 100」这个错误：结果必须落在个位数级别。

        这是最有价值的一条断言——它描述的是**症状**而不是实现：
        核心 CPI 的真实值在 -2 到 +3 之间，绝不会是 99 到 103。
        """
        for index_value in (99.7, 100.0, 101.0, 102.5):
            result = index_minus_100([index_value])
            self.assertLess(abs(result), 10,
                            f'{index_value} 变换后是 {result}，看起来像没有减 100')


class ExportsMinusImports(unittest.TestCase):
    """海关千美元 → 亿美元。"""

    def test_divides_by_1e5(self) -> None:
        # 2026-08 实测：出口 401440956.924 千美元、进口 282355763.276 千美元
        result = exports_minus_imports_100m([401440956.924, 282355763.276])
        self.assertAlmostEqual(result, 1190.85193648, places=6)

    def test_magnitude_is_in_100m_usd(self) -> None:
        """钉住量级：中国月度贸易差额是几百到一千亿美元。

        漏掉换算（直接相减）会得到 1.19e8——一个在轴上完全无法与别的指标
        共存的数，但它是「出口减进口」，看起来又很合理。
        """
        result = exports_minus_imports_100m([401440956.924, 282355763.276])
        self.assertGreater(result, 100)
        self.assertLess(result, 3000)

    def test_negative_when_imports_exceed(self) -> None:
        self.assertLess(exports_minus_imports_100m([100.0, 200.0]), 0)

    def test_missing_input_gives_missing(self) -> None:
        self.assertIsNone(exports_minus_imports_100m([None, 200.0]))
        self.assertIsNone(exports_minus_imports_100m([100.0, None]))

    def test_too_few_fields_gives_missing(self) -> None:
        # 字段配错（只声明了一个）时给 None，而不是拿单边值当差额
        self.assertIsNone(exports_minus_imports_100m([100.0]))


class Divide100(unittest.TestCase):
    """外汇局中间价：673.67 → 6.7367。"""

    def test_divides_by_100(self) -> None:
        # 2026-10-08 实测：外汇局表给 673.67，中国货币网同一天是 6.7367
        self.assertAlmostEqual(divide_100([673.67]), 6.7367, places=6)

    def test_result_is_a_plausible_usd_cny_rate(self) -> None:
        """钉住量级：人民币兑美元在 5～9 之间。

        漏掉换算会得到 673.67——「汇率 673」在任何一张图上都荒唐，
        但它不报错，只是让这条曲线整条错位两个数量级。
        """
        self.assertGreater(divide_100([673.67]), 5)
        self.assertLess(divide_100([673.67]), 9)

    def test_missing_stays_missing(self) -> None:
        self.assertIsNone(divide_100([None]))


class Registry(unittest.TestCase):
    def test_apply_transform_dispatches(self) -> None:
        self.assertEqual(apply_transform('single', [7.0]), 7.0)
        self.assertAlmostEqual(apply_transform('index_minus_100', [101.0]), 1.0)

    def test_unknown_name_raises(self) -> None:
        """拼错变换名必须报错，不能静默退回『原样写入』。"""
        with self.assertRaises(ValueError) as caught:
            apply_transform('index_minus_10', [101.0])
        self.assertIn('index_minus_10', str(caught.exception))

    def test_registry_matches_module_functions(self) -> None:
        self.assertEqual(set(TRANSFORMS),
                         {'single', 'index_minus_100', 'divide_100',
                          'exports_minus_imports_100m', 'cn_us_spread_bp'})


class CnUsSpread(unittest.TestCase):
    """中美 10 年期国债利差（基点）=（中国 − 美国）× 100。"""

    def test_subtracts_china_minus_usa_in_basis_points(self) -> None:
        # 2024-01-02 实测：中国 2.5601、美国 3.95 → -138.99 bp
        self.assertAlmostEqual(cn_us_spread_bp([2.5601, 3.95]), -138.99, places=6)

    def test_sign_is_not_flipped(self) -> None:
        """方向反了同样「看起来合理」——近年这条利差长期为负。"""
        self.assertLess(cn_us_spread_bp([1.6864, 5.24]), 0)

    def test_magnitude_is_basis_points_not_percent(self) -> None:
        """钉住 ×100：少了它得到的是百分点，量级小 100 倍。"""
        self.assertAlmostEqual(cn_us_spread_bp([2.0, 2.5]), -50.0, places=6)

    def test_either_side_missing_is_missing(self) -> None:
        # 2026-10-07 美国有报价、中国那列是 NaN——那一期不写值
        self.assertIsNone(cn_us_spread_bp([None, 4.77]))
        self.assertIsNone(cn_us_spread_bp([1.2719, None]))

    def test_needs_two_inputs(self) -> None:
        self.assertIsNone(cn_us_spread_bp([1.2719]))
        self.assertIsNone(cn_us_spread_bp([]))


if __name__ == '__main__':
    unittest.main()
