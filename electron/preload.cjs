'use strict'
const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('nyxTools', {
  // вызов любого инструмента: invoke('listApps'), invoke('runRemovalJob', {...}) и т.д.
  invoke: (name, args) => ipcRenderer.invoke('nyx:tool', { name, args: args || {} }),
  // подписка на живой прогресс удаления/установки
  onProgress: (cb) => {
    const h = (_e, data) => cb(data)
    ipcRenderer.on('nyx:progress', h)
    return () => ipcRenderer.removeListener('nyx:progress', h)
  },
  openTools: () => ipcRenderer.invoke('nyx:open-tools'),
  platform: process.platform,
})

contextBridge.exposeInMainWorld('nyxWin', {
  setTheme: (theme) => { try { ipcRenderer.send('nyx:set-theme', theme) } catch (e) {} },
})
