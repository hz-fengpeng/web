/**
 * 期间期末对照表生成器：`src/shared/period.ts` → `fetcher/tests/fixtures/period_end.json`。
 *
 * 为什么要有这个：Python 侧 `periods.py` 是 `period.ts` 的**镜像**（抓取器跑在
 * Node 之外），而两边算错一天的后果不是报错，是排序错乱——最新一期可能排到上期
 * 前面。光靠手写用例守不住，因为「哪些日期算错了」正是我们不知道的那部分。
 *
 * 所以这里把 `periodEnd()` 本身当被测对象：穷举一段有代表性的期间，
 * 让 TS 算出标准答案写进 fixture，Python 侧逐条比对。
 *
 * 用法：
 *   node fetcher/tools/export-periods.mjs            # 写入 fixture
 *   node fetcher/tools/export-periods.mjs --check    # 只校验是否过期
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import ts from 'typescript'

const root = resolve(import.meta.dirname, '../..')
const target = resolve(root, 'fetcher/tests/fixtures/period_end.json')

const compile = (file) =>
  ts.transpileModule(readFileSync(resolve(root, file), 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.ESNext },
  }).outputText

export async function buildPeriods() {
  const url = 'data:text/javascript;base64,' +
    Buffer.from(compile('src/shared/period.ts')).toString('base64')
  const { periodEnd, parsePeriod } = await import(url)

  const periods = []
  // 2023（平年）与 2024（闰年）两个整年：覆盖 2 月 28/29、季末 3/6/9/12 月。
  for (const year of [2023, 2024]) {
    for (let month = 1; month <= 12; month += 1) {
      periods.push(`${year}-${String(month).padStart(2, '0')}`)
    }
    for (let quarter = 1; quarter <= 4; quarter += 1) {
      periods.push(`${year}Q${quarter}`)
    }
    periods.push(String(year))
  }
  // 日度：期末恒等于期间本身，抽查跨月/跨年/闰日边界。
  periods.push('2024-02-29', '2024-03-01', '2023-02-28', '2025-12-31', '2026-01-01')
  // 无法解析的串：两侧都必须给出「不合法」，而不是各自兜一个日期。
  // 2023-02-29 与 2026-02-30 是正则过得去、日期不存在的典型。
  const invalid = ['2023-02-29', '2026-02-30', '2026-13', '2026Q5', '2026-1', '', 'abc', '2026Q0']

  const rows = periods.map((period) => ({
    period,
    kind: parsePeriod(period).kind,
    end: periodEnd(period),
  }))

  return {
    generatedFrom: 'src/shared/period.ts',
    note: '本文件由 fetcher/tools/export-periods.mjs 生成，请勿手改。',
    cases: rows,
    invalid,
  }
}

const serialize = (data) => JSON.stringify(data, null, 2) + '\n'

const isMain = process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename)

if (isMain) {
  const data = await buildPeriods()
  const text = serialize(data)
  const check = process.argv.includes('--check')

  if (check) {
    let current = null
    try {
      current = readFileSync(target, 'utf8')
    } catch {
      console.error('period_end.json 不存在；请先跑 node fetcher/tools/export-periods.mjs')
      process.exit(1)
    }
    if (current !== text) {
      console.error('period_end.json 与 src/shared/period.ts 不一致；请重新生成')
      process.exit(1)
    }
    console.log(`period_end.json 是最新的（${data.cases.length} 条对照 + ${data.invalid.length} 条非法）`)
  } else {
    writeFileSync(target, text)
    console.log(`已写入 period_end.json：${data.cases.length} 条对照 + ${data.invalid.length} 条非法`)
  }
}
