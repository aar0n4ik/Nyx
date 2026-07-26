import { existsSync, mkdirSync, writeFileSync, readFileSync } from "node:fs"

const out = "build/icon.png"
const src = "public/logo.svg"
mkdirSync("build", { recursive: true })

let Resvg = null
try { ({ Resvg } = await import("@resvg/resvg-js")) } catch { Resvg = null }
if (Resvg === null) { console.log("resvg unavailable, skipping icon gen"); process.exit(0) }
if (!existsSync(src)) { console.log("logo.svg missing at", src, "- skipping"); process.exit(0) }

const svg = readFileSync(src, "utf8")
const png = new Resvg(svg, {
  fitTo: { mode: "width", value: 512 },
  background: "#050506",
}).render().asPng()
writeFileSync(out, png)
console.log("generated", out, "from", src, "-", png.length, "bytes")
