// Node sim: node sim_world.js  -> proves star math never strands the player and prices cap at 100
const W=require('./worldgen.js');let bad=0;
for(const seed of [1,42,12345,987654321,2026]){
  const res=W.guarantee(seed,32);
  for(const r of res){if(!r.ok||r.errors.length){bad++;console.log('FAIL',seed,r)}}
  if(seed===42)console.log('seed 42:',res.map(r=>`z${r.z}: price ${r.price}, stars ${r.stars}, available ${r.available}`).join('\n'));
  const a=JSON.stringify(W.zone(seed,7)),b=JSON.stringify(W.zone(seed,7));if(a!==b){bad++;console.log('non-deterministic',seed)}
}
const prices=Array.from({length:40},(_,z)=>W.price(z));
console.log('price curve:',prices.join(', '));
if(Math.max(...prices)!==100||prices.some(p=>p>100)){bad++;console.log('cap FAIL')}
console.log(bad?`${bad} FAILURES`:'ALL OK: 5 seeds x 32 zones, every star/black hole/gate reachable, stars before each gate >= price+margin, cap 100');
process.exit(bad?1:0);
