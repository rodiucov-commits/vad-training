// Password authentication for Dough only. Deploy by bundling this module into _worker.js.
// DOUGH_AUTH_DB is a separate D1 database, never the training database.
const OWNER_EMAIL='rodiucov@gmail.com';
const OWNER_COOKIE='__Host-dough_owner';
const SESSION_MS=8*60*60*1000, BLOCK_MS=10*60*1000;
const encode=new TextEncoder();
const randomToken=()=>Array.from(crypto.getRandomValues(new Uint8Array(32)),b=>b.toString(16).padStart(2,'0')).join('');
async function tokenHash(value){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',encode.encode(value))),b=>b.toString(16).padStart(2,'0')).join('');}
async function derive(password,salt){const key=await crypto.subtle.importKey('raw',encode.encode(password),'PBKDF2',false,['deriveBits']);return Array.from(new Uint8Array(await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',iterations:100000,salt:encode.encode(salt)},key,256)),b=>b.toString(16).padStart(2,'0')).join('');}
function equal(a,b){if(typeof a!=='string'||typeof b!=='string'||a.length!==b.length)return false;let d=0;for(let i=0;i<a.length;i++)d|=a.charCodeAt(i)^b.charCodeAt(i);return d===0;}
function json(body,status=200,headers={}){return new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff',...headers}});}
function rawCookie(req){return (req.headers.get('Cookie')||'').split(';').map(s=>s.trim()).find(s=>s.startsWith(OWNER_COOKIE+'='))?.slice(OWNER_COOKIE.length+1);}
const cookie=(raw,age=SESSION_MS/1000)=>`${OWNER_COOKIE}=${raw}; Path=/; Max-Age=${age}; HttpOnly; Secure; SameSite=Strict`;
const AUTH_SCHEMA=`CREATE TABLE IF NOT EXISTS dough_owner (id INTEGER PRIMARY KEY CHECK(id=1), password_hash TEXT, salt TEXT, setup_hash TEXT, setup_expires INTEGER);
CREATE TABLE IF NOT EXISTS dough_sessions (token_hash TEXT PRIMARY KEY, salt TEXT NOT NULL, expires INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS dough_attempts (attempt_key TEXT PRIMARY KEY, failures INTEGER NOT NULL, blocked_until INTEGER NOT NULL);
INSERT OR IGNORE INTO dough_owner (id) VALUES (1);`;
function createPasswordAuth(){
 let initialized;
 async function ready(db){if(!db)throw Error('Missing auth database');if(!initialized)initialized=Promise.resolve(db.exec(AUTH_SCHEMA)).catch(e=>{initialized=null;throw e;});return initialized;}
 async function session(req,db){await ready(db);const raw=rawCookie(req);if(!raw||!/^[a-f0-9]{64}$/.test(raw))return null;return db.prepare('SELECT s.token_hash FROM dough_sessions s JOIN dough_owner u ON u.id=1 AND u.salt=s.salt WHERE s.token_hash=? AND s.expires>?').bind(await tokenHash(raw),Date.now()).first();}
 async function issue(db,salt){const raw=randomToken();await db.prepare('INSERT INTO dough_sessions (token_hash,salt,expires) VALUES (?,?,?)').bind(await tokenHash(raw),salt,Date.now()+SESSION_MS).run();await db.prepare('DELETE FROM dough_sessions WHERE expires<=?').bind(Date.now()).run();return json({ok:true,email:OWNER_EMAIL},200,{'Set-Cookie':cookie(raw)});}
 async function api(req,db){
  try{
   const url=new URL(req.url),path=url.pathname;
   if(path==='/owner/api/session'&&req.method==='GET')return await session(req,db)?json({ok:true,email:OWNER_EMAIL}):json({error:'Sign in required'},401);
   if(req.method!=='POST')return json({error:'Method not allowed'},405,{'Allow':'POST'});
   if(req.headers.get('Origin')!==url.origin||req.headers.get('Sec-Fetch-Site')==='cross-site')return json({error:'Request origin not allowed'},403);
   if(!/^application\/json(?:;|$)/i.test(req.headers.get('Content-Type')||''))return json({error:'JSON required'},415);
   await ready(db);
   if(path==='/owner/api/logout'){const raw=rawCookie(req);if(raw&&/^[a-f0-9]{64}$/.test(raw))await db.prepare('DELETE FROM dough_sessions WHERE token_hash=?').bind(await tokenHash(raw)).run();return json({ok:true},200,{'Set-Cookie':cookie('',0)});}
   if(!['/owner/api/login','/owner/api/setup','/owner/api/change-password'].includes(path))return json({error:'Not found'},404);
   if(Number(req.headers.get('Content-Length')||0)>4096)return json({error:'Request too large'},413);
   // Stream cap avoids reading unbounded chunked bodies before validation.
   const reader=req.body?.getReader();let text='',length=0;if(reader){const decoder=new TextDecoder();for(;;){const {done,value}=await reader.read();if(done)break;length+=value.byteLength;if(length>4096){await reader.cancel();return json({error:'Request too large'},413);}text+=decoder.decode(value,{stream:true});}text+=decoder.decode();}
   let body;try{body=JSON.parse(text);if(!body||typeof body!=='object'||Array.isArray(body))throw 0;}catch{return json({error:'Invalid request'},400);}
   const setup=path.endsWith('/setup'),changing=path.endsWith('/change-password');
   if(changing&&!await session(req,db))return json({error:'Sign in required'},401);
   const user=await db.prepare('SELECT * FROM dough_owner WHERE id=1').first();
   const validSetup=setup&&typeof body.token==='string'&&/^[a-f0-9]{64}$/.test(body.token)&&user?.setup_expires>Date.now()&&equal(await tokenHash(body.token),user.setup_hash);
   const ipKey=await tokenHash(req.headers.get('CF-Connecting-IP')||'unknown');
   const keys=[ipKey,'account'];const attempts=await Promise.all(keys.map(k=>db.prepare('SELECT failures,blocked_until FROM dough_attempts WHERE attempt_key=?').bind(k).first()));
   if(attempts.some(a=>a?.blocked_until>Date.now())&&!validSetup)return json({error:'Too many attempts. Try again in 10 minutes.'},429,{'Retry-After':'600'});
   const password=changing?body.oldPassword:body.password;
   const newPassword=changing?body.newPassword:body.password;
   if((setup||changing)&&(typeof newPassword!=='string'||newPassword.length<10||newPassword.length>256))return json({error:'Use a password of 10–256 characters.'},400);
   let valid=validSetup;
   if(!setup){const candidate=await derive(typeof password==='string'&&password.length<=256?password:'',user?.salt||'unconfigured-account');valid=typeof password==='string'&&password.length<=256&&equal(candidate,user?.password_hash)&&typeof body.email==='string'&&body.email.trim().toLowerCase()===OWNER_EMAIL;}
   if(!valid){for(const [i,k]of keys.entries()){const prior=attempts[i],n=(prior?.blocked_until&&prior.blocked_until<=Date.now()?0:prior?.failures||0)+1;await db.prepare('INSERT INTO dough_attempts (attempt_key,failures,blocked_until) VALUES (?,?,?) ON CONFLICT(attempt_key) DO UPDATE SET failures=CASE WHEN blocked_until>0 AND blocked_until<=? THEN 1 ELSE failures+1 END,blocked_until=CASE WHEN blocked_until>0 AND blocked_until<=? THEN 0 WHEN failures+1>=? THEN ? ELSE blocked_until END').bind(k,n,n>=(i?25:5)?Date.now()+BLOCK_MS:0,Date.now(),Date.now(),i?25:5,Date.now()+BLOCK_MS).run();}return json({error:'Invalid email, password or setup link.'},401);}
   let salt=user.salt;
   if(setup||changing){salt=randomToken();const hash=await derive(newPassword,salt);const result=setup?await db.prepare('UPDATE dough_owner SET password_hash=?,salt=?,setup_hash=NULL,setup_expires=NULL WHERE id=1 AND setup_hash=? AND setup_expires>?').bind(hash,salt,user.setup_hash,Date.now()).run():await db.prepare('UPDATE dough_owner SET password_hash=?,salt=?,setup_hash=NULL,setup_expires=NULL WHERE id=1 AND salt=?').bind(hash,salt,user.salt).run();if(!result.meta?.changes)return json({error:'This link or session is no longer valid.'},401);await db.prepare('DELETE FROM dough_sessions WHERE salt<>?').bind(salt).run();}
   await db.prepare('DELETE FROM dough_attempts WHERE attempt_key=? OR attempt_key=?').bind(ipKey,'account').run();return issue(db,salt);
  }catch{return json({error:'Sign-in is temporarily unavailable. Please try again later.'},503);}
 }
 return {session,api};
}

// Recipe visibility only. Immutable source formulas and browser notes are never deleted.
function createRecipeArchive(allowedIds){
 const allowed=new Set(allowedIds);let ready;
 async function schema(db){if(!db)throw Error('Missing recipe state database');if(!ready)ready=Promise.resolve(db.exec('CREATE TABLE IF NOT EXISTS recipe_archive (recipe_id TEXT PRIMARY KEY, deleted_at INTEGER NOT NULL);')).catch(e=>{ready=null;throw e;});return ready;}
 const reply=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
 async function list(db){await schema(db);const rows=await db.prepare('SELECT recipe_id FROM recipe_archive ORDER BY recipe_id').all();return rows.results.map(r=>r.recipe_id).filter(id=>allowed.has(id));}
 return {async fetch(req,env,isOwner){
  try{
   const url=new URL(req.url);if(req.method==='GET'&&url.pathname==='/api/recipe-archive')return reply({deleted:await list(env.DOUGH_RECIPES_DB)});
   if(req.method!=='POST'||url.pathname!=='/owner/api/recipe-archive')return reply({error:'Not found'},404);
   if(!await isOwner(req))return reply({error:'Sign in required'},401);
   if(req.headers.get('Origin')!==url.origin||req.headers.get('Sec-Fetch-Site')==='cross-site')return reply({error:'Request origin not allowed'},403);
   if(!/^application\/json(?:;|$)/i.test(req.headers.get('Content-Type')||''))return reply({error:'JSON required'},415);
   const reader=req.body?.getReader();let length=0,text='';if(reader){const decoder=new TextDecoder();for(;;){const {done,value}=await reader.read();if(done)break;length+=value.byteLength;if(length>2048){await reader.cancel();return reply({error:'Request too large'},413);}text+=decoder.decode(value,{stream:true});}text+=decoder.decode();}
   let body;try{body=JSON.parse(text);}catch{return reply({error:'Invalid request'},400);}
   if(!body||!allowed.has(body.id)||typeof body.deleted!=='boolean')return reply({error:'Choose a valid recipe and action'},400);
   await schema(env.DOUGH_RECIPES_DB);
   if(body.deleted)await env.DOUGH_RECIPES_DB.prepare('INSERT INTO recipe_archive (recipe_id,deleted_at) VALUES (?,?) ON CONFLICT(recipe_id) DO UPDATE SET deleted_at=excluded.deleted_at').bind(body.id,Date.now()).run();
   else await env.DOUGH_RECIPES_DB.prepare('DELETE FROM recipe_archive WHERE recipe_id=?').bind(body.id).run();
   return reply({ok:true,deleted:await list(env.DOUGH_RECIPES_DB)});
  }catch{return reply({error:'Recipe management is temporarily unavailable'},503);}
 }};
}

const recipeArchive=createRecipeArchive(["rye-70","vermont","vermont-small","caraway","miche","lithuanian","lodeve","ciabatta","khachapuri","khachapuri-working","pizza-sourdough","pizza-biga","waffles","pretzels","khinkali","pita","scald-hamelman","scald-gost","pizzalovers-contemporanea","pizzalovers-classica","pizzalovers-teglia","pizzalovers-romana","pizzalovers-biga","pizzalovers-poolish","hamelman-baguettes-with-poolish","hamelman-baguettes-with-pate-fermentee","hamelman-ciabatta-with-stiff-biga","hamelman-ciabatta-with-poolish","hamelman-ciabatta-with-olive-oil-and-wheat-germ","hamelman-pain-rustique","hamelman-country-bread","hamelman-rustic-bread","hamelman-roasted-potato-bread","hamelman-potato-bread-with-roasted-onions","hamelman-honey-spelt-bread","hamelman-whole-wheat-bread","hamelman-whole-wheat-bread-with-hazelnuts-and-currants","hamelman-whole-wheat-bread-with-a-multigrain-soaker","hamelman-brown-rice-bread","hamelman-five-grain-bread-with-pate-fermentee","hamelman-cracked-wheat-bread","hamelman-sunflower-seed-bread-with-pate-fermentee","hamelman-golden-raisin-and-walnut-bread","hamelman-buttermilk-bread","hamelman-semolina-durum-bread","hamelman-semolina-durum-bread-with-a-whole-grain-soaker","hamelman-corn-bread","hamelman-vermont-sourdough","hamelman-vermont-sourdough-with-whole-wheat","hamelman-vermont-sourdough-with-increased-whole-grain","hamelman-pain-au-levain","hamelman-pain-au-levain-with-whole-wheat-flour","hamelman-pain-au-levain-with-mixed-sourdough-starters","hamelman-miche-pointe-a-calliere","hamelman-mixed-flour-miche","hamelman-whole-wheat-levain","hamelman-whole-wheat-multigrain","hamelman-semolina-bread","hamelman-durum-bread","hamelman-sourdough-baguettes","hamelman-golden-raisin-bread","hamelman-walnut-raisin-ciabatta","hamelman-five-grain-levain","hamelman-hazelnut-and-fig-levain","hamelman-sourdough-seed-bread","hamelman-olive-levain","hamelman-cheese-bread","hamelman-normandy-apple-bread","hamelman-roasted-garlic-levain","hamelman-harvest-bread","hamelman-carrot-and-walnut-bread","hamelman-roasted-hazelnut-and-prune-bread","hamelman-40-percent-caraway-rye","hamelman-whole-rye-and-whole-wheat-bread","hamelman-deli-rye-bread","hamelman-sourdough-rye-with-walnuts","hamelman-three-stage-90-percent-sourdough-rye","hamelman-three-stage-80-percent-sourdough-rye","hamelman-three-stage-70-percent-sourdough-rye","hamelman-sourdough-rye-with-raisins-and-walnuts","hamelman-quarkbrot","hamelman-66-percent-sourdough-rye","hamelman-flaxseed-bread","hamelman-80-percent-sourdough-rye-with-a-rye-flour-soaker","hamelman-70-percent-rye-with-a-rye-soaker-and-whole-wheat-flour","hamelman-vollkornbrot","hamelman-vollkornbrot-with-flaxseeds","hamelman-vollkornbrot-with-currants","hamelman-horst-bandel-s-black-pumpernickel","hamelman-flaxseed-rye-with-an-old-bread-soaker","hamelman-black-bread","hamelman-five-grain-sourdough-with-rye-sourdough","hamelman-sunflower-seed-bread-with-rye-sourdough","hamelman-beer-bread","hamelman-65-percent-sourdough-rye-with-rye-sourdough","hamelman-65-percent-sourdough-rye-with-firm-white-levain","hamelman-hand-mixed-white-bread","hamelman-unkneaded-six-fold-french-bread","hamelman-baguettes-de-tradition","hamelman-slow-rise","hamelman-french-bread","hamelman-oatmeal-bread","hamelman-oatmeal-bread-with-cinnamon-and-raisins","hamelman-five-grain-bread","hamelman-challah","hamelman-berne-brot","hamelman-pullman-bread","hamelman-whey-bread","hamelman-semolina-bread-with-a-soaker-and-fennel-seed","hamelman-whole-wheat-with-pecans-and-golden-raisins","hamelman-hazelnut-and-fig-bread-with-fennel-seeds-and-rosemary","hamelman-german-farmer-s-bread","hamelman-toast-bread","hamelman-brioche","hamelman-swiss-farmhouse-bread","hamelman-sesame-bread-sticks","hamelman-grissini","hamelman-soft-butter-rolls","hamelman-bagels","hamelman-simits","hamelman-bialys","hamelman-irish-soda-bread","hamelman-traditional-english-hot-cross-buns","hamelman-pretzels","hamelman-pizza-dough","hamelman-tarte-flambee","hamelman-pissaladiere","hamelman-fougasse-with-olives","hamelman-focaccia","hamelman-rosemary-crackers-with-olive-oil","hamelman-lavash","hamelman-whole-wheat-flat-bread","hamelman-lebkuchen"]);
const auth=createPasswordAuth();
const privateHeaders={'Content-Type':'text/html; charset=utf-8','Cache-Control':'private, no-store','X-Robots-Tag':'noindex, nofollow','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; worker-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'"};
export default {async fetch(request,env){
 const url=new URL(request.url),p=url.pathname;
 if(p==='/_worker.js'||p==='/owner-auth.js'||p.startsWith('/tests/')||p.startsWith('/scripts/')||p==='/owner-login.html')return new Response('Not found',{status:404});
 if(p==='/api/recipe-archive')return recipeArchive.fetch(request,env,async()=>false);
 if(p==='/owner'||p.startsWith('/owner/')){
  if(!['dc.rodiucov.com','dough-calculator-2nr.pages.dev','dc.test'].includes(url.hostname))return new Response('Not found',{status:404});
  if(p==='/owner/api/recipe-archive')return recipeArchive.fetch(request,env,r=>auth.session(r,env.DOUGH_AUTH_DB));
  if(p.startsWith('/owner/api/'))return auth.api(request,env.DOUGH_AUTH_DB);
  let signedIn=false;try{signedIn=!!await auth.session(request,env.DOUGH_AUTH_DB);}catch{if(!['/owner/login','/owner/setup'].includes(p))return new Response('Sign-in is temporarily unavailable.',{status:503,headers:privateHeaders});}
  if(p==='/owner/login'||p==='/owner/setup'||p==='/owner/account'){
   if(p==='/owner/account'&&!signedIn)return new Response(null,{status:303,headers:{Location:'/owner/login','Cache-Control':'no-store'}});
   const source=new URL('/owner-login.html',url),asset=await env.ASSETS.fetch(new Request(source));
   if(!asset.ok)return new Response('Sign-in is temporarily unavailable.',{status:503,headers:privateHeaders});return new Response(asset.body,{headers:privateHeaders});
  }
  if(!signedIn)return new Response(null,{status:303,headers:{Location:'/owner/login','Cache-Control':'no-store'}});
  if(p!=='/owner')return new Response(null,{status:303,headers:{Location:'/owner','Cache-Control':'no-store'}});
  const asset=await env.ASSETS.fetch(new Request(new URL('/',url)));
  if(!asset.ok)return new Response('Temporarily unavailable.',{status:503,headers:privateHeaders});
  return new Response((await asset.text()).replace('<head>','<head><base href="/owner"><meta name="dough-owner" content="true">'),{headers:privateHeaders});
 }
 const asset=await env.ASSETS.fetch(request);
 if(p==='/'||/\.(?:js|json|css|html)$/.test(p)){const headers=new Headers(asset.headers);headers.set('Cache-Control',p==='/version.json'?'no-store':'public, max-age=0, must-revalidate');return new Response(asset.body,{status:asset.status,statusText:asset.statusText,headers});}
 return asset;
}};
