// Deterministic source adapters. Never modify source datasets or their formula engines.
import fs from 'node:fs';import crypto from 'node:crypto';
import {Workbook} from '../dough/engine.js';import {recipes} from '../dough/recipes.js';
import {createPizzaSheets,seedBuild} from '../dough/pizza.js';import {workbookBuilds} from '../dough/recipe-stages.js';
import {pizzaLoversRecipes,presets,defaults,calculate,instructions} from '../dough/pizzalovers.js';
import {calculateBook,defaultBookState} from '../dough/hamelman-book.js';import {readableMethods,methodParts,metricText,recipeNotes} from '../dough/hamelman-metric.js';
const root=new URL('../dough/',import.meta.url),read=n=>fs.readFileSync(new URL(n,root),'utf8'),hash=x=>crypto.createHash('sha256').update(x).digest('hex');
const workbook=read('workbook.json'),bookJSON=read('hamelman-book.json'),sheets=JSON.parse(workbook);sheets.push(...createPizzaSheets(sheets,{}));const w=new Workbook(sheets),num=(r,c)=>{const n=w.get(r.sheet,c);return typeof n==='number'&&Number.isFinite(n)?n:0},get=(r,c)=>w.get(r.sheet,c);
const role=name=>/soaker|scald/i.test(name)?'build':'build',type=name=>/flour|semola|chapati|мука/i.test(name)?'flour':/^(?:water|вода)$/i.test(name)?'water':/starter|culture|seed|^зак$/i.test(name)?'starter':'other';
const row=(name,quantity,extra={})=>({id:'',name:String(name),quantity:typeof quantity==='number'?quantity:null,unit:'g',kind:type(String(name)),...extra});
const stage=(id,name,role,rows,timing='')=>({id,name,role,rows:rows.map((r,i)=>({...r,id:'r'+i})),timing});
const base=(r,source)=>({schemaVersion:1,id:r.id,title:r.title,description:r.description||'',tag:r.tag||'Bread',source,basePieces:r.defaultPieces||2,finalStageId:'final',massKnown:true,stages:[],methods:[],notes:r.notes||[],warnings:[],component:null});
const catalogue=[];
for(const r of recipes.filter(r=>!r.temperature&&r.id!=='master')){
 const x=base(r,{kind:'workbook',referenceId:r.id,sha256:hash(workbook)});
 if(r.bread){
  for(const i of [1,2]){const c=i===1?'F':'H',p=i===1?'G':'I',name=get(r,c+'4');if(!name)continue;
   if(r.pizza){const b=seedBuild(w,r.sheet,i);x.stages.push(stage('build'+i,name,'build',b.rows.map(v=>row(v.label,v.grams,type(v.label)==='starter'?{seedHydration:b.hydration*100}:{}))));const h=get(r,i===1?'M8':'M10'),t=get(r,i===1?'M9':'M11');x.stages.at(-1).timing=typeof h==='number'&&h>0?`${h} hours${typeof t==='number'?' at '+t+' °C':''}; until ripe.`:'Timing not specified for this saved build.';}
   else{const b=workbookBuilds(w,r).find(b=>b.index===i);x.stages.push(stage('build'+i,b.type,'build',b.rows.map(v=>row(v.label,v.grams)),'Ferment until ripe; time and temperature are not specified in this workbook.'));x.warnings.push(...b.warnings);}
  }
  const final=[];for(let n=10;n<=43;n++){const q=num(r,'K'+n);if(Math.abs(q)<1e-9)continue;const transfer=n===40?'build1':n===41?'build2':null;let name=transfer?'Ripe '+(get(r,n===40?'F4':'H4')||'preferment'):get(r,'J'+n)||get(r,'A'+n)||'Source row '+n;
   if(!r.pizza&&q<0&&/yeast|yaest/i.test(name)&&x.stages.some(s=>/sourdough/i.test(s.name)))name='Starter / source accounting correction';
   final.push(row(name,q,transfer?{kind:'transfer',fromStage:transfer,retained:0}:{}));}
  x.stages.push(stage('final','Final dough · additions only','final',final));
  const total=[];for(let n=10;n<=43;n++){const q=num(r,'C'+n);if(Math.abs(q)<1e-9)continue;total.push(row(get(r,'A'+n)||'Source row '+n,q,{sourcePercent:num(r,'B'+n)*100}));}x.stages.push(stage('overall','Overall formula · already includes builds','reference',total));
  if(final.some(v=>v.quantity<0)){x.warnings.push('The original spreadsheet contains a negative final-mix correction. These source quantities are retained as an incomplete mixing reference, not a corrected physical mixing list.');}
  x.methods=(r.notes||[]).map(body=>({heading:'Notebook guidance',body:metricText(body)}));
 }else{
  for(const [i,sec]of r.sections.entries()){
   const rows=sec.rows.map(n=>{const name=sec.labels?.[n]||get(r,sec.label+n),q=get(r,sec.amount+n);if(!name)return null;const unit=r.kg?'g':r.units?.[sec.amount+n]||sec.unit;return row(name,typeof q==='number'?q*(r.kg?1000:1):null,{unit,display:typeof q==='number'?'':String(q||'Unspecified')});}).filter(Boolean);
   if(sec.title==='Levain feed')for(const [name,c,unit]of r.extra||[])rows.push(row(name,num(r,c),{unit}));
   const final=i===0&&!['khachapuri-working','detmolder'].includes(r.id)||r.id==='khachapuri-working'&&i===1||r.id==='detmolder'&&i===2;
   const id=final?'final':'section'+i;x.stages.push(stage(id,sec.title,final?'final':/feed|Phase|Scald/i.test(sec.title)?'build':r.id==='khachapuri-working'?'reference':'component',rows));
  }
  if(r.id==='khachapuri-working'){x.stages.find(s=>s.id==='final').rows.unshift({...row('Ripe levain — add all',280,{kind:'transfer',fromStage:'section2',retained:0}),id:'levain-transfer'});x.stages=[x.stages[0],x.stages[2],x.stages[1]];}
  if(r.id==='detmolder'){for(const [i,from]of [[1,'section0'],[2,'section1']])Object.assign(x.stages[i].rows[2],{kind:'transfer',fromStage:from,retained:0});x.stages[0].role=x.stages[1].role='build';x.stages[0].timing='5 h at 25 °C';x.stages[1].timing='15–24 h at 23–27 °C';x.stages[2].timing='4 h at 30 °C';x.basePieces=20;}
  if(r.id==='khachapuri')x.basePieces=10;if(r.id==='khinkali')x.basePieces=25;
  x.methods=(r.notes||[]).map(body=>({heading:'Notebook guidance',body:metricText(body)}));
 }
 if(!x.stages.some(s=>s.id==='final')){x.finalStageId=x.stages[0].id;x.stages[0].role='final';}
 const final=x.stages.find(s=>s.id===x.finalStageId);x.massKnown=final.rows.every(v=>v.quantity!==null&&v.unit==='g');x.notes=(r.notes||[]).map(metricText);catalogue.push(x);
}
for(const r of JSON.parse(bookJSON).recipes){const c=calculateBook(r,defaultBookState(r)),x=base(r,{kind:'hamelman',referenceId:r.id,sha256:JSON.parse(bookJSON).sourceSha256});x.tag='Hamelman';x.basePieces=2;x.finalStageId='table'+r.finalIndex;x.massKnown=c.known;x.warnings=c.warnings.map(metricText);x.methods=readableMethods(r).map(methodParts);x.notes=recipeNotes(r);x.component=r.component||null;
 x.stages=c.tables.map((t,i)=>stage('table'+i,metricText(t.name),i===r.finalIndex?'final':i===0?'reference':i>r.finalIndex?'component':'build',t.rows.map(v=>row(metricText(v.name),v.grams,{unit:v.grams===null?'text':'g',display:v.grams===null?metricText(v.metric||v.home||'Unspecified'):'',sourcePercent:v.bookPercent??null}))));
 for(const tr of c.transfers){const v=x.stages[tr.to].rows[tr.row];v.kind='transfer';v.fromStage='table'+tr.from;v.retained=tr.retained;v.drained=!!tr.drained;}
 catalogue.push(x);
}
for(const r of pizzaLoversRecipes){const state=defaults(r.preset),p=presets[r.preset],c=calculate(state),x=base(r,{kind:'pizzalovers',referenceId:r.id,sha256:hash(read('pizzalovers.js'))});x.basePieces=state.n;
 if(p.pre)x.stages.push(stage('build1',p.pre.name,'build',[row('Flour',c.pre.flour),row('Water',c.pre.water),row('Fresh yeast',c.pre.yeast)],p.pre.timing));
 const additions=[...(p.pre?[row('Ripe '+p.pre.name,c.pre.total,{kind:'transfer',fromStage:'build1',retained:0})]:[]),...(c.semola?[row('Type 0 flour',c.flour-c.semola),row('Semola',c.semola)]:[row('Flour',p.pre?c.main.flour:c.flour)]),row('Water',p.pre?c.main.water:c.water),row('Salt',c.salt),row('Fresh yeast',p.pre?c.main.yeast:c.yeast),...(c.oil?[row('Olive oil',c.oil)]:[]),...(c.sugar?[row('Honey / malt',c.sugar)]:[])];
 x.stages.push(stage('final','Final dough · additions only','final',additions));x.methods=instructions(state,c).map(([heading,body])=>({heading,body}));x.notes=['Yeast and fermentation defaults follow the preserved Pizzalovers calculator. Use the original calculator for alternative yeast/mixer/time estimates.'];catalogue.push(x);
}
const output={schemaVersion:1,sourceVersion:'recipe-db-1',recipes:catalogue};fs.writeFileSync(new URL('recipe-catalog.json',root),JSON.stringify(output));console.log(JSON.stringify({recipes:catalogue.length,stages:catalogue.reduce((s,r)=>s+r.stages.length,0),methods:catalogue.reduce((s,r)=>s+r.methods.length,0),sourceSha:hash(bookJSON)}));
