/* Relationship maths. M = Map(id -> pigeon). All functions are cycle-safe.
   kin(M): kinship coefficient phi (Malecot), inbreeding F = phi(father, mother), relationship r = 2phi/sqrt((1+Fa)(1+Fb)). */
import {fmtNum} from './util.js';
export const pct=x=>(x*100).toLocaleString('ar-EG',{maximumFractionDigits:2})+'٪';
/** Do a and b share parent k ('father'|'mother'), by registered id or by the same pending ring? */
export const sharesParent=(a,b,k)=>!!((a[k+'Id']&&a[k+'Id']===b[k+'Id'])||(a[k+'Ring']&&a[k+'Ring']===b[k+'Ring']));
/** BFS: ancestor id -> minimum generations away (self = 0). */
export function ancDist(M,id){const d=new Map([[id,0]]);let fr=[id],g=0;
  while(fr.length&&g<200){g++;const nx=[];for(const x of fr){const p=M.get(x);
    for(const q of[p?.fatherId,p?.motherId])if(q&&M.has(q)&&!d.has(q)){d.set(q,g);nx.push(q)}}fr=nx}return d}
export function kin(M){
  const dep=new Map(),vis=new Set(),memo=new Map();
  const depth=id=>{if(!id||!M.has(id))return -1;if(dep.has(id))return dep.get(id);if(vis.has(id))return 0;vis.add(id);
    const p=M.get(id),v=1+Math.max(depth(p.fatherId),depth(p.motherId));vis.delete(id);dep.set(id,v);return v};
  const phi=(a,b,n=0)=>{if(!a||!b||!M.has(a)||!M.has(b)||n>300)return 0;
    if(a!==b&&depth(a)<depth(b))[a,b]=[b,a];
    const key=a<b?a+'|'+b:b+'|'+a;if(memo.has(key))return memo.get(key);
    const p=M.get(a);let v;
    if(a===b)v=.5*(1+phi(p.fatherId,p.motherId,n+1));
    else v=.5*(phi(p.fatherId,b,n+1)+phi(p.motherId,b,n+1));
    memo.set(key,v);return v};
  const F=id=>{const p=M.get(id);return p?phi(p.fatherId,p.motherId):0};
  const r=(a,b)=>2*phi(a,b)/Math.sqrt((1+F(a))*(1+F(b)));
  return{phi,F,r};
}
/** Describe how pigeon a is related to pigeon b, using the nearest common ancestor. */
export function relate(M,a,b,K){
  if(a.id===b.id)return{label:'هذه نفس الحمامة',common:[]};
  const da=ancDist(M,a.id),db=ancDist(M,b.id);let best=null;
  for(const[id,x]of da){const y=db.get(id);if(y!==undefined&&(!best||x+y<best.x+best.y))best={x,y}}
  const common=[...da.keys()].filter(id=>db.has(id)&&id!==a.id&&id!==b.id).map(id=>M.get(id));
  if(!best)return{label:'لا توجد قرابة مسجلة بينهما',common,r:0};
  const{x,y}=best,m=a.sex==='M',n=k=>` (${fmtNum(k)} أجيال)`;
  const full=sharesParent(a,b,'father')&&sharesParent(a,b,'mother');
  let L;
  if(x===0)L=y===1?(m?'أب':'أم'):y===2?(m?'جد':'جدة'):(m?'جد':'جدة')+n(y);
  else if(y===0)L=x===1?(m?'ابن':'ابنة'):x===2?(m?'حفيد':'حفيدة'):(m?'حفيد':'حفيدة')+n(x);
  else if(x===1&&y===1)L=full?(m?'شقيق':'شقيقة'):(m?'أخ غير شقيق':'أخت غير شقيقة');
  else if(x===1)L=(m?'عم/خال':'عمة/خالة')+(y>2?` من الدرجة ${fmtNum(y-1)}`:'');
  else if(y===1)L=(m?'ابن':'ابنة')+' أخ/أخت'+(x>2?` من الدرجة ${fmtNum(x-1)}`:'');
  else L=(m?'ابن':'ابنة')+' عم/خال '+(x===y?`من الدرجة ${fmtNum(x-1)}`:'بدرجات مختلفة');
  return{label:`${a.ring} ${m?'هو':'هي'} ${L} لـ ${b.ring}`,common,r:K.r(a.id,b.id)};
}
