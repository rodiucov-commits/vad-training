import {recipeFlourWater,recipeMass,sumGrams,knownMass} from './recipe-model.js?v=save-new-recipe-1';
const final=r=>r.stages.find(s=>s.id===r.finalStageId);
const requireBasis=r=>{const b=recipeFlourWater(r);if(!b.available||b.unknownSeeds.length)throw Error('Enter known starter hydration and weighed build ingredients before linking flour and water');return b;};
export function allocationInfo(r,row){
 if(!['transfer','starter'].includes(row.kind)||row.unit!=='g'||row.quantity===null)return null;
 try{const basis=requireBasis(r),build=row.kind==='transfer'?r.stages.find(s=>s.id===row.fromStage):null;
 if(row.drained||!knownMass(r)||row.quantity<0||build?.rows.some(v=>v.kind==='transfer'||v.unit!=='g'||v.quantity===null||v.quantity<0))return null;
 const probe={...r,stages:r.stages.map(s=>s.id===r.finalStageId?{...s,rows:[row]}:s)},part=recipeFlourWater(probe);
 if(!part.available||part.unknownSeeds.length)return null;
 return {share:100*row.quantity/recipeMass(r),pff:100*part.flour/basis.flour,flour:part.flour,water:part.water};
 }catch{return null;}
}
// Transactional: invalid edits never partly overwrite a draft. Only actual carried
// flour/water differences are deducted, so retained starter is not counted twice.
export function linkedAllocationEdit(original,edit){
 if(!Number.isFinite(edit.value)||edit.value<0)throw Error('Enter a nonnegative amount');
 const baseline=structuredClone(original);let newComposition=false;if(edit.field==='seedHydration'){const seed=baseline.stages.find(s=>s.id===edit.stageId)?.rows.find(v=>v.id===edit.rowId);if(seed?.seedHydration===undefined){if(edit.value>1000)throw Error('Starter hydration must be at most 1000%');seed.seedHydration=edit.value;newComposition=true;}}
 // Assigning previously unknown composition corrects the accounting basis; it is
 // not extra material and must not remove flour/water from an already weighed recipe.
 if(newComposition)return baseline;
 if(edit.field==='quantity'&&baseline.stages.find(s=>s.id===edit.stageId)?.rows.find(v=>v.id===edit.rowId)?.kind==='transfer'&&edit.stageId===baseline.finalStageId)edit={...edit,field:'share',value:100*edit.value/recipeMass(baseline)};
 const before=requireBasis(baseline),r=structuredClone(baseline),f=final(r),mass=recipeMass(baseline);
 const stage=r.stages.find(s=>s.id===edit.stageId),row=stage?.rows.find(v=>v.id===edit.rowId);
 if(!row||!Number.isFinite(edit.value)||edit.value<0)throw Error('Enter a nonnegative amount');
 if(['share','pff'].includes(edit.field)){
  const info=allocationInfo(r,row);if(stage!==f||!info)throw Error('This build cannot be resized automatically; specify its composition first');
  let target=edit.field==='share'?mass*edit.value/100:before.flour*edit.value/100*(row.quantity/info.flour);
  if(!Number.isFinite(target))throw Error('A zero build needs explicit feed quantities before it can be increased');
  if(row.kind==='starter')row.quantity=target;
  else{
   const b=r.stages.find(s=>s.id===row.fromStage),uses=r.stages.flatMap(s=>s.rows.filter(v=>v.kind==='transfer'&&v.fromStage===b.id));
   if(uses.length!==1)throw Error('A shared build requires explicit transfer quantities');
   const scalable=b.rows.filter(v=>['flour','water','starter'].includes(v.kind)),fixed=sumGrams(b)-scalable.reduce((n,v)=>n+v.quantity,0),old=scalable.reduce((n,v)=>n+v.quantity,0);
   if(edit.field==='pff'&&fixed>0){const wanted=before.flour*edit.value/100,c=info.flour/row.quantity*(sumGrams(b)/old),reserve=row.retained||0;const t=wanted/c;target=(t+fixed-reserve+Math.sqrt((reserve-fixed-t)**2+4*t*reserve))/2;}
   const scale=(target+(row.retained||0)-fixed)/old;
   if(!Number.isFinite(scale)||scale<0)throw Error('Requested build is smaller than its fixed ingredients');
   for(const v of scalable)v.quantity*=scale;
   row.quantity=target;
  }
 }else{
  if(!['quantity','feedPercent','seedHydration'].includes(edit.field))throw Error('Unsupported linked edit');
  if(edit.field==='feedPercent'){const flour=stage.rows.filter(v=>v.kind==='flour'&&v.unit==='g').reduce((n,v)=>n+v.quantity,0);row.quantity=flour*edit.value/100;}
  else row[edit.field]=edit.value;
  // Recalculate preceding-to-following transfers, retaining each explicit reserve.
  for(const s of r.stages)for(const v of s.rows)if(v.kind==='transfer'){
   const b=r.stages.find(b=>b.id===v.fromStage);
   if(!b||b.rows.some(v=>v.unit!=='g'||v.quantity===null)||v.drained)throw Error('Build transfer composition is incomplete');
   const uses=r.stages.flatMap(s=>s.rows.filter(x=>x.kind==='transfer'&&x.fromStage===b.id));
   if(uses.length!==1)throw Error('A shared build requires explicit transfer quantities');
   v.quantity=sumGrams(b)-(v.retained||0);if(v.quantity<0)throw Error('Retained amount exceeds prepared build');
  }
 }
 const after=requireBasis(r);
 for(const kind of ['flour','water']){
  const delta=after[kind]-before[kind],rows=f.rows.filter(v=>v.kind===kind&&v.unit==='g'&&v.quantity!==null&&v.quantity>=0),available=rows.reduce((n,v)=>n+v.quantity,0),target=available-delta;
  if(target< -1e-6||(!rows.length&&Math.abs(delta)>1e-6))throw Error('Not enough final-mix '+kind+' for this allocation');
  if(available>0)for(const v of rows)v.quantity*=Math.max(0,target)/available;
  else if(rows.length)rows[0].quantity=Math.max(0,target);
 }
 if(Math.abs(recipeMass(r)-mass)>1e-5)throw Error('This edit also changes other ingredients; adjust them explicitly before linking');
 return r;
}
