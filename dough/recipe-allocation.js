import {recipeFlourWater,recipeMass,sumGrams,knownMass,ingredientKind} from './recipe-model.js?v=live-adjustments-2';
const final=r=>r.stages.find(s=>s.id===r.finalStageId);
const requireBasis=r=>{const b=recipeFlourWater(r);if(!b.available)throw Error('Weighed flour/water and complete build transfers are required');return b;};
const key=name=>String(name).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\([^)]*\)/g,'').replace(/[^a-z0-9]+/g,' ').trim();
// Independent material buckets let unchanged unknown culture cancel exactly.
// No hydration or flour blend is invented for a culture whose composition is absent.
function ledger(r){
 const flour=new Map(),unknown=new Map(),other=new Map();let water=0;const active=new Set();
 const add=(map,k,q)=>map.set(k,(map.get(k)||0)+q);
 function visit(stage,factor){if(!stage||active.has(stage.id))throw Error('Missing or circular build');active.add(stage.id);
  for(const row of stage.rows){if(row.quantity===0)continue;if(row.unit!=='g'||row.quantity===null)throw Error('Weighed ingredient quantities are required');const q=row.quantity*factor,kind=ingredientKind(row);if(kind==='transfer'){const build=r.stages.find(s=>s.id===row.fromStage),mass=build&&sumGrams(build);if(row.drained||!mass)throw Error('Build composition is incomplete');visit(build,q/mass);}else if(kind==='flour')add(flour,key(row.name),q);else if(kind==='water')water+=q;else if(kind==='starter'){if(row.seedHydration===undefined)add(unknown,stage.id+':'+row.id,q);else{const f=q/(1+row.seedHydration/100);add(flour,'@culture flour',f);water+=q-f;}}else add(other,key(row.name),q);}
  active.delete(stage.id);
 }
 visit(final(r),1);return {flour,water,unknown,other};
}
const cultureUnknown=v=>ingredientKind(v)==='starter'&&v.seedHydration===undefined;
export function allocationInfo(r,row){
 if(!['transfer','starter'].includes(ingredientKind(row))||row.unit!=='g'||row.quantity===null)return null;
 try{const basis=requireBasis(r),build=row.kind==='transfer'?r.stages.find(s=>s.id===row.fromStage):null;
 if(row.drained||!knownMass(r)||row.quantity<=0||build?.rows.some(v=>v.kind==='transfer'||v.unit!=='g'||v.quantity===null||v.quantity<0)||(!build&&row.seedHydration===undefined))return null;
 const probe={...r,stages:r.stages.map(s=>s.id===r.finalStageId?{...s,rows:[row]}:s)},part=recipeFlourWater(probe);
 if(!part.available)return null;
 return {share:100*row.quantity/recipeMass(r),pff:100*part.flour/basis.flour,flour:part.flour,water:part.water,partial:part.unknownSeeds.length>0};
 }catch{return null;}
}
// All mutations are on a copy; impossible allocations leave the last valid draft intact.
export function linkedAllocationEdit(original,edit){
 if(!Number.isFinite(edit.value)||edit.value<0)throw Error('Enter a nonnegative amount');
 const baseline=structuredClone(original),initial=baseline.stages.find(s=>s.id===edit.stageId)?.rows.find(v=>v.id===edit.rowId);
 if(edit.field==='seedHydration'&&initial?.seedHydration===undefined){if(edit.value>1000)throw Error('Starter hydration must be at most 1000%');initial.seedHydration=edit.value;return baseline;}
 if(edit.field==='quantity'&&initial?.kind==='transfer'&&edit.stageId===baseline.finalStageId)edit={...edit,field:'share',value:100*edit.value/recipeMass(baseline)};
 const before=requireBasis(baseline),beforeLedger=ledger(baseline),r=structuredClone(baseline),f=final(r),mass=recipeMass(baseline),stage=r.stages.find(s=>s.id===edit.stageId),row=stage?.rows.find(v=>v.id===edit.rowId);
 if(!row)throw Error('Ingredient not found');
 if(['share','pff'].includes(edit.field)){
  const info=allocationInfo(r,row);if(stage!==f||!info)throw Error('This build needs an explicit complete composition before resizing');
  let target=edit.field==='share'?mass*edit.value/100:before.flour*edit.value/100*(row.quantity/info.flour);
  if(row.kind==='starter')row.quantity=target;
  else{
   const b=r.stages.find(s=>s.id===row.fromStage),uses=r.stages.flatMap(s=>s.rows.filter(v=>v.kind==='transfer'&&v.fromStage===b.id));if(uses.length!==1)throw Error('A shared build requires explicit transfer quantities');
   const prepared=sumGrams(b),reserve=row.retained||0,unknown=b.rows.filter(cultureUnknown),scalable=b.rows.filter(v=>['flour','water','starter'].includes(ingredientKind(v))&&!cultureUnknown(v)),old=scalable.reduce((n,v)=>n+v.quantity,0),unknownMass=unknown.reduce((n,v)=>n+v.quantity,0),carriedUnknown=unknownMass*row.quantity/prepared,fixed=prepared-old-unknownMass;
   if(edit.field==='pff'){const c=info.flour/row.quantity*prepared/old,t=before.flour*edit.value/100/c+carriedUnknown;target=(t+fixed-reserve+Math.sqrt((reserve-fixed-t)**2+4*t*reserve))/2;}
   if(!Number.isFinite(target)||target<0||(!target&&carriedUnknown>1e-8))throw Error('Enter culture hydration before removing all levain containing unknown culture');
   const desiredUnknown=target?carriedUnknown*(target+reserve)/target:0,scale=(target+reserve-fixed-desiredUnknown)/old;
   if(!Number.isFinite(scale)||scale<0)throw Error('Requested build is smaller than its retained culture/fixed ingredients');
   for(const v of scalable)v.quantity*=scale;
   for(const v of unknown)v.quantity=unknownMass?v.quantity*desiredUnknown/unknownMass:0;
   row.quantity=target;
  }
 }else{
  if(!['quantity','feedPercent','seedHydration'].includes(edit.field))throw Error('Unsupported linked edit');
  if(cultureUnknown(row)&&edit.field!=='seedHydration')throw Error('Enter this starter’s actual hydration before changing its inoculum amount');
  if(edit.field==='feedPercent'){const flour=stage.rows.filter(v=>ingredientKind(v)==='flour'&&v.unit==='g').reduce((n,v)=>n+v.quantity,0);row.quantity=flour*edit.value/100;}else row[edit.field]=edit.value;
  for(const s of r.stages)for(const v of s.rows)if(v.kind==='transfer'){
   const b=r.stages.find(b=>b.id===v.fromStage),previous=baseline.stages.find(b=>b.id===v.fromStage);
   if(!b||b.rows.some(v=>v.unit!=='g'||v.quantity===null)||v.drained)throw Error('Build transfer composition is incomplete');
   const uses=r.stages.flatMap(s=>s.rows.filter(x=>x.kind==='transfer'&&x.fromStage===b.id));if(uses.length!==1)throw Error('A shared build requires explicit transfer quantities');
   const unknown=b.rows.filter(cultureUnknown),oldUnknown=previous.rows.filter(cultureUnknown).reduce((n,v)=>n+v.quantity,0),oldMass=sumGrams(previous),reserve=v.retained||0;
   if(unknown.length&&oldMass>0){const carried=oldUnknown*(oldMass-reserve)/oldMass,rest=sumGrams(b)-unknown.reduce((n,v)=>n+v.quantity,0),newUnknown=(reserve+carried-rest+Math.sqrt((rest-reserve-carried)**2+4*carried*rest))/2;for(const seed of unknown){const old=previous.rows.find(v=>v.id===seed.id).quantity;seed.quantity=oldUnknown?old*newUnknown/oldUnknown:0;}}
   v.quantity=sumGrams(b)-reserve;if(v.quantity<0)throw Error('Retained amount exceeds prepared build');
  }
 }
 const afterLedger=ledger(r);
 for(const k of new Set([...beforeLedger.unknown.keys(),...afterLedger.unknown.keys()]))if(Math.abs((beforeLedger.unknown.get(k)||0)-(afterLedger.unknown.get(k)||0))>1e-6)throw Error('Enter actual starter hydration before changing the carried amount of unknown culture');
 function compensate(rows,delta,label){if(Math.abs(delta)<1e-9)return;const amount=rows.reduce((n,v)=>n+v.quantity,0),target=amount-delta;if(!rows.length||target< -1e-6)throw Error('Not enough final-mix '+label+' for this allocation');if(amount>0)for(const v of rows)v.quantity*=Math.max(0,target)/amount;else rows[0].quantity=Math.max(0,target);}
 const flourRows=f.rows.filter(v=>ingredientKind(v)==='flour'&&v.unit==='g'&&v.quantity!==null&&v.quantity>=0);
 for(const k of new Set([...beforeLedger.flour.keys(),...afterLedger.flour.keys()])){const matching=flourRows.filter(v=>key(v.name)===k);compensate(matching.length?matching:flourRows,(afterLedger.flour.get(k)||0)-(beforeLedger.flour.get(k)||0),k==='@culture flour'?'flour':k);}
 compensate(f.rows.filter(v=>ingredientKind(v)==='water'&&v.unit==='g'&&v.quantity!==null&&v.quantity>=0),afterLedger.water-beforeLedger.water,'water');
 const after=requireBasis(r);if(Math.abs(after.flour-before.flour)>1e-5||Math.abs(after.water-before.water)>1e-5||Math.abs(recipeMass(r)-mass)>1e-5)throw Error('This edit changes other ingredients; their allocation must be specified explicitly');
 return r;
}

// Rescale the working formula, never its immutable original/reference tables.
export function resizeEditorDough(original,target){
 const mass=recipeMass(original);
 if(!knownMass(original)||!(mass>0)||!Number.isFinite(target)||target<=0)throw Error('A positive final dough weight and fully weighed final additions are required');
 const factor=target/mass,r=structuredClone(original);
 for(const stage of r.stages){if(stage.role==='reference')continue;for(const row of stage.rows){
  if(row.quantity!==null)row.quantity*=factor;
  if(row.retained!==undefined)row.retained*=factor;
  if((row.quantity!==null&&(!Number.isFinite(row.quantity)||Math.abs(row.quantity)>1e8))||(row.retained!==undefined&&!Number.isFinite(row.retained)))throw Error('Requested batch is too large');
 }}
 if(r.component)r.component.grams*=factor;
 return r;
}
