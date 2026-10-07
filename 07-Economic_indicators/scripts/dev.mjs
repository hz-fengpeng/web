import { spawn, spawnSync } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const require = createRequire(import.meta.url)
const platformPath = process.platform === 'darwin' ? 'Electron.app/Contents/MacOS/Electron'
  : process.platform === 'win32' ? 'electron.exe' : 'electron'

/** 不 require('electron')：新版本的入口会自行联网，无法先检查缺失状态。 */
export function prepareElectron({ moduleDir = dirname(require.resolve('electron/package.json')), env = process.env } = {}) {
  const runtimeEnv = { ...env }
  delete runtimeEnv.ELECTRON_RUN_AS_NODE
  const version = JSON.parse(readFileSync(join(moduleDir, 'package.json'), 'utf8')).version
  if (runtimeEnv.ELECTRON_EXEC_PATH) {
    if (!existsSync(runtimeEnv.ELECTRON_EXEC_PATH)) throw new Error('ELECTRON_EXEC_PATH 指向的可执行文件不存在')
    return { env: runtimeEnv, version }
  }
  const pathFile = join(moduleDir, 'path.txt')
  const distDir = runtimeEnv.ELECTRON_OVERRIDE_DIST_PATH || join(moduleDir, 'dist')
  const executable = join(distDir, platformPath)
  const ready = () => {
    try {
      return existsSync(executable) && readFileSync(join(distDir, 'version'), 'utf8').trim().replace(/^v/, '') === version
    } catch { return false }
  }
  if (!ready()) {
    console.log(`[dev] Electron ${version} 可执行文件缺失或版本不匹配，正在补装…`)
    const installEnv = { ...runtimeEnv }
    delete installEnv.ELECTRON_SKIP_BINARY_DOWNLOAD
    if (installEnv.HTTPS_PROXY || installEnv.HTTP_PROXY || installEnv.https_proxy || installEnv.http_proxy) {
      installEnv.ELECTRON_GET_USE_PROXY ??= '1'
    }
    const result = spawnSync(process.execPath, [join(moduleDir, 'install.js')], { env: installEnv, stdio: 'inherit' })
    if (result.error || result.status !== 0 || !ready()) {
      throw new Error('Electron 补装未完成。请检查下载网络后运行 npm run setup:electron。\n' +
        '使用代理时设置 HTTPS_PROXY=http://127.0.0.1:端口；使用镜像时设置 ELECTRON_MIRROR。安装器会校验下载文件。')
    }
  }
  // 可执行文件完整但安装中断丢失 path.txt 时，无需重新下载。
  if (!existsSync(pathFile) || readFileSync(pathFile, 'utf8').trim() !== platformPath) {
    writeFileSync(pathFile, platformPath)
  }
  runtimeEnv.ELECTRON_EXEC_PATH = executable
  return { env: runtimeEnv, version }
}

function main() {
  const { env, version } = prepareElectron()
  if (process.argv[2] === '--setup') {
    console.log(`[dev] Electron ${version} 已就绪`)
    return
  }
  const viteDir = dirname(require.resolve('electron-vite/package.json'))
  const vitePackage = JSON.parse(readFileSync(join(viteDir, 'package.json'), 'utf8'))
  const child = spawn(process.execPath, [join(viteDir, vitePackage.bin['electron-vite']), 'dev', ...process.argv.slice(2)], {
    env, stdio: 'inherit',
  })
  for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => child.kill(signal))
  child.on('error', (error) => { console.error(`[dev] ${error.message}`); process.exitCode = 1 })
  child.on('exit', (code, signal) => { process.exitCode = code ?? (signal === 'SIGINT' ? 130 : 143) })
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  try { main() } catch (error) { console.error(`[dev] ${error.message}`); process.exitCode = 1 }
}
