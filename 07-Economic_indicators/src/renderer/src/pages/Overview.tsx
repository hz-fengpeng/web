import { useMemo, useState, type JSX } from 'react'
import type { Indicator } from '@shared/types'
import { LineChart } from '../charts/LineChart'
import { Badge, Delta, Empty, IndicatorMeta, ObservationTable, PageHeading, ViewToggle } from '../components/UI'
import { currentSeries, deltaUnit, filterRange, observationDelta, rangeStart, type SeriesMap } from '../lib/data'
import { formatValue } from '../lib/format'

const CORE = ['cn.gdp.yoy', 'cn.cpi.yoy', 'cn.pmi.mfg', 'cn.retail.cum_yoy', 'cn.m2.yoy', 'cn.tsf.stock_yoy']
export function Overview({ indicators, series, favorites, onOpen }: {
  indicators: Indicator[]; series: SeriesMap; favorites: string[]; onOpen: (id: string) => void
}): JSX.Element {
  const current = useMemo(() => Object.fromEntries(indicators.map((i) => [i.id, currentSeries(series[i.id] ?? [])])), [indicators, series])
  const [favoritesOnly, setFavoritesOnly] = useState(false)
  const cards = indicators.filter((i) => favoritesOnly ? favorites.includes(i.id) : i.isHeadline)
  return <>
    <PageHeading title="经济概览" description="从增长、物价与需求，观察宏观指标的最新变化。">
      <div className="segmented" role="group" aria-label="概览指标"><button aria-pressed={!favoritesOnly} onClick={() => setFavoritesOnly(false)}>核心指标</button>
        <button aria-pressed={favoritesOnly} onClick={() => setFavoritesOnly(true)}>我的关注 {favorites.length}</button></div>
    </PageHeading>
    <div className="section-caption"><span>最新观测</span><span>各指标期间独立 · 变动为较相邻可比期间的计算值</span></div>
    {cards.length === 0 ? <Empty>还没有关注的指标。前往指标库，点击 ☆ 添加关注。</Empty> : <div className="kpi-grid">
      {cards.map((i) => {
        const rows = current[i.id]
        const latest = rows.at(-1)
        return <button className="kpi-card" key={i.id} onClick={() => onOpen(i.id)}>
          <div className="flex items-center justify-between gap-2"><span className="font-medium">{i.nameShort}</span><span className="text-ink-muted" aria-hidden="true">↗</span></div>
          <IndicatorMeta indicator={i} />
          <div className="kpi-number tnum">{formatValue(latest?.value ?? null, i.decimals)}<span>{i.unit}</span></div>
          <div className="kpi-bottom"><span className="tnum">{latest?.period ?? '暂无数据'}{latest?.status === 'merged' && ' · 1—2月合并'}</span>
            <Delta value={observationDelta(i, latest, rows.at(-2))} unit={deltaUnit(i)} decimals={i.decimals} /></div>
        </button>
      })}
    </div>}
    <div className="section-caption mt-8"><span>核心趋势</span><span>最近 3 年 · 时间窗锚定各序列最新期间</span></div>
    <div className="trend-grid">{CORE.map((id) => {
      const indicator = indicators.find((i) => i.id === id)
      return indicator && <TrendCard key={id} indicator={indicator} rows={filterRange(current[id], rangeStart(current[id].at(-1)?.periodEnd ?? '', '3y'), '')} onOpen={() => onOpen(id)} />
    })}</div>
    <div className="note mt-6"><Badge>内置示例库</Badge><span>{indicators.length} 个指标覆盖 {new Set(indicators.map((i) => i.category)).size} 类主题，包含 P0 / P1 / P2、31 个省级地区，以及日度、月度、季度、年度序列。所有数值均为合成示例。</span></div>
  </>
}
function TrendCard({ indicator, rows, onOpen }: { indicator: Indicator; rows: SeriesMap[string]; onOpen: () => void }): JSX.Element {
  const [view, setView] = useState<'chart' | 'table'>('chart')
  return <section className="panel trend-card"><div className="panel-heading"><button className="text-link" onClick={onOpen}>{indicator.nameShort} ↗</button><ViewToggle view={view} onChange={setView} /></div>
    <IndicatorMeta indicator={indicator} />
    {rows.length === 0 ? <Empty>暂无观测数据</Empty> : view === 'chart' ? <LineChart indicator={indicator} rows={rows} height={220} /> : <ObservationTable indicator={indicator} rows={rows} />}
    <p className="chart-note">{indicator.note}</p>
  </section>
}
