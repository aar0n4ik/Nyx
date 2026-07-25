import { existsSync, mkdirSync, writeFileSync } from "node:fs"
const out = "build/icon.png"
mkdirSync("build", { recursive: true })
if (existsSync(out)) { console.log("icon exists, keeping", out); process.exit(0) }
let Resvg = null
try { ({ Resvg } = await import("@resvg/resvg-js")) } catch { Resvg = null }
if (Resvg === null) { console.log("resvg unavailable, skipping icon gen"); process.exit(0) }
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#7c5cff"/><stop offset="1" stop-color="#19e3b1"/>
  </linearGradient></defs>
  <rect x="16" y="16" width="480" height="480" rx="108" fill="#0b0b12"/>
  <path d="M348 256c0 58-47 105-105 105-14 0-27-3-39-8 46-6 82-45 82-93s-36-87-82-93c12-5 25-8 39-8 58 0 105 47 105 105z" fill="url(#g)"/>
</svg>`
const png = new Resvg(svg, { fitTo: { mode: "width", value: 512 } }).render().asPng()
writeFileSync(out, png)
console.log("generated", out)
