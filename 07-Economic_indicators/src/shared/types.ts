/**
 * 主进程与渲染进程共享的类型定义。
 * 这是 IPC 契约的单一事实源——两端都从这里取类型，不各自定义。
 */

export type Category =
  | 'growth'
  | 'price'
  | 'sentiment'
  | 'demand'
  | 'money'
  | 'employment'
  | 'external'
  | 'fiscal'

export type Frequency = 'day' | 'month' | 'quarter' | 'year'

/** 口径。同比 / 环比 / 累计同比严格区分，绝不混画一张图（见开发文档 §3.4） */
export type ValueType = 'yoy' | 'mom' | 'level' | 'cumulative' | 'cumulative_yoy' | 'index'

/**
 * `merged` = 1—2 月合并发布。国家统计局自 2021 年起不再单独发布部分指标的
 * 1 月数据，3 月中旬的那篇通稿里 1 月和 2 月合在一起，只有 `1—2月` 一列。
 * 该期间的数值记为 2 月（`period: '2026-02'`），但必须与单月值区分开：
 * 它是两个月的合计/平均，不是 2 月单月值，UI 上要标出来。
 */
export type ObsStatus = 'ok' | 'prelim' | 'revised' | 'missing' | 'merged'

/**
 * 指标元数据。
 *
 * ★ 这里只保留**产品语义**字段（叫什么、什么口径、什么单位）。
 *   原先还有一组描述「怎么从 NBS 发布稿里把值抠出来」的字段
 *   （sourceParse / sourceColumn / sourceTableText / …），
 *   随网络采集一起删掉了——M1d 起数据固化在随应用发布的
 *   `resources/macro.db` 里，`db/seed.ts` 也已一并删除。
 *   需要时可以从 git 历史里取回。
 */
export interface Indicator {
  id: string
  nameZh: string
  nameShort: string
  category: Category
  unit: string
  frequency: Frequency
  valueType: ValueType
  seasonalAdj: boolean
  decimals: number
  isHeadline: boolean
  /** ★ 口径说明。UI 必须常驻展示，不能藏进 tooltip */
  note: string | null
}

export interface Observation {
  indicatorId: string
  /** 规范期间：'2026-08' | '2026Q2' | '2026' */
  period: string
  /** 期间结束日 '2026-08-31'，用于排序与跨频率对齐 */
  periodEnd: string
  value: number | null
  status: ObsStatus
  releasedAt: string | null
  /** 修订序号。GDP 有三次核实，社融有月度修订，历史必须保留 */
  revision: number
}

export interface SourceHealth {
  id: string
  nameZh: string
  /** partial = 该源部分指标成功、部分失败。与完全失败是两回事，UI 必须分开呈现 */
  status: 'ok' | 'partial' | 'fail' | 'never'
  message: string | null
  lastAt: string | null
  rowsWritten: number | null
}

export interface DataStatus {
  lastFetchAt: string | null
  indicatorCount: number
  observationCount: number
  latestPeriod: string | null
  sources: SourceHealth[]
}

export interface RefreshResult {
  written: number
  failures: Array<{ indicatorId: string; message: string }>
  durationMs: number
}

export type Result<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string } }

/** preload 通过 contextBridge 暴露给渲染进程的白名单 API */
export interface MacroApi {
  listIndicators(): Promise<Result<Indicator[]>>
  getSeries(req: { id: string; from?: string; to?: string }): Promise<Result<Observation[]>>
  getDataStatus(): Promise<Result<DataStatus>>
  refresh(): Promise<Result<RefreshResult>>
}

export const IPC = {
  listIndicators: 'macro:list-indicators',
  getSeries: 'macro:get-series',
  getDataStatus: 'macro:get-data-status',
  refresh: 'macro:refresh',
} as const
