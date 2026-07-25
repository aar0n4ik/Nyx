const fs = require('fs');
const p = 'public/index.html';
let s = fs.readFileSync(p, 'utf8');
const pairs = [
  ['9 GB', '5 GB'],
  ['9 Go', '5 Go'],
  ['9 ГБ', '5 ГБ'],
  [' for Max', ' for the Pro tier'],
  [' pour Max', ' pour le niveau Pro'],
  [' für Max', ' für die Pro-Stufe'],
  [' para Max', ' para el nivel Pro'],
  [' для Max', ' для рівня Pro'],
  [' для Макс', ' для рівня Pro']
];
let n = 0;
for (const [a, b] of pairs) { if (s.indexOf(a) !== -1) { s = s.split(a).join(b); n++; } }
fs.writeFileSync(p, s);
console.log('i18n size fixes applied:', n, 'of', pairs.length);
