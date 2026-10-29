// Versioned recipe content lives in DOUGH_RECIPES_DB, never the auth/training DB.
export const RECIPE_SCHEMA=`CREATE TABLE IF NOT EXISTS recipe_publications(id TEXT PRIMARY KEY,revision INTEGER NOT NULL,document TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS recipe_revisions(id TEXT NOT NULL,revision INTEGER NOT NULL,document TEXT NOT NULL,created_at INTEGER NOT NULL,kind TEXT NOT NULL,PRIMARY KEY(id,revision));
CREATE TABLE IF NOT EXISTS recipe_drafts(id TEXT PRIMARY KEY,base_revision INTEGER NOT NULL,version INTEGER NOT NULL,document TEXT NOT NULL,updated_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS recipe_draft_counters(id TEXT PRIMARY KEY,version INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS recipe_imports(version TEXT PRIMARY KEY,imported_at INTEGER NOT NULL);`;
export function createRecipeStore(){
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
