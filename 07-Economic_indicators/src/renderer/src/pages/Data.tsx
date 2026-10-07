import { useEffect, useRef, useState, type JSX } from 'react'
import type { DataStatus, Indicator } from '@shared/types'
import { Badge, Empty, PageHeading } from '../components/UI'
import { currentSeries, type SeriesMap } from '../lib/data'
import { formatDateTime } from '../lib/format'
import { saveExport, seriesCsv } from '../lib/export'

const HEALTH = { ok: '● 正常', partial: '◐ 部分可用', fail: '▲ 读取失败', never: '○ 暂无记录' }
export function Data({ status, indicators, series, busy, onReset, onOpen, notify, onError }: {
  status: DataStatus; indicators: Indicator[]; series: SeriesMap; busy: boolean; onReset: () => Promise<boolean>;
  onOpen: (id: string) => void; notify: (message: string) => void; onError: (error: unknown) => void
}): JSX.Element {
  const [confirming, setConfirming] = useState(false)
  const [exporting, setExporting] = useState(false)
  const dialogRef = useRef<HTMLDialogElement>(null)
  useEffect(() => { if (confirming) dialogRef.current?.showModal(); else dialogRef.current?.close() }, [confirming])
  const exportAll = async (): Promise<void> => {
    setExporting(true)
    try {
      const path = await saveExport('全部指标-示例数据', 'csv', seriesCsv(indicators.map((indicator) => ({ indicator, rows: series[indicator.id] ?? [] }))))
      if (path) notify(`已导出：${path}`)
    } catch (error) { onError(error) } finally { setExporting(false) }
  }
  return <>
    <PageHeading title="数据管理" description="数据来自随应用提供的 SQLite 示例文件，所有页面均可离线使用。"><button className="btn" disabled={exporting || busy} onClick={() => void exportAll()}>导出全部 CSV（含修订）</button></PageHeading>
    <div className="stats-grid"><section className="panel"><p>指标数量</p><strong className="stat-number tnum">{status.indicatorCount}</strong></section>
      <section className="panel"><p>观测记录（含历史修订）</p><strong className="stat-number tnum">{status.observationCount}</strong></section>
      <section className="panel"><p>数据模式</p><strong className="stat-number">离线示例</strong></section></div>
    <section className="panel mt-5"><h2>数据来源</h2>{status.sources.length === 0 ? <Empty>暂无来源记录</Empty> : status.sources.map((s) => <div className="source-info" key={s.id}><div className="actions"><strong>{s.nameZh}</strong><Badge>{HEALTH[s.status]}</Badge></div><p>{s.message}</p><small>示例库记录时间 {formatDateTime(s.lastAt)} · 记录 {s.rowsWritten ?? 0} 条</small></div>)}</section>
    <section className="panel mt-5"><div className="panel-heading"><h2>指标覆盖情况</h2><span className="text-xs text-ink-muted">不把缺失值计为有效观测</span></div><div className="table-scroll"><table><thead><tr><th>指标</th><th>最早期间</th><th>最新期间</th><th>有效值 / 期间数</th><th>缺失期</th><th>旧修订</th></tr></thead><tbody>
      {indicators.map((i) => {
        const raw = series[i.id] ?? []
        const rows = currentSeries(raw)
        return <tr key={i.id}><td><button className="text-link" onClick={() => onOpen(i.id)}>{i.nameShort}</button></td><td>{rows[0]?.period ?? '—'}</td><td>{rows.at(-1)?.period ?? '—'}</td><td>{rows.filter((r) => r.value !== null).length} / {rows.length}</td><td>{rows.filter((r) => r.value === null).length}</td><td>{raw.length - rows.length}</td></tr>
      })}
    </tbody></table></div></section>
    <section className="panel mt-5 reset-panel"><div><h2>恢复内置示例数据</h2><p>将本地数据库覆盖为随应用提供的版本。关注和显示偏好保留。</p></div><button className="btn danger" disabled={busy} onClick={() => setConfirming(true)}>{busy ? '恢复中…' : '重置示例数据'}</button></section>
    <dialog ref={dialogRef} onCancel={() => setConfirming(false)} onClose={() => setConfirming(false)} aria-labelledby="reset-title"><h2 id="reset-title">恢复内置示例数据？</h2><p>本地数据库中的所有修改将被覆盖。此操作不会更改内置文件。</p><div className="actions justify-end mt-6"><button className="btn" disabled={busy} onClick={() => setConfirming(false)}>取消</button><button className="btn danger" disabled={busy} onClick={() => void onReset().then((ok) => { if (ok) setConfirming(false) })}>{busy ? '恢复中…' : '确认恢复'}</button></div></dialog>
  </>
}
