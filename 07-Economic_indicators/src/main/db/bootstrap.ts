import { copyFileSync, existsSync, mkdirSync, rmSync } from 'node:fs'
import { dirname } from 'node:path'
import { close, type Db } from './adapter'

/**
 * 内置示例数据库的落地。
 *
 * **应用不生成任何数据。** `resources/macro.db` 是随项目一起发布的、
 * 已经装好 535 条观测的 SQLite 文件——生成它的脚本已删除（见开发文档 §3.2.0）。
 * 启动时只做一件事：把它复制到 userData，之后一律读写 userData 那份。
 *
 * 为什么是复制而不是直接打开内置文件：
 *
 * · **迁移要写。** `migrate()` 要写 `app_meta.schema_version`，以后 schema
 *   变更也要写。只读打开会让这些写操作无处可去；可写打开则是往应用包内部写
 *   ——打包后那是 `.app` 的一部分，装到 /Applications 下不一定可写，
 *   即便可写也是错的（校验签名会失败，用户数据也不该混在程序里）。
 * · **用户数据不随安装包被覆盖。** 放 userData 是 Electron 的惯例。
 */

/** 内置库的文件名。dev 在 `resources/`，打包后在 `process.resourcesPath`。 */
export const BUNDLED_DB = 'macro.db'

/**
 * 内置数据的来源描述符，用于界面底部的健康状态。
 *
 * 库里 `fetch_log.source_id` 写的就是 `mock`。**它不是抓取器**——没有任何
 * 代码会去取数。之所以还留一条 fetch_log，是为了让「这批数据是什么、
 * 什么时候进库的」在界面上有处可查。
 */
export const MOCK_SOURCE = { id: 'mock', nameZh: '示例数据' } as const

export type BootstrapAction = 'kept' | 'copied'

/**
 * 首次运行把内置库复制到用户目录。已存在则**原样保留**，不覆盖。
 *
 * 「已存在」是唯一的判据：用户可能已经手动改过库、或它已经从旧版本迁移过，
 * 那些都比刚复制进来的内置文件更权威。
 */
export function ensureUserDb(userFile: string, bundledFile: string): BootstrapAction {
  if (existsSync(userFile)) return 'kept'
  copyInto(userFile, bundledFile)
  return 'copied'
}

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
 * 用内置库覆盖用户目录那份，恢复到出厂状态。
 *
 * ⚠️ **调用前必须关掉所有指向 userFile 的连接**，否则重置会静默失效。
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
  // 恢复出来的是两次写入的混合体。
  rmSync(`${userFile}-wal`, { force: true })
  rmSync(`${userFile}-shm`, { force: true })
  copyInto(userFile, bundledFile)
}

function copyInto(userFile: string, bundledFile: string): void {
  if (!existsSync(bundledFile)) {
    // 说清楚是哪个文件、为什么找不着——打包配置漏了 extraResources 时
    // 就是这个症状，报错里没有路径的话很难定位。
    throw new Error(
      `内置示例数据库缺失：${bundledFile}\n` +
        '该文件应随项目提供；打包时需在 electron-builder 的 extraResources 里带上它。',
    )
  }
  mkdirSync(dirname(userFile), { recursive: true })
  copyFileSync(bundledFile, userFile)
}
