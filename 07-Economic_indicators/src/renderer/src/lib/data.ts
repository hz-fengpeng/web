import type { Indicator, Observation, ValueType } from '@shared/types'
import { parsePeriod } from '@shared/period'
import { latestPerPeriod } from './format'

export type SeriesMap = Record<string, Observation[]>
export type TimeRange = '1y' | '3y' | '5y' | 'all' | 'custom'
export const VALUE_LABEL: Record<ValueType, string> = {
  yoy: '同比', mom: '环比', level: '当期值', cumulative: '累计值',
  cumulative_yoy: '累计同比', index: '指数',
}
export const FREQUENCY_LABEL = { day: '日度', month: '月度', quarter: '季度', year: '年度' }
export const RANGE_LABEL: Record<TimeRange, string> = {
  '1y': '近 1 年', '3y': '近 3 年', '5y': '近 5 年', all: '全部', custom: '自定义',
}
export const DEMO_LABEL = '示例数据，非真实统计'

export function currentSeries(rows: Observation[]): Observation[] {
  return latestPerPeriod([...rows].sort((a, b) =>
    a.periodEnd.localeCompare(b.periodEnd) || b.revision - a.revision))
}

/** 所有快捷时间窗锚定库内最新期末，避免旧示例库按系统日期筛成空白。 */
export function rangeStart(end: string, range: TimeRange): string {
  if (range === 'all' || range === 'custom' || !end) return ''
  const date = new Date(`${end}T00:00:00Z`)
  const years = Number.parseInt(range)
  const year = date.getUTCFullYear() - years
  const month = date.getUTCMonth()
  const day = Math.min(date.getUTCDate(), new Date(Date.UTC(year, month + 1, 0)).getUTCDate())
  return new Date(Date.UTC(year, month, day + 1)).toISOString().slice(0, 10)
}

export function filterRange(rows: Observation[], from: string, to: string): Observation[] {
  if (from && to && from > to) return []
  return rows.filter((r) => (!from || r.periodEnd >= from) && (!to || r.periodEnd <= to))
}

export function comparable(a: Indicator, b: Indicator): boolean {
  return a.valueType === b.valueType && a.unit === b.unit &&
    a.frequency === b.frequency && a.seasonalAdj === b.seasonalAdj
}

/** 只计算相邻、可比期间的差；累计同比的变化是百分点之差，绝非单月同比。 */
export function observationDelta(indicator: Indicator, row?: Observation, prev?: Observation): number | null {
  if (!row || !prev || row.value === null || prev.value === null ||
      row.status === 'merged' || prev.status === 'merged') return null
  const a = parsePeriod(row.period)
  const b = parsePeriod(prev.period)
  if (!a || !b || a.kind !== b.kind) return null
  if (a.kind === 'day') {
    const current = new Date(`${row.period}T00:00:00Z`)
    const previous = new Date(`${prev.period}T00:00:00Z`)
    const days = (current.getTime() - previous.getTime()) / 86400e3
    // 示例日历按工作周排列；跨周末可比，其他日历缺口不补算。
    if (days !== 1 && !(days === 3 && previous.getUTCDay() === 5 && current.getUTCDay() === 1)) return null
    return row.value - prev.value
  }
  const steps = a.kind === 'month' ? 12 : a.kind === 'quarter' ? 4 : 1
  if ((a.year - b.year) * steps + a.index - b.index !== 1) return null
  if ((indicator.valueType === 'cumulative_yoy' || indicator.valueType === 'cumulative') && a.year !== b.year) return null
  return row.value - prev.value
}

export function deltaUnit(indicator: Indicator): string {
  return indicator.unit === '%' ? '个百分点' : indicator.unit
}

export interface ReleaseEvent { indicator: Indicator; row: Observation }
/** 保留每次修订发布的日期，而不是把旧版本的发布事件抹掉。 */
export function releaseEvents(indicators: Indicator[], series: SeriesMap): ReleaseEvent[] {
  return indicators.flatMap((indicator) => (series[indicator.id] ?? [])
    .filter((row) => row.releasedAt !== null)
    .map((row) => ({ indicator, row })))
    .sort((a, b) => (a.row.releasedAt ?? '').localeCompare(b.row.releasedAt ?? '') ||
      a.indicator.id.localeCompare(b.indicator.id) || a.row.revision - b.row.revision)
}

export function shiftMonth(month: string, offset: number): string {
  const [year, m] = month.split('-').map(Number)
  return new Date(Date.UTC(year, m - 1 + offset, 1)).toISOString().slice(0, 7)
}
