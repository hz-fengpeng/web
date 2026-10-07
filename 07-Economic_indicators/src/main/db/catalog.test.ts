import { copyFileSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { CATALOG_ADDITIONS } from '@shared/indicators'
import { close, openDatabase, type Db } from './adapter'
import { upgradeMockCatalog } from './catalog'
import { counts, getMeta, getSeries, setMeta } from './queries'

const SHIPPED = resolve('resources/macro.db')
let dir: string
let user: Db

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'macro-catalog-'))
  copyFileSync(SHIPPED, join(dir, 'user.db'))
  user = openDatabase(join(dir, 'user.db'))
  const remove = user.prepare('DELETE FROM observation WHERE indicator_id = ?')
  for (const indicator of CATALOG_ADDITIONS) remove.run(indicator.id)
  user.prepare("DELETE FROM app_meta WHERE key = 'mock_catalog_version'").run()
})
afterEach(() => { close(user); rmSync(dir, { recursive: true, force: true }) })

describe('旧示例目录追加升级', () => {
  it('从缺少版本标记的旧库补齐新指标，保留原有记录与用户改值', () => {
    const baseline = counts(user).observations
    user.prepare("UPDATE observation SET value = 42.42 WHERE indicator_id = 'cn.cpi.yoy' AND period = '2026-08'").run()
    const original = getSeries(user, 'cn.cpi.yoy')
    const written = upgradeMockCatalog(user, SHIPPED)
    expect(written).toBeGreaterThan(9000)
    expect(counts(user).observations).toBe(baseline + written)
    expect(getSeries(user, 'cn.cpi.yoy')).toEqual(original)
    for (const indicator of CATALOG_ADDITIONS) expect(getSeries(user, indicator.id).length).toBeGreaterThan(0)
    expect(getMeta(user, 'mock_catalog_version')).toBe('2')
  })
  it('重复启动不增行，不补回用户在新目录中主动删除的指标', () => {
    upgradeMockCatalog(user, SHIPPED)
    user.prepare("DELETE FROM observation WHERE indicator_id = 'cn.cpi_core.yoy'").run()
    const before = counts(user).observations
    expect(upgradeMockCatalog(user, SHIPPED)).toBe(0)
    expect(counts(user).observations).toBe(before)
    expect(getSeries(user, 'cn.cpi_core.yoy')).toEqual([])
  })
  it('用户已写入某个新指标时保留整条系列，不混入内置版本', () => {
    user.prepare(`INSERT INTO observation(indicator_id, period, period_end, value, status, fetched_at)
      VALUES ('cn.cpi_core.yoy', '2019-03', '2019-03-31', 42.42, 'ok', '2019-04-01')`).run()
    upgradeMockCatalog(user, SHIPPED)
    expect(getSeries(user, 'cn.cpi_core.yoy')).toHaveLength(1)
    expect(getSeries(user, 'cn.cpi_core.yoy')[0].value).toBe(42.42)
    expect(getSeries(user, 'cn.m2.yoy').length).toBeGreaterThan(0)
  })
  it('内置库缺少任何后续指标时，前面已插入的行与版本标记一并回滚', () => {
    const file = join(dir, 'incomplete.db')
    copyFileSync(SHIPPED, file)
    const incomplete = openDatabase(file)
    incomplete.prepare("DELETE FROM observation WHERE indicator_id = 'cn.keqiang.growth'").run()
    close(incomplete)
    const before = counts(user).observations
    expect(() => upgradeMockCatalog(user, file)).toThrow('缺少新增指标')
    expect(counts(user).observations).toBe(before)
    expect(getSeries(user, 'cn.cpi_core.yoy')).toEqual([])
    expect(getMeta(user, 'mock_catalog_version')).toBeNull()
  })
  it('读取内置库不修改文件，也不在其目录生成 WAL/SHM', () => {
    const file = join(dir, 'bundled.db')
    copyFileSync(SHIPPED, file)
    const before = readFileSync(file)
    upgradeMockCatalog(user, file)
    expect(readFileSync(file)).toEqual(before)
    expect(() => readFileSync(`${file}-wal`)).toThrow()
    expect(() => readFileSync(`${file}-shm`)).toThrow()
  })
  it('未来目录不会被旧代码降级；非法版本明确拒绝', () => {
    setMeta(user, 'mock_catalog_version', '3')
    expect(upgradeMockCatalog(user, SHIPPED)).toBe(0)
    expect(getMeta(user, 'mock_catalog_version')).toBe('3')
    setMeta(user, 'mock_catalog_version', 'oops')
    expect(() => upgradeMockCatalog(user, SHIPPED)).toThrow('版本无效')
  })
})
