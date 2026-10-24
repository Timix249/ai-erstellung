const $=id=>document.getElementById(id);
const storageKey='wolke.chats.v1',requests=new Set();
let chats=[],activeChatId=null,history=[],busy=false,noticeTimer=null,storageReadable=true,audio=null,audioURL=null,speechEpoch=0;
function notify(text,error=false){clearTimeout(noticeTimer);$('status').textContent=text;$('status').classList.toggle('error',error);$('status').hidden=false;noticeTimer=setTimeout(()=>$('status').hidden=true,error?12000:5000);}
function report(error){notify(error.name==='AbortError'?'Запит зупинено.':error.message||'Не вдалося виконати запит.',error.name!=='AbortError');}
function updateRequests(){$('stopRequest').hidden=!requests.size;$('send').hidden=!!requests.size;}
async function api(path,body,onDelta=null,raw=false){
 const controller=new AbortController();requests.add(controller);updateRequests();
 try{
  const response=await fetch(path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:controller.signal});
  if(!response.ok){let detail;try{detail=await response.json();}catch{}throw new Error(detail?.error||`Помилка сервера (${response.status}). Перевір вхід і з’єднання.`);}
  if(raw)return await response.blob();
  if(!onDelta)return await response.json();
  if(!response.headers.get('content-type')?.includes('application/x-ndjson'))throw new Error('Онови сторінку, щоб отримувати відповіді одразу.');
  const decoder=new TextDecoder();let pending='',answer='',done=false;
  const consume=line=>{if(!line.trim())return;const event=JSON.parse(line);if(event.error)throw new Error(event.error);if(event.delta){answer+=event.delta;onDelta(event.delta);}if(event.done)done=true;};
  for await(const chunk of response.body){pending+=decoder.decode(chunk,{stream:true});let pos;while((pos=pending.indexOf('\n'))>=0){consume(pending.slice(0,pos));pending=pending.slice(pos+1);}}
  pending+=decoder.decode();if(pending.trim())consume(pending);
  if(!done)throw new Error('З’єднання перервалося. Відповідь може бути неповною.');
  return {answer};
 }catch(error){controller.abort();throw error;}
 finally{requests.delete(controller);updateRequests();}
}
function addMessage(role,text){
 $('welcome')?.remove();const el=document.createElement('article');el.className=`message ${role}`;
 const avatar=document.createElement('div');avatar.className='message-avatar';avatar.textContent=role==='user'?'ТИ':'☁';
 const body=document.createElement('div');body.className='message-body';const name=document.createElement('div');name.className='message-name';name.textContent=role==='user'?'Ти':'Wolke';
 const content=document.createElement('div');content.className='message-text';content.textContent=text;body.append(name,content);el.append(avatar,body);$('messages').append(el);
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
function showWelcome(){const el=document.createElement('div');el.id='welcome';el.className='welcome';const icon=document.createElement('div');icon.className='welcome-symbol';icon.setAttribute('aria-hidden','true');icon.textContent='☁';const title=document.createElement('h1');title.textContent='Чим можу допомогти?';el.append(icon,title);$('messages').append(el);}
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
 const paint=()=>{frame=null;if(!reply)return;const list=$('messages'),atBottom=list.scrollHeight-list.scrollTop-list.clientHeight<180;reply.querySelector('.message-text').textContent=replyText;if(atBottom)list.scrollTop=list.scrollHeight;};
 try{
  const data=await api('/api/chat',{messages:outgoing,stream:true},delta=>{
   pending.remove();if(!reply){reply=addMessage('assistant','');reply.setAttribute('aria-busy','true');}replyText+=delta;if(frame===null)frame=requestAnimationFrame(paint);
  });
  if(frame!==null)cancelAnimationFrame(frame);paint();reply?.setAttribute('aria-busy','false');
  history.push({role:'user',content:text},{role:'assistant',content:data.answer});saveCurrentChat();
  if(reply)addReadButton(reply,data.answer);
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
fetch('/api/health').then(async r=>{if(!r.ok)throw new Error('Перевір вхід або з’єднання.');const data=await r.json();$('connection').textContent=data.configured?'Готова допомогти':'Немає ключа API';$('connection').classList.toggle('warning',!data.configured);}).catch(error=>{$('connection').textContent='Немає з’єднання';$('connection').classList.add('warning');report(error);});
