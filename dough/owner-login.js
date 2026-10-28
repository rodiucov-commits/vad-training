const $=id=>document.getElementById(id),setup=location.pathname==='/owner/setup',changing=location.pathname==='/owner/account';
const token=setup?new URLSearchParams(location.hash.slice(1)).get('token'):null;
const destination='/owner'+(!setup&&location.hash.startsWith('#')?location.hash:'');
if(setup||changing){
 $('title').textContent=setup?'Choose your password':'Change your password';document.title=$('title').textContent+' · Dough & Co.';
 $('intro').textContent=setup?'Set a password for your Owner account. Your recipes and saved notes stay as they are.':'Choose a new password for your Owner account. Other signed-in sessions will be signed out.';
 $('password-label').textContent='New password';$('password').autocomplete='new-password';$('password').minLength=12;
 $('confirm-row').hidden=false;$('confirm').required=true;$('password-help').hidden=false;$('recovery').hidden=true;$('submit').textContent=setup?'Set password & sign in':'Save new password';$('email').readOnly=true;
 if(changing){$('old-password-row').hidden=false;$('old-password').required=true;}
 if(setup&&!/^[a-f0-9]{64}$/.test(token||'')){$('status').textContent='Open your complete private setup link to choose a password.';$('submit').disabled=true;}
}
$('auth-form').addEventListener('submit',async event=>{
 event.preventDefault();const button=$('submit');$('status').textContent='';
 if((setup||changing)&&$('password').value!==$('confirm').value){$('status').textContent='The new passwords do not match.';$('confirm').focus();return;}
 button.disabled=true;
 try{
  const body={email:$('email').value,password:$('password').value,...(setup?{token}:{}),...(changing?{oldPassword:$('old-password').value,newPassword:$('password').value}:{})};
  const response=await fetch('/owner/api/'+(setup?'setup':changing?'change-password':'login'),{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',body:JSON.stringify(body),cache:'no-store'});
  const data=await response.json();if(!response.ok)throw Error(data.error||'Unable to sign in. Please try again.');
  $('auth-form').reset();if(setup)history.replaceState(null,'','/owner/setup');location.replace(destination);
 }catch(error){$('status').textContent=error instanceof TypeError?'Cannot connect. Check your connection and try again.':error.message;button.disabled=false;}
});
