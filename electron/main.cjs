const { app, BrowserWindow, shell } = require("electron")
const path = require("node:path")
const http = require("node:http")
const { pathToFileURL } = require("node:url")

const ROOT = path.join(__dirname, "..")
try { process.chdir(ROOT) } catch (e) {}
process.env.NYX_PORT = process.env.NYX_PORT || "3000"
const PORT = process.env.NYX_PORT

// Honor the model download location chosen in the in-app model picker.
try {
  const _fs = require("node:fs"); const _os = require("node:os"); const _p = require("node:path")
  const _loc = _p.join(_os.homedir(), ".qvac", "nyx-location.json")
  if (!process.env.NYX_QVAC_CACHE && _fs.existsSync(_loc)) {
    const _j = JSON.parse(_fs.readFileSync(_loc, "utf8"))
    if (_j && _j.cacheDir) process.env.NYX_QVAC_CACHE = String(_j.cacheDir)
  }
} catch (e) {}

// Register nyx:// so the website "Launch the app" button opens the installed app.
try {
  if (process.defaultApp && process.argv.length >= 2) {
    app.setAsDefaultProtocolClient("nyx", process.execPath, [path.resolve(process.argv[1])])
  } else {
    app.setAsDefaultProtocolClient("nyx")
  }
} catch (e) {}

let mainWindow = null
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
  req.on("error", () => { if (tries > 0) setTimeout(() => waitForServer(done, tries - 1), 200); else done() })
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
function routeForLink(link) {
  try {
    const u = new URL(link)
    const host = (u.host || String(u.pathname || "").replace(/^\/+/, "")).toLowerCase()
    if (host === "setup") return "/setup"
    if (host === "account") return "/account"
    return "/app"
  } catch (e) { return "/app" }
}
function findDeepLink(argv) {
  if (!Array.isArray(argv)) return null
  return argv.find((a) => typeof a === "string" && a.indexOf("nyx://") === 0) || null
}
function focusWindow(route) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.show(); mainWindow.focus()
    if (route) mainWindow.loadURL("http://127.0.0.1:" + PORT + route)
  } else {
    createWindow(route || "/app")
  }
}
function createWindow(startPath) {
  const win = new BrowserWindow({
    width: 1240, height: 820, minWidth: 940, minHeight: 640,
    backgroundColor: "#050506", autoHideMenuBar: true, title: "Nyx", show: false,
    icon: path.join(ROOT, "build", "icon.png"),
    webPreferences: { contextIsolation: true, nodeIntegration: false },
  })
  mainWindow = win
  win.once("ready-to-show", () => win.show())
  win.loadURL("http://127.0.0.1:" + PORT + (startPath || "/app"))
  win.webContents.setWindowOpenHandler((d) => { shell.openExternal(d.url); return { action: "deny" } })
  win.on("closed", () => { if (mainWindow === win) mainWindow = null })
}
function checkUpdates() {
  if (!app.isPackaged) return
  try {
    const { autoUpdater } = require("electron-updater")
    autoUpdater.autoDownload = true
    autoUpdater.checkForUpdatesAndNotify().catch(() => {})
  } catch (e) {}
}

const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
} else {
  app.on("second-instance", (event, argv) => { const l = findDeepLink(argv); focusWindow(l ? routeForLink(l) : "/app") })
  app.on("open-url", (event, url) => {
    event.preventDefault()
    if (app.isReady()) focusWindow(routeForLink(url))
    else app.whenReady().then(() => focusWindow(routeForLink(url)))
  })

  app.whenReady().then(async () => {
    await startServer()
    waitForServer(async () => {
      let start = "/app"
      try {
        const st = await getJSON("/api/model/status")
        if (st && st.ready === false) start = "/setup"
      } catch (e) {}
      const deep = findDeepLink(process.argv)
      createWindow(deep ? routeForLink(deep) : start)
      checkUpdates()
    })
    app.on("activate", () => { if (BrowserWindow.getAllWindows().length === 0) createWindow("/app") })
  })
  app.on("window-all-closed", () => { if (process.platform === "darwin") return; app.quit() })
}
