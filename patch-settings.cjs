const fs = require("fs")
const F = "public/settings.js"
let s = fs.readFileSync(F, "utf8")
let ok = 0, miss = 0
function must(name, re, rep) {
  if (!re.test(s)) { console.error("MISS: " + name); miss++; return }
  s = s.replace(re, function () { return rep }); console.log("ok  " + name); ok++
}

// 1) Don't load / apply accent on boot
must("bootAccent", /var ac = ls\("nyx\.accent"\);.*\n/, "\n")

// 2) applyAccent becomes a no-op (accent removed entirely, #6)
must("applyAccentFn", /function applyAccent\(a\)\{.*\}/, "function applyAccent(){}")

// 3) Remove the Accent color row from Appearance (#6)
must("accentRow", /\n\s*\+ row\(T\("accent"\), null, accHtml\)/, "")

// 4) Settings nav: drop emoji icons (#4/#5)
must("navKeys", /var navKeys=\[\[[\s\S]*?\]\];/, 'var navKeys=[["general",""],["appearance",""],["chat",""],["privacy",""],["models",""],["about",""]];')

// 5) Topbar settings button: clean monochrome gear (currentColor)
const GEAR = 'b.innerHTML=\'<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 8 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H2a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 3.6 8a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H8a1.65 1.65 0 0 0 1-1.51V2a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V8a1.65 1.65 0 0 0 1.51 1H22a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>\';'
must("gearBtn", /b\.innerHTML\s*=\s*["']*["'];/, GEAR)

// 6) Theme-aware, accent-free modal CSS + working font-size/density (#6/#9)
const NEWCSS = `s.textContent=[
".topbar #lang,.topbar #themeBtn{display:none!important}",
"[data-fontsize=s] .bubble{font-size:13px!important}[data-fontsize=m] .bubble{font-size:15px!important}[data-fontsize=l] .bubble{font-size:17.5px!important}",
"[data-density=compact] .msg{margin:6px 0!important}[data-density=compact] .bubble{padding:8px 12px!important}[data-density=cozy] .msg{margin:14px 0}[data-density=cozy] .bubble{padding:12px 15px}",
"#nyxSettingsBtn{cursor:pointer;display:inline-flex;align-items:center;justify-content:center;width:36px;height:36px;border-radius:10px;border:1px solid var(--line);background:var(--elev,transparent);color:var(--ink)}",
"#nyxSettingsBtn:hover{background:var(--elev2,rgba(127,127,127,.14))}",
".nyxset-ov{--sp:#fff;--si:#101014;--sl:#e7e7ee;--sm:#5b5b66;--se:#f3f3f6;--sh:#101014;--shi:#fff;position:fixed;inset:0;z-index:99998;display:flex;align-items:center;justify-content:center;background:rgba(10,10,14,.5);backdrop-filter:blur(6px);padding:20px}",
"[data-theme=dark] .nyxset-ov{--sp:#101015;--si:#f4f4f6;--sl:#24242e;--sm:#9a9aa6;--se:#1b1b24;--sh:#f4f4f6;--shi:#0a0a0c}",
".nyxset{width:100%;max-width:820px;height:600px;max-height:88vh;display:flex;background:var(--sp);color:var(--si);border:1px solid var(--sl);border-radius:18px;box-shadow:0 30px 80px rgba(0,0,0,.35);overflow:hidden}",
".nyxset-nav{width:216px;flex:none;border-right:1px solid var(--sl);padding:16px 10px;display:flex;flex-direction:column;gap:2px}",
".nyxset-nav h4{font-size:16px;margin:6px 10px 14px;color:var(--si)}",
".nsi{display:flex;align-items:center;gap:10px;padding:9px 12px;border-radius:10px;cursor:pointer;font-size:14px;color:var(--sm)}",
".nsi:hover{background:var(--se);color:var(--si)}",
".nsi.on{background:var(--se);color:var(--si);font-weight:600}",
".nyxset-main{flex:1;display:flex;flex-direction:column;min-width:0}",
".nyxset-body{flex:1;overflow:auto;padding:22px 26px}",
".nsec{display:none}.nsec.on{display:block}",
".nsec h3{font-size:18px;margin:0 0 16px;color:var(--si)}",
".nrow{display:flex;justify-content:space-between;align-items:center;gap:16px;padding:14px 0;border-bottom:1px solid var(--sl)}",
".nrow:last-child{border-bottom:none}",
".nrow .lb{font-size:14px;font-weight:600;color:var(--si)}.nrow .ds{font-size:12px;color:var(--sm);margin-top:3px;max-width:420px}",
".nrow .ctl{flex:none;display:flex;gap:8px;align-items:center}",
".nsel{background:var(--se);border:1px solid var(--sl);color:var(--si);border-radius:9px;padding:8px 12px;font-size:14px}",
".seg{display:inline-flex;border:1px solid var(--sl);border-radius:10px;overflow:hidden}",
".seg button{background:transparent;border:none;color:var(--sm);padding:8px 14px;font-size:13px;cursor:pointer}",
".seg button.on{background:var(--sh);color:var(--shi)}",
".nbtn{cursor:pointer;border-radius:10px;padding:9px 16px;font-size:13px;font-weight:600;border:1px solid var(--sl);background:var(--se);color:var(--si)}",
".nbtn:hover{filter:brightness(1.06)}",
".nbtn.danger{border-color:#ef4444;color:#ef4444;background:transparent}",
".nbtn.pri{background:var(--sh);color:var(--shi);border:none}",
".nyxset-foot{display:flex;justify-content:space-between;align-items:center;padding:14px 22px;border-top:1px solid var(--sl)}",
".nyxset-foot .pv{font-size:12px;color:var(--sm)}",
".alink{color:var(--si);text-decoration:none;font-size:13px;margin-right:14px;opacity:.75}",
".alink:hover{opacity:1}"
].join("");`
must("modalCss", /s\.textContent=\[[\s\S]*?\]\.join\(""\);/, NEWCSS)

fs.writeFileSync(F, s)
const accLeft = (s.match(/--accent/g) || []).length
console.log("---")
console.log("applied=" + ok + " missed=" + miss + " | --accent refs left=" + accLeft)
if (miss > 0) process.exitCode = 1
