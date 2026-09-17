const stone=[0.72,0.74,0.78];
const pale=[0.86,0.83,0.74];
const blue=[0.18,0.30,0.48];
const red=[0.48,0.20,0.18];
const dark=[0.20,0.23,0.28];
const gold=[0.72,0.54,0.18];

function box(id,cx,cy,cz,sx,sy,sz,opts={}){
  return {id,min:{x:cx-sx/2,y:cy-sy/2,z:cz-sz/2},max:{x:cx+sx/2,y:cy+sy/2,z:cz+sz/2},color:opts.color??stone,zone:opts.zone??'city',major:opts.major??true,solid:opts.solid??true,kind:opts.kind??'box'};
}
function seeded(seed=1337){let s=seed>>>0;return ()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296;};}
export function createWorld(){
  const boxes=[];const decorations=[];
  const add=(...args)=>{const b=box(...args);boxes.push(b);return b;};
  const deco=(...args)=>{const b=box(...args);b.solid=false;b.major=false;decorations.push(b);return b;};
  add('academy-north',0,19,-48,46,38,18,{zone:'academy',color:pale});
  add('academy-south',0,15,48,52,30,18,{zone:'academy',color:pale});
  add('academy-west',-48,17,0,18,34,54,{zone:'academy',color:pale});
  add('academy-east',48,17,0,18,34,54,{zone:'academy',color:pale});
  const towers=[[-36,-36,64],[36,-36,58],[-36,36,54],[36,36,62],[0,-61,78]];
  towers.forEach(([x,z,h],i)=>{add(`academy-tower-${i}`,x,h/2,z,13,h,13,{zone:'academy',color:stone});add(`academy-tower-cap-${i}`,x,h+3,z,18,6,18,{zone:'academy',color:dark});deco(`academy-spire-${i}`,x,h+12,z,4,18,4,{zone:'academy',color:gold,kind:'spire'});});
  add('bridge-n',0,29,-36,72,4,7,{zone:'academy',color:stone});add('bridge-s',0,27,36,72,4,7,{zone:'academy',color:stone});add('bridge-w',-36,25,0,7,4,72,{zone:'academy',color:stone});add('bridge-e',36,31,0,7,4,72,{zone:'academy',color:stone});
  for(let i=-3;i<=3;i++){if(i===0)continue;add(`colonnade-n-${i}`,i*9,7.5,-25,2.5,15,2.5,{zone:'academy',color:pale});add(`colonnade-s-${i}`,i*9,7.5,25,2.5,15,2.5,{zone:'academy',color:pale});}
  const rng=seeded(8821);let idx=0;
  for(let gx=-5;gx<=5;gx++)for(let gz=-5;gz<=5;gz++){const cx=gx*38,cz=gz*38;if(Math.abs(cx)<82&&Math.abs(cz)<82)continue;if(Math.abs(gx)%3===0&&Math.abs(gz)%3===0)continue;const h=15+Math.floor(rng()*33),sx=18+Math.floor(rng()*10),sz=18+Math.floor(rng()*10);const tint=(idx%4===0)?pale:(idx%4===1?stone:(idx%4===2?[0.61,0.58,0.55]:[0.68,0.63,0.54]));add(`city-${idx}`,cx,h/2,cz,sx,h,sz,{zone:'city',color:tint});if(h>32)deco(`roof-${idx}`,cx,h+3.5,cz,sx+2,7,sz+2,{zone:'city',color:(idx%2?red:blue),kind:'roof'});if(idx%7===0)deco(`flag-${idx}`,cx,h+9,cz,1.1,11,1.1,{zone:'city',color:gold,kind:'spire'});idx++;}
  const wall=150;for(let i=-4;i<=4;i++){if(i===0)continue;add(`wall-n-${i}`,i*32,10,-wall,28,20,8,{zone:'city',color:stone});add(`wall-s-${i}`,i*32,10,wall,28,20,8,{zone:'city',color:stone});add(`wall-w-${i}`,-wall,10,i*32,8,20,28,{zone:'city',color:stone});add(`wall-e-${i}`,wall,10,i*32,8,20,28,{zone:'city',color:stone});}
  for(const [x,z,n] of [[-150,-150,'nw'],[150,-150,'ne'],[-150,150,'sw'],[150,150,'se']]){add(`wall-tower-${n}`,x,22,z,20,44,20,{zone:'city',color:dark});deco(`wall-spire-${n}`,x,50,z,6,16,6,{zone:'city',color:blue,kind:'spire'});}
  for(let i=0;i<22;i++){const a=(i/22)*Math.PI*2,r=210+(i%3)*24,x=Math.cos(a)*r,z=Math.sin(a)*r,h=15+(i%5)*7;add(`outer-pillar-${i}`,x,h/2,z,8,h,8,{zone:'outer',color:dark});}
  return {boxes,decorations,groundY:0,spawn:{x:0,y:2.2,z:15},bounds:270,palette:{stone,pale,blue,red,dark,gold}};
}
