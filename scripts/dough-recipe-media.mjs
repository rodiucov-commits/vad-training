export const MEDIA_SCHEMA=`CREATE TABLE IF NOT EXISTS recipe_media(id TEXT PRIMARY KEY,created_at INTEGER NOT NULL,published_at INTEGER,small_key TEXT NOT NULL,large_key TEXT NOT NULL);`;
export async function validateRecipePhotos(db,record){
 if(record.photos===undefined)return null;if(!Array.isArray(record.photos)||record.photos.length>2)return 'Invalid photo list';if(!record.photos.length)return null;
 try{for(const photo of record.photos)if(!photo||!(/^[a-f0-9]{32}$/).test(photo.id)||!await db.prepare('SELECT id FROM recipe_media WHERE id=?').bind(photo.id).first())return 'Photo is no longer available. Upload it again before saving.';}catch{return 'Photo is no longer available. Upload it again before saving.';}
 return null;
}
export function publishPhotoStatement(db,record,recipeId,revision){
 if(!record.photos?.length)return [];
 return [db.prepare(`UPDATE recipe_media SET published_at=COALESCE(published_at,?) WHERE id IN (${record.photos.map(()=>'?').join(',')}) AND EXISTS(SELECT 1 FROM recipe_publications WHERE id=? AND revision=? AND document=?)`).bind(Date.now(),...record.photos.map(p=>p.id),recipeId,revision,JSON.stringify(record))];
}
export function jpegDimensions(bytes){
 if(bytes.length<16||bytes[0]!==255||bytes[1]!==216||bytes.at(-2)!==255||bytes.at(-1)!==217)throw Error('A valid JPEG image is required');
 let at=2,dimensions;
 while(at+3<bytes.length){if(bytes[at++]!==255)throw Error('Invalid JPEG');while(bytes[at]===255)at++;const marker=bytes[at++];if(marker===218)break;if(marker===217)break;if(marker===1||(marker>=208&&marker<=215))continue;
 const length=(bytes[at]<<8)+bytes[at+1];if(length<2||at+length>bytes.length)throw Error('Invalid JPEG');
 if(marker===225||marker===237)throw Error('Image metadata must be removed before uploading');
 if([192,193,194].includes(marker)){if(length<8)throw Error('Invalid JPEG');dimensions={height:(bytes[at+3]<<8)+bytes[at+4],width:(bytes[at+5]<<8)+bytes[at+6]};}
 at+=length;
 }
 if(!dimensions)throw Error('JPEG dimensions are missing');return dimensions;
}
export function createRecipeMedia(){
 const reply=(v,status=200)=>new Response(JSON.stringify(v),{status,headers:{'Content-Type':'application/json','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
 return {async fetch(req,env,authorized){
 const url=new URL(req.url),upload=url.pathname==='/owner/api/media',privateImage=url.pathname.startsWith('/owner/media/');
 try{
  if((upload||privateImage)&&!await authorized(req))return reply({error:'Sign in required'},401);
  if(upload&&req.method==='GET')return reply({available:!!env.DOUGH_PHOTOS,maxPhotos:2});
  if(!env.DOUGH_PHOTOS||!env.DOUGH_RECIPES_DB)return reply({error:'Photo storage is not available yet'},503);
  const db=env.DOUGH_RECIPES_DB;
  if(upload){
   if(req.method!=='POST')return reply({error:'Method not allowed'},405);
   if(req.headers.get('Origin')!==url.origin||req.headers.get('Sec-Fetch-Site')==='cross-site')return reply({error:'Request origin not allowed'},403);
   const type=req.headers.get('Content-Type')||'';if(!type.startsWith('multipart/form-data;'))return reply({error:'Photo form required'},415);
   if(Number(req.headers.get('Content-Length'))>2300000)return reply({error:'Prepared photos are too large'},413);
   const reader=req.body?.getReader(),chunks=[];let total=0;if(!reader)return reply({error:'Photo required'},400);
   for(;;){const {done,value}=await reader.read();if(done)break;total+=value.byteLength;if(total>2300000){await reader.cancel();return reply({error:'Prepared photos are too large'},413);}chunks.push(value);}
   const bytes=new Uint8Array(total);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
   const form=await new Response(bytes,{headers:{'Content-Type':type}}).formData(),variants=[];
   for(const [name,width,height]of [['small',480,360],['large',1200,900]]){const file=form.get(name);if(!file||typeof file.arrayBuffer!=='function'||file.type!=='image/jpeg'||file.size>1100000)throw Error('Two optimised JPEG variants are required');const data=new Uint8Array(await file.arrayBuffer()),d=jpegDimensions(data);if(d.width!==width||d.height!==height)throw Error('Photo dimensions are invalid');variants.push({name,data});}
   await db.exec(MEDIA_SCHEMA);const id=crypto.randomUUID().replaceAll('-',''),keys=variants.map(v=>`photos/${id}/${v.name}.jpg`);
   try{for(const [i,v]of variants.entries())await env.DOUGH_PHOTOS.put(keys[i],v.data,{httpMetadata:{contentType:'image/jpeg'}});await db.prepare('INSERT INTO recipe_media(id,created_at,published_at,small_key,large_key) VALUES (?,?,NULL,?,?)').bind(id,Date.now(),...keys).run();}
   catch(error){for(const key of keys)try{await env.DOUGH_PHOTOS.delete(key);}catch{}throw error;}
   return reply({photo:{id,alt:'Finished bread',caption:'',kind:'actual'}},201);
  }
  if(!['GET','HEAD'].includes(req.method))return reply({error:'Method not allowed'},405);
  const match=url.pathname.match(/^\/(?:owner\/)?media\/([a-f0-9]{32})\/(small|large)\.jpg$/);if(!match)return reply({error:'Not found'},404);
  // Schema is created on upload, never as a side-effect of anonymous image reads.
  let media;try{media=await db.prepare('SELECT * FROM recipe_media WHERE id=?').bind(match[1]).first();}catch{return reply({error:'Not found'},404);}
  if(!media||(!privateImage&&!media.published_at))return reply({error:'Not found'},404);
  const object=await env.DOUGH_PHOTOS.get(media[match[2]+'_key']);if(!object)return reply({error:'Not found'},404);
  return new Response(req.method==='HEAD'?null:object.body,{headers:{'Content-Type':'image/jpeg','X-Content-Type-Options':'nosniff','Cache-Control':privateImage?'private, no-store':'public, max-age=31536000, immutable','ETag':object.httpEtag||'"'+match[1]+'-'+match[2]+'"','Content-Security-Policy':"default-src 'none'"}});
 }catch(error){return reply({error:/JPEG|metadata|dimensions|variants/.test(error.message)?error.message:'Photo storage is temporarily unavailable'},/JPEG|metadata|dimensions|variants/.test(error.message)?422:503);}
 }};
}
