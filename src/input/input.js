export class InputController{
  constructor(canvas){
    this.canvas=canvas;
    this.held=new Set();
    this.pressed=new Set();
    this.released=new Set();
    this.keys=new Set();
    this.look={x:0,y:0};
    this.stick={x:0,y:0};
    this.stickPointer=null;
    this.lookPointer=null;
    this.lookLast=null;
    this.touchMode=matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints>0;
    this.bind();
  }

  setAction(name,down){
    if(down){
      if(!this.held.has(name)) this.pressed.add(name);
      this.held.add(name);
    }else{
      if(this.held.has(name)) this.released.add(name);
      this.held.delete(name);
    }
  }

  bind(){
    const c=this.canvas;
    c.addEventListener('contextmenu',e=>e.preventDefault());
    c.addEventListener('mousedown',e=>{
      if(e.button===0)this.setAction('webLeft',true);
      if(e.button===2)this.setAction('webRight',true);
      if(!this.touchMode && document.pointerLockElement!==c)c.requestPointerLock?.();
    });
    addEventListener('mouseup',e=>{
      if(e.button===0)this.setAction('webLeft',false);
      if(e.button===2)this.setAction('webRight',false);
    });
    addEventListener('mousemove',e=>{
      if(document.pointerLockElement===c){this.look.x+=e.movementX;this.look.y+=e.movementY;}
    });

    addEventListener('keydown',e=>{
      this.keys.add(e.code);
      const action=KEY_ACTIONS[e.code];
      if(action){e.preventDefault();this.setAction(action,true);}
    },{passive:false});
    addEventListener('keyup',e=>{
      this.keys.delete(e.code);
      const action=KEY_ACTIONS[e.code];
      if(action){e.preventDefault();this.setAction(action,false);}
    },{passive:false});

    // Touch look directly on the canvas right side. UI buttons stop propagation.
    c.addEventListener('pointerdown',e=>{
      if(e.pointerType==='mouse')return;
      if(e.clientX<innerWidth*.38)return;
      this.lookPointer=e.pointerId;
      this.lookLast={x:e.clientX,y:e.clientY};
      c.setPointerCapture?.(e.pointerId);
    });
    c.addEventListener('pointermove',e=>{
      if(e.pointerId!==this.lookPointer||!this.lookLast)return;
      this.look.x+=(e.clientX-this.lookLast.x)*1.35;
      this.look.y+=(e.clientY-this.lookLast.y)*1.35;
      this.lookLast={x:e.clientX,y:e.clientY};
    });
    const endLook=e=>{if(e.pointerId===this.lookPointer){this.lookPointer=null;this.lookLast=null;}};
    c.addEventListener('pointerup',endLook); c.addEventListener('pointercancel',endLook);

    const stickZone=document.getElementById('stick-zone');
    const knob=document.getElementById('stick-knob');
    const updateStick=e=>{
      const r=stickZone.getBoundingClientRect();
      const cx=r.left+r.width/2, cy=r.top+r.height/2;
      let dx=e.clientX-cx,dy=e.clientY-cy;
      const max=r.width*.32;
      const d=Math.hypot(dx,dy)||1;
      if(d>max){dx*=max/d;dy*=max/d;}
      this.stick.x=dx/max;this.stick.y=dy/max;
      knob.style.transform=`translate(${dx}px,${dy}px)`;
    };
    stickZone?.addEventListener('pointerdown',e=>{
      e.preventDefault(); e.stopPropagation();
      this.stickPointer=e.pointerId;stickZone.setPointerCapture?.(e.pointerId);updateStick(e);
    });
    stickZone?.addEventListener('pointermove',e=>{if(e.pointerId===this.stickPointer){e.preventDefault();updateStick(e);}});
    const endStick=e=>{if(e.pointerId===this.stickPointer){this.stickPointer=null;this.stick={x:0,y:0};knob.style.transform='translate(0,0)';}};
    stickZone?.addEventListener('pointerup',endStick);stickZone?.addEventListener('pointercancel',endStick);

    for(const el of document.querySelectorAll('[data-action]')){
      const action=el.dataset.action;
      el.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();el.setPointerCapture?.(e.pointerId);this.setAction(action,true);});
      const up=e=>{e.preventDefault();e.stopPropagation();this.setAction(action,false);};
      el.addEventListener('pointerup',up); el.addEventListener('pointercancel',up);
    }
  }

  sample(){
    const keyboardX=(this.keys.has('KeyD')?1:0)-(this.keys.has('KeyA')?1:0);
    const keyboardZ=(this.keys.has('KeyW')?1:0)-(this.keys.has('KeyS')?1:0);
    const moveX=Math.abs(this.stick.x)>0.02?this.stick.x:keyboardX;
    const moveZ=Math.abs(this.stick.y)>0.02?-this.stick.y:keyboardZ;
    const reel=(this.held.has('reelIn')?1:0)-(this.held.has('reelOut')?1:0);
    return {
      moveX,moveZ,reel,
      jump:this.held.has('jump'),
      webLeft:this.held.has('webLeft'),webRight:this.held.has('webRight'),
    };
  }

  takeLook(){const out={...this.look};this.look.x=0;this.look.y=0;return out;}
  consumePressed(name){const yes=this.pressed.has(name);this.pressed.delete(name);return yes;}
  consumeReleased(name){const yes=this.released.has(name);this.released.delete(name);return yes;}
  clearTransient(){this.pressed.clear();this.released.clear();}
}

const KEY_ACTIONS={
  Space:'jump',KeyQ:'reelIn',KeyE:'reelOut',KeyF:'zip',KeyR:'launch',KeyX:'slingshot',
};
