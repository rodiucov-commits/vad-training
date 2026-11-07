import assert from 'node:assert/strict';import fs from 'node:fs';import {createRequire} from 'node:module';import worker from '../_worker.js';
import {recipeMass,recipeFlourWater} from '../recipe-model.js';import {fixtureDB,fixtureToken,fixturePassword,assets,fixtureServer} from './owner-password-fixture.mjs';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_PATH||'playwright-core'),data=JSON.parse(fs.readFileSync(new URL('../recipe-catalog.json',import.meta.url))),env={ASSETS:assets(),DOUGH_AUTH_DB:await fixtureDB(),DOUGH_RECIPES_DB:await fixtureDB()},server=await fixtureServer(env),origin=server.origin;
const enrollment=await worker.fetch(new Request(origin+'/owner/api/setup',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({token:fixtureToken,password:fixturePassword})}),env),cookie=enrollment.headers.get('Set-Cookie').split(';')[0].split('=')[1];
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--host-resolver-rules=MAP dc.test 127.0.0.1','--no-proxy-server']});
const close=(a,b)=>assert(Math.abs(a-b)<1e-5,`${a} != ${b}`);
try{const context=await browser.newContext({viewport:{width:390,height:844},ignoreHTTPSErrors:true,serviceWorkers:'block'});await context.addCookies([{name:'__Host-dough_owner',value:cookie,url:origin,httpOnly:true,secure:true,sameSite:'Strict'}]);const p=await context.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));p.setDefaultTimeout(15000);
for(const width of [390,1440]){await p.setViewportSize({width,height:900});
 const id='hamelman-semolina-bread',r=data.recipes.find(v=>v.id===id),fi=r.stages.findIndex(s=>s.id===r.finalStageId),ri=r.stages[fi].rows.findIndex(v=>v.kind==='transfer');
 await p.goto(origin+'/owner#edit/'+id);await p.locator('#rc-dough-weight').waitFor();
 const weight=p.locator('#rc-dough-weight'),q=p.locator(`[data-edit-row="${fi}:${ri}"] [data-row-field=quantity]`);
 await weight.fill('3000');assert(await weight.evaluate(e=>e===document.activeElement));
 const exportRecord=async()=>{const promise=p.waitForEvent('download');await p.locator('[data-editor-action=export]').click();return JSON.parse(fs.readFileSync(await (await promise).path(),'utf8')).record;};
 let n=await exportRecord();close(recipeMass(n),3000);const b=recipeFlourWater(n);assert.deepEqual(n.stages.filter(s=>s.role==='reference'),r.stages.filter(s=>s.role==='reference'));
 await q.fill('700');assert(await q.evaluate(e=>e===document.activeElement));n=await exportRecord();close(recipeMass(n),3000);close(recipeFlourWater(n).water,b.water);close(recipeFlourWater(n).flour,b.flour);
 await weight.fill('1500');n=await exportRecord();close(recipeMass(n),1500);close(Number(await q.inputValue()),350);assert.match(await p.locator('#rc-preview').innerText(),/1,500 g/);
 await weight.fill('0');assert.match(await p.locator('#rc-editor-status').innerText(),/positive/);close(recipeMass(await exportRecord()),1500);await weight.fill('1500');
 await p.locator('[data-editor-action=apply]').click();assert.match(await p.locator('#rc-editor-status').innerText(),/Adjustments applied/);
 assert(!(await p.locator('#rc-editor-validation').innerText()).includes('Cannot publish'));assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await p.locator('[data-editor-action=save]').click();await p.waitForFunction(()=>document.querySelector('#rc-editor-status').textContent.includes('Draft saved'));
 await p.reload();await weight.waitFor();close(Number(await weight.inputValue()),1500);close(Number(await q.inputValue()),350);
 p.once('dialog',d=>d.accept());await p.locator('[data-editor-action=publish]').click();await p.waitForFunction(()=>document.querySelector('#rc-editor-status').textContent.includes('Published revision'));
 const published=await p.evaluate(async()=>await (await fetch('/api/recipes')).json());close(recipeMass(published.recipes.find(r=>r.id===id)),1500);
 await p.locator('#rc-history').selectOption('1');p.once('dialog',d=>d.accept());await p.locator('[data-editor-action=rollback]').click();await p.waitForFunction(()=>Number(document.querySelector('#rc-dough-weight').value)!==1500);
 await p.screenshot({path:'/tmp/dough-editor-weight-'+width+'.png'});
 console.log('PASS '+width+'px: weight, preferment, double scaling, focus, preview, immutable source, apply, draft persistence and invalid rejection');
}
assert.deepEqual(errors,[]);
}finally{await browser.close();await server.close();}
