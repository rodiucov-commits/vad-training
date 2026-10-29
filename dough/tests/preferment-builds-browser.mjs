import assert from 'node:assert/strict';import fs from 'node:fs';import {createRequire} from 'node:module';
import {Workbook} from '../engine.js';import {createPizzaSheets,seedBuild} from '../pizza.js';import {pizzaLoversRecipes,presets,defaults,calculate} from '../pizzalovers.js';import {recipes} from '../recipes.js';import {workbookBuilds} from '../recipe-stages.js';import worker from '../_worker.js';import {fixtureDB,fixtureToken,fixturePassword,assets,fixtureServer} from './owner-password-fixture.mjs';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_PATH||'playwright-core');
const env={ASSETS:assets(),DOUGH_AUTH_DB:await fixtureDB(),DOUGH_RECIPES_DB:await fixtureDB()},server=await fixtureServer(env),sheets=JSON.parse(fs.readFileSync(new URL('../workbook.json',import.meta.url))),book=new Workbook([...sheets,...createPizzaSheets(sheets,{})]);
const response=await worker.fetch(new Request(server.origin+'/owner/api/setup',{method:'POST',headers:{Origin:server.origin,'Content-Type':'application/json'},body:JSON.stringify({token:fixtureToken,password:fixturePassword})}),env);assert.equal(response.status,200);const cookie=response.headers.get('Set-Cookie').split(';')[0].split('=')[1];
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--host-resolver-rules=MAP dc.test 127.0.0.1','--no-proxy-server']});
try{for(const owner of [false,true]){
 const c=await browser.newContext({ignoreHTTPSErrors:true,serviceWorkers:'block',viewport:{width:390,height:844}});if(owner)await c.addCookies([{name:'__Host-dough_owner',value:cookie,url:server.origin,httpOnly:true,secure:true,sameSite:'Strict'}]);const p=await c.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
 for(const r of recipes.filter(r=>r.bread&&!r.pizza)){
  await p.goto(server.origin+(owner?'/owner':'/')+'#recipe/'+r.id);await p.locator('.formula-table').waitFor();const stages=workbookBuilds(book,r);assert.equal(await p.locator('.preferment-feed').count(),stages.length,r.id);
  for(const s of stages){const table=p.locator(`.preferment-feed[data-preferment="${s.index}"]`);assert(await table.isVisible());assert.deepEqual(await table.locator('tbody td:first-child').allTextContents(),s.rows.map(r=>r.label));const grams=await table.locator('tbody td:last-child').allTextContents();grams.forEach((v,i)=>assert(Math.abs(Number(v.replace(/,/g,''))-s.rows[i].grams)<.006));assert.match(await p.locator(`[data-ferment-note="${s.index}"]`).innerText(),/not specified/);}
  if(owner&&stages.length){const input=p.locator('input[data-cell=C6]').first(),initial=book.get(r.sheet,'C6');await input.fill(String(initial*2));assert(await input.evaluate(e=>e===document.activeElement));for(const s of stages){const grams=await p.locator(`.preferment-feed[data-preferment="${s.index}"] tbody td:last-child`).allTextContents();grams.forEach((v,i)=>assert(Math.abs(Number(v.replace(/,/g,''))-s.rows[i].grams*2)<.006,r.id+' live build scaling'));}await input.fill(String(initial));}
  assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),r.id+' overflow');
 }
 // Audit every non-book recipe adapter, not just the reported card.
 for(const r of recipes.filter(r=>r.sections)){
  await p.goto(server.origin+(owner?'/owner':'/')+'#recipe/'+r.id);await p.locator('.detail-heading').waitFor();
  for(const sec of r.sections){const table=p.locator('.section-grid > section').filter({has:p.getByRole('heading',{name:sec.title,exact:true})}).locator('table');assert(await table.isVisible(),r.id+': '+sec.title);
   const expected=sec.rows.map(n=>sec.labels?.[n]||book.get(r.sheet,sec.label+n)).filter(Boolean).map(String);if(sec.title==='Levain feed')expected.push(...r.extra.map(row=>row[0]));assert.deepEqual(await table.locator('tbody td:first-child').allTextContents(),expected);
  }
 }
 for(const r of recipes.filter(r=>r.pizza)){
  await p.goto(server.origin+(owner?'/owner':'/')+'#recipe/'+r.id);await p.locator('.preferment-feed').first().waitFor();
  for(const i of [1,2]){if(!book.get(r.sheet,(i===1?'F':'H')+'4'))continue;const build=seedBuild(book,r.sheet,i),table=p.locator(`.preferment-feed[data-preferment="${i}"]`);assert.deepEqual(await table.locator('tbody td:first-child').allTextContents(),build.rows.map(row=>row.label));const weights=await table.locator('tbody td:last-child').allTextContents();weights.forEach((v,j)=>assert(Math.abs(Number(v.replace(/,/g,''))-build.rows[j].grams)<.006));}
 }
 for(const r of pizzaLoversRecipes){
  await p.goto(server.origin+(owner?'/owner':'/')+'#recipe/'+r.id);await p.locator('#pl-results table').first().waitFor();const pre=presets[r.preset].pre,expected=calculate(defaults(r.preset));
  assert.equal(await p.locator('[data-pl-grams=preFlour]').count(),pre?1:0);
  if(pre)for(const [id,v]of [['preFlour',expected.pre.flour],['preWater',expected.pre.water],['preYeast',expected.pre.yeast],['transfer',expected.pre.total]])assert(Math.abs(Number((await p.locator(`[data-pl-grams="${id}"]`).innerText()).replace(/,/g,''))-v)<.006);
 }
 await p.goto(server.origin+(owner?'/owner':'/')+'#recipe/vermont-small');await p.locator('.preferment-feed').waitFor();assert.match(await p.locator('.preferment-feed').innerText(),/Sourdough starter[\s\S]*41.88/);assert(!/837.*hours|2 Loaves.*°C/.test(await p.locator('[data-ferment-note]').innerText()));
 assert.deepEqual(errors,[]);console.log('PASS '+(owner?'Owner':'public')+' all non-book recipe stages: exact ingredient rows/weights; live doubled quantities and focus; simple levain/Detmolder; missing timing; mobile; '+'zero errors');await c.close();
}}finally{await browser.close();await server.close();}
