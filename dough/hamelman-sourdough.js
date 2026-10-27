// Source convention: mature seed is additional to, not hidden inside, overall formula weights.
const culture=name=>/culture/i.test(name);
export const canonical=name=>{
 const s=name.toLowerCase().normalize('NFKC').trim();
 if(/^water(?:,.*)?$/.test(s))return 'water';
 return ({'grains, assorted (see headnote)':'grains, assorted','old bread, cubed':'old bread','flax seeds':'flaxseeds','small pinch, yeast':'yeast'})[s]||s;
};
export function calculateSourdough(r,s){
 const sum=rows=>rows.reduce((a,i)=>a+i.grams,0),total=r.overall.map((i,n)=>({...i,key:canonical(i.name),percent:s.percent[n],grams:s.flour*s.percent[n]/100})),referenceMass=sum(total),basis=sum(total.filter(i=>r.basis.includes(i.name))),water=sum(total.filter(i=>i.key==='water'));
 const final=new Map(total.map(i=>[i.key,{...i}])),builds=[],warnings=[];let seed=0,seedKnown=true,complete=Boolean(total.length);
 const deduct=rows=>{for(const i of rows){if(culture(i.name))continue;if(!final.has(i.key))final.set(i.key,{name:i.name,key:i.key,grams:0});final.get(i.key).grams-=i.grams}};
 const preferments=r.builds.filter(b=>b.name!=='Soaker');
 for(const build of r.builds){let rows=null,reason='';
  if(r.buildIssue&&!(r.page===235&&build.name!=='Soaker')){reason=r.buildIssue;complete=false;if(build.ingredients.some(i=>culture(i.name)))seedKnown=false}
  else if(build.name==='Soaker'){
   const dry=build.ingredients.filter(i=>!['water','salt','yeast'].includes(canonical(i.name))),match=dry.map(i=>total.find(t=>t.key===canonical(i.name))),waterPct=build.ingredients.find(i=>canonical(i.name)==='water')?.percent;
   if(match.some(i=>!i)||waterPct===undefined){reason='A soaker ingredient or its water percentage is missing from the supplied formula.';complete=false}
   else {const dryMass=sum(match);rows=build.ingredients.map(i=>{const k=canonical(i.name),grain=total.find(t=>t.key===k);return {name:i.name,key:k,percent:i.percent,grams:dry.some(d=>canonical(d.name)===k)?grain.grams:dryMass*i.percent/100}});
    if(dry.some((i,n)=>Math.abs(dryMass*i.percent/100-match[n].grams)>1e-7))warnings.push('Soaker grain weights follow the exact overall amounts; rounded source soaker percentages are retained. Salt and water are percentages of dry soaker grains, not part of the dry-grain basis.');
   }
  }else if(preferments.length!==1||s.pref===null){reason='Individual build flour allocations are not specified. The combined prefermented-flour share cannot be assigned to every build.';complete=false;seedKnown=false}
  else {
   const flourPct=build.ingredients.filter(i=>r.basis.includes(i.name)).reduce((a,i)=>a+i.percent,0);
   if(Math.abs(flourPct-100)>1e-6){reason='The supplied build has conflicting or merged flour percentages.';complete=false;seedKnown=false}
   else {const flour=s.flour*s.pref/100;rows=build.ingredients.map(i=>({name:i.name,key:canonical(i.name),percent:i.percent,grams:flour*i.percent/100}));seed+=sum(rows.filter(i=>culture(i.name)))}
  }
  if(rows)deduct(rows);builds.push({name:build.name,source:build.ingredients,rows,total:rows?sum(rows):null,reason});
 }
 if(!preferments.length&&r.prefermented>0){complete=false;seedKnown=false;warnings.push('The preferment build is missing from the attachment.')}
 const negative=[...final.values()].filter(i=>i.grams< -1e-7);if(negative.length)warnings.push('Build quantities exceed the overall '+negative.map(i=>i.name).join(', ')+'. Verify the source before mixing; negative final additions are not instructions.');
 const mass=referenceMass+(seedKnown?seed:0),finalRows=[...final.values()].map(i=>({...i,grams:Math.abs(i.grams)<1e-8?0:i.grams}));
 return {total,referenceMass,mass,actualMass:seedKnown?mass:null,seed:seedKnown?seed:null,seedKnown,basis,water,hydration:basis?water/basis*100:0,other:mass-basis-water,basisPercent:total.filter(i=>r.basis.includes(i.name)).reduce((a,i)=>a+i.percent,0),builds,final:finalRows,finalMass:sum(finalRows)+builds.reduce((a,b)=>a+(b.total||0),0),complete,ready:complete&&seedKnown&&!negative.length,warnings};
}
