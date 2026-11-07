import assert from 'node:assert/strict';import fs from 'node:fs';import {createRequire} from 'node:module';import worker from '../_worker.js';
import {recipeMass,recipeFlourWater} from '../recipe-model.js';import {fixtureDB,fixtureToken,fixturePassword,assets,fixtureServer} from './owner-password-fixture.mjs';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_PATH||'playwright-core'),data=JSON.parse(fs.readFileSync(new URL('../recipe-catalog.json',import.meta.url))),env={ASSETS:assets(),DOUGH_AUTH_DB:await fixtureDB(),DOUGH_RECIPES_DB:await fixtureDB()},server=await fixtureServer(env),origin=server.origin;
const enrollment=await worker.fetch(new Request(origin+'/owner/api/setup',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({token:fixtureToken,password:fixturePassword})}),env),cookie=enrollment.headers.get('Set-Cookie').split(';')[0].split('=')[1];
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--host-resolver-rules=MAP dc.test 127.0.0.1','--no-proxy-server']});
const close=(a,b)=>assert(Math.abs(a-b)<1e-5,`${a} != ${b}`);
try{const context=await browser.newContext({viewport:{width:390,height:844},ignoreHTTPSErrors:true,serviceWorkers:'block'});await context.addCookies([{name:'__Host-dough_owner',value:cookie,url:origin,httpOnly:true,secure:true,sameSite:'Strict'}]);const p=await context.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));p.setDefaultTimeout(15000);
for(const id of ['pizza-sourdough','hamelman-baguettes-with-poolish']){
 const r=data.recipes.find(v=>v.id===id),fi=r.stages.findIndex(s=>s.id===r.finalStageId),ri=r.stages[fi].rows.findIndex(v=>v.kind==='transfer'),build=r.stages.find(s=>s.id===r.stages[fi].rows[ri].fromStage),bi=r.stages.indexOf(build);
 await p.goto(origin+'/owner#edit/'+id);await p.locator('.rc-editor h1').waitFor();
 const group=p.locator(`[data-edit-row="${fi}:${ri}"]`),share=group.locator('[data-row-field=share]'),pff=group.locator('[data-row-field=pff]'),q=group.locator('[data-row-field=quantity]');
 const read=async()=>{const download=p.waitForEvent('download');await p.locator('[data-editor-action=export]').click();return JSON.parse(fs.readFileSync(await (await download).path(),'utf8')).record;};
 const verify=async()=>{const next=await read();close(recipeMass(next),recipeMass(r));const a=recipeFlourWater(r),b=recipeFlourWater(next);close(a.flour,b.flour);close(a.water,b.water);assert.equal(await p.locator('#rc-editor-validation').innerText(),'');assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));return next;};
 await share.fill('45');assert(await share.evaluate(e=>e===document.activeElement));close(Number(await q.inputValue()),Number((recipeMass(r)*.45).toFixed(1)));await verify();
 await pff.fill('30');assert(await pff.evaluate(e=>e===document.activeElement));await verify();close(Number(await pff.inputValue()),30);
 const waterIndex=build.rows.findIndex(v=>v.kind==='water'),water=p.locator(`[data-edit-row="${bi}:${waterIndex}"] [data-row-field=feedPercent]`);await water.fill('105');assert(await water.evaluate(e=>e===document.activeElement));await verify();
 const last=await q.inputValue();await share.fill('99');assert.match(await p.locator('#rc-editor-status').innerText(),/Not enough/);assert.equal(await q.inputValue(),last);await share.fill('35');await verify();
 await p.locator('[data-editor-action=preview]').click();assert.match(await p.locator('#rc-preview').innerText(),/Overall flour and water/);
 await p.screenshot({path:'/tmp/linked-levain-'+id+'.png'});
 console.log('PASS '+id+' live share/PFF/feed, focus, fixed flour/water/mass, mobile, invalid rejection, preview');
}
assert.deepEqual(errors,[]);
}finally{await browser.close();await server.close();}
