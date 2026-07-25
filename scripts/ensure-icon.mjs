import { existsSync, mkdirSync, writeFileSync } from "node:fs"
import { join } from "node:path"

const buildDir = join(process.cwd(), "build")
const out = join(buildDir, "icon.png")
mkdirSync(buildDir, { recursive: true })

if (existsSync(out)) { console.log("icon: build/icon.png уже есть — оставляю"); process.exit(0) }

let Resvg = null
try { ({ Resvg } = await import("@resvg/resvg-js")) } catch { Resvg = null }
if (!Resvg) { console.log("icon: @resvg/resvg-js недоступен — пропускаю (положи build/icon.png вручную)"); process.exit(0) }

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#7c5cff"/>
      <stop offset="1" stop-color="#19e3b1"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="116" fill="#0b0b12"/>
  <rect width="512" height="512" rx="116" fill="url(#g)" opacity="0.16"/>
  <path d="M330 120 a156 156 0 1 0 60 300 a124 124 0 1 1 -60 -300 z" fill="url(#g)"/>
  <circle cx="372" cy="150" r="15" fill="#19e3b1"/>
  <circle cx="408" cy="210" r="8" fill="#7c5cff"/>
</svg>`

const r = new Resvg(svg, { fitTo: { mode: "width", value: 512 } })
writeFileSync(out, r.render().asPng())
console.log("icon: сгенерировал build/icon.png")
