import { G } from '../core/state.js';
import { clamp } from '../core/utils.js';
import { B, IT } from '../data/blocks.js';
import { actx2d, atlasTex, AVG, ICON, ICONC, drawIsoIcon, crackTexs } from '../engine/atlas.js';
import { hotbarEl, renderHotbar, renderHealth, renderHunger, renderAir } from './hud.js';
import { renderInvUI } from '../gameplay/inventory.js';

const TEX_DIR = 'assets/textures/blocks/';
const VANILLA_FACES = {
  [B.GRASS]:      ['grass_block_top','grass_block_side','dirt'],
  [B.DIRT]:       ['dirt','dirt','dirt'],
  [B.STONE]:      ['stone','stone','stone'],
  [B.SAND]:       ['sand','sand','sand'],
  [B.LOG]:        ['oak_log_top','oak_log','oak_log_top'],
  [B.LEAVES]:     ['oak_leaves','oak_leaves','oak_leaves'],
  [B.WATER]:      ['water_still','water_still','water_still'],
  [B.PLANKS]:     ['oak_planks','oak_planks','oak_planks'],
  [B.COBBLE]:     ['cobblestone','cobblestone','cobblestone'],
  [B.GLASS]:      ['glass','glass','glass'],
  [B.BRICK]:      ['bricks','bricks','bricks'],
  [B.SNOW]:       ['snow','snow','snow'],
  [B.BEDROCK]:    ['bedrock','bedrock','bedrock'],
  [B.CRAFT]:      ['crafting_table_top','crafting_table_side','oak_planks'],
  [B.COAL_ORE]:   ['coal_ore','coal_ore','coal_ore'],
  [B.IRON_ORE]:   ['iron_ore','iron_ore','iron_ore'],
  [B.FURNACE]:    ['furnace_top','furnace_front','furnace_top'],
  [B.DIAMOND_ORE]:['diamond_ore','diamond_ore','diamond_ore'],
  [B.OBSIDIAN]:   ['obsidian','obsidian','obsidian'],
  [B.NETHERRACK]: ['netherrack','netherrack','netherrack'],
  [B.GLOWSTONE]:  ['glowstone','glowstone','glowstone'],
  [B.PORTAL]:     ['nether_portal','nether_portal','nether_portal'],
  [B.END_STONE]:  ['end_stone','end_stone','end_stone'],
  [B.END_FRAME]:  ['end_portal_frame_top','end_portal_frame_side','end_stone'],
  [B.END_FRAME_EYE]:['end_portal_frame_eye','end_portal_frame_side','end_stone'],
  [B.END_PORTAL]: ['end_portal','end_portal','end_portal'],
  [B.LAVA]:       ['lava_still','lava_still','lava_still'],
  [B.BIRCH_LOG]:  ['birch_log_top','birch_log','birch_log_top'],
  [B.BIRCH_LEAVES]:['birch_leaves','birch_leaves','birch_leaves'],
  [B.SPRUCE_LOG]: ['spruce_log_top','spruce_log','spruce_log_top'],
  [B.SPRUCE_LEAVES]:['spruce_leaves','spruce_leaves','spruce_leaves'],
  [B.ACACIA_LOG]: ['acacia_log_top','acacia_log','acacia_log_top'],
  [B.ACACIA_LEAVES]:['acacia_leaves','acacia_leaves','acacia_leaves'],
  [B.RED_SAND]:   ['red_sand','red_sand','red_sand'],
  [B.TERRACOTTA]: ['terracotta','terracotta','terracotta'],
  [B.AMETHYST]:   ['amethyst_block','amethyst_block','amethyst_block'],
  [B.CALCITE]:    ['calcite','calcite','calcite'],
  [B.SMOOTH_STONE]:['smooth_stone','smooth_stone','smooth_stone'],
  [B.GRAVEL]:     ['gravel','gravel','gravel'],
  [B.CLAY]:       ['clay','clay','clay'],
  [B.DARK_PRISMARINE]:['dark_prismarine','dark_prismarine','dark_prismarine'],
  [B.MOSSY_COBBLE]:['mossy_cobblestone','mossy_cobblestone','mossy_cobblestone'],
  [B.TERRACOTTA_ORANGE]:['orange_terracotta','orange_terracotta','orange_terracotta'],
  [B.TERRACOTTA_YELLOW]:['yellow_terracotta','yellow_terracotta','yellow_terracotta'],
};
import { TINT_TARGETS } from '../world/worldgen.js';

const _texCache = new Map();
function loadTexFile(name){
  if(_texCache.has(name)) return Promise.resolve(_texCache.get(name));
  return new Promise(res=>{
    const img=new Image();
    img.onload=()=>{ _texCache.set(name,img); res(img); };
    img.onerror=()=>{ _texCache.set(name,null); res(null); };
    img.src=TEX_DIR+name+'.png';
  });
}
function clearTile(t){ actx2d.clearRect((t&31)*16,(t>>5)*16,16,16); }
function blitFirstFrame(img,t){
  const tx=(t&31)*16, ty=(t>>5)*16;
  actx2d.imageSmoothingEnabled=false;
  if(img.width===img.height) actx2d.drawImage(img,tx,ty,16,16);
  else actx2d.drawImage(img,0,0,img.width,img.width,tx,ty,16,16);
}
function recalcAvgTile(t){
  try{
    const d=actx2d.getImageData((t&31)*16,(t>>5)*16,16,16).data;
    let r=0,g=0,b=0;
    for(let i=0;i<d.length;i+=4){ r+=d[i]; g+=d[i+1]; b+=d[i+2]; }
    AVG[t]=[r/256,g/256,b/256];
  }catch(e){}
}
function refreshAllIcons(){
  for(const idStr in BLOCKS){
    const id=+idStr, bl=BLOCKS[id];
    if(!bl) continue;
    const c=document.createElement('canvas'); c.width=c.height=48;
    drawIsoIcon(c,id); ICON[id]=c.toDataURL(); ICONC[id]=c;
  }
}
export async function retintForBiome(biome){
  const tg=TINT_TARGETS[biome]||TINT_TARGETS.plains;
  {
    const bl=BLOCKS[B.GRASS];
    const img=_texCache.get('grass_block_top');
    if(img){
      clearTile(bl.top); blitFirstFrame(img,bl.top);
      const mul=normalizeTileTo(bl.top, tg.grass);
      const ov=_texCache.get('grass_block_side_overlay');
      clearTile(bl.side); blitFirstFrame(_texCache.get('grass_block_side')||img, bl.side);
      if(ov){
        const oc=tintOverlayCanvas(ov, mul);
        actx2d.drawImage(oc,(bl.side&31)*16,(bl.side>>5)*16);
      }
      recalcAvgTile(bl.top); recalcAvgTile(bl.side);
    }
  }
  const leafMap = [[B.LEAVES,'oak_leaves','oak'],[B.BIRCH_LEAVES,'birch_leaves','birch'],
                   [B.SPRUCE_LEAVES,'spruce_leaves','spruce'],[B.ACACIA_LEAVES,'acacia_leaves','acacia']];
  for(const [id,texName,key] of leafMap){
    const bl=BLOCKS[id];
    const img=_texCache.get(texName);
    if(!img||!bl) continue;
    clearTile(bl.top); blitFirstFrame(img,bl.top);
    normalizeTileTo(bl.top, tg[key]);
    recalcAvgTile(bl.top);
  }
  atlasTex.needsUpdate=true;
  refreshAllIcons();
  renderHotbar();
  if(G.invOpen) renderInvUI();
}
function normalizeTileTo(t,target){
  const tx=(t&31)*16, ty=(t>>5)*16;
  const d=actx2d.getImageData(tx,ty,16,16);
  let ar=0,ag=0,ab=0;
  for(let i=0;i<d.data.length;i+=4){ ar+=d.data[i]; ag+=d.data[i+1]; ab+=d.data[i+2]; }
  ar/=256; ag/=256; ab/=256;
  const cl=v=>clamp(v,0.4,2.6);
  const kr=ar>10?cl(target[0]/ar):1, kg=ag>10?cl(target[1]/ag):1, kb=ab>10?cl(target[2]/ab):1;
  for(let i=0;i<d.data.length;i+=4){
    d.data[i]  = clamp(d.data[i]  *kr,0,255);
    d.data[i+1]= clamp(d.data[i+1]*kg,0,255);
    d.data[i+2]= clamp(d.data[i+2]*kb,0,255);
  }
  actx2d.putImageData(d,tx,ty);
  return [kr,kg,kb];
}
function tintOverlayCanvas(img, mul){
  const oc=document.createElement('canvas'); oc.width=oc.height=16;
  const octx=oc.getContext('2d');
  octx.imageSmoothingEnabled=false;
  octx.drawImage(img,0,0,16,16);
  const od=octx.getImageData(0,0,16,16);
  for(let i=0;i<od.data.length;i+=4){
    od.data[i]  = clamp(od.data[i]  *mul[0],0,255);
    od.data[i+1]= clamp(od.data[i+1]*mul[1],0,255);
    od.data[i+2]= clamp(od.data[i+2]*mul[2],0,255);
  }
  octx.putImageData(od,0,0);
  return oc;
}
export async function loadVanillaTextures(){
  const need=new Set(['grass_block_side_overlay']);
  for(const k in VANILLA_FACES){
    const bl=BLOCKS[+k];
    if(bl) VANILLA_FACES[k].forEach(n=>need.add(n));
  }
  await Promise.all([...need].map(loadTexFile));
  let applied=0;
  for(const k in VANILLA_FACES){
    const id=+k, bl=BLOCKS[id];
    if(!bl) continue;
    const props=['top','side','bot'];
    for(let i=0;i<3;i++){
      const t=bl[props[i]];
      const name=VANILLA_FACES[k][i];
      const img=_texCache.get(name);
      if(!img) continue;
      clearTile(t);
      blitFirstFrame(img,t);
      recalcAvgTile(t);
      applied++;
    }
  }
  await retintForBiome('plains');
  if(applied){
    atlasTex.needsUpdate=true;
    refreshAllIcons();
    renderHotbar();
    if(G.invOpen) renderInvUI();
    console.log('%c[Текстуры] граней из пака: '+applied,'color:#5c5');
  }
  const stages=[0,3,6,9];
  await Promise.all(stages.map(s=>loadTexFile('destroy_stage_'+s)));
  stages.forEach((s,i)=>{
    const img=_texCache.get('destroy_stage_'+s);
    if(!img) return;
    const c=document.createElement('canvas'); c.width=c.height=16;
    const ctx=c.getContext('2d');
    ctx.imageSmoothingEnabled=false;
    ctx.drawImage(img,0,0,16,16);
    crackTexs[i].image=c;
    crackTexs[i].needsUpdate=true;
  });
}
const ITEM_DIR_CANDIDATES = ['assets/textures/item/', 'assets/textures/items/'];
const VANILLA_ITEMS = {
  [IT.WOOD_PICK]:   'wooden_pickaxe',[IT.STONE_PICK]:  'stone_pickaxe',
  [IT.IRON_PICK]:   'iron_pickaxe',[IT.DIAMOND_PICK]:'diamond_pickaxe',
  [IT.WOOD_AXE]:    'wooden_axe',[IT.STONE_AXE]:   'stone_axe',
  [IT.IRON_AXE]:    'iron_axe',[IT.DIAMOND_AXE]: 'diamond_axe',
  [IT.WOOD_SWORD]:  'wooden_sword',[IT.STONE_SWORD]: 'stone_sword',
  [IT.IRON_SWORD]:  'iron_sword',[IT.DIAMOND_SWORD]:'diamond_sword',
  [IT.STICK]:       'stick',[IT.COAL]:        'coal',
  [IT.RAW_IRON]:    'raw_iron',[IT.IRON_INGOT]:  'iron_ingot',
  [IT.DIAMOND]:     'diamond',[IT.RAW_PORK]:    'porkchop',
  [IT.COOKED_PORK]: 'cooked_porkchop',[IT.RAW_BEEF]:    'beef',
  [IT.STEAK]:       'cooked_beef',[IT.RAW_CHICKEN]: 'chicken',
  [IT.COOKED_CHICKEN]:'cooked_chicken',[IT.BUCKET]:      'bucket',
  [IT.BUCKET_WATER]:'water_bucket',[IT.BUCKET_LAVA]: 'lava_bucket',
  [IT.APPLE]:       'apple',[IT.FLINT_STEEL]: 'flint_and_steel',
  [IT.BLAZE_ROD]:   'blaze_rod',[IT.BLAZE_POWDER]:'blaze_powder',
  [IT.ENDER_PEARL]: 'ender_pearl',[IT.ENDER_EYE]:   'ender_eye',
};
let itemDir = null;
async function detectItemDir(){
  if(itemDir!==null) return itemDir;
  for(const dir of ITEM_DIR_CANDIDATES){
    const ok = await new Promise(res=>{
      const img=new Image();
      img.onload=()=>res(true);
      img.onerror=()=>res(false);
      img.src=dir+'stick.png';
    });
    if(ok){ itemDir=dir; return dir; }
  }
  itemDir=false;
  return false;
}
function loadItemTex(name){
  return new Promise(res=>{
    const img=new Image();
    img.onload=()=>res(img);
    img.onerror=()=>res(null);
    img.src=itemDir+name+'.png';
  });
}
export async function loadVanillaItemTextures(){
  const dir = await detectItemDir();
  if(!dir){ console.log('[Предметы] папка textures/item не найдена'); return; }
  const entries=Object.entries(VANILLA_ITEMS);
  const results=await Promise.all(entries.map(([id,name])=>loadItemTex(name)));
  let applied=0;
  for(let i=0;i<entries.length;i++){
    const [id,name]=entries[i];
    const img=results[i];
    if(!img) continue;
    const c=document.createElement('canvas'); c.width=c.height=48;
    const ctx=c.getContext('2d');
    ctx.imageSmoothingEnabled=false;
    ctx.drawImage(img,0,0,16,16,0,0,48,48);
    ICON[id]=c.toDataURL();
    ICONC[id]=c;
    applied++;
  }
  if(applied){
    renderHotbar();
    if(G.invOpen) renderInvUI();
    console.log('%c[Предметы] иконок из пака: '+applied,'color:#5c5');
  }
}
const HUD_DIR = 'assets/textures/gui/sprites/hud/';
const HUD_FILES = ['hotbar','hotbar_selection','crosshair',
                   'container','full','half','hardcore_full','hardcore_half',
                   'food_full','food_half','food_empty','air','air_bursting'];
export async function loadHudSprites(){
  await Promise.all(HUD_FILES.map(n=>new Promise(res=>{
    const img=new Image();
    img.onload=()=>{ G.hudTex[n]=img; res(); };
    img.onerror=()=>{ G.hudTex[n]=null; res(); };
    img.src=HUD_DIR+n+'.png';
  })));
  if(G.hudTex.crosshair){
    document.getElementById('crosshairImg').src=G.hudTex.crosshair.src;
    document.body.classList.add('hud-tex');
  }
  if(G.hudTex.hotbar){
    hotbarEl.style.background=`url(${G.hudTex.hotbar.src}) center/100% 100% no-repeat`;
    hotbarEl.style.border='none';
    hotbarEl.style.padding='8px';
    hotbarEl.style.imageRendering='pixelated';
  }
  renderHealth(); renderHunger(); renderAir(); renderHotbar();
  console.log('%c[HUD] спрайтов загружено: '+Object.values(G.hudTex).filter(Boolean).length,'color:#5c5');
}
