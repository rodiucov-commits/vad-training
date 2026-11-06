import assert from 'node:assert/strict';
import {recipeFlourWater,recipeMass,validateRecipe} from '../recipe-model.js';
import {linkedAllocationEdit,allocationInfo} from '../recipe-allocation.js';
const flour=(id,q)=>({id,name:'Bread flour',quantity:q,unit:'g',kind:'flour'}), water=(id,q)=>({id,name:'Water',quantity:q,unit:'g',kind:'water'});
const fixture=()=>({finalStageId:'final',stages:[{id:'levain',role:'build',rows:[flour('bf',90),water('bw',90),{id:'seed',name:'Starter',quantity:20,unit:'g',kind:'starter',seedHydration:100}]},{id:'final',role:'final',rows:[flour('ff',900),water('fw',600),{id:'salt',name:'Salt',quantity:20,unit:'g',kind:'other'},{id:'ripe',name:'Liquid levain',quantity:200,retained:0,unit:'g',kind:'transfer',fromStage:'levain'}]}]});
const close=(a,b)=>assert(Math.abs(a-b)<1e-6,`${a} != ${b}`);
for(const field of ['share','pff','quantity']){
 const r=fixture(),next=linkedAllocationEdit(r,{stageId:'final',rowId:'ripe',field,value:field==='share'?25:field==='pff'?25:400}),b=recipeFlourWater(next);close(b.flour,1000);close(b.water,700);close(recipeMass(next),1720);assert.deepEqual(r,fixture());
 if(field==='share'){close(next.stages[1].rows[3].quantity,430);close(next.stages[1].rows[0].quantity,785);close(next.stages[1].rows[1].quantity,485);}
 if(field==='quantity')close(next.stages[1].rows[3].quantity,400);
 if(field==='pff')close(allocationInfo(next,next.stages[1].rows[3]).pff,25);
}
for(const field of ['feedPercent','quantity']){const next=linkedAllocationEdit(fixture(),{stageId:'levain',rowId:'seed',field,value:40});close(recipeFlourWater(next).water,700);close(recipeFlourWater(next).flour,1000);close(recipeMass(next),1720);}
const retained=fixture();retained.stages[1].rows[3].quantity=180;retained.stages[1].rows[3].retained=20;
for(const pct of [5,15,30]){const next=linkedAllocationEdit(retained,{stageId:'final',rowId:'ripe',field:'share',value:pct});close(recipeMass(next),1700);close(recipeFlourWater(next).flour,990);close(recipeFlourWater(next).water,690);close(next.stages[1].rows[3].retained,20);close(next.stages[0].rows.reduce((n,v)=>n+v.quantity,0)-next.stages[1].rows[3].quantity,20);}
const unknown=fixture();delete unknown.stages[0].rows[2].seedHydration;assert.equal(allocationInfo(unknown,unknown.stages[1].rows[3]).partial,true);const unknownNext=linkedAllocationEdit(unknown,{stageId:'final',rowId:'ripe',field:'share',value:20});close(recipeMass(unknownNext),1720);close(recipeFlourWater(unknownNext).flour,990);close(recipeFlourWater(unknownNext).water,690);close(unknownNext.stages[0].rows[2].quantity,20);assert.equal(linkedAllocationEdit(unknown,{stageId:'levain',rowId:'seed',field:'seedHydration',value:100}).stages[0].rows[2].seedHydration,100);
assert.throws(()=>linkedAllocationEdit(fixture(),{stageId:'final',rowId:'ripe',field:'share',value:99}),/Not enough/);
const zero=linkedAllocationEdit(fixture(),{stageId:'final',rowId:'ripe',field:'share',value:0});close(recipeMass(zero),1720);close(zero.stages[1].rows[0].quantity,1000);close(zero.stages[1].rows[1].quantity,700);
console.log('PASS linked build/seed quantities, dough share, PFF, reserves, zero, unknown hydration and impossible allocation; fixed 1000 g flour / 700 g water / 1720 g dough');
