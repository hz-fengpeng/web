/**
 * 折线图宿主组件：管 ECharts 实例的生命周期，本身不含任何图形逻辑。
 * 图形逻辑全在 `lineOption.ts` 里，那份是纯函数、有测试。
 */
import { useEffect, useMemo, useRef, type JSX } from 'react'
import { init, use, type EChartsType } from 'echarts/core'
import { LineChart as LineChartSeries } from 'echarts/charts'
import { GridComponent, TooltipComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import type { Indicator, Observation } from '@shared/types'
import { buildLineOption } from './lineOption'
import { useChartTokens } from './theme'

// 按需注册（§10.4）：只带折线图 + 网格 + tooltip + canvas 渲染器。
// 换成 `import * as echarts from 'echarts'` 全量引入会多带上百 KB。
// TooltipComponent 内部已经 use 了 axisPointer，十字准星不需要额外注册
// （node_modules/echarts/lib/component/tooltip/install.js）。
use([LineChartSeries, GridComponent, TooltipComponent, CanvasRenderer])

export function LineChart({
  indicator,
  rows,
}: {
  indicator: Indicator
  rows: Observation[]
}): JSX.Element {
  const hostRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<EChartsType | null>(null)
  const tokens = useChartTokens()
  const option = useMemo(
    () => buildLineOption(indicator, rows, tokens),
    [indicator, rows, tokens],
  )

  // 建实例的 effect 不能依赖 option：否则每换一个指标就销毁重建整个实例，
  // 动画和 tooltip 状态全丢。所以用 ref 把最新 option 带进去，让实例一建好
  // 就带上它，中间不会闪一帧空图。
  const latestOption = useRef(option)
  latestOption.current = option

  useEffect(() => {
    const el = hostRef.current
    if (!el) return
    const chart = init(el)
    chartRef.current = chart
    chart.setOption(latestOption.current, true)

    // 窗口变宽变窄、侧栏折叠都要跟着重画；不监听的话图会停在初始尺寸
    const ro = new ResizeObserver(() => chart.resize())
    ro.observe(el)

    return () => {
      ro.disconnect()
      // ★ 必须销毁。§12 风险登记册第 11 条点名的就是 ECharts 实例泄漏；
      //   StrictMode 下 dev 会 mount→unmount→mount，漏掉这行会直接撞上
      //   「There is a chart instance already initialized on the dom」。
      chart.dispose()
      chartRef.current = null
    }
  }, [])

  // notMerge 不能省：从 60 个点的指标切到 20 个点的，合并模式会留下 40 个陈旧点
  useEffect(() => {
    chartRef.current?.setOption(option, true)
  }, [option])

  // 容器必须有确定高度，否则 ECharts 安静地渲染成 0×0。
  // canvas 对屏幕阅读器是不存在的，所以给它一个 role + 文字描述；
  // 真正能读的通道是「数据表」视图（§6.5）。
  return (
    <div
      ref={hostRef}
      role="img"
      aria-label={`${indicator.nameZh}折线图，共 ${rows.length} 个期间，最新 ${rows.at(-1)?.period ?? '无'}`}
      className="h-[320px] w-full"
    />
  )
}
