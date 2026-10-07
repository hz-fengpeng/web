import { useMemo, useState, type JSX } from 'react'
import type { Indicator, Category } from '@shared/types'
import { Badge, Empty, PageHeading } from '../components/UI'
import { releaseEvents, shiftMonth, type SeriesMap } from '../lib/data'
import { CATEGORY_LABEL, formatValue, STATUS_ZH } from '../lib/format'

export function Calendar({ indicators, series, onOpen }: { indicators: Indicator[]; series: SeriesMap; onOpen: (id: string) => void }): JSX.Element {
  const events = useMemo(() => releaseEvents(indicators, series), [indicators, series])
  const latestMonth = events.at(-1)?.row.releasedAt?.slice(0, 7) ?? new Date().toISOString().slice(0, 7)
  const [month, setMonth] = useState(latestMonth)
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const [category, setCategory] = useState<Category | 'all'>('all')
  const monthEvents = events.filter((e) => e.row.releasedAt?.startsWith(month) && (category === 'all' || e.indicator.category === category))
  const visible = selectedDay ? monthEvents.filter((e) => e.row.releasedAt === selectedDay) : monthEvents
  const [year, m] = month.split('-').map(Number)
  const count = new Date(Date.UTC(year, m, 0)).getUTCDate()
  const offset = (new Date(Date.UTC(year, m - 1, 1)).getUTCDay() + 6) % 7
  const changeMonth = (next: string): void => { if (/^\d{4}-\d{2}$/.test(next)) { setMonth(next); setSelectedDay(null) } }
  return <>
    <PageHeading title="发布日历" description="查看内置示例库中的发布记录；日期为演示日期，不代表官方发布安排。"><Badge>{monthEvents.length} 条发布记录</Badge></PageHeading>
    <div className="toolbar"><div className="actions"><button className="btn" aria-label="上个月" onClick={() => changeMonth(shiftMonth(month, -1))}>←</button>
      <input type="month" aria-label="发布月份" value={month} onChange={(e) => changeMonth(e.target.value)} />
      <button className="btn" aria-label="下个月" onClick={() => changeMonth(shiftMonth(month, 1))}>→</button><button className="btn" onClick={() => changeMonth(latestMonth)}>最近有记录的月份</button></div>
      <select aria-label="日历指标分类" value={category} onChange={(e) => { setCategory(e.target.value as Category | 'all'); setSelectedDay(null) }}><option value="all">全部分类</option>
        {(Object.entries(CATEGORY_LABEL) as Array<[Category, string]>).filter(([id]) => indicators.some((i) => i.category === id)).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
      </select></div>
    <section className="panel calendar-panel"><div className="calendar-week">{['一', '二', '三', '四', '五', '六', '日'].map((day) => <span key={day}>周{day}</span>)}</div>
      <div className="calendar-grid">{Array.from({ length: offset }, (_, i) => <div className="calendar-blank" key={`blank-${i}`} />)}
        {Array.from({ length: count }, (_, index) => {
          const day = `${month}-${String(index + 1).padStart(2, '0')}`
          const list = monthEvents.filter((e) => e.row.releasedAt === day)
          return <button className="calendar-day" key={day} aria-pressed={selectedDay === day} aria-label={`${day}，${list.length} 条示例发布记录`} onClick={() => setSelectedDay(selectedDay === day ? null : day)}>
            <span className="calendar-date tnum">{index + 1}</span>{list.slice(0, 2).map((e) => <span className="calendar-event" key={`${e.indicator.id}-${e.row.period}-${e.row.revision}`}>{e.indicator.nameShort}</span>)}
            {list.length > 2 && <small className="text-ink-muted">另有 {list.length - 2} 条</small>}
          </button>
        })}</div></section>
    <div className="section-caption mt-6"><span>{selectedDay ?? month} · 发布记录</span>{selectedDay && <button className="text-link" onClick={() => setSelectedDay(null)}>查看整月</button>}</div>
    {visible.length === 0 ? <Empty>这段时间没有示例发布记录。可切换到最近有记录的月份。</Empty> : <div className="panel table-scroll"><table><thead><tr><th>示例发布日</th><th>指标</th><th>观测期间</th><th>数值</th><th>状态</th></tr></thead><tbody>
      {visible.map(({ indicator, row }) => <tr key={`${indicator.id}-${row.period}-${row.revision}`}><td className="tnum">{row.releasedAt}</td><td><button className="text-link" onClick={() => onOpen(indicator.id)}>{indicator.nameShort}</button></td><td>{row.period}</td><td className="tnum">{formatValue(row.value, indicator.decimals)} {indicator.unit}</td><td><Badge>{STATUS_ZH[row.status]}</Badge></td></tr>)}
    </tbody></table></div>}
  </>
}
