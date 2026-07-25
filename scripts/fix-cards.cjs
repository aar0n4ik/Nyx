const fs = require('fs');
const p = 'public/index.html';
let s = fs.readFileSync(p, 'utf8');
const pairs = [
  ['~1–2B params', '~1B params'],
  ['~3–4B params', '~4B params'],
  ['~7–8B params', '~8B params'],
  ['~14B+ params', '~3B params'],
  ['For enthusiast rigs that want the sharpest answers.', 'A light step up from Lite for everyday work on typical laptops.'],
  ['Runs on 24 GB+ VRAM GPU', 'Runs on CPU or a basic laptop GPU'],
  ['24 GB+ VRAM GPU', 'CPU or a basic laptop GPU'],
  ['16 GB RAM', '8 GB+ RAM'],
  ['32 GB+ RAM', '6 GB+ RAM'],
  ['8 GB RAM', '3 GB+ RAM'],
  ['Top quality', 'Balanced speed and quality'],
  ['Heavy reasoning, huge context, research', 'Everyday assistant tasks']
];
let n = 0;
for (const [a, b] of pairs) { if (s.indexOf(a) !== -1) { s = s.split(a).join(b); n++; } }
const before = s;
s = s.replace(/\bMax\b/g, 'Standard');
if (s !== before) n++;
fs.writeFileSync(p, s);
console.log('card fixes applied:', n, 'of', pairs.length + 1);
