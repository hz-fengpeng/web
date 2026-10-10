import { useCallback, useEffect, useRef, useState, type JSX } from 'react'
import type { DataStatus, Indicator } from '@shared/types'
import { Overview } from './pages/Overview'
import { Indicators } from './pages/Indicators'
import { Detail } from './pages/Detail'
import { Compare } from './pages/Compare'
import { Calendar } from './pages/Calendar'
import { Data } from './pages/Data'
import { Settings } from './pages/Settings'
import { Empty } from './components/UI'
import { comparable, type SeriesMap } from './lib/data'
import { unwrap } from './lib/format'
import { usePreferences } from './lib/preferences'

type Page = 'overview' | 'indicators' | 'detail' | 'compare' | 'calendar' | 'data' | 'settings'
const NAV: Array<{ id: Exclude<Page, 'detail'>; label: string; icon: string }> = [
  { id: 'overview', label: '经济概览', icon: '◫' }, { id: 'indicators', label: '指标库', icon: '▤' },
  { id: 'compare', label: '对比分析', icon: '⇄' }, { id: 'calendar', label: '发布日历', icon: '▦' },
  { id: 'data', label: '数据管理', icon: '▥' }, { id: 'settings', label: '设置', icon: '⚙' },
]
const errorMessage = (error: unknown): string => error instanceof Error ? error.message : String(error)

export default function App(): JSX.Element {
  const [page, setPage] = useState<Page>('overview')
  const [indicators, setIndicators] = useState<Indicator[]>([])
  const [series, setSeries] = useState<SeriesMap>({})
  const [status, setStatus] = useState<DataStatus | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [compareIds, setCompareIds] = useState<string[]>(['cn.cpi.yoy', 'cn.ppi.yoy'])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const requestId = useRef(0)
  const mainRef = useRef<HTMLElement>(null)
  const { preferences, setPreferences, toggleFavorite, storageError } = usePreferences()
  const favorites = preferences.favorites.filter((id) => indicators.some((i) => i.id === id))
  const selected = indicators.find((i) => i.id === selectedId)
  const onError = useCallback((err: unknown): void => setError(errorMessage(err)), [])
  const notify = useCallback((text: string): void => setMessage(text), [])

  const load = useCallback(async (): Promise<boolean> => {
    const id = ++requestId.current
    setLoading(true)
    setError(null)
    try {
      const [list, st] = await Promise.all([unwrap(window.macro.listIndicators()), unwrap(window.macro.getDataStatus())])
      const entries = await Promise.all(list.map(async (i) => [i.id, await unwrap(window.macro.getSeries({ id: i.id }))] as const))
      if (id !== requestId.current) return false
      setIndicators(list)
      setStatus(st)
      setSeries(Object.fromEntries(entries))
      setCompareIds((ids) => ids.filter((value) => list.some((i) => i.id === value)))
      return true
    } catch (err) {
      if (id === requestId.current) onError(err)
      return false
    } finally { if (id === requestId.current) setLoading(false) }
  }, [onError])

  useEffect(() => { void load(); return () => { requestId.current++ } }, [load])
  useEffect(() => {
    if (!message) return
    const timer = window.setTimeout(() => setMessage(null), 6000)
    return () => window.clearTimeout(timer)
  }, [message])
  useEffect(() => { mainRef.current?.querySelector('h1')?.focus() }, [page, selectedId])

  const openIndicator = (id: string): void => { setSelectedId(id); setPage('detail') }
  const compareSelected = (): void => {
    if (!selected) return
    const anchor = indicators.find((i) => i.id === compareIds[0])
    if (!anchor || !comparable(anchor, selected)) {
      setCompareIds([selected.id])
      notify('已选择当前指标，请添加相同口径的指标进行对比。')
    } else if (!compareIds.includes(selected.id)) {
      setCompareIds(compareIds.length < 3 ? [...compareIds, selected.id] : [selected.id])
    }
    setPage('compare')
  }
  const reset = async (): Promise<boolean> => {
    setBusy(true)
    setError(null)
    try {
      const result = await unwrap(window.macro.refresh())
      const loaded = await load()
      if (loaded) notify(`已恢复内置真实数据，共 ${result.written} 条观测。`)
      return loaded
    } catch (err) { onError(err); return false } finally { setBusy(false) }
  }

  let content: JSX.Element
  if (!status) content = <Empty>{loading ? '正在读取本地数据…' : '暂时无法读取数据，请点击上方重试。'}</Empty>
  else {
    switch (page) {
      case 'overview': content = <Overview indicators={indicators} series={series} favorites={favorites} onOpen={openIndicator} />; break
      case 'indicators': content = <Indicators indicators={indicators} series={series} favorites={favorites} onFavorite={toggleFavorite} onOpen={openIndicator} />; break
      case 'detail': content = selected ? <Detail indicator={selected} indicators={indicators} rawRows={series[selected.id] ?? []} favorite={favorites.includes(selected.id)} defaultRange={preferences.range} onFavorite={() => toggleFavorite(selected.id)} onOpen={openIndicator} onBack={() => setPage('indicators')} onCompare={compareSelected} notify={notify} onError={onError} /> : <Empty>请选择一个指标。</Empty>; break
      case 'compare': content = <Compare indicators={indicators} series={series} selectedIds={compareIds} onSelection={setCompareIds} defaultRange={preferences.range} notify={notify} onError={onError} />; break
      case 'calendar': content = <Calendar indicators={indicators} series={series} onOpen={openIndicator} />; break
      case 'data': content = <Data status={status} indicators={indicators} series={series} busy={busy} onReset={reset} onOpen={openIndicator} notify={notify} onError={onError} />; break
      case 'settings': content = <Settings preferences={preferences} onChange={setPreferences} storageError={storageError} />; break
    }
  }
  return <div className="app-shell">
    <a className="skip-link" href="#main-content">跳到主要内容</a>
    <header className="titlebar"><span>中国宏观经济指标</span><span className="titlebar-mode">真实统计 · 离线可用</span></header>
    <div className="provenance-banner"><span aria-hidden="true">◆</span><p><strong>真实统计数据。</strong> 数值来自国家统计局、东方财富、国家外汇管理局、中国债券信息网与新浪财经的公开数据，由 fetcher/ 离线抓取后写入本地库，<strong>不是实时行情</strong>。少数指标暂无免费数据源，以「缺失」如实呈现。口径说明用于解释统计范围。</p></div>
    {error && <div className="error-banner" role="alert"><span>读取或操作失败：{error}</span><div className="actions"><button className="btn" disabled={loading || busy} onClick={() => void load()}>重试读取</button><button className="btn" onClick={() => setError(null)}>关闭</button></div></div>}
    <div className="app-body"><nav className="sidebar" aria-label="主导航"><div className="brand"><span className="brand-mark">M</span><div><strong>宏观观察</strong><small>CHINA MACRO</small></div></div>
      <div className="nav-caption">工作台</div>{NAV.map((item) => <button className="nav-item" aria-current={page === item.id || (item.id === 'indicators' && page === 'detail') ? 'page' : undefined} key={item.id} onClick={() => setPage(item.id)}><span className="nav-icon" aria-hidden="true">{item.icon}</span>{item.label}</button>)}
      <div className="sidebar-bottom"><span className="text-xs">● 内置真实数据库</span><small>{status?.indicatorCount ?? '—'} 个指标 · {status?.observationCount ?? '—'} 条观测</small><small>由 fetcher/ 离线抓取更新</small></div>
    </nav><main ref={mainRef} id="main-content" tabIndex={-1} aria-busy={loading} className="main-content"><div className="page-container">{content}</div></main></div>
    <footer className="statusbar"><span>● {status?.sources.map((s) => s.nameZh).join(' · ') || '真实数据'} · {status ? '本地读取' : '等待读取'}</span><span>观测 {status?.observationCount ?? 0} 条（含修订）</span><span className="ml-auto">{loading ? '读取中…' : busy ? '恢复中…' : '完全离线'}</span></footer>
    {message && <div className="toast" role="status"><span>{message}</span><button aria-label="关闭通知" onClick={() => setMessage(null)}>×</button></div>}
  </div>
}
