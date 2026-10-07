import { describe, expect, it } from 'vitest'
import type { LineSeriesOption } from 'echarts/charts'
import { INDICATORS } from '@shared/indicators'
import type { Observation } from '@shared/types'
import { buildComparisonOption } from './comparisonOption'
import { FALLBACK_TOKENS } from './theme'
const ind = (id: string) => INDICATORS.find((i) => i.id === id)!
const rows: Observation[] = [
  { indicatorId: 'cn.cpi.yoy', period: '2026-02', periodEnd: '2026-02-28', value: null, status: 'missing', releasedAt: '2026-03-10', revision: 0 },
  { indicatorId: 'cn.cpi.yoy', period: '2026-03', periodEnd: '2026-03-31', value: 2, status: 'merged', releasedAt: '2026-04-10', revision: 0 },
]
describe('对比图守卫与呈现', () => {
  it('不同频率、口径和量纲拒绝叠图，超过 3 条拒绝输出', () => {
    expect(() => buildComparisonOption([], FALLBACK_TOKENS)).toThrow()
    const item = { indicator: ind('cn.cpi.yoy'), rows }
    expect(() => buildComparisonOption([item, { indicator: ind('cn.gdp.yoy'), rows }], FALLBACK_TOKENS)).toThrow('相同口径')
    expect(() => buildComparisonOption([item, { indicator: ind('cn.unemp.rate'), rows }], FALLBACK_TOKENS)).toThrow('相同口径')
    expect(() => buildComparisonOption([item, { indicator: { ...item.indicator, unit: '点' }, rows }], FALLBACK_TOKENS)).toThrow('相同口径')
    expect(() => buildComparisonOption(Array(4).fill(item), FALLBACK_TOKENS)).toThrow('1–3')
  })
  it('共用单轴，不同线型，保留空值与合并标记', () => {
    const option = buildComparisonOption([
      { indicator: ind('cn.cpi.yoy'), rows }, { indicator: ind('cn.ppi.yoy'), rows },
    ], { ...FALLBACK_TOKENS, accent: '#123456' })
    const lines = option.series as LineSeriesOption[]
    expect(Array.isArray(option.yAxis)).toBe(false)
    expect(lines[0].lineStyle?.type).toBe('solid')
    expect(lines[1].lineStyle?.type).toBe('dashed')
    expect(lines.every((line) => line.lineStyle?.color === '#123456' && line.connectNulls === false)).toBe(true)
    expect(lines[0].data?.[0]).toEqual({ value: [Date.parse('2026-02-28T00:00:00Z'), null] })
    expect(lines[1].data?.[1]).toMatchObject({ symbol: 'diamond' })
  })
})
