/* Pigeon Pedigree – Phase 1: shell, dashboard, CRUD, search, backup/restore. Hash router: #/ #/pigeons #/new #/edit/ID #/p/ID #/backup */
import * as DB from './db.js';
import {renderTree} from './tree.js';
import {kin,relate,sharesParent,pct} from './rel.js';
import {esc,fmtNum,fmtDate,normRing,age,toast,ask} from './util.js';
const app=document.getElementById('app');
let P=[],M=new Map();
const SEX={M:'ذكر',F:'أنثى'};
const ringOk=r=>/^[A-Z0-9\u0600-\u06FF][A-Z0-9\u0600-\u06FF\-\/ ]{1,29}$/.test(r);

const link=p=>`<a href="#/p/${p.id}">${esc(p.ring)}</a>`;
const parentOf=(p,k)=>{const id=p[k+'Id'];return id&&M.get(id)?{p:M.get(id)}:{ring:p[k+'Ring']}};

async function route(){
  P=await DB.all('pigeons');M=new Map(P.map(p=>[p.id,p]));
  const[,a='',b]=location.hash.slice(1).split('/');
  document.querySelectorAll('#nav a').forEach(x=>x.classList.toggle('on',x.dataset.r===(a==='edit'||a==='p'||a==='tree'||a==='desc'?'pigeons':a)));
  ({'':dash,pigeons:list,new:form,edit:form,p:detail,tree:id=>renderTree(app,M,id),desc:id=>renderTree(app,M,id,'desc'),backup:backup}[a]||dash)(b);
  window.scrollTo(0,0);
}
addEventListener('hashchange',route);

/* ---------- Dashboard ---------- */
function dash(){
  if(!P.length){app.innerHTML=`<h1>لوحة التحكم</h1><div class="card empty"><h2>لا توجد حمامات مسجلة بعد</h2><p>ابدأ بتسجيل أول حمامة في البرج باستخدام رقم الدبلة.</p><a class="btn gold" href="#/new">+ إضافة حمامة</a><p><a href="#/backup">أو استرجع نسخة احتياطية</a></p></div>`;return}
  const pend=P.filter(p=>p.fatherRing||p.motherRing).length,
    recent=[...P].sort((a,b)=>b.createdAt-a.createdAt).slice(0,5);
  const lb=+localStorage.getItem('lastBackup')||0,old=Date.now()-lb>14*864e5;
  app.innerHTML=`<h1>لوحة التحكم</h1>${old?`<div class="note">⚠️ بياناتك محفوظة على هذا المتصفح فقط. ${lb?'مرّ أكثر من ١٤ يوماً على آخر نسخة احتياطية.':'لم تأخذ نسخة احتياطية بعد.'} <a href="#/backup"><b>خد نسخة الآن</b></a></div>`:''}<div class="grid">
   <div class="stat"><b>${fmtNum(P.length)}</b><span>إجمالي الحمام</span></div>
   <div class="stat"><b>${fmtNum(P.filter(p=>p.sex==='M').length)}</b><span>ذكور</span></div>
   <div class="stat"><b>${fmtNum(P.filter(p=>p.sex==='F').length)}</b><span>إناث</span></div>
   <div class="stat"><b>${fmtNum(pend)}</b><span>أبوان غير مسجلين</span></div></div>
   <div class="card" style="margin-top:1rem"><h3>آخر الإضافات</h3><table><tbody>${recent.map(p=>`<tr class="lnk" onclick="location.hash='#/p/${p.id}'"><td><b>${esc(p.ring)}</b></td><td>${SEX[p.sex]}</td><td>${fmtDate(p.birth)}</td></tr>`).join('')}</tbody></table></div>
   <a class="btn gold" href="#/new">+ إضافة حمامة</a>`;
}

/* ---------- List + search ---------- */
function list(){
  app.innerHTML=`<h1>الحمام</h1><div class="card"><div class="cols"><div><input id="q" type="search" placeholder="ابحث برقم الدبلة"></div><div><select id="sx"><option value="">الكل</option><option value="M">ذكور</option><option value="F">إناث</option></select></div></div></div><div id="res"></div>`;
  const q=document.getElementById('q'),sx=document.getElementById('sx'),res=document.getElementById('res');
  const draw=()=>{const t=normRing(q.value).toLowerCase(),t2=q.value.trim().toLowerCase();
    const f=P.filter(p=>(!sx.value||p.sex===sx.value)&&(!t2||[p.ring].some(v=>String(v||'').toLowerCase().includes(t2)||String(v||'').toLowerCase().includes(t)))).sort((a,b)=>b.createdAt-a.createdAt);
    if(!P.length)res.innerHTML=`<div class="card empty"><h2>القائمة فارغة</h2><p>لم تُسجَّل أي حمامة بعد.</p><a class="btn gold" href="#/new">+ إضافة حمامة</a></div>`;
    else if(!f.length)res.innerHTML=`<div class="card empty"><h2>لا نتائج مطابقة</h2><p>جرّب كلمة بحث أخرى.</p></div>`;
    else res.innerHTML=`<table><thead><tr><th>رقم الدبلة</th><th>الجنس</th><th>تاريخ الفقس</th><th>العمر</th></tr></thead><tbody>${f.map(p=>`<tr class="lnk" onclick="location.hash='#/p/${p.id}'"><td><b>${esc(p.ring)}</b></td><td>${SEX[p.sex]}</td><td>${fmtDate(p.birth)}</td><td>${age(p.birth)}</td></tr>`).join('')}</tbody></table><p class="err" style="color:#6b7280">${fmtNum(f.length)} من ${fmtNum(P.length)}</p>`;
    };
  q.oninput=sx.onchange=draw;draw();
}

/* ---------- Detail ---------- */
function detail(id){
  const p=M.get(id);if(!p){app.innerHTML=`<div class="card empty"><h2>الحمامة غير موجودة</h2><a class="btn" href="#/pigeons">العودة للقائمة</a></div>`;return}
  const par=k=>{const x=parentOf(p,k);return x.p?link(x.p):x.ring?`${esc(x.ring)} <span class="tag w">غير مسجل بعد</span>`:'غير معروف'};
  const kids=P.filter(c=>c.fatherId===p.id||c.motherId===p.id),
    sibs=P.filter(s=>s.id!==p.id&&(sharesParent(p,s,'father')||sharesParent(p,s,'mother'))),
    full=sibs.filter(s=>sharesParent(p,s,'father')&&sharesParent(p,s,'mother')),half=sibs.filter(s=>!full.includes(s)),K=kin(M),Fv=K.F(p.id);
  const lst=a=>a.length?a.map(x=>`<div>${link(x)}</div>`).join(''):'<span style="color:#6b7280">لا يوجد</span>';
  app.innerHTML=`<h1>${esc(p.ring)}</h1><div class="card"><div class="row" style="align-items:flex-start"><div style="flex:1;min-width:240px"><dl>
   <dt>رقم الدبلة</dt><dd><b>${esc(p.ring)}</b></dd><dt>الجنس</dt><dd><span class="tag">${SEX[p.sex]}</span></dd>
   <dt>تاريخ الفقس</dt><dd>${fmtDate(p.birth)}</dd><dt>العمر</dt><dd>${age(p.birth)}</dd>
   <dt>دبلة الأب</dt><dd>${par('father')}</dd><dt>دبلة الأم</dt><dd>${par('mother')}</dd>
   <dt>ملاحظات</dt><dd style="white-space:pre-wrap">${esc(p.notes)||'—'}</dd></dl></div></div>
   <div class="row" style="margin-top:1rem"><a class="btn gold" href="#/tree/${p.id}">شجرة النسب</a><a class="btn gold" href="#/desc/${p.id}">شجرة الأبناء</a><a class="btn" href="#/edit/${p.id}">تعديل</a><button class="btn danger" id="del">حذف</button><a class="btn ghost" href="#/pigeons">القائمة</a></div></div>
   <div class="cols"><div class="card"><h3>الأبناء (${fmtNum(kids.length)})</h3>${lst(kids)}</div><div class="card"><h3>الأشقاء (${fmtNum(full.length)})</h3>${lst(full)}<h3>إخوة غير أشقاء (${fmtNum(half.length)})</h3>${lst(half)}</div></div>
   <div class="card"><h3>معامل التزاوج الداخلي: ${pct(Fv)}</h3><p style="color:#6b7280;margin:0">يُحسب من تقاطع نسب الأب والأم المسجلين (طريقة رايت). الصفر يعني عدم وجود أسلاف مشتركة معروفة.</p></div>
   <div class="card"><h3>حساب القرابة</h3><div class="row"><input id="rq" list="rl" dir="ltr" style="flex:1;text-align:right" placeholder="رقم دبلة حمامة أخرى"><button class="btn" id="rb">احسب</button></div><datalist id="rl">${P.filter(x=>x.id!==p.id).map(x=>`<option value="${esc(x.ring)}">`).join('')}</datalist><div id="rr" style="margin-top:.6rem"></div></div>`;
  document.getElementById('rb').onclick=()=>{const o=P.find(x=>x.ring===normRing(document.getElementById('rq').value)),rr=document.getElementById('rr');
    if(!o){rr.innerHTML='<span class="err">لا توجد حمامة بهذا الرقم.</span>';return}
    const R=relate(M,p,o,K);rr.innerHTML=`<b>${esc(R.label)}</b>${R.r!=null?`<div>معامل القرابة: ${pct(R.r)}</div>`:''}${R.common?.length?`<div>الأسلاف المشتركون: ${R.common.map(link).join('، ')}</div>`:''}`};
  document.getElementById('del').onclick=async()=>{if(await ask(`حذف الحمامة ${p.ring} نهائياً؟${kids.length?' سيبقى أبناؤها مرتبطين برقم دبلتها كأب/أم غير مسجل.':''}`)){await DB.deletePigeon(p.id);toast('تم الحذف');location.hash='#/pigeons'}};
  
}

/* ---------- Form (add/edit) ---------- */
function form(id){
  const e=id?M.get(id):null;if(id&&!e){location.hash='#/pigeons';return}
  const pr=k=>e?(M.get(e[k+'Id'])?.ring||e[k+'Ring']||''):'';
  const v=x=>esc(e?.[x]??'');
  app.innerHTML=`<h1>${e?'تعديل الحمامة':'إضافة حمامة'}</h1><form class="card" id="f" novalidate>
   <div class="cols"><div><label for="ring">رقم الدبلة (فريد) *</label><input id="ring" name="ring" value="${v('ring')}" dir="ltr" style="text-align:right" autocomplete="off"><div class="err" data-e="ring"></div></div>
   <div><label for="sex">الجنس *</label><select id="sex" name="sex"><option value="">اختر…</option><option value="M"${e?.sex==='M'?' selected':''}>ذكر</option><option value="F"${e?.sex==='F'?' selected':''}>أنثى</option></select><div class="err" data-e="sex"></div></div>
   <div><label for="birth">تاريخ الفقس</label><input id="birth" name="birth" type="date" value="${v('birth')}"><div class="err" data-e="birth"></div></div>
   <div><label for="father">رقم دبلة الأب</label><input id="father" name="father" list="rings" value="${esc(pr('father'))}" dir="ltr" style="text-align:right"><div class="err" data-e="father"></div></div>
   <div><label for="mother">رقم دبلة الأم</label><input id="mother" name="mother" list="rings" value="${esc(pr('mother'))}" dir="ltr" style="text-align:right"><div class="err" data-e="mother"></div></div></div>
   <datalist id="rings">${P.map(p=>`<option value="${esc(p.ring)}">`).join('')}</datalist>
   <p style="color:#6b7280;font-size:.9rem">إن لم يكن الأب/الأم مسجلاً بعد فاكتب رقم دبلته، وسيُربط تلقائياً عند تسجيله لاحقاً.</p>
   <label for="notes">ملاحظات</label><textarea id="notes" name="notes" rows="3">${v('notes')}</textarea>
   <div class="row" style="margin-top:1rem"><button class="btn gold" type="submit">حفظ</button><a class="btn ghost" href="${e?'#/p/'+e.id:'#/pigeons'}">إلغاء</a></div></form>`;
  
  document.getElementById('f').onsubmit=ev=>{ev.preventDefault();save(ev.target,e)};
}
/** True if `anc` is `id` itself or any ancestor of `id` – used to block cycles (a pigeon can't descend from itself). */
function isAncestorOrSelf(anc,id){const seen=new Set(),st=[id];while(st.length){const x=st.pop();if(x===anc)return true;if(seen.has(x))continue;seen.add(x);const p=M.get(x);if(p){p.fatherId&&st.push(p.fatherId);p.motherId&&st.push(p.motherId)}}return false}

async function save(f,e){
  const fd=new FormData(f),E={},g=k=>String(fd.get(k)||'').trim();
  const ring=normRing(g('ring')),sex=g('sex'),birth=g('birth');
  if(!ring)E.ring='رقم الدبلة مطلوب.';
  else if(!ringOk(ring))E.ring='رقم الدبلة غير صالح (٢–٣٠ حرفاً: أرقام وحروف وشرطة فقط).';
  else{const d=P.find(p=>p.ring===ring&&p.id!==e?.id);if(d)E.ring=`رقم الدبلة مستخدم بالفعل.`}
  if(!sex)E.sex='اختر الجنس.';
  if(birth&&birth>new Date().toISOString().slice(0,10))E.birth='تاريخ الفقس لا يمكن أن يكون في المستقبل.';
  const out={fatherId:null,fatherRing:null,motherId:null,motherRing:null};
  for(const k of['father','mother']){const r=normRing(g(k));if(!r)continue;
    if(r===ring){E[k]='لا يمكن أن تكون الحمامة أباً أو أماً لنفسها.';continue}
    const pp=P.find(p=>p.ring===r);
    if(pp){if(e&&isAncestorOrSelf(e.id,pp.id)){E[k]='هذا الربط يُنشئ حلقة في النسب (الحمامة من نسل هذا الطائر).';continue}
      if(k==='father'&&pp.sex==='F')E[k]='الأب يجب أن يكون ذكراً.';if(k==='mother'&&pp.sex==='M')E[k]='الأم يجب أن تكون أنثى.';
      out[k+'Id']=pp.id}
    else if(!ringOk(r))E[k]='رقم الدبلة غير صالح.';else out[k+'Ring']=r}
  if(out.fatherId&&out.fatherId===out.motherId)E.mother='الأب والأم لا يمكن أن يكونا نفس الطائر.';
  if(!E.father&&!E.mother&&out.fatherRing&&out.fatherRing===out.motherRing)E.mother='الأب والأم لا يمكن أن يكونا نفس رقم الدبلة.';
  f.querySelectorAll('[data-e]').forEach(d=>{d.textContent=E[d.dataset.e]||'';const i=f.elements[d.dataset.e];i&&i.classList.toggle('bad',!!E[d.dataset.e])});
  if(Object.keys(E).length){f.querySelector('.bad')?.focus();return}
  const now=Date.now();
  const p={id:e?.id||DB.uid(),ring,sex,birth,notes:g('notes'),...out,createdAt:e?.createdAt||now,updatedAt:now};
  try{await DB.savePigeon(p)}
  catch(x){if(x?.name==='ConstraintError'){f.querySelector('[data-e=ring]').textContent='رقم الدبلة مستخدم بالفعل.';return}toast('تعذّر الحفظ: '+(x?.message||x));return}
  toast(e?'تم حفظ التعديلات':'تمت إضافة الحمامة');location.hash='#/p/'+p.id;
}

/* ---------- Backup / restore ---------- */
function backup(){
  const last=localStorage.getItem('lastBackup');
  app.innerHTML=`<h1>النسخ الاحتياطي</h1><div class="card"><h3>تصدير</h3><p>ينشئ ملف JSON يحوي كل الحمام (${fmtNum(P.length)} حمامة).</p><p style="color:#6b7280">آخر نسخة: ${last?new Date(+last).toLocaleString('ar-EG'):'لم تُنشأ بعد'}</p><button class="btn gold" id="ex"${P.length?'':' disabled'}>تنزيل نسخة احتياطية</button></div>
   <div class="card"><h3>استرجاع</h3><p>سيستبدل الاسترجاع كل البيانات الحالية بمحتوى الملف.</p><input type="file" id="im" accept=".json,application/json"><div class="err" id="ime"></div></div>`;
  document.getElementById('ex').onclick=async()=>{
    const data={app:'pigeon-pedigree',version:2,exportedAt:new Date().toISOString(),pigeons:P.map(({name,color,breed,photoId,...r})=>r)};
    const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(data)],{type:'application/json'}));
    a.download=`pigeon-pedigree-${new Date().toISOString().slice(0,10)}.json`;a.click();localStorage.setItem('lastBackup',Date.now());toast('تم إنشاء النسخة الاحتياطية');setTimeout(backup,300)};
  document.getElementById('im').onchange=async ev=>{const er=document.getElementById('ime');er.textContent='';const f=ev.target.files[0];if(!f)return;
    try{const d=JSON.parse(await f.text());
      if(d.app!=='pigeon-pedigree'||!Array.isArray(d.pigeons))throw 0;
      const rings=new Set();for(const p of d.pigeons){if(!p.id||!p.ring||rings.has(p.ring))throw 1;rings.add(p.ring)}
      if(!await ask(`سيتم حذف البيانات الحالية واسترجاع ${fmtNum(d.pigeons.length)} حمامة. متابعة؟`)){ev.target.value='';return}
      const clean=d.pigeons.map(({name,color,breed,photoId,...r})=>r);
      await DB.replaceAll(clean,[]);toast('تم الاسترجاع بنجاح');route()
    }catch(x){er.textContent=x===1?'الملف يحوي بيانات مكررة أو ناقصة (رقم الدبلة).':'ملف غير صالح: ليس نسخة احتياطية من هذا التطبيق.';ev.target.value=''}};
}

route();
if('serviceWorker' in navigator)navigator.serviceWorker.register('sw.js').catch(()=>{});
