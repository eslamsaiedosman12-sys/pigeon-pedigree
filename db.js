/* IndexedDB layer. Stores: pigeons(id PK, unique index ring, fatherId, motherId), photos(id PK, blob).
   pigeon = {id, ring, name, sex:'M'|'F', birth, color, breed, notes, fatherId, motherId,
             fatherRing, motherRing (pending, unregistered parent), photoId, createdAt, updatedAt} */
let _db;
export const uid=()=>crypto.randomUUID();
export const open=()=>_db||(_db=new Promise((res,rej)=>{
  const r=indexedDB.open('pigeon-pedigree',1);
  r.onupgradeneeded=()=>{const d=r.result,p=d.createObjectStore('pigeons',{keyPath:'id'});
    p.createIndex('ring','ring',{unique:true});p.createIndex('fatherId','fatherId');p.createIndex('motherId','motherId');
    d.createObjectStore('photos',{keyPath:'id'});};
  r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error);}));
const req=r=>new Promise((s,j)=>{r.onsuccess=()=>s(r.result);r.onerror=()=>j(r.error)});
const store=async(n,m='readonly')=>(await open()).transaction(n,m).objectStore(n);
export const all=async n=>req((await store(n)).getAll());
export const get=async(n,id)=>req((await store(n)).get(id));

/** Save pigeon (+ optional new photo blob, optional photo id to delete) atomically.
 *  After saving, any pigeon waiting on this ring as an unregistered parent is linked automatically. */
export async function savePigeon(p,{photo,deletePhotoId}={}){
  const d=await open(),t=d.transaction(['pigeons','photos'],'readwrite'),ps=t.objectStore('pigeons'),ph=t.objectStore('photos');
  return new Promise((res,rej)=>{
    t.oncomplete=()=>res(p);
    t.onabort=()=>rej(t.error);
    if(deletePhotoId)ph.delete(deletePhotoId);
    if(photo)ph.put({id:p.photoId,blob:photo});
    ps.put(p).onsuccess=()=>ps.getAll().onsuccess=e=>{
      for(const c of e.target.result){if(c.id===p.id)continue;let ch=false;
        if(!c.fatherId&&c.fatherRing===p.ring){c.fatherId=p.id;c.fatherRing=null;ch=true}
        if(!c.motherId&&c.motherRing===p.ring){c.motherId=p.id;c.motherRing=null;ch=true}
        if(ch)ps.put(c);}};
  });
}
/** Delete pigeon; children keep a pending ring reference so re-adding the pigeon relinks them. */
export async function deletePigeon(id){
  const d=await open(),t=d.transaction(['pigeons','photos'],'readwrite'),ps=t.objectStore('pigeons');
  return new Promise((res,rej)=>{t.oncomplete=res;t.onabort=()=>rej(t.error);
    ps.get(id).onsuccess=e=>{const p=e.target.result;if(!p)return;
      if(p.photoId)t.objectStore('photos').delete(p.photoId);
      ps.getAll().onsuccess=ev=>{for(const c of ev.target.result){let ch=false;
        if(c.fatherId===id){c.fatherId=null;c.fatherRing=p.ring;ch=true}
        if(c.motherId===id){c.motherId=null;c.motherRing=p.ring;ch=true}
        if(ch)ps.put(c)}ps.delete(id)}}});
}
export async function replaceAll(pigeons,photos){
  const d=await open(),t=d.transaction(['pigeons','photos'],'readwrite');
  return new Promise((res,rej)=>{t.oncomplete=res;t.onabort=()=>rej(t.error);
    const ps=t.objectStore('pigeons'),ph=t.objectStore('photos');ps.clear();ph.clear();
    pigeons.forEach(p=>ps.put(p));photos.forEach(x=>ph.put(x));});
}
