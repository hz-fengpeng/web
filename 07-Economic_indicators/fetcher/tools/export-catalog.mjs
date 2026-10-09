/**
 * 指标目录镜像生成器：`src/shared/indicators.ts` → `fetcher/catalog.json`。
 *
 * 为什么要有这个脚本，而不是手写一份 JSON：
 * 指标元数据（有哪些指标、口径、单位、精度）的**唯一事实源**是
 * `src/shared/indicators.ts`，见 docs/README.md 的「不誊抄代码已经声明的事实」。
 * 手抄一份到 Python 侧，两边迟早分叉，而且分叉了不会报错——只会让抓到的
 * 数值按错误的精度取整、或挂到错误的指标上。
 *
 * 用法：
 *   node fetcher/tools/export-catalog.mjs            # 写入 catalog.json
 *   node fetcher/tools/export-catalog.mjs --check    # 只校验是否过期，不写
 *
 * `--check` 由 export-catalog.test.mjs 调用，`npm test` 会跑。
 *
 * 导出**全部** 109 个指标（不只是 P0）：Python 侧按 `--tier` 过滤，
 * 以后扩到 P1/P2 不必回来改这个脚本。
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import ts from 'typescript'

const root = resolve(import.meta.dirname, '../..')
const target = resolve(root, 'fetcher/catalog.json')

/**
 * 转译 + 以 data: URL 导入。指标目录是 TS，Python 读不了；转译成 ESM 再 import
 * 是最短的桥——同一个目录下的 `export-periods.mjs` 也这么做。
 */
const compile = (file) =>
  ts.transpileModule(readFileSync(resolve(root, file), 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.ESNext },
  }).outputText
const moduleUrl = (source) => 'data:text/javascript;base64,' + Buffer.from(source).toString('base64')

export async function buildCatalog() {
  const expandedUrl = moduleUrl(compile('src/shared/expandedIndicators.ts'))
  const indicatorsUrl = moduleUrl(
    compile('src/shared/indicators.ts').replace("'./expandedIndicators'", JSON.stringify(expandedUrl)),
  )
  const { INDICATORS } = await import(indicatorsUrl)

  // 字段按固定顺序输出：顺序稳定，`--check` 的逐字节比较才有意义，
  // git diff 也只显示真正变化的那几行。
  const rows = INDICATORS.map((i) => ({
    id: i.id,
    nameZh: i.nameZh,
    nameShort: i.nameShort,
    category: i.category,
    unit: i.unit,
    frequency: i.frequency,
    valueType: i.valueType,
    seasonalAdj: i.seasonalAdj,
    decimals: i.decimals,
    isHeadline: i.isHeadline,
    // 未标注 tier 的初始指标属于 P0，这里把默认值固化下来，
    // 免得 Python 侧还要再实现一遍「缺省即 P0」的规则。
    tier: i.tier ?? 'P0',
    ...(i.region === undefined ? {} : { region: i.region }),
    ...(i.isDerived ? { isDerived: true } : {}),
    note: i.note,
  }))

  const counts = rows.reduce((acc, r) => ({ ...acc, [r.tier]: (acc[r.tier] ?? 0) + 1 }), {})
  return {
    generatedFrom: 'src/shared/indicators.ts',
    note: '本文件由 fetcher/tools/export-catalog.mjs 生成，请勿手改；改动请改指标定义后重新生成。',
    total: rows.length,
    counts,
    indicators: rows,
  }
}

const serialize = (catalog) => JSON.stringify(catalog, null, 2) + '\n'

const isMain = process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename)

if (isMain) {
  const catalog = await buildCatalog()
  const text = serialize(catalog)
  const check = process.argv.includes('--check')

  if (check) {
    let current = null
    try {
      current = readFileSync(target, 'utf8')
    } catch {
      console.error('catalog.json 不存在；请先跑 node fetcher/tools/export-catalog.mjs')
      process.exit(1)
    }
    if (current !== text) {
      console.error('catalog.json 与 src/shared/indicators.ts 不一致；请重新生成')
      process.exit(1)
    }
    console.log(`catalog.json 是最新的（${catalog.total} 个指标）`)
  } else {
    writeFileSync(target, text)
    console.log(`已写入 catalog.json：${catalog.total} 个指标（P0 ${catalog.counts.P0} / P1 ${catalog.counts.P1} / P2 ${catalog.counts.P2}）`)
  }
}
