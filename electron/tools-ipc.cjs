'use strict'
const path = require('path')
const { BrowserWindow, ipcMain, app } = require('electron')
const core = require('./tools-core.cjs')

let toolsWin = null

function openToolsWindow(parent) {
  if (toolsWin && !toolsWin.isDestroyed()) { toolsWin.focus(); return toolsWin }
  toolsWin = new BrowserWindow({
    width: 1100, height: 780, minWidth: 900, minHeight: 640,
    parent: parent || undefined, backgroundColor: '#06060b', title: 'Nyx · Инструменты',
    webPreferences: { preload: path.join(__dirname, 'preload.cjs'), contextIsolation: true, nodeIntegration: false },
  })
  toolsWin.loadFile(path.join(__dirname, '..', 'public', 'tools.html'))
  toolsWin.on('closed', () => { toolsWin = null })
  return toolsWin
}

function send(evt) {
  if (toolsWin && !toolsWin.isDestroyed()) toolsWin.webContents.send('nyx:progress', evt)
}

function registerToolsIpc() {
  ipcMain.handle('nyx:open-tools', (e) => { openToolsWindow(BrowserWindow.fromWebContents(e.sender)); return true })
  ipcMain.handle('nyx:tool', async (_e, { name, args }) => {
    const ud = app.getPath('userData')
    switch (name) {
      case 'listApps':        return core.listApps()
      case 'listPresets':     return core.listPresets(ud)
      case 'runRemovalJob':   return core.runRemovalJob(args, send)
      case 'setRegistry':     return core.setRegistry(args, send)
      case 'wingetInstall':   return core.wingetInstall(args.id)
      case 'createProfileLauncher': return core.createProfileLauncher(args)
      case 'addToStartup':    return core.addToStartup(args)
      case 'scheduleTask':    return core.scheduleTask(args, send)
      default: throw new Error('Unknown tool: ' + name)
    }
  })
}

module.exports = { registerToolsIpc, openToolsWindow }
