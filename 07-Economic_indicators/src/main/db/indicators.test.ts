import { afterAll, describe, expect, it } from 'vitest'
import { resolve } from 'node:path'
import { INDICATORS } from '@shared/indicators'
import { openDatabase } from './adapter'
import { getSeries, counts, getMeta } from './queries'

const db = openDatabase(resolve('resources/macro.db'), { readOnly: true })
afterAll(() => db.close())
const indicator = (id: string) => INDICATORS.find((i) => i.id === id)!
const allSeries = new Map(INDICATORS.map((i) => [i.id, getSeries(db, i.id)]))
// 查询的同期间修订为降序；反向填充映射时最高修订最后写入。
const values = new Map([...allSeries].map(([id, rows]) => [id, new Map([...rows].reverse().map((r) => [r.period, r.value]))]))
const series = (id: string) => allSeries.get(id)!
const value = (id: string, period: string) => values.get(id)?.get(period)

describe('P0/P1/P2 内置示例产物', () => {
  it('三个层级、九个主题、四种频率都有数据，标识不重复', () => {
    expect(new Set(INDICATORS.map((i) => i.id)).size).toBe(INDICATORS.length)
    expect(new Set(INDICATORS.map((i) => i.tier ?? 'P0'))).toEqual(new Set(['P0', 'P1', 'P2']))
    expect(new Set(INDICATORS.map((i) => i.category)).size).toBe(9)
    expect(new Set(INDICATORS.map((i) => i.frequency))).toEqual(new Set(['day', 'month', 'quarter', 'year']))
    expect(getMeta(db, 'mock_catalog_version')).toBe('2')
    for (const i of INDICATORS) {
      expect(i.note, i.id).toBeTruthy()
      expect(getSeries(db, i.id).some((r) => r.value !== null), i.id).toBe(true)
    }
  })
  it('大陆 31 个省级地区完整覆盖，省级 GDP 为累计而非当季口径', () => {
    const regions = INDICATORS.filter((i) => i.id.startsWith('cn.region.'))
    expect(regions).toHaveLength(31)
    expect(new Set(regions.map((i) => i.region)).size).toBe(31)
    for (const i of regions) {
      expect(i.tier).toBe('P2')
      expect(i.frequency).toBe('quarter')
      expect(i.valueType).toBe('cumulative_yoy')
      expect(series(i.id)).toHaveLength(20)
    }
  })
  it('国别/地区示例同时提供进出口，年度社会指标只有已结束的年份', () => {
    for (const partner of ['us', 'eu', 'asean', 'jp', 'kr']) {
      for (const flow of ['import', 'export']) {
        expect(series(`cn.trade.${partner}_${flow}`)).toHaveLength(60)
        expect(indicator(`cn.trade.${partner}_${flow}`).unit).toBe('亿美元')
      }
    }
    for (const id of ['cn.population.total', 'cn.population.urbanization', 'cn.income.gini']) {
      expect(series(id).map((r) => r.period)).toEqual(['2021', '2022', '2023', '2024', '2025'])
    }
    expect(series('cn.income.gini').every((r) => r.value! >= 0 && r.value! <= 1)).toBe(true)
  })
  it('财政、投资及合并发布的分项不制造 1 月单月观测', () => {
    for (const id of ['cn.fiscal.revenue_cum_yoy', 'cn.fiscal.fund_revenue_cum_yoy', 'cn.fiscal.land_revenue_cum_yoy', 'cn.fai.mfg_cum_yoy', 'cn.retail.auto_yoy']) {
      const rows = series(id)
      expect(rows.some((r) => r.period.endsWith('-01'))).toBe(false)
      expect(rows.filter((r) => r.period.endsWith('-02')).every((r) => r.status === 'merged')).toBe(true)
      expect(rows).toHaveLength(55)
    }
    expect(series('cn.trade.export_yoy').some((r) => r.period.endsWith('-01'))).toBe(true)
  })
  it('日度汇率与利率在工作周排列，保留高精度及缺失样本', () => {
    const fx = series('cn.fx_rate.usd_cny')
    expect(fx.length).toBeGreaterThan(1200)
    expect(fx[0].period).toBe('2021-09-01')
    expect(fx.at(-1)?.period).toBe('2026-08-31')
    expect(fx.some((r) => Number(r.value!.toFixed(2)) !== r.value)).toBe(true)
    expect(fx.every((r) => ![0, 6].includes(new Date(`${r.period}T00:00:00Z`).getUTCDay()))).toBe(true)
    expect(value('us.bond.gov_10y', '2024-07-04')).toBeNull()
  })
  it('中美利差按中国减美国、百分比转基点计算，缺少任一输入不补值', () => {
    expect(indicator('cn.bond.cn_us_spread').isDerived).toBe(true)
    for (const row of series('cn.bond.cn_us_spread')) {
      const cn = value('cn.bond.gov_10y', row.period)!
      const us = value('us.bond.gov_10y', row.period)
      if (us === null) expect(row.value).toBeNull()
      else expect(row.value).toBeCloseTo((cn - us!) * 100, 1)
    }
  })
  it('GDP 平减指数使用名义与实际同比，克强指数使用三条同月输入', () => {
    for (const row of series('cn.gdp.deflator_yoy')) {
      const nominal = value('cn.gdp.nominal_yoy', row.period)!
      const real = value('cn.gdp.yoy', row.period)!
      expect(row.value).toBeCloseTo(((1 + nominal / 100) / (1 + real / 100) - 1) * 100, 0)
    }
    expect(indicator('cn.keqiang.growth').note).toContain('0.40')
    for (const row of series('cn.keqiang.growth')) {
      const inputs = ['cn.power.consumption_yoy', 'cn.rail.freight_yoy', 'cn.loan.medium_long_yoy'].map((id) => value(id, row.period))
      if (inputs.some((input) => input === null)) expect(row.value).toBeNull()
      else expect(row.value).toBeCloseTo(0.4 * inputs[0]! + 0.25 * inputs[1]! + 0.35 * inputs[2]!, 0)
    }
    expect(value('cn.keqiang.growth', '2024-04')).toBeNull()
    expect(value('cn.keqiang.growth', '2024-05')).not.toBeNull()
  })
  it('latestPeriod 按真实期末排序，不让季度字符串覆盖更新的月/日数据', () => {
    expect(counts(db).latestPeriod).toBe('2026-08-31')
  })
  it('国际收支分项与总账户一致，净误差与遗漏遵守金融账户符号方向', () => {
    const sum = (ids: string[], period: string) => ids.reduce((total, id) => total + value(id, period)!, 0)
    for (const row of series('cn.bop.current')) {
      expect(row.value).toBeCloseTo(sum(['cn.bop.goods', 'cn.bop.services', 'cn.bop.primary_income', 'cn.bop.secondary_income'], row.period), 1)
      const financial = value('cn.bop.financial', row.period)!
      expect(financial).toBeCloseTo(sum(['cn.bop.direct_investment', 'cn.bop.portfolio_investment', 'cn.bop.other_financial', 'cn.bop.reserve_assets'], row.period), 1)
      expect(row.value! + value('cn.bop.capital', row.period)! - financial + value('cn.bop.errors', row.period)!).toBeCloseTo(0, 1)
    }
  })
})
