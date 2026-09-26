import { describe, expect, it } from 'vitest'
import { exec, openDatabase, type Db } from './adapter'
import { migrate, SCHEMA_VERSION } from './migrate'
import { getMeta, setMeta } from './queries'
import schemaSql from './schema.sql?raw'

/**
 * 迁移机制的回归测试。
 *
 * 守的是 M0 那个坑：`initDatabase()` 每次启动都无条件写
 * `setMeta(db,'schema_version','1')`，版本号永远被压回 1，等价于没有版本记录。
 * 当时全靠 `CREATE TABLE IF NOT EXISTS` 掩盖着，第一次出现
 * `ALTER TABLE ADD COLUMN` 就会变成每次启动都抛 "duplicate column name"。
 */

/** 建一个和装机现场一致的库：schema.sql 已执行，但还没记版本 */
function freshDb(): Db {
  const db = openDatabase(':memory:', { memory: true })
  exec(db, schemaSql)
  return db
}

function tableNames(db: Db): string[] {
  return (db.prepare('SELECT name FROM sqlite_master WHERE type = ?').all('table') as Array<{
    name: string
  }>).map((r) => r.name)
}

describe('migrate', () => {
  it('空库：补到当前版本，并记住版本号', () => {
    const db = freshDb()
    expect(getMeta(db, 'schema_version')).toBeNull()

    const r = migrate(db)
    expect(r.from).toBe(1)
    expect(r.to).toBe(SCHEMA_VERSION)
    expect(r.applied).toEqual([`v${SCHEMA_VERSION} release_index`])
    expect(getMeta(db, 'schema_version')).toBe(String(SCHEMA_VERSION))
    expect(tableNames(db)).toContain('release_index')
  })

  it('★ 已是最新版本时不重放任何迁移', () => {
    const db = freshDb()
    migrate(db) // 第一次：建 release_index
    // 第二、三次必须什么都不做。若这里开始重放，一旦将来某个迁移写成
    // ALTER TABLE ADD COLUMN，就会每次启动都抛 duplicate column name。
    expect(migrate(db).applied).toEqual([])
    expect(migrate(db).applied).toEqual([])
    expect(getMeta(db, 'schema_version')).toBe(String(SCHEMA_VERSION))
  })

  it('★ 版本门槛读的是 app_meta，不是模块级开关', () => {
    const db = freshDb()
    migrate(db)
    // 把版本号倒回去，迁移必须重新跑——证明判断来自库里的记录
    setMeta(db, 'schema_version', '1')
    expect(migrate(db).applied).toEqual([`v${SCHEMA_VERSION} release_index`])
  })

  it('M0 装机的老库（已建表但没记版本）能平滑升级', () => {
    const db = freshDb()
    // 模拟现场：observation / fetch_log 里已经有数据
    db.prepare(
      `INSERT INTO observation (indicator_id, period, period_end, value, fetched_at)
       VALUES ('cn.cpi.yoy', '2026-08', '2026-08-31', 0.8, '2026-09-09T00:00:00Z')`,
    ).run()

    migrate(db)

    const n = db.prepare('SELECT COUNT(*) AS c FROM observation').get() as { c: number }
    expect(Number(n.c)).toBe(1) // 数据没动
    expect(tableNames(db)).toContain('release_index')
  })

  it('数据库版本高于程序支持时拒绝打开，而不是按旧 schema 去读写', () => {
    const db = freshDb()
    setMeta(db, 'schema_version', String(SCHEMA_VERSION + 1))
    expect(() => migrate(db)).toThrow(/高于本程序支持/)
  })

  it('版本号非法时报错，不静默当成 0 重来', () => {
    const db = freshDb()
    setMeta(db, 'schema_version', '不是数字')
    expect(() => migrate(db)).toThrow(/非法/)
  })

  it('schema.sql 是幂等的：重复执行不影响已有数据', () => {
    const db = freshDb()
    migrate(db)
    db.prepare(
      `INSERT INTO observation (indicator_id, period, period_end, value, fetched_at)
       VALUES ('cn.cpi.yoy', '2026-08', '2026-08-31', 0.8, '2026-09-09T00:00:00Z')`,
    ).run()

    exec(db, schemaSql) // 每次启动都会跑这一句

    const n = db.prepare('SELECT COUNT(*) AS c FROM observation').get() as { c: number }
    expect(Number(n.c)).toBe(1)
    expect(getMeta(db, 'schema_version')).toBe(String(SCHEMA_VERSION))
  })
})
