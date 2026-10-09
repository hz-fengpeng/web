import { REAL_DECLARATION } from '@shared/provenance'
import type { Indicator, Observation } from '@shared/types'
import { VALUE_LABEL } from './data'
import { STATUS_ZH, unwrap } from './format'

/** CSV 中来自库的文字也可能包含公式；双引号并不能阻止 Excel 执行它。 */
export function csvCell(value: string | number | null): string {
  let text = value === null ? '' : String(value)
  if (typeof value === 'string' && /^[\s]*[=+\-@]/.test(text)) text = `'${text}`
  return `"${text.replace(/"/g, '""')}"`
}

export function seriesCsv(
  items: Array<{ indicator: Indicator; rows: Observation[] }>,
): string {
  const headers = ['数据性质', '指标ID', '指标名称', '口径', '单位', '季节调整', '期间', '期末日期', '数值', '状态', '发布日', '修订序号', '口径说明', '层级', '地区', '指标类型']
  // 「指标类型」这一列要说清每行是怎么来的：派生指标是我们按官方序列算的，
  // 其余是抓来的官方发布值。
  const originOf = (derived: boolean): string => derived ? '由官方序列计算' : '官方发布值'

  const records = items.flatMap(({ indicator: i, rows }) => rows.map((r) => [
    REAL_DECLARATION, i.id, i.nameZh, VALUE_LABEL[i.valueType], i.unit, i.seasonalAdj ? '是' : '否',
    r.period, r.periodEnd, r.value, STATUS_ZH[r.status], r.releasedAt, r.revision, i.note,
    i.tier ?? 'P0', i.region ?? '全国/未分地区', originOf(i.isDerived ?? false),
  ]))
  return '\uFEFF' + [headers, ...records].map((r) => r.map(csvCell).join(',')).join('\r\n') + '\r\n'
}

export async function saveExport(name: string, format: 'csv' | 'png', content: string): Promise<string | null> {
  const result = await unwrap(window.macro.exportFile({ name, format, content }))
  return result.path
}
