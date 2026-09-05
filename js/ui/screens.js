import { G } from '../core/state.js';
import { hashSeed } from '../core/utils.js';
import { applyShadows, sfx, ac, masterGain } from '../engine/renderer.js';
import { recalcView } from '../core/state.js';
import { resetWorld, scanChunksNow } from '../world/reset.js';
import { clearAllMods } from '../data/mods.js';
import { buildAtlas } from '../engine/atlas.js';
import { showScreen as _ss } from './screensRef.js';

let selMode='survival';
export function refreshScreens(){
  window._refreshScreens();
}
export function lockPointer(){
  window._lockPointer();
}
export function showScreen(name){ window._showScreen(name); }
export function initScreens(){
  const sensRange=document.getElementById('sensRange'), sensVal=document.getElementById('sensVal');
  const viewRange=document.getElementById('viewRange'), viewVal=document.getElementById('viewVal');
  const fovRange=document.getElementById('fovRange'), fovVal=document.getElementById('fovVal');
  const volRange=document.getElementById('volRange'), volVal=document.getElementById('volVal');
  const shadowSw=document.getElementById('shadowSw');
  const bobSw=document.getElementById('bobSw');
  window._syncSettingsUI = function(){
    sensRange.value=Math.round(G.settings.sens*100);
    sensVal.textContent=G.settings.sens.toFixed(2)+'×';
    viewRange.value=G.settings.view;
    viewVal.textContent=G.settings.view+' чанков';
    fovRange.value=G.settings.fov;
    fovVal.textContent=G.settings.fov+'°';
    volRange.value=Math.round(G.settings.vol*100);
    volVal.textContent=Math.round(G.settings.vol*100)+'%';
    shadowSw.classList.toggle('on', G.settings.shadows);
    bobSw.classList.toggle('on', G.settings.bob);
  };
  sensRange.addEventListener('input',()=>{
    G.settings.sens=sensRange.value/100;
    sensVal.textContent=G.settings.sens.toFixed(2)+'×';
  });
  viewRange.addEventListener('input',()=>{
    G.settings.view=+viewRange.value;
    viewVal.textContent=G.settings.view+' чанков';
    recalcView();
    if(G.worldCreated) scanChunksNow();
  });
  fovRange.addEventListener('input',()=>{
    G.settings.fov=+fovRange.value;
    fovVal.textContent=G.settings.fov+'°';
  });
  volRange.addEventListener('input',()=>{
    G.settings.vol=volRange.value/100;
    volVal.textContent=volRange.value+'%';
    if(masterGain) masterGain.gain.value=G.settings.vol;
  });
  shadowSw.addEventListener('click',()=>{
    G.settings.shadows=!G.settings.shadows;
    shadowSw.classList.toggle('on', G.settings.shadows);
    applyShadows();
    window._applyShadowsWorld && window._applyShadowsWorld();
  });
  bobSw.addEventListener('click',()=>{
    G.settings.bob=!G.settings.bob;
    bobSw.classList.toggle('on', G.settings.bob);
  });
  document.querySelectorAll('.modeCard').forEach(card=>{
    card.addEventListener('click',()=>{
      selMode=card.dataset.mode;
      document.querySelectorAll('.modeCard').forEach(c=>c.classList.toggle('sel', c===card));
    });
  });
  document.getElementById('startBtn').addEventListener('click',()=>{
    ac();
    G.game.mode=selMode;
    G.game.worldName=(document.getElementById('worldNameInp').value.trim()||'Новый мир').slice(0,24);
    resetWorld(hashSeed(document.getElementById('seedInp').value));
    G.worldCreated=true; G.screenState='game';
    G.yaw=Math.random()*Math.PI*2; G.pitch=-0.12;
    window._showToast((window._IS_TOUCH)?'Тап — поставить • Удержать — сломать':'Нажми E, чтобы открыть инвентарь');
    window._refreshScreens(); window._mobileBoost(); window._lockPointer();
  });
  ['worldNameInp','seedInp'].forEach(id=>{
    document.getElementById(id).addEventListener('keydown',e=>{
      if(e.key==='Enter') document.getElementById('startBtn').click();
      e.stopPropagation();
    });
  });
  document.getElementById('btnCreate').addEventListener('click',()=>{
    G.screenState='create'; window._refreshScreens();
  });
  document.getElementById('backBtn').addEventListener('click',()=>{
    G.screenState='title'; window._refreshScreens();
  });
  document.getElementById('btnSettings').addEventListener('click',()=>{
    G.settingsFrom='title'; window._refreshScreens(); window._showScreen('settings');
  });
  document.getElementById('btnExit').addEventListener('click',tryExit);
  document.getElementById('pauseExit').addEventListener('click',tryExit);
  function tryExit(){
    window.close();
    setTimeout(()=>{
      if(!window.closed) window._showToast('Браузер не разрешил закрыть вкладку — нажми Ctrl+W');
    }, 250);
  }
  document.getElementById('pauseSettings').addEventListener('click',()=>{
    G.settingsFrom='pause'; window._showScreen('settings');
  });
  document.getElementById('settingsDone').addEventListener('click',()=>{
    G.saveSettings();
    if(G.settingsFrom==='pause'){ window._showScreen('pause'); }
    else if(G.screenState==='game'){ window._refreshScreens(); }
    else { G.screenState='title'; window._refreshScreens(); }
  });
  document.getElementById('modsBtn').addEventListener('click',()=>window._showScreen('mods'));
  document.getElementById('modsBack').addEventListener('click',()=>window._showScreen('settings'));
  const modsArea=document.getElementById('modsArea');
  document.getElementById('modsApply').addEventListener('click',()=>{
    const code=modsArea.value.trim();
    if(!code){ window._showToast('Пусто — напиши JS-код мода'); return; }
    const MC={
      addBlock(def){
        def=def||{};
        const r=window._registerModBlock({name:def.name,color:def.color,hardness:def.hardness});
        if(r.err){ window._showToast(r.err); return null; }
        return r.id;
      },
      give(nameOrId){
        let id=nameOrId;
        if(typeof nameOrId==='string'){
          id=window._findBlockByName(nameOrId);
          if(id==null){ window._showToast('Не найден: '+nameOrId); return; }
        }
        window._addItem(id,64);
      },
      toast(msg){ window._showToast(String(msg).slice(0,60)); }
    };
    try{
      new Function('MC', code)(MC);
      window._saveMods();
      buildAtlas();
      if(G.worldCreated) window._renderInvUI();
      window._showToast('Мод применён');
      sfx('pop');
    }catch(err){
      window._showToast('Ошибка мода: '+String(err.message||err).slice(0,50));
    }
  });
  document.getElementById('modsClear').addEventListener('click',()=>{
    clearAllMods();
    buildAtlas();
    window._showToast('Все моды удалены');
  });
  document.getElementById('btnContinue').addEventListener('click',()=>{
    ac(); G.screenState='game'; window._refreshScreens(); window._mobileBoost(); window._lockPointer();
  });
  document.getElementById('resumeBtn').addEventListener('click',()=>{
    if(G.settingsFrom==='pause'){ window._showScreen('pause'); }
    window._lockPointer();
  });
  document.getElementById('menuBtn').addEventListener('click',()=>{
    if(G.dead){
      G.dead=false;
      G.player.health=20; G.player.air=10; G.player.hunger=20;
      if(G.dim!==0) window._setDimension(0);
      G.player.pos.set(G.spawnPos.x,G.spawnPos.y,G.spawnPos.z); G.player.vel.set(0,0,0);
    }
    G.invOpen=false;
    G.playing=false;
    window._resetUIInputs();
    G.screenState='title';
    window._refreshScreens();
  });
  document.getElementById('deathMenuBtn').addEventListener('click',()=>{
    if(G.dead){
      G.dead=false;
      G.player.health=20; G.player.air=10; G.player.hunger=20;
      if(G.dim!==0) window._setDimension(0);
      G.player.pos.set(G.spawnPos.x,G.spawnPos.y,G.spawnPos.z); G.player.vel.set(0,0,0);
    }
    G.invOpen=false; G.playing=false;
    window._resetUIInputs();
    G.screenState='title';
    window._refreshScreens();
  });
  document.getElementById('respawnBtn').addEventListener('click',()=>{
    G.dead=false; G.invOpen=false;
    if(G.dim!==0) window._setDimension(0);
    G.player.pos.set(G.spawnPos.x,G.spawnPos.y,G.spawnPos.z);
    G.player.vel.set(0,0,0);
    G.player.health=20; G.player.air=10; G.player.hunger=20;
    G.player.falling=false; G.player.drownT=0; G.player.voidT=0; G.player.starveT=0;
    G.player.fly=false;
    window._renderHealth(); window._renderHunger(); window._renderAir();
    window._refreshScreens(); window._mobileBoost(); window._lockPointer();
  });
  document.getElementById('winBtn').addEventListener('click',()=>{
    document.getElementById('win').style.display='none';
    window._lockPointer();
  });
  document.getElementById('invClose').addEventListener('click',()=>window._closeInventory());
}
