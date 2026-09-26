/**
 * 图表设计令牌。
 *
 * ★ 色值的事实源是 `styles/index.css` 里的 `--c-*` 变量，**不是这个文件**。
 *   开发文档 §6.7 是规范性的：「图表主题与 UI 共用同一套令牌」。把色值硬写在
 *   TS 里就是第二份色表，两份迟早各自漂移——所以这里只做一件事：把已经算好的
 *   CSS 变量读出来。深浅色因此自动跟随，不需要第二份暗色色值表
 *   （§6.7：各自独立取阶）。
 */
import { useEffect, useState } from 'react'

export interface ChartTokens {
  /** 图表所在平面。用于数据点的描边环，让交叠处可辨（§6.4） */
  surface: string
  textPri: string
  textSec: string
  muted: string
  /** 水平网格线 */
  grid: string
  /** 坐标轴基线 */
  axis: string
  /** 分类色槽位 1 —— 单序列折线用它 */
  accent: string
  /**
   * 字体栈。坐标轴与图例是 canvas 画的，不会从 DOM 继承字体——不给它
   * 就退回浏览器的默认 sans-serif，和界面里那套系统字体对不上（§6.4）。
   */
  sans: string
}

const TOKEN_KEYS: Record<keyof ChartTokens, string> = {
  surface: '--c-surface',
  textPri: '--c-ink',
  textSec: '--c-ink-2',
  muted: '--c-ink-muted',
  grid: '--c-grid',
  axis: '--c-axis',
  accent: '--c-accent',
  sans: '--font-sans',
}

/**
 * 一组浅色兜底值（与 `styles/index.css` 的浅色令牌一致）。
 * **只在读不到 CSS 变量时用**（样式表尚未加载），不是事实源。
 * 此时宁可先画一张浅色图，也不要画一张没有颜色的图。
 */
export const FALLBACK_TOKENS: ChartTokens = {
  surface: '#fcfcfb',
  textPri: '#0b0b0b',
  textSec: '#52514e',
  muted: '#898781',
  grid: '#e1e0d9',
  axis: '#c3c2b7',
  accent: '#2a78d6',
  // 这里不重复 index.css 里那串系统字体栈——那是 D2 要避免的第二份事实源。
  // 走到这个分支说明样式表还没生效，界面本身也在用浏览器默认字体。
  sans: 'sans-serif',
}

/** 从已计算样式里读当前主题的令牌。切换深浅色后必须重新调用。 */
export function readTokens(el: Element = document.documentElement): ChartTokens {
  const cs = getComputedStyle(el)
  const out = {} as ChartTokens
  for (const key of Object.keys(TOKEN_KEYS) as Array<keyof ChartTokens>) {
    const v = cs.getPropertyValue(TOKEN_KEYS[key]).trim()
    out[key] = v || FALLBACK_TOKENS[key]
  }
  return out
}

/**
 * 订阅主题变化，返回当前令牌。
 *
 * 两个来源都要听：
 * - `prefers-color-scheme` —— 跟随系统（§6.7）
 * - `documentElement` 上的 `data-theme` 属性 —— §6.7 要求手动选择优先于系统。
 *   手动切换开关本身还没做，但监听口子留在这里，将来加开关不用回来改图表代码。
 */
export function useChartTokens(): ChartTokens {
  const [tokens, setTokens] = useState<ChartTokens>(() => readTokens())

  useEffect(() => {
    const reread = (): void => setTokens(readTokens())
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    mq.addEventListener('change', reread)
    const mo = new MutationObserver(reread)
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => {
      mq.removeEventListener('change', reread)
      mo.disconnect()
    }
  }, [])

  return tokens
}
