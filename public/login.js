import {installLanguage} from './i18n.js';
let preferences={};try{preferences=JSON.parse(localStorage.getItem('wolke.settings.v1')||'{}')||{};}catch{}
const language=document.getElementById('loginLanguage'),button=document.getElementById('googleLogin'),label=document.getElementById('googleLabel'),error=document.getElementById('cloudLoginError'),status=document.getElementById('loginStatus'),retry=document.getElementById('retryLogin');
const setLanguage=installLanguage(preferences.language==='de'?'de':'uk');language.value=document.documentElement.lang;
language.onchange=()=>{preferences.language=language.value;try{localStorage.setItem('wolke.settings.v1',JSON.stringify(preferences));}catch{}setLanguage(preferences.language);};
let signIn;
function showError(message){error.textContent=message;error.hidden=false;status.textContent='';}
async function setup(){
 error.hidden=true;retry.hidden=true;button.disabled=true;status.textContent='Готуємо вхід…';
 try{const response=await fetch('/auth/config',{signal:AbortSignal.timeout(20000)});if(!response.ok)throw new Error();const config=await response.json();if(!config.google){showError('Google-вхід ще не налаштовано.');retry.hidden=false;return;}
  const {prepareGoogle,googleLogin}=await import('./firebase-login.js');await prepareGoogle(config.firebase);signIn=googleLogin;button.disabled=false;status.textContent='';
 }catch{showError('Не вдалося підготувати вхід. Перевір з’єднання та спробуй ще раз.');retry.hidden=false;}
}
retry.onclick=setup;
button.onclick=async()=>{
 if(!signIn||button.disabled)return;button.disabled=true;button.setAttribute('aria-busy','true');error.hidden=true;label.textContent='Входимо…';status.textContent='Продовж у вікні Google.';
 try{await signIn();status.textContent='Готово! Відкриваємо Wolke…';}
 catch(e){const messages={'auth/popup-closed-by-user':'Вхід скасовано. Спробуй ще раз.','auth/cancelled-popup-request':'Вхід скасовано. Спробуй ще раз.','auth/popup-blocked':'Дозволь спливне вікно Google у браузері та спробуй ще раз.','auth/unauthorized-domain':'Домен сайту ще не дозволено у Firebase.','auth/network-request-failed':'Перевір з’єднання та спробуй ще раз.'};showError(messages[e.code]||e.message||'Не вдалося ввійти.');button.disabled=false;button.removeAttribute('aria-busy');label.textContent='Увійти через Google';}
};
setup();
