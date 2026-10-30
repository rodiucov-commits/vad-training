// Shared browser/server schema and calculations. A stage explicitly lists additions;
// a ripe build appears once as a transfer, never again as separate feed additions.
export const sumGrams=stage=>stage.rows.reduce((sum,r)=>sum+(r.unit==='g'&&typeof r.quantity==='number'?r.quantity:0),0);
export function recipeMass(r){return sumGrams(r.stages.find(s=>s.id===r.finalStageId));}
export function knownMass(r){return r.stages.find(s=>s.id===r.finalStageId).rows.every(v=>v.unit==='g'&&v.quantity!==null);}
// Trace only the material transferred into the finished dough. Prepared reserves,
// original reference tables and fillings are not additional dough ingredients.
export function recipeFlourWater(r){
 const reasons=new Set(),unknownSeeds=new Set(),unknownWaterComponents=new Set(),active=new Set();
 function visit(stage,factor=1){
  if(!stage||active.has(stage.id)){reasons.add('Missing or circular build');return {flour:0,water:0};}
  active.add(stage.id);const result={flour:0,water:0};
  for(const row of stage.rows){
   if(row.quantity===0)continue;
   if(row.kind==='transfer'){
    const build=r.stages.find(s=>s.id===row.fromStage),mass=build?sumGrams(build):0;
    if(row.drained||!build||mass<=0||row.quantity===null||row.unit!=='g'||build.rows.some(v=>v.quantity===null||v.unit!=='g')){reasons.add('Build composition cannot be determined: '+row.name);continue;}
    const part=visit(build,factor*row.quantity/mass);result.flour+=part.flour;result.water+=part.water;
   }else if(row.kind==='other'&&/milk|buttermilk|eggs?|yog[hu]rt|kefir|cream|juice|whey|butter|honey|syrup|puree|purée/i.test(row.name||'')){
    unknownWaterComponents.add(row.name);
   }else if(['flour','water','starter'].includes(row.kind)){
    if(row.quantity===null||row.unit!=='g'){reasons.add('Unweighed flour, water or starter: '+row.name);continue;}
    const quantity=row.quantity*factor;
    if(row.kind==='starter'){
     if(row.seedHydration===undefined){unknownSeeds.add(row.name);continue;}
     const flour=quantity/(1+row.seedHydration/100);result.flour+=flour;result.water+=quantity-flour;
    }else result[row.kind]+=quantity;
   }
  }
  active.delete(stage.id);return result;
 }
 const values=visit(r.stages.find(s=>s.id===r.finalStageId));
 if(r.component)reasons.add('Base-dough composition is held in a separate recipe');
 if(values.flour<=0)reasons.add('No positive known flour basis');
 return {...values,available:reasons.size===0,reasons:[...reasons],unknownSeeds:[...unknownSeeds],unknownWaterComponents:[...unknownWaterComponents]};
}
export function finalWaterForPercent(r,rowId,percent){
 const row=r.stages.find(s=>s.id===r.finalStageId)?.rows.find(v=>v.id===rowId),basis=recipeFlourWater(r);
 if(!basis.available||row?.kind!=='water'||row.unit!=='g'||row.quantity===null||!Number.isFinite(percent)||percent<0)throw Error('Overall water percentage is unavailable');
 const quantity=basis.flour*percent/100-(basis.water-row.quantity);
 if(quantity<-.000001)throw Error('Builds already contain more water than the requested overall percentage');
 return Math.max(0,quantity);
}
export function scaledRecipe(r,factor){if(!Number.isFinite(factor)||factor<=0||factor>1e6)throw Error('Invalid batch scale');return {...r,stages:r.stages.map(s=>({...s,rows:s.rows.map(v=>({...v,quantity:v.quantity===null?null:v.quantity*factor,...(v.retained!==undefined?{retained:v.retained*factor}:{})}))}))};}
export function validateRecipe(r,{publication=false}={}){
 const errors=[],warnings=[];const str=(v,max=2000)=>typeof v==='string'&&v.length<=max;const id=v=>str(v,100)&&/^[a-z0-9][a-z0-9-]*$/.test(v);
 if(!r||typeof r!=='object'||Array.isArray(r))return {errors:['Invalid recipe record'],warnings};
 if(r.schemaVersion!==1||!id(r.id))errors.push('Invalid recipe ID or schema');
 if(!str(r.title,200)||!r.title.trim()||!str(r.description)||!str(r.tag,100))errors.push('Title, description or category is invalid');
 if(!r.source||!['workbook','hamelman','pizzalovers'].includes(r.source.kind)||r.source.referenceId!==r.id||!str(r.source.sha256,64)||!/^[a-f0-9]{64}$/.test(r.source.sha256))errors.push('Invalid source provenance');
 if(r.component!==null&&(!r.component||!id(r.component.id)||!str(r.component.name,200)||!Number.isFinite(r.component.grams)||r.component.grams<=0))errors.push('Invalid base-dough component');
 if(!Number.isInteger(r.basePieces)||r.basePieces<1||r.basePieces>10000)errors.push('Piece count must be 1–10,000');
 if(!Array.isArray(r.stages)||!r.stages.length||r.stages.length>40)return {errors:[...errors,'A recipe requires 1–40 stages'],warnings};
 const ids=new Set();for(const s of r.stages){if(!s||!id(s.id)||ids.has(s.id)||!str(s.name,200)||!['build','final','component','reference'].includes(s.role)||!str(s.timing))errors.push('Invalid or duplicate stage');ids.add(s?.id);if(!Array.isArray(s?.rows)||s.rows.length>200||!s.rows.length){errors.push('Each stage needs 1–200 ingredients');continue;}
  const rowIds=new Set();for(const v of s.rows){if(!v||!id(v.id)||rowIds.has(v.id)||!str(v.name,300)||!v.name.trim()||!['g','ml','eggs','tsp','text'].includes(v.unit)||!['flour','water','starter','other','transfer'].includes(v.kind)||!str(v.display??'',2000))errors.push('Invalid ingredient');rowIds.add(v?.id);
   if(v.quantity!==null&&(typeof v.quantity!=='number'||!Number.isFinite(v.quantity)||Math.abs(v.quantity)>1e8))errors.push('Ingredient quantities must be finite');
   if(v.quantity<0){(publication?errors:warnings).push('Negative source addition: '+v.name);}
   if(v.quantity===null)warnings.push('Unquantified ingredient: '+v.name);
   if(v.seedHydration!==undefined&&(!Number.isFinite(v.seedHydration)||v.seedHydration<0||v.seedHydration>1000))errors.push('Invalid seed hydration');
   if(v.kind==='starter'&&v.seedHydration===undefined)warnings.push('Starter hydration is unspecified: '+v.name);
  }
 }
 if(r.stages.some(s=>!s||!Array.isArray(s.rows)||s.rows.some(v=>!v||typeof v!=='object')))return {errors:[...new Set(errors)],warnings};
 const final=r.stages.filter(s=>s.id===r.finalStageId);if(final.length!==1||final[0]?.role!=='final'||r.stages.filter(s=>s.role==='final').length!==1)errors.push('Exactly one final stage is required');
 for(const [i,s]of r.stages.entries())for(const v of s.rows||[]){if(v.kind==='transfer'){
  const bi=r.stages.findIndex(b=>b.id===v.fromStage),b=r.stages[bi];if(!b||bi>=i||b.role!=='build'){errors.push('A transfer must refer to a preceding visible build: '+v.name);continue;}
  if(v.quantity===null||v.unit!=='g'||!Number.isFinite(v.retained)||v.retained<-.000001)errors.push('Transfer and retained starter quantities must be explicit');
  else if(b.rows.every(row=>row.quantity!==null&&row.unit==='g')&&Math.abs(sumGrams(b)-v.quantity-v.retained)>Math.max(.02,sumGrams(b)*1e-7))errors.push('Build / transfer / retained mass mismatch: '+v.name);
 }else if(v.fromStage)errors.push('Only transfers can reference builds');}
 for(const build of r.stages.filter(s=>s.role==='build')){const uses=r.stages.flatMap(s=>s.rows.filter(v=>v.kind==='transfer'&&v.fromStage===build.id));if(!uses.length)errors.push('Build is not transferred to any later stage: '+build.name);if(build.rows.every(v=>v.quantity!==null&&v.unit==='g')&&uses.reduce((n,v)=>n+(v.quantity||0),0)>sumGrams(build)+Math.max(.02,sumGrams(build)*1e-7))errors.push('Transfers exceed the prepared build: '+build.name);}
 if(!Array.isArray(r.methods)||r.methods.length>150||r.methods.some(m=>!str(m?.heading,200)||!str(m?.body,30000)))errors.push('Invalid method steps');
 for(const key of ['notes','warnings'])if(!Array.isArray(r[key])||r[key].length>200||r[key].some(v=>!str(v,30000)))errors.push('Invalid '+key);
 if(final.length===1&&sumGrams(final[0])<=0)errors.push('Final weighed subtotal must be positive');
 return {errors:[...new Set(errors)],warnings:[...new Set(warnings)]};
}
