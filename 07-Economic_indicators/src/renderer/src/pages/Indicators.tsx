import { useMemo, useState, type JSX } from 'react'
import type { Indicator, Category } from '@shared/types'
import { Badge, Delta, Empty, IndicatorMeta, PageHeading } from '../components/UI'
import { currentSeries, observationDelta, deltaUnit, VALUE_LABEL, type SeriesMap } from '../lib/data'
import { CATEGORY_LABEL, formatValue } from '../lib/format'

export function Indicators({ indicators, series, favorites, onFavorite, onOpen }: {
  indicators: Indicator[]; series: SeriesMap; favorites: string[]; onFavorite: (id: string) => void; onOpen: (id: string) => void
}): JSX.Element {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<Category | 'all'>('all')
  const [onlyFavorites, setOnlyFavorites] = useState(false)
  const [sort, setSort] = useState('default')
  const [tier, setTier] = useState('all')
  const [page, setPage] = useState(0)
  const current = useMemo(() => Object.fromEntries(indicators.map((i) => [i.id, currentSeries(series[i.id] ?? [])])), [indicators, series])
  const visible = indicators.filter((i) => (category === 'all' || i.category === category) && (tier === 'all' || (i.tier ?? 'P0') === tier) && (!onlyFavorites || favorites.includes(i.id)) &&
    `${i.nameZh} ${i.nameShort} ${i.id} ${i.region ?? ''} ${VALUE_LABEL[i.valueType]}`.toLowerCase().includes(query.trim().toLowerCase()))
    .sort((a, b) => sort === 'name' ? a.nameZh.localeCompare(b.nameZh, 'zh-CN') : sort === 'release' ?
      (current[b.id].at(-1)?.releasedAt ?? '').localeCompare(current[a.id].at(-1)?.releasedAt ?? '') : 0)
  const filterKey = [query, category, tier, onlyFavorites, sort, favorites.join(',')].join('|')
  const [lastFilter, setLastFilter] = useState(filterKey)
  if (lastFilter !== filterKey) { setLastFilter(filterKey); setPage(0) }
  const pageCount = Math.max(1, Math.ceil(visible.length / 24))
  return <>
    <PageHeading title="指标库" description="按主题浏览指标，查看统计口径、历史走势与发布状态。本轮接入真实数据的指标以实际观测为准，其余显示「暂无数据」。"><Badge>{indicators.length} 个指标</Badge></PageHeading>
    <div className="library-layout"><aside className="category-list" aria-label="指标分类">
      <button aria-pressed={category === 'all'} onClick={() => setCategory('all')}>全部指标 <span>{indicators.length}</span></button>
      {(Object.entries(CATEGORY_LABEL) as Array<[Category, string]>).filter(([id]) => indicators.some((i) => i.category === id)).map(([id, label]) =>
        <button key={id} aria-pressed={category === id} onClick={() => setCategory(id)}>{label}<span>{indicators.filter((i) => i.category === id).length}</span></button>)}
    </aside><div className="min-w-0"><div className="library-tools">
      <input className="search" aria-label="搜索指标" placeholder="搜索指标名称、口径或 ID…" value={query} onChange={(e) => setQuery(e.target.value)} />
      <select aria-label="指标层级" value={tier} onChange={(e) => setTier(e.target.value)}><option value="all">全部层级</option>{['P0', 'P1', 'P2'].map((value) => <option key={value} value={value}>{value}</option>)}</select>
      <label className="checkbox-label"><input type="checkbox" checked={onlyFavorites} onChange={(e) => setOnlyFavorites(e.target.checked)} />仅关注</label>
      <select aria-label="指标排序" value={sort} onChange={(e) => setSort(e.target.value)}><option value="default">默认排序</option><option value="name">名称排序</option><option value="release">最近发布</option></select>
    </div><p className="text-xs text-ink-muted mb-3">找到 {visible.length} 个指标</p>
    {visible.length === 0 ? <Empty>没有匹配的指标。试试其他关键词或分类。</Empty> : <div className="indicator-list">{visible.slice(page * 24, page * 24 + 24).map((i) => {
      const rows = current[i.id]
      const latest = rows.at(-1)
      return <div className="indicator-row" key={i.id}><button className="favorite" aria-label={`${favorites.includes(i.id) ? '取消关注' : '关注'}${i.nameShort}`} aria-pressed={favorites.includes(i.id)} onClick={() => onFavorite(i.id)}>{favorites.includes(i.id) ? '★' : '☆'}</button>
        <button className="indicator-title" onClick={() => onOpen(i.id)}><strong>{i.nameZh}</strong><IndicatorMeta indicator={i} /><span className="text-xs text-ink-muted">{i.note}</span></button>
        <div className="indicator-value"><strong className="tnum">{formatValue(latest?.value ?? null, i.decimals)} <small>{i.unit}</small></strong><span className="text-xs text-ink-muted">{latest?.period ?? '暂无数据'}</span><span className="text-xs"><Delta value={observationDelta(i, latest, rows.at(-2))} unit={deltaUnit(i)} decimals={i.decimals} /></span></div>
      </div>
    })}</div>}<div className="pagination"><span>第 {page + 1} / {pageCount} 页 · 每页 24 个指标</span><div className="actions"><button className="btn" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>上一页</button><button className="btn" disabled={page >= pageCount - 1} onClick={() => setPage((p) => p + 1)}>下一页</button></div></div></div></div>
  </>
}
