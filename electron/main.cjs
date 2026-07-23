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

function createWindow() {
  const win = new BrowserWindow({
    width: 1240, height: 820, minWidth: 940, minHeight: 640,
    backgroundColor: "#0a0a0f", autoHideMenuBar: true, title: "Nyx", show: false,
    webPreferences: { contextIsolation: true, nodeIntegration: false },
  })
  win.once("ready-to-show", () => win.show())
  win.loadURL("http://127.0.0.1:" + PORT + "/app")
  win.webContents.setWindowOpenHandler((d) => { shell.openExternal(d.url); return { action: "deny" } })
}

app.whenReady().then(async () => {
  await startServer()
  waitForServer(createWindow)
  app.on("activate", () => { if (BrowserWindow.getAllWindows().length === 0) waitForServer(createWindow) })
})

app.on("window-all-closed", () => {
  if (process.platform === "darwin") { return }
  app.quit()
})
