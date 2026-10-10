"""单位与口径变换。

统一签名：`list[float | None] -> float | None`。输入是「该规则声明的字段读出来的
原始值」，输出是**要写进库的值**（指标自己的单位、自己的口径）。

为什么统一成列表：多数规则只要一个字段，但贸易差额要两个（出口 − 进口）。
让所有变换都收列表，就不必为多字段规则单开一条代码路径——
而那正是「千美元当成亿美元」这类错值最爱藏身的地方。

每个变换都必须有单测（`tests/test_transforms.py`），并且**失败要响**：
拿不到该有的输入就返回 None（→ 该期写成 missing），不要猜一个数出来。
"""

from __future__ import annotations

from collections.abc import Callable

Transform = Callable[[list[float | None]], 'float | None']


def single(values: list[float | None]) -> float | None:
    """直接用第一个字段。绝大多数指标走这条。"""
    return values[0] if values else None


def index_minus_100(values: list[float | None]) -> float | None:
    """「上年同期=100」的指数 → 同比百分比。

    统计局发的是**指数**（104.3），不是百分比（4.3）。这一条混淆是静默的：
    104.3 看起来也像个合理的数，只是整整大了 100 倍，图上一眼看不出来
    （整条序列一起平移），只有和官方发布稿对数字时才会露馅。

    用于 `cn.gdp.yoy`（`国内生产总值指数(上年同期=100)当季值`）。
    核对（2025Q1）：105.4 − 100 = 5.4%，与当年一季度公布值一致。
    """
    value = single(values)
    return None if value is None else value - 100


def divide_100(values: list[float | None]) -> float | None:
    """百分之一单位 → 原值。

    外汇局中间价表给的是 **674.11** 这样的口径（1 美元 = 674.11 「分」），
    而指标 `cn.fx_rate.usd_cny` 是 6.7411。

    ★ 除 100 而不是除 10000：换错一个量级不会报错，只会让整条汇率曲线
    平移两个数量级，而「汇率在 0.067 附近」看起来依然像个数。
    核对（2026-10-08）：673.67 / 100 = 6.7367。
    """
    value = single(values)
    return None if value is None else value / 100


def exports_minus_imports_100m(values: list[float | None]) -> float | None:
    """海关进出口 → 贸易差额（亿美元）。

    akshare `macro_china_hgjck` 的 `当月出口额-金额` / `当月进口额-金额`
    单位是**千美元**，而指标 `cn.trade.balance` 的单位是**亿美元**：
    1 亿美元 = 1e8 美元 = 1e5 千美元，所以除以 1e5。

    核对（2026-08）：(401440957 − 282355763) / 1e5 = 1190.85 亿美元，
    与当月公布口径同量级。若误按「美元」处理会得到 1.19 亿，差三个数量级；
    若误按「万美元」会得到 119085 亿，也差得离谱——两头都会露馅，
    所以这个变换值得有单测（`tests/test_transforms.py`）。
    """
    if len(values) < 2:
        return None
    exports, imports = values[0], values[1]
    if exports is None or imports is None:
        return None
    return (exports - imports) / 1e5


def cn_us_spread_bp(values: list[float | None]) -> float | None:
    """中美 10 年期国债利差（基点）= (中国 − 美国) × 100。

    两个输入是**同一条日期轴上的两个百分比**（`bond_zh_us_rate` 一张表的两列），
    相减得百分点，×100 换成基点。方向不能反：中国收益率低于美国时利差为负，
    反了会得到一个看起来同样合理的正数（近年这条利差长期为负）。
    任一侧当天没有报价（该列是 NaN）就返回 None——那一期写成缺失，
    不拿前一天的报价顶上。
    """
    if len(values) < 2:
        return None
    china, usa = values[0], values[1]
    if china is None or usa is None:
        return None
    return (china - usa) * 100


TRANSFORMS: dict[str, Transform] = {
    'single': single,
    'index_minus_100': index_minus_100,
    'divide_100': divide_100,
    'exports_minus_imports_100m': exports_minus_imports_100m,
    'cn_us_spread_bp': cn_us_spread_bp,
}


def apply_transform(name: str, values: list[float | None]) -> float | None:
    try:
        transform = TRANSFORMS[name]
    except KeyError:
        raise ValueError(f'未登记的变换：{name}；已登记：{", ".join(sorted(TRANSFORMS))}') from None
    return transform(values)
