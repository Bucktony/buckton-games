(()=>{
'use strict';
const $=id=>document.getElementById(id);
const cv=$('c'),ctx=cv.getContext('2d');
const COLORS=['#ff6ec7','#b36bff','#4fa8ff','#3fd48a','#ffb52e','#ff5a5a'];
const store={get(k,d){try{const v=localStorage.getItem('fm_'+k);return v==null?d:v}catch(e){return d}},set(k,v){try{localStorage.setItem('fm_'+k,v)}catch(e){}}};
let fairyName=store.get('name','Floaty'),waveAt=-99;
// ---------- look (dress-up) ----------
const DEFAULT_LOOK={hair:'#ffd84d',skin:'#ffe0c7',dress:'#ff6ec7',shoes:'#8fd3ff',stick:'#8b5a2b',star:'#ffe033'};
const PARTS=[
 {k:'hair',icon:'💇',word:'Hair',sw:['#ffd84d','#f3c98b','#d9822b','#a0522d','#6b3e1e','#3b2516','#1c1410','#ff8fcf']},
 {k:'skin',icon:'🙂',word:'Skin',sw:['#ffe0c7','#f7d1b0','#ecbd96','#d9a077','#bf8159','#9c6440','#7a482b','#57311d']},
 {k:'dress',icon:'👗',word:'Dress',sw:['#ff6ec7','#b36bff','#4fa8ff','#3fd48a','#ffb52e','#ff5a5a','#2fc9c9','#ffffff']},
 {k:'shoes',icon:'👟',word:'Shoes',sw:['#8fd3ff','#ff9ad5','#ffffff','#ffd84d','#b48cff','#7fe0a0','#ff6b6b','#6b4a3a']},
 {k:'stick',icon:'🪄',word:'Wand',sw:['#8b5a2b','#c08a4f','#d9d9e3','#ffcf3a','#ff8fcf','#b48cff','#5fc6ff','#ffffff']},
 {k:'star',icon:'⭐',word:'Star',sw:['#ffe033','#ffffff','#ff8fcf','#8fe0ff','#b48cff','#7fe0a0','#ffa64d','#ff5a5a']}];
let LOOK={...DEFAULT_LOOK};
try{const j=JSON.parse(store.get('look','null'));if(j&&typeof j==='object')for(const k in DEFAULT_LOOK)if(/^#[0-9a-f]{6}$/i.test(j[k]||''))LOOK[k]=j[k]}catch(e){}
{const old=store.get('dress',null);if(old&&!store.get('look',null)&&/^#[0-9a-f]{6}$/i.test(old))LOOK.dress=old}
function saveLook(){store.set('look',JSON.stringify(LOOK))}
// ---------- audio ----------
let AC=null; const ac=()=>{if(!AC){try{AC=new (window.AudioContext||window.webkitAudioContext)()}catch(e){}} if(AC&&AC.state==='suspended')AC.resume(); return AC};
function tone(f,t0,dur,type='sine',vol=.18,f2){const a=ac();if(!a)return;const o=a.createOscillator(),g=a.createGain();o.type=type;o.frequency.setValueAtTime(f,a.currentTime+t0);if(f2)o.frequency.exponentialRampToValueAtTime(f2,a.currentTime+t0+dur);g.gain.setValueAtTime(0,a.currentTime+t0);g.gain.linearRampToValueAtTime(vol,a.currentTime+t0+.01);g.gain.exponentialRampToValueAtTime(.001,a.currentTime+t0+dur);o.connect(g).connect(a.destination);o.start(a.currentTime+t0);o.stop(a.currentTime+t0+dur+.05)}
function noise(t0,dur,vol=.3,freq=600){const a=ac();if(!a)return;const b=a.createBuffer(1,a.sampleRate*dur,a.sampleRate),d=b.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*(1-i/d.length);const s=a.createBufferSource();s.buffer=b;const f=a.createBiquadFilter();f.type='lowpass';f.frequency.value=freq;const g=a.createGain();g.gain.value=vol;s.connect(f).connect(g).connect(a.destination);s.start(a.currentTime+t0)}
const SND={
 star(){const n=[1047,1319,1568,2093];n.forEach((f,i)=>tone(f,i*.06,.35,'triangle',.12))},
 bump(){tone(260,0,.18,'sine',.2,140)},
 nomSynth(){for(let k=0;k<2;k++){noise(k*.22,.12,.5,500);tone(200,k*.22,.14,'square',.08,90)}},
 yay(){[523,659,784,1047,784,1047].forEach((f,i)=>tone(f,i*.11,.4,'triangle',.14))},
 flap(){tone(1800+Math.random()*900,0,.12,'sine',.03)},
 giggle(){for(let i=0;i<5;i++)tone(900+i*70*(i%2?-1:1),i*.1,.08,'sine',.08,1200)}
};
let recURL=store.get('nom',null);
function playNom(){if(recURL){try{const a=new Audio(recURL);a.play().catch(()=>SND.nomSynth());return}catch(e){}}SND.nomSynth()}
// ---------- levels ----------
const BUILTIN=(window.BUILTIN_LEVELS||[]), CUSTOM=(window.CUSTOM_LEVELS||[]);
let playlist=[],li=0,grid=null,R=0,C=0,totalStars=0,levelStars=0;
function loadLevel(lv){
  let g=lv.grid.map(r=>r.replace(/ /g,'.'));const w=Math.max(...g.map(r=>r.length));g=g.map(r=>r.padEnd(w,'#'));
  const portrait=innerHeight>innerWidth;areas=(lv.areas||[]).map(a=>({...a}));if((g.length<w)===portrait&&g.length!==w){g=Array.from({length:w},(_,c)=>g.map(r=>r[c]).join(''));areas=areas.map(a=>({...a,r0:a.c0,c0:a.r0,r1:a.c1,c1:a.r1}))}
  grid=g.map(r=>r.split(''));R=grid.length;C=grid[0].length;stars=[];
  for(let r=0;r<R;r++)for(let c=0;c<C;c++){const ch=grid[r][c];if(ch==='S'){F.r=r;F.c=c;F.x=c;F.y=r}if(ch==='E'){hole.r=r;hole.c=c}if(ch==='*')stars.push({r,c,got:false,ph:Math.random()*6})}
  curArea=-1;banner=null;F.path=[];F.bump=0;F.cheek=0;F.dir=1;hole.size=1;hole.bites=0;levelStars=0;state='play';parts=[];target=null;
  $("lvl").textContent=playlist===BUILTIN?`Level ${li+1}`:lv.name;updHud();layout();areaCheck();snapCam();
}
const open=(r,c)=>r>=0&&c>=0&&r<R&&c<C&&grid[r][c]!=='#';
// ---------- state ----------
const F={r:0,c:0,x:0,y:0,path:[],bump:0,bx:0,by:0,cheek:0,dir:1,t:0};
const hole={r:0,c:0,size:1,bites:0};
let areas=[],curArea=-1,banner=null,camMode=false,camX=0,camY=0,viewTop=0,viewW=0,viewH=0,lastPtr=null;
let stars=[],parts=[],state='menu',tState=0,target=null,keyDir=null,cell=40,ox=0,oy=0,dpr=1,W=0,H=0,lastBump=0;
const bg=Array.from({length:180},()=>({x:Math.random(),y:Math.random(),r:Math.random()*1.8+.4,p:Math.random()*6}));
function layout(){dpr=Math.min(2,devicePixelRatio||1);W=innerWidth;H=innerHeight;cv.width=W*dpr;cv.height=H*dpr;ctx.setTransform(dpr,0,0,dpr,0,0);
  if(!grid)return;const top=Math.min(80,H*.11);viewTop=top;viewW=W;viewH=H-top-12;
  const fit=Math.floor(Math.min((W-16)/C,(H-top-12)/R));
  // big mazes: keep tiles a comfortable touch size and use a gentle camera instead of shrinking
  camMode=fit<26;cell=camMode?Math.round(Math.max(34,Math.min(48,Math.min(W,H)/13))):fit;
  if(!camMode){ox=(W-cell*C)/2;oy=top+(H-top-12-cell*R)/2}else{snapCam()}}
addEventListener('resize',()=>{layout()});
function areaAt(r,c){for(let i=0;i<areas.length;i++){const a=areas[i];if(r>=a.r0&&r<=a.r1&&c>=a.c0&&c<=a.c1)return i}return -1}
function areaCheck(){if(!areas.length)return;const a=areaAt(F.r,F.c);if(a<0)return;if(curArea>=0){const k=areas[curArea];if(F.r>k.r0&&F.r<k.r1&&F.c>k.c0&&F.c<k.c1)return}
  if(a!==curArea){curArea=a;banner={text:(areas[a].emoji?areas[a].emoji+' ':'')+areas[a].name,t:performance.now()/1000};if(state==='play')SND.flap()}}
function camTarget(){const fx=(F.x+.5)*cell,fy=(F.y+.5)*cell;let x0=0,y0=0,x1=C*cell,y1=R*cell;
  if(curArea>=0){const a=areas[curArea];x0=a.c0*cell;x1=(a.c1+1)*cell;y0=a.r0*cell;y1=(a.r1+1)*cell}
  const ax=(lo,hi,f,v)=>hi-lo<=v?(lo+hi)/2-v/2:Math.max(lo,Math.min(hi-v,f-v/2));
  const fitAx=(tot,v,t)=>tot<=v?(tot-v)/2:Math.max(0,Math.min(tot-v,t));
  return[fitAx(C*cell,viewW,ax(x0,x1,fx,viewW)),fitAx(R*cell,viewH,ax(y0,y1,fy,viewH))]}
function snapCam(){if(!grid||!camMode)return;[camX,camY]=camTarget();ox=-camX;oy=viewTop-camY}
function updCam(dt){if(!camMode)return;const[tx,ty]=camTarget();const k=Math.min(1,dt*3.2);camX+=(tx-camX)*k;camY+=(ty-camY)*k;ox=Math.round(-camX);oy=Math.round(viewTop-camY)}
function areaColor(r,c){const i=areaAt(r,c);return i<0?null:areas[i].color}
function updHud(){$('stars').textContent='⭐ '+(totalStars)}
// ---------- input ----------
const KEYS={ArrowUp:[-1,0],ArrowDown:[1,0],ArrowLeft:[0,-1],ArrowRight:[0,1]};
addEventListener('keydown',e=>{if(KEYS[e.key]&&state==='play'){keyDir=KEYS[e.key];target=null;e.preventDefault();ac()}});
addEventListener('keyup',e=>{if(KEYS[e.key]&&keyDir===KEYS[e.key])keyDir=null});
let down=false;
function toCell(e){return{r:(e.clientY-oy)/cell-.5,c:(e.clientX-ox)/cell-.5}}
cv.addEventListener('pointerdown',e=>{if(state!=='play')return;down=true;ac();lastPtr={clientX:e.clientX,clientY:e.clientY};target=toCell(e);keyDir=null;cv.setPointerCapture(e.pointerId)});
cv.addEventListener('pointermove',e=>{if(down&&state==='play'){lastPtr={clientX:e.clientX,clientY:e.clientY};target=toCell(e)}});
const up=()=>{down=false};cv.addEventListener('pointerup',up);cv.addEventListener('pointercancel',up);
function bump(dr,dc){const now=performance.now();if(now-lastBump<450)return;lastBump=now;F.bump=1;F.bx=dc;F.by=dr;SND.bump()}
function chooseStep(){
  if(keyDir){const [dr,dc]=keyDir;if(open(F.r+dr,F.c+dc))return[dr,dc];bump(dr,dc);return null}
  if(target){const dy=target.r-F.r,dx=target.c-F.c;if(Math.abs(dx)<.5&&Math.abs(dy)<.5){if(!down)target=null;return null}
    const opts=[];const sx=Math.sign(dx),sy=Math.sign(dy);
    if(Math.abs(dx)>=Math.abs(dy)){if(Math.abs(dx)>=.5)opts.push([0,sx]);if(Math.abs(dy)>=.5)opts.push([sy,0])}else{if(Math.abs(dy)>=.5)opts.push([sy,0]);if(Math.abs(dx)>=.5)opts.push([0,sx])}
    for(const o of opts)if(open(F.r+o[0],F.c+o[1]))return o;
    if(opts.length)bump(opts[0][0],opts[0][1]);if(!down)target=null;return null}
  return null}
// ---------- particles ----------
function burst(x,y,n,cols,sp=4){for(let i=0;i<n;i++){const a=Math.random()*6.28,v=Math.random()*sp+1;parts.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,life:1,c:cols[i%cols.length],s:Math.random()*5+3,st:Math.random()<.6})}}
// ---------- drawing ----------
function star5(x,y,r,col,c=ctx){c.beginPath();for(let k=0;k<10;k++){const a=k*Math.PI/5-Math.PI/2,rr=k%2?r*.45:r;c.lineTo(x+Math.cos(a)*rr,y+Math.sin(a)*rr)}c.closePath();c.fillStyle=col;c.fill()}
function shade(hex,f){const n=parseInt(hex.slice(1),16);let r=n>>16,g=n>>8&255,b=n&255;const m=v=>Math.max(0,Math.min(255,Math.round(f<1?v*f:v+(255-v)*(f-1))));return`rgb(${m(r)},${m(g)},${m(b)})`}
function drawFairy(c,x,y,s,t,dir=1,cheek=0,L=LOOK){
  const col=L.dress,skin=L.skin,arm=skin.toLowerCase()==='#ffe0c7'?'#ffd9bf':shade(skin,.95);
  c.save();c.translate(x,y);c.scale(s*dir,s);
  const fl=.55+.45*Math.abs(Math.sin(t*14));
  c.fillStyle='rgba(200,235,255,.65)';c.strokeStyle='rgba(255,255,255,.9)';c.lineWidth=2;
  for(const sx of[-1,1]){c.beginPath();c.ellipse(sx*30*fl,-22,30*fl,20,sx*-.5,0,7);c.fill();c.stroke();c.beginPath();c.ellipse(sx*22*fl,4,20*fl,13,sx*.5,0,7);c.fillStyle='rgba(255,215,245,.6)';c.fill();c.stroke();c.fillStyle='rgba(200,235,255,.65)'}
  // hair back
  c.fillStyle=L.hair;c.beginPath();c.ellipse(0,-38,19,22,0,0,7);c.fill();c.fillRect(-19,-40,38,30);
  // dress
  c.fillStyle=col;c.beginPath();c.moveTo(-9,-20);c.lineTo(9,-20);c.lineTo(26,30);c.quadraticCurveTo(0,38,-26,30);c.closePath();c.fill();
  c.fillStyle=shade(col,.8);c.fillRect(-10,-21,20,13);c.fillStyle='#ffe27a';c.fillRect(-11,-10,22,4);
  c.fillStyle='rgba(255,255,255,.85)';[[-10,6],[8,12],[-3,20],[13,24],[-15,24]].forEach(([a,b])=>star5(a,b,3,'rgba(255,255,255,.85)',c));
  // shoes
  c.fillStyle=L.shoes;const st=Math.sin(t*8)*3;c.beginPath();c.ellipse(-8,36+st,7,4.5,0,0,7);c.fill();c.beginPath();c.ellipse(8,36-st,7,4.5,0,0,7);c.fill();
  // left arm (behind head is fine; it hangs down)
  c.strokeStyle=arm;c.lineWidth=5;c.lineCap='round';c.beginPath();c.moveTo(-7,-16);c.lineTo(-17,2);c.stroke();
  // face
  c.fillStyle=skin;const cw=cheek*5;c.beginPath();c.ellipse(0,-38,15+cw,17+cw*.4,0,0,7);c.fill();
  c.fillStyle=L.hair;c.beginPath();c.ellipse(0,-50,17,10,0,Math.PI,0);c.fill();c.beginPath();c.ellipse(-12,-44,6,9,.4,0,7);c.fill();c.beginPath();c.ellipse(12,-44,6,9,-.4,0,7);c.fill();
  c.fillStyle='#3a2350';const blink=(Math.sin(t*1.3)>.985)?.15:1;c.beginPath();c.ellipse(-6,-38,2.6,3.4*blink,0,0,7);c.fill();c.beginPath();c.ellipse(6,-38,2.6,3.4*blink,0,0,7);c.fill();
  c.fillStyle='#fff';c.beginPath();c.arc(-5.2,-39.3,1,0,7);c.arc(6.8,-39.3,1,0,7);c.fill();
  c.fillStyle=`rgba(255,120,150,${.45+cheek*.5})`;c.beginPath();c.arc(-10-cw,-32,3.5+cheek*3,0,7);c.arc(10+cw,-32,3.5+cheek*3,0,7);c.fill();
  c.strokeStyle='#c2386b';c.lineWidth=2;c.beginPath();if(cheek>.3){c.ellipse(0,-30,3,2,0,0,7);c.fillStyle='#c2386b';c.fill()}else{c.arc(0,-33,5,.2,Math.PI-.2)}c.stroke();
  // crown
  c.fillStyle='#ffcc22';c.beginPath();c.moveTo(-10,-55);c.lineTo(-10,-63);c.lineTo(-5,-58);c.lineTo(0,-66);c.lineTo(5,-58);c.lineTo(10,-63);c.lineTo(10,-55);c.closePath();c.fill();
  c.fillStyle='#ff5aa8';c.beginPath();c.arc(0,-58,1.8,0,7);c.fill();
  // right arm + wand: drawn LAST so stick and star are always in front of head and body
  const wv=Math.max(0,1-(t-waveAt)/1.4),ex=19+wv*3,ey=-4-wv*14,wa=Math.sin(t*3)*.25+Math.sin(t*12)*.55*wv;
  c.strokeStyle=arm;c.lineWidth=5;c.lineCap='round';c.beginPath();c.moveTo(7,-16);c.lineTo(ex,ey);c.stroke();
  c.save();c.translate(ex,ey);c.rotate(.18+wa);c.fillStyle='rgba(255,240,120,.3)';c.beginPath();c.arc(0,-28,12,0,7);c.fill();
  c.strokeStyle=L.stick;c.lineWidth=3.5;c.beginPath();c.moveTo(0,0);c.lineTo(0,-22);c.stroke();star5(0,-28,8,L.star,c);c.lineWidth=1;c.strokeStyle='rgba(0,0,0,.18)';c.stroke();c.restore();
  c.restore()}
function drawHole(x,y,r,t,size){
  if(size<=0.02)return;ctx.save();ctx.translate(x,y);
  const g=ctx.createRadialGradient(0,0,r*.2,0,0,r*1.5);g.addColorStop(0,'rgba(220,140,255,.5)');g.addColorStop(1,'rgba(220,140,255,0)');ctx.fillStyle=g;ctx.beginPath();ctx.arc(0,0,r*1.5,0,7);ctx.fill();
  ctx.beginPath();ctx.arc(0,0,r,0,7);ctx.save();ctx.clip();
  const cols=['#ff97dc','#c77dff','#8f5ae6','#ffc2f0','#aa6eff'];for(let k=0;k<10;k++){ctx.fillStyle=cols[k%5];ctx.beginPath();ctx.arc(0,0,r*(1-k/11),0,7);ctx.fill()}
  ctx.strokeStyle='rgba(255,255,255,.7)';ctx.lineWidth=Math.max(1.5,r/14);for(let a=0;a<5;a++){ctx.beginPath();for(let q=0;q<30;q++){const an=a*1.256+q*.13-t*1.6,rr=r*(.18+q/30*.8);ctx.lineTo(Math.cos(an)*rr,Math.sin(an)*rr)}ctx.stroke()}
  const sc=['#fff','#ffe14d','#7fe0ff','#9dffad'];for(let k=0;k<16;k++){const an=k*2.4-t*.6,rr=r*(.4+(k%4)*.13);ctx.fillStyle=sc[k%4];ctx.save();ctx.translate(Math.cos(an)*rr,Math.sin(an)*rr);ctx.rotate(an);ctx.fillRect(-r*.07,-r*.025,r*.14,r*.05);ctx.restore()}
  ctx.fillStyle='#2d1250';ctx.beginPath();ctx.arc(0,0,r*.26,0,7);ctx.fill();
  ctx.globalCompositeOperation='destination-out';for(let b=0;b<hole.bites;b++){const an=Math.PI+b*1.3;for(let j=-1;j<=1;j++){ctx.beginPath();ctx.arc(Math.cos(an+j*.35)*r*.95,Math.sin(an+j*.35)*r*.95,r*(.3+b*.06),0,7);ctx.fill()}}
  ctx.restore();ctx.restore()}
function drawBg(t){const g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,'#0d0630');g.addColorStop(1,'#3a1466');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
  for(const s of bg){const a=.5+.5*Math.sin(t*2+s.p);ctx.fillStyle=`rgba(255,255,230,${a})`;ctx.beginPath();ctx.arc(((s.x*W+t*6)%W),s.y*H,s.r,0,7);ctx.fill()}
  ctx.fillStyle='#f0a85a';ctx.beginPath();ctx.arc(W*.88,H*.85,Math.min(W,H)*.07,0,7);ctx.fill();ctx.strokeStyle='rgba(255,230,170,.7)';ctx.lineWidth=4;ctx.beginPath();ctx.ellipse(W*.88,H*.85,Math.min(W,H)*.12,Math.min(W,H)*.025,-.2,0,7);ctx.stroke();
  ctx.fillStyle='#6fc8ff';ctx.beginPath();ctx.arc(W*.08,H*.2,Math.min(W,H)*.04,0,7);ctx.fill()}
function drawMaze(t){
  const rA=Math.max(0,Math.floor((viewTop-oy)/cell)-1),rB=Math.min(R-1,Math.ceil((H-oy)/cell)),cA=Math.max(0,Math.floor(-ox/cell)-1),cB=Math.min(C-1,Math.ceil((W-ox)/cell));
  if(areas.length)for(const a of areas){ctx.fillStyle=a.color+'22';ctx.fillRect(ox+a.c0*cell,oy+a.r0*cell,(a.c1-a.c0+1)*cell,(a.r1-a.r0+1)*cell)}
  for(let r=camMode?rA:0;r<=(camMode?rB:R-1);r++)for(let c=camMode?cA:0;c<=(camMode?cB:C-1);c++){const x=ox+c*cell,y=oy+r*cell;
    if(grid[r][c]==='#'){ctx.fillStyle=(areas.length&&areaColor(r,c))||'#5b3aa8';rr(x+1,y+1,cell-2,cell-2,cell*.28);ctx.fillStyle='rgba(255,255,255,.18)';rr(x+cell*.15,y+cell*.12,cell*.7,cell*.22,cell*.11)}
    else{ctx.fillStyle='rgba(255,255,255,.06)';ctx.fillRect(x,y,cell,cell)}}
  for(const s of stars)if(!s.got){const x=ox+(s.c+.5)*cell,y=oy+(s.r+.5)*cell,p=1+.12*Math.sin(t*4+s.ph);ctx.fillStyle='rgba(255,230,90,.25)';ctx.beginPath();ctx.arc(x,y,cell*.42*p,0,7);ctx.fill();star5(x,y,cell*.34*p,'#ffe033')}
  // start pad
  }
function rr(x,y,w,h,r){ctx.beginPath();ctx.roundRect?ctx.roundRect(x,y,w,h,r):ctx.rect(x,y,w,h);ctx.fill()}
function bigText(txt,x,y,size,col,t){ctx.save();ctx.translate(x,y);ctx.rotate(Math.sin(t*10)*.08);const s=1+.1*Math.sin(t*14);ctx.scale(s,s);ctx.font=`bold ${size}px "Trebuchet MS","Comic Sans MS",sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.lineWidth=size*.16;ctx.strokeStyle='#fff';ctx.strokeText(txt,0,0);ctx.fillStyle=col;ctx.fillText(txt,0,0);ctx.restore()}
// ---------- loop ----------
let last=performance.now(),flapT=0;
function frame(now){const dt=Math.min(.05,(now-last)/1000);last=now;const t=now/1000;F.t=t;
  if(state==='world'){requestAnimationFrame(frame);return}
  if(state==='play'||state==='nom'){
    drawBg(t);drawMaze(t);
    const hx=ox+(hole.c+.5)*cell,hy=oy+(hole.r+.5)*cell;
    updCam(dt);if(down&&lastPtr&&state==='play')target=toCell(lastPtr);
    if(state==='play'){
      // movement
      const moving=F.path.length>0;
      if(!moving){const st=chooseStep();if(st){F.path.push([F.r+st[0],F.c+st[1]]);if(st[1])F.dir=st[1]}}
      if(F.path.length){const [nr,nc]=F.path[0];const sp=6.5*dt;const dx=nc-F.x,dy=nr-F.y,d=Math.hypot(dx,dy);if(d<=sp){F.x=nc;F.y=nr;F.r=nr;F.c=nc;F.path.shift();areaCheck();arrive()}else{F.x+=dx/d*sp;F.y+=dy/d*sp}
        if(Math.random()<.5)parts.push({x:ox+(F.x+.5)*cell-F.dir*cell*.2,y:oy+(F.y+.6)*cell,vx:(Math.random()-.5),vy:Math.random()*.5,life:1,c:['#fff6a8','#ffd1f2','#bfe8ff'][Math.random()*3|0],s:Math.random()*4+2,st:true})}
      drawHole(hx,hy,cell*.6*(1+.05*Math.sin(t*3)),t,1);
    }else{ // nom sequence
      const u=t-tState;const big=Math.min(1,u/.6);const hr=lerp(cell*.6,Math.min(W,H)*.22,ease(big));const cx=lerp(hx,W/2+Math.min(W,H)*.12,ease(big)),cy=lerp(hy,H*.55,ease(big));
      const bites=Math.min(4,Math.floor((u-.8)/.65)+1);if(u>.8&&bites>hole.bites){hole.bites=bites;playNom();burst(cx-hr*.9,cy,26,['#fff','#ffe14d','#ff97dc','#7fe0ff'],6);if(bites===4)hole.size=0}
      if(hole.size>0)drawHole(cx,cy,hr,t,1);
      const fx=lerp(ox+(F.x+.5)*cell,W/2-Math.min(W,H)*.2,ease(big)),fy=lerp(oy+(F.y+.5)*cell,H*.55,ease(big));
      const lean=u>.8?Math.max(0,Math.sin(((u-.8)%.65)/.65*Math.PI))*hr*.25:0;F.cheek=Math.min(1,Math.max(0,(u-.9)*1.5));
      parts.forEach(p=>{});drawParts(dt);
      drawFairy(ctx,fx+lean,fy,Math.min(W,H)/260*ease(big)+cell/90*(1-ease(big)),t,1,F.cheek);
      if(u>.8&&u<3.6)bigText('NOM NOM!',W/2,H*.2,Math.min(W*.13,110),'#ff4fa8',t);
      if(u>3.8){state='yummyWait';showYummy()}
      requestAnimationFrame(frame);return}
    drawParts(dt);
    const bx=F.bump>0?Math.sin(F.bump*Math.PI)*.18:0;F.bump=Math.max(0,F.bump-dt*4);
    drawFairy(ctx,ox+(F.x+.5+F.bx*bx)*cell,oy+(F.y+.45+F.by*bx)*cell+Math.sin(t*4)*cell*.05,cell/80,t,F.dir,0);
    if(banner){const u=performance.now()/1000-banner.t;if(u<2.8){const a=Math.min(1,u/.4,(2.8-u)/.5);ctx.save();ctx.globalAlpha=a;const fs=Math.max(20,Math.min(34,W/16));ctx.font=`bold ${fs}px "Trebuchet MS",sans-serif`;const tw=ctx.measureText(banner.text).width+44,bx=W/2-tw/2,by=viewTop+10+(1-a)*-10;ctx.fillStyle='rgba(40,20,90,.75)';rr(bx,by,tw,fs+22,(fs+22)/2);ctx.fillStyle='#fff6c8';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(banner.text,W/2,by+(fs+22)/2);ctx.restore()}else banner=null}
    if(target&&down){ctx.strokeStyle='rgba(255,255,255,.5)';ctx.lineWidth=3;ctx.beginPath();ctx.arc(ox+(target.c+.5)*cell,oy+(target.r+.5)*cell,cell*.3,0,7);ctx.stroke()}
  }else{drawBg(t);drawParts(dt);if(state==='yummyWait'||state==='done'){if(Math.random()<.4)burst(Math.random()*W,-10,1,['#ff6ec7','#ffe033','#7fe0ff','#9dffad','#c77dff'],2)}}
  requestAnimationFrame(frame)}
function drawParts(dt){for(const p of parts){p.x+=p.vx;p.y+=p.vy;p.vy+=.06;p.life-=dt*.9;if(p.life>0){ctx.globalAlpha=Math.max(0,p.life);if(p.st)star5(p.x,p.y,p.s,p.c);else{ctx.fillStyle=p.c;ctx.fillRect(p.x,p.y,p.s,p.s*1.6)}}}ctx.globalAlpha=1;parts=parts.filter(p=>p.life>0&&p.y<H+20)}
const lerp=(a,b,t)=>a+(b-a)*t,ease=t=>t*t*(3-2*t);
function arrive(){const s=stars.find(s=>!s.got&&s.r===F.r&&s.c===F.c);if(s){s.got=true;levelStars++;totalStars++;updHud();SND.star();burst(ox+(s.c+.5)*cell,oy+(s.r+.5)*cell,18,['#fff6a8','#ffe033','#ffd1f2','#fff'],4)}
  if(F.r===hole.r&&F.c===hole.c){state='nom';tState=performance.now()/1000;target=null;keyDir=null;SND.giggle()}}
// ---------- screens ----------
function show(id){document.querySelectorAll('.screen').forEach(s=>s.classList.toggle('on',s.id===id));$('hud').classList.toggle('on',!id)}
function showYummy(){SND.yay();$('yumStars').textContent=levelStars?`⭐ ${levelStars} star${levelStars===1?'':'s'}!`:'🌟 Great job!';$('nextBtn').textContent=li+1<playlist.length?'Next ▶':'⭐ Finish';show('yummy')}
function startPlaylist(list){playlist=list;li=0;totalStars=0;show(null);loadLevel(playlist[0])}
$('playBtn').onclick=()=>{ac();saveName();startPlaylist(BUILTIN)};
$('nextBtn').onclick=()=>{li++;if(li<playlist.length){show(null);loadLevel(playlist[li])}else{state='done';SND.yay();$('doneTitle').textContent=`You did it, ${fairyName}!`;$('doneStars').textContent=`⭐ ${totalStars} stars collected!`;drawPrev($('donePrev'));show('done')}};
$('againBtn').onclick=()=>{state='menu';drawPrev($('preview'));show('start')};
$('homeBtn').onclick=()=>{state='menu';grid=null;show('start')};
$('mazesBtn').onclick=()=>{ac();saveName();buildMazes();show('mazes')};
$('mazesBack').onclick=()=>show('start');
function buildMazes(){const L=$('mazeList');L.innerHTML='';if(!CUSTOM.length){L.innerHTML='<div class="big">No mazes yet! Draw one on paper ✏️</div>';return}
  let pg=null;const anyGroup=CUSTOM.some(l=>l.group);CUSTOM.forEach((lv,i)=>{const grp=lv.group||'✏️ Our Drawings';if(anyGroup&&grp!==pg){pg=grp;const h=document.createElement('div');h.className='mzh';h.textContent=grp==='More Mazes'?'✨ More Mazes':grp==='Giant Adventures'?'🌌 Giant Adventures':grp;L.appendChild(h)}const d=document.createElement('div');d.className='mz';const c=document.createElement('canvas');const g=lv.grid,rr_=g.length,cc=Math.max(...g.map(r=>r.length)),s=Math.floor(240/Math.max(rr_,cc));c.width=cc*s;c.height=rr_*s;const x=c.getContext('2d');
    g.forEach((row,r)=>[...row].forEach((ch,k)=>{const ac_=(lv.areas||[]).find(a=>r>=a.r0&&r<=a.r1&&k>=a.c0&&k<=a.c1);x.fillStyle=ch==='#'?(ac_?ac_.color:'#7a55d6'):ch==='S'?'#ff6ec7':ch==='E'?'#c77dff':ch==='*'?'#ffe033':'#2a1660';x.fillRect(k*s,r*s,s,s)}));
    d.appendChild(c);d.appendChild(document.createTextNode(lv.name));d.onclick=()=>startPlaylist(CUSTOM.slice(i));L.appendChild(d)})}
// start screen controls
const nameEl=$('name');nameEl.value=fairyName;function saveName(){fairyName=(nameEl.value.trim()||'Floaty').slice(0,14);store.set('name',fairyName)}
nameEl.addEventListener('change',saveName);nameEl.addEventListener('keydown',e=>{if(e.key==='Enter'){nameEl.blur();saveName()}});
// dress-up screen
const duParts=$('duParts');let duSpark=[];
function buildDress(){duParts.innerHTML='';PARTS.forEach(p=>{const row=document.createElement('div');row.className='part';
  row.innerHTML=`<div class="lab"><span>${p.icon}</span>${p.word}</div>`;const sws=document.createElement('div');sws.className='sws';
  p.sw.forEach(col=>{const d=document.createElement('div');d.style.background=col;d.setAttribute('role','button');d.setAttribute('aria-label',p.word+' color');d.dataset.col=col;if(col.toLowerCase()===LOOK[p.k].toLowerCase())d.className='sel';
    d.onclick=()=>{LOOK[p.k]=col;saveLook();[...sws.children].forEach(x=>x.classList.toggle('sel',x===d));changed()};sws.appendChild(d)});
  row.appendChild(sws);duParts.appendChild(row)})}
function changed(){ac();SND.star();waveAt=performance.now()/1000;for(let i=0;i<18;i++){const a=Math.random()*6.28,v=Math.random()*3+1.5;duSpark.push({x:210+Math.cos(a)*40,y:200+Math.sin(a)*40,vx:Math.cos(a)*v,vy:Math.sin(a)*v,l:1,c:['#fff6a8','#ffe033','#ffd1f2','#bfe8ff'][i%4]})}drawDress()}
function drawDress(){const c=$('duCanvas'),x=c.getContext('2d');x.clearRect(0,0,c.width,c.height);drawFairy(x,c.width/2,c.height*.6,c.width/120,performance.now()/1000,1,0);
  for(const p of duSpark){p.x+=p.vx;p.y+=p.vy;p.l-=.03}
  x.globalAlpha=1;duSpark.forEach(p=>{if(p.l>0){x.save();x.globalAlpha=p.l;x.fillStyle=p.c;x.beginPath();for(let k=0;k<10;k++){const a=k*Math.PI/5-Math.PI/2,r=k%2?3:7;x.lineTo(p.x+Math.cos(a)*r,p.y+Math.sin(a)*r)}x.fill();x.restore()}});duSpark=duSpark.filter(p=>p.l>0)}
$('dressBtn').onclick=()=>{ac();saveName();buildDress();state='dressup';show('dressup');waveAt=performance.now()/1000};
$('duDone').onclick=()=>{state='menu';drawPrev($('preview'));show('start')};
$('duReset').onclick=()=>{LOOK={...DEFAULT_LOOK};saveLook();buildDress();changed()};
function drawPrev(c){const x=c.getContext('2d');x.clearRect(0,0,c.width,c.height);drawFairy(x,c.width/2,c.height*.6,c.width/110,performance.now()/1000,1,0)}
setInterval(()=>{if(state==='dressup')drawDress();if(state==='menu')drawPrev($('preview'));if(state==='done')drawPrev($('donePrev'))},50);
// mic recording
const recBtn=$('recBtn'),recPlay=$('recPlay'),recDel=$('recDel');
function recUI(){recPlay.style.display=recDel.style.display=recURL?'':'none'}recUI();
recPlay.onclick=()=>{ac();playNom()};recDel.onclick=()=>{recURL=null;try{localStorage.removeItem('fm_nom')}catch(e){}recUI()};
if(!(navigator.mediaDevices&&window.MediaRecorder))recBtn.style.display='none';
recBtn.onclick=async()=>{try{ac();const stream=await navigator.mediaDevices.getUserMedia({audio:true});const mr=new MediaRecorder(stream);const chunks=[];mr.ondataavailable=e=>chunks.push(e.data);
  mr.onstop=()=>{stream.getTracks().forEach(t=>t.stop());recBtn.classList.remove('recording');recBtn.textContent='🎤 Record your NOM NOM!';const blob=new Blob(chunks,{type:mr.mimeType||'audio/webm'});const fr=new FileReader();fr.onload=()=>{recURL=fr.result;store.set('nom',recURL);recUI();playNom()};fr.readAsDataURL(blob)};
  mr.start();recBtn.classList.add('recording');recBtn.textContent='🔴 Say NOM NOM!';setTimeout(()=>mr.state!=='inactive'&&mr.stop(),2000)}catch(e){recBtn.textContent='🎤 Mic not allowed';setTimeout(()=>recBtn.textContent='🎤 Record your NOM NOM!',2500)}};
// test hook
window.__fm={drawFairy:(...a)=>drawFairy(...a),wave:t=>{waveAt=t},get look(){return LOOK},DEFAULT_LOOK,get cam(){return{camMode,camX,camY,cell,curArea,area:curArea>=0?areas[curArea].name:null,ox,oy}},get state(){return state},get level(){return li},get grid(){return grid},F,hole,levels:()=>({builtin:BUILTIN.length,custom:CUSTOM.length})};
window.__fmCore={drawFairy:(...a)=>drawFairy(...a),star5,SND,playNom,ac,show,shade,setState:s=>{state=s},get state(){return state},saveName,get name(){return fairyName}};
layout();requestAnimationFrame(frame);
})();
