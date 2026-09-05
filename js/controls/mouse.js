import { G } from '../core/state.js';
import { canvas } from '../engine/renderer.js';
import { selectSlot } from '../ui/hud.js';
import { updateInteraction } from '../gameplay/interaction.js';

export function initMouse(){
  addEventListener('mousedown',e=>{
    if(!G.playing || G.invOpen) return;
    if(G.fallback){ G.drag.down=true; G.drag.moved=false; G.drag.acc=0; G.drag.btn=e.button; return; }
    if(e.button===0){
      G.mouseBtn[0]=true; G.lastMine=performance.now()/1000;
      if(G.game.mode==='creative'){
        const m=window._pickMob();
        if(m){ window._tryAttack(m, performance.now()/1000); return; }
        const hit=window._raycastBlock(6);
        if(hit) window._breakBlockFn(hit.x,hit.y,hit.z,hit.b);
      }
    }
    if(e.button===2){
      G.mouseBtn[2]=true;
      window._doPlace(window._keys['ShiftLeft']||window._keys['ShiftRight']);
      G.lastPlace=performance.now()/1000;
    }
  });
  addEventListener('mouseup',e=>{
    if(G.fallback){
      if(G.drag.down && !G.drag.moved && !G.invOpen){
        if(e.button===0){
          const m=window._pickMob();
          if(m) window._tryAttack(m, performance.now()/1000);
        }
        else if(e.button===2) window._doPlace();
      }
      G.drag.down=false;
      return;
    }
    G.mouseBtn[e.button]=false;
  });
  addEventListener('contextmenu',e=>e.preventDefault());
  addEventListener('mousemove',e=>{
    if(!G.playing || G.invOpen) return;
    const sensK = 0.0024*G.settings.sens;
    if(G.fallback){
      if(!G.drag.down) return;
      G.yaw   -= e.movementX*sensK;
      G.pitch -= e.movementY*sensK;
      G.pitch = clampP(G.pitch);
      G.drag.acc += Math.abs(e.movementX)+Math.abs(e.movementY);
      if(G.drag.acc>5) G.drag.moved=true;
      return;
    }
    G.yaw   -= e.movementX*sensK;
    G.pitch -= e.movementY*sensK;
    G.pitch = clampP(G.pitch);
  });
  addEventListener('wheel',e=>{
    if(!G.playing||G.invOpen) return;
    selectSlot((G.slot + (e.deltaY>0?1:8))%9);
  });
  document.addEventListener('pointerlockchange',()=>{
    const locked = document.pointerLockElement===canvas;
    if(G.screenState!=='game' || G.currentScreen==='settings' || G.currentScreen==='mods') return;
    if(locked) setPlaying(true);
    else if(G.invOpen){ }
    else if(!G.fallback && !G.dead) setPlaying(false);
  });
  document.addEventListener('pointerlockerror', ()=>enterFallback());
}
function clampP(p){ return Math.max(-Math.PI/2+0.01, Math.min(Math.PI/2-0.01, p)); }
function enterFallback(){
  if(G.fallback) return;
  G.fallback=true;
  document.getElementById('game').style.cursor='crosshair';
  document.getElementById('fbTip').style.display='block';
  if(G.screenState==='game') setPlaying(true);
}
function setPlaying(p){ window._setPlaying && window._setPlaying(p); }
