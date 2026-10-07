import { useMemo, useRef, useState, type JSX } from 'react'
import type { Indicator } from '@shared/types'
import { ChartCanvas, type ChartHandle } from '../charts/ChartCanvas'
import { buildComparisonOption } from '../charts/comparisonOption'
import { useChartTokens } from '../charts/theme'
import { Badge, Empty, IndicatorMeta, PageHeading, TimeControls, ViewToggle } from '../components/UI'
import { comparable, currentSeries, filterRange, rangeStart, VALUE_LABEL, type SeriesMap, type TimeRange } from '../lib/data'
import { formatValue, STATUS_ZH } from '../lib/format'
import { saveExport, seriesCsv } from '../lib/export'

export function Compare({ indicators, series, selectedIds, onSelection, defaultRange, notify, onError }: {
  indicators: Indicator[]; series: SeriesMap; selectedIds: string[]; onSelection: (ids: string[]) => void;
  defaultRange: TimeRange; notify: (message: string) => void; onError: (error: unknown) => void
}): JSX.Element {
  const [range, setRange] = useState(defaultRange)
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [view, setView] = useState<'chart' | 'table'>('chart')
  const [exporting, setExporting] = useState(false)
  const [query, setQuery] = useState('')
  const [tier, setTier] = useState('all')
  const ref = useRef<ChartHandle>(null)
  const tokens = useChartTokens()
  const selected = indicators.filter((i) => selectedIds.includes(i.id))
  const anchor = selected[0]
  const all = useMemo(() => indicators.filter((i) => selectedIds.includes(i.id)).map((indicator) => ({ indicator, rows: currentSeries(series[indicator.id] ?? []) })), [indicators, selectedIds, series])
  const latest = all.flatMap((item) => item.rows.map((r) => r.periodEnd)).sort().at(-1) ?? ''
  const start = range === 'custom' ? from : rangeStart(latest, range)
  const end = range === 'custom' ? to : ''
  const items = useMemo(() => all.map((item) => ({ ...item, rows: filterRange(item.rows, start, end) })), [all, start, end])
  const option = useMemo(() => items.length ? buildComparisonOption(items, tokens) : null, [items, tokens])
  const periods = [...new Set(items.flatMap((item) => item.rows.map((r) => r.period)))].sort().reverse()
  const exportData = async (format: 'csv' | 'png'): Promise<void> => {
    setExporting(true)
    try {
      const content = format === 'csv' ? seriesCsv(items) : await ref.current!.png('指标对比 · ' + selected.map((i) => i.nameShort).join(' / '), [
        `${periods.at(-1)} 至 ${periods[0]} · ${VALUE_LABEL[anchor.valueType]} · 单位：${anchor.unit}`,
        ...selected.map((i, index) => `${['实线圆点', '虚线方点', '点线三角'][index]} · ${i.nameShort}：${i.note ?? ''}`), '缺失值不插值；菱形为 1—2 月合并发布。',
      ])
      const path = await saveExport('指标对比-示例数据', format, content)
      if (path) notify(`已导出：${path}`)
    } catch (error) { onError(error) } finally { setExporting(false) }
  }
  return <>
    <PageHeading title="对比分析" description="选择最多 3 个可比指标，在同一时间轴上查看走势。"><Badge>{selected.length} / 3 个指标</Badge></PageHeading>
    <div className="compare-layout"><aside className="panel compare-picker"><h2>选择指标</h2><p className="text-xs text-ink-muted my-3">首个指标确定口径、单位、频率与季调状态。</p>
      <input className="compare-search" aria-label="搜索对比指标" placeholder="搜索名称或地区…" value={query} onChange={(e) => setQuery(e.target.value)} />
      <select className="compare-search" aria-label="对比指标层级" value={tier} onChange={(e) => setTier(e.target.value)}><option value="all">全部层级</option>{['P0', 'P1', 'P2'].map((value) => <option key={value} value={value}>{value}</option>)}</select>
      <div className="compare-options">{indicators.filter((i) => (tier === 'all' || (i.tier ?? 'P0') === tier) && `${i.nameShort} ${i.id} ${i.region ?? ''}`.toLowerCase().includes(query.trim().toLowerCase())).map((i) => {
        const checked = selectedIds.includes(i.id)
        const compatible = !anchor || comparable(anchor, i)
        const disabled = !checked && (!compatible || selected.length >= 3)
        return <label key={i.id} className={`compare-choice ${disabled ? 'unavailable' : ''}`}>
          <input type="checkbox" checked={checked} disabled={disabled} onChange={() => onSelection(checked ? selectedIds.filter((id) => id !== i.id) : [...selectedIds, i.id])} />
          <span><strong>{i.nameShort}</strong><small>{VALUE_LABEL[i.valueType]} · {i.unit}{!compatible ? ' · 口径不一致' : ''}</small></span></label>
      })}</div><button className="btn mt-4 w-full" disabled={selected.length === 0} onClick={() => onSelection([])}>清空选择</button>
    </aside><div className="min-w-0">
      {!anchor ? <Empty>从左侧选择一个指标开始对比。物价同比、内需累计同比各有可比组。</Empty> : <>
        <div className="toolbar"><TimeControls range={range} onRange={setRange} from={from} to={to} onFrom={setFrom} onTo={setTo} /><ViewToggle view={view} onChange={setView} /></div>
        <div className="note mb-4"><IndicatorMeta indicator={anchor} /><p>按期末对齐，缺失期保留空值，不进行插值或跨频率转换。</p></div>
        {start && end && start > end ? <Empty>起始期末不能晚于结束期末，请调整日期。</Empty> : periods.length === 0 ? <Empty>所选时间范围内暂无观测数据。</Empty> : <section className="panel">
          <div className="panel-heading"><div className="comparison-legend">{selected.map((i, index) => <span key={i.id}><i className={`line-key pattern-${index}`} /><span>{['●', '■', '▲'][index]} {i.nameShort}</span></span>)}</div>
            <div className="actions"><button className="btn" disabled={exporting} onClick={() => void exportData('csv')}>CSV</button>{view === 'chart' && <button className="btn" disabled={exporting} onClick={() => void exportData('png')}>PNG</button>}</div></div>
          {view === 'chart' && option ? <ChartCanvas ref={ref} option={option} label={`${selected.map((i) => i.nameZh).join('、')}对比折线图`} height={360} /> : <div className="table-scroll comparison-table"><table><thead><tr><th>期间</th>{selected.map((i) => <th key={i.id}>{i.nameShort}（{i.unit}）</th>)}</tr></thead><tbody>{periods.map((period) => <tr key={period}><td className="tnum">{period}</td>{items.map(({ indicator, rows }) => {
            const row = rows.find((r) => r.period === period)
            return <td className="tnum" key={indicator.id}>{formatValue(row?.value ?? null, indicator.decimals)}{row && <small className="block text-ink-muted">{STATUS_ZH[row.status]} · {row.releasedAt}</small>}</td>
          })}</tr>)}</tbody></table></div>}
          <p className="chart-note">同一颜色配合不同线型和点形区分序列。◇ 为 1—2 月合并值；各序列缺失值保持断线。</p>
        </section>}
        <div className="mt-4 space-y-2">{selected.map((i) => <p key={i.id} className="chart-note"><strong className="text-ink-2">{i.nameShort}：</strong>{i.note}</p>)}</div>
      </>}
    </div></div>
  </>
}
