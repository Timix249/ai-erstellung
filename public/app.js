const $=id=>document.getElementById(id);
const storageKey='wolke.chats.v1',requests=new Set();
let settings={city:'Germersheim',answerStyle:'normal',textSize:'normal',autoVoice:false,webSearch:false},weather=null,weatherRequest=null;
let chats=[],activeChatId=null,history=[],busy=false,noticeTimer=null,storageReadable=true,audio=null,audioURL=null,speechEpoch=0;
function notify(text,error=false){clearTimeout(noticeTimer);$('status').textContent=text;$('status').classList.toggle('error',error);$('status').hidden=false;noticeTimer=setTimeout(()=>$('status').hidden=true,error?12000:5000);}
function report(error){notify(error.name==='AbortError'?'Запит зупинено.':error.message||'Не вдалося виконати запит.',error.name!=='AbortError');}
function updateRequests(){$('stopRequest').hidden=!requests.size;$('send').hidden=!!requests.size;}
async function api(path,body,onDelta=null,raw=false){
 const controller=new AbortController();requests.add(controller);updateRequests();
 try{
  const response=await fetch(path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:controller.signal});
  if(response.status===401){location.assign('/login');throw new Error('Уведи PIN, щоб продовжити.');}
  if(!response.ok){let detail;try{detail=await response.json();}catch{}throw new Error(detail?.error||`Помилка сервера (${response.status}). Перевір вхід і з’єднання.`);}
  if(raw)return await response.blob();
  if(!onDelta)return await response.json();
  if(!response.headers.get('content-type')?.includes('application/x-ndjson'))throw new Error('Онови сторінку, щоб отримувати відповіді одразу.');
  const decoder=new TextDecoder();let pending='',answer='',done=false;
  const consume=line=>{if(!line.trim())return;const event=JSON.parse(line);if(event.error)throw new Error(event.error);if(event.delta){answer+=event.delta;onDelta(event.delta);}if(event.done)done=true;};
  const reader=response.body.getReader();
  try{while(true){const {value,done:ended}=await reader.read();if(ended)break;pending+=decoder.decode(value,{stream:true});let pos;while((pos=pending.indexOf('\n'))>=0){consume(pending.slice(0,pos));pending=pending.slice(pos+1);}}}finally{reader.releaseLock();}
  pending+=decoder.decode();if(pending.trim())consume(pending);
  if(!done)throw new Error('З’єднання перервалося. Відповідь може бути неповною.');
  return {answer};
 }catch(error){controller.abort();throw error;}
 finally{requests.delete(controller);updateRequests();}
}
function addMessage(role,text){
 $('welcome')?.remove();const el=document.createElement('article');el.className=`message ${role}`;
 const avatar=document.createElement('div');avatar.className='message-avatar';if(role==='user')avatar.textContent='ТИ';else{const logo=document.createElement('img');logo.src='/logo.svg';logo.alt='';logo.width=30;logo.height=30;avatar.append(logo);}
 const body=document.createElement('div');body.className='message-body';const name=document.createElement('div');name.className='message-name';name.textContent=role==='user'?'Ти':'Wolke';
 const content=document.createElement('div');content.className='message-text';renderText(content,text);body.append(name,content);el.append(avatar,body);$('messages').append(el);
 if(role==='assistant'&&text)addReadButton(el,text);
 $('messages').scrollTop=$('messages').scrollHeight;return el;
}
function addReadButton(el,text){const button=document.createElement('button');button.className='read-button';button.textContent='▷ Озвучити';button.title='Голос Gemini · можливі витрати API. Повторне натискання зупиняє.';button.onclick=()=>{if(audio||requests.size){abortRequests();return;}speak(text);};el.querySelector('.message-body').append(button);}
function freshChat(){return {id:crypto.randomUUID(),title:'Новий чат',messages:[],updated:Date.now()};}
function renderChatList(){
 const list=$('chatList'),select=$('chatSelect');list.replaceChildren();select.replaceChildren();
 for(const chat of [...chats].sort((a,b)=>b.updated-a.updated)){
  const button=document.createElement('button');button.className='chat-list-item';button.textContent=chat.title;button.title=chat.title;button.disabled=busy;button.setAttribute('aria-current',String(chat.id===activeChatId));button.onclick=()=>openChat(chat.id);list.append(button);
  const option=document.createElement('option');option.value=chat.id;option.textContent=chat.title;option.selected=chat.id===activeChatId;select.append(option);
 }select.disabled=busy;
}
function persistChats(){
 if(storageReadable)try{localStorage.setItem(storageKey,JSON.stringify({chats,activeChatId}));}catch{notify('Браузер не зберіг історію. Перевір вільне місце й дозволи.',true);}
 renderChatList();
}
function saveCurrentChat(){const chat=chats.find(c=>c.id===activeChatId);if(!chat)return;chat.messages=history.map(m=>({role:m.role,content:m.content}));chat.title=history.find(m=>m.role==='user')?.content.slice(0,55)||'Новий чат';chat.updated=Date.now();persistChats();}
function openChat(id){if(busy)return;const chat=chats.find(c=>c.id===id);if(!chat)return;abortRequests();activeChatId=id;history=chat.messages.map(m=>({...m}));$('prompt').value='';resizeInput();$('messages').replaceChildren();for(const m of history)addMessage(m.role,m.content);if(!history.length)showWelcome();persistChats();}
function showWelcome(){const el=document.createElement('div');el.id='welcome';el.className='welcome';const icon=document.createElement('div');icon.className='welcome-symbol';icon.setAttribute('aria-hidden','true');const logo=document.createElement('img');logo.src='/logo.svg';logo.alt='';logo.width=88;logo.height=88;icon.append(logo);const title=document.createElement('h1');title.textContent='Чим можу допомогти?';el.append(icon,title);$('messages').append(el);}
function initializeChats(){
 try{const data=JSON.parse(localStorage.getItem(storageKey)||'null');if(data){
  if(!Array.isArray(data.chats)||data.chats.some(c=>typeof c.id!=='string'||typeof c.title!=='string'||!Number.isFinite(c.updated)||!Array.isArray(c.messages)||c.messages.some(m=>!['user','assistant'].includes(m.role)||typeof m.content!=='string'||m.content.length>50000)))throw new Error('invalid storage');
  chats=data.chats;activeChatId=data.activeChatId;
 }}catch{storageReadable=false;notify('Збережені чати недоступні. Попередні дані не перезаписано.',true);}
 if(!chats.length){const chat=freshChat();chats=[chat];activeChatId=chat.id;renderChatList();return;}
 if(!chats.some(c=>c.id===activeChatId))activeChatId=chats[0].id;openChat(activeChatId);
}
function setBusy(value){busy=value;for(const id of ['send','newChat','mobileNewChat','clearChat'])$(id).disabled=value;renderChatList();}
function resizeInput(){const input=$('prompt');input.style.height='auto';input.style.height=Math.min(input.scrollHeight,180)+'px';}
$('prompt').oninput=resizeInput;
$('chatSelect').onchange=e=>openChat(e.target.value);
function newChat(){if(busy)return;const empty=chats.find(c=>!c.messages.length);if(empty){openChat(empty.id);return;}const chat=freshChat();chats.push(chat);openChat(chat.id);}
$('newChat').onclick=newChat;$('mobileNewChat').onclick=newChat;
$('clearChat').onclick=()=>{if(busy||!confirm('Видалити цей чат? Відновити його буде неможливо.'))return;chats=chats.filter(c=>c.id!==activeChatId);if(!chats.length)chats.push(freshChat());openChat(chats[0].id);};
$('chatForm').onsubmit=async e=>{
 e.preventDefault();if(busy)return;const text=$('prompt').value.trim();if(!text)return;
 abortRequests();const outgoing=[...history.slice(-28),{role:'user',content:text}];addMessage('user',text);$('prompt').value='';resizeInput();setBusy(true);
 const pending=document.createElement('p');pending.className='pending';pending.textContent='Wolke відповідає…';$('messages').append(pending);
 let reply=null,replyText='',frame=null;
 const paint=()=>{frame=null;if(!reply)return;const list=$('messages'),atBottom=list.scrollHeight-list.scrollTop-list.clientHeight<180;renderText(reply.querySelector('.message-text'),replyText);if(atBottom)list.scrollTop=list.scrollHeight;};
 try{
  const data=await api('/api/chat',{messages:outgoing,stream:true,weatherCity:settings.city,answerStyle:settings.answerStyle,webSearch:settings.webSearch},delta=>{
   pending.remove();if(!reply){reply=addMessage('assistant','');reply.setAttribute('aria-busy','true');}replyText+=delta;if(frame===null)frame=requestAnimationFrame(paint);
  });
  if(frame!==null)cancelAnimationFrame(frame);paint();reply?.setAttribute('aria-busy','false');
  history.push({role:'user',content:text},{role:'assistant',content:data.answer});saveCurrentChat();
  if(reply)addReadButton(reply,data.answer);if(settings.autoVoice)void speak(data.answer);
 }catch(error){
  if(frame!==null)cancelAnimationFrame(frame);paint();reply?.setAttribute('aria-busy','false');report(error);
  if(!$('prompt').value)$('prompt').value=text;
  const note=document.createElement('p');note.className='message-incomplete';note.textContent=reply?'Відповідь перервана й не збережена. Надішли запит ще раз.':'Відповідь не отримано. Спробуй ще раз.';
  (reply?.querySelector('.message-body')||$('messages')).append(note);
 }finally{pending.remove();setBusy(false);resizeInput();if(!window.matchMedia('(pointer: coarse)').matches)$('prompt').focus();}
};
$('prompt').addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.isComposing&&!window.matchMedia('(pointer: coarse)').matches){e.preventDefault();$('chatForm').requestSubmit();}});
function stopAudio(){if(audio){audio.pause();audio.src='';audio=null;}if(audioURL){URL.revokeObjectURL(audioURL);audioURL=null;}}
async function speak(text){const epoch=++speechEpoch;stopAudio();notify('Готуємо голос…');try{const blob=await api('/api/speech',{text:text.slice(0,4000)},null,true);if(epoch!==speechEpoch)return;audioURL=URL.createObjectURL(blob);audio=new Audio(audioURL);audio.onended=stopAudio;audio.onerror=()=>{stopAudio();notify('Не вдалося відтворити аудіо.',true);};try{await audio.play();}catch{stopAudio();notify('Браузер не дозволив відтворення. Натисни «Озвучити» ще раз.',true);}}catch(error){report(error);}}
function abortRequests(){for(const controller of requests)controller.abort();speechEpoch++;stopAudio();}
$('stopRequest').onclick=abortRequests;
$('privacyButton').onclick=$('mobilePrivacy').onclick=()=>$('privacyDialog').showModal();
window.addEventListener('pagehide',abortRequests);
initializeChats();
fetch('/api/health').then(async r=>{if(r.status===401){location.assign('/login');return;}if(!r.ok)throw new Error('Перевір вхід або з’єднання.');const data=await r.json();$('connection').textContent=data.configured?'Готова допомогти':'Немає ключа API';$('connection').classList.toggle('warning',!data.configured);}).catch(error=>{$('connection').textContent='Немає з’єднання';$('connection').classList.add('warning');report(error);});

async function logout(){abortRequests();try{const response=await fetch('/auth/logout',{method:'POST'});if(!response.ok)throw new Error();location.assign('/login');}catch{notify('Не вдалося вийти. Спробуй ще раз.',true);}}
$('logout').onclick=$('mobileLogout').onclick=logout;

function loadSettings(){try{const stored=JSON.parse(localStorage.getItem('wolke.settings.v1')||'null');if(stored){if(typeof stored.city==='string'&&stored.city.trim().length>=2&&stored.city.length<=100)settings.city=stored.city.trim();if(['short','normal','detailed'].includes(stored.answerStyle))settings.answerStyle=stored.answerStyle;if(['normal','large'].includes(stored.textSize))settings.textSize=stored.textSize;settings.autoVoice=stored.autoVoice===true;settings.webSearch=stored.webSearch===true;}}catch{}document.documentElement.dataset.textSize=settings.textSize;}
function openSettings(){const form=$('settingsForm');form.elements.city.value=settings.city;$('answerStyle').value=settings.answerStyle;$('textSize').value=settings.textSize;$('autoVoice').checked=settings.autoVoice;$('webSearch').checked=settings.webSearch;$('settingsError').hidden=true;$('settingsDialog').showModal();}
$('settingsButton').onclick=$('weatherSettings').onclick=openSettings;
$('closeSettings').onclick=()=>$('settingsDialog').close();
function weatherSymbol(code,isDay=true){if(code===0)return isDay?'☀':'☾';if(code<=3)return '☁';if(code<=48)return '≋';if(code>=95)return 'ϟ';if((code>=71&&code<=77)||code===85||code===86)return '❄';return '☂';}
function showWeather(data){weather=data;$('weatherSettings').textContent=data.location.name;$('weatherTemperature').textContent=Math.round(data.current.temperature)+'°';$('weatherIcon').textContent=weatherSymbol(data.current.code,data.current.isDay);$('weatherDescription').textContent=data.current.description;const details=[];if(data.current.apparentTemperature!==null)details.push('Відчувається як '+Math.round(data.current.apparentTemperature)+'°');if(data.current.wind!==null)details.push('Вітер '+Math.round(data.current.wind)+' км/год');$('weatherDetails').textContent=details.join(' · ');const today=data.days[0];$('weatherRange').textContent=today&&today.min!==null&&today.max!==null?'Мін. '+Math.round(today.min)+'° · Макс. '+Math.round(today.max)+'°':'';$('weatherCard').classList.remove('weather-error');}
async function requestWeather(city,signal){
 try{const response=await fetch('/api/weather?'+new URLSearchParams({city}),{signal});if(response.status===401){location.assign('/login');throw Object.assign(new Error('Уведи PIN.'),{noFallback:true});}const data=await response.json();if(!response.ok)throw Object.assign(new Error(data.error||'Не вдалося отримати погоду.'),{noFallback:response.status===400||response.status===404});return data;}
 catch(error){if(error.name==='AbortError'||error.noFallback)throw error;
 const {getWeather}=await import('/weather-client.js');const data=await getWeather(city);if(signal?.aborted)throw new DOMException('Aborted','AbortError');return data;
 }
}
async function refreshWeather(){weatherRequest?.abort();const controller=new AbortController();weatherRequest=controller;$('refreshWeather').disabled=true;try{const data=await requestWeather(settings.city,controller.signal);if(!controller.signal.aborted)showWeather(data);}catch(error){if(error.name!=='AbortError'){$('weatherCard').classList.add('weather-error');$('weatherDescription').textContent=weather?'Не вдалося оновити погоду':'Погода тимчасово недоступна';$('weatherDetails').textContent=weather?'Показано попередні дані. Натисни ↻.':error.message;}}finally{if(weatherRequest===controller)$('refreshWeather').disabled=false;}}
$('refreshWeather').onclick=refreshWeather;
$('askWeather').onclick=()=>{if(busy)return;$('prompt').value='Яка погода в '+settings.city+' сьогодні та завтра?';resizeInput();$('chatForm').requestSubmit();};
$('settingsForm').onsubmit=async event=>{event.preventDefault();const city=$('weatherCity').value.trim();if(city.length<2)return;const button=$('saveSettings');button.disabled=true;$('settingsError').hidden=true;try{let data=weather;if(city!==settings.city)data=await requestWeather(city);const updated={city,answerStyle:$('answerStyle').value,textSize:$('textSize').value,autoVoice:$('autoVoice').checked,webSearch:$('webSearch').checked};localStorage.setItem('wolke.settings.v1',JSON.stringify(updated));settings=updated;document.documentElement.dataset.textSize=settings.textSize;weatherRequest?.abort();if(data)showWeather(data);else void refreshWeather();$('settingsDialog').close();notify('Налаштування збережено.');}catch(error){$('settingsError').textContent=error.message||'Не вдалося зберегти налаштування.';$('settingsError').hidden=false;}finally{button.disabled=false;}};
loadSettings();refreshWeather();
setInterval(()=>{if(!document.hidden)void refreshWeather();},15*60*1000);
window.addEventListener('pagehide',()=>weatherRequest?.abort());

function renderText(el,text){el.replaceChildren();let start=0;for(const match of text.matchAll(/https:\/\/[^\s<>]+/g)){el.append(document.createTextNode(text.slice(start,match.index)));const link=document.createElement('a');link.href=match[0];link.textContent=match[0];link.target='_blank';link.rel='noopener noreferrer';el.append(link);start=match.index+match[0].length;}el.append(document.createTextNode(text.slice(start)));}
