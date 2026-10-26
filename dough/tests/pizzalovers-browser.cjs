const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright-core'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
(async()=>{
 let server,base=process.env.SITE_URL;
 if(!base){const root=path.resolve(__dirname,'..');server=http.createServer((req,res)=>{const pathname=new URL(req.url,'http://test').pathname,file=path.join(root,pathname==='/'?'index.html':pathname);if(!file.startsWith(root+path.sep)||!fs.existsSync(file)){res.writeHead(404);res.end();return}res.setHeader('Content-Type',file.endsWith('.js')?'application/javascript':file.endsWith('.json')?'application/json':file.endsWith('.css')?'text/css':'text/html');res.end(fs.readFileSync(file))});await new Promise(r=>server.listen(0,'127.0.0.1',r));base='http://127.0.0.1:'+server.address().port}
 const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true}),context=await browser.newContext({viewport:{width:390,height:844},acceptDownloads:true});
 await context.addInitScript(()=>Object.defineProperty(navigator,'clipboard',{value:{writeText:async text=>{window.__copied=text}}}));
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(12000);
 const go=async id=>{await page.goto(base+'/#recipe/'+id);await page.locator(id.startsWith('pizzalovers-')?'#pl-results':'.final-mix-table').waitFor()};
 const read=async selector=>Number((await page.locator(selector).first().innerText()).replace(/[^\d.-]/g,''));
 const noOverflow=async()=>assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await go('pizza-sourdough');await page.locator('#baking-notes').fill('SOURDOUGH MUST STAY');await page.locator('[data-cell=B16]').first().fill('67');
 await page.locator('[data-cell=B16]').first().press('Tab');await page.reload();await page.locator('.final-mix-table').waitFor();
 const before=await page.locator('#app').innerHTML(),storedBefore=await page.evaluate(()=>localStorage.getItem('dough-co-v1'));
 const {fixtures}=JSON.parse(fs.readFileSync(path.join(__dirname,'pizzalovers-fixtures.json')));
 for(const p of ['contemporanea','classica','teglia','romana','biga','poolish']){
   await go('pizzalovers-'+p);await noOverflow();const expected=fixtures.find(f=>f.state.p===p).result;
   if(expected.pre){assert.ok(Math.abs(await read('[data-pl-grams=preFlour]')-expected.pre.flour)<.01);assert.ok(Math.abs(await read('[data-pl-grams=mainWater]')-expected.main.water)<.01)}else assert.ok(Math.abs(await read('[data-pl-grams=water]')-expected.water)<.01);
   assert.equal(await page.locator('#pl-y').inputValue(),p==='romana'?'dry':'fresh');assert.ok(await page.locator('.pl-method li').count()>=5);
 }
 console.log('PASS all six direct routes, source-default ingredient quantities, methods and mobile overflow');
 await go('pizzalovers-teglia');await page.locator('#pl-n').fill('3');assert.equal(await read('[data-pl-summary=target]'),1950);assert.ok(await page.locator('#pl-n').evaluate(e=>e===document.activeElement));await page.locator('#pl-g').fill('700');assert.equal(await read('[data-pl-summary=target]'),2100);
 await page.locator('#pl-h').fill('80');assert.ok(Math.abs(await read('[data-pl-summary=water]')/await read('[data-pl-summary=flour]')-.8)<.0001);
 await page.locator('.pl-fine summary').click();await page.locator('#pl-w').selectOption('hand');assert.match(await page.locator('#pl-warnings').innerText(),/65%/);
 const yeastBefore=await read('[data-pl-grams=yeast]');await page.locator('#pl-f').fill('48');assert.ok(await read('[data-pl-grams=yeast]')<yeastBefore);
 const fresh=await read('[data-pl-grams=yeast]');await page.locator('#pl-y').selectOption('dry');assert.ok(Math.abs(await read('[data-pl-grams=yeast]')-fresh/3)<.015);assert.match(await page.locator('#pl-results').innerText(),/actual weighed dough/);
 await page.locator('#pl-notes').fill('PRIVATE PIZZA NOTE');await page.getByRole('button',{name:'Share',exact:true}).click();const link=await page.evaluate(()=>window.__copied);assert.ok(link.includes('n=3'));assert.ok(!link.includes('PRIVATE'));
 const other=await browser.newContext({viewport:{width:390,height:844}}),shared=await other.newPage();await shared.goto(link);await shared.locator('#pl-results').waitFor();assert.equal(await shared.locator('#pl-n').inputValue(),'3');assert.equal(await shared.locator('#pl-h').inputValue(),'80');assert.equal(await shared.locator('#pl-notes').inputValue(),'');await other.close();
 await page.getByRole('button',{name:'Copy recipe',exact:true}).click();assert.match(await page.evaluate(()=>window.__copied),/Step by step/);assert.ok(!(await page.evaluate(()=>window.__copied)).includes('PRIVATE PIZZA NOTE'));
 const downloadEvent=page.waitForEvent('download');await page.getByRole('button',{name:'Export pizza backup'}).click();const download=await downloadEvent,data=JSON.parse(fs.readFileSync(await download.path()));assert.equal(data.recipes.teglia.note,'PRIVATE PIZZA NOTE');
 await page.getByRole('button',{name:'Reset recipe',exact:true}).click();assert.equal(await page.locator('#pl-n').inputValue(),'2');assert.equal(await page.locator('#pl-notes').inputValue(),'PRIVATE PIZZA NOTE');
 await page.locator('#pl-import').setInputFiles({name:'pizza.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(data))});await page.getByText('Pizza backup imported. Original workbook recipes were not changed.',{exact:true}).waitFor();assert.equal(await page.locator('#pl-n').inputValue(),'3');assert.equal(await page.locator('#pl-y').inputValue(),'dry');
 await page.locator('#pl-n').fill('0');await page.locator('#pl-n').press('Tab');assert.equal(await page.locator('#pl-n').inputValue(),'3');
 await page.reload();await page.locator('#pl-results').waitFor();assert.equal(await page.locator('#pl-g').inputValue(),'700');assert.equal(await page.locator('#pl-notes').inputValue(),'PRIVATE PIZZA NOTE');await noOverflow();
 await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:process.env.SCREENSHOT_PATH||'/tmp/dough-pizzalovers-mobile.png',fullPage:true});
 await page.setViewportSize({width:1440,height:1000});await noOverflow();await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:'/tmp/dough-pizzalovers-desktop.png',fullPage:false});
 console.log('PASS live scaling/hydration/fermentation/yeast/tool warnings; share privacy; copy; backup roundtrip; invalid counts; persistence; mobile and desktop screenshots');
 await go('pizza-sourdough');assert.equal(await page.locator('#app').innerHTML(),before);assert.equal(await page.evaluate(()=>localStorage.getItem('dough-co-v1')),storedBefore);
 console.log('PASS Sourdough Pizza exact rendered DOM and original recipe storage unchanged after using every new calculator');
 await page.goto(base+'/');await page.locator('#recipe-grid').waitFor();assert.equal(await page.locator('a.recipe-card[href*="pizzalovers-"]').count(),6);await page.getByRole('button',{name:'Pizza',exact:true}).click();assert.equal(await page.locator('a.recipe-card[href*="pizzalovers-"]').count(),6);await page.locator('#search').fill('teglia');assert.equal(await page.locator('.recipe-card').count(),1);
 await go('pizzalovers-teglia');await page.evaluate(()=>navigator.serviceWorker.ready);await page.reload();await context.setOffline(true);await page.reload();await page.locator('#pl-results').waitFor();assert.equal(await page.locator('#pl-n').inputValue(),'3');await page.locator('a[href="#recipe/pizzalovers-poolish"]').click();await page.locator('[data-pl-grams=preFlour]').waitFor();assert.equal(await page.locator('[data-pl-grams=preFlour]').count(),1);assert.deepEqual(errors,[]);
 await browser.close();if(server)await new Promise(r=>server.close(r));console.log('PASS collection cards/filter/search and offline reload/navigation; zero browser exceptions');
})().catch(e=>{console.error(e);process.exit(1)});
