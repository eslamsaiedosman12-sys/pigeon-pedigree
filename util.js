export const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const fmtNum=n=>Number(n).toLocaleString('ar-EG');
export const fmtDate=d=>d?new Date(d+'T00:00').toLocaleDateString('ar-EG',{day:'numeric',month:'long',year:'numeric'}):'—';
/** Normalise ring: Arabic digits→Latin, trim, collapse spaces, uppercase. Used as the unique key. */
export const normRing=s=>String(s||'').replace(/[٠-٩]/g,d=>'٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/[۰-۹]/g,d=>'۰۱۲۳۴۵۶۷۸۹'.indexOf(d)).trim().replace(/\s+/g,' ').toUpperCase();
export function age(d){if(!d)return'—';const a=new Date(d),n=new Date();let m=(n.getFullYear()-a.getFullYear())*12+n.getMonth()-a.getMonth();if(n.getDate()<a.getDate())m--;if(m<0)return'—';
  const y=Math.floor(m/12),r=m%12;return[y&&`${fmtNum(y)} سنة`,r&&`${fmtNum(r)} شهر`].filter(Boolean).join(' و ')||'أقل من شهر'}
let tt;export function toast(m){const t=document.getElementById('toast');t.textContent=m;t.classList.add('show');clearTimeout(tt);tt=setTimeout(()=>t.classList.remove('show'),3000)}
export function ask(msg){const d=document.getElementById('dlg');document.getElementById('dlgMsg').textContent=msg;d.showModal();return new Promise(r=>d.addEventListener('close',()=>r(d.returnValue==='ok'),{once:true}))}
/** Downscale image to max 900px JPEG to save space. */
export async function shrink(file,max=900){const bmp=await createImageBitmap(file),s=Math.min(1,max/Math.max(bmp.width,bmp.height));
  const c=document.createElement('canvas');c.width=Math.round(bmp.width*s);c.height=Math.round(bmp.height*s);c.getContext('2d').drawImage(bmp,0,0,c.width,c.height);
  return new Promise(r=>c.toBlob(r,'image/jpeg',.82))}
export const blobToDataURL=b=>new Promise(r=>{const f=new FileReader();f.onload=()=>r(f.result);f.readAsDataURL(b)});
