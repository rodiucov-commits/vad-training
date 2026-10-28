const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export async function createRecipeManager(recipes,{owner,toast,onChange}){
 const catalog=new Map(recipes.filter(r=>r.tag!=='Calculator'&&!r.temperature).map(r=>[r.id,r]));
 let deleted=new Set(),online=false,busy=false;const cacheKey='dough-recipe-archive-v1';
 function update(ids){deleted=new Set(ids.filter(id=>catalog.has(id)));try{localStorage.setItem(cacheKey,JSON.stringify([...deleted]));}catch{}}
 try{const saved=JSON.parse(localStorage.getItem(cacheKey)||'[]');if(Array.isArray(saved))deleted=new Set(saved.filter(id=>catalog.has(id)));}catch{}
 try{const r=await fetch('/api/recipe-archive',{cache:'no-store'});if(!r.ok)throw 0;const data=await r.json();if(!Array.isArray(data.deleted))throw 0;update(data.deleted);online=true;}catch{}
 const toolbar=owner?document.createElement('section'):null;
 if(toolbar){toolbar.className='owner-recipe-tools';toolbar.id='owner-recipe-tools';document.querySelector('main').before(toolbar);toolbar.addEventListener('change',e=>{if(e.target.id==='owner-recipe-picker'&&e.target.value)location.hash='recipe/'+e.target.value;});toolbar.addEventListener('click',e=>{if(e.target.closest('[data-delete-recipe]'))mutate(toolbar.dataset.active,true);});}
 async function mutate(id,remove){
  if(busy||!owner||!catalog.has(id))return;
  if(remove&&!confirm(`Delete “${catalog.get(id).title}” from the public collection? You can restore it from Deleted recipes. Your saved notes will stay intact.`))return;
  busy=true;toolbar?.querySelectorAll('button').forEach(b=>b.disabled=true);
  try{const response=await fetch('/owner/api/recipe-archive',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',body:JSON.stringify({id,deleted:remove})});const data=await response.json();if(!response.ok)throw Error(data.error||'Could not update the recipe.');update(data.deleted);online=true;if(remove)location.hash='deleted';onChange();toast(remove?'Recipe deleted. You can restore it from Deleted recipes.':'Recipe restored to the collection.');}
  catch(error){toast(error.message||'Cannot connect. The recipe has not been changed.');}
  finally{busy=false;setActive(toolbar?.dataset.active||'');}
 }
 function setActive(id){
  if(!toolbar)return;toolbar.dataset.active=id;
  toolbar.innerHTML=`<label>Choose a recipe<select id="owner-recipe-picker" aria-label="Choose a recipe"><option value="">Choose a recipe…</option>${[...catalog.values()].filter(r=>!deleted.has(r.id)).map(r=>`<option value="${escape(r.id)}" ${r.id===id?'selected':''}>${escape(r.title)}</option>`).join('')}</select></label><button class="btn recipe-delete" data-delete-recipe ${!catalog.has(id)||deleted.has(id)||busy||!online?'disabled':''}>Delete recipe</button><a href="#deleted" class="btn">Deleted recipes (${deleted.size})</a>${!online?'<span class="muted">Connect to manage recipes.</span>':''}`;
 }
 function renderDeleted(host){
  host.innerHTML=`<a class="back" href="#">← Back to the collection</a><section class="panel owner-archive"><h1>Deleted recipes</h1><p class="muted">These recipes are removed from the public collection. Original formulas and saved notes are kept, so you can restore them.</p>${deleted.size?'<ul class="recipe-trash">'+[...deleted].map(id=>`<li><span>${escape(catalog.get(id).title)}</span><button class="btn" data-restore-recipe="${escape(id)}">Restore recipe</button></li>`).join('')+'</ul>':'<p>No deleted recipes.</p>'}</section>`;
  host.onclick=e=>{const id=e.target.closest('[data-restore-recipe]')?.dataset.restoreRecipe;if(id)mutate(id,false);};
 }
 function filterLinks(host){for(const a of host.querySelectorAll('a[href^="#recipe/"]')){const id=a.getAttribute('href').slice(8).split('?')[0];if(deleted.has(id)){if(a.closest('.pl-presets'))a.remove();else a.replaceWith(document.createTextNode(a.textContent));}}}
 return {get deleted(){return deleted;},setActive,renderDeleted,filterLinks};
}
