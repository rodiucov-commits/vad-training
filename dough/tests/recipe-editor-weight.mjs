import assert from 'node:assert/strict';
import fs from 'node:fs';
import {resizeEditorDough,linkedAllocationEdit} from '../recipe-allocation.js';
import {recipeMass,recipeFlourWater,knownMass,validateRecipe} from '../recipe-model.js';
const recipes=JSON.parse(fs.readFileSync(new URL('../recipe-catalog.json',import.meta.url))).recipes;
const close=(a,b)=>assert(Math.abs(a-b)<Math.max(1e-6,Math.abs(b)*1e-9),`${a} != ${b}`);
let checked=0;
for(const r of recipes){if(!knownMass(r)||!(recipeMass(r)>0))continue;
 const snapshot=structuredClone(r),basis=recipeFlourWater(r);
 for(const factor of [.5,2,1.37]){const n=resizeEditorDough(r,recipeMass(r)*factor);close(recipeMass(n),recipeMass(r)*factor);assert.deepEqual(n.stages.filter(s=>s.role==='reference'),r.stages.filter(s=>s.role==='reference'));assert.deepEqual(n.methods,r.methods);assert.equal(n.basePieces,r.basePieces);
 const nb=recipeFlourWater(n);if(basis.available){close(nb.flour,basis.flour*factor);close(nb.water,basis.water*factor);}
 for(const [si,s] of r.stages.entries())if(s.role!=='reference')for(const [ri,row]of s.rows.entries()){const v=n.stages[si].rows[ri];if(row.quantity!==null)close(v.quantity,row.quantity*factor);if(row.retained!==undefined)close(v.retained,row.retained*factor);assert.equal(v.seedHydration,row.seedHydration);}
 assert.deepEqual(validateRecipe(n,{publication:true}).errors,validateRecipe(r,{publication:true}).errors);
 const roundtrip=resizeEditorDough(n,recipeMass(r));close(recipeMass(roundtrip),recipeMass(r));
 }assert.deepEqual(r,snapshot);checked++;
}
const r=recipes.find(r=>r.id==='hamelman-semolina-bread'),n=resizeEditorDough(r,3000),final=n.stages.find(s=>s.id===n.finalStageId),ripe=final.rows.find(v=>v.kind==='transfer'),linked=linkedAllocationEdit(n,{stageId:final.id,rowId:ripe.id,field:'quantity',value:700});close(recipeMass(linked),3000);close(recipeFlourWater(linked).flour,recipeFlourWater(n).flour);close(recipeFlourWater(linked).water,recipeFlourWater(n).water);
for(const target of [0,-1,NaN,Infinity,1e20])assert.throws(()=>resizeEditorDough(r,target));
const mixed=structuredClone(r);mixed.stages.find(s=>s.id===mixed.finalStageId).rows[0].unit='eggs';assert.throws(()=>resizeEditorDough(mixed,1000));
console.log(`PASS ${checked} weighed recipes ×3 scales, immutable references/source, roundtrips, retained transfers, unknown culture, Semolina 3000g/700g preferment, invalid and mixed-unit rejection`);
