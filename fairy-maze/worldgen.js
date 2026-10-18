// Star Gate World generator (v2, 2D): pure, seeded, deterministic. Browser: window.WorldGen, Node: require().
// Rooms are 23x15 and share walls. A zone is a 2x2 block of rooms (45x29 cells). Zones sit on a 2D lattice and
// the zone path grows outward in any direction (up/down/left/right). Gate z sits in the wall between zone z and z+1.
(function(root){
'use strict';
const RW=23,RH=15,ZW=2*(RW-1)+1,ZHH=2*(RH-1)+1,SX=ZW-1,SY=ZHH-1; // zone stride in cells: 44 x 28
const THEMES=[
 {name:'Sunflower Meadow',emoji:'🌻',wall:'#e0a82e',floor:'rgba(255,220,90,.10)',bg:['#2a1f5c','#a0577a'],deco:'sunflower'},
 {name:'Moon Garden',emoji:'🌙',wall:'#6f86e0',floor:'rgba(170,190,255,.10)',bg:['#0d0b35','#2d2a78'],deco:'moon'},
 {name:'Rainbow Clouds',emoji:'🌈',wall:'#d46bd0',floor:'rgba(255,170,240,.10)',bg:['#2b1260','#7a3a9a'],deco:'cloud'},
 {name:'Candy Clouds',emoji:'🍭',wall:'#ff8fb8',floor:'rgba(255,200,225,.12)',bg:['#3a1450','#c2577f'],deco:'candy'},
 {name:'Seashell Cove',emoji:'🐚',wall:'#2fb7c2',floor:'rgba(120,230,230,.10)',bg:['#06264a','#0f6a80'],deco:'shell'},
 {name:'Snowflake Hills',emoji:'❄️',wall:'#8fb8e6',floor:'rgba(230,245,255,.12)',bg:['#1a2350','#5a6fa8'],deco:'snow'}];
const BASE=[5,8,12,15,20,25];
const price=z=>Math.min(100,z<BASE.length?BASE[z]:25+5*(z-5));
const margin=p=>Math.max(2,Math.ceil(p*0.15));
function rng(a){a>>>=0;return function(){a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
const mix=(seed,a,b)=>(seed^Math.imul(a+1,0x9E3779B1)^Math.imul(b+7,0x85EBCA6B))>>>0;
const D4=[[1,0],[-1,0],[0,1],[0,-1]];
// ---- zone path: outward self-avoiding walk (never moves inward, so it can never get stuck) ----
const pathCache=new Map();
function path(seed,n){let P=pathCache.get(seed);if(!P){P={pos:[[0,0]],idx:new Map([['0,0',0]])};pathCache.set(seed,P)}
  while(P.pos.length<n){const z=P.pos.length-1,[x,y]=P.pos[z],ring=Math.max(Math.abs(x),Math.abs(y)),rand=rng(mix(seed,z,1));
    const cand=D4.map(([dx,dy])=>[x+dx,y+dy]).filter(([a,b])=>!P.idx.has(a+','+b)&&Math.max(Math.abs(a),Math.abs(b))>=ring);
    if(!cand.length)throw new Error('zone path stuck');const nx=cand[Math.floor(rand()*cand.length)];P.idx.set(nx+'',P.pos.length);P.pos.push(nx)}
  return P}
const zonePos=(seed,z)=>path(seed,z+1).pos[z];
const zoneIndexAt=(seed,zx,zy,upto)=>{const P=path(seed,upto+1);const i=P.idx.get(zx+','+zy);return i===undefined||i>upto?-1:i};
// ---- wall openings between zones (global cell coords) ----
function edgeCell(A,B,rand){const dx=B[0]-A[0],dy=B[1]-A[1];
  if(dx){const c=(dx>0?A[0]+1:A[0])*SX,r=A[1]*SY+2*Math.floor(rand()*(SY/2))+1;return{r,c,a:[r,c-dx],b:[r,c+dx],side:dx>0?'right':'left'}}
  const r=(dy>0?A[1]+1:A[1])*SY,c=A[0]*SX+2*Math.floor(rand()*(SX/2))+1;return{r,c,a:[r-dy,c],b:[r+dy,c],side:dy>0?'down':'up'}}
// extra open passages between neighbouring zones that are both already unlocked (never bypass a gate)
function passages(seed,upto){const P=path(seed,upto+2),out=[];
  for(let a=0;a<=upto;a++){const [x,y]=P.pos[a];for(const [dx,dy] of D4){const b=P.idx.get((x+dx)+','+(y+dy));if(b===undefined||b<=a+1||b>upto)continue;out.push({...edgeCell(P.pos[a],P.pos[b],rng(mix(seed,a*1000+b,3))),za:a,zb:b})}}
  return out}
// ---- room carving ----
function carveRoom(rand,g,r0,c0){const cw=(RW-1)/2,ch=(RH-1)/2,ri=n=>Math.floor(rand()*n);
  const seen=new Set();let st=[[ri(cw),ri(ch)]];seen.add(st[0]+'');g[r0+st[0][1]*2+1][c0+st[0][0]*2+1]='.';let last=null;
  while(st.length){const [x,y]=st[st.length-1];const nb=D4.filter(([dx,dy])=>x+dx>=0&&x+dx<cw&&y+dy>=0&&y+dy<ch&&!seen.has([x+dx,y+dy]+''));
    if(!nb.length){st.pop();last=null;continue}
    const d=(last&&nb.some(n=>n[0]===last[0]&&n[1]===last[1])&&rand()<.6)?last:nb[ri(nb.length)];
    const nx=x+d[0],ny=y+d[1];g[r0+y*2+1+d[1]][c0+x*2+1+d[0]]='.';g[r0+ny*2+1][c0+nx*2+1]='.';seen.add([nx,ny]+'');st.push([nx,ny]);last=d}
  let loops=4+ri(3),t=0;
  while(loops&&t<3000){t++;const r=1+ri(RH-2),c=1+ri(RW-2),R=r0+r,C=c0+c;
    if(g[R][C]==='#'&&((r%2===1&&c%2===0&&g[R][C-1]==='.'&&g[R][C+1]==='.')||(r%2===0&&c%2===1&&g[R-1][C]==='.'&&g[R+1][C]==='.'))){g[R][C]='.';loops--}}
  for(let k=1+ri(2);k>0;k--){const [rw,rh]=[[3,3],[5,3],[3,5]][ri(3)];const rr=1+2*ri((RH-rh-1)/2|0),cc=1+2*ri((RW-rw-1)/2|0);
    for(let r=rr;r<rr+rh&&r<RH-1;r++)for(let c=cc;c<cc+rw&&c<RW-1;c++)g[r0+r][c0+c]='.'}}
function bfs(g,s){const d=new Map([[s+'',0]]),q=[s];for(let i=0;i<q.length;i++){const [r,c]=q[i];for(const [a,b] of D4){const n=[r+a,c+b];if(n[0]>0&&n[0]<ZHH-1&&n[1]>0&&n[1]<ZW-1&&g[n[0]][n[1]]!=='#'&&!d.has(n+'')){d.set(n+'',d.get(r+','+c)+1);q.push(n)}}}return d}
// ---- difficulty cap: never harder than Zone 2 of the original (v1) world ----
// measured over 300 seeds of v1 zone 2 (medians): route start->black hole 120 steps, 20 dead ends, 26 junctions on the route; same room size (4 rooms of 23x15)
const CAP={pathLen:120,deadEnds:20,pathJunctions:26,holeToGate:5};
const FRIENDS=[
 {name:'Pip',dress:'#7fe0a0',hair:'#c8742f',skin:'#f7d1b0'},{name:'Luna',dress:'#b48cff',hair:'#f3e3b0',skin:'#ffe0c7'},
 {name:'Bloom',dress:'#ff9ad5',hair:'#3b2516',skin:'#9c6440'},{name:'Dewdrop',dress:'#6fd0ff',hair:'#1c1410',skin:'#d9a077'},
 {name:'Sunny',dress:'#ffd24d',hair:'#d9822b',skin:'#ecbd96'},{name:'Coco',dress:'#ffa64d',hair:'#6b3e1e',skin:'#7a482b'},
 {name:'Pearl',dress:'#ffffff',hair:'#ffd84d',skin:'#ffe0c7'},{name:'Willow',dress:'#3fd48a',hair:'#a0522d',skin:'#bf8159'},
 {name:'Maple',dress:'#ff6b6b',hair:'#7a4a25',skin:'#f7d1b0'},{name:'Bubbles',dress:'#8fe0ff',hair:'#ff8fcf',skin:'#d9a077'},
 {name:'Clover',dress:'#9dffad',hair:'#3b2516',skin:'#57311d'},{name:'Tinkle',dress:'#ff8fb8',hair:'#1c1410',skin:'#ecbd96'}];
function metrics(g,entry,goal){const H=g.length,W=g[0].length,op=(r,c)=>r>0&&c>0&&r<H-1&&c<W-1&&g[r][c]!=='#';
  const d=new Map([[entry+'',0]]),prev=new Map(),q=[entry];for(let i=0;i<q.length;i++){const [r,c]=q[i];for(const [a,b] of D4){const n=[r+a,c+b];if(op(n[0],n[1])&&!d.has(n+'')){d.set(n+'',d.get(r+','+c)+1);prev.set(n+'',[r,c]);q.push(n)}}}
  let dead=0,junc=0,open=0;for(let r=1;r<H-1;r++)for(let c=1;c<W-1;c++)if(op(r,c)){open++;const k=D4.filter(([a,b])=>op(r+a,c+b)).length;if(k===1)dead++;if(k>=3)junc++}
  let pj=0;const route=[];let p=goal;while(p&&d.has(p+'')){route.push(p);if(p+''===entry+'')break;if(D4.filter(([a,b])=>op(p[0]+a,p[1]+b)).length>=3)pj++;p=prev.get(p+'')}
  return{pathLen:d.has(goal+'')?d.get(goal+''):Infinity,deadEnds:dead,junctions:junc,pathJunctions:pj,open,route,dist:d}}
// ---- a zone (local coords; global = local + [r0,c0]) ----
const zoneCache=new Map();
function gate(seed,z){return zone(seed,z).gate}
function zone(seed,z){const key=seed+':'+z;if(zoneCache.has(key))return zoneCache.get(key);
  if(zoneCache.size>400)zoneCache.delete(zoneCache.keys().next().value);
  const Z=makeZone(seed,z);zoneCache.set(key,Z);return Z}
function makeZone(seed,z){const [zx,zy]=zonePos(seed,z),[nx,ny]=zonePos(seed,z+1),r0=zy*SY,c0=zx*SX,L=([r,c])=>[r-r0,c-c0];
  const entry=z===0?[RH-2,RW-2]:L(gate(seed,z-1).b);
  for(let salt=0;salt<40;salt++){const rand=rng(mix(seed,z,100+salt)),ri=n=>Math.floor(rand()*n);
    const g=Array.from({length:ZHH},()=>Array(ZW).fill('#'));
    for(let j=0;j<2;j++)for(let i=0;i<2;i++)carveRoom(rand,g,j*(RH-1),i*(RW-1));
    const odd=(n)=>{const a=[];for(let v=1;v<n-1;v+=2)a.push(v);return a};
    for(let j=0;j<2;j++){const rows=odd(RH);for(let k=0;k<2;k++){const r=rows.splice(ri(rows.length),1)[0];g[j*(RH-1)+r][RW-1]='.'}}
    for(let i=0;i<2;i++){const cols=odd(RW);for(let k=0;k<2;k++){const c=cols.splice(ri(cols.length),1)[0];g[RH-1][i*(RW-1)+c]='.'}}
    // braid dead ends down to the cap (adds gentle loops, never adds difficulty)
    const op=(r,c)=>r>0&&c>0&&r<ZHH-1&&c<ZW-1&&g[r][c]!=='#';
    const deads=()=>{const a=[];for(let r=1;r<ZHH-1;r++)for(let c=1;c<ZW-1;c++)if(op(r,c)&&D4.filter(([x,y])=>op(r+x,c+y)).length===1)a.push([r,c]);return a};
    for(let guard=0;guard<200;guard++){const de=deads();if(de.length<=CAP.deadEnds)break;const [r,c]=de[ri(de.length)];
      const opts=D4.filter(([x,y])=>!op(r+x,c+y)&&op(r+2*x,c+2*y)&&r+x>0&&c+y>0&&r+x<ZHH-1&&c+y<ZW-1);if(opts.length){const [x,y]=opts[ri(opts.length)];g[r+x][c+y]='.'}}
    const base=metrics(g,entry,entry);if(base.deadEnds>CAP.deadEnds)continue;const dist=base.dist;
    // gate: on the wall facing the next zone, as far along as allowed, with the main black hole right next to it
    const dx=nx-zx,dy=ny-zy,cands=[];
    if(dx){const lc=dx>0?ZW-1:0;for(const r of odd(ZHH))cands.push({a:[r,lc-(dx>0?1:-1)],w:[r,lc],b:[r,lc+(dx>0?1:-1)]})}
    else{const lr=dy>0?ZHH-1:0;for(const c of odd(ZW))cands.push({a:[lr-(dy>0?1:-1),c],w:[lr,c],b:[lr+(dy>0?1:-1),c]})}
    const okc=cands.filter(q=>dist.has(q.a+'')&&dist.get(q.a+'')<=CAP.pathLen-2).sort((p,q)=>dist.get(q.a+'')-dist.get(p.a+'')||rand()-.5);
    let pick=null;
    for(const q of okc.slice(0,12)){const dg=metrics(g,q.a,q.a).dist;
      const near=[...dg.entries()].filter(([kk,v])=>v>=2&&v<=4).map(([kk])=>kk.split(',').map(Number)).filter(p=>p+''!==entry+''&&dist.get(p+'')<=CAP.pathLen);
      near.sort((p,qq)=>(D4.filter(([x,y])=>op(qq[0]+x,qq[1]+y)).length===1)-(D4.filter(([x,y])=>op(p[0]+x,p[1]+y)).length===1)||dist.get(qq+'')-dist.get(p+''));
      for(const h of near){const m=metrics(g,entry,h);if(m.pathLen<=CAP.pathLen&&m.pathJunctions<=CAP.pathJunctions){pick={q,h,m};break}}
      if(pick)break}
    if(!pick)continue;
    const gateFront=pick.q.a,mainHole=pick.h,route=new Set(pick.m.route.map(p=>p+''));
    const busy=new Set([entry+'',gateFront+'',mainHole+'']);
    const isDead=([r,c])=>D4.filter(([a,b])=>op(r+a,c+b)).length===1;
    const open=[];for(let r=1;r<ZHH-1;r++)for(let c=1;c<ZW-1;c++)if(op(r,c))open.push([r,c]);
    const holes=[mainHole];
    if(z>0&&rand()<.5){const mr=Math.floor((mainHole[0]-1)/(RH-1))*2+Math.floor((mainHole[1]-1)/(RW-1));
      const far=open.filter(q=>isDead(q)&&!busy.has(q+'')&&dist.get(q+'')<=CAP.pathLen&&Math.floor((q[0]-1)/(RH-1))*2+Math.floor((q[1]-1)/(RW-1))!==mr).sort((a,b)=>dist.get(b+'')-dist.get(a+''));
      if(far.length){holes.push(far[0]);busy.add(far[0]+'')}}
    // tea nook: a cozy dead end just off the main route (2-6 steps away), friend waits there
    const fromRoute=new Map();{const q=[];for(const p of pick.m.route){fromRoute.set(p+'',0);q.push(p)}for(let i=0;i<q.length;i++){const [r,c]=q[i];for(const [a,b] of D4){const n=[r+a,c+b];if(op(n[0],n[1])&&!fromRoute.has(n+'')){fromRoute.set(n+'',fromRoute.get(r+','+c)+1);q.push(n)}}}}
    const mid=pick.m.pathLen/2;
    const nooks=open.filter(q=>isDead(q)&&!busy.has(q+'')&&fromRoute.get(q+'')>=2&&fromRoute.get(q+'')<=6&&dist.get(q+'')<=CAP.pathLen).sort((a,b)=>Math.abs(dist.get(a+'')-mid)-Math.abs(dist.get(b+'')-mid));
    if(!nooks.length)continue;const nook=nooks[0];busy.add(nook+'');
    const p=price(z),n=p+margin(p)+ri(4);
    const cand=open.filter(q=>!busy.has(q+''));for(let i=cand.length-1;i>0;i--){const j=ri(i+1);[cand[i],cand[j]]=[cand[j],cand[i]]}
    cand.sort((a,b)=>(isDead(b)?1:0)-(isDead(a)?1:0));
    const stars=[],taken=new Set();
    for(const sp of [3,2,0])for(const q of cand){if(stars.length>=n)break;if(taken.has(q+''))continue;if(sp&&stars.some(s=>Math.abs(s[0]-q[0])+Math.abs(s[1]-q[1])<sp))continue;stars.push(q);taken.add(q+'')}
    const G_={r:pick.q.w[0]+r0,c:pick.q.w[1]+c0,a:[gateFront[0]+r0,gateFront[1]+c0],b:[pick.q.b[0]+r0,pick.q.b[1]+c0],side:dx>0?'right':dx<0?'left':dy>0?'down':'up'};
    const Z={z,seed,zx,zy,r0,c0,grid:g.map(r=>r.join('')),entry,gateFront,gate:G_,gateSide:G_.side,price:p,stars,holes,nook,friend:z%FRIENDS.length,theme:z%THEMES.length,
      difficulty:{pathLen:pick.m.pathLen,deadEnds:base.deadEnds,pathJunctions:pick.m.pathJunctions,junctions:base.junctions,open:base.open}};
    if(!check(Z).length)return Z}
  throw new Error('zone generation failed z='+z)}
// reachability + difficulty cap + black hole next to the gate
function check(Z){const errs=[],g=Z.grid,d=bfs(g,Z.entry);
  if(g[Z.entry[0]][Z.entry[1]]==='#')errs.push('entry blocked');
  if(!d.has(Z.gateFront+''))errs.push('gate unreachable');
  Z.stars.forEach(s=>{if(!d.has(s+''))errs.push('star unreachable '+s)});
  Z.holes.forEach(s=>{if(!d.has(s+''))errs.push('black hole unreachable '+s)});
  if(!d.has(Z.nook+''))errs.push('tea nook unreachable');
  if(Z.stars.length<Z.price+margin(Z.price))errs.push(`only ${Z.stars.length} stars for price ${Z.price}`);
  const hg=bfs(g,Z.holes[0]).get(Z.gateFront+'');if(!(hg<=CAP.holeToGate))errs.push('main black hole too far from gate: '+hg);
  const m=metrics(g,Z.entry,Z.holes[0]);
  if(m.pathLen>CAP.pathLen)errs.push('route too long '+m.pathLen);if(m.deadEnds>CAP.deadEnds)errs.push('too many dead ends '+m.deadEnds);if(m.pathJunctions>CAP.pathJunctions)errs.push('too many junctions on route '+m.pathJunctions);
  return errs}
function guarantee(seed,Zmax){const out=[];let avail=0;for(let z=0;z<Zmax;z++){const Z=zone(seed,z);avail+=Z.stars.length;const need=Z.price+margin(Z.price);out.push({z,pos:[Z.zx,Z.zy],side:Z.gateSide,diff:Z.difficulty,holeToGate:bfs(Z.grid,Z.holes[0]).get(Z.gateFront+''),price:Z.price,stars:Z.stars.length,available:avail,need,ok:avail>=need,errors:check(Z)});avail-=Z.price}return out}
const API={version:3,RW,RH,ZW,ZHH,SX,SY,THEMES,FRIENDS,CAP,price,margin,path,zonePos,zoneIndexAt,gate,passages,zone,check,guarantee,metrics};
if(typeof module!=='undefined'&&module.exports)module.exports=API;else root.WorldGen=API;
})(typeof window!=='undefined'?window:globalThis);
