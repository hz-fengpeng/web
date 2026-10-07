import { describe, expect, it } from 'vitest'
import { isValidPeriod, parsePeriod, periodEnd } from './period'

describe('日/月/季/年期间', () => {
  it('日度支持闰日，拒绝不存在的日期及无效月份', () => {
    expect(parsePeriod('2024-02-29')?.kind).toBe('day')
    expect(periodEnd('2024-02-29')).toBe('2024-02-29')
    for (const date of ['2023-02-29', '2026-02-30', '2026-13-01', '2026-00', '2026-13']) {
      expect(isValidPeriod(date)).toBe(false)
      expect(() => periodEnd(date)).toThrow()
    }
  })
  it('四种频率的结束日期有一致的边界语义', () => {
    expect(periodEnd('2024-02')).toBe('2024-02-29')
    expect(periodEnd('2026Q1')).toBe('2026-03-31')
    expect(periodEnd('2025')).toBe('2025-12-31')
  })
})
