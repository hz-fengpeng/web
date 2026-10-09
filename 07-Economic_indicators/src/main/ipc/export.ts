import { REAL_DECLARATION } from '@shared/provenance'
import type { ExportRequest } from '@shared/types'

/** IPC 边界不接受路径，实际写入位置只来自原生保存对话框。 */
export function exportPayload(req: ExportRequest): { name: string; bytes: Buffer } {
  if (!req || typeof req.name !== 'string' || typeof req.content !== 'string' ||
      !['csv', 'png'].includes(req.format)) throw new Error('无效的导出请求')
  if (req.content.length > 32 * 1024 * 1024) throw new Error('导出文件过大')
  const stem = req.name.replace(/[\\/:*?"<>|\x00-\x1f]/g, '_').slice(0, 120) || '导出数据'
  if (req.format === 'csv') {
    // 校验的是**有没有**那句声明：导出的表格会脱离界面独立流传，
    // 那一行是它唯一的出处标记。渲染进程用它、主进程校验它，两边同源
    //（`@shared/provenance`）——所以这里查不到只有一种可能：内容被截断了，
    // 或者绕过了 `seriesCsv()` 自己拼的 CSV。
    if (!req.content.includes(REAL_DECLARATION)) {
      throw new Error('CSV 缺少数据出处声明')
    }
    return { name: `${stem}.csv`, bytes: Buffer.from(req.content, 'utf8') }
  }
  const prefix = 'data:image/png;base64,'
  if (!req.content.startsWith(prefix) || !/^[A-Za-z0-9+/]+={0,2}$/.test(req.content.slice(prefix.length))) {
    throw new Error('无效的 PNG 数据')
  }
  const bytes = Buffer.from(req.content.slice(prefix.length), 'base64')
  if (!bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) {
    throw new Error('文件不是 PNG 图片')
  }
  return { name: `${stem}.png`, bytes }
}
