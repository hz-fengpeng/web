import { useEffect, useImperativeHandle, useRef, type JSX, type Ref } from 'react'
import { init, use, type EChartsType } from 'echarts/core'
import { LineChart as LineChartSeries } from 'echarts/charts'
import { GridComponent, TooltipComponent, MarkLineComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import type { LineChartOption } from './lineOption'
import { readTokens } from './theme'
import { DEMO_LABEL } from '../lib/data'

use([LineChartSeries, GridComponent, TooltipComponent, MarkLineComponent, CanvasRenderer])
export interface ChartHandle { png(title: string, notes: string[]): Promise<string> }

export function ChartCanvas({ option, label, height = 320, ref }: {
  option: LineChartOption; label: string; height?: number; ref?: Ref<ChartHandle>
}): JSX.Element {
  const hostRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<EChartsType | null>(null)
  const latestOption = useRef(option)
  latestOption.current = option

  useImperativeHandle(ref, () => ({
    async png(title, notes) {
      const chart = chartRef.current
      if (!chart) throw new Error('图表尚未就绪')
      const tokens = readTokens()
      chart.dispatchAction({ type: 'hideTip' })
      // 独立静态实例避免屏幕实例中尚未结束的点形动画进入导出图片。
      const snapshot = init(document.createElement('div'), undefined, {
        width: chart.getWidth(), height: chart.getHeight(),
      })
      let url: string
      try {
        snapshot.setOption({ ...latestOption.current, animation: false }, true)
        url = snapshot.getDataURL({ type: 'png', pixelRatio: 2, backgroundColor: tokens.surface })
      } finally { snapshot.dispose() }
      const picture = new Image()
      picture.src = url
      await picture.decode()
      const canvas = document.createElement('canvas')
      canvas.width = picture.width
      const context = canvas.getContext('2d')
      if (!context) throw new Error('无法创建导出图片')
      const font = `24px ${tokens.sans}`
      context.font = font
      const lines: string[] = []
      for (const note of notes) {
        let line = ''
        for (const character of note) {
          if (context.measureText(line + character).width > canvas.width - 64 && line) {
            lines.push(line)
            line = ''
          }
          line += character
        }
        if (line) lines.push(line)
      }
      canvas.height = picture.height + 148 + lines.length * 34
      context.fillStyle = tokens.surface
      context.fillRect(0, 0, canvas.width, canvas.height)
      context.fillStyle = tokens.textPri
      context.font = `bold 32px ${tokens.sans}`
      context.fillText(title, 32, 48, canvas.width - 64)
      context.font = font
      context.fillText(DEMO_LABEL + ' · 请勿作为真实经济数据引用', 32, 88, canvas.width - 64)
      context.drawImage(picture, 0, 112)
      context.fillStyle = tokens.textSec
      context.font = font
      lines.forEach((line, index) => context.fillText(line, 32, picture.height + 148 + index * 34))
      return canvas.toDataURL('image/png')
    },
  }), [])

  useEffect(() => {
    const el = hostRef.current
    if (!el) return
    const chart = init(el)
    chartRef.current = chart
    chart.setOption({ ...latestOption.current, animation: latestOption.current.animation !== false && !window.matchMedia('(prefers-reduced-motion: reduce)').matches }, true)
    const observer = new ResizeObserver(() => chart.resize())
    observer.observe(el)
    return () => { observer.disconnect(); chart.dispose(); chartRef.current = null }
  }, [])

  useEffect(() => {
    chartRef.current?.setOption({ ...option, animation: option.animation !== false && !window.matchMedia('(prefers-reduced-motion: reduce)').matches }, true)
  }, [option])
  return <div ref={hostRef} role="img" aria-label={label} style={{ height }} className="w-full" />
}
