import { useMemo, type JSX, type Ref } from 'react'
import type { Indicator, Observation } from '@shared/types'
import { buildLineOption } from './lineOption'
import { useChartTokens } from './theme'
import { ChartCanvas, type ChartHandle } from './ChartCanvas'

export function LineChart({ indicator, rows, height, ref }: {
  indicator: Indicator; rows: Observation[]; height?: number; ref?: Ref<ChartHandle>
}): JSX.Element {
  const tokens = useChartTokens()
  const option = useMemo(() => {
    const result = buildLineOption(indicator, rows, tokens)
    if (indicator.category === 'sentiment' && indicator.valueType === 'index' && Array.isArray(result.series)) {
      result.series[0].markLine = {
        silent: true, symbol: 'none',
        lineStyle: { color: tokens.textSec, type: 'dashed' },
        label: { position: 'insideEndTop', formatter: '荣枯线 50', color: tokens.textSec },
        data: [{ yAxis: 50 }],
      }
    }
    return result
  }, [indicator, rows, tokens])
  return <ChartCanvas ref={ref} option={option} height={height}
    label={`${indicator.nameZh}折线图，共 ${rows.length} 个期间，最新 ${rows.at(-1)?.period ?? '无'}`} />
}
