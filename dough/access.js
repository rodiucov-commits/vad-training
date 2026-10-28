// The server supplies this marker only after validating a server-side Owner session.
export const isOwner=typeof document!=='undefined'&&location.pathname==='/owner'&&document.querySelector('meta[name="dough-owner"]')?.content==='true';
export function publicView(host){
 if(isOwner||host.querySelector('.hb-calculator'))return;
 for(const notes of host.querySelectorAll('textarea'))notes.closest('section')?.remove();
 for(const input of host.querySelectorAll('input,select')){
  if(input.type==='file'){input.remove();continue}
  const out=document.createElement('output');out.className='public-value';out.textContent=input.tagName==='SELECT'?input.selectedOptions[0]?.textContent:input.type==='checkbox'?(input.checked?'Yes':'No'):input.value||'—';input.replaceWith(out);
 }
 for(const el of host.querySelectorAll('[data-action],[data-hm-action],[data-pl-action]'))el.remove();
 for(const details of host.querySelectorAll('#worksheet'))details.remove();
 for(const p of host.querySelectorAll('.local-note'))p.textContent='Public recipe · read-only. Owner sign-in is required to use the calculator or save personal variations.';
 for(const p of host.querySelectorAll('.muted')){if(p.closest('#hm-guidance'))continue;if(/^(Edit the outlined|Edit percentages|Every recipe is ready to scale)/.test(p.textContent))p.textContent='These are the published recipe defaults. Sign in as the owner to adjust calculator inputs.'}
 const actions=host.querySelector('.detail-heading .actions');if(actions){actions.innerHTML='<a class="btn primary" href="/owner'+location.hash.split('?')[0]+'">Owner sign-in</a><button class="btn" data-public-print>Print recipe</button>'}
 host.oninput=host.onchange=host.onclick=null;
}
export function initAccess(){
 const nav=document.querySelector('nav');const link=document.createElement('a');link.className='owner-nav';link.textContent=isOwner?'Owner mode · Sign out':'Owner sign-in';link.href=isOwner?'/owner/login':'/owner';nav.append(link);
 if(isOwner){const account=document.createElement('a');account.textContent='Password settings';account.href='/owner/account';nav.append(account);link.addEventListener('click',async e=>{e.preventDefault();try{const response=await fetch('/owner/api/logout',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}',credentials:'same-origin'});if(!response.ok)throw Error('Sign-out failed');location.replace('/'+location.hash);}catch{alert('Could not sign out. Check your connection and try again.');}});}
 if(!isOwner)document.querySelector('#calculator-nav').hidden=true;
 document.addEventListener('click',e=>{if(e.target.closest('[data-public-print]'))window.print();const jump=e.target.closest('[data-hm-scroll]')?.dataset.hmScroll;if(jump&&!isOwner)document.getElementById(jump)?.scrollIntoView({behavior:'smooth'})});
}
