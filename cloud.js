import {randomBytes,createHash} from 'node:crypto';
const verified=new Map(),refreshing=new Map();
export function cloudEnabled(){return Boolean(process.env.SUPABASE_URL&&(process.env.SUPABASE_PUBLISHABLE_KEY||process.env.SUPABASE_ANON_KEY)&&process.env.ALLOWED_GOOGLE_EMAILS&&(process.env.APP_ORIGIN||process.env.RENDER_EXTERNAL_URL));}
function config(){const url=new URL(process.env.SUPABASE_URL);if(url.protocol!=='https:'||url.username||url.password||url.pathname!=='/')throw new Error('Invalid Supabase URL');return {url:url.origin,key:process.env.SUPABASE_PUBLISHABLE_KEY||process.env.SUPABASE_ANON_KEY};}
function cookie(req,name){return (req.headers.cookie||'').split(';').map(v=>v.trim()).find(v=>v.startsWith(name+'='))?.slice(name.length+1)||'';}
const opts=()=>({httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/'});
async function call(path,{method='GET',token,body,headers={}}={}){const {url,key}=config();const r=await fetch(url+path,{method,headers:{apikey:key,...(token?{Authorization:'Bearer '+token}:{}),...(body?{'Content-Type':'application/json'}:{}),...headers},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(12000)});let data;try{data=await r.json();}catch{}if(!r.ok){const e=new Error('Cloud service unavailable');e.status=r.status;throw e;}return data;}
function permitted(user){const emails=(process.env.ALLOWED_GOOGLE_EMAILS||'').split(',').map(v=>v.trim().toLowerCase()).filter(Boolean);return Boolean(user?.id&&user.email_confirmed_at&&emails.includes(user.email?.toLowerCase())&&(user.app_metadata?.provider==='google'||user.app_metadata?.providers?.includes('google')));}
function setTokens(res,data){res.cookie('wolke_access',data.access_token,{...opts(),maxAge:Math.min(data.expires_in||3600,3600)*1000});res.cookie('wolke_refresh',data.refresh_token,{...opts(),maxAge:30*86400000});}
export function clearCloud(res){for(const name of ['wolke_access','wolke_refresh','wolke_pkce'])res.clearCookie(name,opts());}
export async function cloudIdentity(req,res,next){
 if(!cloudEnabled())return next();
 let token=cookie(req,'wolke_access'),refresh=cookie(req,'wolke_refresh');if(!token&&!refresh)return next();
 try{
  let user;
  if(token){const key=createHash('sha256').update(token).digest('hex'),hit=verified.get(key);if(hit&&hit.until>Date.now())user=hit.user;else try{user=await call('/auth/v1/user',{token});if(verified.size>=1000)verified.delete(verified.keys().next().value);verified.set(key,{user,until:Date.now()+30000});}catch(e){if(![401,403].includes(e.status))throw e;}}
  if(!user&&refresh){let pending=refreshing.get(refresh);if(!pending){pending=call('/auth/v1/token?grant_type=refresh_token',{method:'POST',body:{refresh_token:refresh}});refreshing.set(refresh,pending);pending.finally(()=>refreshing.delete(refresh)).catch(()=>{});}const data=await pending;user=data.user;token=data.access_token;if(!permitted(user))throw Object.assign(new Error(),{status:403});setTokens(res,data);}
  if(!permitted(user))throw Object.assign(new Error(),{status:403});req.cloudUser={id:user.id,email:user.email};req.cloudToken=token;
 }catch(e){if([400,401,403].includes(e.status))clearCloud(res);else req.cloudUnavailable=true;}
 next();
}
function validData(data){return data&&typeof data==='object'&&Array.isArray(data.chats)&&data.chats.length<=200&&data.chats.every(c=>typeof c.id==='string'&&c.id.length<=100&&typeof c.title==='string'&&c.title.length<=200&&Number.isFinite(c.updated)&&Array.isArray(c.messages)&&c.messages.length<=2000&&c.messages.every(m=>['user','assistant'].includes(m.role)&&typeof m.content==='string'&&m.content.length<=50000))&&JSON.stringify(data).length<=4000000;}
export function registerCloud(app){
 app.get('/auth/config',(req,res)=>res.json({google:cloudEnabled()}));
 app.get('/auth/google',(req,res)=>{if(!cloudEnabled())return res.status(503).send('Google login is not configured. / Google-Anmeldung noch nicht eingerichtet.');try{const verifier=randomBytes(32).toString('base64url');res.cookie('wolke_pkce',verifier,{...opts(),maxAge:600000});const origin=new URL(process.env.APP_ORIGIN||process.env.RENDER_EXTERNAL_URL).origin;if(process.env.NODE_ENV==='production'&&!origin.startsWith('https:'))throw new Error();const params=new URLSearchParams({provider:'google',redirect_to:origin+'/auth/callback',code_challenge:createHash('sha256').update(verifier).digest('base64url'),code_challenge_method:'s256'});res.redirect(config().url+'/auth/v1/authorize?'+params);}catch{res.redirect('/login?cloud=configuration');}});
 app.get('/auth/callback',async(req,res)=>{const verifier=cookie(req,'wolke_pkce');res.clearCookie('wolke_pkce',opts());if(!cloudEnabled()||!verifier||typeof req.query.code!=='string'||req.query.code.length>2000)return res.redirect('/login?cloud=failed');try{const data=await call('/auth/v1/token?grant_type=pkce',{method:'POST',body:{auth_code:req.query.code,code_verifier:verifier}});if(!permitted(data.user)){clearCloud(res);return res.redirect('/login?cloud=denied');}setTokens(res,data);res.redirect('/');}catch{clearCloud(res);res.redirect('/login?cloud=failed');}});
}
export function registerSync(app){
 app.get('/api/account',(req,res)=>res.json({googleConfigured:cloudEnabled(),user:req.cloudUser||null,cloudUnavailable:!!req.cloudUnavailable}));
 const requireUser=(req,res,next)=>req.cloudUser?next():res.status(req.cloudUnavailable?503:401).json({error:'Cloud-Anmeldung erforderlich / Потрібен вхід через Google.'});
 app.get('/api/sync',requireUser,async(req,res)=>{try{const rows=await call('/rest/v1/wolke_state?user_id=eq.'+encodeURIComponent(req.cloudUser.id)+'&select=revision,data',{token:req.cloudToken});res.json(rows[0]||{revision:0,data:null});}catch{res.status(503).json({error:'Cloud-Speicher nicht verfügbar. Prüfe die Supabase-Datenbankeinrichtung.'});}});
 app.post('/api/sync',requireUser,async(req,res)=>{
  const {revision,data}=req.body||{};if(!Number.isSafeInteger(revision)||revision<0||!validData(data))return res.status(400).json({error:'Ungültige Synchronisierungsdaten.'});
  try{let rows;
   if(revision===0){try{rows=await call('/rest/v1/wolke_state',{method:'POST',token:req.cloudToken,headers:{Prefer:'return=representation'},body:{user_id:req.cloudUser.id,revision:1,data}});}catch(e){if(e.status===409)return res.status(409).json({error:'Cloud-Daten wurden zwischenzeitlich geändert.'});throw e;}}
   else rows=await call('/rest/v1/wolke_state?user_id=eq.'+encodeURIComponent(req.cloudUser.id)+'&revision=eq.'+revision,{method:'PATCH',token:req.cloudToken,headers:{Prefer:'return=representation'},body:{revision:revision+1,data,updated_at:new Date().toISOString()}});
   if(!rows?.length)return res.status(409).json({error:'Cloud-Daten wurden zwischenzeitlich geändert.'});res.json({revision:rows[0].revision});
  }catch{res.status(503).json({error:'Cloud-Speichern fehlgeschlagen. Lokale Daten bleiben erhalten.'});}
 });
}
