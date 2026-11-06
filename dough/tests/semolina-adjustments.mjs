import fs from 'node:fs';import assert from 'node:assert/strict';import {linkedAllocationEdit,allocationInfo} from '../recipe-allocation.js';import {recipeFlourWater,recipeMass,ingredientKind} from '../recipe-model.js';
const r=JSON.parse(fs.readFileSync(new URL('../recipe-catalog.json',import.meta.url))).recipes.find(r=>r.id==='hamelman-semolina-bread'),snapshot=JSON.stringify(r),basis=recipeFlourWater(r),mass=recipeMass(r),close=(a,b)=>assert(Math.abs(a-b)<1e-6,`${a} != ${b}`);
assert.deepEqual(basis.unknownSeeds,['mature culture (liquid)']);assert.equal(ingredientKind(r.stages[2].rows[4]),'other');assert.equal(allocationInfo(r,r.stages[2].rows[5]).partial,true);
// Independently trace unknown culture retained in the ripe transfer. Never assume
// a hydration just to get a passing numerical balance.
const carried=q=>q.stages[1].rows[2].quantity*q.stages[2].rows[5].quantity/q.stages[1].rows.reduce((n,v)=>n+v.quantity,0),unknownCarried=carried(r);
function verify(q){close(recipeFlourWater(q).flour,basis.flour);close(recipeFlourWater(q).water,basis.water);close(recipeMass(q),mass);close(carried(q),unknownCarried);close(q.stages[2].rows[1].quantity,600);close(q.stages[2].rows[4].quantity,50);close(q.stages[2].rows[5].retained,30);}
let next=linkedAllocationEdit(r,{stageId:'table1',rowId:'r1',field:'quantity',value:207.5});verify(next);assert(next.stages[2].rows[2].quantity<482.5);close(next.stages[1].rows[1].quantity,207.5);
next=linkedAllocationEdit(next,{stageId:'table1',rowId:'r0',field:'quantity',value:170});verify(next);assert(next.stages[2].rows[0].quantity<250);
for(const share of [25,30,20,28]){next=linkedAllocationEdit(next,{stageId:'table2',rowId:'r5',field:'share',value:share});verify(next);close(next.stages[2].rows[5].quantity,mass*share/100);}
next=linkedAllocationEdit(next,{stageId:'table2',rowId:'r5',field:'pff',value:20});verify(next);close(allocationInfo(next,next.stages[2].rows[5]).pff,20);
assert.throws(()=>linkedAllocationEdit(r,{stageId:'table1',rowId:'r2',field:'quantity',value:40}),/actual hydration/);assert.equal(JSON.stringify(r),snapshot);
console.log('PASS exact Semolina route: sesame not culture, unknown culture carried unchanged, repeated water/flour/share/PFF edits preserve total composition, flour blend, salt/seeds, fixed reserve and dough weight');
