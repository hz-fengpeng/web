import type { Indicator, Observation } from '@shared/types'
import type { LineSeriesOption } from 'echarts/charts'
import type { GridComponentOption, TooltipComponentOption } from 'echarts/components'
import { buildLineOption, type LineChartOption } from './lineOption'
import type { ChartTokens } from './theme'
import { comparable } from '../lib/data'
import { formatValue, STATUS_ZH } from '../lib/format'

export const LINE_PATTERNS = ['solid', 'dashed', 'dotted'] as const
export const LINE_SYMBOLS = ['circle', 'rect', 'triangle'] as const

export function buildComparisonOption(items: Array<{ indicator: Indicator; rows: Observation[] }>, tokens: ChartTokens): LineChartOption {
  if (items.length === 0 || items.length > 3) throw new Error('请选择 1–3 个指标')
  if (items.some((item) => !comparable(items[0].indicator, item.indicator))) throw new Error('请选择相同口径、单位、频率和季调状态的指标')
  const options = items.map((item) => buildLineOption(item.indicator, item.rows, tokens))
  const result = options[0]
  const pointer = (result.tooltip as TooltipComponentOption).axisPointer
  result.animation = false
  result.grid = { ...result.grid as GridComponentOption, right: 100 }
  result.series = options.map((option, index) => {
    const line = (option.series as LineSeriesOption[])[0]
    return {
      ...line,
      symbol: LINE_SYMBOLS[index],
      lineStyle: { ...line.lineStyle, type: LINE_PATTERNS[index] },
      endLabel: { show: true, formatter: items[index].indicator.nameShort, color: tokens.textSec, fontSize: 10 },
      labelLayout: { moveOverlap: 'shiftY' },
    }
  })
  result.tooltip = {
    trigger: 'axis', renderMode: 'richText', confine: true,
    backgroundColor: tokens.surface, borderColor: tokens.grid,
    textStyle: { color: tokens.textPri, fontFamily: tokens.sans, fontSize: 12 },
    axisPointer: pointer,
    formatter: (params: unknown): string => {
      const values = (Array.isArray(params) ? params : [params]) as Array<{ seriesIndex: number; value: [number, number | null] }>
      // 时间轴可能返回附近的非同期点，逐行写明期间，避免虚构对齐。
      return values.map((value) => {
        const item = items[value.seriesIndex]
        const row = item?.rows.find((r) => Date.parse(`${r.periodEnd}T00:00:00Z`) === value.value[0])
        return row ? `${item.indicator.nameShort} · ${row.period}\n${formatValue(row.value, item.indicator.decimals)} ${item.indicator.unit} · ${STATUS_ZH[row.status]}` : ''
      }).filter(Boolean).join('\n\n')
    },
  }
  return result
}
