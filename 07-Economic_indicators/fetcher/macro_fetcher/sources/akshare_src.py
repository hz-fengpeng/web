"""akshare 适配器：本抓取器**唯一**的数据源。

## 为什么不再自己解析

上一版给每个源（统计局 / 东方财富 / 中国货币网）各写了一个适配器，直接解
JSON、拼参数、翻目录树。能跑通，但每一条都是**别人接口的私有细节**：

- 统计局的树节点名普遍带尾随空格（`'固定资产投资 (不含农户) '`），
  而且 `ek_name` 里混着制表符；
- 东财的字段名是 `NATIONAL_SAME` / `BASE_SAME` / `CURRENCY_SAME` 这类
  看不出含义的代号，且**换报表含义就变**（CPI 的 `BASE` 是指数、
  PPI 的 `BASE_SAME` 却是百分比）；
- 货币网 `pageSize` 超过 50 就 403，历史只给一年，超范围时**静默返回空**
  而不是报错；
- 统计局的季度库还需要一个 `rootId` 加一个路由 header，缺了就是 HTTP 500。

这些坑不是知识，是**易腐的巧合**。上游改一次字段名，自己维护的解析器就静默
写错值。akshare 有社区在跟这些变动，并且把结果整理成了中文列名的 DataFrame
（`'当月同比增长'` 比 `BASE_SAME` 可读得多，口径错误更难藏）。

## 这个适配器仍然要做的事

akshare 负责「怎么把数据拿下来」，**不负责口径**。以下仍然是我们自己的判断，
放在 `mapping.py`：

- 取哪个函数、哪一列（东财的 PMI 表里 `制造业-指数` 与 `非制造业-指数` 并存）；
- 期间怎么从它的列里读出来（`'2026年08月份'` / `'202608'` / `'2026-09-20'`
  三种写法都有，季度还有 `'2026年第二季度'`）；
- 单位换算（中间价是 674.11 这样的「分」口径，要除以 100）。

## 仍然会失败的地方

akshare 不是魔法，它也只是在抓同样的网页。国家统计局对高频访问会返回一个
**混淆过的 JS 挑战页**（HTTP 200，内容是 `<noscript>Please enable
JavaScript…`），此时 akshare 会抛 `JSONDecodeError`。这不是 bug，也不该去
绕过——它是站点在表达「慢一点」。适配器把它翻译成一句能读的话，
并在 `cli.py` 里让该指标单独失败，不影响其余指标。
"""

from __future__ import annotations

import importlib
import re
import threading
from typing import Any, Callable

from . import SourceError, SourcePoint

# ── 期间读法 ──────────────────────────────────────────────────────────
#
# 每个函数一份，因为 akshare 各接口的期间列写法不统一。全部返回
# `periods.py` 认识的期间字符串，无法识别时返回 None（该行跳过）。

_CN_MONTH_RE = re.compile(r'^(\d{4})年(\d{1,2})月')
_CN_QUARTER = {'一': 1, '二': 2, '三': 3, '四': 4}
#: ★ 「第」是可选的但**实际存在**：真实写法是 `'2026年第二季度'`。
#: 写成 `(\d{4})年(.)季度` 会匹配到「第」而不是「二」，于是每一列都读不出期间，
#: 整条序列**静默变成 0 条**——不报错，只在写库时表现为「这个指标没数据」。
_CN_QUARTER_RE = re.compile(r'^(\d{4})年(?:第)?(.)季度')
_COMPACT_YM_RE = re.compile(r'^(\d{4})(\d{2})$')
_ISO_DAY_RE = re.compile(r'^(\d{4})-(\d{2})-(\d{2})')


def cn_month(text: Any) -> str | None:
    """`'2026年08月份'` → `'2026-08'`（东财系的月份列）。"""
    m = _CN_MONTH_RE.match(str(text or '').strip())
    if not m:
        return None
    month = int(m[2])
    return f'{m[1]}-{month:02d}' if 1 <= month <= 12 else None


def cn_quarter(text: Any) -> str | None:
    """`'2026年第二季度'` → `'2026Q2'`（统计局季度库的期间列）。"""
    m = _CN_QUARTER_RE.match(str(text or '').strip())
    if not m:
        return None
    quarter = _CN_QUARTER.get(m[2])
    return f'{m[1]}Q{quarter}' if quarter else None


def compact_month(text: Any) -> str | None:
    """`'202608'` → `'2026-08'`（统计局失业率接口的 date 列）。"""
    m = _COMPACT_YM_RE.match(str(text or '').strip())
    if not m:
        return None
    month = int(m[2])
    return f'{m[1]}-{month:02d}' if 1 <= month <= 12 else None


def iso_day(text: Any) -> str | None:
    """`'2026-10-08 00:00:00'` → `'2026-10-08'`（中间价的日期列）。"""
    m = _ISO_DAY_RE.match(str(text or '').strip())
    return m[0] if m else None


def iso_month(text: Any) -> str | None:
    """`'2026-09-20'` → `'2026-09'`（LPR 报价日 → 所属月份）。

    ★ LPR 是**月度**指标，报价日是当月的 20 日。期间取月份而不是报价日，
    否则同一指标会混进两种粒度（月 + 日），按 period_end 排序时打架。
    报价日仍在 `releases.py` 里用来推 released_at。
    """
    day = iso_day(text)
    return day[:7] if day else None


#: 期间读法注册表。mapping 里用名字引用，写错名字会在**自检**时响，
#: 而不是跑到一半才发现读不出期间。
PERIOD_READERS: dict[str, Callable[[Any], str | None]] = {
    'cn_month': cn_month,
    'cn_quarter': cn_quarter,
    'compact_month': compact_month,
    'iso_day': iso_day,
    'iso_month': iso_month,
}


# ── 调用 ──────────────────────────────────────────────────────────────

#: 一次运行内缓存 akshare 的返回。
#:
#: ★ 这个缓存不是优化，是**礼貌**：`macro_china_pmi` 一个函数同时供
#: 制造业与非制造业两个指标，`macro_china_hgjck` 供出口同比与贸易差额，
#: `macro_china_money_supply` 供 M1 与 M2。不缓存的话每次运行会把这些
#: 报表各抓两遍——而它们又都是同一个上游站点。
#:
#: 加锁是因为它可能在将来被并行调用；现在的 `fetch_all` 是串行的。
_cache: dict[tuple[str, tuple[tuple[str, Any], ...]], Any] = {}
_lock = threading.Lock()


def reset_cache() -> None:
    """清空调用缓存。测试用；一次正常运行不需要清。"""
    with _lock:
        _cache.clear()


def _call(func_name: str, kwargs: dict[str, Any]) -> Any:
    key = (func_name, tuple(sorted(kwargs.items())))
    with _lock:
        if key in _cache:
            return _cache[key]

    try:
        func = getattr(importlib.import_module('akshare'), func_name)
    except AttributeError:
        raise SourceError(
            f'akshare 里没有 {func_name}。要么函数改名了，要么装的是过旧的版本。'
            '核对 `pip show akshare` 的版本，或看本文件的模块说明。') from None
    except ImportError as exc:
        raise SourceError(
            f'import akshare 失败：{exc}。抓取器现在依赖 akshare，'
            '先按 fetcher/README.md 建虚拟环境。') from None

    try:
        frame = func(**kwargs)
    except Exception as exc:
        raise SourceError(f'{func_name}() 调用失败：{_explain(exc)}') from exc

    with _lock:
        _cache[key] = frame
    return frame


def _explain(exc: Exception) -> str:
    """把上游的异常翻成一句带处置建议的话。

    统计局那条最值得单独说：它返回的是 HTTP 200 + 一个 JS 挑战页，
    akshare 拿去当 JSON 解，抛出来的是一句
    `Expecting value: line 1 column 1 (char 0)`——看不出和「被拦」有关，
    很容易被误判成「数据格式变了」而去改解析代码。
    """
    text = f'{type(exc).__name__}: {exc}'
    if isinstance(exc, ValueError) and 'Expecting value' in str(exc):
        return (f'{text}——上游返回的不是 JSON。统计局站点在访问过快时会给一个'
                '「请启用 JavaScript」的挑战页，等几分钟再跑，不要试图绕过。')
    return text


# ── 主入口 ────────────────────────────────────────────────────────────


def fetch(spec: Any, indicator_id: str, since: str) -> list[SourcePoint]:
    """按规则取一个指标的观测（**不裁时间窗**，窗口由 cli 统一裁）。

    `since` 只用于需要预先声明区间才能取数的接口（统计局），
    东财系的函数一律返回全量历史，由 cli 的窗口过滤掉不需要的部分。
    """
    reader = PERIOD_READERS.get(spec.period_from)
    if reader is None:
        raise SourceError(
            f'{indicator_id}: 未登记的期间读法 {spec.period_from!r}；'
            f'已登记：{", ".join(sorted(PERIOD_READERS))}')

    kwargs = {key: value.format(since=since, since_year=since[:4])
              for key, value in spec.kwargs}
    frame = _call(spec.func, kwargs)

    if frame is None or not hasattr(frame, 'columns'):
        raise SourceError(f'{indicator_id}: {spec.func}() 没有返回 DataFrame')

    # ★ 统计局通用接口返回的是**转置表**：行是指标名、列才是期间。
    # 东财系全部是行式表（一行一期）。两种布局必须分开走，不能靠猜——
    # 拿行式表的读法去读转置表，会把指标名当期间解析，结果是**一行都读不出**，
    # 报错却是「没有数据」，看起来像源停更了。
    if spec.row_label:
        return _fetch_transposed(spec, indicator_id, reader, frame, since)

    missing = [column for column in (spec.period_column, *spec.columns)
               if column not in frame.columns]
    if missing:
        raise SourceError(
            f'{indicator_id}: {spec.func}() 的返回里没有列 {missing}；'
            f'实际列：{list(frame.columns)}。'
            '上游改了表结构，需要更新 mapping.py 里的列名。')

    if spec.row_filter is not None:
        column, expected = spec.row_filter
        if column not in frame.columns:
            raise SourceError(f'{indicator_id}: 没有用于筛选的列 {column!r}')
        # ★ 比对前 strip：统计局系的分类名**普遍带尾随空格**
        # （实测 `'全国城镇调查失业率 '`），不 strip 会筛出 0 行。
        actual = frame[column].astype(str).str.strip()
        frame = frame[actual == expected.strip()]
        if frame.empty:
            raise SourceError(
                f'{indicator_id}: 按 {column}={expected!r} 筛选后没有行。'
                '上游改了分类名，或该分类已停止发布。')

    points: list[SourcePoint] = []
    for _, row in frame.iterrows():
        period = reader(row[spec.period_column])
        if period is None:
            continue
        raw = [_number(row[column]) for column in spec.columns]
        points.append(SourcePoint(indicator_id, period,
                                  _apply(spec.transform, raw, indicator_id)))
    return points


def _fetch_transposed(spec: Any, indicator_id: str, reader: Callable,
                      frame: Any, since: str) -> list[SourcePoint]:
    """读统计局通用接口那种「行是指标、列是期间」的表。

    索引名与列名都可能带尾随空格（和目录树里同源），两侧都要 strip 后再比对。
    """
    wanted = spec.row_label.strip()
    labels = {str(label).strip(): label for label in frame.index}
    if wanted not in labels:
        raise SourceError(
            f'{indicator_id}: {spec.func}() 的结果里没有 {wanted!r} 这一行；'
            f'实际行：{sorted(labels)[:12]}'
            + ('…' if len(labels) > 12 else '')
            + '。上游改了指标名，需要更新 mapping.py 里的 row_label。')

    row = frame.loc[labels[wanted]]
    points: list[SourcePoint] = []
    for column in frame.columns:
        period = reader(column)
        if period is None:
            continue
        points.append(SourcePoint(indicator_id, period,
                                  _apply(spec.transform, [_number(row[column])],
                                         indicator_id)))
    return points


def _number(cell: Any) -> float | None:
    """一格数值。空、NaN、空串都算「没有值」，**绝不当成 0**。

    ★ 这一条是静默造假的常见入口：把缺失当 0 写进库，图上会多出一个
    「当月同比 0%」的真实观测，而它并不存在。
    """
    if cell is None:
        return None
    if isinstance(cell, str):
        text = cell.strip()
        if not text or text in {'-', '--', 'nan', 'None'}:
            return None
        try:
            return float(text)
        except ValueError:
            return None
    try:
        value = float(cell)
    except (TypeError, ValueError):
        return None
    # pandas 的缺失值是 NaN，而 NaN != NaN 是它唯一的自检手段
    return None if value != value else value


def _apply(name: str, values: list[float | None], indicator_id: str) -> float | None:
    from ..transforms import apply_transform

    try:
        return apply_transform(name, values)
    except ValueError as exc:
        raise SourceError(f'{indicator_id}: {exc}') from None
