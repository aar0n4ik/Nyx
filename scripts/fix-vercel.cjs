const fs = require('fs');
const p = 'vercel.json';
const j = JSON.parse(fs.readFileSync(p, 'utf8'));
delete j.functions;
fs.writeFileSync(p, JSON.stringify(j, null, 2) + '\n');
console.log('functions still present?', 'functions' in j);
