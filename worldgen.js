// Star Gate World generator: pure, seeded, deterministic. Works in the browser (window.WorldGen) and Node (require).
(function(root){
'use strict';
const RW=23, RH=15, ROOMS=4, WW=(RW-1)*ROOMS+1, ZH=RH-1; // a zone = one row of 4 rooms; zones stack downward and share wall rows
const THEMES=[
 {name:'Sunflower Meadow',emoji:'🌻',wall:'#e0a82e',floor:'rgba(255,220,90,.10)',bg:['#2a1f5c','#a0577a'],deco:'sunflower'},
 {name:'Moon Garden',emoji:'🌙',wall:'#6f86e0',floor:'rgba(170,190,255,.10)',bg:['#0d0b35','#2d2a78'],deco:'moon'},
 {name:'Rainbow Clouds',emoji:'🌈',wall:'#d46bd0',floor:'rgba(255,170,240,.10)',bg:['#2b1260','#7a3a9a'],deco:'cloud'},
 {name:'Candy Clouds',emoji:'🍭',wall:'#ff8fb8',floor:'rgba(255,200,225,.12)',bg:['#3a1450','#c2577f'],deco:'candy'},
 {name:'Seashell Cove',emoji:'🐚',wall:'#2fb7c2',floor:'rgba(120,230,230,.10)',bg:['#06264a','#0f6a80'],deco:'shell'},
 {name:'Snowflake Hills',emoji:'❄️',wall:'#8fb8e6',floor:'rgba(230,245,255,.12)',bg:['#1a2350','#5a6fa8'],deco:'snow'}];
const BASE=[5,8,12,15,20,25];
function price(z){return Math.min(100, z<BASE.length?BASE[z]:25+5*(z-5))}
function margin(p){return Math.max(2,Math.ceil(p*0.15))}
function rng(a){a>>>=0;return function(){a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
const D4=[[1,0],[-1,0],[0,1],[0,-1]];
function carveRoom(rand,g,c0){
  const cw=(RW-1)/2,ch=(RH-1)/2,ri=n=>Math.floor(rand()*n);
  const seen=new Set();let st=[[ri(cw),ri(ch)]];seen.add(st[0]+'');g[st[0][1]*2+1][c0+st[0][0]*2+1]='.';let last=null;
  while(st.length){const [x,y]=st[st.length-1];const nb=D4.filter(([dx,dy])=>x+dx>=0&&x+dx<cw&&y+dy>=0&&y+dy<ch&&!seen.has([x+dx,y+dy]+''));
    if(!nb.length){st.pop();last=null;continue}
    const d=(last&&nb.some(n=>n[0]===last[0]&&n[1]===last[1])&&rand()<.6)?last:nb[ri(nb.length)];
    const nx=x+d[0],ny=y+d[1];g[y*2+1+d[1]][c0+x*2+1+d[0]]='.';g[ny*2+1][c0+nx*2+1]='.';seen.add([nx,ny]+'');st.push([nx,ny]);last=d}
  let loops=4+ri(3),t=0;
  while(loops&&t<3000){t++;const r=1+ri(RH-2),c=1+ri(RW-2),C=c0+c;
    if(g[r][C]==='#'&&((r%2===1&&c%2===0&&g[r][C-1]==='.'&&g[r][C+1]==='.')||(r%2===0&&c%2===1&&g[r-1][C]==='.'&&g[r+1][C]==='.'))){g[r][C]='.';loops--}}
  for(let k=1+ri(2);k>0;k--){const [rw,rh]=[[3,3],[5,3],[3,5]][ri(3)];const r0=1+2*ri((RH-rh-1)/2|0),cc=1+2*ri((RW-rw-1)/2|0);
    for(let r=r0;r<r0+rh&&r<RH-1;r++)for(let c=cc;c<cc+rw&&c<RW-1;c++)g[r][c0+c]='.'}
}
function bfs(g,s){const d=new Map([[s+'',0]]),q=[s];for(let i=0;i<q.length;i++){const [r,c]=q[i];for(const [a,b] of D4){const n=[r+a,c+b];if(n[0]>0&&n[0]<RH-1&&n[1]>0&&n[1]<WW-1&&g[n[0]][n[1]]!=='#'&&!d.has(n+'')){d.set(n+'',d.get(r+','+c)+1);q.push(n)}}}return d}
function gateColOf(seed,z){const rand=rng((seed^Math.imul(z+1,0x9E3779B1)^0x5bd1e995)>>>0);const room=Math.floor(rand()*ROOMS);return room*(RW-1)+2*Math.floor(rand()*((RW-1)/2))+1}
function zone(seed,z){
  for(let salt=0;salt<20;salt++){
    const rand=rng((seed^Math.imul(z+1,0x9E3779B1)^Math.imul(salt,0x85EBCA6B))>>>0),ri=n=>Math.floor(rand()*n);
    const g=Array.from({length:RH},()=>Array(WW).fill('#'));
    for(let i=0;i<ROOMS;i++)carveRoom(rand,g,i*(RW-1));
    for(let i=1;i<ROOMS;i++){const c=i*(RW-1);const rows=[];for(let r=1;r<RH-1;r+=2)rows.push(r);for(let k=0;k<2;k++){const r=rows.splice(ri(rows.length),1)[0];g[r][c]='.'}}
    const entry=z===0?[1,1]:[1,gateColOf(seed,z-1)];
    const gateCol=gateColOf(seed,z), gateFront=[RH-2,gateCol];
    const p=price(z), n=p+margin(p)+ri(4);
    const dist=bfs(g,entry);
    const open=[];for(let r=1;r<RH-1;r++)for(let c=1;c<WW-1;c++)if(g[r][c]!=='#')open.push([r,c]);
    const isDead=([r,c])=>D4.filter(([a,b])=>g[r+a][c+b]!=='#').length===1;
    const busy=new Set([entry+'',gateFront+'']);
    // black holes: far-ish dead ends, preferably in different rooms
    const far=open.filter(p=>isDead(p)&&!busy.has(p+'')).sort((a,b)=>dist.get(b+'')-dist.get(a+''));
    const nh=z===0?1:1+(rand()<.5?1:0);const holes=[];const usedRooms=new Set();
    for(const q of far.slice(0,Math.max(6,far.length*.4|0))){if(holes.length>=nh)break;const room=Math.floor(q[1]/(RW-1));if(usedRooms.has(room))continue;usedRooms.add(room);holes.push(q);busy.add(q+'')}
    // stars: dead ends first (worth exploring), then spread out
    const cand=open.filter(p=>!busy.has(p+''));for(let i=cand.length-1;i>0;i--){const j=ri(i+1);[cand[i],cand[j]]=[cand[j],cand[i]]}
    cand.sort((a,b)=>(isDead(b)?1:0)-(isDead(a)?1:0));
    const stars=[],taken=new Set();
    for(const sp of [3,2,0])for(const q of cand){if(stars.length>=n)break;if(taken.has(q+''))continue;if(sp&&stars.some(s=>Math.abs(s[0]-q[0])+Math.abs(s[1]-q[1])<sp))continue;stars.push(q);taken.add(q+'')}
    const Z={z,seed,grid:g.map(r=>r.join('')),entry,gateCol,gateFront,price:p,nextPrice:price(z),stars,holes,theme:z%THEMES.length};
    if(!check(Z).length)return Z;
  }
  throw new Error('zone generation failed z='+z);
}
// every star, black hole, the gate front and (for z>0) the entry must be reachable from the entry
function check(Z){const errs=[];const g=Z.grid;const d=bfs(g,Z.entry);
  if(g[Z.entry[0]][Z.entry[1]]==='#')errs.push('entry blocked');
  if(!d.has(Z.gateFront+''))errs.push('gate unreachable');
  Z.stars.forEach(s=>{if(!d.has(s+''))errs.push('star unreachable '+s)});
  Z.holes.forEach(s=>{if(!d.has(s+''))errs.push('black hole unreachable '+s)});
  const p=Z.price;if(Z.stars.length<p+margin(p))errs.push(`only ${Z.stars.length} stars for price ${p}`);
  return errs}
// guarantee: stars reachable before gate z (all zones 0..z) minus stars spent on gates 0..z-1 >= price(z)+margin
function guarantee(seed,Zmax){const out=[];let avail=0;for(let z=0;z<Zmax;z++){const Z=zone(seed,z);avail+=Z.stars.length;const need=Z.price+margin(Z.price);out.push({z,price:Z.price,stars:Z.stars.length,available:avail,need,ok:avail>=need,errors:check(Z)});avail-=Z.price}return out}
const API={RW,RH,ROOMS,WW,ZH,THEMES,price,margin,zone,check,guarantee,gateColOf};
if(typeof module!=='undefined'&&module.exports)module.exports=API;else root.WorldGen=API;
})(typeof window!=='undefined'?window:globalThis);
