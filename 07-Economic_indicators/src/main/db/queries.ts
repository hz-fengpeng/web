import type { Observation, ObsStatus, SourceHealth } from '@shared/types'
import { periodEnd } from '@shared/period'
import { type Db } from './adapter'

/**
 * 所有 SQL 集中在此，业务代码不散落 SQL 字符串。
 *
 * ★ 这里**只有读路径**。曾经还有写路径（`upsertObservations` / `logFetch`），
 *   随采集层在 M1c 删除后就再没有调用方了，之后一并清掉。现在往 `observation`
 *   表写数据的只有一件事：`bootstrap.ts` 把内置库文件整个复制过去（§3.2.0）。
 *
 *   将来重新接入真实数据源时，要新写的是「从网上取数并转成行」和「把行写进表」，
 *   后者的 SQL 届时按真实数据的形状定——不必把上面那两个函数找回来。
 */

export function getSeries(db: Db, indicatorId: string, from?: string, to?: string): Observation[] {
  const clauses = ['indicator_id = ?']
  const params: Array<string> = [indicatorId]
  if (from) {
    clauses.push('period_end >= ?')
    params.push(periodEnd(from))
  }
  if (to) {
    clauses.push('period_end <= ?')
    params.push(periodEnd(to))
  }
  const rows = db
    .prepare(
      `SELECT indicator_id, period, period_end, value, status, released_at, revision
         FROM observation
        WHERE ${clauses.join(' AND ')}
        ORDER BY period_end ASC, revision DESC`,
    )
    .all(...params) as Array<Record<string, unknown>>

  return rows.map((r) => ({
    indicatorId: String(r.indicator_id),
    period: String(r.period),
    periodEnd: String(r.period_end),
    value: r.value === null ? null : Number(r.value),
    status: String(r.status) as ObsStatus,
    releasedAt: r.released_at === null ? null : String(r.released_at),
    revision: Number(r.revision),
  }))
}

export function counts(db: Db): { observations: number; latestPeriod: string | null } {
  const c = db.prepare('SELECT COUNT(*) AS c FROM observation').get() as { c: number | bigint }
  const latest = db
    .prepare('SELECT MAX(period) AS p FROM observation')
    .get() as { p: string | null }
  return { observations: Number(c.c), latestPeriod: latest.p }
}

/** 各数据源的最近一次采集结果，驱动数据管理页的健康度展示 */
export function sourceHealth(db: Db, known: Array<{ id: string; nameZh: string }>): SourceHealth[] {
  return known.map((s) => {
    const row = db
      .prepare(
        `SELECT status, message, finished_at, rows_written
           FROM fetch_log
          WHERE source_id = ?
          ORDER BY started_at DESC
          LIMIT 1`,
      )
      .get(s.id) as
      | { status: string; message: string | null; finished_at: string | null; rows_written: number | null }
      | undefined

    if (!row) {
      return { id: s.id, nameZh: s.nameZh, status: 'never' as const, message: null, lastAt: null, rowsWritten: null }
    }
    return {
      id: s.id,
      nameZh: s.nameZh,
      status: row.status as SourceHealth['status'],
      message: row.message,
      lastAt: row.finished_at,
      rowsWritten: row.rows_written === null ? null : Number(row.rows_written),
    }
  })
}

export function getMeta(db: Db, key: string): string | null {
  const r = db.prepare('SELECT value FROM app_meta WHERE key = ?').get(key) as
    | { value: string }
    | undefined
  return r?.value ?? null
}

export function setMeta(db: Db, key: string, value: string): void {
  db.prepare(
    `INSERT INTO app_meta (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
  ).run(key, value)
}
