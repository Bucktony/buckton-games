// Star Gate World: endless open world of connected maze rooms, gates bought with stars, saved per slot.
(()=>{
'use strict';
const $=id=>document.getElementById(id), Core=window.__fmCore, G=window.WorldGen;
if(!Core||!G)return;
const {RW,RH,WW,ZH,THEMES}=G, SLOTS=3, cv=$('c'), ctx=cv.getContext('2d');
const KEY=i=>'fm_world_'+i;
const load=i=>{try{return JSON.parse(localStorage.getItem(KEY(i))||'null')}catch(e){return null}};
const store=(i,d)=>{try{localStorage.setItem(KEY(i),JSON.stringify(d))}catch(e){}};
let D=null,slot=-1,zones=new Map(),active=false,mode='walk',speed=1;
let F={r:1,c:1,x:1,y:1,path:[],dir:1,bump:0,bx:0,by:0,cheek:0},cell=40,camX=0,camY=0,top=70,W=0,H=0,dpr=1;
let collected=new Set(),eaten=new Set(),parts=[],flyers=[],banner=null,cele=null,curRoom=null,keyDir=null,target=null,down=false,lastPtr=null,lastBump=0,popBlock=false,saveT=0;
const zoneOf=z=>{if(!zones.has(z))zones.set(z,G.zone(D.seed,z));return zones.get(z)};
// ---------- world cells ----------
function cellAt(r,c){if(r<0||c<=0||c>=WW-1)return'#';const z=Math.floor(r/ZH),lr=r-z*ZH;
  if(lr===0){if(z===0)return'#';const zz=z-1;if(zz>D.opened)return'#';return c===zoneOf(zz).gateCol?(zz<D.opened?'.':'G'):'#'}
  if(z>D.opened)return'#';return zoneOf(z).grid[lr][c]}
const passable=(r,c)=>{const ch=cellAt(r,c);return ch!=='#'&&ch!=='G'};
const k=(r,c)=>r+','+c;
function zoneStars(z){const Z=zoneOf(z);return Z.stars.map(([r,c])=>[r+z*ZH,c])}
function zoneHoles(z){const Z=zoneOf(z);return Z.holes.map(([r,c])=>[r+z*ZH,c])}
function starAt(r,c){const z=Math.floor(r/ZH);if(z>D.opened||r-z*ZH===0)return false;return zoneOf(z).stars.some(s=>s[0]+z*ZH===r&&s[1]===c)&&!collected.has(k(r,c))}
function holeAt(r,c){const z=Math.floor(r/ZH);if(z>D.opened||r-z*ZH===0)return false;return zoneOf(z).holes.some(s=>s[0]+z*ZH===r&&s[1]===c)&&!eaten.has(k(r,c))}
function roomOf(r,c){return{z:Math.max(0,Math.min(D.opened,Math.floor((r-1)/ZH))),i:Math.max(0,Math.min(3,Math.floor((c-1)/(RW-1))))}}
// ---------- saving ----------
function newWorld(i){const seed=(Math.random()*4294967295)>>>0;D={v:1,seed,opened:0,collected:[],eaten:[],pos:[1,1],stars:0,total:0,holes:0,created:Date.now(),updated:Date.now()};store(i,D);return D}
function save(now){if(!D||slot<0)return;D.pos=[F.r,F.c];D.collected=[...collected];D.eaten=[...eaten];D.updated=Date.now();store(slot,D);saveT=now||performance.now()}
// ---------- HUD ----------
function hud(pop){$('wZone').textContent=`${THEMES[zoneOf(roomOf(F.r,F.c).z).theme].emoji} Zone ${roomOf(F.r,F.c).z+1}`;$('wStars').textContent='⭐ '+D.stars;$('wTotal').textContent='🌟 '+D.total;$('wHoles').textContent='🍩 '+D.holes;
  if(pop){const e=$(pop);e.classList.add('pop');setTimeout(()=>e.classList.remove('pop'),180)}}
// ---------- slot screen ----------
function slotsScreen(){Core.setState('worlds');Core.show('worlds');const S=$('slots');S.innerHTML='';
  for(let i=0;i<SLOTS;i++){const d=load(i),el=document.createElement('div');el.className='slot';
    if(!d){el.innerHTML=`<div class="se">✨</div><div class="sn">World ${i+1}</div><button class="play">✨ New World</button>`;el.querySelector('button').onclick=()=>{Core.ac();newWorld(i);start(i)}}
    else{const th=THEMES[G.zone(d.seed,d.opened).theme];
      el.innerHTML=`<div class="se">${th.emoji}</div><div class="sn">World ${i+1}</div><div class="st">${th.name}</div><div class="sc"><span>🚪 Zone ${Math.floor((d.pos[0]-1)/ZH)+1}</span><span>⭐ ${d.stars}</span><span>🌟 ${d.total}</span><span>🍩 ${d.holes}</span></div><button class="play go">▶ Go!</button><button class="mini again">🔄 New world here</button>`;
      el.querySelector('.go').onclick=()=>{Core.ac();start(i)};
      el.querySelector('.again').onclick=()=>{el.innerHTML=`<div class="se">🦋</div><div class="sn" style="font-size:24px">Start a brand new world here?</div><div class="st">This world will fly away.</div><div class="row"><button class="yes">✅ Yes</button><button class="no">💛 Keep it</button></div>`;
        el.querySelector('.yes').onclick=()=>{newWorld(i);slotsScreen()};el.querySelector('.no').onclick=()=>slotsScreen()}}
    S.appendChild(el)}}
$('worldBtn').onclick=()=>{Core.ac();Core.saveName();slotsScreen()};
$('worldsBack').onclick=()=>{Core.setState('menu');Core.show('start')};
$('wHome').onclick=()=>stop();
// ---------- start / stop ----------
function start(i){slot=i;D=load(i)||newWorld(i);zones=new Map();collected=new Set(D.collected);eaten=new Set(D.eaten);
  for(let z=0;z<=D.opened;z++)zoneOf(z);
  F={r:D.pos[0],c:D.pos[1],x:D.pos[1],y:D.pos[0],path:[],dir:1,bump:0,bx:0,by:0,cheek:0};
  if(!passable(F.r,F.c)){F.r=1;F.c=1;F.x=1;F.y=1}
  parts=[];flyers=[];cele=null;mode='walk';keyDir=null;target=null;curRoom=null;popBlock=false;
  Core.setState('world');Core.show('__world');$('whud').classList.add('on');active=true;layout();roomCheck(true);snap();hud();last=performance.now();requestAnimationFrame(loop)}
function stop(){save();active=false;$('whud').classList.remove('on');$('gatePop').classList.remove('on');Core.setState('menu');Core.show('start')}
// ---------- layout & camera ----------
function layout(){dpr=Math.min(2,devicePixelRatio||1);W=innerWidth;H=innerHeight;cv.width=W*dpr;cv.height=H*dpr;ctx.setTransform(dpr,0,0,dpr,0,0);
  top=Math.min(76,H*.1);cell=Math.round(Math.max(32,Math.min(48,Math.floor(Math.min((W-8)/RW,(H-top-8)/RH)))))}
addEventListener('resize',()=>{if(active){layout();snap()}});
function camTarget(){const vw=W,vh=H-top-6,R=roomOf(F.r,F.c);const x0=R.i*(RW-1)*cell,x1=x0+RW*cell,y0=R.z*ZH*cell,y1=y0+RH*cell;const fx=(F.x+.5)*cell,fy=(F.y+.5)*cell;
  const ax=(lo,hi,f,v)=>hi-lo<=v?(lo+hi)/2-v/2:Math.max(lo,Math.min(hi-v,f-v/2));return[ax(x0,x1,fx,vw),ax(y0,y1,fy,vh)]}
function snap(){[camX,camY]=camTarget()}
const OX=()=>Math.round(-camX),OY=()=>Math.round(top-camY);
function roomCheck(silent){const R=roomOf(F.r,F.c);const id=R.z+':'+R.i;if(id===curRoom)return;
  if(curRoom){const [z,i]=curRoom.split(':').map(Number);const r0=z*ZH,c0=i*(RW-1);if(F.r>r0&&F.r<r0+RH-1&&F.c>c0&&F.c<c0+RW-1)return}
  curRoom=id;const th=THEMES[zoneOf(R.z).theme];banner={text:`${th.emoji} ${th.name} · ${R.z+1}-${R.i+1}`,t:performance.now()/1000};hud();
  if(!silent){[784,1047,1319].forEach((f,j)=>tone(f,j*.07,.35,.08))}}
function tone(f,t0,dur,vol){Core.SND&&Core.ac();const a=Core.ac();if(!a)return;const o=a.createOscillator(),g=a.createGain();o.type='triangle';o.frequency.value=f;g.gain.setValueAtTime(0,a.currentTime+t0);g.gain.linearRampToValueAtTime(vol,a.currentTime+t0+.01);g.gain.exponentialRampToValueAtTime(.001,a.currentTime+t0+dur);o.connect(g).connect(a.destination);o.start(a.currentTime+t0);o.stop(a.currentTime+t0+dur+.05)}
// ---------- input ----------
const KEYS={ArrowUp:[-1,0],ArrowDown:[1,0],ArrowLeft:[0,-1],ArrowRight:[0,1]};
addEventListener('keydown',e=>{if(!active||mode!=='walk'||!KEYS[e.key])return;keyDir=KEYS[e.key];target=null;e.preventDefault();Core.ac()});
addEventListener('keyup',e=>{if(KEYS[e.key]&&keyDir===KEYS[e.key])keyDir=null});
const toCell=e=>({r:(e.clientY-OY())/cell-.5,c:(e.clientX-OX())/cell-.5});
cv.addEventListener('pointerdown',e=>{if(!active||mode!=='walk')return;down=true;Core.ac();lastPtr={clientX:e.clientX,clientY:e.clientY};target=toCell(e);keyDir=null;try{cv.setPointerCapture(e.pointerId)}catch(_){}});
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
function gateAsk(dr,dc){if(mode!=='walk')return;if(performance.now()<popUntil){const now=performance.now();if(now-lastBump>450){lastBump=now;F.bump=1;F.bx=dc;F.by=dr;Core.SND.bump()}return}const zz=Math.floor((F.r+dr)/ZH)-1;gateZ=zz;const p=zoneOf(zz).price;mode='popup';keyDir=null;target=null;down=false;
  const pop=$('gatePop'),btns=$('gpBtns');btns.innerHTML='';
  if(D.stars>=p){$('gpIcon').textContent='🚪✨';$('gpText').innerHTML=`Open for ${p} ⭐?`;
    const y=document.createElement('button');y.className='yes';y.textContent='✅ Yes!';y.onclick=()=>{pop.classList.remove('on');buyGate(zz)};
    const n=document.createElement('button');n.className='no';n.textContent='⏳ Not yet';n.onclick=closePop;btns.append(y,n)}
  else{$('gpIcon').textContent='🔍⭐';$('gpText').innerHTML=`Find ${p-D.stars} more ⭐!`;const o=document.createElement('button');o.className='yes';o.textContent='👍 OK';o.onclick=closePop;btns.append(o)}
  pop.classList.add('on');Core.SND.flap()}
function closePop(){$('gatePop').classList.remove('on');mode='walk';popUntil=performance.now()+1200}
function buyGate(zz){const p=zoneOf(zz).price;mode='gate';const hs=$('wStars').getBoundingClientRect();const gx=OX()+(zoneOf(zz).gateCol+.5)*cell,gy=OY()+((zz+1)*ZH+.5)*cell;
  const n=Math.min(p,24),start=D.stars;D.stars-=p;save();
  for(let i=0;i<n;i++)flyers.push({t0:performance.now()/1000+i*.07,x0:hs.left+hs.width*.3,y0:hs.top+hs.height/2,gx,gy,last:i===n-1,val:start-Math.round(p*(i+1)/n)});
  gateAnim={zz,done:false}}
let gateAnim=null;
function gateOpened(zz){D.opened=Math.max(D.opened,zz+1);zoneOf(D.opened);save();mode='walk';Core.SND.yay();
  const gx=OX()+(zoneOf(zz).gateCol+.5)*cell,gy=OY()+((zz+1)*ZH+.5)*cell;burst(gx,gy,40,['#fff6a8','#ffe033','#ffd1f2','#bfe8ff','#fff'],6);hud('wStars')}
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
function frameDraw(t,dt){const ox=OX(),oy=OY(),R=roomOf(F.r,F.c),th=THEMES[zoneOf(R.z).theme];
  const g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,th.bg[0]);g.addColorStop(1,th.bg[1]);ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
  for(let i=0;i<70;i++){const sx=(i*137.5%1)*W||((i*97)%W),sy=((i*53)%H);ctx.fillStyle=`rgba(255,255,230,${.4+.4*Math.sin(t*2+i)})`;ctx.fillRect(((i*211)%W),sy,2,2)}
  const r0=Math.max(0,Math.floor(-oy/cell)-1),r1=Math.min((D.opened+1)*ZH,Math.ceil((H-oy)/cell)+1),c0=Math.max(0,Math.floor(-ox/cell)-1),c1=Math.min(WW-1,Math.ceil((W-ox)/cell)+1);
  for(let r=r0;r<=r1;r++){const z=Math.min(D.opened,Math.floor(r/ZH)),zt=THEMES[zoneOf(Math.max(0,r%ZH===0&&z>0?z-1:z)).theme];
    for(let c=c0;c<=c1;c++){const x=ox+c*cell,y=oy+r*cell,ch=cellAt(r,c);
      if(ch==='#'){ctx.fillStyle=zt.wall;rr(x+1,y+1,cell-2,cell-2,cell*.28);ctx.fillStyle='rgba(255,255,255,.2)';rr(x+cell*.15,y+cell*.12,cell*.7,cell*.2,cell*.1)}
      else{ctx.fillStyle=zt.floor;ctx.fillRect(x,y,cell,cell);if(ch==='.'&&r%ZH!==0&&hsh(r,c)<55&&!starAt(r,c)&&!holeAt(r,c))deco(zt.deco,x+cell/2,y+cell/2,cell,t)}}}
  // gates (closed gate of the frontier + opened arches)
  for(let zz=Math.max(0,Math.floor(r0/ZH)-1);zz<=Math.min(D.opened,Math.floor(r1/ZH));zz++){const gr=(zz+1)*ZH;if(gr<r0-1||gr>r1+1)continue;drawGate(ox+zoneOf(zz).gateCol*cell,oy+gr*cell,zz,t,zz<D.opened)}
  // stars & holes
  for(let z=Math.max(0,Math.floor(r0/ZH));z<=Math.min(D.opened,Math.floor(r1/ZH));z++){
    for(const [r,c] of zoneStars(z)){if(collected.has(k(r,c))||c<c0||c>c1)continue;const x=ox+(c+.5)*cell,y=oy+(r+.5)*cell,p=1+.12*Math.sin(t*4+r+c);ctx.fillStyle='rgba(255,230,90,.25)';ctx.beginPath();ctx.arc(x,y,cell*.4*p,0,7);ctx.fill();Core.star5(x,y,cell*.32*p,'#ffe033',ctx)}
    for(const [r,c] of zoneHoles(z)){if(eaten.has(k(r,c)))continue;drawHole(ox+(c+.5)*cell,oy+(r+.5)*cell,cell*.55*(1+.05*Math.sin(t*3)),t)}}
  // particles
  for(const p of parts){p.x+=p.vx;p.y+=p.vy;p.vy+=.06;p.life-=dt*.9;if(p.life>0){ctx.globalAlpha=Math.max(0,p.life);Core.star5(p.x,p.y,p.s,p.c,ctx)}}ctx.globalAlpha=1;parts=parts.filter(p=>p.life>0);
  // fairy
  const bb=F.bump>0?Math.sin(F.bump*Math.PI)*.18:0;F.bump=Math.max(0,F.bump-dt*4);
  Core.drawFairy(ctx,ox+(F.x+.5+F.bx*bb)*cell,oy+(F.y+.45+F.by*bb)*cell+Math.sin(t*4)*cell*.05,cell/80,t,F.dir,F.cheek);
  // flying stars to the gate
  for(const f of flyers){const u=(t-f.t0)/.7;if(u<0)continue;const e=u<1?u*u*(3-2*u):1;const x=f.x0+(f.gx-f.x0)*e,y=f.y0+(f.gy-f.y0)*e-Math.sin(e*Math.PI)*80;
    if(u<1)Core.star5(x,y,14,'#ffe033',ctx);if(!f.started){f.started=true;$('wStars').textContent='⭐ '+Math.max(D.stars,f.val)}
    if(u>=1&&!f.done){f.done=true;burst(f.gx,f.gy,5,['#fff6a8','#ffe033'],3);tone(1200+Math.random()*600,0,.15,.05);if(f.last&&gateAnim){gateOpened(gateAnim.zz);gateAnim=null}}}
  flyers=flyers.filter(f=>!f.done);
  // celebration & banner
  if(cele){const u=t-cele.t;if(u<1.6){ctx.save();ctx.translate(W/2,H*.32);ctx.rotate(Math.sin(t*10)*.08);const s=(1+.1*Math.sin(t*14))*Math.min(1,u*4);ctx.scale(s,s);const fs=Math.min(W*.12,90);ctx.font=`bold ${fs}px "Trebuchet MS",sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.lineWidth=fs*.16;ctx.strokeStyle='#fff';ctx.strokeText('NOM NOM!',0,0);ctx.fillStyle='#ff4fa8';ctx.fillText('NOM NOM!',0,0);ctx.restore();F.cheek=Math.min(1,u*3)*(u<1.2?1:Math.max(0,(1.6-u)/.4))}else{cele=null;F.cheek=0}}
  if(banner){const u=t-banner.t;if(u<2.8){const a=Math.min(1,u/.4,(2.8-u)/.5);ctx.save();ctx.globalAlpha=a;const fs=Math.max(18,Math.min(30,W/18));ctx.font=`bold ${fs}px "Trebuchet MS",sans-serif`;const tw=ctx.measureText(banner.text).width+40,by=top+8;ctx.fillStyle='rgba(30,14,70,.78)';rr(W/2-tw/2,by,tw,fs+20,(fs+20)/2);ctx.fillStyle='#fff6c8';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(banner.text,W/2,by+(fs+20)/2);ctx.restore()}else banner=null}
  if(target&&down){ctx.strokeStyle='rgba(255,255,255,.5)';ctx.lineWidth=3;ctx.beginPath();ctx.arc(ox+(target.c+.5)*cell,oy+(target.r+.5)*cell,cell*.3,0,7);ctx.stroke()}}
// ---------- events on arrival ----------
function arrive(){const key=k(F.r,F.c);
  if(starAt(F.r,F.c)){collected.add(key);D.stars++;D.total++;Core.SND.star();burst(OX()+(F.c+.5)*cell,OY()+(F.r+.5)*cell,16,['#fff6a8','#ffe033','#ffd1f2','#fff'],4);hud('wStars');save()}
  if(holeAt(F.r,F.c)){eaten.add(key);D.holes++;Core.playNom();setTimeout(()=>Core.playNom(),380);cele={t:performance.now()/1000};burst(OX()+(F.c+.5)*cell,OY()+(F.r+.5)*cell,40,['#ff6ec7','#ffe033','#7fe0ff','#9dffad','#c77dff'],6);hud('wHoles');save()}
  roomCheck()}
// ---------- loop ----------
let last=0;
function loop(now){if(!active)return;const dt=Math.min(.05,(now-last)/1000);last=now;const t=now/1000;
  if(down&&lastPtr&&mode==='walk')target=toCell(lastPtr);
  if(mode==='walk'){if(!F.path.length){const s=step();if(s){F.path.push([F.r+s[0],F.c+s[1]]);if(s[1])F.dir=s[1]}}
    if(F.path.length){const [nr,nc]=F.path[0],sp=6.5*speed*dt,dx=nc-F.x,dy=nr-F.y,d=Math.hypot(dx,dy);
      if(d<=sp){F.x=nc;F.y=nr;F.r=nr;F.c=nc;F.path.shift();arrive()}else{F.x+=dx/d*sp;F.y+=dy/d*sp}
      if(Math.random()<.5)parts.push({x:OX()+(F.x+.5)*cell-F.dir*cell*.2,y:OY()+(F.y+.6)*cell,vx:Math.random()-.5,vy:Math.random()*.5,life:.8,c:['#fff6a8','#ffd1f2','#bfe8ff'][Math.random()*3|0],s:Math.random()*3+2})}}
  const [tx,ty]=camTarget(),kk=Math.min(1,dt*3.2);camX+=(tx-camX)*kk;camY+=(ty-camY)*kk;
  frameDraw(t,dt);if(now-saveT>1500)save(now);requestAnimationFrame(loop)}
addEventListener('pagehide',()=>{if(active)save()});document.addEventListener('visibilitychange',()=>{if(active&&document.hidden)save()});
// test hook
window.__world={get D(){return D},get F(){return F},get mode(){return mode},get active(){return active},cellAt,passable,starAt,holeAt,zoneOf,set speed(v){speed=v},get room(){return curRoom},collected:()=>collected,eaten:()=>eaten,G};
})();
