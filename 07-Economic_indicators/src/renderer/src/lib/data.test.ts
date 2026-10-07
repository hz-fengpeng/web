import { describe, expect, it } from 'vitest'
import { INDICATORS } from '@shared/indicators'
import type { Observation } from '@shared/types'
import { comparable, currentSeries, filterRange, observationDelta, rangeStart, releaseEvents, shiftMonth } from './data'
import { csvCell, seriesCsv } from './export'
const ind = (id: string) => INDICATORS.find((i) => i.id === id)!
const row = (period: string, value: number | null, revision = 0): Observation => ({
  indicatorId: 'cn.cpi.yoy', period, periodEnd: `${period}-28`, value, revision, status: 'ok', releasedAt: '2026-03-10',
})

describe('浏览数据的语义', () => {
  it('乱序修订仍取最大 revision，缺失的最新版本不会回退旧值', () => {
    const old = row('2026-02', 2, 0)
    const latest = row('2026-02', null, 2)
    expect(currentSeries([old, latest, row('2026-01', 1, 0)])).toEqual([row('2026-01', 1, 0), latest])
  })
  it('近一年按期末精确裁切，闰年转普通年不滚入三月', () => {
    expect(rangeStart('2024-02-29', '1y')).toBe('2023-03-01')
    expect(rangeStart('2026-08-31', '3y')).toBe('2023-09-01')
    expect(rangeStart('2026-08-31', 'all')).toBe('')
  })
  it('自定义范围含两端，不含范围外记录；反向范围不返回数据', () => {
    const rows = [row('2026-01', 1), row('2026-02', 2), row('2026-03', 3)]
    expect(filterRange(rows, '2026-02-28', '2026-03-28')).toEqual(rows.slice(1))
    expect(filterRange(rows, '2026-03-28', '2026-02-28')).toEqual([])
  })
  it('同比与环比、季度同比与月度同比不兼容，价格同比互相兼容', () => {
    expect(comparable(ind('cn.cpi.yoy'), ind('cn.ppi.yoy'))).toBe(true)
    expect(comparable(ind('cn.ind_prod.yoy'), ind('cn.ind_prod.mom'))).toBe(false)
    expect(comparable(ind('cn.gdp.yoy'), ind('cn.cpi.yoy'))).toBe(false)
    expect(comparable({ ...ind('cn.cpi.yoy'), seasonalAdj: true }, ind('cn.ppi.yoy'))).toBe(false)
  })
  it('相邻月同比允许跨年，累计同比跨年不计算', () => {
    expect(observationDelta(ind('cn.cpi.yoy'), row('2026-01', 2), row('2025-12', 1))).toBe(1)
    expect(observationDelta(ind('cn.retail.cum_yoy'), row('2026-01', 2), row('2025-12', 1))).toBeNull()
  })
  it('缺期、空值与合并值不计算变动，普通相邻期正常计算', () => {
    expect(observationDelta(ind('cn.cpi.yoy'), row('2026-03', 3), row('2026-01', 1))).toBeNull()
    expect(observationDelta(ind('cn.cpi.yoy'), row('2026-03', null), row('2026-02', 1))).toBeNull()
    expect(observationDelta(ind('cn.cpi.yoy'), row('2026-03', 3), { ...row('2026-02', 1), status: 'merged' })).toBeNull()
    expect(observationDelta(ind('cn.cpi.yoy'), row('2026-03', 3), row('2026-02', 1))).toBe(2)
  })
  it('季度变动按相邻季度而非相邻月份计算', () => {
    expect(observationDelta(ind('cn.gdp.yoy'), row('2026Q1', 5), row('2025Q4', 4))).toBe(1)
    expect(observationDelta(ind('cn.gdp.yoy'), row('2026Q2', 5), row('2025Q4', 4))).toBeNull()
  })
  it('日度跨周末允许比较，跨未标明的缺期不算变动，年度跨年正常比较', () => {
    const daily = ind('cn.fx_rate.usd_cny')
    expect(observationDelta(daily, row('2026-08-31', 7.1234), row('2026-08-28', 7.1230))).toBeCloseTo(0.0004, 5)
    expect(observationDelta(daily, row('2026-08-31', 7.1234), row('2026-08-27', 7.1230))).toBeNull()
    expect(observationDelta(ind('cn.population.total'), row('2025', 140500), row('2024', 140800))).toBe(-300)
  })
  it('日历保留同一期间的多次修订发布，不把缺少发布日的值当作事件', () => {
    const base = row('2026-02', 2)
    const revised = { ...base, revision: 1, releasedAt: '2026-04-10' }
    const events = releaseEvents([ind('cn.cpi.yoy')], { 'cn.cpi.yoy': [revised, { ...base, releasedAt: null }, base] })
    expect(events.map((event) => event.row)).toEqual([base, revised])
    expect(shiftMonth('2026-01', -1)).toBe('2025-12')
    expect(shiftMonth('2026-12', 1)).toBe('2027-01')
  })
})

describe('CSV 输出', () => {
  it('带 BOM、口径声明、修订序号，空值不伪造成零', () => {
    const csv = seriesCsv([{ indicator: ind('cn.cpi.yoy'), rows: [row('2026-02', null, 2)] }])
    expect(csv.startsWith('\uFEFF')).toBe(true)
    expect(csv).toContain('示例数据，非真实统计')
    expect(csv).toContain('"修订序号"')
    expect(csv).toContain('"2026-02-28","","正常","2026-03-10","2"')
    expect(csv.endsWith('\r\n')).toBe(true)
  })
  it('转义逗号、引号及换行，阻止字符串公式而保留负数的数值类型', () => {
    expect(csvCell('a,"b"\nc')).toBe('"a,""b""\nc"')
    expect(csvCell(' =1+2')).toBe('"\' =1+2"')
    expect(csvCell('-2')).toBe('"\'-2"')
    expect(csvCell(-2)).toBe('"-2"')
  })
})
