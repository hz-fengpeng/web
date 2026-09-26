import type { Category, Observation, ObsStatus, Result } from '@shared/types'

/** 拆掉 Result 包装：IPC 层的错误在这里变成异常，交给 React 的错误状态统一处理 */
export async function unwrap<T>(p: Promise<Result<T>>): Promise<T> {
  const r = await p
  if (!r.ok) throw new Error(r.error.message)
  return r.data
}

export const CATEGORY_LABEL: Record<Category, string> = {
  growth: '经济增长',
  price: '物价',
  sentiment: '景气调查',
  demand: '内需',
  money: '货币金融',
  employment: '就业',
  external: '对外经济',
  fiscal: '财政',
}

/**
 * 观测状态的中文标签。图表 tooltip 与数据表共用一份——两处各写一份，
 * 迟早会出现「表里写 1—2月合并、图上写 merged」这种不一致。
 *
 * 缺省时直接显示原值：宁可露出英文，也不要因为没登记而显示成空白。
 */
export const STATUS_ZH: Record<ObsStatus, string> = {
  ok: '正常',
  prelim: '初步核算',
  revised: '已修订',
  missing: '缺失',
  merged: '1—2月合并',
}

/**
 * 同一期间可能有多个修订版本（GDP 三次核实）。
 * getSeries 已按 revision DESC 排序，取每个期间的首行即最新版本。
 */
export function latestPerPeriod(rows: Observation[]): Observation[] {
  const seen = new Set<string>()
  return rows.filter((r) => (seen.has(r.period) ? false : (seen.add(r.period), true)))
}

/** 千分位 + 固定小数位 */
export function formatValue(value: number | null, decimals: number): string {
  if (value === null) return '—'
  return value.toLocaleString('zh-CN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

/** 带符号的变动量，用真正的减号 U+2212 而不是连字符 */
export function formatDelta(delta: number, decimals: number): string {
  const sign = delta > 0 ? '+' : delta < 0 ? '−' : '±'
  return `${sign}${Math.abs(delta).toFixed(decimals)}`
}

export function formatDateTime(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}
