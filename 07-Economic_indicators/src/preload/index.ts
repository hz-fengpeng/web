import { contextBridge, ipcRenderer } from 'electron'
import { IPC, type MacroApi } from '@shared/types'

/**
 * 白名单 API。渲染进程拿不到任何 Node 原语，只能调用这里显式暴露的方法。
 * 注意：sandbox: true 的 preload 必须是 CommonJS（见 electron.vite.config.ts）。
 */
const api: MacroApi = {
  listIndicators: () => ipcRenderer.invoke(IPC.listIndicators),
  getSeries: (req) => ipcRenderer.invoke(IPC.getSeries, req),
  getDataStatus: () => ipcRenderer.invoke(IPC.getDataStatus),
  refresh: () => ipcRenderer.invoke(IPC.refresh),
}

contextBridge.exposeInMainWorld('macro', api)
