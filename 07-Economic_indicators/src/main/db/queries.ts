import type { Observation, ObsStatus, SourceHealth } from '@shared/types'
import { periodEnd } from '@shared/period'
import { type Db } from './adapter'

/**
 * 所有 SQL 集中在此，业务代码不散落 SQL 字符串。
 *
 * 观测读取、计数与元数据操作集中在这里。目录升级只从内置静态库追加
 * 新指标，已有系列不覆盖；写入由 catalog.ts 的事务管理。
 * 本轮没有恢复网络采集或运行时数据生成。
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
    .prepare('SELECT MAX(period_end) AS p FROM observation')
    .get() as { p: string | null }
  return { observations: Number(c.c), latestPeriod: latest?.p ?? null }
}

/** 从静态内置库追加整个新指标；已有该指标的任何观测时，保留用户版本。 */
export function appendBundledIndicators(db: Db, bundled: Db, ids: string[]): number {
  const exists = db.prepare('SELECT 1 FROM observation WHERE indicator_id = ? LIMIT 1')
  const read = bundled.prepare(`SELECT indicator_id, period, period_end, value, status, released_at, fetched_at, revision
    FROM observation WHERE indicator_id = ?`)
  const insert = db.prepare(`INSERT INTO observation
    (indicator_id, period, period_end, value, status, released_at, fetched_at, revision)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
  let written = 0
  for (const id of ids) {
    if (exists.get(id)) continue
    const rows = read.all(id)
    if (rows.length === 0) throw new Error(`内置示例库缺少新增指标：${id}`)
    for (const row of rows) {
      insert.run(row.indicator_id, row.period, row.period_end, row.value, row.status, row.released_at, row.fetched_at, row.revision)
      written++
    }
  }
  return written
}

export function logCatalogUpgrade(db: Db, written: number, version: number): void {
  const now = new Date().toISOString()
  db.prepare(`INSERT INTO fetch_log(source_id, started_at, finished_at, status, rows_written, message)
    VALUES ('mock', ?, ?, 'ok', ?, ?)`)
    .run(now, now, written, `内置示例目录升级 v${version} · 追加 ${written} 条合成观测，非真实统计；已有指标保留`)
  setMeta(db, 'last_fetch_at', now)
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
