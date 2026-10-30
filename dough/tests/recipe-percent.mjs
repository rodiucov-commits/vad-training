import assert from 'node:assert/strict';import fs from 'node:fs';
import {recipeFlourWater,finalWaterForPercent,scaledRecipe,recipeMass} from '../recipe-model.js';
import {Workbook} from '../engine.js';
const recipes=JSON.parse(fs.readFileSync(new URL('../recipe-catalog.json',import.meta.url))).recipes;
const close=(a,b)=>assert(Math.abs(a-b)<1e-6,`${a} != ${b}`);
const original=JSON.stringify(recipes),small=recipes.find(r=>r.id==='vermont-small'),basis=recipeFlourWater(small),w=new Workbook(JSON.parse(fs.readFileSync(new URL('../workbook.json',import.meta.url))));
close(basis.flour,w.get('Small Vermont Sour','C9'));close(basis.water,w.get('Small Vermont Sour','C16'));assert(basis.unknownSeeds.length);
close(finalWaterForPercent(small,'r2',70),523.5602094240838);close(finalWaterForPercent(small,'r2',70),w.get('Small Vermont Sour','K16'));
close(finalWaterForPercent(small,'r2',76),586.3874345549738);
// A changed build must reduce final addition, not increase overall water twice.
const edited=structuredClone(small);edited.stages[0].rows[1].quantity+=10;edited.stages[1].rows.find(r=>r.kind==='transfer').quantity+=10;close(finalWaterForPercent(edited,'r2',70),513.5602094240838);
// Independent chained-build oracle: 100% seed and a reserved part of each build.
const chain={finalStageId:'f',component:null,stages:[{id:'a',role:'build',rows:[{kind:'flour',quantity:100,unit:'g'},{kind:'water',quantity:50,unit:'g'},{kind:'starter',quantity:50,unit:'g',seedHydration:100}]},{id:'b',role:'build',rows:[{kind:'transfer',quantity:160,retained:40,unit:'g',fromStage:'a'},{kind:'flour',quantity:200,unit:'g'},{kind:'water',quantity:140,unit:'g'}]},{id:'f',role:'final',rows:[{kind:'transfer',quantity:450,retained:50,unit:'g',fromStage:'b'},{kind:'flour',quantity:300,unit:'g'},{id:'water',kind:'water',quantity:100,unit:'g'},{kind:'other',quantity:20,unit:'g',name:'Oil'}]}]};
const c=recipeFlourWater(chain);close(c.flour,570);close(c.water,280);assert.deepEqual(c.unknownSeeds,[]);close(finalWaterForPercent(chain,'water',70),219);
const drained=structuredClone(chain);drained.stages[2].rows[0].drained=true;assert(!recipeFlourWater(drained).available);assert.throws(()=>finalWaterForPercent(drained,'water',70));
assert.throws(()=>finalWaterForPercent(chain,'water',1),/already contain more water/);
const mixed=structuredClone(chain);mixed.stages[0].rows[1].quantity=null;assert(!recipeFlourWater(mixed).available);
const beforeMass=recipeMass(chain);recipeFlourWater(chain);close(beforeMass,recipeMass(chain));
let available=0,waterControls=0,unavailable=0;
for(const r of recipes){const b=recipeFlourWater(r);if(!b.available){unavailable++;continue;}available++;const final=r.stages.find(s=>s.id===r.finalStageId);for(const row of final.rows.filter(row=>row.kind==='water'&&row.unit==='g'&&row.quantity!==null&&row.quantity>=0)){
 const current=100*b.water/b.flour;close(finalWaterForPercent(r,row.id,current),row.quantity);waterControls++;
 for(const scale of [.2,2,3.5]){const scaled=scaledRecipe(r,scale),sb=recipeFlourWater(scaled);close(sb.flour,b.flour*scale);close(sb.water,b.water*scale);close(finalWaterForPercent(scaled,row.id,current),row.quantity*scale);}
 const change=structuredClone(r),target=current+5,q=finalWaterForPercent(change,row.id,target);change.stages.find(s=>s.id===r.finalStageId).rows.find(v=>v.id===row.id).quantity=q;const after=recipeFlourWater(change);close(100*after.water/after.flour,target);
}}
assert.equal(JSON.stringify(recipes),original);console.log('PASS source Small Vermont 70% → 523.56g; build-water subtraction, seed composition, chained transfers/reserves, impossible additions, unknown inputs, immutable source; '+JSON.stringify({recipes:recipes.length,available,unavailable,waterControls,scales:3}));
