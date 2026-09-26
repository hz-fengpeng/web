import { ipcMain } from 'electron'
import { IPC, type DataStatus, type Result } from '@shared/types'
import { INDICATORS } from '@shared/indicators'
import type { Db } from '../db/adapter'
import { MOCK_SOURCE } from '../db/bootstrap'
import { counts, getMeta, getSeries, sourceHealth } from '../db/queries'

/**
 * 主进程交给 IPC 层的数据库句柄。
 *
 * `reset()` 会把 userData 里的库整体换成内置文件，**连接会换掉**，
 * 所以不能像以前那样把一个 `Db` 传进来存着——那个引用在重置后就悬空了。
 * 一律走 `get()` 现取。
 */
export interface DbHost {
  get(): Db
  /** 恢复到内置状态，返回恢复后的观测条数 */
  reset(): number
}

/** 统一的结果包装：渲染进程永远拿到结构化结果，不需要 try/catch 解 IPC 错误 */
const ok = <T>(data: T): Result<T> => ({ ok: true, data })
const fail = (code: string, message: string): Result<never> => ({ ok: false, error: { code, message } })

const wrap = <T>(fn: () => T | Promise<T>): Promise<Result<T>> =>
  Promise.resolve()
    .then(fn)
    .then(ok)
    .catch((err: unknown) => fail('E_HANDLER', err instanceof Error ? err.message : String(err)))

export function registerIpc(host: DbHost): void {
  ipcMain.handle(IPC.listIndicators, () => wrap(() => INDICATORS))

  ipcMain.handle(IPC.getSeries, (_e, req: { id: string; from?: string; to?: string }) =>
    wrap(() => getSeries(host.get(), req.id, req.from, req.to)),
  )

  ipcMain.handle(IPC.getDataStatus, () =>
    wrap((): DataStatus => {
      const db = host.get()
      const c = counts(db)
      return {
        lastFetchAt: getMeta(db, 'last_fetch_at'),
        indicatorCount: INDICATORS.length,
        observationCount: c.observations,
        latestPeriod: c.latestPeriod,
        sources: sourceHealth(db, [MOCK_SOURCE]),
      }
    }),
  )

  // 网络采集已移除，这个通道的语义变成「把库恢复成内置文件的样子」——
  // 用户若用 sqlite3 改坏了库，靠它回到出厂状态。
  ipcMain.handle(IPC.refresh, () =>
    wrap(() => {
      const t0 = Date.now()
      const written = host.reset()
      return { written, failures: [], durationMs: Date.now() - t0 }
    }),
  )
}
