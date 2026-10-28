// Recipe visibility only. Immutable source formulas and browser notes are never deleted.
export function createRecipeArchive(allowedIds){
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
