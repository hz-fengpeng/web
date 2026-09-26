/**
 * 折线图的 ECharts option 构造。
 *
 * ★ 这里全部是纯函数：色值由参数注入，不碰 `document`，不调 `echarts.use()`。
 *   好处是它能在现有的 node 环境 vitest 里直接测（§10.3：「图表 | 快照测试
 *   option 对象 | 不测像素，测生成的 ECharts option 结构」），不需要引入 jsdom。
 *   所有 `echarts` 的 import 都是 `import type`，编译后整个消失。
 */
import type { ComposeOption } from 'echarts/core'
import type { LineSeriesOption } from 'echarts/charts'
import type { GridComponentOption, TooltipComponentOption } from 'echarts/components'
import { isoDateMs } from '@shared/period'
import type { Frequency, Indicator, Observation } from '@shared/types'
import { STATUS_ZH, formatValue } from '../lib/format'
import type { ChartTokens } from './theme'

/**
 * 时间轴刻度的最小间隔。不给下限的话，短序列上 ECharts 会挑出日级刻度，
 * 于是同一列印出一串一模一样的 `2026-08`。
 */
const MIN_INTERVAL_MS: Record<Frequency, number> = {
  day: 20 * 3600e3,
  month: 28 * 86400e3,
  quarter: 89 * 86400e3,
  year: 364 * 86400e3,
}

export type LineChartOption = ComposeOption<
  LineSeriesOption | GridComponentOption | TooltipComponentOption
>

/** 一个数据点：`[期间末日的毫秒时间戳, 数值]`，数值为 null 表示该期缺失 */
type TimeValuePoint = { value: [number, number | null]; symbol?: string; symbolSize?: number }

/**
 * 时间轴标签。收的是时间戳，收不到期间字符串——ECharts 自己挑刻度位置，
 * 落点未必正好是数据点，所以不能靠查表，只能从时间戳反推。
 *
 * ★ 一律用 UTC getter。`periodEnd` 形如 `'2026-08-31'`，`Date.parse` 按 UTC
 *   解析；本地时区读法在东八区恰好也对，但在西半球会退一天，于是月末边界上
 *   印出上一个月的标签。
 */
export function formatAxisTime(ms: number, frequency: Frequency): string {
  const d = new Date(ms)
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  switch (frequency) {
    case 'year':
      return String(y)
    case 'quarter':
      return `${y}Q${Math.floor(d.getUTCMonth() / 3) + 1}`
    case 'day':
      // 目前没有日频指标。真加了日频指标时，跨年的 MM-DD 会歧义，需要另做。
      return `${m}-${String(d.getUTCDate()).padStart(2, '0')}`
    default:
      return `${y}-${m}`
  }
}

const ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }

/** tooltip 是塞进 DOM 的 HTML 串；期间/发布日来自库文件，用户可以用 sqlite3 改它 */
const esc = (s: string): string => s.replace(/[&<>"]/g, (c) => ESCAPES[c] ?? c)

/**
 * 构造折线图 option。
 *
 * 几条不显然但重要的约定：
 * - **x 轴是 `type: 'time'`，不是 `category`。** 1—2 月合并发布的指标没有
 *   1 月那一行；类目轴会把 12 月和 2 月画成相邻刻度，静默抹平中间那个月的
 *   缺口。时间轴按 `periodEnd` 定位，缺口有真实的几何宽度。
 * - **`data` 里的 null 原样保留**，绝不过滤。过滤掉就等于把缺失期补平了，
 *   是同一个 bug 的另一副面孔。
 * - **不设 `legend`。** 单序列不要图例框，标题已经说明了它是什么（§6.4）。
 * - **没有垂直网格线**（`xAxis.splitLine.show: false`），只留水平网格（§6.4）。
 */
export function buildLineOption(
  indicator: Indicator,
  rows: Observation[],
  tokens: ChartTokens,
): LineChartOption {
  // 防御性排序：查询层已经按 period_end ASC 返回，但纯函数的契约应当自洽，
  // 不依赖调用方。顺序错了线会来回折。
  const points = [...rows].sort((a, b) => isoDateMs(a.periodEnd) - isoDateMs(b.periodEnd))
  const decimals = indicator.decimals

  const data: TimeValuePoint[] = points.map((r) => {
    const point: TimeValuePoint = { value: [isoDateMs(r.periodEnd), r.value] }
    // merged 改变的是「这个数字是什么」——两个月的合计/平均，不是单月值。
    // 读者扫一眼线会把它当单月值，所以必须在图上就地标出来。
    if (r.status === 'merged') {
      point.symbol = 'diamond' // 菱形，与其余点的圆点区分（形状通道，不靠颜色）
      point.symbolSize = 11 // 同尺寸下菱形视觉上比圆小，补一点
    }
    return point
  })

  const timeLabel = (ms: number): string => formatAxisTime(ms, indicator.frequency)

  return {
    animationDuration: 300,
    textStyle: { fontFamily: tokens.sans },

    // ★ ECharts 默认按**本地**时间摆放和格式化时间轴刻度（TimeScale 读
    //   ecModel 的 useUTC，默认 false，见 model/globalDefault.js）。数据点却
    //   是按 UTC 定位的——两边差一个时区，刻度位置和标签就会错开。必须显式打开。
    useUTC: true,

    // 单序列不设 legend（§6.4）

    tooltip: {
      trigger: 'axis', // ★ §6.5：折线图的十字准星 + tooltip 是默认，不是可选
      confine: true, // 免得贴着容器边缘时被裁掉
      backgroundColor: tokens.surface,
      borderColor: tokens.grid,
      borderWidth: 1,
      padding: [8, 10],
      textStyle: { color: tokens.textPri, fontSize: 12 },
      axisPointer: {
        type: 'cross',
        lineStyle: { color: tokens.axis, width: 1, type: 'dashed' },
        crossStyle: { color: tokens.axis, width: 1, type: 'dashed' },
        label: {
          backgroundColor: tokens.textSec,
          color: tokens.surface,
          fontSize: 11,
          // 不给 formatter 的话，x 方向会印出原始时间戳
          formatter: (p: { axisDimension?: string; value?: unknown }): string =>
            p.axisDimension === 'y'
              ? formatValue(Number(p.value), decimals)
              : timeLabel(Number(p.value)),
        },
      },
      // 表格之外唯一的明细出口，口径信息不能丢在这里
      formatter: (params: unknown): string => {
        const first = (Array.isArray(params) ? params[0] : params) as
          | { dataIndex?: number }
          | undefined
        const row = first?.dataIndex === undefined ? undefined : points[first.dataIndex]
        if (!row) return ''
        const line = (text: string, color: string): string =>
          `<div style="color:${color};font-size:11px;line-height:1.6">${text}</div>`
        return [
          `<div style="color:${tokens.textPri};font-size:12px;font-weight:500">${esc(row.period)}</div>`,
          `<div style="color:${tokens.textPri};font-size:13px">${formatValue(row.value, decimals)} ${esc(indicator.unit)}</div>`,
          line(`发布日 ${esc(row.releasedAt ?? '—')}`, tokens.muted),
          line(esc(STATUS_ZH[row.status] ?? row.status), tokens.muted),
        ].join('')
      },
    },

    // ★ 不写 `containLabel: true`——它在 ECharts 6 里已标 @deprecated，类型
    //   定义里承认这个做法「按样本标签估算，某些情况下并不能真正容纳全部
    //   标签」。官方给出的等价写法就是下面这两行，走的是更精确的路径，
    //   且不会往控制台打弃用警告（那个警告走的是 log 级别，会被主进程的
    //   转发器丢掉，在终端里看不见——但不该靠看不见来容忍它）。
    grid: {
      left: 0,
      right: 8,
      top: 12,
      bottom: 0,
      outerBoundsMode: 'same',
      outerBoundsContain: 'axisLabel',
    },

    xAxis: {
      type: 'time',
      // 右端留一点，免得最新那个数据点被容器边缘切掉一半
      boundaryGap: [0, '3%'],
      minInterval: MIN_INTERVAL_MS[indicator.frequency],
      axisLine: { lineStyle: { color: tokens.axis } }, // 只保留基线，不要边框盒子（§6.4）
      axisTick: { show: false },
      splitLine: { show: false }, // ★ 不要垂直网格线（§6.4）
      axisLabel: { color: tokens.muted, fontSize: 11, hideOverlap: true, formatter: timeLabel },
    },

    yAxis: {
      type: 'value',
      // 折线可以不从 0 起——它表达的是变化方向，不是长度比。
      // （「纵轴必须从 0 起」是柱状图的规矩，本项目没有柱状图）
      scale: true,
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { lineStyle: { color: tokens.grid, width: 1 } }, // 只留水平网格
      axisLabel: {
        color: tokens.muted,
        fontSize: 11,
        formatter: (v: number): string => formatValue(v, decimals),
      },
    },

    series: [
      {
        type: 'line',
        name: indicator.nameZh,
        data,
        // 缺失期断开，不要把两侧连起来
        connectNulls: false,
        showSymbol: true,
        symbol: 'circle',
        symbolSize: 8, // §6.4：标记直径 ≥ 8px
        lineStyle: { width: 2, color: tokens.accent }, // §6.4：线宽 2px
        itemStyle: {
          color: tokens.accent,
          borderColor: tokens.surface, // §6.4：2px 表面色描边环
          borderWidth: 2,
        },
      },
    ],
  }
}
