addEventListener('error',e=>{document.body.dataset.error=String(e.message||e.error||'error');});
import { Renderer } from './render/renderer.js';
import { createWorld } from './world/world.js';
import { InputController } from './input/input.js';
import { createPlayer, attachWeb, detachWeb, stepPlayer } from './physics/playerPhysics.js';
import { raycastAabbs } from './physics/collision.js';
import { add, sub, scale, normalize, cross, length, dot, clamp } from './math/vec3.js';

const canvas=document.getElementById('game');
const renderer=new Renderer(canvas);
const world=createWorld();
const player=createPlayer({position:world.spawn,velocity:{x:0,y:0,z:0}});
const input=new InputController(canvas);
const reticle=document.getElementById('reticle');
const speedEl=document.getElementById('speed');
const leftState=document.getElementById('left-state');
const rightState=document.getElementById('right-state');
const notice=document.getElementById('notice');
const vignette=document.getElementById('speed-vignette');
const startScreen=document.getElementById('start-screen');
const startBtn=document.getElementById('start-btn');

let started=false;
let yaw=0,pitch=-0.10;
let camera={position:{x:0,y:5,z:24},forward:{x:0,y:0,z:-1},up:{x:0,y:1,z:0},fov:68*Math.PI/180};
let aimHit=null;
let accumulator=0;
let last=performance.now();
let noticeTimer=0;
let lastWebMiss=0;
let bootMarked=false;

function toast(text,seconds=.65){notice.textContent=text;notice.classList.add('show');noticeTimer=seconds;}
startBtn.addEventListener('click',()=>{started=true;startScreen.classList.add('hidden');if(!input.touchMode)canvas.requestPointerLock?.();});
if(new URLSearchParams(location.search).get('autostart')==='1'){started=true;startScreen.classList.add('hidden');}
canvas.addEventListener('click',()=>{if(started&&!input.touchMode&&document.pointerLockElement!==canvas)canvas.requestPointerLock?.();});

function updateCamera(dt){
  const look=input.takeLook();const sens=input.touchMode?.0026:.00205;yaw-=look.x*sens;pitch=clamp(pitch-look.y*sens,-1.12,.72);
  const cp=Math.cos(pitch);const forward=normalize({x:Math.sin(yaw)*cp,y:Math.sin(pitch),z:-Math.cos(yaw)*cp});const worldUp={x:0,y:1,z:0};const right=normalize(cross(forward,worldUp));const speed=length(player.velocity);const dist=7.4+Math.min(4.2,speed*.055);const focus={x:player.position.x,y:player.position.y+1.05,z:player.position.z};let desired=add(add(focus,scale(forward,-dist)),{x:0,y:1.25,z:0});
  const boom=sub(desired,focus);const boomHit=raycastAabbs(focus,boom,world.boxes,Math.max(.1,length(boom)-.15),b=>b.solid!==false);if(boomHit)desired=add(focus,scale(normalize(boom),Math.max(.7,boomHit.distance-.25)));
  camera.position=desired;camera.forward=forward;const lateral=speed>1?dot(player.velocity,right)/speed:0;const roll=clamp(-lateral*.055,-.055,.055);const baseUp=normalize(cross(right,forward));camera.up=normalize(add(scale(baseUp,Math.cos(roll)),scale(right,Math.sin(roll))));camera.fov=(66+Math.min(20,Math.max(0,speed-10)*.42))*Math.PI/180;return{forward,right};
}
function updateAim(){aimHit=raycastAabbs(camera.position,camera.forward,world.boxes,230,b=>b.solid!==false);reticle.classList.toggle('valid',!!aimHit);}
function fire(side){if(aimHit){attachWeb(player,side,aimHit);const web=player.webs[side];web.restLength=Math.max(web.minLength,Math.min(web.maxLength,length(sub(web.anchor,player.position))*1.01));}else{reticle.classList.add('miss');lastWebMiss=.16;toast('NO SURFACE',.35);}}
function updateHud(dt){const speed=length(player.velocity);speedEl.textContent=speed.toFixed(speed<10?1:0);const fmt=(side,label)=>{const w=player.webs[side];return w.attached?`${label} ${w.restLength.toFixed(0)}m${w.pivot?' ↳':''}`:`${label} —`;};leftState.textContent=fmt('left','L');rightState.textContent=fmt('right','R');leftState.style.borderColor=player.webs.left.attached?'#9ce0ff88':'';rightState.style.borderColor=player.webs.right.attached?'#ffd5a088':'';vignette.style.opacity=String(clamp((speed-26)/55,0,.8));if(noticeTimer>0){noticeTimer-=dt;if(noticeTimer<=0)notice.classList.remove('show');}if(lastWebMiss>0){lastWebMiss-=dt;if(lastWebMiss<=0)reticle.classList.remove('miss');}}
function handleWebEvents(){if(input.consumePressed('webLeft'))fire('left');if(input.consumePressed('webRight'))fire('right');if(input.consumeReleased('webLeft'))detachWeb(player,'left');if(input.consumeReleased('webRight'))detachWeb(player,'right');}
function frame(now){
  requestAnimationFrame(frame);const rawDt=Math.min(.05,(now-last)/1000||0);last=now;const axes=updateCamera(rawDt);updateAim();if(started)handleWebEvents();
  const sample=input.sample();const pointPressed=input.consumePressed('launch');const zipPressed=input.consumePressed('zip');const slingPressed=input.consumePressed('slingshot');accumulator+=started?rawDt:0;const fixed=1/120;let firstStep=true;
  while(accumulator>=fixed){stepPlayer(player,{...sample,cameraForward:camera.forward,cameraRight:axes.right,aimPoint:aimHit?.point,launch:firstStep&&pointPressed&&!!aimHit,zip:firstStep&&zipPressed,slingshot:firstStep&&slingPressed},world,fixed);accumulator-=fixed;firstStep=false;}
  if(firstStep){if(pointPressed)input.pressed.add('launch');if(zipPressed)input.pressed.add('zip');if(slingPressed)input.pressed.add('slingshot');}
  updateHud(rawDt);renderer.render({world,player,camera,aimHit});if(!bootMarked){document.body.dataset.ready='true';bootMarked=true;}
}
requestAnimationFrame(frame);
