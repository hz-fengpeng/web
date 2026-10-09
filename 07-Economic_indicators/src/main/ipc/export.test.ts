import { describe, expect, it } from 'vitest'
import { REAL_DECLARATION } from '@shared/provenance'
import { exportPayload } from './export'
import type { ExportRequest } from '@shared/types'
describe('导出 IPC 边界', () => {
  it('文件名去除路径字符，CSV 声明与 Unicode 原样保留', () => {
    const content = `﻿${REAL_DECLARATION}\r\n`
    const result = exportPayload({ name: '../../CPI', format: 'csv', content })
    expect(result.name).not.toContain('/')
    expect(result.bytes.toString('utf8')).toBe(content)
  })
  it('★ 带出处声明的 CSV 放行', () => {
    // 校验的是**有没有**那句话，不是「是哪一种」——声明只有一种写法
    //（库里只有真实统计）。渲染进程用它、主进程查它，两边同源
    //（`@shared/provenance`）。
    const content = `﻿${REAL_DECLARATION}\r\n`
    expect(exportPayload({ name: 'CPI', format: 'csv', content }).name).toBe('CPI.csv')
  })
  it('拒绝没有声明、非法格式、过大文件及伪装的 PNG', () => {
    // 少一个字就不是那句话：半截的声明不算声明
    expect(() => exportPayload({ name: 'CPI', format: 'csv', content: '真实统计' })).toThrow('声明')
    expect(() => exportPayload({ name: 'CPI', format: 'html', content: '' } as unknown as ExportRequest)).toThrow('无效')
    expect(() => exportPayload({ name: 'CPI', format: 'csv', content: 'x'.repeat(32 * 1024 * 1024 + 1) })).toThrow('过大')
    expect(() => exportPayload({ name: 'CPI', format: 'png', content: 'data:image/png;base64,SGVsbG8=' })).toThrow('不是 PNG')
    expect(() => exportPayload({ name: 'CPI', format: 'png', content: 'data:image/png;base64,????' })).toThrow('无效')
  })
})
