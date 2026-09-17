import { sub, normalize, cross, dot } from '../math/vec3.js';

export const identity=()=>[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1];

export function multiply(a,b){
  const out=new Array(16).fill(0);
  for(let c=0;c<4;c++){
    for(let r=0;r<4;r++){
      out[c*4+r]=a[0*4+r]*b[c*4+0]+a[1*4+r]*b[c*4+1]+a[2*4+r]*b[c*4+2]+a[3*4+r]*b[c*4+3];
    }
  }
  return out;
}

export function translationScale(t,s){
  return [s.x,0,0,0, 0,s.y,0,0, 0,0,s.z,0, t.x,t.y,t.z,1];
}

export function perspective(fovY,aspect,near,far){
  const f=1/Math.tan(fovY/2);
  const nf=1/(near-far);
  return [f/aspect,0,0,0, 0,f,0,0, 0,0,(far+near)*nf,-1, 0,0,2*far*near*nf,0];
}

export function lookAt(eye,target,up){
  const z=normalize(sub(eye,target));
  const x=normalize(cross(up,z));
  const y=cross(z,x);
  return [
    x.x,y.x,z.x,0,
    x.y,y.y,z.y,0,
    x.z,y.z,z.z,0,
    -dot(x,eye),-dot(y,eye),-dot(z,eye),1,
  ];
}
