import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { prepareElectron } from './dev.mjs'

let dir
const version = '44.4.5'
const platformPath = process.platform === 'darwin' ? 'Electron.app/Contents/MacOS/Electron'
  : process.platform === 'win32' ? 'electron.exe' : 'electron'
function installed() {
  const executable = join(dir, 'dist', platformPath)
  mkdirSync(join(executable, '..'), { recursive: true })
  writeFileSync(executable, 'TEST EXECUTABLE')
  writeFileSync(join(dir, 'dist', 'version'), version)
}
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'macro-runtime-'))
  writeFileSync(join(dir, 'package.json'), JSON.stringify({ version }))
})
afterEach(() => rmSync(dir, { recursive: true, force: true }))

describe('开发启动前的 Electron 检查', () => {
  it('已有完整安装不调用安装器，恢复缺失的 path.txt，删除子进程的 RUN_AS_NODE', () => {
    installed()
    const env = { ...process.env, ELECTRON_RUN_AS_NODE: '1' }
    const result = prepareElectron({ moduleDir: dir, env })
    expect(result.env.ELECTRON_RUN_AS_NODE).toBeUndefined()
    expect(env.ELECTRON_RUN_AS_NODE).toBe('1')
    expect(readFileSync(join(dir, 'path.txt'), 'utf8')).toBe(platformPath)
    expect(result.env.ELECTRON_EXEC_PATH).toBe(join(dir, 'dist', platformPath))
  })
  it('缺失时调用安装器，代理配置生效，完成后才允许启动', () => {
    writeFileSync(join(dir, 'install.js'), `
      const fs = require('node:fs'); const path = require('node:path');
      fs.writeFileSync(path.join(__dirname,'installer-env.json'), JSON.stringify({ ELECTRON_GET_USE_PROXY: process.env.ELECTRON_GET_USE_PROXY, HTTPS_PROXY: process.env.HTTPS_PROXY, ELECTRON_RUN_AS_NODE: process.env.ELECTRON_RUN_AS_NODE, ELECTRON_SKIP_BINARY_DOWNLOAD: process.env.ELECTRON_SKIP_BINARY_DOWNLOAD }));
      const executable = path.join(__dirname,'dist',${JSON.stringify(platformPath)});
      fs.mkdirSync(path.dirname(executable),{recursive:true}); fs.writeFileSync(executable,'TEST');
      fs.writeFileSync(path.join(__dirname,'dist','version'),${JSON.stringify(version)});
    `)
    const result = prepareElectron({ moduleDir: dir, env: {
      ...process.env, HTTPS_PROXY: 'http://127.0.0.1:7897', ELECTRON_RUN_AS_NODE: '1', ELECTRON_SKIP_BINARY_DOWNLOAD: '1',
    } })
    const installerEnv = JSON.parse(readFileSync(join(dir, 'installer-env.json'), 'utf8'))
    expect(installerEnv.ELECTRON_GET_USE_PROXY).toBe('1')
    expect(installerEnv.HTTPS_PROXY).toBe('http://127.0.0.1:7897')
    expect(installerEnv.ELECTRON_RUN_AS_NODE).toBeUndefined()
    expect(installerEnv.ELECTRON_SKIP_BINARY_DOWNLOAD).toBeUndefined()
    expect(existsSync(result.env.ELECTRON_EXEC_PATH)).toBe(true)
  })
  it('版本不匹配时触发补装，失败不写虚假的 path.txt', () => {
    installed()
    writeFileSync(join(dir, 'dist', 'version'), '22.0.0')
    writeFileSync(join(dir, 'install.js'), 'process.exit(1)')
    expect(() => prepareElectron({ moduleDir: dir })).toThrow('补装未完成')
    expect(existsSync(join(dir, 'path.txt'))).toBe(false)
  })
  it('安装器即使成功退出但未产生可执行文件，也明确失败', () => {
    writeFileSync(join(dir, 'install.js'), 'process.exit(0)')
    expect(() => prepareElectron({ moduleDir: dir })).toThrow('setup:electron')
    expect(existsSync(join(dir, 'path.txt'))).toBe(false)
  })
})
