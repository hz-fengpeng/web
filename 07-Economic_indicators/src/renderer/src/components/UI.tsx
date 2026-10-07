import { useState, type JSX, type ReactNode } from 'react'
import type { Indicator, Observation } from '@shared/types'
import { formatDelta, formatValue, STATUS_ZH } from '../lib/format'
import { deltaUnit, observationDelta, RANGE_LABEL, VALUE_LABEL, FREQUENCY_LABEL, type TimeRange } from '../lib/data'

export function PageHeading({ title, description, children }: { title: string; description: string; children?: ReactNode }): JSX.Element {
  return <div className="page-heading"><div><h1 tabIndex={-1}>{title}</h1><p>{description}</p></div><div className="actions">{children}</div></div>
}
export function Empty({ children }: { children: ReactNode }): JSX.Element {
  return <div className="empty-state">{children}</div>
}
export function Badge({ children }: { children: ReactNode }): JSX.Element {
  return <span className="badge">{children}</span>
}
export function IndicatorMeta({ indicator: i }: { indicator: Indicator }): JSX.Element {
  return <div className="actions"><Badge>{i.tier ?? 'P0'}</Badge><Badge>{VALUE_LABEL[i.valueType]}</Badge><Badge>{FREQUENCY_LABEL[i.frequency]}</Badge>{i.seasonalAdj && <Badge>季节调整</Badge>}{i.isDerived && <Badge>示例计算值</Badge>}{i.region && <Badge>{i.region}</Badge>}</div>
}
export function Delta({ value, unit = '', decimals = 1 }: { value: number | null; unit?: string; decimals?: number }): JSX.Element {
  if (value === null) return <span className="text-ink-muted">—</span>
  return <span className={`tnum ${value > 0 ? 'text-up' : value < 0 ? 'text-down' : 'text-ink-2'}`}>
    <span aria-hidden="true">{value > 0 ? '▲' : value < 0 ? '▼' : '＝'} </span>{formatDelta(value, decimals)}{unit && ` ${unit}`}
  </span>
}
export function ViewToggle({ view, onChange }: { view: 'chart' | 'table'; onChange: (view: 'chart' | 'table') => void }): JSX.Element {
  return <div className="segmented" role="group" aria-label="显示方式">
    <button aria-pressed={view === 'chart'} onClick={() => onChange('chart')}>图表</button>
    <button aria-pressed={view === 'table'} onClick={() => onChange('table')}>数据表</button>
  </div>
}
export function TimeControls({ range, onRange, from, to, onFrom, onTo }: {
  range: TimeRange; onRange: (r: TimeRange) => void; from: string; to: string;
  onFrom: (value: string) => void; onTo: (value: string) => void
}): JSX.Element {
  return <div className="time-controls"><div className="segmented" role="group" aria-label="时间范围">
    {(Object.entries(RANGE_LABEL) as Array<[TimeRange, string]>).map(([id, label]) =>
      <button key={id} aria-pressed={range === id} onClick={() => onRange(id)}>{label}</button>)}
  </div>{range === 'custom' && <div className="actions">
    <label className="field-inline">起始期末<input type="date" value={from} onChange={(e) => onFrom(e.target.value)} /></label>
    <label className="field-inline">结束期末<input type="date" value={to} onChange={(e) => onTo(e.target.value)} /></label>
  </div>}</div>
}
export function ObservationTable({ indicator, rows, allRows = rows }: { indicator: Indicator; rows: Observation[]; allRows?: Observation[] }): JSX.Element {
  const [page, setPage] = useState(0)
  const [lastRows, setLastRows] = useState(rows)
  if (lastRows !== rows) { setLastRows(rows); setPage(0) }
  const ordered = [...rows].reverse()
  const pageCount = Math.max(1, Math.ceil(ordered.length / 24))
  return <div><div className="table-scroll"><table><thead><tr>
    <th>期间</th><th className="numeric">数值（{indicator.unit}）</th><th className="numeric">较上期（{deltaUnit(indicator)}）</th><th>发布日</th><th>状态</th><th className="numeric">修订序号</th>
  </tr></thead><tbody>{ordered.slice(page * 24, page * 24 + 24).map((row) => {
    const index = allRows.findIndex((r) => r.period === row.period && r.revision === row.revision)
    return <tr key={`${row.period}-${row.revision}`}><td className="tnum">{row.period}</td>
      <td className="numeric strong">{formatValue(row.value, indicator.decimals)}</td>
      <td className="numeric"><Delta value={observationDelta(indicator, row, allRows[index - 1])} decimals={indicator.decimals} /></td>
      <td className="tnum">{row.releasedAt ?? '—'}</td><td><Badge>{STATUS_ZH[row.status]}</Badge></td><td className="numeric">{row.revision}</td></tr>
  })}</tbody></table></div><div className="pagination"><span>共 {rows.length} 个期间 · 第 {page + 1} / {pageCount} 页</span>
    <div className="actions"><button className="btn" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>上一页</button>
    <button className="btn" disabled={page >= pageCount - 1} onClick={() => setPage((p) => p + 1)}>下一页</button></div></div></div>
}
