import assert from 'node:assert/strict';
import fs from 'node:fs';
import {presets,defaults,validState,calculate} from '../pizzalovers.js';
const {fixtures}=JSON.parse(fs.readFileSync(new URL('./pizzalovers-fixtures.json',import.meta.url)));
const close=(a,b)=>assert.ok(Math.abs(a-b)<=Math.max(1e-8,Math.abs(b)*1e-10),`${a} != ${b}`);
for(const {state,result:expected} of fixtures){
 const result=calculate(state);
 for(const k of ['flour','water','salt','oil','sugar','yeastFresh','yeastPerKg','semola','yeast'])close(result[k],expected[k]);
 close(result.target,expected.total);assert.deepEqual(result.plan,expected.plan);
 if(expected.pre){for(const k of ['flour','water','yeast']){close(result.pre[k],expected.pre[k]);close(result.main[k],expected.main[k])}close(result.pre.total+result.main.flour+result.main.water+result.main.yeast+result.salt+result.oil+result.sugar,result.actual);if(state.p==='biga'){close(result.main.autoWater,expected.main.autoWater);close(result.main.restWater,expected.main.restWater);close(result.main.autoWater+result.main.restWater,result.main.water)}}
 close(result.flour+result.water+result.salt+result.oil+result.sugar+result.yeast,result.actual);
 if(state.y==='fresh')close(result.actual,result.target);
}
assert.equal(Object.keys(presets).length,6);
assert.equal(defaults('teglia').n,2);assert.equal(defaults('romana').y,'dry');
assert.deepEqual(validState('teglia',{n:0,g:Infinity,h:999,y:'x',w:'x'}),defaults('teglia'));
console.log(`PASS ${fixtures.length} source-oracle cases: all six presets, fresh/dry yeast, custom inputs and min/max values; preferment and final-mix mass balances`);
