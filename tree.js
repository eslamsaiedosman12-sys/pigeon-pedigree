/* Pedigree (ancestry) tree: unlimited depth, SVG, pan/zoom (wheel, drag, pinch, buttons), clickable nodes.
   Layout: root on the right (RTL), ancestors extend left. Leaves get consecutive rows; parents are centred on their children.
   Unknown / unregistered parents are drawn as dashed placeholders and not expanded. Cycles (bad restored data) are cut safely. */
import {esc,fmtNum} from './util.js';
const W=150,H=46,GAP=50,ROW=62,MAXN=2500;
const parOf=(p,k)=>{const id=p[k+'Id'];return id&&M_.get(id)?{p:M_.get(id)}:{ring:p[k+'Ring']}};
let M_;
export function renderTree(app,M,id,mode='anc'){
  M_=M;const root=M.get(id);
  if(!root){app.innerHTML=`<div class="card empty"><h2>الحمامة غير موجودة</h2><a class="btn" href="#/pigeons">العودة للقائمة</a></div>`;return}
  const nodes=[],seen=new Set();let leaf=0,maxD=0;
  function place(it,d,path){
    const n={it,d,kids:[]};nodes.push(n);maxD=Math.max(maxD,d);const p=it.p;
    if(p&&path.has(p.id)){n.it={ring:p.ring};n.warn=true}
    else if(p){seen.add(p.id);const np=new Set(path).add(p.id),f=parOf(p,'father'),m=parOf(p,'mother');
      if(mode==='desc'){if(nodes.length<MAXN)n.kids=[...M.values()].filter(c=>c.fatherId===p.id||c.motherId===p.id).sort((a,b)=>(a.birth||'').localeCompare(b.birth||'')||a.ring.localeCompare(b.ring)).map(c=>place({p:c},d+1,np))}
      else if((f.p||f.ring||m.p||m.ring)&&nodes.length<MAXN)n.kids=[place(f,d+1,np),place(m,d+1,np)]}
    n.y=n.kids.length?(n.kids[0].y+n.kids[n.kids.length-1].y)/2:leaf++*ROW;return n}
  place({p:root},0,new Set());
  const S=W+GAP,X=n=>(maxD-n.d)*S,tw=(maxD+1)*S-GAP,th=Math.max(leaf,1)*ROW;
  let edges='',nds='';
  for(const n of nodes){
    for(const k of n.kids)edges+=`<path d="M${X(n)} ${n.y+H/2}C${X(n)-25} ${n.y+H/2} ${X(k)+W+25} ${k.y+H/2} ${X(k)+W} ${k.y+H/2}"/>`;
    const p=n.it.p,cls=p?(p.sex==='F'?'F':'M')+(n.d===0?' root':''):'ghost';
    nds+=`<g class="nd ${cls}" ${p?`data-id="${p.id}"`:''} transform="translate(${X(n)} ${n.y})"><rect width="${W}" height="${H}" rx="8"/>`+
      (p?`<text x="${W/2}" y="19"><tspan font-weight="700">${esc(p.ring)}</tspan></text><text x="${W/2}" y="36" class="sub">${esc(p.name)||(p.sex==='F'?'أنثى':'ذكر')}</text>`
        :`<text x="${W/2}" y="19">${esc(n.it.ring)||'غير معروف'}</text><text x="${W/2}" y="36" class="sub">${n.warn?'⚠ حلقة في النسب':n.it.ring?'غير مسجل بعد':'—'}</text>`)+`</g>`}
  app.innerHTML=`<h1>${mode==='desc'?'شجرة الأبناء':'شجرة النسب'}: ${esc(root.ring)}</h1>
   <div class="row" style="margin-bottom:.6rem"><a class="btn ghost" href="#/p/${root.id}">التفاصيل</a><a class="btn ghost" href="#/pigeons">القائمة</a><a class="btn gold" href="#/${mode==='desc'?'tree':'desc'}/${root.id}">${mode==='desc'?'شجرة النسب':'شجرة الأبناء'}</a>
   <span style="flex:1"></span><button class="btn" data-z="1.25">＋</button><button class="btn" data-z="0.8">－</button><button class="btn ghost" data-z="0">ملاءمة</button></div>
   <p style="color:#6b7280;margin:.2rem 0">${fmtNum(maxD)} جيل — ${fmtNum(seen.size-1)} ${mode==='desc'?'من النسل':'سلف'} مسجّل.${mode==='desc'&&nodes.length===1?' لا يوجد أبناء مسجلون بعد.':''} اسحب للتحريك، وكبّر بعجلة الماوس أو بإصبعين، واضغط على أي حمامة لعرض نسبها.</p>
   <svg class="tree" id="tsvg"><g id="vp">${edges}${nds}</g></svg>`;
  const svg=document.getElementById('tsvg'),g=document.getElementById('vp');let k=1,tx=0,ty=0;
  const apply=()=>g.setAttribute('transform',`translate(${tx} ${ty}) scale(${k})`);
  const zoomAt=(f,cx,cy)=>{const nk=Math.min(3,Math.max(.08,k*f));f=nk/k;tx=cx-(cx-tx)*f;ty=cy-(cy-ty)*f;k=nk;apply()};
  const cw=()=>svg.clientWidth||800,ch=()=>svg.clientHeight||500;
  const fit=()=>{k=Math.min(1,cw()/(tw+40),ch()/(th+H+40));k=Math.max(k,.08);tx=(cw()-tw*k)/2;ty=(ch()-(th+H)*k)/2;apply()};
  fit();
  app.querySelectorAll('[data-z]').forEach(b=>b.onclick=()=>+b.dataset.z?zoomAt(+b.dataset.z,cw()/2,ch()/2):fit());
  svg.addEventListener('wheel',e=>{e.preventDefault();const r=svg.getBoundingClientRect();zoomAt(e.deltaY<0?1.15:1/1.15,e.clientX-r.left,e.clientY-r.top)},{passive:false});
  const ptr=new Map();let moved=0,downEl=null,pd=0;
  svg.onpointerdown=e=>{svg.setPointerCapture(e.pointerId);ptr.set(e.pointerId,[e.clientX,e.clientY]);if(ptr.size===1){moved=0;downEl=e.target}
    if(ptr.size===2){const[a,b]=[...ptr.values()];pd=Math.hypot(a[0]-b[0],a[1]-b[1]);moved=99}};
  svg.onpointermove=e=>{const o=ptr.get(e.pointerId);if(!o)return;
    if(ptr.size===1){tx+=e.clientX-o[0];ty+=e.clientY-o[1];moved+=Math.abs(e.clientX-o[0])+Math.abs(e.clientY-o[1]);apply()}
    ptr.set(e.pointerId,[e.clientX,e.clientY]);
    if(ptr.size===2){const[a,b]=[...ptr.values()],d=Math.hypot(a[0]-b[0],a[1]-b[1]),r=svg.getBoundingClientRect();
      if(pd)zoomAt(d/pd,(a[0]+b[0])/2-r.left,(a[1]+b[1])/2-r.top);pd=d}};
  svg.onpointerup=svg.onpointercancel=e=>{ptr.delete(e.pointerId);pd=0;
    if(e.type==='pointerup'&&moved<6){const t=downEl?.closest?.('[data-id]');if(t)location.hash='#/'+(mode==='desc'?'desc':'tree')+'/'+t.dataset.id}};
}
