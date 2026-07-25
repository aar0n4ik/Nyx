const fs = require('fs');
const p = 'package.json';
const j = JSON.parse(fs.readFileSync(p, 'utf8'));
j.version = '0.7.2';
j.build = j.build || {};
if (j.build.protocols === undefined) { j.build.protocols = [{ name: 'Nyx Protocol', schemes: ['nyx'] }]; }
j.build.win = j.build.win || {};
j.build.win.target = ['nsis'];
j.build.artifactName = 'Nyx-Setup-${version}.${ext}';
fs.writeFileSync(p, JSON.stringify(j, null, 2) + '\n');
console.log('version', j.version, '| target', JSON.stringify(j.build.win.target), '| name', j.build.artifactName);
