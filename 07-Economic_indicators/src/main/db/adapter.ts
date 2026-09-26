import { DatabaseSync } from 'node:sqlite'

/**
 * ★ node:sqlite 的唯一封装点。
 *
 * 该 API 目前仍标记为实验性（运行时打印 ExperimentalWarning，可能随 Node 版本变动）。
 * 因此业务代码一律不直接 import 'node:sqlite'，全部经此模块。
 * 日后 API 变动、或需换回 better-sqlite3，都是单文件改动。
 *
 * M0 实测确认可用：WAL、复合主键、索引、UPSERT(ON CONFLICT DO UPDATE)、
 * 手工事务、预编译语句、命名参数。
 */

export type Db = DatabaseSync
export type Row = Record<string, unknown>

export interface OpenOptions {
  /** 为 true 时使用内存库，供测试使用 */
  memory?: boolean
}

export function openDatabase(file: string, opts: OpenOptions = {}): Db {
  const db = new DatabaseSync(opts.memory ? ':memory:' : file)
  // WAL 提升并发读写表现；内存库不支持 WAL，跳过
  if (!opts.memory) db.exec('PRAGMA journal_mode = WAL;')
  db.exec('PRAGMA foreign_keys = ON;')
  return db
}

export function exec(db: Db, sql: string): void {
  db.exec(sql)
}

/** 手工事务。node:sqlite 未提供 better-sqlite3 那样的 db.transaction() 包装 */
export function tx<T>(db: Db, fn: () => T): T {
  db.exec('BEGIN')
  try {
    const out = fn()
    db.exec('COMMIT')
    return out
  } catch (err) {
    db.exec('ROLLBACK')
    throw err
  }
}

export function close(db: Db): void {
  db.close()
}
