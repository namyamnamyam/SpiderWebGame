import { add, sub, scale, length, normalize, dot, clamp, isFiniteVec } from '../math/vec3.js';
import { createWeb, computeWebForce, updateRestLength, softCapDrag, updateWebPath } from './webPhysics.js';
import { raycastAabbs, sphereVsAabb } from './collision.js';

const GRAVITY = 28;
const GROUND_ACCEL = 42;
const AIR_ACCEL = 8.5;
const MAX_GROUND_SPEED = 13.5;

export function createPlayer(opts={}){
  return {
    position:{...(opts.position ?? {x:0,y:2,z:18})},
    velocity:{...(opts.velocity ?? {x:0,y:0,z:0})},
    radius:0.72,
    grounded:false,
    wallNormal:null,
    impactLock:0,
    webs:{left:createWeb(),right:createWeb()},
    stats:{maxSpeed:0,airTime:0},
  };
}

export function attachWeb(player, side, hit){
  const web=player.webs[side];
  if (!web || !hit?.point) return false;
  web.attached=true;
  web.anchor={...hit.point};
  web.anchorBoxId=hit.box?.id ?? null;
  web.pivot=null;
  const dist=length(sub(web.anchor,player.position));
  web.restLength=clamp(dist*1.015,web.minLength,web.maxLength);
  return true;
}

export function detachWeb(player,side){
  const web=player.webs[side];
  if (!web) return;
  web.attached=false;
  web.pivot=null;
}

function projectFlat(v){
  const p={x:v?.x??0,y:0,z:v?.z??-1};
  const l=Math.hypot(p.x,p.z);
  return l>1e-6?{x:p.x/l,y:0,z:p.z/l}:{x:0,y:0,z:-1};
}

function desiredMove(commands){
  const f=projectFlat(commands.cameraForward);
  const r=projectFlat(commands.cameraRight ?? {x:1,y:0,z:0});
  const mx=commands.moveX??0, mz=commands.moveZ??0;
  const raw=add(scale(r,mx),scale(f,mz));
  const mag=Math.min(1,length(raw));
  return mag>1e-5?scale(normalize(raw),mag):{x:0,y:0,z:0};
}

function applyTraversalAssists(player,commands){
  if (commands.zip) {
    const f=normalize(commands.cameraForward ?? {x:0,y:0,z:-1});
    player.velocity=add(player.velocity,scale(f,7.5));
  }
  if (commands.launch && commands.aimPoint) {
    const dir=normalize(sub(commands.aimPoint,player.position));
    player.velocity=add(player.velocity,scale(dir,11.5));
  }
  if (commands.slingshot && player.webs.left.attached && player.webs.right.attached) {
    const dl=normalize(sub(player.webs.left.anchor,player.position));
    const dr=normalize(sub(player.webs.right.anchor,player.position));
    let dir=normalize(add(dl,dr));
    dir=normalize(add(dir,{x:0,y:0.32,z:0}));
    player.velocity=add(player.velocity,scale(dir,18));
    detachWeb(player,'left');
    detachWeb(player,'right');
  }
}

function resolveWorld(player,world,oldPosition){
  const boxes=world.boxes ?? [];
  const movement=sub(player.position,oldPosition);
  const travel=length(movement);
  if (travel>1e-6 && boxes.length) {
    const expanded=boxes.map(b=>({
      ...b,
      min:{x:b.min.x-player.radius,y:b.min.y-player.radius,z:b.min.z-player.radius},
      max:{x:b.max.x+player.radius,y:b.max.y+player.radius,z:b.max.z+player.radius},
    }));
    const hit=raycastAabbs(oldPosition,movement,expanded,travel,b=>b.solid!==false);
    if (hit && hit.distance<travel-1e-5) {
      player.position=add(oldPosition,scale(normalize(movement),Math.max(0,hit.distance-0.015)));
      const vn=dot(player.velocity,hit.normal);
      if (vn<0) player.velocity=sub(player.velocity,scale(hit.normal,vn));
      if (Math.abs(hit.normal.y)<0.3) {
        player.wallNormal={...hit.normal};
        if (player.velocity.y < -7) player.velocity.y=-7;
      }
    }
  }

  for (let pass=0;pass<2;pass++) {
    for (const box of boxes) {
      if (box.solid===false) continue;
      const c=sphereVsAabb(player.position,player.radius,box);
      if (!c) continue;
      player.position=add(player.position,scale(c.normal,c.depth+0.002));
      const vn=dot(player.velocity,c.normal);
      if (vn<0) player.velocity=sub(player.velocity,scale(c.normal,vn));
      if (c.normal.y>0.55) player.grounded=true;
      else if (Math.abs(c.normal.y)<0.3) player.wallNormal={...c.normal};
    }
  }

  const groundY=world.groundY ?? 0;
  if (player.position.y<groundY+player.radius) {
    const impact=-player.velocity.y;
    player.position.y=groundY+player.radius;
    if (player.velocity.y<0) player.velocity.y=0;
    player.grounded=true;
    if (impact>22) {
      player.velocity.x*=0.62;
      player.velocity.z*=0.62;
      player.impactLock=Math.max(player.impactLock,0.18);
    } else if (impact>10) {
      player.velocity.x*=0.86;
      player.velocity.z*=0.86;
    }
  }
}

export function stepPlayer(player,commands,world,dt){
  if (!(dt>0) || !Number.isFinite(dt)) return player;
  const groundY=world.groundY??0;
  const wasGrounded=player.grounded || player.position.y<=groundY+player.radius+0.04;
  const previousWallNormal=player.wallNormal?{...player.wallNormal}:null;
  player.grounded=false;
  player.wallNormal=null;
  player.impactLock=Math.max(0,player.impactLock-dt);

  for (const side of ['left','right']) {
    const web=player.webs[side];
    if (!web.attached) continue;
    updateWebPath(player.position,web,(world.boxes??[]).filter(b=>b.major!==false));
    const reelAxis = commands[`reel${side==='left'?'Left':'Right'}`] ?? commands.reel ?? 0;
    updateRestLength(web,reelAxis,dt);
  }

  applyTraversalAssists(player,commands);

  let accel={x:0,y:-GRAVITY,z:0};
  const move=desiredMove(commands);
  const moveAccel=wasGrounded?GROUND_ACCEL:AIR_ACCEL;
  const steerScale=player.impactLock>0?0.25:1;
  accel=add(accel,scale(move,moveAccel*steerScale));

  for (const web of [player.webs.left,player.webs.right]) accel=add(accel,computeWebForce(player,web));
  accel=add(accel,softCapDrag(player.velocity));

  if (commands.jump && wasGrounded) {
    player.velocity.y=Math.max(player.velocity.y,11.8);
    player.grounded=false;
  } else if (commands.jump && previousWallNormal) {
    player.velocity=add(player.velocity,add(scale(previousWallNormal,8.5),{x:0,y:8.5,z:0}));
  }

  player.velocity=add(player.velocity,scale(accel,dt));

  if (player.position.y <= (world.groundY??0)+player.radius+0.05 && !(player.webs.left.attached||player.webs.right.attached)) {
    const horizontal=Math.hypot(player.velocity.x,player.velocity.z);
    if (horizontal>MAX_GROUND_SPEED) {
      const s=MAX_GROUND_SPEED/horizontal;
      player.velocity.x*=s; player.velocity.z*=s;
    }
    if (length(move)<0.05) {
      const decay=Math.exp(-7*dt);
      player.velocity.x*=decay; player.velocity.z*=decay;
    }
  }

  const old={...player.position};
  player.position=add(player.position,scale(player.velocity,dt));
  resolveWorld(player,world,old);

  if (!isFiniteVec(player.position)||!isFiniteVec(player.velocity)) {
    player.position={x:0,y:8,z:18};
    player.velocity={x:0,y:0,z:0};
    detachWeb(player,'left'); detachWeb(player,'right');
  }
  const speed=length(player.velocity);
  player.stats.maxSpeed=Math.max(player.stats.maxSpeed,speed);
  if (!player.grounded) player.stats.airTime+=dt;
  return player;
}
