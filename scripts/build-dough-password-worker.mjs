import fs from 'node:fs';
const auth=fs.readFileSync(new URL('./dough-password-auth.mjs',import.meta.url),'utf8').replaceAll('export ','');
const handler=fs.readFileSync(new URL('./dough-password-handler.mjs',import.meta.url),'utf8');
fs.writeFileSync(new URL('../dough/_worker.js',import.meta.url),auth+'\n'+handler);
