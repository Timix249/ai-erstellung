import {test, before, after} from 'node:test';
import assert from 'node:assert/strict';
import {app} from '../server.js';
const nativeFetch=globalThis.fetch;
let server,base,upstream,weatherUpstream;
before(async()=>{delete process.env.APP_PASSWORD;delete process.env.GEMINI_API_KEY;delete process.env.NODE_ENV;server=app.listen(0,'127.0.0.1');await new Promise((resolve,reject)=>{server.once('listening',resolve);server.once('error',reject);});base=`http://127.0.0.1:${server.address().port}`;globalThis.fetch=(url,options)=>String(url).startsWith('https://generativelanguage.googleapis.com/')?upstream(url,options):/https:\/\/(?:geocoding-api|api)\.open-meteo\.com\//.test(String(url))?weatherUpstream(url,options):nativeFetch(url,options);});
after(()=>{globalThis.fetch=nativeFetch;server.close();});
const post=(path,body,extra={})=>nativeFetch(base+path,{method:'POST',headers:{'Content-Type':'application/json',...extra},body:JSON.stringify(body)});
test('Frontend wird mit Sicherheitsheadern ausgeliefert',async()=>{const r=await nativeFetch(base);assert.equal(r.status,200);assert.match(await r.text(),/Чим можу допомогти/);assert.match(r.headers.get('content-security-policy'),/frame-ancestors 'none'/);});
test('Fehlender Schlüssel wird verständlich gemeldet',async()=>{assert.equal((await(await nativeFetch(base+'/api/health')).json()).configured,false);const r=await post('/api/chat',{messages:[{role:'user',content:'Hallo'}]});assert.equal(r.status,503);assert.match((await r.json()).error,/GEMINI_API_KEY/);});
test('Fremde Origin und ungültige Nachrichten werden abgelehnt',async()=>{assert.equal((await post('/api/chat',{messages:[]},{Origin:'https://fremd.example'})).status,403);assert.equal((await post('/api/chat',{messages:[{role:'system',content:'X'}]})).status,400);assert.equal((await post('/api/chat',{messages:[{role:'user',content:'X'}],image:'https://example.com/a.jpg'})).status,400);});
test('Chat überträgt Text und Bild korrekt, ohne Schlüssel auszugeben',async()=>{process.env.GEMINI_API_KEY='test-key';upstream=async(url,options)=>{assert.equal(options.headers['x-goog-api-key'],'test-key');assert.ok(!url.includes('test-key'));const body=JSON.parse(options.body);assert.ok(body.systemInstruction.parts[0].text.includes('українською'));assert.equal(body.contents[0].parts[1].inlineData.data,'YQ==');assert.equal(body.contents[0].parts[1].inlineData.mimeType,'image/jpeg');return Response.json({candidates:[{content:{parts:[{text:'Das ist ein Gegenstand.'}]}}]});};const r=await post('/api/chat',{messages:[{role:'user',content:'Was ist das?'}],image:'data:image/jpeg;base64,YQ=='});assert.equal(r.status,200);assert.deepEqual(await r.json(),{answer:'Das ist ein Gegenstand.'});});
test('Transkription überträgt Inline-Audio an Gemini und liefert deutschen Text',async()=>{upstream=async(url,options)=>{assert.match(url,/gemini-3.1-flash-lite:generateContent$/);const body=JSON.parse(options.body);const part=body.contents[0].parts[1].inlineData;assert.equal(part.mimeType,'audio/webm');assert.equal(Buffer.from(part.data,'base64').toString(),'audio-test');return Response.json({candidates:[{content:{parts:[{text:'Guten Morgen'}]}}]});};const form=new FormData();form.append('audio',new Blob(['audio-test'],{type:'audio/webm'}),'test.webm');const r=await nativeFetch(base+'/api/transcribe',{method:'POST',body:form});assert.equal(r.status,200);assert.equal((await r.json()).text,'Guten Morgen');});
test('Sprachausgabe liefert Audio und prüft Textlänge',async()=>{upstream=async(url,options)=>{assert.match(url,/gemini-3.8-flash-tts:generateContent$/);const body=JSON.parse(options.body);assert.equal(body.contents[0].parts[0].text,'Hallo');assert.deepEqual(body.generationConfig.responseModalities,['AUDIO']);return Response.json({candidates:[{content:{parts:[{inlineData:{mimeType:'audio/L16;codec=pcm;rate=24000',data:Buffer.from([0,0,1,0]).toString('base64')}}]}}]});};const r=await post('/api/speech',{text:'Hallo'});assert.equal(r.headers.get('content-type'),'audio/wav');const wav=Buffer.from(await r.arrayBuffer());assert.equal(wav.toString('ascii',0,4),'RIFF');assert.equal(wav.readUInt32LE(24),24000);assert.equal(wav.readUInt32LE(40),4);assert.deepEqual(wav.subarray(44),Buffer.from([0,0,1,0]));assert.equal((await post('/api/speech',{text:'a'.repeat(4001)})).status,400);});
test('Gemini-Limit und ungültiger Schlüssel haben klare Fehler',async()=>{for(const [code,status,pattern] of [[429,429,/квоту/],[401,502,/відхилено/]]){upstream=async()=>new Response('{}',{status:code});const r=await post('/api/chat',{messages:[{role:'user',content:'Hallo'}]});assert.equal(r.status,status);assert.match((await r.json()).error,pattern);}});
test('Eigenes PIN-Formular ersetzt Basic Auth und schützt API mit Sitzungscookie',async()=>{
 process.env.NODE_ENV='production';
 try{
  assert.equal((await nativeFetch(base+'/api/health')).status,503);
  process.env.APP_PASSWORD='test-passwort';
  const root=await nativeFetch(base,{redirect:'manual'});assert.equal(root.status,302);assert.equal(root.headers.get('location'),'/login');assert.equal(root.headers.get('www-authenticate'),null);
  const login=await nativeFetch(base+'/login');assert.equal(login.status,200);const html=await login.text();assert.match(html,/>PIN:</);assert.ok(!html.includes('name="username"'));
  assert.equal((await nativeFetch(base+'/api/health')).status,401);
  const wrong=await post('/auth/login',{pin:'falsch'});assert.equal(wrong.status,401);assert.equal(wrong.headers.get('set-cookie'),null);assert.equal(wrong.headers.get('www-authenticate'),null);
  assert.equal((await post('/auth/login',{pin:'test-passwort'},{Origin:'https://fremd.example'})).status,403);
  const success=await post('/auth/login',{pin:'test-passwort'});assert.equal(success.status,200);const cookie=success.headers.get('set-cookie');assert.match(cookie,/HttpOnly/);assert.match(cookie,/Secure/);assert.match(cookie,/SameSite=Strict/);assert.ok(!cookie.includes('test-passwort'));const token=cookie.split(';')[0];
  assert.equal((await nativeFetch(base+'/api/health',{headers:{Cookie:token}})).status,200);
  assert.equal((await nativeFetch(base+'/api/health',{headers:{Cookie:'wolke_session=erfunden'}})).status,401);
  process.env.APP_PASSWORD='neuer-pin';assert.equal((await nativeFetch(base+'/api/health',{headers:{Cookie:token}})).status,401);
  const again=await post('/auth/login',{pin:'neuer-pin'});const token2=again.headers.get('set-cookie').split(';')[0];assert.equal((await nativeFetch(base+'/api/health',{headers:{Cookie:token2}})).status,200);
  assert.equal((await nativeFetch(base+'/auth/logout',{method:'POST',headers:{Cookie:token2}})).status,200);
  assert.equal((await nativeFetch(base+'/api/health',{headers:{Cookie:token2}})).status,401);
 }finally{delete process.env.APP_PASSWORD;delete process.env.NODE_ENV;}
});

test('Sicherheitsblockierung und fehlendes Audio werden verständlich gemeldet',async()=>{upstream=async()=>Response.json({promptFeedback:{blockReason:'SAFETY'}});let r=await post('/api/chat',{messages:[{role:'user',content:'Hallo'}]});assert.equal(r.status,502);assert.match((await r.json()).error,/безпеки/);r=await post('/api/speech',{text:'Hallo'});assert.equal(r.status,502);assert.match((await r.json()).error,/не надав аудіо/);});
test('Direkt kodiertes Gemini-Audio wird ohne PCM-Konvertierung geliefert',async()=>{upstream=async()=>Response.json({candidates:[{content:{parts:[{inlineData:{mimeType:'audio/mp3',data:Buffer.from('mp3-test').toString('base64')}}]}}]});const r=await post('/api/speech',{text:'Hallo'});assert.equal(r.status,200);assert.equal(r.headers.get('content-type'),'audio/mpeg');assert.equal(await r.text(),'mp3-test');});
test('Versionscheck bleibt öffentlich und enthält keine Konfiguration',async()=>{process.env.APP_PASSWORD='privat';const r=await nativeFetch(base+'/healthz');assert.equal(r.status,200);assert.deepEqual(await r.json(),{status:'ok',version:'wolke-weather-pin-4'});assert.equal((await nativeFetch(base+'/api/health')).status,401);delete process.env.APP_PASSWORD;});
test('Streaming liefert ersten Text vor Ende der Gemini-Antwort und verarbeitet geteiltes UTF-8',async()=>{
 let release;const gate=new Promise(r=>release=r);const encoder=new TextEncoder();
 upstream=async(url,options)=>{
  assert.match(url,/:streamGenerateContent\?alt=sse$/);const body=JSON.parse(options.body);assert.equal(body.generationConfig.thinkingConfig.thinkingLevel,'MINIMAL');
  return new Response(new ReadableStream({async start(controller){
   const bytes=encoder.encode('data: '+JSON.stringify({candidates:[{content:{parts:[{thought:true,text:'privat'},{text:'Привіт'}]}}]})+'\r\n\r\n');
   const split=bytes.indexOf(0xd0)+1;controller.enqueue(bytes.slice(0,split));controller.enqueue(bytes.slice(split));await gate;
   controller.enqueue(encoder.encode('data: '+JSON.stringify({candidates:[{content:{parts:[{text:'!'}]},finishReason:'STOP'}]})+'\n\n'));controller.close();
  }}),{headers:{'Content-Type':'text/event-stream'}});
 };
 const r=await post('/api/chat',{messages:[{role:'user',content:'Привіт'}],stream:true});assert.equal(r.headers.get('content-type'),'application/x-ndjson; charset=utf-8');const reader=r.body.getReader();
 try{const first=await reader.read();const text=new TextDecoder().decode(first.value);assert.ok(text.includes('Привіт'));assert.ok(!text.includes('privat'));assert.ok(!text.includes('"done"'));}
 finally{release();}
 let tail='';while(true){const chunk=await reader.read();if(chunk.done)break;tail+=new TextDecoder().decode(chunk.value);}assert.match(tail,/"delta":"!"/);assert.match(tail,/"done":true/);
});
test('Fehler nach Streaming-Beginn wird als Fehler statt als Erfolg beendet',async()=>{upstream=async()=>new Response('data: '+JSON.stringify({candidates:[{content:{parts:[{text:'Текст'}]}}]})+'\n\ndata: '+JSON.stringify({error:{code:503}})+'\n\n');const r=await post('/api/chat',{messages:[{role:'user',content:'Привіт'}],stream:true});const events=(await r.text()).trim().split('\n').map(JSON.parse);assert.equal(events[0].delta,'Текст');assert.ok(events.at(-1).error);assert.ok(!events.some(e=>e.done));});
test('Leerer Stream und Sicherheitsblockierung melden Fehler',async()=>{for(const data of [{}, {promptFeedback:{blockReason:'SAFETY'}}]){upstream=async()=>new Response('data: '+JSON.stringify(data)+'\n\n');const r=await post('/api/chat',{messages:[{role:'user',content:'Привіт'}],stream:true});assert.equal(r.status,502);assert.ok((await r.json()).error);}});
test('Abbruch im Browser beendet die Anfrage an Gemini',async()=>{
 let aborted=false,started;const ready=new Promise(r=>started=r);
 upstream=async(url,options)=>new Response(new ReadableStream({start(controller){controller.enqueue(new TextEncoder().encode('data: '+JSON.stringify({candidates:[{content:{parts:[{text:'Початок'}]}}]})+'\n\n'));options.signal.addEventListener('abort',()=>{aborted=true;controller.error(new DOMException('aborted','AbortError'));},{once:true});started();}}));
 const controller=new AbortController();const r=await nativeFetch(base+'/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({messages:[{role:'user',content:'Привіт'}],stream:true}),signal:controller.signal});await ready;const reader=r.body.getReader();await reader.read();controller.abort();await assert.rejects(reader.read());for(let i=0;i<20&&!aborted;i++)await new Promise(r=>setTimeout(r,10));assert.equal(aborted,true);
});

test('PIN-Bruteforce wird nach fünf Fehlversuchen begrenzt',async()=>{process.env.APP_PASSWORD='nicht-raten';try{for(let i=0;i<5;i++)assert.equal((await post('/auth/login',{pin:'falsch'})).status,401);const r=await post('/auth/login',{pin:'nicht-raten'});assert.equal(r.status,429);assert.ok(r.headers.get('retry-after'));}finally{delete process.env.APP_PASSWORD;}});

test('Manifest und Logo sind vor PIN-Eingabe für App-Installation erreichbar',async()=>{process.env.APP_PASSWORD='privat';try{const r=await nativeFetch(base+'/manifest.webmanifest');assert.equal(r.status,200);const m=await r.json();assert.equal(m.name,'Wolke');assert.equal(m.display,'standalone');assert.ok(m.icons.some(i=>i.purpose==='maskable'));for(const icon of m.icons){const response=await nativeFetch(base+icon.src);assert.equal(response.status,200);assert.ok(response.headers.get('content-type').includes('image/png'));}assert.equal((await nativeFetch(base+'/logo.svg')).status,200);}finally{delete process.env.APP_PASSWORD;}});
test('Wetterfragen bekommen aktuelle Daten für den Ort aus den Einstellungen',async()=>{
 weatherUpstream=async url=>{assert.ok(String(url).startsWith('https://api.open-meteo.com/'));return Response.json({timezone:'Europe/Berlin',current:{temperature_2m:14,apparent_temperature:13,weather_code:2,wind_speed_10m:8,is_day:1,time:'2026-10-24T14:00'},daily:{time:['2026-10-24'],temperature_2m_min:[9],temperature_2m_max:[17],precipitation_probability_max:[20],weather_code:[2]}});};
 upstream=async(url,options)=>{const body=JSON.parse(options.body);const instruction=body.systemInstruction.parts[0].text;assert.match(instruction,/Germersheim/);assert.match(instruction,/14 °C/);assert.match(instruction,/Open-Meteo/);assert.match(instruction,/1–3/);return Response.json({candidates:[{content:{parts:[{text:'У Germersheim зараз 14 °C.'}]}}]});};
 const r=await post('/api/chat',{messages:[{role:'user',content:'Яка погода?'}],weatherCity:'Germersheim',answerStyle:'short'});assert.equal(r.status,200);assert.match((await r.json()).answer,/14/);
});
