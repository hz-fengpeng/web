/**
 * ⚠️ 若启动时报 "does not provide an export named 'app'" 或
 * "Cannot read properties of undefined (reading 'isPackaged')"，
 * 八成不是代码问题，而是环境里带着 ELECTRON_RUN_AS_NODE=1。
 *
 * 该变量会让 Electron 二进制退化成普通 Node：此时 require('electron')
 * 拿到的是 node_modules/electron/index.js 导出的「二进制路径字符串」，
 * 而不是 Electron API，连 `electron --version` 都会打印 Node 版本号而非
 * Electron 版本。VS Code 的集成终端会继承这个变量，用系统终端启动即可，
 * 或显式 `env -u ELECTRON_RUN_AS_NODE npm run dev`。
 */
import { app, BrowserWindow, session, shell } from 'electron'
import { join } from 'node:path'
import schemaSql from './db/schema.sql?raw'
import { close, exec, openDatabase, type Db } from './db/adapter'
import { BUNDLED_DB, ensureUserDb, resetToBundled } from './db/bootstrap'
import { migrate, SCHEMA_VERSION } from './db/migrate'
import { counts } from './db/queries'
import { registerIpc } from './ipc'

// node:sqlite 目前仍标记为实验性，首次使用时 Node 会打印 ExperimentalWarning。
// 风险已通过 db/adapter.ts 单一封装隔离（见开发文档 §4），此处仅抑制噪音。
const originalEmitWarning = process.emitWarning.bind(process)
process.emitWarning = ((warning: string | Error, ...rest: unknown[]) => {
  const msg = typeof warning === 'string' ? warning : warning.message
  if (/SQLite is an experimental feature/i.test(msg)) return
  return (originalEmitWarning as (...a: unknown[]) => void)(warning, ...rest)
}) as typeof process.emitWarning

let db: Db | null = null
let mainWindow: BrowserWindow | null = null

const isDev = !app.isPackaged

const CSP_PROD = [
  "default-src 'self'",
  "connect-src 'none'", // ★ 渲染进程完全无法发起网络请求，数据一律经主进程
  "img-src 'self' data:",
  "style-src 'self' 'unsafe-inline'",
  "script-src 'self'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
].join('; ')

const CSP_DEV = [
  "default-src 'self'",
  "connect-src 'self' ws://localhost:* http://localhost:*", // Vite HMR 需要
  "img-src 'self' data:",
  "style-src 'self' 'unsafe-inline'",
  "script-src 'self' 'unsafe-inline'",
  "object-src 'none'",
].join('; ')

/**
 * 两个库文件的位置。内置那份随项目/安装包提供，用户那份在 userData。
 *
 * dev 时 `app.getAppPath()` 是项目根目录（electron-vite 从根目录起 electron），
 * 打包后主进程代码在 `app.asar` 里，用 `app.getAppPath()` 拼 `resources/` 会
 * 指进 asar 内部——所以打包走 `process.resourcesPath`，那才是 extraResources
 * 的落点（见 electron-builder.yml）。
 */
function dbPaths(): { userFile: string; bundledFile: string } {
  return {
    userFile: join(app.getPath('userData'), BUNDLED_DB),
    bundledFile: app.isPackaged
      ? join(process.resourcesPath, BUNDLED_DB)
      : join(app.getAppPath(), 'resources', BUNDLED_DB),
  }
}

function openAndMigrate(file: string): Db {
  const handle = openDatabase(file)
  exec(handle, schemaSql) // 空库 → v1 基线；已有库无副作用（全部 IF NOT EXISTS）
  const { from, to, applied } = migrate(handle)
  console.log(
    applied.length > 0
      ? `[db] ${file}  v${from} → v${to}：${applied.join('、')}`
      : `[db] ${file}  v${to}（已是最新，期望 v${SCHEMA_VERSION}）`,
  )
  return handle
}

/**
 * **不生成数据，只摆放文件。** 数据全部来自 `resources/macro.db`——
 * 一个随项目提交的、已经装好观测的 SQLite 文件（见 db/bootstrap.ts）。
 * 首次运行把它复制到 userData，之后一直读写 userData 那份。
 */
function initDatabase(): Db {
  const { userFile, bundledFile } = dbPaths()
  const action = ensureUserDb(userFile, bundledFile)
  console.log(
    action === 'copied'
      ? `[db] 首次运行：内置示例数据已复制到 ${userFile}`
      : `[db] 使用已有数据库 ${userFile}（未覆盖）`,
  )
  return openAndMigrate(userFile)
}

/**
 * 「重置示例数据」：用内置文件覆盖 userData 那份。
 *
 * `resetToBundled` 内部会先关连接——那一步不能省，省掉的话重置会**静默失效**
 * （不报错，但一行都没换），原因见 db/bootstrap.ts 的注释。
 * 重置会换掉 `db`，所以 IPC 层拿到的是 getter 而不是句柄本身。
 */
function resetDatabase(): number {
  const { userFile, bundledFile } = dbPaths()
  resetToBundled(userFile, bundledFile, db) // 内部先 close(db)
  // 先把 db 置空再重开：万一 openAndMigrate 抛错，host.get() 会报「数据库尚未
  // 初始化」，而不是把一个已经关掉的连接交出去。
  db = null
  const handle = openAndMigrate(userFile)
  db = handle
  console.log(`[db] 已从内置文件恢复 ${userFile}`)
  return counts(handle).observations
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1320,
    height: 880,
    minWidth: 1000,
    minHeight: 640,
    show: false,
    backgroundColor: '#f9f9f7',
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      preload: join(import.meta.dirname, '../preload/index.cjs'),
      contextIsolation: true, // 必须
      nodeIntegration: false, // 必须
      sandbox: true, // 必须
    },
  })

  mainWindow.once('ready-to-show', () => mainWindow?.show())

  // 把渲染进程的错误转发到主进程日志。这是个不开 DevTools 的日常工具，
  // 界面出错时终端里必须能看见，否则只能对着白屏猜。
  const wc = mainWindow.webContents
  wc.on('did-finish-load', () => console.log('[renderer] 已加载'))
  wc.on('did-fail-load', (_e, code, desc, url) =>
    console.error(`[renderer] 加载失败 ${code} ${desc} ${url}`),
  )
  wc.on('render-process-gone', (_e, details) =>
    console.error(`[renderer] 进程退出: ${details.reason}`),
  )
  wc.on('console-message', (event) => {
    const { level, message, lineNumber, sourceId } = event as unknown as {
      level: string
      message: string
      lineNumber: number
      sourceId: string
    }
    if (level === 'error' || level === 'warning') {
      console.error(`[renderer:${level}] ${message} (${sourceId}:${lineNumber})`)
    }
  })

  // 外部链接一律交给系统浏览器，绝不在应用内导航
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url)
    return { action: 'deny' }
  })

  const devUrl = process.env['ELECTRON_RENDERER_URL']
  if (isDev && devUrl) {
    void mainWindow.loadURL(devUrl)
  } else {
    void mainWindow.loadFile(join(import.meta.dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [isDev ? CSP_DEV : CSP_PROD],
      },
    })
  })

  db = initDatabase()
  registerIpc({
    get: () => {
      if (!db) throw new Error('数据库尚未初始化')
      return db
    },
    reset: resetDatabase,
  })
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('before-quit', () => {
  if (db) {
    close(db)
    db = null
  }
})
