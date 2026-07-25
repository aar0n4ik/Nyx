const fs = require('fs');
const p = 'public/index.html';
let s = fs.readFileSync(p, 'utf8');
const pairs = [
  ['roughly 1–2 GB for Lite up to about 9 GB for Max', 'about 1 GB for the Lite tier up to about 5 GB for the Pro tier'],
  ['up to about 9 GB for Max', 'up to about 5 GB for the Pro tier'],
  ['1–2 GB for Lite', '1 GB for the Lite tier'],
  ['1–9 GB per model', '1–5 GB per model'],
  ['1–9 GB by tier', '1–5 GB by tier'],
  ['1–9 Go par modèle', '1–5 Go par modèle'],
  ['1–9 GB pro Modell', '1–5 GB pro Modell'],
  ['1–9 ГБ', '1–5 ГБ']
];
let n = 0;
for (const [a, b] of pairs) { if (s.indexOf(a) !== -1) { s = s.split(a).join(b); n++; } }
fs.writeFileSync(p, s);
console.log('patterns replaced:', n, 'of', pairs.length);
