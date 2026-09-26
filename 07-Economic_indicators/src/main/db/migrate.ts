import { exec, tx, type Db } from './adapter'
import { getMeta, setMeta } from './queries'

/**
 * ★ 数据库版本迁移。
 *
 * 规则只有两条，但都必须严格守住：
 *
 * 1. `schema.sql` 是 **v1 基线且已冻结**。它只负责把空库建成 v1；
 *    任何后续变更（加表、加列、加索引）一律以迁移的形式追加到下面的
 *    `migrations` 数组里，绝不再回头改 `schema.sql`。
 * 2. 启动时读 `app_meta.schema_version`，只补跑「比它新」的迁移。
 *
 * 为什么要有 2：没有版本记录时，唯一的办法是每次启动都无条件重放全部
 * 迁移，靠 `CREATE TABLE IF NOT EXISTS` 掩盖。这在第一次出现
 * `ALTER TABLE ... ADD COLUMN` 时会立刻变成每次启动都抛
 * "duplicate column name"。M0 的 `initDatabase()` 正是无条件写
 * `schema_version='1'`，版本号永远被压回 1，等价于没有版本记录。
 */

/** `schema.sql` 执行完毕后，一个空库所处的版本 */
const BASELINE_VERSION = 1

interface Migration {
  /** 迁移完成后数据库所处的版本，必须从 BASELINE_VERSION + 1 起连续递增 */
  version: number
  /** 出现在启动日志里，用于事后对账 */
  label: string
  up: (db: Db) => void
}

const migrations: Migration[] = [
  {
    version: 2,
    label: 'release_index',
    // 发布页索引。M1a 只建表，M1b 的翻页回溯与增量刷新往里写，
    // 用来判断「这一页有没有新稿」而不必逐篇抓正文。
    up: (db) =>
      exec(
        db,
        `
        CREATE TABLE IF NOT EXISTS release_index (
          url          TEXT PRIMARY KEY,
          source_id    TEXT NOT NULL,
          title        TEXT NOT NULL,
          published_at TEXT,
          page         INTEGER,
          fetched_at   TEXT NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_release_recent
          ON release_index(source_id, published_at DESC);
        `,
      ),
  },
]

/** 当前代码期望的数据库版本 */
export const SCHEMA_VERSION =
  migrations.length > 0 ? migrations[migrations.length - 1]!.version : BASELINE_VERSION

// 版本号必须连续，否则「补跑比当前新的迁移」会静默跳过中间版本。
// 这是写迁移的人最容易犯的错，所以放在模块加载时直接崩掉，不留到运行时。
for (let i = 0; i < migrations.length; i++) {
  const expected = BASELINE_VERSION + 1 + i
  if (migrations[i]!.version !== expected) {
    throw new Error(
      `迁移表版本号不连续：第 ${i} 项是 v${migrations[i]!.version}，期望 v${expected}`,
    )
  }
}

export interface MigrateResult {
  from: number
  to: number
  applied: string[]
}

export function migrate(db: Db): MigrateResult {
  const raw = getMeta(db, 'schema_version')

  let current: number
  if (raw === null) {
    // 空库：schema.sql 刚把基线建好，但还没记版本
    current = BASELINE_VERSION
  } else {
    current = Number.parseInt(raw, 10)
    if (!Number.isInteger(current) || current < BASELINE_VERSION) {
      throw new Error(`app_meta.schema_version 值非法：${JSON.stringify(raw)}`)
    }
  }

  if (current > SCHEMA_VERSION) {
    // 用旧版程序打开新版数据库。继续跑会以旧 schema 读写新表，坏数据比崩溃更贵。
    throw new Error(
      `数据库版本 v${current} 高于本程序支持的 v${SCHEMA_VERSION}，请升级程序后再打开`,
    )
  }

  const applied: string[] = []
  let version = current
  for (const m of migrations) {
    if (m.version <= version) continue
    // 每个迁移单独一个事务：中途失败时已成功的那些保持已提交，
    // 版本号也跟着停在最后一个成功的迁移上，下次启动从这里续。
    tx(db, () => m.up(db))
    setMeta(db, 'schema_version', String(m.version))
    version = m.version
    applied.push(`v${m.version} ${m.label}`)
  }

  // 空库且没有任何迁移可跑（迁移表尚为空）时，版本号仍是 null，
  // 补记一次，让下次启动能走「读版本 → 无事可做」的正常路径。
  if (applied.length === 0 && raw === null) {
    setMeta(db, 'schema_version', String(version))
  }

  return { from: current, to: version, applied }
}
