import { G } from '../core/state.js';
import { selectSlot, renderHotbar } from '../ui/hud.js';
import { renderInvUI, closeInventory } from '../gameplay/inventory.js';

export function initKeyboard(){
  window._keys = window._keys || {};
  const keys=window._keys;
  addEventListener('keydown',e=>{
    if(e.target && (e.target.tagName==='INPUT'||e.target.tagName==='TEXTAREA')) return;
    if(e.repeat){ keys[e.code]=true; return; }
    keys[e.code]=true;
    if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)) e.preventDefault();
    if(e.code==='KeyE' && G.screenState==='game' && !G.dead){
      if(G.invOpen) closeInventory(); else openInventory(2);
      return;
    }
    if(e.code==='Escape' && G.screenState==='game' && !G.dead){
      if(G.invOpen){
        if(G.fallback) closeInventory();
        else { closeInventory(false); setPlaying(false); }
      } else if(G.fallback) setPlaying(!G.playing);
      return;
    }
    if(e.code==='KeyF' && G.playing && !G.invOpen){
      if(G.game.mode==='creative'){ G.player.fly=!G.player.fly; G.player.vel.y=0; window._updateTouchUI(); }
      else window._showToast('Полёт доступен только в творческом режиме');
    }
    if(e.code==='Space' && G.playing && !G.invOpen && G.game.mode==='creative'){
      if(performance.now()/1000-G.lastSpace<0.28){ G.player.fly=!G.player.fly; G.player.vel.y=0; window._updateTouchUI(); }
      G.lastSpace=performance.now()/1000;
    }
    if(e.code.startsWith('Digit')){
      const d=+e.code.slice(5);
      if(d>=1 && d<=9) selectSlot(d-1);
    }
  });
  addEventListener('keyup',e=>{ keys[e.code]=false; });
  addEventListener('blur',()=>{
    for(const k in keys) keys[k]=false;
    G.mouseBtn[0]=G.mouseBtn[2]=false; G.drag.down=false;
  });
}
function setPlaying(p){ window._setPlaying && window._setPlaying(p); }
