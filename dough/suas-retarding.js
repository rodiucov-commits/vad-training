// Original factual source: Michel Suas, Advanced Bread and Pastry, p.103, Fig.4-16.
// This is an original vector/layout redraw, not a reproduction of the book artwork.
export const retardingRecipe={id:'suas-retarding-processes',title:'Suas · Retarding processes',tag:'Calculator',retarding:true,description:'Four illustrated process paths: delayed bulk, frozen preshaped dough, slow final proof and retarding–proofing. Suas, p.103.'};
export const retardingProcesses=[
 {id:'delayed',name:'Delayed first fermentation',summary:'Retard in bulk, then divide and shape.',formula:[['Flour','100%'],['Water','67%'],['Yeast','1.5%'],['Salt','2%']],steps:[
  {type:'mix',title:'Mix',detail:'Improved mix',temp:'Dough 23°C · 73°F'},
  {type:'cold',title:'Retard in bulk',detail:'15–20 hours',temp:'6°C · 44°F (printed pair)'},
  {type:'shape',title:'Divide → rest → shape',detail:'20-minute rest'},
  {type:'proof',title:'Final proof',detail:'1–1½ hours',temp:'Temperature not specified'},
  {type:'bake',title:'Bake',detail:'243°C · 470°F',temp:'Bake time not specified'}]},
 {id:'frozen',name:'Frozen preshaped dough',summary:'Freeze before final shaping; thaw, shape and proof later.',formula:[['Flour','100%'],['Water','65%'],['Yeast','2.5%'],['Preferment','40%'],['A.A.','20 ppm']],steps:[
  {type:'mix',title:'Mix',detail:'Improved / intensive mix',temp:'Dough 22°C · 72°F'},
  {type:'bulk',title:'First fermentation',detail:'15 minutes'},
  {type:'shape',title:'Divide → rest → preshape',detail:'10-minute rest'},
  {type:'freeze',title:'Flash freeze',detail:'−27°C · −18°F as printed',temp:'Duration not specified'},
  {type:'storage',title:'Store in bags',detail:'−18°C · 0°F',temp:'Storage duration not specified'},
  {type:'cold',title:'Defrost → shape',detail:'2–8 hours to defrost*',temp:'4.4–7.2°C · 40–45°F'},
  {type:'proof',title:'Final proof',detail:'1½ hours',temp:'24°C · 75°F'},
  {type:'bake',title:'Bake',detail:'238°C · 460°F',temp:'Bake time not specified'}]},
 {id:'slow',name:'Slow final proof',summary:'Shape first; bake directly after the slow cold proof.',formula:[['Flour','100%'],['Water','67%'],['Yeast','1%'],['Salt','2%'],['A.A. · optional','15 ppm']],steps:[
  {type:'mix',title:'Mix',detail:'Improved mix',temp:'Dough 23°C · 73°F'},
  {type:'bulk',title:'First fermentation',detail:'20 minutes'},
  {type:'shape',title:'Divide → preshape → rest → shape',detail:'20-minute rest'},
  {type:'cold',title:'Slow final proof',detail:'12–15 hours',temp:'10°C · 50°F'},
  {type:'bake',title:'Bake',detail:'243°C · 470°F',temp:'Bake time not specified'}]},
 {id:'retard-proof',name:'Retarding–proofing process',summary:'Shape, retard cold, then raise temperature for proof.',formula:[['Flour','100%'],['Water','66%'],['Yeast','1.8%'],['Salt','2%'],['A.A.','20 ppm']],steps:[
  {type:'mix',title:'Mix',detail:'Improved / intensive mix',temp:'Dough 23°C · 73°F'},
  {type:'bulk',title:'First fermentation',detail:'15 minutes'},
  {type:'shape',title:'Divide → preshape → rest → shape',detail:'20-minute rest'},
  {type:'cold',title:'Retard shaped loaves',detail:'12–48 hours',temp:'4°C · 40°F'},
  {type:'proof',title:'Proof shaped loaves',detail:'4 hours',temp:'16°C · 60°F'},
  {type:'bake',title:'Bake',detail:'243°C · 470°F',temp:'Bake time not specified'}]}
];
export const retardingNotes=[
 '*Frozen dough: defrosting time depends on loaf size. The figure supplies no salt amount or preferment composition for this branch, and no freeze/storage duration. These omissions are not filled with assumed recipe values.',
 'A.A. = ascorbic acid; ppm = parts per million. Yeast type is not identified in Fig.4-16. The adjacent delayed-fermentation discussion identifies fresh yeast but gives a different dose; do not treat chart percentages as instant-yeast prescriptions.',
 'Additional Celsius labels are calculated from Fahrenheit where the figure gives only Fahrenheit: 73°F ≈ 23°C, 72°F ≈ 22°C, 75°F ≈ 24°C, 470°F ≈ 243°C, 460°F ≈ 238°C, 40–45°F ≈ 4.4–7.2°C. Existing printed Celsius/Fahrenheit pairs are retained as printed; notably −27°C / −18°F are not exact equivalents.',
 'Keep the chart and narrative separate: Fig.4-16 gives delayed bulk 15–20 h at 6°C and yeast 1.5%; p.102 instead describes 12–18 h at 7–9°C and fresh yeast around 1.2%. For retarding–proofing, the figure specifies 4 h at 16°C; p.105 instead describes a final-proof temperature of 22–24°C without that fixed duration. This redraw follows the figure, not a blend of those instructions.',
 'Baking duration is not supplied for any branch. This is a process reference, not a complete bread recipe or a promise of ripeness; choose the appropriate source recipe and assess the dough.'
];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const paths={mix:'M5 12h22l-3 13H8z M12 4v13m7-13v13 M9 8h13',bulk:'M6 13h20l-3 13H9z M10 11c0-5 12-5 12 0',shape:'M5 6h8v8H5z M18 6h8v8h-8z M5 19h8v8H5z M18 19h8v8h-8z',cold:'M16 3v26 M5 9l22 14 M5 23 27 9 M12 6l4 4 4-4 M12 26l4-4 4 4',freeze:'M16 3v26 M5 9l22 14 M5 23 27 9 M3 3h7 M3 3v7 M29 29h-7 M29 29v-7',storage:'M6 8h20v20H6z M10 4h12v4 M10 14h12 M10 19h8',proof:'M6 26c0-12 20-12 20 0z M9 13V6m7 7V3m7 10V6',bake:'M5 6h22v23H5z M9 11h14v13H9z M10 3h12 M12 18c0-4 8-4 8 0z'};
export function processIcon(type){return `<svg viewBox="0 0 32 32" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="${paths[type]||paths.shape}"/></svg>`;}
export function retardingHTML(){return `<article class="rc-recipe rt-reference"><a class="back" href="#">← Back to Calculators</a><div class="detail-heading"><div><span class="eyebrow">CALCULATORS / MICHEL SUAS</span><h1>Retarding processes</h1><p>Four ways to move fermentation through your working day.</p></div><div class="actions"><button class="btn" data-rt-print>Print</button><a class="btn" href="suas-retarding-processes.svg" download>Download chart · SVG</a><a class="btn" href="suas-retarding-processes.html" target="_blank" rel="noopener">Open full chart</a></div></div><p class="rt-citation">Redrawn from Michel Suas, <em>Advanced Bread and Pastry</em> (first edition, 2009), printed p.103, Fig.4-16. Same process facts; new layout and symbols. Fahrenheit source labels are retained alongside Celsius.</p><div class="rt-legend"><span class="rt-cold">Cold / frozen holding</span><span class="rt-proof">Fermentation / proof</span><span class="rt-bake">Baking</span><span>Arrows and numbers show order, not elapsed scale.</span></div>${retardingProcesses.map((p,i)=>`<section class="rt-process" data-retarding-process="${p.id}"><header class="rt-heading"><span>${String(i+1).padStart(2,'0')}</span><div><h2>${p.name}</h2><p>${p.summary}</p></div></header><div class="rt-body"><aside class="rt-formula"><h3>Formula as charted</h3><table><tbody>${p.formula.map(([n,v])=>`<tr><th>${esc(n)}</th><td>${esc(v)}</td></tr>`).join('')}</tbody></table><small>Local baker’s percentages; A.A. is in ppm.</small></aside><ol class="rt-steps">${p.steps.map((s,i)=>`<li class="rt-step rt-${s.type}" data-retarding-step><div class="rt-step-top">${processIcon(s.type)}<span>${i+1}</span></div><h3>${s.title}</h3><p class="rt-duration">${s.detail}</p>${s.temp?`<p class="rt-temp">${s.temp}</p>`:''}</li>`).join('')}</ol></div></section>`).join('')}<section class="panel rt-notes"><h2>Reading the chart</h2><p>Follow one complete row. Cold bulk fermentation is not the same as retarding already-shaped loaves. Frozen preshaped dough is a separate branch—not an extra stage to add to every process.</p><details><summary>Source notes, conversions & missing details</summary><ul>${retardingNotes.map(n=>`<li>${esc(n)}</li>`).join('')}</ul></details><p><a href="#recipe/dough-temperature">DDT / mixing-water calculator →</a></p></section></article>`;}
export function mountSuasRetarding(){document.title='Retarding processes — Dough & Co.';const host=document.querySelector('#app');host.innerHTML=retardingHTML();host.querySelector('[data-rt-print]').onclick=()=>window.print();host.querySelector('.back').onclick=e=>{e.preventDefault();document.querySelector('#calculator-nav').click();};}
// Standalone vector export generated from the same reviewed facts, with original symbols.
export function retardingSVG(){
 const W=1840,rowHeights=[270,330,270,290],H=1460,colors={cold:'#e2eef3',freeze:'#e2eef3',storage:'#e2eef3',proof:'#e5eee2',bulk:'#e5eee2',bake:'#f3e5d6',mix:'#f3f6f4',shape:'#f3f6f4'},out=[];
 const text=(x,y,value,size=16,weight=400)=>`<text x="${x}" y="${y}" font-size="${size}" font-weight="${weight}">${esc(value)}</text>`;
 const wrap=(value,max)=>{const lines=[];let line='';for(const word of value.split(' ')){if((line+' '+word).trim().length>max&&line){lines.push(line);line=word}else line=(line+' '+word).trim()}if(line)lines.push(line);return lines;};
 out.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="title description"><title id="title">Retarding processes — four process paths</title><desc id="description">Original redraw of Suas p.103 Fig.4-16. Includes all four formula boxes, process sequences, times and temperatures, and source omissions. This is a reference, not an elapsed-time axis.</desc><defs><marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0L8 4L0 8" fill="#507a79"/></marker></defs><style>text{font-family:Arial,sans-serif;fill:#244f52} .connector{fill:none;stroke:#507a79;stroke-width:2;marker-end:url(#arrow)}</style><rect width="${W}" height="${H}" fill="#f0f5f3"/>`);
 out.push(text(32,48,'RETARDING PROCESSES',30,700),text(32,77,'Michel Suas · Advanced Bread and Pastry · printed p.103 · Fig.4-16 · factual redraw in a new layout',17),text(32,103,'Read each row left to right. Celsius additions are calculated; original Fahrenheit labels are retained. Arrows indicate order, not duration.',16));let y=125;
 for(const [i,p]of retardingProcesses.entries()){
  const h=rowHeights[i];out.push(`<rect x="24" y="${y}" width="1792" height="${h-14}" rx="10" fill="#fff" stroke="#aec8c1"/>`,text(44,y+33,`${String(i+1).padStart(2,'0')}   ${p.name}`,23,700),text(44,y+60,p.summary,15));
  out.push(`<rect x="44" y="${y+80}" width="205" height="${h-115}" rx="5" fill="#dfece6"/>`,text(60,y+105,'FORMULA AS CHARTED',13,700));p.formula.forEach(([n,v],j)=>{out.push(text(60,y+132+j*23,n,15),text(183,y+132+j*23,v,15,700));});
  const n=p.steps.length,gap=19,x0=275,total=1515,cell=(total-gap*(n-1))/n,nodeY=y+90,nodeH=h-125;
  for(let j=0;j<n-1;j++){const x=x0+j*(cell+gap);out.push(`<path class="connector" d="M${x+cell+1} ${nodeY+nodeH/2}H${x+cell+gap-3}"/>`);}
  for(const [j,s]of p.steps.entries()){const x=x0+j*(cell+gap),max=Math.floor((cell-36)/9.8);out.push(`<g data-vector-node="${p.id}-${j}"><rect x="${x}" y="${nodeY}" width="${cell}" height="${nodeH}" rx="6" fill="${colors[s.type]}" stroke="#a6c0ba"/>`);out.push(`<g transform="translate(${x+14} ${nodeY+12})" fill="none" stroke="#326f72" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="${paths[s.type]}"/></g>`,text(x+cell-26,nodeY+34,String(j+1),15,700));let ty=nodeY+65;for(const line of wrap(s.title,max)){out.push(text(x+14,ty,line,16,700));ty+=20;}ty+=5;for(const line of wrap(s.detail,max)){out.push(text(x+14,ty,line,15));ty+=19;}if(s.temp){ty+=5;for(const line of wrap(s.temp,max)){out.push(text(x+14,ty,line,13));ty+=17;}}out.push('</g>');}
  y+=h;
 }
 const foot=['* Defrosting depends on loaf size. Frozen branch: no salt amount, preferment composition or freeze/storage duration is supplied. Baking duration is absent in all rows.','A.A. = ascorbic acid; ppm = parts per million. Yeast type is not identified in the figure. Do not assume these are instant-yeast doses.','Celsius added from Fahrenheit: 73°F ≈23°C; 72°F ≈22°C; 75°F ≈24°C; 470°F ≈243°C; 460°F ≈238°C; 40–45°F ≈4.4–7.2°C.','Printed pairs are retained, including −27°C / −18°F. The figure and nearby narrative differ; see the website’s source notes (Suas pp.102,104–105).'];
 foot.forEach((line,i)=>out.push(text(32,y+15+i*25,line,16)));out.push('</svg>');return out.join('');
}
