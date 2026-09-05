import { G } from '../core/state.js';
import { canvas } from '../engine/renderer.js';
import { getChunks } from '../world/world.js';
import { raycastBlock, reachNow, doPlace } from '../gameplay/interaction.js';
import { openInventory, openFurnace, openChest, closeInventory } from '../gameplay/inventory.js';
import { pickMob, tryAttack } from '../entities/mobs.js';
import { posKey } from '../gameplay/interaction.js';
import { vibrate } from '../core/utils.js';

export function initTouch(){
  const touchUIEl=document.getElementById('touchUI');
  const joyZone=document.getElementById('joyZone');
  const joyBase=document.getElementById('joyBase');
  const joyStick=document.getElementById('joyStick');
  const btnJump=document.getElementById('btnJump');
  const flyGroup=document.getElementById('flyGroup');
  const btnFlyUp=document.getElementById('btnFlyUp');
  const btnFlyDown=document.getElementById('btnFlyDown');
  const btnFly=document.getElementById('btnFly');
  const btnPause=document.getElementById('btnPause');
  const btnInv=document.getElementById('btnInv');
  window._joyHide = joyHide;
  window._updateTouchUI = updateTouchUI;

  function joyMoveTo(x,y){
    let dx=x-G.joy.bx, dy=y-G.joy.by;
    const d=Math.hypot(dx,dy), R=48;
    if(d>R){ dx=dx/d*R; dy=dy/d*R; }
    joyStick.style.transform=`translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
    G.joy.vx=dx/R; G.joy.vy=dy/R; G.joy.mag=Math.min(1,d/R);
  }
  function joyHide(){
    G.joy.id=null; G.joy.vx=G.joy.vy=G.joy.mag=0;
    joyBase.style.display='none';
    joyStick.style.transform='translate(-50%,-50%)';
  }
  joyZone.addEventListener('touchstart',e=>{
    e.preventDefault(); e.stopPropagation();
    if(!G.playing||G.dead||G.invOpen) return;
    const t=e.changedTouches[0];
    if(G.joy.id===null){
      G.joy.id=t.identifier; G.joy.bx=t.clientX; G.joy.by=t.clientY;
      joyBase.style.left=t.clientX+'px'; joyBase.style.top=t.clientY+'px';
      joyBase.style.display='block';
      joyMoveTo(t.clientX,t.clientY);
    }
  },{passive:false});
  joyZone.addEventListener('touchmove',e=>{
    e.preventDefault();
    for(const t of e.changedTouches) if(t.identifier===G.joy.id) joyMoveTo(t.clientX,t.clientY);
  },{passive:false});
  const joyEnd=e=>{ for(const t of e.changedTouches) if(t.identifier===G.joy.id) joyHide(); };
  joyZone.addEventListener('touchend',joyEnd);
  joyZone.addEventListener('touchcancel',joyEnd);

  canvas.addEventListener('touchstart',e=>{
    e.preventDefault();
    if(!G.playing||G.dead||G.invOpen) return;
    for(const t of e.changedTouches){
      if(G.touchLook.id===null){
        G.touchLook.id=t.identifier;
        G.touchLook.sx=G.touchLook.lx=t.clientX;
        G.touchLook.sy=G.touchLook.ly=t.clientY;
        G.touchLook.t0=performance.now();
        G.touchLook.moved=false; G.touchLook.mining=false;
        clearTimeout(G.touchLook.timer);
        G.touchLook.timer=setTimeout(()=>{
          if(G.touchLook.id!==null && !G.touchLook.moved){
            G.touchLook.mining=true;
            if(G.game.mode==='creative') G.lastMine=0;
            vibrate(20);
          }
        },200);
      }
    }
  },{passive:false});
  canvas.addEventListener('touchmove',e=>{
    e.preventDefault();
    for(const t of e.changedTouches){
      if(t.identifier!==G.touchLook.id) continue;
      const dx=t.clientX-G.touchLook.lx, dy=t.clientY-G.touchLook.ly;
      G.touchLook.lx=t.clientX; G.touchLook.ly=t.clientY;
      if(G.playing&&!G.dead&&!G.invOpen){
        const sensK = 0.0044*G.settings.sens;
        G.yaw   -= dx*sensK;
        G.pitch -= dy*sensK;
        G.pitch = clampP(G.pitch);
      }
      if(Math.hypot(t.clientX-G.touchLook.sx,t.clientY-G.touchLook.sy)>14){
        G.touchLook.moved=true; G.touchLook.mining=false;
      }
    }
  },{passive:false});
  const lookEnd=e=>{
    for(const t of e.changedTouches){
      if(t.identifier!==G.touchLook.id) continue;
      clearTimeout(G.touchLook.timer);
      const dur=performance.now()-G.touchLook.t0;
      if(G.playing&&!G.dead&&!G.invOpen&&!G.touchLook.moved&&!G.touchLook.mining&&dur<250){
        const m=pickMob();
        if(m) tryAttack(m, performance.now()/1000);
        else {
          const hit=raycastBlock(reachNow());
          if(hit && hit.b===14) openInventory(3);
          else if(hit && hit.b===17) openFurnace(posKey(hit.x,hit.y,hit.z));
          else if(hit && hit.b===19) openChest(posKey(hit.x,hit.y,hit.z));
          else doPlace();
        }
      }
      G.touchLook.id=null; G.touchLook.mining=false;
    }
  };
  canvas.addEventListener('touchend',lookEnd);
  canvas.addEventListener('touchcancel',lookEnd);

  function bindHold(el, code){
    el.addEventListener('touchstart',e=>{
      e.preventDefault(); e.stopPropagation();
      window._keys[code]=true; el.classList.add('pressed');
    },{passive:false});
    const off=e=>{
      e.preventDefault();
      window._keys[code]=false; el.classList.remove('pressed');
    };
    el.addEventListener('touchend',off);
    el.addEventListener('touchcancel',off);
  }
  bindHold(btnJump,'Space');
  bindHold(btnFlyUp,'Space');
  bindHold(btnFlyDown,'KeyC');
  btnFly.addEventListener('touchstart',e=>{
    e.preventDefault(); e.stopPropagation();
    if(G.playing&&!G.dead&&G.game.mode==='creative'){
      G.player.fly=!G.player.fly; G.player.vel.y=0; updateTouchUI();
    }
  },{passive:false});
  btnPause.addEventListener('touchstart',e=>{ e.preventDefault(); e.stopPropagation(); },{passive:false});
  btnPause.addEventListener('touchend',e=>{
    e.preventDefault();
    if(G.screenState==='game'&&!G.dead) setPlaying(false);
  },{passive:false});
  btnInv.addEventListener('touchstart',e=>{ e.preventDefault(); e.stopPropagation(); },{passive:false});
  btnInv.addEventListener('touchend',e=>{
    e.preventDefault();
    if(G.screenState==='game'&&!G.dead){ if(G.invOpen) closeInventory(); else openInventory(2); }
  },{passive:false});
  document.addEventListener('gesturestart',e=>e.preventDefault());

  updateTouchUI();
  function updateTouchUI(){
    const creative = G.game.mode==='creative';
    btnFly.style.display = creative ? 'flex' : 'none';
    const flying = creative && G.player.fly;
    btnJump.style.display  = flying ? 'none' : 'flex';
    flyGroup.style.display = flying ? 'flex' : 'none';
  }
}
function clampP(p){ return Math.max(-Math.PI/2+0.01, Math.min(Math.PI/2-0.01, p)); }
function setPlaying(p){ window._setPlaying && window._setPlaying(p); }
