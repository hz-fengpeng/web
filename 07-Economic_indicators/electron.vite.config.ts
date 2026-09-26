import { resolve } from 'node:path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const shared = resolve('src/shared')

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    resolve: { alias: { '@shared': shared } },
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    resolve: { alias: { '@shared': shared } },
    build: {
      rollupOptions: {
        // ⚠️ sandbox: true 的 preload 必须是 CommonJS —— Electron 的沙箱化
        // preload 不支持 ESM。主进程保持 ESM（Electron 28+ 支持），preload 单独输出 .cjs。
        output: { format: 'cjs', entryFileNames: '[name].cjs' },
      },
    },
  },
  renderer: {
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer/src'),
        '@shared': shared,
      },
    },
    plugins: [react(), tailwindcss()],
    build: {
      // electron-vite 默认不压缩（main/preload 保持可读，便于调试堆栈）；
      // 渲染进程是纯产物、只在 DevTools 里看，压缩即可。
      minify: 'esbuild',
    },
  },
})
