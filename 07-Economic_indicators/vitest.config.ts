import { resolve } from 'node:path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      '@shared': resolve('src/shared'),
      '@renderer': resolve('src/renderer/src'),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'scripts/**/*.test.mjs', 'fetcher/tools/**/*.test.mjs'],
    // 这里没有联网用例——采集层在 M1c 整体移除后就再没有过。曾经有个
    // `LIVE=1` 的开关（注释留在这里提醒过），随采集器一起没了；
    // 抓取现在在 `fetcher/` 里，有自己的离线测试（`npm run test:py`）。
    testTimeout: 60_000,
  },
})
