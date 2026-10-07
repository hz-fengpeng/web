import { CATALOG_ADDITIONS } from '@shared/indicators'
import { close, openDatabase, tx, type Db } from './adapter'
import { appendBundledIndicators, getMeta, logCatalogUpgrade, setMeta } from './queries'

/** 数据目录升级与 schema 版本独立；运行时只复制静态行，不生成数据。 */
export const MOCK_CATALOG_VERSION = 2

export function upgradeMockCatalog(db: Db, bundledFile: string): number {
  const raw = getMeta(db, 'mock_catalog_version')
  const version = raw === null ? 1 : Number(raw)
  if (!Number.isInteger(version) || version < 1) throw new Error('示例指标目录版本无效')
  if (version >= MOCK_CATALOG_VERSION) return 0
  const bundled = openDatabase(bundledFile, { readOnly: true })
  try {
    if (getMeta(bundled, 'mock_catalog_version') !== String(MOCK_CATALOG_VERSION)) {
      throw new Error('内置示例库的指标目录版本不匹配，请检查 macro.db')
    }
    return tx(db, () => {
      const written = appendBundledIndicators(db, bundled, CATALOG_ADDITIONS.map((i) => i.id))
      setMeta(db, 'mock_catalog_version', String(MOCK_CATALOG_VERSION))
      if (written > 0) logCatalogUpgrade(db, written, MOCK_CATALOG_VERSION)
      return written
    })
  } finally { close(bundled) }
}
