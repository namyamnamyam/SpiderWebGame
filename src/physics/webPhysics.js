import { sub, add, scale, length, normalize, dot, clamp } from '../math/vec3.js';
import { raycastAabbs } from './collision.js';

export function createWeb(){
  return {
    attached:false,
    anchor:{x:0,y:0,z:0},
    restLength:10,
    minLength:3.2,
    maxLength:160,
    reelSpeed:26,
    stiffness:38,
    damping:7.5,
    maxAccel:95,
    elasticity:1,
    pivot:null,
  };
}

export function webEndpoint(web){ return web.pivot ?? web.anchor; }

export function computeWebForce(player, web){
  if (!web.attached) return {x:0,y:0,z:0};
  const target=webEndpoint(web);
  const delta=sub(target,player.position);
  const dist=length(delta);
  if (dist <= web.restLength || dist < 1e-8) return {x:0,y:0,z:0};
  const dir=scale(delta,1/dist);
  const extension=dist-web.restLength;
  const radialSpeed=dot(player.velocity,dir);
  const dampingTerm=Math.max(0,-radialSpeed)*web.damping;
  const spring=extension*web.stiffness*web.elasticity;
  const accel=clamp(spring+dampingTerm,0,web.maxAccel);
  return scale(dir,accel);
}

export function updateRestLength(web,reelAxis,dt){
  if (!web.attached || !reelAxis) return;
  web.restLength=clamp(web.restLength-reelAxis*web.reelSpeed*dt,web.minLength,web.maxLength);
}

export function softCapDrag(velocity, softCap=48, strength=0.055){
  const speed=length(velocity);
  if (speed <= softCap) return {x:0,y:0,z:0};
  const excess=speed-softCap;
  return scale(normalize(velocity),-(excess*excess)*strength);
}

export function updateWebPath(playerPosition, web, majorBoxes){
  if (!web.attached) { web.pivot=null; return web; }
  const directDelta=sub(web.anchor,playerPosition);
  const directDistance=length(directDelta);
  if (directDistance<0.2) { web.pivot=null; return web; }

  if (web.pivot) {
    const blocker=raycastAabbs(
      playerPosition,
      directDelta,
      majorBoxes,
      Math.max(0,directDistance-0.15),
      b=>b.major!==false && b.id!==web.anchorBoxId,
    );
    if (!blocker) web.pivot=null;
    return web;
  }

  const hit=raycastAabbs(
    playerPosition,
    directDelta,
    majorBoxes,
    Math.max(0,directDistance-0.15),
    b=>b.major!==false && b.id!==web.anchorBoxId,
  );
  if (hit) web.pivot=add(hit.point,scale(hit.normal,0.08));
  return web;
}
