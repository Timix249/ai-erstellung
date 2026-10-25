export function mergeState(local,remote){
 const deleted={...(remote?.deletedChats||{})};for(const [id,time] of Object.entries(local.deletedChats||{}))deleted[id]=Math.max(deleted[id]||0,time);
 const byId=new Map();for(const c of [...(remote?.chats||[]),...(local.chats||[])]){if(c.updated<=(deleted[c.id]||0))continue;const old=byId.get(c.id);if(!old||c.updated>=old.updated)byId.set(c.id,c);}
 const useRemote=(remote?.settingsUpdated||0)>(local.settingsUpdated||0);
 return {chats:[...byId.values()],deletedChats:deleted,settings:useRemote?remote.settings:local.settings,settingsUpdated:Math.max(local.settingsUpdated||0,remote?.settingsUpdated||0)};
}
