import { describe, expect, it } from 'vitest'
import { exportPayload } from './export'
import type { ExportRequest } from '@shared/types'
describe('导出 IPC 边界', () => {
  it('文件名去除路径字符，CSV 声明与 Unicode 原样保留', () => {
    const content = '\uFEFF示例数据，非真实统计\r\n'
    const result = exportPayload({ name: '../../CPI', format: 'csv', content })
    expect(result.name).not.toContain('/')
    expect(result.bytes.toString('utf8')).toBe(content)
  })
  it('拒绝未标示示例、非法格式、过大文件及伪装的 PNG', () => {
    expect(() => exportPayload({ name: 'CPI', format: 'csv', content: '真实统计' })).toThrow('声明')
    expect(() => exportPayload({ name: 'CPI', format: 'html', content: '' } as unknown as ExportRequest)).toThrow('无效')
    expect(() => exportPayload({ name: 'CPI', format: 'csv', content: 'x'.repeat(32 * 1024 * 1024 + 1) })).toThrow('过大')
    expect(() => exportPayload({ name: 'CPI', format: 'png', content: 'data:image/png;base64,SGVsbG8=' })).toThrow('不是 PNG')
    expect(() => exportPayload({ name: 'CPI', format: 'png', content: 'data:image/png;base64,????' })).toThrow('无效')
  })
})
