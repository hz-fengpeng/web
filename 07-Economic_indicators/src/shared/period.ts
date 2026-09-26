/**
 * 期间（period）规范与运算。
 *
 * 设计要点（开发文档 §3.3）：period 标识期间本身，periodEnd 是用于排序与
 * 跨频率对齐的真实日期。两者分离，才能让月度、季度、年度指标在同一根时间轴上对齐。
 */

export type PeriodKind = 'month' | 'quarter' | 'year'

const MONTH_RE = /^(\d{4})-(\d{2})$/
const QUARTER_RE = /^(\d{4})Q([1-4])$/
const YEAR_RE = /^(\d{4})$/

export function parsePeriod(period: string): { kind: PeriodKind; year: number; index: number } | null {
  let m = MONTH_RE.exec(period)
  if (m) return { kind: 'month', year: Number(m[1]), index: Number(m[2]) }
  m = QUARTER_RE.exec(period)
  if (m) return { kind: 'quarter', year: Number(m[1]), index: Number(m[2]) }
  m = YEAR_RE.exec(period)
  if (m) return { kind: 'year', year: Number(m[1]), index: 1 }
  return null
}

/** 期间结束日（ISO 日期），用于排序与对齐 */
export function periodEnd(period: string): string {
  const p = parsePeriod(period)
  if (!p) throw new Error(`无法解析期间: ${period}`)

  if (p.kind === 'month') {
    // 第 0 天 = 上个月的最后一天
    const d = new Date(Date.UTC(p.year, p.index, 0))
    return d.toISOString().slice(0, 10)
  }
  if (p.kind === 'quarter') {
    const d = new Date(Date.UTC(p.year, p.index * 3, 0))
    return d.toISOString().slice(0, 10)
  }
  return `${p.year}-12-31`
}

/**
 * ISO 日期 → UTC 毫秒时间戳。时间轴按真实时间定位时用它。
 *
 * ★ 显式拼上 `T00:00:00Z`，不靠 `Date.parse` 对纯日期串的规范细节。
 *   `Date.parse('2026-08-31')` 按规范算 UTC，但只差一个后缀的
 *   `Date.parse('2026-08-31T00:00:00')` 算**本地**时间——语义相反，
 *   而这两种写法在代码里看起来几乎一样。把后缀写死，就不必每次回想。
 */
export const isoDateMs = (iso: string): number => Date.parse(`${iso}T00:00:00Z`)

export const monthPeriod = (year: number, month: number): string =>
  `${year}-${String(month).padStart(2, '0')}`

/** 判断期间是否合法（用于采集结果校验） */
export const isValidPeriod = (period: string): boolean => parsePeriod(period) !== null
