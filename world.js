// Star Gate World: endless open world of connected maze rooms, gates bought with stars, saved per slot.
(()=>{
'use strict';
const $=id=>document.getElementById(id), Core=window.__fmCore, G=window.WorldGen;
if(!Core||!G)return;
const {RW,RH,SX,SY,THEMES}=G, SLOTS=3, cv=$('c');
let ctx=cv.getContext('2d');
const KEY=i=>'fm_world_'+i;
const load=i=>{try{return JSON.parse(localStorage.getItem(KEY(i))||'null')}catch(e){return null}};
const store=(i,d)=>{try{localStorage.setItem(KEY(i),JSON.stringify(d))}catch(e){}};
let D=null,slot=-1,zones=new Map(),active=false,mode='walk',speed=1;
let F={r:1,c:1,x:1,y:1,path:[],dir:1,bump:0,bx:0,by:0,cheek:0},cell=40,camX=0,camY=0,top=70,W=0,H=0,dpr=1;
let following=[],trail=[],scene=null,flyoff=[];
let collected=new Set(),eaten=new Set(),parts=[],flyers=[],banner=null,cele=null,curRoom=null,keyDir=null,target=null,down=false,lastPtr=null,lastBump=0,popBlock=false,saveT=0;
const zoneOf=z=>{if(!zones.has(z))zones.set(z,G.zone(D.seed,z));return zones.get(z)};
// ---------- world cells (2D) ----------
let bnd=new Map(); // wall-line openings: gates and passages, keyed "r,c"
function rebuild(){bnd=new Map();for(let z=0;z<=D.opened;z++){const g=G.gate(D.seed,z);bnd.set(g.r+','+g.c,{type:'gate',z,r:g.r,c:g.c,side:g.side})}
  for(const p of G.passages(D.seed,D.opened))bnd.set(p.r+','+p.c,{type:'pass',r:p.r,c:p.c})}
const zIdx=(zx,zy)=>G.zoneIndexAt(D.seed,zx,zy,D.opened+1);
const open_=z=>z>=0&&z<=D.opened;
function cellAt(r,c){const zx=Math.floor(c/SX),zy=Math.floor(r/SY),lc=c-zx*SX,lr=r-zy*SY;
  if(lc===0||lr===0){const b=bnd.get(r+','+c);if(b){if(b.type==='pass')return'.';return b.z<D.opened?'.':'G'}return'#'}
  const z=zIdx(zx,zy);if(!open_(z))return'#';const Z=zoneOf(z);return Z.grid[lr][lc]}
// theme index of a drawable cell, or -1 for empty space (unexplored)
function themeAt(r,c){const zx=Math.floor(c/SX),zy=Math.floor(r/SY),lc=c-zx*SX,lr=r-zy*SY;
  const t=(x,y)=>{const z=zIdx(x,y);return open_(z)?zoneOf(z).theme:-1};
  if(lc&&lr)return t(zx,zy);
  if(!lc&&lr){const a=t(zx,zy);return a>=0?a:t(zx-1,zy)}
  if(lc&&!lr){const a=t(zx,zy);return a>=0?a:t(zx,zy-1)}
  for(const [x,y] of [[zx,zy],[zx-1,zy],[zx,zy-1],[zx-1,zy-1]]){const a=t(x,y);if(a>=0)return a}return -1}
const passable=(r,c)=>{const ch=cellAt(r,c);return ch!=='#'&&ch!=='G'};
const k=(r,c)=>r+','+c;
function zoneStars(z){const Z=zoneOf(z);return Z.stars.map(([r,c])=>[r+Z.r0,c+Z.c0])}
function zoneHoles(z){const Z=zoneOf(z);return Z.holes.map(([r,c])=>[r+Z.r0,c+Z.c0])}
function zoneAtCell(r,c){const zx=Math.floor(c/SX),zy=Math.floor(r/SY);if(c-zx*SX===0||r-zy*SY===0)return -1;const z=zIdx(zx,zy);return open_(z)?z:-1}
function starAt(r,c){const z=zoneAtCell(r,c);if(z<0)return false;const Z=zoneOf(z);return Z.stars.some(s=>s[0]+Z.r0===r&&s[1]+Z.c0===c)&&!collected.has(k(r,c))}
function holeAt(r,c){const z=zoneAtCell(r,c);if(z<0)return false;const Z=zoneOf(z);return Z.holes.some(s=>s[0]+Z.r0===r&&s[1]+Z.c0===c)&&!eaten.has(k(r,c))}
function roomOf(r,c){const rx=Math.floor((c-1)/(RW-1)),ry=Math.floor((r-1)/(RH-1));const zx=Math.floor(rx/2),zy=Math.floor(ry/2);return{rx,ry,z:zIdx(zx,zy),n:(rx-2*zx)+2*(ry-2*zy)+1}}
// ---------- saving ----------
function newWorld(i){const seed=(Math.random()*4294967295)>>>0;const Z=G.zone(seed,0);D={v:3,seed,opened:0,collected:[],eaten:[],met:[],following:[],party:[],pos:[Z.entry[0]+Z.r0,Z.entry[1]+Z.c0],stars:0,total:0,holes:0,created:Date.now(),updated:Date.now()};store(i,D);return D}
// older (v1, one-row) saves: keep seed, unlocked gates and all counters; stars/black holes of finished zones count as done; resume at the current zone's entrance
// v2 (2D layout, never released) -> v3 only adds fairy friends; v1 goes through both steps. Nothing is ever wiped.
function migrate(d){if(!d||typeof d!=='object')return d;
  if(!(d.v>=2)){const n={...d,v:2,seed:d.seed>>>0,opened:Math.max(0,d.opened|0),stars:Math.max(0,d.stars|0),total:Math.max(0,d.total|0),holes:Math.max(0,d.holes|0),collected:[],eaten:[]};
    for(let z=0;z<n.opened;z++){const Z=G.zone(n.seed,z);Z.stars.forEach(([r,c])=>n.collected.push((r+Z.r0)+','+(c+Z.c0)));Z.holes.forEach(([r,c])=>n.eaten.push((r+Z.r0)+','+(c+Z.c0)))}
    const Z=G.zone(n.seed,n.opened);n.pos=[Z.entry[0]+Z.r0,Z.entry[1]+Z.c0];n.migratedFrom=1;d=n}
  if(d.v===2){d={...d,v:3,met:[],following:[],party:[]};
    // friends in zones she has already finished are waiting at the tea party
    for(let z=0;z<d.opened;z++){d.met.push(z);d.party.push(G.zone(d.seed,z).friend)}}
  d.met=Array.isArray(d.met)?d.met:[];d.following=Array.isArray(d.following)?d.following.slice(0,4):[];d.party=Array.isArray(d.party)?d.party:[];
  return d}
function save(now){if(!D||slot<0)return;D.pos=[F.r,F.c];D.collected=[...collected];D.eaten=[...eaten];D.following=following.slice();D.updated=Date.now();store(slot,D);saveT=now||performance.now()}
// ---------- HUD ----------
function hud(pop){const R=roomOf(F.r,F.c),z=Math.max(0,R.z);$('wZone').textContent=`${THEMES[zoneOf(z).theme].emoji} Zone ${z+1}`;$('wStars').textContent='⭐ '+D.stars;$('wTotal').textContent='🌟 '+D.total;$('wHoles').textContent='🍩 '+D.holes;$('wTea').textContent='🧚 '+D.party.length;
  if(pop){const e=$(pop);e.classList.add('pop');setTimeout(()=>e.classList.remove('pop'),180)}}
// ---------- slot screen ----------
function slotsScreen(){Core.setState('worlds');Core.show('worlds');const S=$('slots');S.innerHTML='';
  for(let i=0;i<SLOTS;i++){const d=load(i),el=document.createElement('div');el.className='slot';
    if(!d){el.innerHTML=`<div class="se">✨</div><div class="sn">World ${i+1}</div><button class="play">✨ New World</button>`;el.querySelector('button').onclick=()=>{Core.ac();newWorld(i);start(i)}}
    else{const dd=migrate(d);const pz=(()=>{const rx=Math.floor((dd.pos[1]-1)/(RW-1)),ry=Math.floor((dd.pos[0]-1)/(RH-1));const z=G.zoneIndexAt(dd.seed,Math.floor(rx/2),Math.floor(ry/2),dd.opened);return z<0?dd.opened:z})();const th=THEMES[pz%THEMES.length];
      el.innerHTML=`<div class="se">${th.emoji}</div><div class="sn">World ${i+1}</div><div class="st">${th.name}</div><div class="sc"><span>🚪 Zone ${pz+1}</span><span>⭐ ${d.stars}</span><span>🌟 ${d.total}</span><span>🍩 ${d.holes}</span></div><button class="play go">▶ Go!</button><button class="mini again">🔄 New world here</button>`;
      el.querySelector('.go').onclick=()=>{Core.ac();start(i)};
      el.querySelector('.again').onclick=()=>{el.innerHTML=`<div class="se">🦋</div><div class="sn" style="font-size:24px">Start a brand new world here?</div><div class="st">This world will fly away.</div><div class="row"><button class="yes">✅ Yes</button><button class="no">💛 Keep it</button></div>`;
        el.querySelector('.yes').onclick=()=>{newWorld(i);slotsScreen()};el.querySelector('.no').onclick=()=>slotsScreen()}}
    S.appendChild(el)}}
$('worldBtn').onclick=()=>{Core.ac();Core.saveName();slotsScreen()};
$('worldsBack').onclick=()=>{Core.setState('menu');Core.show('start')};
$('wHome').onclick=()=>stop();
// ---------- start / stop ----------
function start(i){slot=i;D=migrate(load(i))||newWorld(i);store(i,D);zones=new Map();collected=new Set(D.collected);eaten=new Set(D.eaten);following=D.following.slice();flyoff=[];scene=null;
  for(let z=0;z<=D.opened;z++)zoneOf(z);rebuild();
  F={r:D.pos[0],c:D.pos[1],x:D.pos[1],y:D.pos[0],path:[],dir:1,bump:0,bx:0,by:0,cheek:0};
  if(!passable(F.r,F.c)){const Z=zoneOf(D.opened);F.r=F.y=Z.entry[0]+Z.r0;F.c=F.x=Z.entry[1]+Z.c0}
  trail=[{x:F.x,y:F.y}];parts=[];flyers=[];cele=null;mode='walk';keyDir=null;target=null;curRoom=null;camRoom=null;popBlock=false;
  Core.setState('world');Core.show('__world');$('whud').classList.add('on');active=true;layout();roomCheck(true);snap();hud();last=performance.now();requestAnimationFrame(loop)}
function stop(){save();active=false;$('whud').classList.remove('on');$('gatePop').classList.remove('on');Core.setState('menu');Core.show('start')}
// ---------- layout & camera ----------
function layout(){dpr=Math.min(2,devicePixelRatio||1);W=innerWidth;H=innerHeight;cv.width=W*dpr;cv.height=H*dpr;ctx.setTransform(dpr,0,0,dpr,0,0);
  top=Math.min(76,H*.1);cell=Math.round(Math.max(32,Math.min(48,Math.floor(Math.min((W-8)/RW,(H-top-8)/RH)))))}
addEventListener('resize',()=>{if(active){layout();snap()}});
let camRoom=null;
function camTarget(){const vw=W,vh=H-top-6,R=camRoom||roomOf(F.r,F.c);const x0=R.rx*(RW-1)*cell,x1=x0+RW*cell,y0=R.ry*(RH-1)*cell,y1=y0+RH*cell;const fx=(F.x+.5)*cell,fy=(F.y+.5)*cell;
  const ax=(lo,hi,f,v)=>hi-lo<=v?(lo+hi)/2-v/2:Math.max(lo,Math.min(hi-v,f-v/2));return[ax(x0,x1,fx,vw),ax(y0,y1,fy,vh)]}
function snap(){[camX,camY]=camTarget()}
const OX=()=>Math.round(-camX),OY=()=>Math.round(top-camY);
function roomCheck(silent){const R=roomOf(F.r,F.c);const id=R.rx+':'+R.ry;if(id===curRoom)return;
  if(curRoom){const [x,y]=curRoom.split(':').map(Number);const r0=y*(RH-1),c0=x*(RW-1);if(F.r>r0&&F.r<r0+RH-1&&F.c>c0&&F.c<c0+RW-1)return}
  curRoom=id;camRoom=R;const th=THEMES[zoneOf(Math.max(0,R.z)).theme];banner={text:`${th.emoji} ${th.name} · ${Math.max(0,R.z)+1}-${R.n}`,t:performance.now()/1000};hud();
  if(!silent){[784,1047,1319].forEach((f,j)=>tone(f,j*.07,.35,.08))}}
function tone(f,t0,dur,vol){Core.SND&&Core.ac();const a=Core.ac();if(!a)return;const o=a.createOscillator(),g=a.createGain();o.type='triangle';o.frequency.value=f;g.gain.setValueAtTime(0,a.currentTime+t0);g.gain.linearRampToValueAtTime(vol,a.currentTime+t0+.01);g.gain.exponentialRampToValueAtTime(.001,a.currentTime+t0+dur);o.connect(g).connect(a.destination);o.start(a.currentTime+t0);o.stop(a.currentTime+t0+dur+.05)}
// ---------- input ----------
const KEYS={ArrowUp:[-1,0],ArrowDown:[1,0],ArrowLeft:[0,-1],ArrowRight:[0,1]};
addEventListener('keydown',e=>{if(active&&scene&&performance.now()/1000-scene.t0>.4){skipScene();e.preventDefault();return}if(!active||mode!=='walk'||!KEYS[e.key])return;keyDir=KEYS[e.key];target=null;e.preventDefault();Core.ac()});
addEventListener('keyup',e=>{if(KEYS[e.key]&&keyDir===KEYS[e.key])keyDir=null});
const toCell=e=>({r:(e.clientY-OY())/cell-.5,c:(e.clientX-OX())/cell-.5});
cv.addEventListener('pointerdown',e=>{if(active&&scene){if(performance.now()/1000-scene.t0>.3)skipScene();return}if(!active||mode!=='walk')return;down=true;Core.ac();lastPtr={clientX:e.clientX,clientY:e.clientY};target=toCell(e);keyDir=null;try{cv.setPointerCapture(e.pointerId)}catch(_){}});
cv.addEventListener('pointermove',e=>{if(active&&down){lastPtr={clientX:e.clientX,clientY:e.clientY}}});
const up=()=>{down=false};cv.addEventListener('pointerup',up);cv.addEventListener('pointercancel',up);
function bump(dr,dc){const now=performance.now();if(cellAt(F.r+dr,F.c+dc)==='G'){gateAsk(dr,dc);return}if(now-lastBump<450)return;lastBump=now;F.bump=1;F.bx=dc;F.by=dr;Core.SND.bump()}
function step(){
  if(keyDir){const [dr,dc]=keyDir;if(passable(F.r+dr,F.c+dc))return keyDir;bump(dr,dc);return null}
  if(target){const dy=target.r-F.r,dx=target.c-F.c;if(Math.abs(dx)<.5&&Math.abs(dy)<.5){if(!down)target=null;return null}
    const o=[],sx=Math.sign(dx),sy=Math.sign(dy);if(Math.abs(dx)>=Math.abs(dy)){if(Math.abs(dx)>=.5)o.push([0,sx]);if(Math.abs(dy)>=.5)o.push([sy,0])}else{if(Math.abs(dy)>=.5)o.push([sy,0]);if(Math.abs(dx)>=.5)o.push([0,sx])}
    for(const d of o)if(passable(F.r+d[0],F.c+d[1]))return d;if(o.length)bump(o[0][0],o[0][1]);if(!down)target=null;return null}
  return null}
// ---------- gates ----------
let gateZ=-1,popUntil=0;
function gateAsk(dr,dc){if(mode!=='walk')return;const gb=bnd.get(k(F.r+dr,F.c+dc));if(!gb||gb.type!=='gate')return;if(performance.now()<popUntil){const now=performance.now();if(now-lastBump>450){lastBump=now;F.bump=1;F.bx=dc;F.by=dr;Core.SND.bump()}return}const zz=gb.z;gateZ=zz;const p=zoneOf(zz).price;mode='popup';keyDir=null;target=null;down=false;
  const pop=$('gatePop'),btns=$('gpBtns');btns.innerHTML='';
  if(D.stars>=p){$('gpIcon').textContent='🚪✨';$('gpText').innerHTML=`Open for ${p} ⭐?`;
    const y=document.createElement('button');y.className='yes';y.textContent='✅ Yes!';y.onclick=()=>{pop.classList.remove('on');buyGate(zz)};
    const n=document.createElement('button');n.className='no';n.textContent='⏳ Not yet';n.onclick=closePop;btns.append(y,n)}
  else{$('gpIcon').textContent='🔍⭐';$('gpText').innerHTML=`Find ${p-D.stars} more ⭐!`;const o=document.createElement('button');o.className='yes';o.textContent='👍 OK';o.onclick=closePop;btns.append(o)}
  pop.classList.add('on');Core.SND.flap()}
function closePop(){$('gatePop').classList.remove('on');mode='walk';popUntil=performance.now()+1200}
function buyGate(zz){const p=zoneOf(zz).price;mode='gate';const hs=$('wStars').getBoundingClientRect();const gc=G.gate(D.seed,zz),gx=OX()+(gc.c+.5)*cell,gy=OY()+(gc.r+.5)*cell;
  const n=Math.min(p,24),start=D.stars;D.stars-=p;save();
  for(let i=0;i<n;i++)flyers.push({t0:performance.now()/1000+i*.07,x0:hs.left+hs.width*.3,y0:hs.top+hs.height/2,gx,gy,last:i===n-1,val:start-Math.round(p*(i+1)/n)});
  gateAnim={zz,done:false}}
let gateAnim=null;
function gateOpened(zz){D.opened=Math.max(D.opened,zz+1);zoneOf(D.opened);rebuild();save();mode='walk';Core.SND.yay();
  const gc=G.gate(D.seed,zz),gx=OX()+(gc.c+.5)*cell,gy=OY()+(gc.r+.5)*cell;burst(gx,gy,40,['#fff6a8','#ffe033','#ffd1f2','#bfe8ff','#fff'],6);hud('wStars')}
// ---------- particles ----------
function burst(x,y,n,cols,sp=4){for(let i=0;i<n;i++){const a=Math.random()*6.28,v=Math.random()*sp+1;parts.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,life:1,c:cols[i%cols.length],s:Math.random()*5+3})}}
// ---------- drawing ----------
function rr(x,y,w,h,r){ctx.beginPath();ctx.roundRect?ctx.roundRect(x,y,w,h,r):ctx.rect(x,y,w,h);ctx.fill()}
const hsh=(r,c)=>{let h=Math.imul(r*73856093^c*19349663,0x27d4eb2d);return((h^h>>>15)>>>0)%1000};
function deco(type,x,y,s,t){ctx.save();ctx.globalAlpha=.55;ctx.translate(x,y);
  if(type==='sunflower'){ctx.fillStyle='#ffd43b';for(let i=0;i<8;i++){const a=i*.785;ctx.beginPath();ctx.ellipse(Math.cos(a)*s*.22,Math.sin(a)*s*.22,s*.12,s*.07,a,0,7);ctx.fill()}ctx.fillStyle='#8a5a2b';ctx.beginPath();ctx.arc(0,0,s*.12,0,7);ctx.fill()}
  else if(type==='moon'){ctx.fillStyle='#fff3b0';ctx.beginPath();ctx.arc(0,0,s*.22,0,7);ctx.fill();ctx.globalCompositeOperation='destination-out';ctx.beginPath();ctx.arc(s*.1,-s*.06,s*.2,0,7);ctx.fill()}
  else if(type==='cloud'){ctx.fillStyle='#fff';[[-.14,0,.13],[0,-.06,.16],[.15,0,.12]].forEach(([a,b,r])=>{ctx.beginPath();ctx.arc(a*s,b*s,r*s,0,7);ctx.fill()});ctx.fillStyle='#ff9ad5';ctx.fillRect(-s*.25,s*.1,s*.5,s*.04)}
  else if(type==='candy'){ctx.strokeStyle='#fff';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(0,s*.05);ctx.lineTo(0,s*.35);ctx.stroke();ctx.fillStyle='#ff6fae';ctx.beginPath();ctx.arc(0,-s*.05,s*.18,0,7);ctx.fill();ctx.strokeStyle='#fff';ctx.lineWidth=2.5;ctx.beginPath();ctx.arc(0,-s*.05,s*.1,t,t+4);ctx.stroke()}
  else if(type==='shell'){ctx.fillStyle='#ffd1c2';ctx.beginPath();ctx.moveTo(0,s*.2);for(let i=0;i<=6;i++){const a=Math.PI+i*Math.PI/6;ctx.lineTo(Math.cos(a)*s*.25,Math.sin(a)*s*.25)}ctx.closePath();ctx.fill();ctx.strokeStyle='#e89a8a';ctx.lineWidth=1.5;for(let i=1;i<6;i++){const a=Math.PI+i*Math.PI/6;ctx.beginPath();ctx.moveTo(0,s*.2);ctx.lineTo(Math.cos(a)*s*.24,Math.sin(a)*s*.24);ctx.stroke()}}
  else if(type==='snow'){ctx.strokeStyle='#fff';ctx.lineWidth=2;ctx.rotate(t*.3);for(let i=0;i<3;i++){ctx.rotate(Math.PI/3);ctx.beginPath();ctx.moveTo(-s*.22,0);ctx.lineTo(s*.22,0);ctx.stroke()}}
  ctx.restore()}
function drawHole(x,y,r,t){ctx.save();ctx.translate(x,y);const g=ctx.createRadialGradient(0,0,r*.2,0,0,r*1.5);g.addColorStop(0,'rgba(220,140,255,.5)');g.addColorStop(1,'rgba(220,140,255,0)');ctx.fillStyle=g;ctx.beginPath();ctx.arc(0,0,r*1.5,0,7);ctx.fill();
  const cols=['#ff97dc','#c77dff','#8f5ae6','#ffc2f0','#aa6eff'];for(let i=0;i<8;i++){ctx.fillStyle=cols[i%5];ctx.beginPath();ctx.arc(0,0,r*(1-i/9),0,7);ctx.fill()}
  ctx.strokeStyle='rgba(255,255,255,.7)';ctx.lineWidth=Math.max(1.5,r/12);for(let a=0;a<4;a++){ctx.beginPath();for(let q=0;q<24;q++){const an=a*1.57+q*.15-t*1.6,rr_=r*(.2+q/24*.75);ctx.lineTo(Math.cos(an)*rr_,Math.sin(an)*rr_)}ctx.stroke()}
  ctx.fillStyle='#2d1250';ctx.beginPath();ctx.arc(0,0,r*.26,0,7);ctx.fill();ctx.restore()}
function drawGate(x,y,zz,t,openG){const Z=zoneOf(zz),th=THEMES[Z.theme];
  if(openG){ctx.strokeStyle='rgba(255,230,120,.8)';ctx.lineWidth=3;ctx.beginPath();ctx.arc(x+cell/2,y+cell*.55,cell*.42,Math.PI,0);ctx.stroke();return}
  const gl=.6+.4*Math.sin(t*3);ctx.fillStyle=`rgba(255,220,90,${.25*gl})`;ctx.beginPath();ctx.arc(x+cell/2,y+cell/2,cell*.9,0,7);ctx.fill();
  ctx.fillStyle='#ffcc33';rr(x+2,y+2,cell-4,cell-4,cell*.25);ctx.fillStyle='#b8860b';for(let i=1;i<4;i++)ctx.fillRect(x+i*cell/4-1.5,y+5,3,cell-10);
  ctx.font=`${cell*.42}px sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('🔒',x+cell/2,y+cell/2+1);
  const lbl=`${Z.price} ⭐`;ctx.font=`bold ${Math.max(14,cell*.42)}px "Trebuchet MS",sans-serif`;const tw=ctx.measureText(lbl).width+16,lh=Math.max(22,cell*.62);
  ctx.fillStyle='rgba(40,20,90,.85)';rr(x+cell/2-tw/2,y-lh-4,tw,lh,lh/2);ctx.fillStyle='#fff6c8';ctx.fillText(lbl,x+cell/2,y-lh/2-4)}
function frameDraw(t,dt){const ox=OX(),oy=OY(),R=roomOf(F.r,F.c),th=THEMES[zoneOf(Math.max(0,R.z)).theme];
  const g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,th.bg[0]);g.addColorStop(1,th.bg[1]);ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
  for(let i=0;i<70;i++){ctx.fillStyle=`rgba(255,255,230,${.4+.4*Math.sin(t*2+i)})`;ctx.fillRect(((i*211)%W),((i*53)%H),2,2)}
  const r0=Math.floor(-oy/cell)-1,r1=Math.ceil((H-oy)/cell)+1,c0=Math.floor(-ox/cell)-1,c1=Math.ceil((W-ox)/cell)+1;
  for(let r=r0;r<=r1;r++)for(let c=c0;c<=c1;c++){const ti=themeAt(r,c);if(ti<0)continue;const zt=THEMES[ti],x=ox+c*cell,y=oy+r*cell,ch=cellAt(r,c);
    if(ch==='#'){ctx.fillStyle=zt.wall;rr(x+1,y+1,cell-2,cell-2,cell*.28);ctx.fillStyle='rgba(255,255,255,.2)';rr(x+cell*.15,y+cell*.12,cell*.7,cell*.2,cell*.1)}
    else if(ch!=='G'){ctx.fillStyle=zt.floor;ctx.fillRect(x,y,cell,cell);if(hsh(r,c)<55&&!starAt(r,c)&&!holeAt(r,c)&&zoneAtCell(r,c)>=0)deco(zt.deco,x+cell/2,y+cell/2,cell,t)}}
  // gates: closed frontier gate + opened arches
  for(const b of bnd.values()){if(b.type!=='gate'||b.r<r0||b.r>r1||b.c<c0||b.c>c1)continue;drawGate(ox+b.c*cell,oy+b.r*cell,b.z,t,b.z<D.opened)}
  // stars & holes in visible unlocked zones
  for(let z=0;z<=D.opened;z++){const Z=zoneOf(z);if(Z.r0>r1||Z.r0+G.ZHH<r0||Z.c0>c1||Z.c0+G.ZW<c0)continue;
    for(const [r,c] of zoneStars(z)){if(collected.has(k(r,c)))continue;const x=ox+(c+.5)*cell,y=oy+(r+.5)*cell,p=1+.12*Math.sin(t*4+r+c);ctx.fillStyle='rgba(255,230,90,.25)';ctx.beginPath();ctx.arc(x,y,cell*.4*p,0,7);ctx.fill();Core.star5(x,y,cell*.32*p,'#ffe033',ctx)}
    for(const [r,c] of zoneHoles(z)){if(eaten.has(k(r,c)))continue;drawHole(ox+(c+.5)*cell,oy+(r+.5)*cell,cell*.55*(1+.05*Math.sin(t*3)),t)}}
  drawNooks(ox,oy,r0,r1,c0,c1,t);
  // particles
  for(const p of parts){p.x+=p.vx;p.y+=p.vy;p.vy+=.06;p.life-=dt*.9;if(p.life>0){ctx.globalAlpha=Math.max(0,p.life);Core.star5(p.x,p.y,p.s,p.c,ctx)}}ctx.globalAlpha=1;parts=parts.filter(p=>p.life>0);
  // fairy
  const bb=F.bump>0?Math.sin(F.bump*Math.PI)*.18:0;F.bump=Math.max(0,F.bump-dt*4);
  drawFollowers(ox,oy,t);
  Core.drawFairy(ctx,ox+(F.x+.5+F.bx*bb)*cell,oy+(F.y+.45+F.by*bb)*cell+Math.sin(t*4)*cell*.05,cell/80,t,F.dir,F.cheek);
  // flying stars to the gate
  for(const f of flyers){const u=(t-f.t0)/.7;if(u<0)continue;const e=u<1?u*u*(3-2*u):1;const x=f.x0+(f.gx-f.x0)*e,y=f.y0+(f.gy-f.y0)*e-Math.sin(e*Math.PI)*80;
    if(u<1)Core.star5(x,y,14,'#ffe033',ctx);if(!f.started){f.started=true;$('wStars').textContent='⭐ '+Math.max(D.stars,f.val)}
    if(u>=1&&!f.done){f.done=true;burst(f.gx,f.gy,5,['#fff6a8','#ffe033'],3);tone(1200+Math.random()*600,0,.15,.05);if(f.last&&gateAnim){gateOpened(gateAnim.zz);gateAnim=null}}}
  flyers=flyers.filter(f=>!f.done);
  // celebration & banner
  if(cele){const u=t-cele.t;if(u<1.6){ctx.save();ctx.translate(W/2,H*.32);ctx.rotate(Math.sin(t*10)*.08);const s=(1+.1*Math.sin(t*14))*Math.min(1,u*4);ctx.scale(s,s);const fs=Math.min(W*.12,90);ctx.font=`bold ${fs}px "Trebuchet MS",sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.lineWidth=fs*.16;ctx.strokeStyle='#fff';ctx.strokeText('NOM NOM!',0,0);ctx.fillStyle='#ff4fa8';ctx.fillText('NOM NOM!',0,0);ctx.restore();F.cheek=Math.min(1,u*3)*(u<1.2?1:Math.max(0,(1.6-u)/.4))}else{cele=null;F.cheek=0}}
  if(banner){const u=t-banner.t;if(u<2.8){const a=Math.min(1,u/.4,(2.8-u)/.5);ctx.save();ctx.globalAlpha=a;const fs=Math.max(18,Math.min(30,W/18));ctx.font=`bold ${fs}px "Trebuchet MS",sans-serif`;const tw=ctx.measureText(banner.text).width+40,by=top+8;ctx.fillStyle='rgba(30,14,70,.78)';rr(W/2-tw/2,by,tw,fs+20,(fs+20)/2);ctx.fillStyle='#fff6c8';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(banner.text,W/2,by+(fs+20)/2);ctx.restore()}else banner=null}
  drawFlyoff(t,dt);
  if(target&&down){ctx.strokeStyle='rgba(255,255,255,.5)';ctx.lineWidth=3;ctx.beginPath();ctx.arc(ox+(target.c+.5)*cell,oy+(target.r+.5)*cell,cell*.3,0,7);ctx.stroke()}}

// ---------- fairy friends ----------
const FR=G.FRIENDS;
const lookOf=id=>{const f=FR[id%FR.length];return{hair:f.hair,skin:f.skin,dress:f.dress,shoes:Core.shade(f.dress,.8).replace(/rgb\((\d+),(\d+),(\d+)\)/,(m,a,b,c)=>'#'+[a,b,c].map(v=>(+v).toString(16).padStart(2,'0')).join('')),stick:'#b07a3c',star:'#fff6a8'}};
function nookCell(z){const Z=zoneOf(z);return[Z.nook[0]+Z.r0,Z.nook[1]+Z.c0]}
function nookAt(r,c){const z=zoneAtCell(r,c);if(z<0||D.met.includes(z))return -1;const [nr,nc]=nookCell(z);return nr===r&&nc===c?z:-1}
function pushTrail(){const l=trail[trail.length-1];if(!l||Math.hypot(F.x-l.x,F.y-l.y)>=.1){trail.push({x:F.x,y:F.y});if(trail.length>600)trail.splice(0,trail.length-600)}}
// position a given distance (in cells) back along Floaty's path: smooth snake-style following
function trailAt(dist){let acc=0,p={x:F.x,y:F.y};for(let i=trail.length-1;i>=0;i--){const q=trail[i],s=Math.hypot(p.x-q.x,p.y-q.y);if(acc+s>=dist){const u=(dist-acc)/(s||1);return{x:p.x+(q.x-p.x)*u,y:p.y+(q.y-p.y)*u,dir:q.x<p.x?1:q.x>p.x?-1:0}}acc+=s;p=q}return{x:p.x,y:p.y,dir:0}}
const fDir=[];
function drawFollowers(ox,oy,t){for(let i=following.length-1;i>=0;i--){const p=trailAt((i+1)*.9);if(p.dir)fDir[i]=p.dir;
  Core.drawFairy(ctx,ox+(p.x+.5)*cell,oy+(p.y+.5)*cell+Math.sin(t*4+i*1.3)*cell*.06,cell/105,t+i*.37,fDir[i]||F.dir,0,lookOf(following[i]))}}
function teaTable(x,y,s,t,cups){// tiny round table with a cloth and teacups (s = size in px)
  ctx.save();ctx.translate(x,y);ctx.fillStyle='#a0673a';ctx.fillRect(-s*.05,0,s*.1,s*.32);ctx.fillRect(-s*.2,s*.3,s*.4,s*.06);
  ctx.fillStyle='#fff';ctx.beginPath();ctx.ellipse(0,0,s*.42,s*.13,0,0,7);ctx.fill();ctx.fillStyle='#ff9ad5';ctx.beginPath();ctx.ellipse(0,s*.03,s*.42,s*.1,0,0,Math.PI);ctx.fill();
  for(let i=0;i<cups;i++){const cx=(cups===1?0:(i/(cups-1)-.5)*s*.5);cup(cx,-s*.07,s*.13,['#7fe0ff','#ffe033','#c77dff'][i%3])}
  ctx.restore()}
function cup(x,y,s,col){ctx.fillStyle=col;ctx.beginPath();ctx.moveTo(x-s*.5,y-s*.4);ctx.lineTo(x+s*.5,y-s*.4);ctx.lineTo(x+s*.35,y+s*.2);ctx.lineTo(x-s*.35,y+s*.2);ctx.closePath();ctx.fill();
  ctx.strokeStyle=col;ctx.lineWidth=Math.max(1,s*.14);ctx.beginPath();ctx.arc(x+s*.55,y-s*.12,s*.2,-1.4,1.4);ctx.stroke();ctx.fillStyle='#fff';ctx.beginPath();ctx.ellipse(x,y+s*.24,s*.6,s*.1,0,0,7);ctx.fill()}
function heart(x,y,s,col){ctx.fillStyle=col;ctx.beginPath();ctx.moveTo(x,y+s*.35);ctx.bezierCurveTo(x-s,y-s*.3,x-s*.35,y-s,x,y-s*.4);ctx.bezierCurveTo(x+s*.35,y-s,x+s,y-s*.3,x,y+s*.35);ctx.fill()}
function drawNooks(ox,oy,r0,r1,c0,c1,t){for(let z=0;z<=D.opened;z++){const [r,c]=nookCell(z);if(r<r0||r>r1||c<c0||c>c1)continue;const x=ox+(c+.5)*cell,y=oy+(r+.5)*cell;
  ctx.fillStyle='rgba(255,190,230,.55)';ctx.beginPath();ctx.ellipse(x,y+cell*.28,cell*.48,cell*.16,0,0,7);ctx.fill();// cozy rug
  if(!D.met.includes(z)){const gl=ctx.createRadialGradient(x,y,0,x,y,cell*.9);gl.addColorStop(0,'rgba(255,240,180,.45)');gl.addColorStop(1,'rgba(255,240,180,0)');ctx.fillStyle=gl;ctx.beginPath();ctx.arc(x,y,cell*.9,0,7);ctx.fill();
    Core.drawFairy(ctx,x+cell*.22,y-cell*.08+Math.sin(t*3+z)*cell*.05,cell/115,t+z,-1,0,lookOf(zoneOf(z).friend));
    if(Math.sin(t*2+z)>.3)heart(x+cell*.3,y-cell*.55-((t*20)%10),cell*.12,'#ff6ec7')}
  teaTable(x-cell*.12,y+cell*.12,cell*.62,t,2)}}
function drawFlyoff(t,dt){for(const f of flyoff){const u=t-f.t0;f.x+=Math.sin(u*3+f.i)*.6;f.y-=Math.max(0,u-.6)*3.2;const wav=Math.sin(u*12)*.25;
  ctx.save();ctx.globalAlpha=Math.max(0,Math.min(1,(3.4-u)/.8));ctx.translate(f.x,f.y);ctx.rotate(wav);Core.drawFairy(ctx,0,0,cell/95,t+f.i,1,0,lookOf(f.id));ctx.restore();
  if(Math.random()<.4)parts.push({x:f.x,y:f.y+cell*.3,vx:Math.random()-.5,vy:Math.random(),life:.7,c:'#fff6a8',s:3})}
  if(flyoff.length){const u=t-flyoff[0].t0;if(u<2.2){ctx.save();const fs=Math.max(22,Math.min(40,W/14));ctx.font=`bold ${fs}px "Trebuchet MS",sans-serif`;ctx.textAlign='center';ctx.lineWidth=fs*.15;ctx.strokeStyle='#fff';ctx.fillStyle='#ff4fa8';const ty=top+fs*2.2;ctx.strokeText('Bye bye! 👋',W/2,ty);ctx.fillText('Bye bye! 👋',W/2,ty);ctx.restore()}}
  flyoff=flyoff.filter(f=>t-f.t0<3.4)}
function teaPartyTime(){mode='popup';keyDir=null;target=null;down=false;const pop=$('gatePop'),btns=$('gpBtns');btns.innerHTML='';
  $('gpIcon').textContent='🧚🫖🧚';$('gpText').innerHTML="We're going to the fairy tea party!<br>See you soon!";
  const o=document.createElement('button');o.className='yes';o.textContent='👋 Bye bye!';o.onclick=()=>{pop.classList.remove('on');waveGoodbye()};btns.append(o);pop.classList.add('on');Core.SND.flap()}
function waveGoodbye(){const t=performance.now()/1000;following.forEach((id,i)=>{const p=trailAt((i+1)*.9);flyoff.push({id,i,t0:t,x:OX()+(p.x+.5)*cell,y:OY()+(p.y+.5)*cell})});
  D.party.push(...following);following=[];mode='walk';popUntil=performance.now()+600;Core.SND.yay();[0,.12,.24,.36].forEach((d,i)=>tone(880*[1,1.25,1.5,2][i],d,.3,.05));hud('wTea');save()}
// ---------- big moments: NOM, tea meet, tea party ----------
const SCENE_LEN={nom:3.1,tea:3.4,party:3.8};
function startScene(type,o){mode='scene';keyDir=null;target=null;down=false;F.path=[];scene={type,t0:performance.now()/1000,bites:0,...o};
  if(type==='tea'){Core.SND.flap();[0,.15,.3].forEach((d,i)=>tone([660,880,1100][i],d,.35,.05))}
  if(type==='party'){Core.SND.yay()}}
function skipScene(){if(!scene)return;const s=scene;scene=null;F.cheek=0;
  if(s.type==='nom'){startScene('party',{});return}
  if(s.type==='tea'){if(!D.met.includes(s.z)){D.met.push(s.z);following.push(s.id);trail.push({x:F.x,y:F.y})}hud();save();
    if(following.length>=5){teaPartyTime();return}}
  mode='walk';save()}
let holeCv=null;
function bitten(r,bites,t){// draw the swirly black hole on an offscreen canvas so bites cut only the treat
  const sz=Math.ceil(r*3.2);if(!holeCv)holeCv=document.createElement('canvas');if(holeCv.width!==sz){holeCv.width=holeCv.height=sz}
  const h=holeCv.getContext('2d');h.setTransform(1,0,0,1,0,0);h.clearRect(0,0,sz,sz);const keep=ctx;
  h.save();h.translate(sz/2,sz/2);ctx=h;drawHole(0,0,r,t);ctx=keep;h.globalCompositeOperation='destination-out';
  for(let b=0;b<bites;b++){const an=Math.PI+b*1.3;for(let j=-1;j<=1;j++){h.beginPath();h.arc(Math.cos(an+j*.35)*r*.95,Math.sin(an+j*.35)*r*.95,r*(.32+b*.08),0,7);h.fill()}}h.restore();return holeCv}
function bigText(txt,x,y,size,col,t){ctx.save();ctx.translate(x,y);ctx.rotate(Math.sin(t*10)*.06);const s=1+.08*Math.sin(t*14);ctx.scale(s,s);ctx.font=`bold ${size}px "Trebuchet MS","Comic Sans MS",sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.lineWidth=size*.16;ctx.strokeStyle='#fff';ctx.strokeText(txt,0,0);ctx.fillStyle=col;ctx.fillText(txt,0,0);ctx.restore()}
const ease=u=>u<0?0:u>1?1:u*u*(3-2*u),lerp=(a,b,u)=>a+(b-a)*u;
function fitText(txt,max,maxW){let s=max;ctx.font=`bold ${s}px "Trebuchet MS",sans-serif`;const w=ctx.measureText(txt).width*1.1;return w>maxW?s*maxW/w:s}
function drawScene(t,dt){const s=scene,u=t-s.t0,m=Math.min(W,H),vt=top;
  if(u>SCENE_LEN[s.type]){skipScene();return}
  if(s.type==='nom'){const big=ease(u/.6);ctx.fillStyle=`rgba(20,8,52,${.6*big})`;ctx.fillRect(0,0,W,H);
    const hr=lerp(cell*.55,m*.2,big),hx=lerp(s.hx,W/2+m*.17,big),hy=lerp(s.hy,H*.56,big);
    const bites=u<.8?0:Math.min(3,Math.floor((u-.8)/.6)+1);
    if(bites>s.bites){s.bites=bites;Core.playNom();burst(hx-hr*.9,hy,26,['#fff','#ffe14d','#ff97dc','#7fe0ff','#c77dff'],6)}
    if(bites<3){const img=bitten(hr,bites,t);ctx.drawImage(img,hx-img.width/2,hy-img.height/2)}
    else if(u<2.5){ctx.globalAlpha=Math.max(0,1-(u-2)*3);const img=bitten(hr,3,t);ctx.drawImage(img,hx-img.width/2,hy-img.height/2);ctx.globalAlpha=1}
    const lean=bites&&bites<=3?Math.max(0,Math.sin(((u-.8)%.6)/.6*Math.PI))*hr*.3:0;F.cheek=Math.min(1,Math.max(0,(u-.9)*1.5));
    const fx=lerp(s.fx,W/2-m*.2,big),fy=lerp(s.fy,H*.56,big);
    Core.drawFairy(ctx,fx+lean,fy,lerp(cell/80,m/260,big),t,1,F.cheek);
    if(bites){const words=['NOM','NOM NOM','NOM NOM NOM!'][bites-1];bigText(words,W/2,vt+H*.14,fitText('NOM NOM NOM!',Math.min(W*.13,100),W*.9),'#ff4fa8',t)}
    if(u>2.4)bigText('Yummy! 💕',W/2,H*.86,Math.min(W*.09,60),'#ffe033',t)}
  else if(s.type==='tea'){const a=ease(u/.4),f=FR[s.id];ctx.fillStyle=`rgba(40,14,70,${.72*a})`;ctx.fillRect(0,0,W,H);
    const sc=m/300*a,cx=W/2,cy=H*.58;ctx.fillStyle='rgba(255,190,230,.35)';ctx.beginPath();ctx.ellipse(cx,cy+m*.2,m*.45*a,m*.09*a,0,0,7);ctx.fill();
    const sip=k=>Math.max(0,Math.sin((u-k)*2.6));// cups lift to sip
    Core.drawFairy(ctx,cx-m*.22,cy-m*.04+Math.sin(t*3)*4,sc,t,1,sip(.5)*.5);Core.drawFairy(ctx,cx+m*.22,cy-m*.04+Math.sin(t*3+1)*4,sc,t+.5,-1,sip(1.1)*.5,lookOf(s.id));
    teaTable(cx,cy+m*.08,m*.42*a,t,1);
    ctx.save();ctx.translate(cx-m*.12,cy+m*.02-sip(.5)*m*.07);cup(0,0,m*.06*a,'#7fe0ff');ctx.restore();
    ctx.save();ctx.translate(cx+m*.12,cy+m*.02-sip(1.1)*m*.07);cup(0,0,m*.06*a,'#ffe033');ctx.restore();
    for(let i=0;i<6;i++){const q=(u*.45+i/6)%1;heart(cx+Math.sin(i*2.1+t)*m*.3,cy-m*.1-q*m*.4,m*.03*(1-q*.5),['#ff6ec7','#ff9ad5','#ffb3d9'][i%3])}
    if(Math.random()<.3)burst(cx+(Math.random()-.5)*m*.6,cy-m*.2,2,['#fff6a8','#ffd1f2','#bfe8ff'],2);
    const msg=u<1.8?`Hi! I'm ${f.name}! 🍵`:`${f.name} is your friend! 💕`;bigText(msg,W/2,vt+H*.12,fitText(msg,Math.min(W*.1,64),W*.9),'#ff4fa8',t)}
  else if(s.type==='party'){const a=ease(u/.4);const g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,`rgba(90,40,150,${.92*a})`);g.addColorStop(1,`rgba(255,150,210,${.92*a})`);ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
    for(let i=0;i<14;i++){ctx.fillStyle=['#ffe033','#7fe0ff','#9dffad','#ff9ad5'][i%4];ctx.globalAlpha=a*.8;ctx.beginPath();ctx.arc((i+.5)*W/14,vt+H*.24+Math.sin(i)*8,5,0,7);ctx.fill()}ctx.globalAlpha=1;// string lights
    const friends=[...D.party,...following],n=friends.length,show=friends.slice(-10),cx=W/2,cy=H*.66;
    ctx.fillStyle='#fff';ctx.beginPath();ctx.ellipse(cx,cy,m*.42,m*.11,0,0,7);ctx.fill();ctx.fillStyle='#ff9ad5';ctx.beginPath();ctx.ellipse(cx,cy+m*.025,m*.42,m*.09,0,0,Math.PI);ctx.fill();
    ctx.fillStyle='#a0673a';ctx.fillRect(cx-m*.03,cy+m*.1,m*.06,H-cy);
    const hr=m*.14*Math.max(.3,1-u/SCENE_LEN.party*.6),img=bitten(hr,Math.min(3,Math.floor(u/1.1)),t);ctx.fillStyle='#ffd6ee';ctx.beginPath();ctx.ellipse(cx,cy-m*.01,m*.17,m*.045,0,0,7);ctx.fill();ctx.drawImage(img,cx-img.width/2,cy-m*.06-img.height/2);
    const all=[{floaty:true},...show.map(id=>({id}))],k=all.length;
    all.forEach((p,i)=>{const ang=Math.PI*(1.08+.84*(k===1?.5:i/(k-1))),rx=m*.46,x=Math.max(m*.13,Math.min(W-m*.13,cx+Math.cos(ang)*rx*(W>H?1.3:1))),y=cy-m*.05+Math.sin(ang)*m*.3+Math.sin(t*3+i)*4;
      const sc=m/(k>6?560:440),dir=x<cx?1:-1;Core.drawFairy(ctx,x,y,sc,t+i*.4,dir,Math.max(0,Math.sin(t*5+i))*.6,p.floaty?undefined:lookOf(p.id));
      if(i%2===0){ctx.save();ctx.translate(x+dir*m*.06,y+m*.06-Math.max(0,Math.sin(t*2.6+i))*m*.04);cup(0,0,m*.035,['#7fe0ff','#ffe033','#c77dff'][i%3]);ctx.restore()}});
    for(let i=0;i<5;i++){const q=(u*.4+i/5)%1;heart(cx+Math.sin(i*1.9+t*.7)*m*.4,cy-m*.15-q*m*.35,m*.025,'#ff6ec7')}
    if(Math.random()<.2)burst(Math.random()*W,vt+20,1,['#ff6ec7','#ffe033','#7fe0ff','#9dffad','#c77dff'],2);
    const msg=n?`🧚 ${n+1} fairies at the tea party!`:'Find fairy friends for the tea party! 🧚';
    bigText(msg,W/2,vt+H*.1,fitText(msg,Math.min(W*.08,52),W*.92),'#ff4fa8',t);
    bigText(n?'Sharing the yummy treat! 🍩':'Yummy treat! 🍩',W/2,H*.93,fitText('Sharing the yummy treat! 🍩',Math.min(W*.06,40),W*.9),'#fff6c8',t)}}
// ---------- events on arrival ----------
function arrive(){const key=k(F.r,F.c);roomCheck();
  if(starAt(F.r,F.c)){collected.add(key);D.stars++;D.total++;Core.SND.star();burst(OX()+(F.c+.5)*cell,OY()+(F.r+.5)*cell,16,['#fff6a8','#ffe033','#ffd1f2','#fff'],4);hud('wStars');save()}
  if(holeAt(F.r,F.c)){eaten.add(key);D.holes++;hud('wHoles');save();startScene('nom',{hx:OX()+(F.c+.5)*cell,hy:OY()+(F.r+.5)*cell,fx:OX()+(F.x+.5)*cell,fy:OY()+(F.y+.45)*cell});return}
  const fz=nookAt(F.r,F.c);if(fz>=0){startScene('tea',{z:fz,id:zoneOf(fz).friend});return}
  roomCheck()}
// ---------- loop ----------
let last=0;
function loop(now){if(!active)return;const dt=Math.min(.05,(now-last)/1000);last=now;const t=now/1000;
  if(down&&lastPtr&&mode==='walk')target=toCell(lastPtr);
  if(mode==='walk'){if(!F.path.length){const s=step();if(s){F.path.push([F.r+s[0],F.c+s[1]]);if(s[1])F.dir=s[1]}}
    if(F.path.length){const [nr,nc]=F.path[0],sp=6.5*speed*dt,dx=nc-F.x,dy=nr-F.y,d=Math.hypot(dx,dy);
      if(d<=sp){F.x=nc;F.y=nr;F.r=nr;F.c=nc;F.path.shift();pushTrail();arrive()}else{F.x+=dx/d*sp;F.y+=dy/d*sp;pushTrail()}
      if(Math.random()<.5)parts.push({x:OX()+(F.x+.5)*cell-F.dir*cell*.2,y:OY()+(F.y+.6)*cell,vx:Math.random()-.5,vy:Math.random()*.5,life:.8,c:['#fff6a8','#ffd1f2','#bfe8ff'][Math.random()*3|0],s:Math.random()*3+2})}}
  const [tx,ty]=camTarget(),kk=Math.min(1,dt*3.2);camX+=(tx-camX)*kk;camY+=(ty-camY)*kk;
  frameDraw(t,dt);if(scene)drawScene(t,dt);if(now-saveT>1500)save(now);requestAnimationFrame(loop)}
addEventListener('pagehide',()=>{if(active)save()});document.addEventListener('visibilitychange',()=>{if(active&&document.hidden)save()});
// test hook
window.__world={get bnd(){return bnd},roomOf,themeAt,get D(){return D},get F(){return F},get mode(){return mode},get active(){return active},cellAt,passable,starAt,holeAt,zoneOf,set speed(v){speed=v},get room(){return curRoom},collected:()=>collected,eaten:()=>eaten,G,get following(){return following},get scene(){return scene},get trail(){return trail},nookCell,skipScene,get flyoff(){return flyoff}};
})();
