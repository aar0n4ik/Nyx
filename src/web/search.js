// Nyx Online mode — minimal, privacy-preserving web search.
// PRIVACY CONTRACT: this module receives ONLY the current user query string.
// It never sees chat history, notes, or any device data. It opens exactly ONE
// host (DuckDuckGo HTML endpoint) via NetGuard's transient, ref-counted,
// audited allowance — then NetGuard shuts the door again. Every opened host is
// written to evidence/netguard.json.
import { withAllowedHost } from "../netguard.js"

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"

function decodeEntities(s) {
  return String(s || "")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/&#39;/g, "'").replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, function (_, d) { return String.fromCharCode(+d) })
}

function stripTags(s) {
  return decodeEntities(String(s || "").replace(/<[^>]*>/g, "")).replace(/\s+/g, " ").trim()
}

// DuckDuckGo wraps outbound links as /l/?uddg=<encoded>. Unwrap to the real URL.
function realUrl(href) {
  try {
    const s = String(href || "")
    const m = s.match(/[?&]uddg=([^&]+)/)
    if (m) return decodeURIComponent(m[1])
    if (s.indexOf("//") === 0) return "https:" + s
    return s
  } catch (e) { return String(href || "") }
}

function parseHtml(html) {
  const out = []
  const re = /<a[^>]*class="[^"]*result__a[^"]*"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g
  let m
  while ((m = re.exec(html)) && out.length < 10) {
    const url = realUrl(m[1]); const title = stripTags(m[2])
    if (title && url) out.push({ title: title, url: url, snippet: "" })
  }
  const sre = /<a[^>]*class="[^"]*result__snippet[^"]*"[^>]*>([\s\S]*?)<\/a>/g
  let sm, i = 0
  while ((sm = sre.exec(html)) && i < out.length) { out[i].snippet = stripTags(sm[1]); i++ }
  return out
}

function parseLite(html) {
  const out = []
  const re = /<a[^>]*class="[^"]*result-link[^"]*"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g
  let m
  while ((m = re.exec(html)) && out.length < 10) {
    const url = realUrl(m[1]); const title = stripTags(m[2])
    if (title && url) out.push({ title: title, url: url, snippet: "" })
  }
  const sre = /<td[^>]*class="[^"]*result-snippet[^"]*"[^>]*>([\s\S]*?)<\/td>/g
  let sm, i = 0
  while ((sm = sre.exec(html)) && i < out.length) { out[i].snippet = stripTags(sm[1]); i++ }
  return out
}

async function fetchText(url) {
  const ctrl = new AbortController()
  const to = setTimeout(function () { ctrl.abort() }, 9000)
  try {
    const res = await fetch(url, { headers: { "user-agent": UA, "accept": "text/html" }, signal: ctrl.signal })
    return await res.text()
  } finally { clearTimeout(to) }
}

export async function webSearch(query, opts) {
  opts = opts || {}
  const q = String(query || "").slice(0, 400).trim()   // hard cap: only a short query ever leaves the device
  const count = opts.count || 5
  if (!q) return { query: "", results: [], context: "", sources: [] }
  const host = "duckduckgo.com"   // the ONLY host NetGuard opens, and only for this one call
  try {
    let results = await withAllowedHost(host, async function () {
      const html = await fetchText("https://html.duckduckgo.com/html/?q=" + encodeURIComponent(q))
      let r = parseHtml(html)
      if (!r.length) {
        const lite = await fetchText("https://lite.duckduckgo.com/lite/?q=" + encodeURIComponent(q))
        r = parseLite(lite)
      }
      return r
    })
    results = (results || []).slice(0, count)
    const sources = results.map(function (r) { return r.url })
    const context = results.map(function (r, i) {
      return "[" + (i + 1) + "] " + r.title + "\n" + r.url + (r.snippet ? "\n" + r.snippet : "")
    }).join("\n\n")
    return { query: q, results: results, context: context, sources: sources }
  } catch (e) {
    return { query: q, results: [], context: "", sources: [], error: String((e && e.message) || e) }
  }
}

export default { webSearch }
