/** 开发时扩充内置产物；应用启动/构建均不调用此脚本。原有 10 个指标原样保留。 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import ts from 'typescript'

const root = resolve(import.meta.dirname, '..')
const compile = (file) => ts.transpileModule(readFileSync(resolve(root, file), 'utf8'), {
  compilerOptions: { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.ESNext },
}).outputText
const moduleUrl = (source) => 'data:text/javascript;base64,' + Buffer.from(source).toString('base64')
const expandedUrl = moduleUrl(compile('src/shared/expandedIndicators.ts'))
const catalogUrl = moduleUrl(compile('src/shared/indicators.ts').replace("'./expandedIndicators'", JSON.stringify(expandedUrl)))
const { INDICATORS, CATALOG_ADDITIONS } = await import(catalogUrl)
const { PROVINCES, RETAIL_ITEMS, TRADE_PARTNERS } = await import(expandedUrl)
const version = '2'
const builtAt = '2026-10-07T00:00:00.000Z'
const dateText = (date) => date.toISOString().slice(0, 10)
const monthEnd = (year, month) => dateText(new Date(Date.UTC(year, month, 0)))
const weekday = (date) => ![0, 6].includes(date.getUTCDay())
const nextWeekday = (date) => { while (!weekday(date)) date.setUTCDate(date.getUTCDate() + 1); return dateText(date) }
const round = (value, decimals) => Number(value.toFixed(decimals))
const wave = (base, amplitude, speed = 6, phase = 0) => (t) => base + amplitude * Math.sin(t / speed + phase)
const rates = new Map()
const rule = (id, fn) => rates.set(id, fn)

rule('cn.cpi_core.yoy', wave(1.1, 0.5, 9, 0.3))
rule('cn.pmi.non_mfg', wave(51.7, 2.3, 7, 0.8))
rule('cn.trade.export_yoy', wave(6, 11, 5, 0.5))
rule('cn.trade.balance', wave(540, 380, 7, 0.1))
rule('cn.m1.yoy', wave(4.1, 4.6, 8, 1.4))
rule('cn.m2.yoy', wave(9.3, 2.1, 10, 0.2))
rule('cn.tsf.stock_yoy', wave(9.8, 1.8, 11, 0.9))
rule('cn.loan.new', (t, month) => 14500 + 8500 * Math.cos((month - 1) * Math.PI / 6) + 1600 * Math.sin(t / 5))
rule('cn.lpr.1y', (t) => 4.11 - Math.floor(t / 9) * 0.05)
rule('cn.lpr.5y', (t) => 4.62 - Math.floor(t / 11) * 0.07)
rule('cn.fx_reserve.level', wave(31900, 1350, 12, 0.5))
rule('cn.fx_rate.usd_cny', wave(6.93, 0.22, 150, 0.8))
rule('cn.fiscal.revenue_cum_yoy', wave(2.9, 4.9, 7, 1.1))
rule('cn.fai.mfg_cum_yoy', wave(7.4, 4, 8, 0.2))
rule('cn.fai.infra_cum_yoy', wave(5.9, 4.3, 9, 0.7))
RETAIL_ITEMS.forEach(({ code }, index) => rule(`cn.retail.${code}_yoy`, wave(4 + index, 6 + index, 5 + index, index / 2)))
TRADE_PARTNERS.forEach(({ code }, index) => {
  rule(`cn.trade.${code}_export`, wave(330 + index * 25, 60 + index * 6, 5 + index, index / 3))
  rule(`cn.trade.${code}_import`, wave(230 + index * 15, 40 + index * 5, 6 + index, index / 2))
})
rule('cn.pmi.caixin_mfg', wave(50.5, 1.9, 6, 0.4))
rule('cn.pmi.caixin_services', wave(52.6, 2.6, 7, 1.2))
rule('cn.services.yoy', wave(5.4, 3.9, 9, 0.6))
rule('cn.power.generation', (t, month) => 6600 + 1300 * Math.cos((month - 7) * Math.PI / 6) + t * 12)
rule('cn.power.generation_yoy', wave(5.5, 4.4, 9, 0.6))
rule('cn.power.consumption', (t, month) => 7300 + 1700 * Math.cos((month - 7) * Math.PI / 6) + t * 15)
rule('cn.power.consumption_yoy', wave(6.3, 4.2, 8, 0.2))
rule('cn.income.disposable_cum_yoy', wave(6.6, 2.1, 6, 0.4))
rule('cn.income.consumption_cum_yoy', wave(7.1, 3.3, 5, 0.9))
rule('cn.income.disposable', (t) => (9300 + Math.floor((t + 2) / 4) * 400) * ((t + 2) % 4 + 1))
rule('cn.income.consumption', (t) => (6200 + Math.floor((t + 2) / 4) * 250) * ((t + 2) % 4 + 1))
rule('cn.fiscal.fund_revenue_cum_yoy', wave(-7.1, 12, 8, 1.4))
rule('cn.fiscal.land_revenue_cum_yoy', wave(-12.5, 16, 7, 0.9))
rule('cn.gdp.nominal_yoy', wave(6.3, 1.7, 4, 0.1))
rule('cn.bond.gov_1y', wave(2.12, 0.55, 170, 0.2))
rule('cn.bond.gov_10y', wave(2.78, 0.6, 200, 0.6))
rule('us.bond.gov_10y', wave(3.57, 1.1, 210, 1.1))
rule('cn.rail.freight_yoy', wave(3.4, 3.7, 7, 0.8))
rule('cn.loan.medium_long_yoy', wave(10.7, 3.2, 11, 0.3))
rule('cn.population.total', (t) => 141240 - t * 170)
rule('cn.population.urbanization', (t) => 64.55 + t * 0.64)
rule('cn.income.gini', (t) => 0.463 - t * 0.001)
rule('cn.bop.goods', wave(780, 410, 4, 0.2))
rule('cn.bop.services', wave(-190, 90, 4, 0.8))
rule('cn.bop.primary_income', wave(-70, 60, 5, 0.4))
rule('cn.bop.secondary_income', wave(60, 15, 3, 0.1))
rule('cn.bop.capital', wave(-1.2, 2.1, 3, 0.7))
rule('cn.bop.direct_investment', wave(-30, 200, 4, 1.1))
rule('cn.bop.portfolio_investment', wave(100, 280, 5, 0.4))
rule('cn.bop.other_financial', wave(-70, 200, 4, 0.9))
rule('cn.bop.reserve_assets', wave(100, 110, 6, 0.6))
rule('cn.external_debt.balance', wave(25200, 1700, 7, 0.5))
PROVINCES.forEach(({ code }, index) => rule(`cn.region.${code}.gdp_cum_yoy`, wave(4.3 + index % 7 * 0.4, 1.2 + index % 3 * 0.3, 4 + index % 4, index / 5)))

// 需要合并 1—2 月的系列不制造一条虚假的 1 月观测。
const mergedIds = new Set([
  'cn.fiscal.revenue_cum_yoy', 'cn.fiscal.fund_revenue_cum_yoy', 'cn.fiscal.land_revenue_cum_yoy',
  'cn.fai.mfg_cum_yoy', 'cn.fai.infra_cum_yoy', 'cn.services.yoy',
  'cn.power.generation', 'cn.power.generation_yoy',
  ...RETAIL_ITEMS.map(({ code }) => `cn.retail.${code}_yoy`),
])
const observations = []
const emit = (indicator, period, end, value, released, status = 'ok') => {
  const row = {
  indicatorId: indicator.id, period, end, value: value === null ? null : round(value, indicator.decimals),
  released, status: value === null ? 'missing' : status,
  }
  observations.push(row)
  return row
}
for (const indicator of CATALOG_ADDITIONS.filter((i) => !i.isDerived)) {
  const fn = rates.get(indicator.id)
  if (!fn) throw new Error('缺少示例规则：' + indicator.id)
  if (indicator.frequency === 'day') {
    let t = 0
    for (const date = new Date('2021-09-01T00:00:00Z'); date <= new Date('2026-08-31T00:00:00Z'); date.setUTCDate(date.getUTCDate() + 1)) {
      if (!weekday(date)) continue
      const period = dateText(date)
      const simulated = fn(t++)
      const value = indicator.id === 'us.bond.gov_10y' && period === '2024-07-04' ? null : simulated
      emit(indicator, period, period, value, period)
    }
  } else if (indicator.frequency === 'year') {
    for (let year = 2021; year <= 2025; year++) emit(indicator, String(year), `${year}-12-31`, fn(year - 2021), `${year + 1}-01-17`)
  } else if (indicator.frequency === 'quarter') {
    for (let t = 0; t < 20; t++) {
      const offset = t + 2
      const year = 2021 + Math.floor(offset / 4)
      const q = offset % 4 + 1
      const end = monthEnd(year, q * 3)
      const value = indicator.valueType === 'cumulative_yoy'
        ? Array.from({ length: q }, (_, index) => fn(t - q + index + 1)).reduce((sum, value) => sum + value, 0) / q : fn(t)
      emit(indicator, `${year}Q${q}`, end, value, dateText(new Date(Date.UTC(year, q * 3, 16))))
    }
  } else {
    for (let t = 0; t < 60; t++) {
      const offset = t + 8
      const year = 2021 + Math.floor(offset / 12)
      const month = offset % 12 + 1
      if (month === 1 && mergedIds.has(indicator.id)) continue
      const end = monthEnd(year, month)
      const merged = month === 2 && mergedIds.has(indicator.id)
      let value = fn(t, month)
      if (indicator.valueType === 'cumulative_yoy') {
        value = Array.from({ length: month }, (_, index) => fn(t - month + index + 1, index + 1)).reduce((sum, value) => sum + value, 0) / month
      } else if (merged) {
        value = indicator.valueType === 'level' ? fn(t - 1, 1) + value : (fn(t - 1, 1) + value) / 2
      }
      if (indicator.id === 'cn.power.consumption_yoy' && year === 2024 && month === 4) value = null
      const isLpr = indicator.id.startsWith('cn.lpr.')
      const isPmi = indicator.category === 'sentiment'
      const released = isLpr ? nextWeekday(new Date(Date.UTC(year, month - 1, 20)))
        : isPmi ? (indicator.id.includes('caixin') ? dateText(new Date(Date.UTC(year, month, 3))) : end)
        : dateText(new Date(Date.UTC(year, month, indicator.category === 'price' ? 9 : indicator.category === 'fiscal' ? 20 : 15)))
      emit(indicator, `${year}-${String(month).padStart(2, '0')}`, end, value, released, merged ? 'merged' : 'ok')
    }
  }
}

if (!existsSync(resolve(root, 'resources/macro.db'))) throw new Error('原始内置库不存在；扩充脚本不能重建原有 10 个指标。')
const db = new DatabaseSync(resolve(root, 'resources/macro.db'))
try {
  const bySeries = new Map()
  const store = (row) => {
    if (!bySeries.has(row.indicatorId)) bySeries.set(row.indicatorId, new Map())
    const series = bySeries.get(row.indicatorId)
    if (!series.has(row.period)) series.set(row.period, row)
  }
  for (const row of db.prepare('SELECT indicator_id AS indicatorId, period, period_end AS end, value, released_at AS released, status FROM observation ORDER BY revision DESC').all()) store(row)
  for (const row of observations) store(row)
  const derived = (id, ids, calculate) => {
    const indicator = INDICATORS.find((i) => i.id === id)
    for (const [period, first] of bySeries.get(ids[0])) {
      const inputs = ids.map((input) => bySeries.get(input)?.get(period))
      const value = inputs.every((row) => row && row.value !== null) ? calculate(...inputs.map((row) => row.value)) : null
      const released = inputs.map((row) => row?.released ?? '').sort().at(-1) || first.released
      store(emit(indicator, period, first.end, value, released))
    }
  }
  derived('cn.bop.current', ['cn.bop.goods', 'cn.bop.services', 'cn.bop.primary_income', 'cn.bop.secondary_income'], (...values) => values.reduce((sum, value) => sum + value, 0))
  derived('cn.bop.financial', ['cn.bop.direct_investment', 'cn.bop.portfolio_investment', 'cn.bop.other_financial', 'cn.bop.reserve_assets'], (...values) => values.reduce((sum, value) => sum + value, 0))
  derived('cn.bop.errors', ['cn.bop.financial', 'cn.bop.current', 'cn.bop.capital'], (financial, current, capital) => financial - current - capital)
  derived('cn.gdp.deflator_yoy', ['cn.gdp.nominal_yoy', 'cn.gdp.yoy'], (nominal, real) => ((1 + nominal / 100) / (1 + real / 100) - 1) * 100)
  derived('cn.bond.cn_us_spread', ['cn.bond.gov_10y', 'us.bond.gov_10y'], (cn, us) => (cn - us) * 100)
  derived('cn.keqiang.growth', ['cn.power.consumption_yoy', 'cn.rail.freight_yoy', 'cn.loan.medium_long_yoy'], (power, freight, loan) => 0.4 * power + 0.25 * freight + 0.35 * loan)
  db.exec('PRAGMA journal_mode = DELETE; BEGIN')
  const insert = db.prepare(`INSERT OR IGNORE INTO observation
    (indicator_id, period, period_end, value, status, released_at, fetched_at, revision) VALUES (?, ?, ?, ?, ?, ?, ?, 0)`)
  let added = 0
  for (const row of observations) added += Number(insert.run(row.indicatorId, row.period, row.end, row.value, row.status, row.released, builtAt).changes)
  const count = Number(db.prepare('SELECT COUNT(*) AS count FROM observation').get().count)
  const meta = db.prepare('INSERT INTO app_meta(key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value')
  if (added || db.prepare("SELECT value FROM app_meta WHERE key = 'mock_catalog_version'").get()?.value !== version) meta.run('mock_catalog_version', version)
  if (added) {
    meta.run('last_fetch_at', builtAt)
    db.prepare(`INSERT INTO fetch_log(source_id, started_at, finished_at, status, rows_written, message)
      VALUES ('mock', ?, ?, 'ok', ?, ?)`)
      .run(builtAt, builtAt, count, '内置 P0/P1/P2 指标示例数据文件 · 非真实统计数据 · 日历未模拟法定节假日')
  }
  db.exec('COMMIT')
  const labels = { day: '日度', month: '月度', quarter: '季度', year: '年度' }
  const doc = [
    '# 指标目录与示例数据', '',
    '> 此文件由 `scripts/extend-mock-data.mjs` 从指标元数据和内置库生成，定义以 `INDICATORS` 为准。', '',
    `目录 v${version}，共 ${INDICATORS.length} 个指标、${count.toLocaleString('en-US')} 条合成观测。所有数值均为假数据，不代表真实经济状况。`, '',
    '日/月/季序列覆盖 2021 年 9 月至 2026 年 8 月（季度截至 2026Q2）；年度序列为 2021–2025 年。',
    '日度序列只模拟周一至周五，不模拟法定节假日或中美市场收盘时差。', '',
    '省级数据提供大陆 31 个省级地区的 GDP 累计同比。贸易伙伴提供美国、欧盟、东盟、日本、韩国的月度进出口金额；社零分项提供 5 类限额以上商品同比。', '',
    '计算指标均在界面和导出中标示“示例计算值”，公式见指标口径说明；缺少输入时保留 null。', '',
  ]
  const coverage = db.prepare('SELECT COUNT(*) AS rows, MIN(period_end) AS first, MAX(period_end) AS last FROM observation WHERE indicator_id = ?')
  for (const tier of ['P0', 'P1', 'P2']) {
    const list = INDICATORS.filter((i) => (i.tier ?? 'P0') === tier)
    doc.push(`## ${tier} · ${list.length} 个指标`, '', '| 指标 | ID | 频率 | 记录数 | 期末覆盖 | 类型 |', '|---|---|---|---:|---|---|')
    for (const i of list) {
      const row = coverage.get(i.id)
      doc.push(`| ${i.nameShort} | ${i.id} | ${labels[i.frequency]} | ${row.rows} | ${row.first}–${row.last} | ${i.isDerived ? '示例计算值' : '合成示例观测'} |`)
    }
    doc.push('')
  }
  writeFileSync(resolve(root, 'docs/07-指标目录与示例数据.md'), doc.join('\n') + '\n')
  console.log(`目录 v${version}：${INDICATORS.length} 个指标，${count} 条观测；本次新增 ${added} 条。`)
} catch (error) { try { db.exec('ROLLBACK') } catch {} throw error }
finally { db.close() }
