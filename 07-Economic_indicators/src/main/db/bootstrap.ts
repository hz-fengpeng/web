import { copyFileSync, existsSync, mkdirSync, rmSync } from 'node:fs'
import { dirname } from 'node:path'
import { close, type Db } from './adapter'

/**
 * 内置数据库的落地。
 *
 * **应用不生成任何数据**。`resources/macro.db` 是随项目一起发布的、已经装好
 * 观测的 SQLite 文件，由 `fetcher/`（Python，akshare）在开发机上离线抓来；
 * 应用只读它。**每次启动都把它覆盖到 userData**，所以界面手上的库永远是随包
 * 发布的那一份的副本——「界面上写的来历」与「库里的内容」因此不可能对不上，
 * 不需要再去读什么标记位来保证这件事。
 *
 * 为什么是复制而不是直接打开内置文件：
 *
 * · **迁移要写。** `migrate()` 要写 `app_meta.schema_version`，以后 schema
 *   变更也要写。只读打开会让这些写操作无处可去；可写打开则是往应用包内部写
 *   ——打包后那是 `.app` 的一部分，装到 /Applications 下不一定可写，
 *   即便可写也是错的（校验签名会失败）。
 * · **程序与数据分开。** 放 userData 是 Electron 的惯例：安装包只读，
 *   运行期该可写的东西写在用户目录下。
 *
 * 覆盖掉 userData 那份**不丢任何东西**：应用从不写 `observation`——唯一写过
 * 它的是一段补合成观测的目录升级（`catalog.ts`），已随假数据逻辑一起删除；
 * `migrate()` 只写 `schema_version`。换句话说，那份文件只是内置库的运行期副本，
 * 不是「用户的数据」。代价只在运行期改库的场合出现（比如用 sqlite3 手工改坏了
 * 它），而那种场合有「重置数据」按钮当场恢复。
 */

/** 内置库的文件名。dev 在 `resources/`，打包后在 `process.resourcesPath`。 */
export const BUNDLED_DB = 'macro.db'

/**
 * 上游源登记表。
 *
 * ★ `id` 必须与 Python 抓取器写进 `fetch_log.source_id` 的值一致
 * （`fetcher/macro_fetcher/mapping.py` 里每条规则的 `source` 字段），
 * 否则数据管理页会把每个源都显示成「从未采集」。有测试钉住这组 id。
 *
 * 记的是**上游站点**而不是 `akshare`：akshare 只是搬运方式，数据实际来自
 * 这三家。用户看到的应该是「国家统计局」，不是中间经手的库。
 */
export const REAL_SOURCES: ReadonlyArray<{ id: string; nameZh: string }> = [
  { id: 'nbs', nameZh: '国家统计局' },
  { id: 'eastmoney', nameZh: '东方财富' },
  { id: 'safe', nameZh: '国家外汇管理局' },
] as const

/**
 * 重置的完整序列：**先关连接**，再覆盖文件。给 `index.ts` 调用。
 *
 * 抽成函数不是为了复用，是为了让「必须先关连接」这条约束能被测到。
 * 顺序错了不会报任何错，只是重置**静默失效**——见下面 `restoreUserDb`
 * 的说明，bootstrap.test.ts 里有一个反例测试专门钉住这个行为。
 */
export function resetToBundled(userFile: string, bundledFile: string, current: Db | null): void {
  if (current) close(current)
  restoreUserDb(userFile, bundledFile)
}

/**
 * 用内置库覆盖用户目录那份。
 *
 * 两个调用点，语义都是「让 userData 那份回到内置文件的样子」：
 * 启动时（`index.ts` 的 `initDatabase`，此时还没有任何连接）和用户点
 * 「重置数据」时（`resetToBundled`，它负责先关连接）。
 *
 * ⚠️ **调用前必须关掉所有指向 userFile 的连接**，否则覆盖会静默失效。
 * 生产代码请走上面的 `resetToBundled`。
 *
 * 失效机制（实测，见 bootstrap.test.ts 的反例测试）：`copyFileSync` 是
 * 就地截断写，inode 不变，所以旧连接并不「指向一个已消失的文件」——
 * 它继续持有自己的 WAL 和页缓存。覆盖完成后 SQLite 会把那份 WAL 重放
 * 到刚写好的文件上，结果是：
 *
 * · 旧连接读到的仍是覆盖前的数据（测试里是 100 行，而不是内置的 3 行）；
 * · 旧连接还能继续写，而且写得进去；
 * · **新开的连接读到的是「旧数据 + 旧连接的后续写入」**——内置文件被整个盖掉了。
 *
 * 也就是说：不关连接时，重置看起来成功了（不抛错、返回值正常），
 * 实际一行都没换成。这比「读到旧数据」严重得多。
 */
export function restoreUserDb(userFile: string, bundledFile: string): void {
  // 覆盖前清掉 WAL 残留：留着旧的 -wal 配新的主库文件，SQLite 会拿它做恢复，
  // 恢复出来的是两次写入的混合体。启动时同样要清——上一次会话正常退出也会
  // 在 userData 里留下 -wal（SQLite 只在 checkpoint 时清它）。
  rmSync(`${userFile}-wal`, { force: true })
  rmSync(`${userFile}-shm`, { force: true })
  copyInto(userFile, bundledFile)
}

function copyInto(userFile: string, bundledFile: string): void {
  if (!existsSync(bundledFile)) {
    // 说清楚是哪个文件、为什么找不着——打包配置漏了 extraResources 时
    // 就是这个症状，报错里没有路径的话很难定位。
    throw new Error(
      `内置数据库缺失：${bundledFile}\n` +
        '该文件应随项目提供；打包时需在 electron-builder 的 extraResources 里带上它。',
    )
  }
  mkdirSync(dirname(userFile), { recursive: true })
  copyFileSync(bundledFile, userFile)
}
