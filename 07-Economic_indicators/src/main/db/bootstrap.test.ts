import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync, copyFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { INDICATORS } from '@shared/indicators'
import type { ObsStatus } from '@shared/types'
import { close, exec, openDatabase } from './adapter'
import { BUNDLED_DB, MOCK_SOURCE, ensureUserDb, resetToBundled, restoreUserDb } from './bootstrap'
import { SCHEMA_VERSION, migrate } from './migrate'
import { counts, getMeta, getSeries, sourceHealth } from './queries'
import schemaSql from './schema.sql?raw'

/**
 * 内置数据库的摆放逻辑。
 *
 * 这里守两件事：
 *  1. **复制语义**——只在首次运行放文件，绝不覆盖用户那份。判错了会让
 *     用户每次启动都回到出厂状态，或者反过来：库坏了也修不回来。
 *  2. **随项目提交的那份文件本身**。生成器已删除（见开发文档 §3.2.0），
 *     `resources/macro.db` 成为一个不可再生的产物——它必须是能打开的、
 *     满的、结构正确的库。它坏了没有任何东西会重建它，只能靠这些断言发现。
 */

const SHIPPED = resolve('resources', BUNDLED_DB)

let dir: string

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'macro-boot-'))
})

afterEach(() => {
  rmSync(dir, { recursive: true, force: true })
})

const userFile = (): string => join(dir, 'macro.db')

/** 假的「内置文件」，内容可辨认，用来验证复制过去的确实是它 */
function fakeBundled(content = 'BUNDLED-CONTENT'): string {
  const p = join(dir, 'bundled.db')
  writeFileSync(p, content)
  return p
}

describe('bootstrap · 摆放', () => {
  it('首次运行：内置文件被复制到用户目录', () => {
    const bundled = fakeBundled()
    expect(ensureUserDb(userFile(), bundled)).toBe('copied')
    expect(readFileSync(userFile(), 'utf8')).toBe('BUNDLED-CONTENT')
  })

  it('★ 用户目录已有库时不覆盖', () => {
    const bundled = fakeBundled()
    writeFileSync(userFile(), 'USER-EDITED')
    expect(ensureUserDb(userFile(), bundled)).toBe('kept')
    // 覆盖掉的话，用户改过的库、以及已经迁移过的库，每次启动都会被冲掉
    expect(readFileSync(userFile(), 'utf8')).toBe('USER-EDITED')
  })

  it('用户目录不存在时会被建出来', () => {
    const nested = join(dir, 'a', 'b', 'macro.db')
    expect(ensureUserDb(nested, fakeBundled())).toBe('copied')
    expect(existsSync(nested)).toBe(true)
  })

  it('★ 内置文件缺失时抛错，且错误里带路径', () => {
    const missing = join(dir, 'nope.db')
    // 打包漏配 extraResources 时就是这个症状。报错里没有路径的话，
    // 只能看到一个光秃秃的 ENOENT（甚至更糟：一个空库被建出来）。
    expect(() => ensureUserDb(userFile(), missing)).toThrow(/nope\.db/)
    expect(existsSync(userFile())).toBe(false)
  })

  it('★ restore 覆盖用户那份，并清掉 WAL 残留', () => {
    const bundled = fakeBundled('FRESH')
    writeFileSync(userFile(), 'USER-EDITED')
    writeFileSync(`${userFile()}-wal`, 'stale')
    writeFileSync(`${userFile()}-shm`, 'stale')

    restoreUserDb(userFile(), bundled)

    expect(readFileSync(userFile(), 'utf8')).toBe('FRESH')
    // 旧 -wal 配上新主库文件，SQLite 会拿它做恢复，恢复出两次写入的混合物
    expect(existsSync(`${userFile()}-wal`)).toBe(false)
    expect(existsSync(`${userFile()}-shm`)).toBe(false)
  })

  it('内置文件缺失时 restore 同样抛错（不静默留个空库）', () => {
    writeFileSync(userFile(), 'USER-EDITED')
    expect(() => restoreUserDb(userFile(), join(dir, 'nope.db'))).toThrow(/nope\.db/)
  })

  /** 造一个「被改坏了」的用户库：多一条脏数据、少一整个指标。返回脏值行数。 */
  function makeDirtyDb(): { db: ReturnType<typeof openDatabase>; sentinel: number } {
    const db = openDatabase(userFile())
    exec(db, schemaSql)
    migrate(db)
    db.prepare(
      `INSERT INTO observation (indicator_id, period, period_end, value, status, released_at, fetched_at)
       VALUES ('cn.cpi.yoy', '2019-03', '2019-03-31', 42.42, 'ok', '2019-04-09', '2019-04-09T00:00:00Z')`,
    ).run()
    db.prepare("DELETE FROM observation WHERE indicator_id = 'cn.gdp.yoy'").run()
    return { db, sentinel: sentinelRows(db) }
  }

  const sentinelRows = (db: ReturnType<typeof openDatabase>): number =>
    (db.prepare('SELECT COUNT(*) AS c FROM observation WHERE value = 42.42').get() as { c: number }).c

  /** 重开一次，模拟 index.ts 里 openAndMigrate 之后的读 */
  function reopen(): ReturnType<typeof openDatabase> {
    const db = openDatabase(userFile())
    exec(db, schemaSql)
    migrate(db)
    return db
  }

  it('★ resetToBundled：关连接 → 覆盖 → 重开，读到的是内置数据', () => {
    const { db: dirty, sentinel } = makeDirtyDb()
    expect(sentinel).toBe(1) // 前提：脏数据确实写进去了
    const dirtyCount = counts(dirty).observations

    // index.ts 的 resetDatabase() 就是这几步
    resetToBundled(userFile(), SHIPPED, dirty)
    const fresh = reopen()
    expect(migrate(fresh).to).toBe(SCHEMA_VERSION)

    expect(sentinelRows(fresh), '重置后脏数据仍在——覆盖的不是这个文件').toBe(0)
    expect(getSeries(fresh, 'cn.gdp.yoy').length, '删掉的指标没回来').toBeGreaterThan(0)
    expect(counts(fresh).observations).not.toBe(dirtyCount) // 用户改出来的行数被换掉了
    close(fresh)
  })

  it('★ 反例：跳过 close 直接覆盖，重置被旧连接整个吃掉', () => {
    // 这个测试断言的是**一个错误做法的行为**，故意的。
    // 它是 restoreUserDb 那句「必须先关连接」警告的实证：
    // copyFileSync 就地截断写、inode 不变，旧连接并不指向已消失的文件，
    // 它仍持有自己的 WAL；覆盖之后 SQLite 把那份 WAL 重放回去，
    // 于是新连接读到的是「旧数据 + 旧连接的后续写入」，内置文件被整个盖掉。
    //
    // 换句话说：不关连接时重置**不报错，但一行都没换**。
    // 哪天 SQLite 的行为变了，这条会失败——那时该重新审视那段注释，
    // 而不是把测试改绿。
    const { db: stale } = makeDirtyDb()

    restoreUserDb(userFile(), SHIPPED) // 故意跳过 close(stale)
    stale.close()

    const fresh = reopen()
    expect(sentinelRows(fresh), '反例的前提不成立了——重置居然生效了，请重新验证注释').toBe(1)
    close(fresh)
  })
})

describe('resources/macro.db · 随项目提交的那份文件', () => {
  /**
   * 整段都先在临时目录里复制一份再打开：`openDatabase` 会执行
   * `PRAGMA journal_mode = WAL`，那会改写文件头。直接开真文件的话，
   * 跑一次测试就把它改了，git 里会多出一处莫名其妙的 diff。
   */
  function openShippedCopy(): ReturnType<typeof openDatabase> {
    const tmp = join(dir, 'shipped.db')
    copyFileSync(SHIPPED, tmp)
    return openDatabase(tmp)
  }

  it('文件存在，且确实是 SQLite 文件', () => {
    expect(existsSync(SHIPPED), `${SHIPPED} 不存在——应用启动会直接失败`).toBe(true)
    // 135 KB 的二进制提交进 git，最典型的坏法有两种：被 Git LFS 换成
    // 指针文件、或是合并冲突留下文本标记。两者在 `git status` 里都不显形，
    // 直到应用启动才炸。校验 magic header 最省事也最直接。
    const head = readFileSync(SHIPPED).subarray(0, 16).toString('latin1')
    expect(head, '内置数据库不是 SQLite 文件').toBe('SQLite format 3\u0000')
  })

  it('★ 每个指标都有观测，且没有 INDICATORS 之外的指标 id', () => {
    const db = openShippedCopy()
    const ids = (
      db.prepare('SELECT indicator_id, COUNT(*) AS c FROM observation GROUP BY indicator_id').all() as Array<{
        indicator_id: string
        c: number
      }>
    ).reduce<Record<string, number>>((m, r) => ({ ...m, [r.indicator_id]: r.c }), {})

    for (const ind of INDICATORS) {
      // 界面按指标逐个查序列。缺一个就是点进去一片空白，且没有任何报错。
      expect(ids[ind.id] ?? 0, `${ind.id} 在内置库里没有数据`).toBeGreaterThan(0)
    }
    const known = new Set(INDICATORS.map((i) => i.id))
    for (const id of Object.keys(ids)) {
      expect(known.has(id), `内置库里出现了未登记的指标 ${id}`).toBe(true)
    }
    close(db)
  })

  it('★ 五种 status 都有样本', () => {
    const db = openShippedCopy()
    const got = new Set(
      (db.prepare('SELECT DISTINCT status FROM observation').all() as Array<{ status: string }>).map(
        (r) => r.status,
      ),
    )
    const all: ObsStatus[] = ['ok', 'prelim', 'revised', 'missing', 'merged']
    for (const s of all) {
      // 缺哪个，App.tsx 里对应的渲染分支就永远没被真正跑过
      expect(got, `内置库里没有 status='${s}' 的样本`).toContain(s)
    }
    close(db)
  })

  it('★ 版本不超过代码，且没有 seed_version 残留', () => {
    const db = openShippedCopy()
    const meta = Object.fromEntries(
      (
        db.prepare('SELECT key, value FROM app_meta').all() as Array<{ key: string; value: string }>
      ).map((r) => [r.key, r.value]),
    )
    // 库比代码新 → migrate() 会拒绝打开；这里提前失败，报错更清楚
    expect(Number(meta['schema_version'])).toBeLessThanOrEqual(SCHEMA_VERSION)
    // seed_version 是「启动时灌种子」时代的戳。数据现在随文件而来，
    // 这个键留着会让下一个读代码的人以为还有生成器。
    expect(meta['seed_version']).toBeUndefined()
    close(db)
  })

  it('★ 保留 schema.sql 的幂等性：在内置库上重放基线不报错、不改变行数', () => {
    const db = openShippedCopy()
    const before = (db.prepare('SELECT COUNT(*) AS c FROM observation').get() as { c: number }).c
    exec(db, schemaSql)
    expect(migrate(db).to).toBe(SCHEMA_VERSION)
    const after = (db.prepare('SELECT COUNT(*) AS c FROM observation').get() as { c: number }).c
    // 每次启动都会走这条路径（index.ts 的 openAndMigrate），必须无副作用
    expect(after).toBe(before)
    close(db)
  })
})

describe('resources/macro.db · 经查询层读（UI 实际走的那条路）', () => {
  /**
   * 上面几段用的是裸 SQL。这一段走 `queries.ts`——界面每一个数字都从
   * 这里出来。断言的是**界面依赖的性质**，不是某个具体数值：
   * 数值是冻结的，性质才是会随代码改动而破的东西。
   */
  function openShippedCopy(): ReturnType<typeof openDatabase> {
    const tmp = join(dir, 'shipped.db')
    copyFileSync(SHIPPED, tmp)
    return openDatabase(tmp)
  }

  it('★ 每个指标的序列非空、按 period_end 升序、期间无重复', () => {
    const db = openShippedCopy()
    for (const ind of INDICATORS) {
      const rows = getSeries(db, ind.id)
      expect(rows.length, `${ind.id} 读不出数据`).toBeGreaterThan(0)

      // App.tsx 用 rows.at(-1) 当「最新一期」，靠的就是这个顺序
      const ends = rows.map((r) => r.periodEnd)
      expect([...ends].sort(), `${ind.id} 的 period_end 未升序`).toEqual(ends)

      // 主键是 (indicator_id, period, revision)。同期间多条只允许出现在
      // 有修订的指标上，否则界面的「最新一期」会随机取到其中一条。
      const dup = rows.length - new Set(rows.map((r) => r.period)).size
      if (dup > 0) expect(ind.id, `${ind.id} 同期间有 ${dup} 条重复`).toBe('cn.gdp.yoy')
    }
    close(db)
  })

  it('期间字符串与指标频率一致', () => {
    const db = openShippedCopy()
    for (const ind of INDICATORS) {
      const re = ind.frequency === 'quarter' ? /^\d{4}Q[1-4]$/ : /^\d{4}-\d{2}$/
      for (const r of getSeries(db, ind.id)) {
        expect(r.period, `${ind.id} 的期间格式不对`).toMatch(re)
      }
    }
    close(db)
  })

  it('★ 发布日不早于期末', () => {
    const db = openShippedCopy()
    for (const ind of INDICATORS) {
      for (const r of getSeries(db, ind.id)) {
        if (!r.releasedAt) continue
        expect(
          Date.parse(r.releasedAt),
          `${ind.id} ${r.period} 的发布日 ${r.releasedAt} 早于期末 ${r.periodEnd}`,
        ).toBeGreaterThanOrEqual(Date.parse(r.periodEnd))
      }
    }
    close(db)
  })

  it('counts / getMeta / sourceHealth 与库内容一致', () => {
    const db = openShippedCopy()
    const raw = (db.prepare('SELECT COUNT(*) AS c FROM observation').get() as { c: number }).c
    const c = counts(db)
    expect(c.observations).toBe(raw)
    expect(c.latestPeriod).toMatch(/^\d{4}(-\d{2}|Q[1-4])$/)

    // 页脚「最近采集」直接印它，为空会显示成「—」
    expect(getMeta(db, 'last_fetch_at')).toBeTruthy()

    // 页脚的健康点：id 对不上就会永远显示「未采集」
    const [health] = sourceHealth(db, [MOCK_SOURCE])
    expect(health?.status).toBe('ok')
    expect(health?.nameZh).toBe('示例数据')
    close(db)
  })

  it('空库上的行为：counts 为 0、getSeries 返回空数组而不是抛错', () => {
    // 「重置示例数据」失败或内置文件为空时，界面必须还能开成一块白板，
    // 而不是整个崩掉。这条守的是那条降级路径。
    const empty = openDatabase(join(dir, 'empty.db'))
    exec(empty, schemaSql)
    migrate(empty)
    expect(counts(empty).observations).toBe(0)
    expect(counts(empty).latestPeriod).toBeNull()
    expect(getSeries(empty, 'cn.cpi.yoy')).toEqual([])
    close(empty)
  })
})
