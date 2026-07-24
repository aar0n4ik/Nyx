// Идемпотентно подключает тему+i18n к статике. Запуск: node scripts/inject-web.js
const fs = require("fs");
function patch(file, edits) {
  if (!fs.existsSync(file)) { console.log("skip (нет файла):", file); return; }
  let s = fs.readFileSync(file, "utf8"); const before = s;
  edits.forEach((e) => { if (!s.includes(e.marker)) s = e.apply(s); });
  if (s !== before) { fs.writeFileSync(file, s); console.log("patched:", file); }
  else console.log("уже подключено:", file);
}
const PRE = '<script>(function(){try{var t=localStorage.getItem("nyx-theme");if(!t)t=matchMedia("(prefers-color-scheme: light)").matches?"light":"dark";document.documentElement.setAttribute("data-theme",t)}catch(e){document.documentElement.setAttribute("data-theme","dark")}})();</script>';
patch("public/index.html", [
  { marker: "nyx-theme", apply: (s) => s.replace(/<head[^>]*>/i, (m) => m + "\n" + PRE) },
  { marker: "/nyx-web.css", apply: (s) => s.replace(/<\/head>/i, '<link rel="stylesheet" href="/nyx-web.css">\n</head>') },
  { marker: "/nyx-web.js", apply: (s) => s.replace(/<\/body>/i, '<script src="/nyx-web.js"></script>\n</body>') },
]);
patch("public/app.html", [
  { marker: "/app-controls.js", apply: (s) => s.replace(/<\/body>/i, '<script src="/app-controls.js"></script>\n</body>') },
]);
console.log("done");
