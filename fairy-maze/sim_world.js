// Node sim: node sim_world.js
// Proves: star math never strands the player, every star/black hole/gate/tea nook is reachable, prices cap at 100,
// the zone path grows in all directions and never gets stuck, the main black hole sits right next to the gate,
// and no zone is harder than the original Zone 2 (CAP measured from v1 zone 2 medians).
const W=require('./worldgen.js');let bad=0;const sides={},worst={pathLen:0,deadEnds:0,pathJunctions:0,holeToGate:0};
for(const seed of [1,42,12345,987654321,2026]){
  const res=W.guarantee(seed,32);
  for(const r of res){sides[r.side]=(sides[r.side]||0)+1;
    for(const k of ['pathLen','deadEnds','pathJunctions'])worst[k]=Math.max(worst[k],r.diff[k]);worst.holeToGate=Math.max(worst.holeToGate,r.holeToGate);
    if(!r.ok||r.errors.length||r.holeToGate>W.CAP.holeToGate||r.diff.pathLen>W.CAP.pathLen||r.diff.deadEnds>W.CAP.deadEnds||r.diff.pathJunctions>W.CAP.pathJunctions){bad++;console.log('FAIL',seed,JSON.stringify(r))}}
  if(seed===42)console.log('seed 42:\n'+res.slice(0,12).map(r=>`z${r.z} at (${r.pos}) gate ${r.side}: price ${r.price}, stars ${r.stars}, available ${r.available}, route ${r.diff.pathLen}, dead ends ${r.diff.deadEnds}, black hole->gate ${r.holeToGate} steps`).join('\n'));
  W.path(seed,400);
  const at=(z,[r,c])=>{const q=W.zone(seed,z);return q.grid[r-q.r0][c-q.c0]};
  for(let z=0;z<31;z++){const g=W.gate(seed,z),Zn=W.zone(seed,z+1);if(at(z,g.a)==='#'||at(z+1,g.b)==='#'){bad++;console.log('gate blocked',seed,z)}
    if(Zn.entry[0]+Zn.r0!==g.b[0]||Zn.entry[1]+Zn.c0!==g.b[1]){bad++;console.log('entry mismatch',seed,z)}}
  for(const p of W.passages(seed,30)){if(at(p.za,p.a)==='#'||at(p.zb,p.b)==='#'){bad++;console.log('passage blocked',seed,p)}}
  const a=JSON.stringify(W.zone(seed,7));
}
const prices=Array.from({length:40},(_,z)=>W.price(z));
console.log('price curve:',prices.join(', '));console.log('gate sides over 160 gates:',JSON.stringify(sides));
console.log('difficulty cap (v1 zone 2 medians):',JSON.stringify(W.CAP),' worst seen:',JSON.stringify(worst));
if(Math.max(...prices)!==100||prices.some(p=>p>100)){bad++;console.log('cap FAIL')}
if(Object.keys(sides).length<4){bad++;console.log('not all directions used')}
// determinism across a fresh module load
delete require.cache[require.resolve('./worldgen.js')];const W2=require('./worldgen.js');
if(JSON.stringify(W2.zone(42,9))!==JSON.stringify(W.zone(42,9))){bad++;console.log('non-deterministic')}
console.log(bad?`${bad} FAILURES`:'ALL OK: 5 seeds x 32 zones affordable + reachable (stars, black holes, gates, tea nooks), cap 100, gates on all 4 sides, path never stuck (400 zones), black hole <= 5 steps from gate, every zone within the Zone 2 difficulty cap');
process.exit(bad?1:0);
