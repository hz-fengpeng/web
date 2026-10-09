import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync, copyFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { INDICATORS } from '@shared/indicators'
import { periodEnd } from '@shared/period'
import type { ObsStatus } from '@shared/types'
import { close, exec, openDatabase, type Db } from './adapter'
import { BUNDLED_DB, REAL_SOURCES, resetToBundled, restoreUserDb } from './bootstrap'
import { SCHEMA_VERSION, migrate } from './migrate'
import { counts, getMeta, getSeries, sourceHealth } from './queries'
import schemaSql from './schema.sql?raw'

/**
 * 内置数据库的摆放逻辑。
 *
 * 这里守两件事：
 *  1. **覆盖语义**——每次启动都用内置文件盖掉 userData 里那份。应用从不写
 *     `observation`（运行期唯一的写入是 `migrate()` 记的 `schema_version`），
 *     所以那份库只是内置库的运行期副本，覆盖不丢任何东西；换来的是
 *     「界面手上的库就是随包发布的那一份」这条**结构性**保证。
 *  2. **随项目提交的那份文件本身**。`resources/macro.db` 装的是
 *     **真实统计数据**，由 `fetcher/`（Python，akshare）离线抓取后落盘。
 *
 * 第 2 条的重点是「**真不真**」：整个应用会对着这个文件声明「真实统计数据」，
 * 横幅、图表署名、CSV 出处列都以此为据。所以下面查的不是「数据够不够多」，
 * 而是有没有混进第二条来路的数据——合成值残留、假的修订记录、来源不明的
 * 指标 id，都在这一层拦下。
 */

const SHIPPED = resolve('resources', BUNDLED_DB)

/**
 * 「这个指标的观测是真抓来的」的判据。
 *
 * 取自 `fetch_log` 里带指标 id 的明细行——抓取器每跑一个指标就写一条，
 * 记着它来自哪个源。**故意不另抄一份 id 清单**：清单是声明，而 fetch_log
 * 是抓取器实际做过的事的流水；两者对不上，正是要在这里抓出来的东西。
 *
 * 这条判据挡不住「抓取器既写了行又顺手写了日志」这种自洽的错，但那种错
 * 得先在 `mapping.py` 里编一条规则才可能发生，而规则表本身有 Python 侧的
 * 测试盯着（`fetcher/tests/test_mapping.py`）。
 */
function sourcedIds(db: Db): Set<string> {
  const rows = db
    .prepare(
      `SELECT DISTINCT indicator_id FROM fetch_log
        WHERE indicator_id IS NOT NULL AND source_id IN ('eastmoney', 'nbs', 'safe')`,
    )
    .all() as Array<{ indicator_id: string }>
  return new Set(rows.map((r) => r.indicator_id))
}

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
    restoreUserDb(userFile(), fakeBundled())
    expect(readFileSync(userFile(), 'utf8')).toBe('BUNDLED-CONTENT')
  })

  it('★ 每次启动都覆盖：用户改过的那份被换回内置库', () => {
    writeFileSync(userFile(), 'USER-EDITED')
    restoreUserDb(userFile(), fakeBundled())
    // 覆盖掉用户改过的那份，在别的应用里是数据丢失，在这里不是：应用从不写
    // `observation`，那份文件只是内置库的运行期副本。代价只在「用 sqlite3
    // 手工改过它」时出现，而那有「重置数据」按钮、也有下一次启动。
    expect(readFileSync(userFile(), 'utf8')).toBe('BUNDLED-CONTENT')
  })

  it('用户目录不存在时会被建出来', () => {
    const nested = join(dir, 'a', 'b', 'macro.db')
    restoreUserDb(nested, fakeBundled())
    expect(existsSync(nested)).toBe(true)
  })

  it('★ 内置文件缺失时抛错，且错误里带路径', () => {
    const missing = join(dir, 'nope.db')
    // 打包漏配 extraResources 时就是这个症状。报错里没有路径的话，
    // 只能看到一个光秃秃的 ENOENT（甚至更糟：一个空库被建出来）。
    expect(() => restoreUserDb(userFile(), missing)).toThrow(/nope\.db/)
    expect(existsSync(userFile())).toBe(false)
  })

  it('★ 覆盖时清掉 WAL 残留', () => {
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

  it('★ 内置文件缺失时，用户那份原样留着（不静默清空）', () => {
    writeFileSync(userFile(), 'USER-EDITED')
    expect(() => restoreUserDb(userFile(), join(dir, 'nope.db'))).toThrow(/nope\.db/)
    // 清 WAL 在前、复制在后：抛错时主库文件还没被碰过，不是「先截断再发现没源」。
    expect(readFileSync(userFile(), 'utf8')).toBe('USER-EDITED')
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

  it('★ 没有 INDICATORS 之外的指标 id', () => {
    const db = openShippedCopy()
    const ids = (
      db.prepare('SELECT DISTINCT indicator_id FROM observation').all() as Array<{
        indicator_id: string
      }>
    ).map((r) => r.indicator_id)

    const known = new Set(INDICATORS.map((i) => i.id))
    for (const id of ids) {
      expect(known.has(id), `内置库里出现了未登记的指标 ${id}`).toBe(true)
    }
    close(db)
  })

  it('★ 有观测的指标全部来自已接入的取数规则', () => {
    // 「库里每一条观测都必须是真实的」——这是整个改造的立身之本，
    // 也是应用敢对整库声明「真实统计数据」的唯一理由（开发文档 §14.4）。
    //
    // 实测踩过一次：第一版改造只清了 18 个已接入指标的合成基线，P1/P2 那
    // 7911 行原样留着（和改造前的库逐字节相同）。结果是界面、图表、CSV
    // 一起对着 76% 的合成数据说「真实统计数据」。抓取器现在每次运行都会
    // 清掉没人认领的指标（`_plan_unclaimed`），这条断言就是那个不变量的看门人。
    const db = openShippedCopy()
    const ids = (
      db.prepare('SELECT DISTINCT indicator_id FROM observation').all() as Array<{
        indicator_id: string
      }>
    ).map((r) => r.indicator_id)
    expect(ids.length).toBeGreaterThan(0)
    const sourced = sourcedIds(db)
    for (const id of ids) {
      // 例外只有登记过的无源指标：它们有行，但行里没有值。
      // 有值却没有采集流水 → 这条值不是抓来的。
      const hasValue = (
        db.prepare('SELECT COUNT(*) AS c FROM observation WHERE indicator_id = ? AND value IS NOT NULL')
          .get(id) as { c: number }
      ).c
      if (hasValue > 0) {
        expect(sourced.has(id), `${id} 有值，但 fetch_log 里没有它的采集记录——可能是合成值残留`).toBe(true)
      }
    }
    close(db)
  })

  it('★ status 只出现 ok / merged / missing，且没有一行 revised', () => {
    const db = openShippedCopy()
    const got = new Set(
      (db.prepare('SELECT DISTINCT status FROM observation').all() as Array<{ status: string }>).map(
        (r) => r.status,
      ),
    )
    const all: ObsStatus[] = ['ok', 'prelim', 'revised', 'missing', 'merged']
    for (const s of got) expect(all, `出现了未知的 status：${s}`).toContain(s)

    // ★ 这条是踩出来的。改造第一版把「合成值 → 真实值」判成了修订，
    // 于是 2140 行真实值以 revision=1、status='revised' 落库，revision=0
    // 留着编出来的数。界面上满屏「已修订」，读起来像统计局改了数——
    // 那是错误的信息，不只是不好看。正确做法是换库（rebase），从 0 开始。
    expect(got, '真实数据被记成了修订——那会把我们自己换数据说成统计局改数').not.toContain('revised')

    // ok 是主体；merged 用来标 1—2 月合并发布，界面画菱形靠它；
    // missing 是无源指标如实留的空行，一个都不能少
    expect(got).toContain('ok')
    expect(got).toContain('merged')
    expect(got).toContain('missing')

    // prelim / revised 在内置文件里没有样本：18 条序列的上游都是发布即终值，
    // 修订要等抓取器后续运行才可能出现。也就是说 App.tsx 里这两个状态的
    // 渲染分支**不再被这个文件覆盖**，改动它们时不能指望这里报警。
    close(db)
  })

  it('★ 绝不编数：5 个无源指标的观测全是空值', () => {
    // 「没有的就先不要实现」——上游不发布、或渠道取不到的指标，宁可在库里
    // 留一条全空的序列，也不拿合成值顶上。这条断言守的就是「绝不编数」。
    const db = openShippedCopy()
    for (const id of ['cn.cpi_core.yoy', 'cn.fai.cum_yoy', 'cn.ind_prod.mom', 'cn.re.cum_yoy', 'cn.tsf.stock_yoy']) {
      const rows = getSeries(db, id)
      expect(rows.length, `${id} 连空行都没有——它在界面上会整条消失`).toBeGreaterThan(0)
      expect(rows.filter((r) => r.value !== null).length, `${id} 里出现了值，但它没有取数规则`).toBe(0)
      expect(rows.every((r) => r.status === 'missing'), `${id} 的空行状态不是 missing`).toBe(true)
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

  it('★ 有观测的指标：序列按 period_end 升序、期间无重复', () => {
    const db = openShippedCopy()
    for (const ind of INDICATORS) {
      const rows = getSeries(db, ind.id)
      // 没接入真实数据的指标本来就是空的，界面显示「暂无数据」。
      // 有行才谈得上顺序。
      if (rows.length === 0) continue

      // App.tsx 用 rows.at(-1) 当「最新一期」，靠的就是这个顺序
      const ends = rows.map((r) => r.periodEnd)
      expect([...ends].sort(), `${ind.id} 的 period_end 未升序`).toEqual(ends)

      // 主键是 (indicator_id, period, revision)，同期间多条只允许是有修订历史。
      // 真实库里现在一条修订都没有——18 条序列的上游都发布即终值。
      const dup = rows.length - new Set(rows.map((r) => r.period)).size
      expect(dup, `${ind.id} 同期间有 ${dup} 条重复，界面「最新一期」会随机取一条`).toBe(0)
    }
    close(db)
  })

  it('★ 18 个已接入的指标都有非空值，且没有一条 revision > 0', () => {
    const db = openShippedCopy()
    const sourced = sourcedIds(db)
    expect(sourced.size, 'fetch_log 里一条采集记录都没有？').toBeGreaterThan(0)
    expect(sourced.size).toBeLessThan(INDICATORS.length) // 确实只是 P0 里的一部分
    for (const id of sourced) {
      const rows = getSeries(db, id)
      expect(rows.filter((r) => r.value !== null).length, `${id} 有采集记录却一条真实值都没有`).toBeGreaterThan(0)
      expect(rows.every((r) => r.revision === 0), `${id} 有修订行，但真实值不该以修订形式落库`).toBe(true)
    }
    close(db)
  })

  it('期间字符串与指标频率一致', () => {
    const db = openShippedCopy()
    for (const ind of INDICATORS) {
      const re = {
        day: /^\d{4}-\d{2}-\d{2}$/, month: /^\d{4}-\d{2}$/, quarter: /^\d{4}Q[1-4]$/, year: /^\d{4}$/,
      }[ind.frequency]
      for (const r of getSeries(db, ind.id)) {
        expect(r.period, `${ind.id} 的期间格式不对`).toMatch(re)
        expect(r.periodEnd).toBe(periodEnd(r.period))
      }
    }
    close(db)
  })

  it('★ 发布日符合期间语义：LPR 为当月报价，其余不早于期末', () => {
    const db = openShippedCopy()
    for (const ind of INDICATORS) {
      for (const r of getSeries(db, ind.id)) {
        if (!r.releasedAt) continue
        if (ind.id.startsWith('cn.lpr.')) {
          // 报价在当月 20 日公布，月末只是对齐日期；不能把报价伪造为次月发布。
          expect(r.releasedAt.slice(0, 7)).toBe(r.period)
          expect(Number(r.releasedAt.slice(8))).toBeGreaterThanOrEqual(20)
          expect(Number(r.releasedAt.slice(8))).toBeLessThanOrEqual(22)
          expect([0, 6]).not.toContain(new Date(`${r.releasedAt}T00:00:00Z`).getUTCDay())
          continue
        }
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
    expect(c.latestPeriod).toMatch(/^\d{4}(-\d{2}(-\d{2})?|Q[1-4])$/)

    // 页脚「最近采集」直接印它，为空会显示成「—」
    expect(getMeta(db, 'last_fetch_at')).toBeTruthy()

    // 页脚的健康点：id 对不上就会永远显示「未采集」。
    // ★ id 必须与 Python 侧 `fetch_log.source_id` 逐字一致
    //（fetcher/macro_fetcher/mapping.py 里每条规则的 `source`）。
    for (const health of sourceHealth(db, [...REAL_SOURCES])) {
      expect(health.status, `${health.id} 在 fetch_log 里查不到记录`).not.toBe('never')
      expect(health.nameZh).toBeTruthy()
    }
    close(db)
  })

  it('空库上的行为：counts 为 0、getSeries 返回空数组而不是抛错', () => {
    // 「重置数据」失败或内置文件为空时，界面必须还能开成一块白板，
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
