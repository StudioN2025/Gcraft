import { G } from '../core/state.js';
import { hashSeed, vibrate } from '../core/utils.js';
import { B, HOTBAR } from '../data/blocks.js';
import { buildAtlas, atlasTex } from '../engine/atlas.js';
import { rebuildClouds, applyShadows } from '../engine/renderer.js';
import { resetWorlds, findSpawn, setDimension, scanChunks, getBlock } from './world.js';
import { computeStronghold, biomeAt } from './worldgen.js';
import { furnaces, chests, clearDrops } from '../gameplay/drops.js';
import { clearMobs, trySpawnMob, resetDragonState } from '../entities/mobs.js';
import { clearFireballs, clearEyeFx } from '../entities/mobs.js';
import { renderHotbar, renderHealth, renderHunger, renderAir, renderCursorItem, renderHotbar as rh, updateWorldLabel } from '../ui/hud.js';
import { renderCursorItem as rci } from '../gameplay/inventory.js';
import { loadVanillaTextures, loadVanillaItemTextures } from '../ui/textures.js';

export function resetWorld(seed){
  G.SEED=seed|0;
  document.getElementById('seedLabel').textContent=G.SEED;
  buildAtlas();
  loadVanillaTextures();
  rebuildClouds();
  resetWorlds();
  furnaces.clear();
  chests.clear();
  clearMobs(); clearFireballs(); clearEyeFx(); clearDrops();
  resetDragonState();
  document.getElementById('bossbar').style.display='none';
  portalsReset();
  computeStronghold();
  G.spawnPos=findSpawn();
  G.player.pos.set(G.spawnPos.x,G.spawnPos.y,G.spawnPos.z);
  G.player.vel.set(0,0,0);
  G.player.fly=false; G.player.falling=false;
  G.player.health=20; G.player.air=10; G.player.hunger=20;
  G.player.lastDamageT=-99; G.player.regenAcc=0; G.player.drownT=0;
  G.player.voidT=0; G.player.starveT=0; G.player.lavaT=0;
  G.dead=false; G.invOpen=false;
  G.mine.active=false; window._crackMesh.visible=false;
  G.cursor=null;
  window._craftGrid=new Array(9).fill(null);
  window._craftResult=null;
  G.inv = new Array(36).fill(null);
  if(G.game.mode==='creative'){
    HOTBAR.forEach((id,i)=>{ G.inv[i]={id,count:Infinity}; });
  }
  G.slot=0;
  G.worldT=0.3;
  G.winShown=false;
  updateWorldLabel();
  renderHotbar(); renderHealth(); renderHunger(); renderAir(); rci();
  window._updateTouchUI();
  applyShadows();
  window._applyShadowsWorld && window._applyShadowsWorld();
  scanChunks(true);
  for(let k=0;k<6;k++) trySpawnMob();
  loadVanillaItemTextures();
}
function portalsReset(){ window._portalsReg && (window._portalsReg[0].length=0, window._portalsReg[1].length=0, window._portalsReg[2].length=0); }
export function scanChunksNow(){ scanChunks(true); }
