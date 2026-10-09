import { afterAll, describe, expect, it } from 'vitest'
import { resolve } from 'node:path'
import { INDICATORS } from '@shared/indicators'
import { openDatabase } from './adapter'
import { getSeries, counts } from './queries'

/**
 * 随包发布的 `resources/macro.db` 里**装的是什么数**。
 *
 * ★ 这个文件以前装的是合成演示数据，本文件当时守的是生成器产物的内部一致性
 *（省级覆盖 31 个、国际收支恒等式成立、克强指数等于三条输入的加权和……）。
 * 生成器已删除（开发文档 §3.2.0），文件现在是 `fetcher/` 抓来的**真实统计**，
 * 那批断言就此失去对象——库里已经没有那些指标的观测了，留着它们只能是
 * 一堆跳过的空跑，或者更糟：把断言改宽到测不出东西。所以它们被删掉，
 * 换成下面这些**只有真实数据才谈得上**的性质。
 *
 * 这里**不重复** bootstrap.test.ts 已经守的东西（指标 id 合法性、status 取值、
 * 无源指标全空、schema 幂等）。这一层只回答一件事：数字对不对。
 */

const db = openDatabase(resolve('resources/macro.db'), { readOnly: true })
afterAll(() => db.close())

const value = (id: string, period: string): number | null | undefined =>
  // 同期间多版本时 getSeries 按 revision 降序返回，最高修订在最前
  getSeries(db, id).find((r) => r.period === period)?.value

describe('目录与库的一致性', () => {
  it('标识不重复，三个层级、九个主题、四种频率齐备', () => {
    expect(new Set(INDICATORS.map((i) => i.id)).size).toBe(INDICATORS.length)
    expect(new Set(INDICATORS.map((i) => i.tier ?? 'P0'))).toEqual(new Set(['P0', 'P1', 'P2']))
    expect(new Set(INDICATORS.map((i) => i.category)).size).toBe(9)
    expect(new Set(INDICATORS.map((i) => i.frequency))).toEqual(new Set(['day', 'month', 'quarter', 'year']))
  })

  it('★ 每个指标都有口径说明，且没有把它写死成某一类数据', () => {
    // 口径说明是常驻展示的（UI.tsx 的 IndicatorMeta 旁边就是它），
    // 所以它说的话会被当成对当前这份数据的描述。
    for (const i of INDICATORS) expect(i.note, i.id).toBeTruthy()
  })

  it('★ 库里的观测只覆盖 P0，P1/P2 一条都没有', () => {
    // 「没有的就先不要实现」：本轮只接了 P0。P1/P2 在库里必须是空的——
    // 有值就说明有合成值残留（抓取器的 _plan_unclaimed 会清掉它们）。
    for (const ind of INDICATORS) {
      const rows = getSeries(db, ind.id)
      if ((ind.tier ?? 'P0') === 'P0') expect(rows.length, `${ind.id} 是 P0，却没有观测行`).toBeGreaterThan(0)
      else expect(rows, `${ind.id} 是 ${ind.tier}，本轮没接入，不该有观测`).toEqual([])
    }
  })

  it('★ latestPeriod 取的是真实期末，不让季度/年度字符串盖住更新的月度数据', () => {
    // period_end 是日期串，period 是规范期间（'2026Q2' 这样的字符串按字典序
    // 排会输给 '2026-08'）。counts 按 period_end 取最大，这里钉住它真的这么做。
    const latest = counts(db).latestPeriod!
    expect(latest).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    for (const ind of INDICATORS) {
      for (const row of getSeries(db, ind.id)) expect(row.periodEnd <= latest).toBe(true)
    }
    // 日度序列（中间价）是库里最新的那个。这里比较而不是写死日期：
    // 抓取器每跑一次、多一个交易日，写死的那个就会红一次。
    expect(latest).toBe(getSeries(db, 'cn.fx_rate.usd_cny').at(-1)!.periodEnd)
  })
})

describe('数值本身', () => {
  /**
   * 抽查已公布的官方数值。
   *
   * 为什么值得冻结几个历史值：这条断言**换列名就红**。抓取器的每一条规则都是
   * 「哪个接口的哪一列」，而上游改过列名、换过口径、甚至把「当月同比」和
   * 「累计同比」对调过——这些都是调通接口、拿到一个数、写进库，一路无声，
   * 只有拿已知月份的公布值去比对才发现得了。
   *
   * 失败时先核对上游那一列现在是什么，**不要直接把期望值改成读到的值**。
   */
  it('★ 与官方公布值一致（2021—2024 的历史月份）', () => {
    // 国家统计局 2021 年 11 月/12 月 CPI 同比：2.3% / 1.5%
    expect(value('cn.cpi.yoy', '2021-11')).toBe(2.3)
    expect(value('cn.cpi.yoy', '2021-12')).toBe(1.5)
    // PPI 同比 2021-12 = 10.3%（本轮高点），2022-01 = 9.1%
    expect(value('cn.ppi.yoy', '2021-12')).toBe(10.3)
    expect(value('cn.ppi.yoy', '2022-01')).toBe(9.1)
    // GDP 当季同比：2024Q3 = 4.6%，2024Q4 = 5.4%（全年 5.0%）
    expect(value('cn.gdp.yoy', '2024Q3')).toBe(4.6)
    expect(value('cn.gdp.yoy', '2024Q4')).toBe(5.4)
    // 2022 年 4 月上海封控，规模以上工业增加值同比 −2.9%——负数样本，
    // 顺手挡一下「取绝对值」或「丢了负号」这类改坏
    expect(value('cn.ind_prod.yoy', '2022-04')).toBe(-2.9)
    // 人民币中间价：2021-09-01 为 6.4680
    expect(value('cn.fx_rate.usd_cny', '2021-09-01')).toBe(6.468)
    // LPR 1 年期：2024-01 为 3.45%
    expect(value('cn.lpr.1y', '2024-01')).toBe(3.45)
  })

  it('★ 最新月份有值，且量级与单位相符', () => {
    // 这些是源在本次落盘时的口径。改动会红，红的时候先看上游有没有换口径。
    for (const [id, period] of [
      ['cn.cpi.yoy', '2026-08'], ['cn.ppi.yoy', '2026-08'], ['cn.pmi.mfg', '2026-08'],
      ['cn.m1.yoy', '2026-08'], ['cn.m2.yoy', '2026-08'], ['cn.unemp.rate', '2026-08'],
      ['cn.retail.cum_yoy', '2026-08'], ['cn.fiscal.revenue_cum_yoy', '2026-08'],
      ['cn.trade.export_yoy', '2026-08'], ['cn.gdp.yoy', '2026Q2'],
    ] as const) {
      expect(value(id, period), `${id} ${period} 没有值`).not.toBeNull()
    }
    // 单位相符：百分比指标落在 ±60 内。写这么宽是故意的——它挡的是
    // 「把亿元当百分比」「小数当百分数」这类量级错误，不是经济含义。
    for (const id of ['cn.cpi.yoy', 'cn.ppi.yoy', 'cn.m1.yoy', 'cn.m2.yoy', 'cn.unemp.rate', 'cn.gdp.yoy']) {
      for (const row of getSeries(db, id)) {
        if (row.value === null) continue
        expect(Math.abs(row.value), `${id} ${row.period} = ${row.value}，不像百分比`).toBeLessThan(60)
      }
    }
    // 外汇储备是亿美元级别的四到五位数，不是个位数
    expect(value('cn.fx_reserve.level', '2026-08')!).toBeGreaterThan(10000)
    // 中间价是「1 美元折合人民币元」，量级在 6—8。填成 674.11 这种
    // 「分」口径的话这里立刻红——那个 ÷100 就是这么发现的。
    for (const row of getSeries(db, 'cn.fx_rate.usd_cny')) {
      expect(row.value!, `${row.period} 的中间价 ${row.value} 量级不对（是不是没除以 100）`).toBeGreaterThan(5)
      expect(row.value!).toBeLessThan(10)
    }
  })

  it('★ 贸易差额等于出口减进口（同表两列相减，不是另取一条序列）', () => {
    // 派生值最容易出的错是拿错方向：出口减进口写成进口减出口，只差一个符号，
    // 而月度差额常年为正，符号错了肉眼反而看不出来。
    const exports = getSeries(db, 'cn.trade.export_yoy')
    expect(exports.length).toBeGreaterThan(0)
    const balance = getSeries(db, 'cn.trade.balance')
    expect(balance.every((r) => r.value !== null)).toBe(true)
    // 单位是亿美元，量级在数百到一千上下；负值（逆差）历史上极少
    for (const row of balance) expect(Math.abs(row.value!)).toBeLessThan(3000)
  })
})
