import { useMemo, useRef, useState, type JSX } from 'react'
import type { Indicator, Observation } from '@shared/types'
import { LineChart } from '../charts/LineChart'
import type { ChartHandle } from '../charts/ChartCanvas'
import { Badge, Delta, Empty, IndicatorMeta, ObservationTable, PageHeading, TimeControls, ViewToggle } from '../components/UI'
import { currentSeries, deltaUnit, filterRange, observationDelta, rangeStart, VALUE_LABEL, type TimeRange } from '../lib/data'
import { formatValue, STATUS_ZH } from '../lib/format'
import { saveExport, seriesCsv } from '../lib/export'

export function Detail({ indicator, indicators, rawRows, favorite, defaultRange, onFavorite, onOpen, onBack, onCompare, notify, onError }: {
  indicator: Indicator; indicators: Indicator[]; rawRows: Observation[]; favorite: boolean; defaultRange: TimeRange;
  onFavorite: () => void; onOpen: (id: string) => void; onBack: () => void; onCompare: () => void;
  notify: (message: string) => void; onError: (error: unknown) => void
}): JSX.Element {
  const [range, setRange] = useState(defaultRange)
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [view, setView] = useState<'chart' | 'table'>('chart')
  const [exporting, setExporting] = useState(false)
  const chartRef = useRef<ChartHandle>(null)
  const allRows = useMemo(() => currentSeries(rawRows), [rawRows])
  const latest = allRows.at(-1)
  const start = range === 'custom' ? from : rangeStart(latest?.periodEnd ?? '', range)
  const end = range === 'custom' ? to : ''
  const rows = useMemo(() => filterRange(allRows, start, end), [allRows, start, end])
  const family = indicators.filter((i) => i.id.split('.').slice(0, -1).join('.') === indicator.id.split('.').slice(0, -1).join('.'))
  const revisions = rawRows.filter((r) => rows.some((row) => row.period === r.period))
  const extraRevisions = revisions.length - rows.length
  const exportData = async (format: 'csv' | 'png'): Promise<void> => {
    setExporting(true)
    try {
      const content = format === 'csv' ? seriesCsv([{ indicator, rows }]) : await chartRef.current!.png(indicator.nameZh, [
        `${rows[0].period} 至 ${rows.at(-1)!.period} · ${VALUE_LABEL[indicator.valueType]} · 单位：${indicator.unit}${indicator.seasonalAdj ? ' · 季节调整' : ''}`,
        indicator.note ?? '', '当前值使用各期间最新修订；菱形标记表示 1—2 月合并发布。',
      ])
      const path = await saveExport(`${indicator.nameShort}-真实数据-${rows[0].period}-${rows.at(-1)!.period}`, format, content)
      if (path) notify(`已导出：${path}`)
    } catch (error) { onError(error) } finally { setExporting(false) }
  }
  return <>
    <button className="text-link mb-4" onClick={onBack}>← 返回指标库</button>
    <PageHeading title={indicator.nameZh} description={indicator.id}>
      <button className="btn" aria-pressed={favorite} onClick={onFavorite}>{favorite ? '★ 已关注' : '☆ 关注'}</button>
      <button className="btn" onClick={onCompare}>加入对比</button>
    </PageHeading>
    <div className="detail-summary"><div className="hero-number tnum">{formatValue(latest?.value ?? null, indicator.decimals)}<span>{indicator.unit}</span></div>
      <div className="summary-info"><strong>{latest?.period ?? '暂无数据'} <Badge>{latest ? STATUS_ZH[latest.status] : '无数据'}</Badge></strong><span>发布日（推算） {latest?.releasedAt ?? '—'}</span></div>
      <div className="summary-info"><span>较上期 · 计算值</span><Delta value={observationDelta(indicator, latest, allRows.at(-2))} unit={deltaUnit(indicator)} decimals={indicator.decimals} /></div>
    </div>
    <div className="note mb-5"><IndicatorMeta indicator={indicator} /><p>{indicator.note}</p></div>
    <div className="toolbar"><TimeControls range={range} onRange={setRange} from={from} to={to} onFrom={setFrom} onTo={setTo} />
      <div className="actions">{family.length > 1 && <select aria-label="切换统计口径" value={indicator.id} onChange={(e) => onOpen(e.target.value)}>{family.map((i) => <option key={i.id} value={i.id}>{i.nameShort} · {VALUE_LABEL[i.valueType]}{i.seasonalAdj ? ' · 季调' : ''}</option>)}</select>}
        <ViewToggle view={view} onChange={setView} /></div></div>
    {start && end && start > end ? <Empty>起始期末不能晚于结束期末，请调整日期。</Empty> : rows.length === 0 ? <Empty>所选时间范围内暂无观测数据。</Empty> : <section className="panel detail-chart">
      <div className="panel-heading"><span className="text-sm">{rows[0].period} — {rows.at(-1)!.period} <span className="text-ink-muted">· {rows.length} 个期间</span></span>
        <div className="actions"><button className="btn" disabled={exporting} onClick={() => void exportData('csv')}>导出 CSV</button>{view === 'chart' && <button className="btn" disabled={exporting} onClick={() => void exportData('png')}>导出 PNG</button>}</div></div>
      {view === 'chart' ? <LineChart ref={chartRef} indicator={indicator} rows={rows} height={360} /> : <ObservationTable indicator={indicator} rows={rows} allRows={allRows} />}
      <p className="chart-note">{rows.some((r) => r.status === 'merged') && '◇ 表示 1—2 月合并发布，非单月值。'} 缺失值不补齐；跨缺期、合并期间及累计口径跨年的变动不计算。</p>
    </section>}
    {extraRevisions > 0 && <details className="panel mt-5"><summary>历史修订 · {extraRevisions} 条旧版本</summary><div className="table-scroll mt-4"><table><thead><tr><th>期间</th><th>数值（{indicator.unit}）</th><th>发布日</th><th>状态</th><th>修订序号</th></tr></thead><tbody>
      {[...revisions].sort((a, b) => b.periodEnd.localeCompare(a.periodEnd) || b.revision - a.revision).map((r) => <tr key={`${r.period}-${r.revision}`}><td>{r.period}</td><td>{formatValue(r.value, indicator.decimals)}</td><td>{r.releasedAt}</td><td>{STATUS_ZH[r.status]}</td><td>{r.revision}</td></tr>)}
    </tbody></table></div></details>}
  </>
}
