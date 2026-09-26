import { useCallback, useEffect, useMemo, useState, type JSX } from 'react'
import type { DataStatus, Indicator, Observation, RefreshResult } from '@shared/types'
import { LineChart } from './charts/LineChart'
import {
  CATEGORY_LABEL,
  STATUS_ZH,
  formatDateTime,
  formatDelta,
  formatValue,
  latestPerPeriod,
  unwrap,
} from './lib/format'

type Health = DataStatus['sources'][number]

export default function App(): JSX.Element {
  const [indicators, setIndicators] = useState<Indicator[]>([])
  const [status, setStatus] = useState<DataStatus | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [series, setSeries] = useState<Observation[]>([])
  const [seriesLoading, setSeriesLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [lastRefresh, setLastRefresh] = useState<RefreshResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const selected = useMemo(
    () => indicators.find((i) => i.id === selectedId) ?? null,
    [indicators, selectedId],
  )

  const refreshStatus = useCallback(async () => {
    setStatus(await unwrap(window.macro.getDataStatus()))
  }, [])

  const collect = useCallback(async () => {
    setBusy(true)
    setError(null)
    try {
      const result = await unwrap(window.macro.refresh())
      setLastRefresh(result)
      await refreshStatus()
      return result
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      return null
    } finally {
      setBusy(false)
    }
  }, [refreshStatus])

  // 启动：读指标清单 + 数据状态。
  // 这里不再需要「空库自动首采」——数据是随应用发布的一个 SQLite 文件
  // （`resources/macro.db`），主进程在开窗之前就把它放好了，渲染进程
  // 拿到的一定是满的库。
  useEffect(() => {
    void (async () => {
      try {
        const [list, st] = await Promise.all([
          unwrap(window.macro.listIndicators()),
          unwrap(window.macro.getDataStatus()),
        ])
        setIndicators(list)
        setStatus(st)
        setSelectedId(list.find((i) => i.isHeadline)?.id ?? list[0]?.id ?? null)
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err))
      }
    })()
  }, [])

  // 选中指标变化 → 读序列
  useEffect(() => {
    if (!selectedId) return
    let cancelled = false
    setSeriesLoading(true)
    // 先清空：不清的话，去取新序列的这段时间里 rows 还是上一个指标的，
    // 图会画着工业增加值的线、标题写着居民消费价格指数。表格时代这个错位
    // 不起眼，换成图之后一眼就能看错。
    setSeries([])
    void (async () => {
      try {
        const rows = await unwrap(window.macro.getSeries({ id: selectedId }))
        if (!cancelled) setSeries(latestPerPeriod(rows))
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err))
      } finally {
        if (!cancelled) setSeriesLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [selectedId, lastRefresh])

  const grouped = useMemo(() => {
    const map = new Map<string, Indicator[]>()
    for (const ind of indicators) {
      const list = map.get(ind.category) ?? []
      list.push(ind)
      map.set(ind.category, list)
    }
    return [...map.entries()]
  }, [indicators])

  return (
    <div className="flex h-full flex-col bg-canvas text-ink">
      <header className="flex h-12 shrink-0 items-center justify-end gap-3 border-b border-hairline px-4 pl-24 [-webkit-app-region:drag]">
        <span className="mr-auto text-[13px] text-ink-2">
          中国宏观经济指标
          <span className="ml-2 text-ink-muted">界面预览版</span>
        </span>
        <button
          type="button"
          onClick={() => void collect()}
          disabled={busy}
          className="rounded-md bg-accent px-3 py-1.5 text-[13px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50 [-webkit-app-region:no-drag]"
        >
          {busy ? '重置中…' : '重置示例数据'}
        </button>
      </header>

      {/*
        ★ 常驻横幅，不可关闭。库里是合成的示例数据，一旦被截图或演示出去，
        没有这行字就会被当成真实的宏观数据读。删掉它等于让这个应用会骗人。
      */}
      <div className="flex shrink-0 items-start gap-2 border-b border-serious/30 bg-serious/10 px-4 py-2 text-[12px] leading-relaxed">
        <span aria-hidden="true" className="text-serious">
          ▲
        </span>
        <span className="text-ink-2">
          <span className="font-medium">示例数据，非真实统计。</span>
          库中数值为合成的演示数据，不代表任何真实经济状况，请勿引用。
          各指标的「口径说明」记录的是真实统计口径，仅用于指导界面呈现。
        </span>
      </div>

      {error && (
        <div className="flex shrink-0 items-start gap-2 border-b border-hairline bg-critical/10 px-4 py-2 text-[13px]">
          <span aria-hidden="true" className="text-critical">
            ✕
          </span>
          <span className="text-ink-2">{error}</span>
          <button
            type="button"
            onClick={() => setError(null)}
            className="ml-auto text-ink-muted hover:text-ink"
          >
            关闭
          </button>
        </div>
      )}

      <div className="flex min-h-0 flex-1">
        <nav className="w-60 shrink-0 overflow-y-auto border-r border-hairline bg-surface py-2">
          {grouped.map(([category, list]) => (
            <div key={category} className="mb-3">
              <div className="px-4 py-1 text-[11px] font-medium tracking-wide text-ink-muted">
                {CATEGORY_LABEL[category as keyof typeof CATEGORY_LABEL] ?? category}
              </div>
              {list.map((ind) => (
                <button
                  key={ind.id}
                  type="button"
                  onClick={() => setSelectedId(ind.id)}
                  className={`block w-full px-4 py-1.5 text-left text-[13px] transition-colors ${
                    ind.id === selectedId
                      ? 'bg-accent/10 font-medium text-ink'
                      : 'text-ink-2 hover:bg-ink/5'
                  }`}
                >
                  {ind.nameShort}
                </button>
              ))}
            </div>
          ))}
          {indicators.length === 0 && (
            <div className="px-4 py-2 text-[13px] text-ink-muted">加载中…</div>
          )}
        </nav>

        <main className="min-w-0 flex-1 overflow-y-auto">
          {selected ? (
            <SeriesPanel indicator={selected} rows={series} loading={seriesLoading} />
          ) : (
            <div className="p-8 text-[13px] text-ink-muted">请选择一个指标</div>
          )}
        </main>
      </div>

      <footer className="flex h-8 shrink-0 items-center gap-4 border-t border-hairline bg-surface px-4 text-[11px] text-ink-2">
        <HealthDot health={status?.sources[0] ?? null} />
        <span className="text-ink-muted">
          最近采集 {formatDateTime(status?.lastFetchAt ?? null)}
        </span>
        <span className="text-ink-muted">观测 {status?.observationCount ?? 0} 条</span>
        {lastRefresh && (
          <span className="text-ink-muted">
            本次写入 {lastRefresh.written} 条 / {lastRefresh.durationMs} ms
            {lastRefresh.failures.length > 0 && (
              <span className="text-serious"> · {lastRefresh.failures.length} 个指标失败</span>
            )}
          </span>
        )}
      </footer>
    </div>
  )
}

type SeriesView = 'chart' | 'table'

function SeriesPanel({
  indicator,
  rows,
  loading,
}: {
  indicator: Indicator
  rows: Observation[]
  loading: boolean
}): JSX.Element {
  // 视图选择**不随指标重置**：SeriesPanel 没有 key，换指标不会重挂载，
  // 这个选择自然保持。它是查看偏好，不该每点一个指标就被掰回默认。
  const [view, setView] = useState<SeriesView>('chart')
  const decimals = indicator.decimals
  // rows 按 period_end 升序，最新在末尾
  const latest = rows.at(-1) ?? null
  const ordered = [...rows].reverse()
  const hasMerged = rows.some((r) => r.status === 'merged')

  return (
    <div className="px-6 py-5">
      <div className="flex items-baseline gap-3">
        <h1 className="text-[17px] font-medium">{indicator.nameZh}</h1>
        <span className="text-[12px] text-ink-muted">{indicator.id}</span>
      </div>

      <div className="mt-4 flex items-end gap-6">
        <div className="flex items-baseline gap-2">
          <span className="tnum text-[44px] leading-none font-medium">
            {loading ? '…' : formatValue(latest?.value ?? null, decimals)}
          </span>
          <span className="text-[15px] text-ink-2">{indicator.unit}</span>
        </div>
        <div className="pb-1 text-[12px] text-ink-2">
          <div>{latest?.period ?? '暂无数据'}</div>
          <div className="text-ink-muted">发布日 {latest?.releasedAt ?? '—'}</div>
        </div>
      </div>

      {/* 口径说明常驻展示，不藏进 tooltip（开发文档 §7.3 / 数据类型定义） */}
      {indicator.note && (
        <p className="mt-4 max-w-[70ch] rounded-md border border-hairline bg-surface px-3 py-2 text-[12px] leading-relaxed text-ink-2">
          {indicator.note}
        </p>
      )}

      {indicator.seasonalAdj && (
        <p className="mt-2 text-[12px] text-ink-muted">
          <span aria-hidden="true">※</span> 该指标为季节调整口径
        </p>
      )}

      {rows.length === 0 ? (
        <p className="mt-6 rounded-md border border-hairline px-3 py-8 text-center text-[13px] text-ink-muted">
          {loading ? '加载中…' : '暂无观测数据 —— 点击右上角「重置示例数据」恢复'}
        </p>
      ) : (
        <>
          <div className="mt-6">
            {view === 'chart' ? (
              <LineChart indicator={indicator} rows={rows} />
            ) : (
              <ObservationTable indicator={indicator} ordered={ordered} />
            )}
          </div>

          <div className="mt-3 flex items-center gap-4">
            <ViewToggle view={view} onChange={setView} />
            <p className="text-[11px] text-ink-muted">
              共 {rows.length} 个期间
              {indicator.valueType === 'mom' && ' · 环比口径，与同比不可比'}
            </p>
          </div>

          {/* 形状编码看不懂时，这行字兜底。图的形状通道绝不单独承载含义（§6.2） */}
          {view === 'chart' && hasMerged && (
            <p className="mt-2 text-[11px] text-ink-2">
              <span aria-hidden="true">◇</span> 标记为 1—2 月合并发布，非单月值
            </p>
          )}
        </>
      )}
    </div>
  )
}

/**
 * 图表 / 数据表 切换。§7.3 的详情页线框图里就画着它，§6.5 把它列为无障碍
 * 硬要求（「每个图都应能切换到『看数据』模式」）。
 *
 * 用 `aria-pressed` 而不是完整的 `role="tab"`：tab 模式要配 roving tabindex
 * 和方向键导航，只做一半比不做更糟——屏幕阅读器会宣布一套并不存在的交互契约。
 */
function ViewToggle({
  view,
  onChange,
}: {
  view: SeriesView
  onChange: (v: SeriesView) => void
}): JSX.Element {
  const items: Array<{ id: SeriesView; label: string }> = [
    { id: 'chart', label: '图表' },
    { id: 'table', label: '数据表' },
  ]
  return (
    <div
      role="group"
      aria-label="显示方式"
      className="flex items-center gap-0.5 rounded-md border border-hairline p-0.5"
    >
      {items.map((it) => (
        <button
          key={it.id}
          type="button"
          aria-pressed={view === it.id}
          onClick={() => onChange(it.id)}
          className={`rounded px-2.5 py-0.5 text-[12px] transition-colors ${
            view === it.id ? 'bg-accent/10 font-medium text-ink' : 'text-ink-2 hover:bg-ink/5'
          }`}
        >
          {it.label}
        </button>
      ))}
    </div>
  )
}

/**
 * 「看数据」视图。图表之外的唯一明细出口：修订状态、发布日、逐期变动
 * 都在这里，所以它不能删（§6.5）。
 */
function ObservationTable({
  indicator,
  ordered,
}: {
  indicator: Indicator
  /** 最新的期间在前 */
  ordered: Observation[]
}): JSX.Element {
  const decimals = indicator.decimals
  return (
    <div className="overflow-hidden rounded-md border border-hairline">
      <table className="w-full border-collapse text-[13px]">
        <thead>
          <tr className="border-b border-hairline bg-surface text-left text-[11px] text-ink-muted">
            <th className="px-3 py-2 font-medium">期间</th>
            <th className="px-3 py-2 text-right font-medium">数值（{indicator.unit}）</th>
            <th className="px-3 py-2 text-right font-medium">较上期</th>
            <th className="px-3 py-2 text-right font-medium">发布日</th>
            <th className="px-3 py-2 font-medium">状态</th>
          </tr>
        </thead>
        <tbody>
          {ordered.map((row, i) => {
            const prev = ordered[i + 1] ?? null
            const delta =
              prev && prev.value !== null && row.value !== null ? row.value - prev.value : null
            return (
              <tr key={`${row.period}-${row.revision}`} className="border-b border-grid">
                <td className="tnum px-3 py-1.5">{row.period}</td>
                <td className="tnum px-3 py-1.5 text-right font-medium">
                  {formatValue(row.value, decimals)}
                </td>
                <td className="px-3 py-1.5 text-right">
                  <Delta delta={delta} decimals={decimals} />
                </td>
                <td className="tnum px-3 py-1.5 text-right text-ink-2">{row.releasedAt ?? '—'}</td>
                <td className="px-3 py-1.5 text-ink-2">{STATUS_ZH[row.status] ?? row.status}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

/**
 * 涨跌三重编码：数值带符号 + 箭头 + 颜色（开发文档 §6.3）。
 * 颜色绝不单独承载含义，色觉障碍用户靠符号与数值同样可读。
 */
function Delta({ delta, decimals }: { delta: number | null; decimals: number }): JSX.Element {
  if (delta === null) return <span className="text-ink-muted">—</span>
  const arrow = delta > 0 ? '▲' : delta < 0 ? '▼' : '＝'
  const tone = delta > 0 ? 'text-up' : delta < 0 ? 'text-down' : 'text-ink-muted'
  return (
    <span className={`tnum ${tone}`}>
      <span aria-hidden="true" className="mr-1 text-[10px]">
        {arrow}
      </span>
      {formatDelta(delta, decimals)}
    </span>
  )
}

/** 状态色固定搭配图标 + 文字标签，绝不单靠颜色（开发文档 §6.2） */
function HealthDot({ health }: { health: Health | null }): JSX.Element {
  const map = {
    ok: { tone: 'text-good', icon: '●', label: '正常' },
    partial: { tone: 'text-serious', icon: '◐', label: '部分指标失败' },
    fail: { tone: 'text-critical', icon: '▲', label: '采集失败' },
    never: { tone: 'text-ink-muted', icon: '○', label: '未采集' },
  } as const
  const s = map[health?.status ?? 'never']
  return (
    <span className="flex items-center gap-1.5">
      <span aria-hidden="true" className={`${s.tone} text-[9px]`}>
        {s.icon}
      </span>
      <span className="text-ink-2">
        {health?.nameZh ?? '示例数据'}：{s.label}
      </span>
      {health?.message && (
        <span className="max-w-[52ch] truncate text-ink-muted" title={health.message}>
          {health.message}
        </span>
      )}
    </span>
  )
}
