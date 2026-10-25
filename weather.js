const weatherCache=new Map(),locationCache=new Map();
const defaultLocation={name:'Germersheim',country:'Німеччина',latitude:49.2231,longitude:8.3639,timezone:'Europe/Berlin'};
async function getJSON(url){
 let lastStatus;
 for(let attempt=0;attempt<2;attempt++){
  try{const response=await fetch(url,{signal:AbortSignal.timeout(12000)});lastStatus=response.status;
   if(response.ok)return await response.json();
   await response.body?.cancel();if(![429,502,503,504].includes(response.status))break;
  }catch{lastStatus=undefined;}
  if(attempt===0)await new Promise(resolve=>setTimeout(resolve,350));
 }
 const error=new Error(lastStatus===429?'Служба погоди тимчасово обмежила запити. Спробуй за хвилину.':'Не вдалося отримати погоду. Перевір з’єднання та спробуй пізніше.');error.status=502;throw error;
}
const descriptions=new Map([[0,'Ясно'],[1,'Переважно ясно'],[2,'Мінлива хмарність'],[3,'Хмарно'],[45,'Туман'],[48,'Паморозь і туман'],[51,'Легка мряка'],[53,'Мряка'],[55,'Сильна мряка'],[56,'Крижана мряка'],[57,'Крижана мряка'],[61,'Невеликий дощ'],[63,'Дощ'],[65,'Сильний дощ'],[66,'Крижаний дощ'],[67,'Крижаний дощ'],[71,'Невеликий сніг'],[73,'Сніг'],[75,'Сильний сніг'],[77,'Снігові зерна'],[80,'Короткочасний дощ'],[81,'Злива'],[82,'Сильна злива'],[85,'Снігопад'],[86,'Сильний снігопад'],[95,'Гроза'],[96,'Гроза з градом'],[99,'Гроза з градом']]);
export async function getWeather(city='Germersheim'){
 if(typeof city!=='string'||city.trim().length<2||city.length>100){const e=new Error('Укажи назву міста: від 2 до 100 символів.');e.status=400;throw e;}
 city=city.trim();const key=city.toLocaleLowerCase();const cached=weatherCache.get(key);if(cached&&cached.expires>Date.now())return cached.data;
 let location=key==='germersheim'?defaultLocation:locationCache.get(key);
 if(!location){
  const query=new URLSearchParams({name:city,count:'1',language:'uk',format:'json'});const data=await getJSON('https://geocoding-api.open-meteo.com/v1/search?'+query);const place=data.results?.[0];
  if(!place){const e=new Error('Місто не знайдено. Перевір назву або введи найближче велике місто.');e.status=404;throw e;}
  if(!Number.isFinite(place.latitude)||!Number.isFinite(place.longitude)){const e=new Error('Некоректна відповідь служби пошуку міста.');e.status=502;throw e;}
  location={name:place.name,country:place.country||'',latitude:place.latitude,longitude:place.longitude,timezone:place.timezone||'auto'};
  if(locationCache.size>=100)locationCache.delete(locationCache.keys().next().value);locationCache.set(key,location);
 }
 const query=new URLSearchParams({latitude:String(location.latitude),longitude:String(location.longitude),current:'temperature_2m,apparent_temperature,weather_code,wind_speed_10m,is_day',daily:'temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code',timezone:'auto',forecast_days:'3'});
 const data=await getJSON('https://api.open-meteo.com/v1/forecast?'+query),c=data.current,d=data.daily;
 if(!Number.isFinite(c?.temperature_2m)||!Number.isFinite(c?.weather_code)||!c?.time){const e=new Error('Служба погоди повернула неповні дані. Спробуй пізніше.');e.status=502;throw e;}
 const result={location:{...location,timezone:data.timezone||location.timezone},updatedAt:new Date().toISOString(),current:{temperature:c.temperature_2m,apparentTemperature:c.apparent_temperature??null,wind:c.wind_speed_10m??null,code:c.weather_code,isDay:c.is_day!==0,time:c.time,description:descriptions.get(c.weather_code)||'Мінлива погода'},days:(d?.time||[]).map((date,i)=>({date,min:d.temperature_2m_min?.[i]??null,max:d.temperature_2m_max?.[i]??null,rain:d.precipitation_probability_max?.[i]??null,description:descriptions.get(d.weather_code?.[i])||'Мінлива погода'})),source:'Open-Meteo'};
 if(weatherCache.size>=100)weatherCache.delete(weatherCache.keys().next().value);weatherCache.set(key,{data:result,expires:Date.now()+10*60*1000});return result;
}
export function weatherSummary(data){return `Погода: ${data.location.name}, ${data.location.country}. Дані станом на ${data.current.time} (${data.location.timezone}). Зараз ${data.current.temperature} °C, ${data.current.description}; відчувається як ${data.current.apparentTemperature??'немає даних'} °C, вітер ${data.current.wind??'немає даних'} км/год. Прогноз: ${data.days.map(d=>`${d.date}: ${d.description}, ${d.min}…${d.max} °C, імовірність опадів ${d.rain??'немає даних'}%`).join('; ')}. Джерело: Open-Meteo. Це прогноз, він може змінюватися.`;}
