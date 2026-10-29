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

// Shared browser/server schema and calculations. A stage explicitly lists additions;
// a ripe build appears once as a transfer, never again as separate feed additions.
const sumGrams=stage=>stage.rows.reduce((sum,r)=>sum+(r.unit==='g'&&typeof r.quantity==='number'?r.quantity:0),0);
function recipeMass(r){return sumGrams(r.stages.find(s=>s.id===r.finalStageId));}
function knownMass(r){return r.stages.find(s=>s.id===r.finalStageId).rows.every(v=>v.unit==='g'&&v.quantity!==null);}
function scaledRecipe(r,factor){if(!Number.isFinite(factor)||factor<=0||factor>1e6)throw Error('Invalid batch scale');return {...r,stages:r.stages.map(s=>({...s,rows:s.rows.map(v=>({...v,quantity:v.quantity===null?null:v.quantity*factor,...(v.retained!==undefined?{retained:v.retained*factor}:{})}))}))};}
function validateRecipe(r,{publication=false}={}){
 const errors=[],warnings=[];const str=(v,max=2000)=>typeof v==='string'&&v.length<=max;const id=v=>str(v,100)&&/^[a-z0-9][a-z0-9-]*$/.test(v);
 if(!r||typeof r!=='object'||Array.isArray(r))return {errors:['Invalid recipe record'],warnings};
 if(r.schemaVersion!==1||!id(r.id))errors.push('Invalid recipe ID or schema');
 if(!str(r.title,200)||!r.title.trim()||!str(r.description)||!str(r.tag,100))errors.push('Title, description or category is invalid');
 if(!r.source||!['workbook','hamelman','pizzalovers'].includes(r.source.kind)||r.source.referenceId!==r.id||!str(r.source.sha256,64)||!/^[a-f0-9]{64}$/.test(r.source.sha256))errors.push('Invalid source provenance');
 if(r.component!==null&&(!r.component||!id(r.component.id)||!str(r.component.name,200)||!Number.isFinite(r.component.grams)||r.component.grams<=0))errors.push('Invalid base-dough component');
 if(!Number.isInteger(r.basePieces)||r.basePieces<1||r.basePieces>10000)errors.push('Piece count must be 1–10,000');
 if(!Array.isArray(r.stages)||!r.stages.length||r.stages.length>40)return {errors:[...errors,'A recipe requires 1–40 stages'],warnings};
 const ids=new Set();for(const s of r.stages){if(!s||!id(s.id)||ids.has(s.id)||!str(s.name,200)||!['build','final','component','reference'].includes(s.role)||!str(s.timing))errors.push('Invalid or duplicate stage');ids.add(s?.id);if(!Array.isArray(s?.rows)||s.rows.length>200||!s.rows.length){errors.push('Each stage needs 1–200 ingredients');continue;}
  const rowIds=new Set();for(const v of s.rows){if(!v||!id(v.id)||rowIds.has(v.id)||!str(v.name,300)||!v.name.trim()||!['g','ml','eggs','tsp','text'].includes(v.unit)||!['flour','water','starter','other','transfer'].includes(v.kind)||!str(v.display??'',2000))errors.push('Invalid ingredient');rowIds.add(v?.id);
   if(v.quantity!==null&&(typeof v.quantity!=='number'||!Number.isFinite(v.quantity)||Math.abs(v.quantity)>1e8))errors.push('Ingredient quantities must be finite');
   if(v.quantity<0){(publication?errors:warnings).push('Negative source addition: '+v.name);}
   if(v.quantity===null)warnings.push('Unquantified ingredient: '+v.name);
   if(v.seedHydration!==undefined&&(!Number.isFinite(v.seedHydration)||v.seedHydration<0||v.seedHydration>1000))errors.push('Invalid seed hydration');
   if(v.kind==='starter'&&v.seedHydration===undefined)warnings.push('Starter hydration is unspecified: '+v.name);
  }
 }
 if(r.stages.some(s=>!s||!Array.isArray(s.rows)||s.rows.some(v=>!v||typeof v!=='object')))return {errors:[...new Set(errors)],warnings};
 const final=r.stages.filter(s=>s.id===r.finalStageId);if(final.length!==1||final[0]?.role!=='final'||r.stages.filter(s=>s.role==='final').length!==1)errors.push('Exactly one final stage is required');
 for(const [i,s]of r.stages.entries())for(const v of s.rows||[]){if(v.kind==='transfer'){
  const bi=r.stages.findIndex(b=>b.id===v.fromStage),b=r.stages[bi];if(!b||bi>=i||b.role!=='build'){errors.push('A transfer must refer to a preceding visible build: '+v.name);continue;}
  if(v.quantity===null||v.unit!=='g'||!Number.isFinite(v.retained)||v.retained<-.000001)errors.push('Transfer and retained starter quantities must be explicit');
  else if(b.rows.every(row=>row.quantity!==null&&row.unit==='g')&&Math.abs(sumGrams(b)-v.quantity-v.retained)>Math.max(.02,sumGrams(b)*1e-7))errors.push('Build / transfer / retained mass mismatch: '+v.name);
 }else if(v.fromStage)errors.push('Only transfers can reference builds');}
 for(const build of r.stages.filter(s=>s.role==='build')){const uses=r.stages.flatMap(s=>s.rows.filter(v=>v.kind==='transfer'&&v.fromStage===build.id));if(!uses.length)errors.push('Build is not transferred to any later stage: '+build.name);if(build.rows.every(v=>v.quantity!==null&&v.unit==='g')&&uses.reduce((n,v)=>n+(v.quantity||0),0)>sumGrams(build)+Math.max(.02,sumGrams(build)*1e-7))errors.push('Transfers exceed the prepared build: '+build.name);}
 if(!Array.isArray(r.methods)||r.methods.length>150||r.methods.some(m=>!str(m?.heading,200)||!str(m?.body,30000)))errors.push('Invalid method steps');
 for(const key of ['notes','warnings'])if(!Array.isArray(r[key])||r[key].length>200||r[key].some(v=>!str(v,30000)))errors.push('Invalid '+key);
 if(final.length===1&&sumGrams(final[0])<=0)errors.push('Final weighed subtotal must be positive');
 return {errors:[...new Set(errors)],warnings:[...new Set(warnings)]};
}

// Versioned recipe content lives in DOUGH_RECIPES_DB, never the auth/training DB.
const RECIPE_SCHEMA=`CREATE TABLE IF NOT EXISTS recipe_publications(id TEXT PRIMARY KEY,revision INTEGER NOT NULL,document TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS recipe_revisions(id TEXT NOT NULL,revision INTEGER NOT NULL,document TEXT NOT NULL,created_at INTEGER NOT NULL,kind TEXT NOT NULL,PRIMARY KEY(id,revision));
CREATE TABLE IF NOT EXISTS recipe_drafts(id TEXT PRIMARY KEY,base_revision INTEGER NOT NULL,version INTEGER NOT NULL,document TEXT NOT NULL,updated_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS recipe_draft_counters(id TEXT PRIMARY KEY,version INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS recipe_imports(version TEXT PRIMARY KEY,imported_at INTEGER NOT NULL);`;
function createRecipeStore(){
 let initialized;
 const reply=(v,status=200)=>new Response(JSON.stringify(v),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
 async function ready(env,url){if(!initialized)initialized=(async()=>{
  const db=env.DOUGH_RECIPES_DB;if(!db)throw Error('Missing recipe database');await db.exec(RECIPE_SCHEMA);
  if(await db.prepare('SELECT version FROM recipe_imports WHERE version=?').bind('source-v1').first())return;
  const response=await env.ASSETS.fetch(new Request(new URL('/recipe-catalog.json',url)));if(!response.ok)throw Error('Source catalogue unavailable');const data=await response.json();if(data.schemaVersion!==1||data.recipes.length!==134)throw Error('Invalid import');
  const statements=[];for(const r of data.recipes){if(validateRecipe(r).errors.length)throw Error('Invalid source '+r.id);const doc=JSON.stringify(r);statements.push(db.prepare('INSERT OR IGNORE INTO recipe_publications(id,revision,document) VALUES (?,1,?)').bind(r.id,doc),db.prepare('INSERT OR IGNORE INTO recipe_revisions(id,revision,document,created_at,kind) VALUES (?,1,?,?,?)').bind(r.id,doc,Date.now(),'source'));}
  // Partial cold-start imports are safe to retry: all inserts are idempotent;
  // no current publication/draft can ever be overwritten by import.
  for(let i=0;i<statements.length;i+=30)await db.batch(statements.slice(i,i+30));await db.prepare('INSERT OR IGNORE INTO recipe_imports(version,imported_at) VALUES (?,?)').bind('source-v1',Date.now()).run();
 })().catch(e=>{initialized=null;throw e;});await initialized;}
 async function body(req){const reader=req.body?.getReader();if(!reader)throw Error('Invalid request');let n=0,s='';const decoder=new TextDecoder();for(;;){const {done,value}=await reader.read();if(done)break;n+=value.byteLength;if(n>350000){await reader.cancel();throw Error('Request too large');}s+=decoder.decode(value,{stream:true});}return JSON.parse(s+decoder.decode());}
 const parse=r=>r?{revision:r.revision,record:JSON.parse(r.document)}:null;
 async function details(db,id){const p=await db.prepare('SELECT * FROM recipe_publications WHERE id=?').bind(id).first();if(!p)return null;const d=await db.prepare('SELECT * FROM recipe_drafts WHERE id=?').bind(id).first(),history=await db.prepare('SELECT revision,created_at,kind FROM recipe_revisions WHERE id=? ORDER BY revision DESC').bind(id).all();return {...parse(p),draft:d?{baseRevision:d.base_revision,version:d.version,record:JSON.parse(d.document)}:null,history:history.results};}
 return {async fetch(req,env,authorized){const url=new URL(req.url),privateRoute=url.pathname.startsWith('/owner/');try{
  if(privateRoute&&!await authorized(req))return reply({error:'Sign in required'},401);
  if(!privateRoute&&req.method!=='GET')return reply({error:'Method not allowed'},405);
  if(privateRoute&&!['GET','POST'].includes(req.method))return reply({error:'Method not allowed'},405);
  if(req.method==='POST'&&(req.headers.get('Origin')!==url.origin||req.headers.get('Sec-Fetch-Site')==='cross-site'))return reply({error:'Request origin not allowed'},403);
  if(req.method==='POST'&&!/^application\/json(?:;|$)/i.test(req.headers.get('Content-Type')||''))return reply({error:'JSON required'},415);
  await ready(env,url);const db=env.DOUGH_RECIPES_DB;
  if(req.method==='GET'&&!privateRoute){const selected=url.searchParams.get('id');const records=selected?await db.prepare('SELECT id,revision,document FROM recipe_publications WHERE id=?').bind(selected).all():await db.prepare('SELECT id,revision,document FROM recipe_publications ORDER BY id').all();if(selected&&!records.results.length)return reply({error:'Recipe not found'},404);return reply({schemaVersion:1,recipes:records.results.map(v=>({...JSON.parse(v.document),revision:v.revision}))});}
  const id=url.searchParams.get('id');if(!id||!/^[-a-z0-9]{1,100}$/.test(id))return reply({error:'Choose a valid recipe'},400);
  const current=await details(db,id);if(!current)return reply({error:'Recipe not found'},404);if(req.method==='GET')return reply(current);
  let b;try{b=await body(req);}catch{return reply({error:'Invalid or oversized request'},400);}
  if(b.baseRevision!==current.revision)return reply({error:'This recipe changed. Reload before saving or publishing.'},409);
  if(b.action==='discard'){
   if(!current.draft||b.draftVersion!==current.draft.version)return reply({error:'Draft changed. Reload first.'},409);
   await db.prepare('DELETE FROM recipe_drafts WHERE id=? AND version=?').bind(id,b.draftVersion).run();return reply(await details(db,id));
  }
  if(b.action==='draft'){
   if(!b.record||b.record.id!==id||JSON.stringify(b.record.source)!==JSON.stringify(current.record.source))return reply({error:'Recipe identity and source provenance cannot be changed'},400);
   const validation=validateRecipe(b.record);if(validation.errors.length)return reply({error:'Recipe validation failed',...validation},422);
   const source=JSON.parse((await db.prepare('SELECT document FROM recipe_revisions WHERE id=? AND revision=1').bind(id).first()).document);
   // Original reference tables remain immutable. Current build/final rows and
   // procedures are editable; the source revision is always recoverable.
   for(const s of source.stages.filter(s=>s.role==='reference'))if(JSON.stringify(s)!==JSON.stringify(b.record.stages.find(v=>v.id===s.id)))return reply({error:'Original reference tables cannot be edited'},422);
   if((current.draft?.version||0)!==b.draftVersion)return reply({error:'Draft changed. Reload first.'},409);
   const document=JSON.stringify(b.record),counter=await db.prepare('INSERT INTO recipe_draft_counters(id,version) VALUES (?,1) ON CONFLICT(id) DO UPDATE SET version=version+1 RETURNING version').bind(id).first(),version=counter.version;
   const result=await db.prepare('INSERT INTO recipe_drafts(id,base_revision,version,document,updated_at) SELECT ?,?,?,?,? WHERE EXISTS(SELECT 1 FROM recipe_publications WHERE id=? AND revision=?) ON CONFLICT(id) DO UPDATE SET base_revision=excluded.base_revision,version=excluded.version,document=excluded.document,updated_at=excluded.updated_at WHERE recipe_drafts.version=?').bind(id,b.baseRevision,version,document,Date.now(),id,b.baseRevision,b.draftVersion).run();
   if(!result.meta.changes)return reply({error:'Recipe or draft changed. Reload first.'},409);return reply({...await details(db,id),validation});
  }
  if(!['publish','rollback'].includes(b.action))return reply({error:'Unknown action'},400);
  let document;
  if(b.action==='publish'){if(!current.draft||current.draft.version!==b.draftVersion||current.draft.baseRevision!==b.baseRevision)return reply({error:'Save the current draft first'},409);document=JSON.stringify(current.draft.record);}
  else{if(!Number.isInteger(b.targetRevision))return reply({error:'Choose a revision'},400);const old=await db.prepare('SELECT document FROM recipe_revisions WHERE id=? AND revision=?').bind(id,b.targetRevision).first();if(!old)return reply({error:'Revision not found'},404);document=old.document;}
  const record=JSON.parse(document),validation=validateRecipe(record,{publication:true});
  // Source conflicts may be restored, but must never be presented as fixed.
  if(validation.errors.length&&!(b.action==='rollback'&&b.targetRevision===1))return reply({error:'Resolve formula errors before publishing',...validation},422);
  const revision=b.baseRevision+1;
  const statements=[db.prepare('INSERT INTO recipe_revisions(id,revision,document,created_at,kind) SELECT id,?,?,?,? FROM recipe_publications WHERE id=? AND revision=?').bind(revision,document,Date.now(),b.action,id,b.baseRevision),db.prepare('UPDATE recipe_publications SET revision=?,document=? WHERE id=? AND revision=?').bind(revision,document,id,b.baseRevision)];
  if(b.action==='publish')statements.push(db.prepare('DELETE FROM recipe_drafts WHERE id=? AND version=? AND base_revision=?').bind(id,b.draftVersion,b.baseRevision));
  const results=await db.batch(statements);if(!results[1].meta.changes)return reply({error:'Recipe changed. Reload first.'},409);return reply({...await details(db,id),validation});
 }catch(error){return reply({error:/unique|constraint/i.test(error.message)?'Recipe changed. Reload first.':'Recipe storage is temporarily unavailable'},/unique|constraint/i.test(error.message)?409:503);}}};
}

const recipeStore=createRecipeStore();
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
 if(p==='/api/recipes')return recipeStore.fetch(request,env,async()=>false);
 if(p==='/api/recipe-archive')return recipeArchive.fetch(request,env,async()=>false);
 if(p==='/owner'||p.startsWith('/owner/')){
  if(!['dc.rodiucov.com','dough-calculator-2nr.pages.dev','dc.test'].includes(url.hostname))return new Response('Not found',{status:404});
  if(p==='/owner/api/recipes')return recipeStore.fetch(request,env,r=>auth.session(r,env.DOUGH_AUTH_DB));
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
