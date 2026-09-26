/**
 * 折线图 option 的结构测试（§10.3：「不测像素，测生成的 ECharts option 结构」）。
 *
 * 跑在 node 环境，不需要 jsdom：`buildLineOption` 是纯函数，色值由参数注入。
 * 这里**不 import 任何 echarts 运行时**，只 import type。
 *
 * 色值一律用哨兵值（`#010203` 这种），不用真实色号。这样「option 里的颜色
 * 是否真的来自传入的 tokens」才是可证的——用真实色号的话，把附录 C 的色值
 * 抄回 TS 里也照样绿。
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { LineSeriesOption } from 'echarts/charts'
import type { TooltipComponentOption } from 'echarts/components'
import { isoDateMs, periodEnd } from '@shared/period'
import type { Indicator, Observation } from '@shared/types'
import { buildLineOption, formatAxisTime, type LineChartOption } from './lineOption'
import type { ChartTokens } from './theme'

// tsconfig.web.json 是 `"types": []`——故意不让 Node 全局泄进渲染进程，这个
// 边界不该为了一条测试放宽。这条测试跑在 node 环境，只需要 process.env.TZ
// 这一小块，就地声明。
declare const process: { env: Record<string, string | undefined> }

const T: ChartTokens = {
  surface: '#010203',
  textPri: '#040506',
  textSec: '#070809',
  muted: '#0a0b0c',
  grid: '#0d0e0f',
  axis: '#101112',
  accent: '#131415',
  sans: 'SentinelSans',
}

function obs(
  period: string,
  value: number | null,
  status: Observation['status'] = 'ok',
): Observation {
  return {
    indicatorId: 'test',
    period,
    periodEnd: periodEnd(period),
    value,
    status,
    releasedAt: '2026-03-16',
    revision: 1,
  }
}

function ind(over: Partial<Indicator> = {}): Indicator {
  return {
    id: 'test',
    nameZh: '测试指标',
    nameShort: '测试',
    category: 'growth',
    unit: '%',
    frequency: 'month',
    valueType: 'yoy',
    seasonalAdj: false,
    decimals: 2,
    isHeadline: false,
    note: null,
    ...over,
  }
}

/** series 在 ComposeOption 里是联合类型，测试里取第一条并窄化 */
function seriesOf(o: LineChartOption): LineSeriesOption {
  return (Array.isArray(o.series) ? o.series[0] : o.series) as LineSeriesOption
}

type Point = { value: [number, number | null]; symbol?: string; symbolSize?: number }

const dataOf = (o: LineChartOption): Point[] => seriesOf(o).data as unknown as Point[]

/** tooltip 同样是 Arrayable，测试里取第一个 */
function tooltipOf(o: LineChartOption): TooltipComponentOption {
  return (Array.isArray(o.tooltip) ? o.tooltip[0] : o.tooltip) as TooltipComponentOption
}

const tooltipHtml = (o: LineChartOption, dataIndex: number): string =>
  (tooltipOf(o).formatter as (p: unknown) => string)([{ dataIndex }])

describe('buildLineOption · x 轴按真实时间定位', () => {
  it('★ 缺月的时间差是真实的，不是「相邻两点」——类目轴会让这条失败', () => {
    // 1—2 月合并发布的指标没有 2026-01 那一行。类目轴会把 12 月和 2 月
    // 画成相邻刻度，中间那个月被静默抹平；时间轴按 periodEnd 定位，缺口
    // 在几何上是真实的宽度。这条断言就是 D3 的哨兵。
    const rows = [obs('2025-12', 5), obs('2026-02', 6)]
    const data = dataOf(buildLineOption(ind(), rows, T))

    // 硬编码的真相：2025-12-31 → 2026-02-28 是 59 天，约等于常规月距的两倍
    expect(data[1].value[0] - data[0].value[0]).toBe(59 * 86400e3)
    // 再与 period 派生出来的时间戳对照，两处对得上才算数
    expect(data[0].value[0]).toBe(isoDateMs(periodEnd('2025-12')))
    expect(data[1].value[0]).toBe(isoDateMs(periodEnd('2026-02')))
  })

  it('x 轴是 time 类型，且刻度按 UTC 摆放', () => {
    const o = buildLineOption(ind(), [obs('2026-01', 1)], T)
    const x = (Array.isArray(o.xAxis) ? o.xAxis[0] : o.xAxis) as { type?: string }
    expect(x.type).toBe('time')

    // ★ ECharts 默认按本地时间摆刻度（useUTC 默认 false）。数据点是按 UTC
    //   定位的，不打开这个开关，刻度位置与标签会跟数据点差一个时区。
    expect(o.useUTC).toBe(true)
  })

  it('刻度有最小间隔，短序列不会印出一串重复的月份标签', () => {
    const xOf = (o: LineChartOption): { minInterval?: number } =>
      (Array.isArray(o.xAxis) ? o.xAxis[0] : o.xAxis) as { minInterval?: number }

    // 月频的下限必须 ≥ 一个月的长度，否则同一列会出现两个 2026-08
    expect(xOf(buildLineOption(ind(), [obs('2026-01', 1)], T)).minInterval).toBeGreaterThanOrEqual(
      28 * 86400e3,
    )
    expect(
      xOf(buildLineOption(ind({ frequency: 'quarter' }), [obs('2026Q1', 1)], T)).minInterval,
    ).toBeGreaterThanOrEqual(89 * 86400e3)
  })
})

describe('buildLineOption · 缺失期', () => {
  it('★ null 原样保留在 data 里，不被过滤——过滤掉就等于把缺口补平了', () => {
    const rows = [obs('2026-01', 1), obs('2026-02', null, 'missing'), obs('2026-03', 3)]
    const o = buildLineOption(ind(), rows, T)
    const data = dataOf(o)

    expect(data).toHaveLength(3) // 缺失那一项还在
    expect(data[1].value[0]).toBe(isoDateMs(periodEnd('2026-02'))) // 位置也在
    expect(data[1].value[1]).toBeNull() // 值就是空的，不是 0、不是前值填充
    expect(seriesOf(o).connectNulls).toBe(false) // 且不跨过它连线
  })
})

describe('buildLineOption · 口径诚实', () => {
  it('merged 期用菱形标记，其余用默认圆点', () => {
    const rows = [obs('2026-02', 5, 'merged'), obs('2026-03', 6)]
    const data = dataOf(buildLineOption(ind(), rows, T))

    expect(data[0].symbol).toBe('diamond')
    expect(data[1].symbol).toBeUndefined() // 圆点走 series 默认，不逐点覆盖
  })

  it('tooltip 里带期间、数值、单位、状态中文——它是表格之外唯一的明细出口', () => {
    const html = tooltipHtml(
      buildLineOption(ind({ unit: '%' }), [obs('2026-02', 5.2, 'merged')], T),
      0,
    )

    expect(html).toContain('2026-02')
    expect(html).toContain('5.20')
    expect(html).toContain('%')
    expect(html).toContain('1—2月合并')
    expect(html).toContain('2026-03-16') // 发布日
  })

  it('tooltip 对越界的 dataIndex 返回空串而不是抛错', () => {
    const o = buildLineOption(ind(), [obs('2026-01', 1)], T)
    expect(tooltipHtml(o, 99)).toBe('')
  })
})

describe('buildLineOption · marks 规范（§6.4 / §6.5）', () => {
  const o = buildLineOption(ind(), [obs('2026-01', 1)], T)

  it('★ 单序列不设图例框；垂直网格线关掉，但水平网格必须还在', () => {
    expect(o.legend).toBeUndefined()

    const x = (Array.isArray(o.xAxis) ? o.xAxis[0] : o.xAxis) as {
      splitLine?: { show?: boolean }
    }
    const y = (Array.isArray(o.yAxis) ? o.yAxis[0] : o.yAxis) as {
      splitLine?: { lineStyle?: { color?: string } }
    }

    expect(x.splitLine?.show).toBe(false)
    // 成对断言：只查 x 的话，把水平网格也一起关掉照样绿
    expect(y.splitLine?.lineStyle?.color).toBe(T.grid)
  })

  it('★ grid 走 ECharts 6 的 outerBounds，不走已弃用的 containLabel', () => {
    const g = (Array.isArray(o.grid) ? o.grid[0] : o.grid) as {
      containLabel?: boolean
      outerBoundsMode?: string
      outerBoundsContain?: string
    }
    // containLabel 在 ECharts 6 的 .d.ts 里标着 @deprecated，且每次首渲染都会
    // 往控制台打一条「use grid.outerBounds instead」——那条走 log 级别，被主
    // 进程的转发器过滤掉，终端里看不见。看不见不等于没发生。
    expect(g.containLabel).toBeUndefined()
    // 官方文档给出的等价关系：containLabel:true ≡
    // { outerBoundsMode: 'same', outerBoundsContain: 'axisLabel' }
    expect(g.outerBoundsMode).toBe('same')
    expect(g.outerBoundsContain).toBe('axisLabel')
  })

  it('crosshair + tooltip 是默认不是可选（§6.5）', () => {
    const tip = tooltipOf(o)
    expect(tip.trigger).toBe('axis')
    expect(tip.axisPointer).toMatchObject({ type: 'cross' })
  })

  it('线宽 2px、标记 ≥8px、带表面色描边环', () => {
    const s = seriesOf(o)
    expect(s.lineStyle).toMatchObject({ width: 2, color: T.accent })
    expect(s.symbolSize).toBeGreaterThanOrEqual(8)
    expect(s.itemStyle).toMatchObject({ borderColor: T.surface, borderWidth: 2 })
  })
})

describe('buildLineOption · 色值只能来自 tokens', () => {
  it('★ option 里出现的每一个色值都在传入的 tokens 里——哨兵值让这条可证', () => {
    const o = buildLineOption(
      ind(),
      [obs('2026-01', 1), obs('2026-02', 2, 'merged')],
      T,
    )
    const hexes = JSON.stringify(o).match(/#[0-9a-fA-F]{6}/g) ?? []

    // 前提：option 里确实带了色值。否则下面的过滤是空集，测试假通过
    expect(hexes.length).toBeGreaterThan(0)

    const allowed = new Set(Object.values(T).filter((v) => v.startsWith('#')))
    expect(hexes.filter((h) => !allowed.has(h))).toEqual([])
  })
})

describe('buildLineOption · 边界', () => {
  it('空序列不抛错，仍然返回骨架', () => {
    const o = buildLineOption(ind(), [], T)
    expect(dataOf(o)).toEqual([])
    expect(o.xAxis).toBeDefined()
    expect(o.yAxis).toBeDefined()
    expect(seriesOf(o).type).toBe('line')
  })

  it('入参顺序打乱也按时间升序输出', () => {
    const data = dataOf(
      buildLineOption(ind(), [obs('2026-03', 3), obs('2026-01', 1), obs('2026-02', 2)], T),
    )
    expect(data.map((p) => p.value[1])).toEqual([1, 2, 3])
  })
})

describe('formatAxisTime · 标签格式', () => {
  const ms = Date.parse('2026-06-30')

  it('按频率给出期间形态的标签', () => {
    expect(formatAxisTime(ms, 'month')).toBe('2026-06')
    expect(formatAxisTime(ms, 'quarter')).toBe('2026Q2')
    expect(formatAxisTime(ms, 'year')).toBe('2026')
  })

  it('季度边界月份映射正确', () => {
    expect(formatAxisTime(Date.parse('2026-03-31'), 'quarter')).toBe('2026Q1')
    expect(formatAxisTime(Date.parse('2026-09-30'), 'quarter')).toBe('2026Q3')
    expect(formatAxisTime(Date.parse('2026-12-31'), 'quarter')).toBe('2026Q4')
  })

  // ★ 这条必须跑在负时区下才有效。UTC 与本地读法只在「月初」时间戳上分歧：
  //   数据点都是月末（2026-08-31 退一天还是 8 月），所以真正会印错的是
  //   ECharts 自己挑的刻度位置——它常落在 1 号。
  describe('负时区下', () => {
    const original = process.env.TZ
    beforeAll(() => {
      process.env.TZ = 'America/New_York'
    })
    afterAll(() => {
      process.env.TZ = original
    })

    it('★ 用 UTC 读时间戳——否则 1 月 1 日的刻度会印成上一年 12 月', () => {
      const jan1 = Date.parse('2026-01-01')
      // 先确认这台机器的时区确实生效了，否则这条断言是空转的
      expect(new Date(jan1).getFullYear()).toBe(2025)

      expect(formatAxisTime(jan1, 'month')).toBe('2026-01')
      expect(formatAxisTime(jan1, 'year')).toBe('2026')
      expect(formatAxisTime(jan1, 'quarter')).toBe('2026Q1')
    })
  })
})
