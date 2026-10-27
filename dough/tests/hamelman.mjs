import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {defaultState,validState,calculate} from '../hamelman.js';
const data=JSON.parse(fs.readFileSync(new URL('../hamelman.json',import.meta.url))),records=data.recipes;
const at=page=>records.find(r=>r.page===page),close=(a,b)=>assert.ok(Math.abs(a-b)<Math.max(1e-7,Math.abs(b)*1e-10),`${a} != ${b}`);
assert.equal(records.length,60);assert.equal(new Set(records.map(r=>r.id)).size,60);assert.equal(records.filter(r=>r.overall.length).length,31);assert.equal(records.filter(r=>r.methods.length).length,58);assert.equal(records.reduce((a,r)=>a+r.methods.length,0),365);
for(const r of records){
 assert.ok(r.sourceText);assert.ok(r.id.startsWith('hamelman-'));assert.equal(r.methods.length,(r.sourceText.split('**Method:**')[1]||'').match(/^\d+\. /gm)?.length||0);
 const sourceSteps=(r.sourceText.split('**Method:**')[1]||'').split(/^\d+\. /m).slice(1).map(x=>x.trim());assert.deepEqual(r.methods,sourceSteps);
 for(const i of r.overall)assert.ok(r.sourceText.includes(`• ${i.name}: ${i.percent}%`)||r.sourceText.includes(`• ${i.name}: ${i.percent.toFixed(1)}%`));
 if(!r.overall.length){assert.ok(r.issues.some(i=>i.includes('complete overall')));continue}
 const original=JSON.stringify(r),s=defaultState(r),sum=r.overall.reduce((a,i)=>a+i.percent,0);close(calculate(r,s).basisPercent,100);
 for(const flour of [100,1000,1723.456]){const c=calculate(r,{...s,flour});close(c.mass,flour*sum/100);close(c.basis+c.water+c.other,c.mass);if(c.complete)close(c.finalMass,c.mass);for(const b of c.builds)if(b.rows)close(b.rows.reduce((a,i)=>a+i.grams,0),b.total)}
 assert.equal(JSON.stringify(r),original);
}
const p=calculate(at(92),defaultState(at(92)));close(p.mass,1691);close(p.builds[0].total,660.66);close(p.final.find(i=>i.name==='Water').grams,330);close(p.final.find(i=>i.name==='Yeast').grams,10.34);
const soaker=calculate(at(122),defaultState(at(122)));close(soaker.builds.find(b=>b.name==='Soaker').total,450);close(soaker.final.find(i=>i.key==='water').grams,302.5);
const rounded=calculate(at(127),defaultState(at(127)));assert.ok(rounded.ready);assert.equal(rounded.final.filter(i=>i.grams<0).length,0);close(rounded.builds.find(b=>b.name==='Soaker').total,675);assert.match(rounded.warnings.join(' '),/rounded/);
const conflict=calculate(at(141),defaultState(at(141)));assert.equal(conflict.ready,false);close(conflict.final.find(i=>i.name==='Yeast').grams,-.2);assert.match(conflict.warnings.join(' '),/more Yeast/);
for(const page of [105,107,320,336,344,348,351])assert.equal(calculate(at(page),defaultState(at(page))).complete,false);
const buns=calculate(at(336),{...defaultState(at(336)),pref:10});assert.ok(buns.ready);close(buns.builds[0].rows.find(i=>i.name==='Milk').grams,500);close(buns.final.find(i=>i.name==='Milk').grams,0);
const milk=calculate(at(137),defaultState(at(137)));close(milk.hydration,20);close(milk.mass,1812.5);
for(const page of [101,129,143])close(calculate(at(page),defaultState(at(page))).basis,1000);
assert.deepEqual(validState(at(92),{flour:Infinity,pieces:0,pref:101,percent:[-1]}),defaultState(at(92)));
if(process.env.SOURCE_TXT){const text=fs.readFileSync(process.env.SOURCE_TXT,'utf8');assert.equal(crypto.createHash('sha256').update(text).digest('hex'),data.sourceSha256);for(const r of records){assert.ok(text.includes(r.sourceText),`Source entry changed: ${r.title}`);for(const step of r.methods)assert.ok(text.includes(step),`Method step changed: ${r.title}`)}console.log('PASS original attachment SHA256, all 60 complete source entries and all 365 method steps preserved exactly')}
console.log('PASS 60 recipe inventories; 31 formulas at three scales; preferment/soaker/final mass balances; rounded soakers; source conflicts; missing formulas/build shares; milk is not pure water; safe saved inputs');
