const cache=new Map();
function decode(text){return text.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,'$1').replace(/<[^>]*>/g,'').replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);/gi,(all,key)=>{if(key[0]==='#'){const n=key[1].toLowerCase()==='x'?parseInt(key.slice(2),16):parseInt(key.slice(1),10);return n>0&&n<=0x10ffff?String.fromCodePoint(n):'';}return {amp:'&',lt:'<',gt:'>',quot:'"',apos:"'"}[key.toLowerCase()]||all;}).trim();}
export async function searchWeb(query,{signal}={}){
 if(typeof query!=='string'||!query.trim())throw new Error('Порожній пошуковий запит.');query=query.trim().slice(0,500);
 const hit=cache.get(query);if(hit&&hit.until>Date.now())return hit.results;
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),10000),abort=()=>controller.abort();signal?.addEventListener('abort',abort,{once:true});if(signal?.aborted)abort();
 try{
  const response=await fetch('https://www.bing.com/search?'+new URLSearchParams({q:query,format:'rss',setlang:'uk'}),{headers:{Accept:'application/rss+xml, application/xml, text/xml'},signal:controller.signal});
  if(!response.ok)throw new Error('Search unavailable');const reader=response.body.getReader(),decoder=new TextDecoder();let xml='',size=0;
  try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>524288){await reader.cancel();throw new Error('Search response too large');}xml+=decoder.decode(value,{stream:true});}xml+=decoder.decode();}finally{reader.releaseLock();}
  const results=[];for(const item of xml.matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/gi)){const field=name=>decode(item[1].match(new RegExp('<'+name+'\\b[^>]*>([\\s\\S]*?)</'+name+'>','i'))?.[1]||'');const url=field('link');try{const u=new URL(url);if(!['https:','http:'].includes(u.protocol)||u.username||u.password)continue;}catch{continue;}results.push({title:field('title').slice(0,250),url,snippet:field('description').slice(0,1200)});if(results.length===5)break;}
  if(!results.length)throw new Error('No search results');if(cache.size>=100)cache.delete(cache.keys().next().value);cache.set(query,{results,until:Date.now()+5*60000});return results;
 }finally{clearTimeout(timer);signal?.removeEventListener('abort',abort);}
}
