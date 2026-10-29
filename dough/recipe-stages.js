// Source adapter: ingredient quantities stay in the workbook; the template reads
// every enabled build through this contract. No guessed timing or seed hydration.
export function workbookBuilds(book,recipe){
 const get=c=>book.get(recipe.sheet,c),stages=[];
 for(const [index,c,p]of [[1,'F','G'],[2,'H','I']]){
  const type=get(c+'4');if(!type)continue;
  const sourdough=type==='Sourdough Levain',rows=[];
  for(let n=10;n<=43;n++){
   const grams=get(p+n);if(typeof grams!=='number'||!Number.isFinite(grams)||Math.abs(grams)<1e-9)continue;
   const original=String(get('A'+n)||'Source ingredient row '+n).trim();
   // These sourdough sheets use the generic yeast slot for their inoculum.
   const starter=sourdough&&/^(?:yeast|yaest|starter|seed)$/i.test(original);
   rows.push({label:starter?'Sourdough starter':original,grams,cell:p+n,starter,sourceLabel:original});
  }
  const total=Number(get(p+'44')),warnings=[];
  if(!rows.some(r=>r.starter||/yeast|yaest|starter|seed/i.test(r.label)))warnings.push(sourdough?'The source does not specify the starter quantity for this build. Do not treat this as a complete starter feed.':'The source does not specify the yeast quantity for this build.');
  if(sourdough&&rows.some(r=>r.starter))warnings.push('Starter hydration is not specified in this workbook. These are the saved feed quantities; no seed-flour or seed-water correction has been guessed.');
  if(rows.some(r=>r.grams<0))warnings.push('This source build contains a negative ingredient. Check the formula before weighing.');
  if(Math.abs(rows.reduce((sum,r)=>sum+r.grams,0)-total)>1e-6)warnings.push('The ingredient sum differs from the workbook’s build total. Check the source formula.');
  stages.push({index,type,rows,total,warnings,hydrationCell:c+'16',timing:null});
 }
 return stages;
}
