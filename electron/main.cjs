const { app, BrowserWindow, shell } = require("electron")
const path = require("node:path")
const http = require("node:http")
const { pathToFileURL } = require("node:url")

const ROOT = path.join(__dirname, "..")
try { process.chdir(ROOT) } catch (e) {}
process.env.NYX_PORT = process.env.NYX_PORT || "3000"
const PORT = process.env.NYX_PORT

let booted = false
async function startServer() {
  if (booted) return
  booted = true
  try { await import(pathToFileURL(path.join(ROOT, "server.js")).href) }
  catch (e) { console.error("Nyx backend failed to start:", e) }
}
function waitForServer(done, tries) {
  if (tries === undefined) tries = 80
  const req = http.get({ host: "127.0.0.1", port: PORT, path: "/" }, (res) => { res.resume(); req.destroy(); done() })
  req.on("error", () => {
    if (tries > 0) setTimeout(() => waitForServer(done, tries - 1), 200)
    else done()
  })
}
function getJSON(p) {
  return new Promise((resolve) => {
    const req = http.get({ host: "127.0.0.1", port: PORT, path: p }, (res) => {
      let d = ""
      res.on("data", (c) => (d += c))
      res.on("end", () => { try { resolve(JSON.parse(d)) } catch { resolve(null) } })
    })
    req.on("error", () => resolve(null))
  })
}
function createWindow(startPath) {
  const win = new BrowserWindow({
    width: 1240, height: 820, minWidth: 940, minHeight: 640,
    backgroundColor: "#050506", autoHideMenuBar: true, title: "Nyx", show: false,
    icon: path.join(ROOT, "build", "icon.png"),
    webPreferences: { contextIsolation: true, nodeIntegration: false },
  })
  win.once("ready-to-show", () => win.show())
  win.loadURL("http://127.0.0.1:" + PORT + (startPath || "/app"))
  win.webContents.setWindowOpenHandler((d) => { shell.openExternal(d.url); return { action: "deny" } })
}
function checkUpdates() {
  if (!app.isPackaged) return
  try {
    const { autoUpdater } = require("electron-updater")
    autoUpdater.autoDownload = true
    autoUpdater.checkForUpdatesAndNotify().catch(() => {})
  } catch (e) {}
}
app.whenReady().then(async () => {
  await startServer()
  waitForServer(async () => {
    let start = "/app"
    try {
      const st = await getJSON("/api/model/status")
      if (st && st.ready === false) start = "/setup"
    } catch (e) {}
    createWindow(start)
    checkUpdates()
  })
  app.on("activate", () => { if (BrowserWindow.getAllWindows().length === 0) createWindow("/app") })
})
app.on("window-all-closed", () => {
  if (process.platform === "darwin") { return }
  app.quit()
})
