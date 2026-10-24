const $=id=>document.getElementById(id);
let history=[],image=null,stream=null,streamKind=null,recorder=null,micStream=null,recordTimer=null,recordStart=0,recordTick=null,mediaEpoch=0;
let audio=null,audioURL=null,noticeTimer=null,busy=false;
const requests=new Set();
function notify(text,error=false){clearTimeout(noticeTimer);$('status').textContent=text;$('status').classList.toggle('error',error);$('status').hidden=false;noticeTimer=setTimeout(()=>$('status').hidden=true,error?16000:7000);}
function updateRequests(){$('stopRequest').hidden=requests.size===0;}
async function api(path,body,raw=false){const c=new AbortController();requests.add(c);updateRequests();try{
  const response=await fetch(path,{method:'POST',headers:body instanceof FormData?{}:{'Content-Type':'application/json'},body:body instanceof FormData?body:JSON.stringify(body),signal:c.signal});
  if(!response.ok){let detail;try{detail=await response.json();}catch{}throw new Error(detail?.error||`Serverfehler (${response.status}). Anmeldung oder Verbindung prüfen.`);}
  return raw?await response.blob():await response.json();
}finally{requests.delete(c);updateRequests();}}
function report(e){notify(e.name==='AbortError'?'Übertragung abgebrochen. Bereits gesendete Daten können nicht zurückgeholt werden.':e.message||'Unerwarteter Fehler.',e.name!=='AbortError');}
function addMessage(role,text,photo){$('welcome')?.remove();const el=document.createElement('article');el.className=`message ${role}`;
 const avatar=document.createElement('div');avatar.className='message-avatar';avatar.textContent=role==='user'?'DU':'✳';
 const body=document.createElement('div');body.className='message-body';const name=document.createElement('div');name.className='message-name';name.textContent=role==='user'?'Du':'Wolke';
 const content=document.createElement('div');content.className='message-text';content.textContent=text;body.append(name,content);
 if(photo){const img=document.createElement('img');img.src=photo;img.alt='Für diese Nachricht gesendetes Einzelbild';img.className='message-image';body.append(img);}
 if(role==='assistant'){const read=document.createElement('button');read.className='read-button';read.textContent='▷ Vorlesen · API-Kosten';read.onclick=()=>speak(text);body.append(read);}
 el.append(avatar,body);$('messages').append(el);$('messages').scrollTop=$('messages').scrollHeight;return el;
}
function setBusy(value){busy=value;$('send').disabled=value;$('prompt').disabled=value;$('newChat').disabled=value;$('clearChat').disabled=value;}
function clearAttachment(){image=null;$('attachment').hidden=true;}
$('removeAttachment').onclick=clearAttachment;
$('chatForm').onsubmit=async e=>{e.preventDefault();if(busy)return;const text=$('prompt').value.trim()||(image?'Beschreibe bitte, was du auf diesem Bild siehst.':'');if(!text)return;
 const photo=image;const outgoing=[...history.slice(-28),{role:'user',content:text}];addMessage('user',text,photo);$('prompt').value='';clearAttachment();setBusy(true);
 const pending=document.createElement('p');pending.className='message-text';pending.textContent='Wolke denkt nach …';$('messages').append(pending);
 try{const data=await api('/api/chat',{messages:outgoing,...(photo?{image:photo}:{})});history=[...outgoing,{role:'assistant',content:data.answer}];addMessage('assistant',data.answer);if($('autoSpeak').checked)void speak(data.answer);}
 catch(err){report(err);$('prompt').value=text;if(photo){image=photo;$('attachmentLabel').textContent='Bild für erneuten Versuch angehängt';$('attachment').hidden=false;}const failed=document.createElement('p');failed.className='message-text';failed.textContent='Diese Nachricht wurde nicht beantwortet. Du kannst sie unten erneut senden.';$('messages').append(failed);}
 finally{pending.remove();setBusy(false);$('prompt').focus();}
};
$('prompt').addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.isComposing){e.preventDefault();$('chatForm').requestSubmit();}});
document.querySelectorAll('[data-prompt]').forEach(button=>button.onclick=()=>{$('prompt').value=button.dataset.prompt;$('prompt').focus();});
function resetChat(){if(busy)return;history=[];clearAttachment();$('messages').replaceChildren();$('prompt').value='';stopAudio();addMessage('assistant','Ein frischer Anfang. Wie kann ich dir helfen?');}
$('newChat').onclick=resetChat;$('clearChat').onclick=resetChat;
function mediaError(e){if(e.name==='NotAllowedError')return 'Freigabe wurde abgelehnt oder abgebrochen. Du kannst sie über das Schlosssymbol im Browser erneut erlauben.';if(e.name==='NotFoundError')return 'Kein passendes Mikrofon bzw. keine Kamera gefunden.';if(e.name==='NotReadableError')return 'Das Gerät ist nicht verfügbar. Prüfe, ob eine andere Anwendung es belegt.';return e.message||'Freigabe nicht möglich. Bitte einen aktuellen Browser mit HTTPS verwenden.';}
function requireSecure(){if(!window.isSecureContext)throw new Error('Mikrofon, Kamera und Bildschirm benötigen HTTPS (oder localhost für lokale Entwicklung).');if(!navigator.mediaDevices)throw new Error('Dieser Browser unterstützt keine Medienfreigaben. Verwende einen aktuellen Chrome, Edge, Firefox oder Safari.');}
function stopVisual(){if(stream)stream.getTracks().forEach(t=>t.stop());stream=null;streamKind=null;$('preview').srcObject=null;$('preview').hidden=true;$('previewPlaceholder').hidden=false;$('capture').disabled=true;$('previewBadge').textContent='● Keine Freigabe aktiv';for(const kind of ['camera','screen']){$(kind).classList.remove('active');$(kind).setAttribute('aria-pressed','false');} $('cameraStatus').textContent='Ausgeschaltet';$('screenStatus').textContent='Nicht freigegeben';}
async function toggleVisual(kind){if(streamKind===kind){mediaEpoch++;stopVisual();return;}const epoch=++mediaEpoch;$(kind).disabled=true;
 try{requireSecure();if(kind==='screen'&&!navigator.mediaDevices.getDisplayMedia)throw new Error('Bildschirmfreigabe wird hier nicht unterstützt. Verwende einen Desktop-Browser.');
 const next=kind==='camera'?await navigator.mediaDevices.getUserMedia({video:{width:{ideal:1280},height:{ideal:720}},audio:false}):await navigator.mediaDevices.getDisplayMedia({video:true,audio:false});
 if(epoch!==mediaEpoch){next.getTracks().forEach(t=>t.stop());return;}stopVisual();stream=next;streamKind=kind;next.getVideoTracks()[0].onended=()=>{if(stream===next)stopVisual();};$('preview').srcObject=next;$('preview').hidden=false;$('previewPlaceholder').hidden=true;$('capture').disabled=false;$(kind).classList.add('active');$(kind).setAttribute('aria-pressed','true');$(kind+'Status').textContent='Aktiv · nur lokale Vorschau';$('previewBadge').textContent=kind==='camera'?'● Kamera aktiv · lokal':'● Bildschirm aktiv · lokal';await $('preview').play();notify('Freigabe aktiv. Nur ausdrücklich aufgenommene Einzelbilder werden mit einer Nachricht übertragen.');
 }catch(e){notify(mediaError(e),true);}finally{$(kind).disabled=false;}}
$('camera').onclick=()=>toggleVisual('camera');$('screen').onclick=()=>toggleVisual('screen');
$('capture').onclick=()=>{const v=$('preview');if(!stream||!v.videoWidth)return notify('Die Vorschau lädt noch. Bitte kurz warten.',true);const canvas=document.createElement('canvas'),ratio=Math.min(1,1280/v.videoWidth,1280/v.videoHeight);canvas.width=Math.round(v.videoWidth*ratio);canvas.height=Math.round(v.videoHeight*ratio);canvas.getContext('2d').drawImage(v,0,0,canvas.width,canvas.height);image=canvas.toDataURL('image/jpeg',.82);$('attachmentLabel').textContent=(streamKind==='camera'?'Kamerabild':'Bildschirmbild')+' angehängt · wird beim Senden übertragen';$('attachment').hidden=false;notify('Einzelbild angehängt. Ergänze eine Frage und sende die Nachricht.');};
function resetMic(){clearTimeout(recordTimer);clearInterval(recordTick);micStream?.getTracks().forEach(t=>t.stop());micStream=null;$('mic').classList.remove('recording');$('mic').setAttribute('aria-pressed','false');$('micStatus').textContent='Tippen zum Aufnehmen';}
function stopMic(discard=false){if(recorder){if(discard)recorder.discard=true;if(recorder.state!=='inactive')recorder.stop();}resetMic();}
$('mic').onclick=async()=>{if(recorder&&recorder.state==='recording'){stopMic();return;}if(busy)return notify('Bitte warte, bis die aktuelle Nachricht beantwortet ist.');const epoch=mediaEpoch;$('mic').disabled=true;
 try{requireSecure();if(!window.MediaRecorder)throw new Error('Audioaufnahmen werden von diesem Browser nicht unterstützt.');const next=await navigator.mediaDevices.getUserMedia({audio:true,video:false});if(epoch!==mediaEpoch){next.getTracks().forEach(t=>t.stop());return;}micStream=next;
 const mime=['audio/webm','audio/mp4','audio/ogg'].find(t=>MediaRecorder.isTypeSupported(t));if(!mime)throw new Error('Kein unterstütztes Aufnahmeformat verfügbar.');const current=new MediaRecorder(next,{mimeType:mime});recorder=current;const chunks=[];let size=0;
 current.ondataavailable=e=>{if(e.data.size){chunks.push(e.data);size+=e.data.size;if(size>11*1024*1024){current.discard=true;if(current.state!=='inactive')current.stop();resetMic();notify('Aufnahme zu groß. Bitte kürzer aufnehmen.',true);}}};
 current.onerror=()=>{current.discard=true;resetMic();notify('Audioaufnahme fehlgeschlagen. Bitte erneut versuchen.',true);};
 current.onstop=async()=>{if(recorder===current)recorder=null;resetMic();if(current.discard)return;const blob=new Blob(chunks,{type:mime});if(!blob.size)return notify('Die Aufnahme war leer. Bitte erneut versuchen.',true);const data=new FormData();data.append('audio',blob,'aufnahme.'+(mime==='audio/mp4'?'mp4':mime==='audio/ogg'?'ogg':'webm'));$('mic').disabled=true;$('micStatus').textContent='Audio wird übertragen …';
 try{const result=await api('/api/transcribe',data);if(result.text?.trim()){$('prompt').value=[$('prompt').value.trim(),result.text.trim()].filter(Boolean).join(' ');notify('Sprache erkannt. Prüfe den Text und sende deine Nachricht.');}else notify('Keine Sprache erkannt. Bitte deutlicher sprechen.',true);}catch(e){report(e);}finally{$('mic').disabled=false;$('micStatus').textContent='Tippen zum Aufnehmen';}};
 current.start(1000);recordStart=Date.now();$('mic').classList.add('recording');$('mic').setAttribute('aria-pressed','true');const tick=()=>{$('micStatus').textContent=`● Aufnahme läuft · ${Math.floor((Date.now()-recordStart)/1000)} / 60 s · Tippen zum Senden`;};tick();recordTick=setInterval(tick,1000);recordTimer=setTimeout(()=>stopMic(),60000);
 }catch(e){resetMic();notify(mediaError(e),true);}finally{$('mic').disabled=false;}};
function stopAudio(){if(audio){audio.pause();audio.src='';audio=null;}if(audioURL){URL.revokeObjectURL(audioURL);audioURL=null;}}
let speechEpoch=0;
async function speak(text){const epoch=++speechEpoch;stopAudio();notify('KI-Stimme wird erzeugt und übertragen …');try{const blob=await api('/api/speech',{text:text.slice(0,4000)},true);if(epoch!==speechEpoch)return;audioURL=URL.createObjectURL(blob);audio=new Audio(audioURL);audio.onended=stopAudio;try{await audio.play();}catch{notify('Browser blockiert automatische Wiedergabe. Klicke bei der Antwort auf „Vorlesen“.',true);stopAudio();}}catch(e){report(e);}}
function abortRequests(){for(const c of requests)c.abort();speechEpoch++;stopAudio();}
$('stopRequest').onclick=abortRequests;
$('stopAll').onclick=()=>{mediaEpoch++;stopVisual();stopMic(true);abortRequests();clearAttachment();notify('Alle Freigaben, laufenden Übertragungen und die Wiedergabe wurden gestoppt.');};
$('autoSpeak').onchange=()=>{if(!$('autoSpeak').checked){speechEpoch++;stopAudio();}};
$('privacyButton').onclick=()=>$('privacyDialog').showModal();
window.addEventListener('pagehide',()=>{mediaEpoch++;stopVisual();stopMic(true);abortRequests();});
for(const kind of ['mic','camera','screen'])$(kind).setAttribute('aria-pressed','false');
fetch('/api/health').then(async r=>{if(!r.ok)throw new Error('Server nicht bereit oder Anmeldung fehlt.');const data=await r.json();$('connection').textContent=data.configured?'● Bereit für dich':'● API-Schlüssel fehlt';$('connection').classList.toggle('warning',!data.configured);if(!data.configured)notify('Zum Aktivieren GEMINI_API_KEY auf dem Server eintragen. Kamera und Mikrofon kannst du bereits freigeben.',true);}).catch(e=>{$('connection').textContent='● Server nicht erreichbar';$('connection').classList.add('warning');report(e);});
