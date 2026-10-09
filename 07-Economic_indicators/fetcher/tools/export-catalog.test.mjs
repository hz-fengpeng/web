/**
 * 守漂移：`fetcher/catalog.json` 与 `fetcher/tests/fixtures/period_end.json`
 * 必须与 TS 侧当前的定义一致。
 *
 * 这两个文件是给 Python 读的镜像，生成物过期**不会报错**——抓取器会照样跑，
 * 只是按旧的精度取整、按旧的指标清单取数。所以要用一条会变红的用例钉住：
 * 改了 `src/shared/indicators.ts` 却忘了重新生成，`npm test` 立刻失败。
 *
 * 用例本身不写文件（`--check` 只比对），保持测试只读。
 */
import { execFileSync } from 'node:child_process'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = resolve(import.meta.dirname, '../..')

const generators = [
  { script: 'fetcher/tools/export-catalog.mjs', output: 'fetcher/catalog.json', label: '指标目录镜像' },
  { script: 'fetcher/tools/export-periods.mjs', output: 'fetcher/tests/fixtures/period_end.json', label: '期间期末对照表' },
]

describe('Python 侧镜像文件', () => {
  for (const { script, output, label } of generators) {
    it(`${label}（${output}）没有过期`, () => {
      // --check 在不一致时以退出码 1 结束，并把「请重新生成」打到 stderr。
      // 把 stderr 一并带进断言消息，失败时直接能看到该怎么修。
      try {
        execFileSync(process.execPath, [resolve(root, script), '--check'], {
          cwd: root,
          stdio: 'pipe',
        })
      } catch (error) {
        const detail = [error.stdout, error.stderr]
          .map((buf) => buf?.toString().trim())
          .filter(Boolean)
          .join('\n')
        expect.fail(`${label} 已过期，请重新生成：\n${detail || error.message}`)
      }
    })
  }
})
