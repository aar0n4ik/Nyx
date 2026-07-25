const fs=require('fs');
const p='public/index.html';
let h=fs.readFileSync(p,'utf8');
const LT=String.fromCharCode(60), GT=String.fromCharCode(62);
const tag=LT+'script src="/i18n-ru.js"'+GT+LT+'/script'+GT;
const close=LT+'/body'+GT;
if(h.indexOf('/i18n-ru.js')!==-1){ console.log('already present'); process.exit(0); }
if(h.indexOf(close)!==-1){ h=h.replace(close, tag+"\n"+close); }
else { h=h+"\n"+tag+"\n"; }
fs.writeFileSync(p,h);
console.log('injected i18n-ru.js');
