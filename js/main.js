import * as THREE from 'three';
import { G } from './core/state.js';
import { clamp, lerp, hashSeed, vibrate } from './core/utils.js';
import { canvas, renderer, scene, camera, bgColor, amb, sunLight, crackMesh, hl, applyShadows } from './engine/renderer.js';
import { buildAtlas, atlasTex, drawIsoIcon, ICON, ICONC } from './engine/atlas.js';
import { setWorldAPI } from './engine/meshing.js';
import { rebuildClouds, updateSky, setGetBlock } from './engine/sky.js';
import { getChunk, getBlock, setBlockWorld, scanChunks, processQueue, setDimension,
         portalsReg, surfaceYAt, isWaterAt, isLavaAt } from './world/world.js';
import { computeStronghold, biomeAt, BIOMES_RU } from './world/worldgen.js';
import { spawnParticles, spawnBreakParticles, updateParticles } from './world/particles.js';
import { resetWorld } from './world/reset.js';
import { updatePlayer, updateSurvival, updateVoid } from './entities/player.js';
import { updateMobs, updateDragon, updateFireballs, clearMobs, clearFireballs,
         clearEyeFx, tickT2, pickMob, tryAttack, spawnDragon, removeDragon, isDragonDead } from './entities/mobs.js';
import { updateInteraction, raycastBlock, doPlace } from './gameplay/interaction.js';
import { renderInvUI, tickFurnaces, furnaces, chests, furnKeyCur, chestKeyCur,
         openInventory, closeInventory, renderFurnaceUI } from './gameplay/inventory.js';
import { updateDrops, clearDrops } from './gameplay/drops.js';
import { hotbarEl, renderHotbar, selectSlot, renderHealth, renderHunger, renderAir,
         showToast, updateHUD, updateWorldLabel, renderCursorItem, damage, addHunger } from './ui/hud.js';
import { initScreens, refreshScreens, lockPointer, showScreen } from './ui/screens.js';
import { loadVanillaTextures, loadVanillaItemTextures, loadHudSprites, retintForBiome } from './ui/textures.js';
import { initKeyboard } from './controls/keyboard.js';
import { initMouse } from './controls/mouse.js';
import { initTouch } from './controls/touch.js';
import { setInChunk } from './world/worldgen.js';
import { B, BLOCKS, nameOf } from './data/blocks.js';
import { rebuildPalette, paletteBase, saveMods, registerModBlock } from './data/mods.js';

/* глобальные мосты между модулями (чтобы не гонять циклы импортов) */
window._keys = {};
window._scene = scene;
window._crackMesh = crackMesh;
window._hl = hl;
window._furnaces = furnaces;
window._chests = chests;
window._portalsReg = portalsReg;
window._craftGrid = null;
window._craftResult = null;
window._craftSize = 2;
window._furnKeyCur = null;
window._chestKeyCur = null;
window._PALETTE = [];
window._getChunkFn = getChunk;
window._buildChunkFn = (c)=>{ buildChunkNow(c); };
window._spawnBreakParticles = spawnBreakParticles;
window._spawnParticles = spawnParticles;
window._addItem = (id,count,dur)=>addItem(id,count,dur);
window._damage = damage;
window._addHunger = addHunger;
window._showToast = showToast;
window._showScreen = showScreen;
window._refreshScreens = refreshScreens;
window._lockPointer = lockPointer;
window._setPlaying = setPlaying;
window._setDimension = setDimension;
window._surfaceYAt = surfaceYAt;
window._closeInventory = closeInventory;
window._renderInvUI = renderInvUI;
window._renderHealth = renderHealth;
window._renderHunger = renderHunger;
window._renderAir = renderAir;
window._selectSlot = selectSlot;
window._updateTouchUI = ()=>{};
window._joyHide = ()=>{};
window._resetUIInputs = ()=>{};
window._mobileBoost = mobileBoost;
window._pickMob = pickMob;
window._tryAttack = tryAttack;
window._raycastBlock = raycastBlock;
window._breakBlockFn = (x,y,z,b)=>{ window._breakBlockInternal && window._breakBlockInternal(x,y,z,b); };
window._doPlace = doPlace;
window._attackDmg = ()=>window._attackDmgFn ? window._attackDmgFn() : 1;
window._biomeAt = biomeAt;
window._biomeRu = (b)=>BIOMES_RU[b]||b;
window._vibrate = vibrate;
window._IS_TOUCH = (window.matchMedia && matchMedia('(pointer: coarse)').matches);
window._saveMods = saveMods;
window._registerModBlock = registerModBlock;
window._findBlockByName = (n)=>Object.keys(BLOCKS).find(k=>BLOCKS[k].name===n) ?? null;

import { addItem } from './gameplay/inventory.js';
window._addItem = addItem;
import { breakBlock as _bb, updateInteraction as _ui2 } from './gameplay/interaction.js';
window._breakBlockInternal = _bb;
import { buildChunk as _bc } from './engine/meshing.js';
function buildChunkNow(c){ _bc(c); }
import { getChunk as _gc2 } from './world/world.js';
window._getChunkFn = _gc2;
import { updateTouchUI as _utu, joyHide as _jh, resetUIInputs as _rui } from './controls/touch.js';
window._updateTouchUI = _utu;
window._joyHide = _jh;
window._resetUIInputs = _rui;
import { rebuildPalette as _rp } from './data/mods.js';
function rebuildAllPalette(){
  const base = paletteBase();
  window._PALETTE.length=0;
  base.forEach(id=>window._PALETTE.push(id));
}
import { PALETTE, modDefs } from './data/mods.js';
function refreshPalette(){
  rebuildAllPalette();
  modDefs.forEach((md,i)=>{ if(BLOCKS[64+i]) window._PALETTE.push(64+i); });
}
refreshPalette();
window._refreshPalette = refreshPalette;

/* коммуникация interaction→mobs (attackDmg) */
import { attackDmgOf } from './gameplay/interaction.js';
window._attackDmgFn = attackDmgOf;
import { setPlayingInternal } from './ui/screensRef.js';
function setPlaying(p){
  G.playing=p;
  if(!p){ window._resetUIInputs(); }
  refreshScreens();
}
window._setPlaying = setPlaying;

setWorldAPI({ getBlock, getDim:()=>G.dim });
setGetBlock(getBlock);

document.getElementById('seedLabel').textContent=G.SEED;
computeStronghold();
G.spawnPos = (function(){
  for(let r=0;r<120;r++){
    const steps=Math.max(1,r*8);
    for(let a=0;a<steps;a++){
      const ang=a/steps*Math.PI*2;
      const x=Math.round(Math.cos(ang)*r), z=Math.round(Math.sin(ang)*r);
      const b=biomeAt(x,z);
      const h=terrainHeightLocal(x,z);
      if(h>31 && h<50 && b!=='snowy_peaks') return {x:x+0.5, y:h+1, z:z+0.5};
    }
  }
  return {x:0.5, y:40, z:0.5};
  function terrainHeightLocal(x,z){
    const cont = fbmLocal(x*0.0011+100, z*0.0011-100, 3);
    const ero = fbmLocal(x*0.0032+700, z*0.0032-700, 3);
    const pv = fbmLocal(x*0.0048-2000, z*0.0048+2000, 3);
    const pvR = 1-Math.abs(pv*2-1);
    let base;
    if(cont<0.38) base = lerp(6, 30, cont/0.38);
    else base = lerp(30, 42, (cont-0.38)/0.62);
    const erof = clamp((ero-0.3)/0.5, 0, 1);
    const mountain = Math.pow(pvR,2.2) * (1-erof) * 26 * clamp((cont-0.5)/0.5,0,1);
    const detail = (fbmLocal(x*0.016+500, z*0.016-500, 4)-0.5)*10*(1-erof*0.8);
    return clamp(Math.floor(base + detail + mountain), 4, 60);
  }
  function fbmLocal(x,z,oct){
    let val=0, amp=0.5, f=1, norm=0;
    for(let i=0;i<oct;i++){
      val += vnLocal(x*f,z*f)*amp; norm+=amp; amp*=0.5; f*=2;
    }
    return val/norm;
  }
  function vnLocal(x,z){
    const xi=Math.floor(x), zi=Math.floor(z);
    const u=(x-xi)*(x-xi)*(3-2*(x-xi)), v=(z-zi)*(z-zi)*(3-2*(z-zi));
    function h2(xx,zz){
      let h=(Math.imul(xx,374761393)+Math.imul(zz,668265263)+G.SEED)|0;
      h=Math.imul(h^(h>>>13),1274126177);
      return ((h^(h>>>16))>>>0)/4294967296;
    }
    return lerp(lerp(h2(xi,zi),h2(xi+1,zi),u), lerp(h2(xi,zi+1),h2(xi+1,zi+1),u), v);
  }
})();
G.player.pos.set(G.spawnPos.x,G.spawnPos.y,G.spawnPos.z);
rebuildClouds();
renderHotbar();
selectSlot(0);
initScreens();
window._syncSettingsUI();
refreshScreens();
scanChunks(true);
loadVanillaTextures();
loadVanillaItemTextures();
loadHudSprites();
initKeyboard();
initMouse();
initTouch();

function mobileBoost(){
  if(!window._IS_TOUCH) return;
  try{
    const el=document.documentElement;
    if(el.requestFullscreen) el.requestFullscreen().catch(()=>{});
  }catch(e){}
  try{
    if(screen.orientation && screen.orientation.lock) screen.orientation.lock('landscape').catch(()=>{});
  }catch(e){}
}
window._mobileBoost = mobileBoost;

let last=performance.now();
let lastBiomeCheck=0;
function loop(now){
  requestAnimationFrame(loop);
  const dt=Math.min(0.05,(now-last)/1000); last=now;
  tickT2(dt);
  if(G.dim===0) G.worldT=(G.worldT+dt/480)%1;
  scanChunks(false);
  processQueue();
  const t=performance.now()/1000;
  const inGame = G.screenState==='game';
  const uiBlocking = G.currentScreen==='settings' || G.currentScreen==='mods';
  if(!inGame){
    const a=t*0.05;
    camera.position.set(G.spawnPos.x+Math.cos(a)*32, G.spawnPos.y+16, G.spawnPos.z+Math.sin(a)*32);
    camera.lookAt(G.spawnPos.x, G.spawnPos.y+3, G.spawnPos.z);
    hl.visible=false; crackMesh.visible=false;
  } else if(G.playing && !G.dead){
    if(!G.invOpen && !uiBlocking){
      updatePlayer(dt);
      updateInteraction(t,dt);
    }
    updateSurvival(dt,t);
    updateVoid(dt);
    updateMobs(dt,t);
    updateDragon(dt,t);
    updateFireballs(dt);
    tickFurnaces(dt);
    if(G.invOpen && G.uiMode==='furnace') renderFurnaceUI();
    if(G.dim===0 && t-lastBiomeCheck>2){
      lastBiomeCheck=t;
      retintForBiome(biomeAt(Math.floor(G.player.pos.x),Math.floor(G.player.pos.z)));
    }
  } else {
    hl.visible=false; crackMesh.visible=false;
    updateFireballs(dt);
  }
  updateSky(dt);
  updateParticles(dt);
  updateDrops(dt,t);
  updateEyeFx(dt);
  updateHUD(dt);
  renderer.render(scene,camera);
}
requestAnimationFrame(loop);
