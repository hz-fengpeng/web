import { Component, type ErrorInfo, type ReactNode } from 'react'

/** 渲染失败时仍给出恢复入口；数据读取错误由 App 的错误横幅处理。 */
export class ErrorBoundary extends Component<{ children: ReactNode }, { error: string | null }> {
  state = { error: null as string | null }
  static getDerivedStateFromError(error: Error) { return { error: error.message } }
  componentDidCatch(error: Error, info: ErrorInfo): void { console.error(error, info.componentStack) }
  render(): ReactNode {
    if (!this.state.error) return this.props.children
    return <div className="p-8">
      <p className="error-banner">页面渲染失败，已停止显示任何数值。</p><h1 className="mt-6">页面暂时无法显示</h1>
      <p className="mt-4 text-sm text-ink-2" role="alert">{this.state.error}</p><button className="btn mt-6" onClick={() => window.location.reload()}>重新加载应用</button></div>
  }
}
