import { add, scale, normalize } from '../math/vec3.js';

export function rayAabb(origin, direction, box, maxDistance=Infinity){
  const d = normalize(direction);
  let tMin = 0;
  let tMax = maxDistance;
  let normal = {x:0,y:0,z:0};
  for (const axis of ['x','y','z']) {
    const o = origin[axis];
    const di = d[axis];
    const mn = box.min[axis];
    const mx = box.max[axis];
    if (Math.abs(di) < 1e-9) {
      if (o < mn || o > mx) return null;
      continue;
    }
    let t1 = (mn-o)/di;
    let t2 = (mx-o)/di;
    let enterSign = -Math.sign(di);
    if (t1 > t2) { [t1,t2]=[t2,t1]; enterSign *= -1; }
    if (t1 > tMin) {
      tMin = t1;
      normal = {x:0,y:0,z:0};
      normal[axis] = enterSign;
    }
    tMax = Math.min(tMax,t2);
    if (tMin > tMax) return null;
  }
  if (tMin < 0 || tMin > maxDistance) return null;
  return { distance:tMin, point:add(origin,scale(d,tMin)), normal, box };
}

export function raycastAabbs(origin, direction, boxes, maxDistance=Infinity, filter=()=>true){
  let best = null;
  for (const box of boxes) {
    if (!filter(box)) continue;
    const hit = rayAabb(origin,direction,box,maxDistance);
    if (hit && (!best || hit.distance < best.distance)) best = hit;
  }
  return best;
}

export function sphereVsAabb(position, radius, box){
  const closest = {
    x: Math.max(box.min.x, Math.min(position.x, box.max.x)),
    y: Math.max(box.min.y, Math.min(position.y, box.max.y)),
    z: Math.max(box.min.z, Math.min(position.z, box.max.z)),
  };
  const dx=position.x-closest.x, dy=position.y-closest.y, dz=position.z-closest.z;
  const d2=dx*dx+dy*dy+dz*dz;
  if (d2 >= radius*radius) return null;
  if (d2 > 1e-12) {
    const d=Math.sqrt(d2);
    return { normal:{x:dx/d,y:dy/d,z:dz/d}, depth:radius-d, point:closest, box };
  }
  const faces = [
    ['x', position.x-box.min.x, -1], ['x', box.max.x-position.x, 1],
    ['y', position.y-box.min.y, -1], ['y', box.max.y-position.y, 1],
    ['z', position.z-box.min.z, -1], ['z', box.max.z-position.z, 1],
  ].sort((a,b)=>a[1]-b[1]);
  const [axis, dist, sign] = faces[0];
  const normal={x:0,y:0,z:0}; normal[axis]=sign;
  return { normal, depth:radius+dist, point:closest, box };
}
