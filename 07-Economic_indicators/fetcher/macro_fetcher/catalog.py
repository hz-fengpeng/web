"""指标目录：读由 TS 生成的 `fetcher/catalog.json`。

**不在这里定义指标。** 事实源是 `src/shared/indicators.ts`，本模块只读镜像；
镜像过期由 `fetcher/tools/export-catalog.test.mjs`（`npm test` 会跑）拦住。
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path

# 与 src/shared/types.ts 的 Frequency / ValueType 一致
FREQUENCIES = ('day', 'month', 'quarter', 'year')
VALUE_TYPES = ('yoy', 'mom', 'level', 'cumulative', 'cumulative_yoy', 'index')

CATALOG_PATH = Path(__file__).resolve().parent.parent / 'catalog.json'


@dataclass(frozen=True)
class Indicator:
    id: str
    name_zh: str
    name_short: str
    category: str
    unit: str
    frequency: str
    value_type: str
    seasonal_adj: bool
    decimals: int
    is_headline: bool
    tier: str
    note: str | None
    region: str | None = None
    is_derived: bool = False

    @staticmethod
    def from_json(raw: dict) -> 'Indicator':
        return Indicator(
            id=raw['id'],
            name_zh=raw['nameZh'],
            name_short=raw['nameShort'],
            category=raw['category'],
            unit=raw['unit'],
            frequency=raw['frequency'],
            value_type=raw['valueType'],
            seasonal_adj=bool(raw['seasonalAdj']),
            decimals=int(raw['decimals']),
            is_headline=bool(raw['isHeadline']),
            tier=raw.get('tier', 'P0'),
            note=raw.get('note'),
            region=raw.get('region'),
            is_derived=bool(raw.get('isDerived', False)),
        )


def load_catalog(path: Path | None = None) -> dict[str, Indicator]:
    """读镜像，返回 `{indicator_id: Indicator}`，并校验字段合法性。

    校验不是多余的：`catalog.json` 是生成物，字段名写错时如果静默通过，
    症状会推迟到界面上——比如精度取整不对，或频率被当成月度、期末日期算错。
    """
    source = path or CATALOG_PATH
    if not source.exists():
        raise FileNotFoundError(
            f'指标目录镜像不存在：{source}\n'
            '请先运行 node fetcher/tools/export-catalog.mjs 生成。',
        )
    raw = json.loads(source.read_text(encoding='utf-8'))
    out: dict[str, Indicator] = {}
    for item in raw['indicators']:
        indicator = Indicator.from_json(item)
        if indicator.frequency not in FREQUENCIES:
            raise ValueError(f'{indicator.id}: 未知频率 {indicator.frequency}')
        if indicator.value_type not in VALUE_TYPES:
            raise ValueError(f'{indicator.id}: 未知口径 {indicator.value_type}')
        if indicator.id in out:
            raise ValueError(f'指标 ID 重复：{indicator.id}')
        out[indicator.id] = indicator
    return out


def select(
    catalog: dict[str, Indicator],
    tier: str | None = None,
    only: list[str] | None = None,
) -> list[Indicator]:
    """按 tier 与显式 id 列表筛选，保持目录里的原始顺序。"""
    chosen = list(catalog.values())
    if tier:
        tiers = {t.strip().upper() for t in tier.split(',') if t.strip()}
        unknown = tiers - {'P0', 'P1', 'P2'}
        if unknown:
            raise ValueError(f'未知层级：{", ".join(sorted(unknown))}')
        chosen = [i for i in chosen if i.tier in tiers]
    if only:
        wanted = set(only)
        missing = wanted - {i.id for i in chosen}
        if missing:
            raise ValueError(f'指标不在所选层级内或不存在：{", ".join(sorted(missing))}')
        chosen = [i for i in chosen if i.id in wanted]
    return chosen
