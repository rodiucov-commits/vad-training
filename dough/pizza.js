import {Workbook} from './engine.js';
/** Derived pizza formula views. Original workbook sheets and visitor overrides are not changed. */
export function createPizzaSheets(source,overrides={}){
 const original=new Workbook(source,overrides);const value=c=>Number(original.get('Khachapuri Pizza',c))||0;
 const seed=value('C26'),seedHydration=1,seedFlour=seed/(1+seedHydration),seedWater=seed-seedFlour;
 const sourFlour=value('C24')+value('C30')+seedFlour,sourWater=value('C25')+value('C31')+seedWater,sourPrefermentFlour=value('C24')+seedFlour;
 const bigaFlour=value('K35'),bigaWater=value('K36');
 return [formulaSheet({name:'Pizza · Sourdough formula',weight:sourFlour+sourWater+value('C32')+value('C33'),hydration:sourFlour?sourWater/sourFlour:0,oil:sourFlour?value('C32')/sourFlour:0,salt:sourFlour?value('C33')/sourFlour:0,preferment:'Sourdough Levain',fraction:sourFlour?sourPrefermentFlour/sourFlour:0,prefermentHydration:sourPrefermentFlour?(value('C25')+seedWater)/sourPrefermentFlour:0,seed:sourPrefermentFlour?seed/sourPrefermentFlour:0}),formulaSheet({name:'Pizza · Biga formula',weight:bigaFlour+bigaWater+value('J27')+value('J28'),hydration:bigaFlour?bigaWater/bigaFlour:0,yeast:bigaFlour?value('J27')/bigaFlour:0,honey:bigaFlour?value('J28')/bigaFlour:0,preferment:'Biga',fraction:bigaFlour?value('J25')/bigaFlour:0,prefermentHydration:value('J25')?value('J26')/value('J25'):0,prefermentYeast:value('J25')?value('J27')/value('J25'):0,prefermentHoney:value('J25')?value('J28')/value('J25'):0})];
}
function formulaSheet(o){const cells={};const input=(c,v='',pct=false)=>cells[c]={v,f:null,pct};const formula=(c,f,pct=false)=>cells[c]={v:0,f,pct};
 input('C6',o.weight);input('B9',1,true);input('F4',o.preferment);input('H4','');input('G6',o.fraction,true);input('I6',0,true);input('M6',1,true);input('M7',1,true);
 for(let n=10;n<=43;n++){input('A'+n,'');for(const c of ['B','F','H'])input(c+n,0,true);formula('C'+n,n<=39?`C9*B${n}`:'0');formula('E'+n,'0');for(const [pct,grams]of [['F','G'],['H','I']])formula(grams+n,n<=39?`${grams}9*${pct}${n}`:'0');formula('K'+n,n<=39?`C${n}-G${n}-I${n}`:'0')}
 for(let n=10;n<=15;n++)input('A'+n,n===10?'Bread flour':`Flour ${n-9}`);
 for(const [n,label]of [[16,'Water'],[17,'Olive oil'],[19,'Salt'],[20,'Yeast'],[23,'Honey']])input('A'+n,label);
 input('B10',1,true);input('B16',o.hydration,true);input('B17',o.oil||0,true);input('B19',o.salt||0,true);input('B20',o.yeast||0,true);input('B23',o.honey||0,true);input('F10',1,true);input('H10',1,true);input('F16',o.prefermentHydration,true);input('H16',1,true);input('F20',o.prefermentYeast||0,true);input('F23',o.prefermentHoney||0,true);input('F41',o.seed||0,true);input('H41',0,true);
 if(o.preferment==='Biga'){formula('F20','IFERROR(B20/G6,0)',true);formula('F23','IFERROR(B23/G6,0)',true)}
 formula('B44','SUM(B10:B39)',true);formula('C9','IFERROR(C6/B44,0)');formula('G9','IF(F4="",0,C9*G6)');formula('I9','IF(H4="",0,C9*I6)');formula('G41','IF(F4="Sourdough Levain",G9*F41,0)');formula('I41','IF(H4="Sourdough Levain",I9*H41,0)');formula('G44','SUM(G10:G39)');formula('I44','SUM(I10:I39)');formula('E44','0');formula('C44','SUM(C10:C39)');formula('K40','G44');formula('K41','I44');formula('J44','SUM(K10:K43)');formula('K6','G6+I6',true);
 return {name:o.name,derived:true,cells};
}
export function seedBuild(book,sheet,pref=1){const p=pref===1?'G':'I',percent=pref===1?'F':'H',hydrationCell=pref===1?'M6':'M7';const seed=Number(book.get(sheet,p+'41'))||0,hydration=Number(book.get(sheet,hydrationCell))||0;const seedFlour=seed/(1+hydration);const rows=[];
 for(let n=10;n<=39;n++){const label=book.get(sheet,'A'+n);const grams=Number(book.get(sheet,p+n))||0;const added=grams-(n===10?seedFlour:n===16?seed-seedFlour:0);if(added||grams)rows.push({label:String(label||'Ingredient '+n),grams:added})}
 if(seed)rows.unshift({label:'Seed starter',grams:seed});return {rows,total:rows.reduce((sum,r)=>sum+r.grams,0),seed,hydration,percent,hydrationCell};}
