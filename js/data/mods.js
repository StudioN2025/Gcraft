import { G } from '../core/state.js';
import { clamp } from '../core/utils.js';
import { BLOCKS, HARDNESS, DROPS, OPAQUE, SOLID, AOS, PICKS, ORE_TIER } from './blocks.js';

export const PALETTE = [];
export let modDefs = [];
try{ modDefs = JSON.parse(localStorage.getItem('mcjs_mods')||'[]'); }catch(e){}
export function saveMods(){ try{ localStorage.setItem('mcjs_mods', JSON.stringify(modDefs)); }catch(e){} }

let atlasTexRef = null, buildIconsRef = null, buildAtlasRef = null, drawIsoIconRef = null;
export function bindAtlasFns(refs){
  atlasTexRef = refs.atlasTex;
  buildIconsRef = refs.buildIcons;
  buildAtlasRef = refs.buildAtlas;
  drawIsoIconRef = refs.drawIsoIcon;
}

export function rebuildPalette(){
  // базовая палитра подтягивается из blocks.js статически, тут только моды
  return PALETTE;
}
export function paletteBase(){
  return [
    ...Object.keys(BLOCKS).map(Number).filter(id=>id<64),
    101,102,103,104,105,107,108,109,110,111,112,
    113,115,116,126,127,128,129,130,123,124,131,125,
    118,120,122
  ];
}
export function modTile(i){ return 51+i; }

export function registerModBlock(def){
  if(modDefs.length>=8){ return {err:'Лимит — 8 мод-блоков'}; }
  const id = 64 + modDefs.length;
  modDefs.push({ name:(def.name||'Мод-блок').slice(0,28),
                 color:def.color||[200,80,200], hardness:def.hardness||1.8, tex:def.tex||null });
  const t = modTile(modDefs.length-1);
  BLOCKS[id] = { name:def.name, top:t, side:t, bot:t };
  HARDNESS[id]=def.hardness||1.8;
  DROPS[id]=id;
  OPAQUE[id]=true; SOLID[id]=true; AOS[id]=true;
  PICKS.add(id); ORE_TIER[id]=1;
  return {id};
}
export function applyModTextures(){
  const actx2d = atlasTexRef ? atlasTexRef.image?.getContext?.('2d') : null;
  // доступ к 2d-контексту атласа через переданную ссылку
  const atlas2d = getAtlas2d();
  modDefs.forEach((md,i)=>{
    const t=modTile(i), tx=(t&31)*16, ty=(t>>5)*16;
    if(!md.tex && atlas2d){
      const col=md.color;
      const rng = getRng()(G.SEED ^ ((t+7)*7717));
      for(let y=0;y<16;y++) for(let x=0;x<16;x++){
        const v=(rng()-0.5)*44;
        atlas2d.fillStyle=`rgb(${clamp(col[0]+v,0,255)|0},${clamp(col[1]+v,0,255)|0},${clamp(col[2]+v,0,255)|0})`;
        atlas2d.fillRect(tx+x,ty+y,1,1);
      }
      getAVG()[t]=[col[0],col[1],col[2]];
    }
  });
  if(atlasTexRef) atlasTexRef.needsUpdate=true;
  modDefs.forEach((md,i)=>{
    if(!md.tex) return;
    const t=modTile(i);
    const img=new Image();
    img.onload=()=>{
      if(atlas2d){
        const tx=(t&31)*16, ty=(t>>5)*16;
        atlas2d.imageSmoothingEnabled=false;
        atlas2d.clearRect(tx,ty,16,16);
        atlas2d.drawImage(img,tx,ty,16,16);
        try{
          const d=atlas2d.getImageData(tx,ty,16,16).data;
          let r=0,g=0,b=0;
          for(let k=0;k<d.length;k+=4){ r+=d[k]; g+=d[k+1]; b+=d[k+2]; }
          getAVG()[t]=[r/256,g/256,b/256];
        }catch(e){}
      }
      const id=64+i;
      if(BLOCKS[id] && drawIsoIconRef){
        const c=document.createElement('canvas'); c.width=c.height=48;
        drawIsoIconRef(c,id);
        getICON()[id]=c.toDataURL(); getICONC()[id]=c;
      }
      if(atlasTexRef) atlasTexRef.needsUpdate=true;
    };
    img.src=md.tex;
  });
}
export function restoreMods(){
  modDefs.forEach((md,i)=>{
    const id=64+i, t=modTile(i);
    BLOCKS[id]={name:md.name, top:t, side:t, bot:t};
    HARDNESS[id]=md.hardness||1.8;
    DROPS[id]=id;
    OPAQUE[id]=true; SOLID[id]=true; AOS[id]=true;
    PICKS.add(id); ORE_TIER[id]=1;
  });
}
export function clearAllMods(){
  for(let i=0;i<8;i++){
    const id=64+i;
    delete BLOCKS[id]; delete HARDNESS[id]; delete DROPS[id];
    delete OPAQUE[id]; delete SOLID[id]; delete AOS[id];
    PICKS.delete(id); delete ORE_TIER[id];
  }
  modDefs=[];
  saveMods();
}

/* поздние ссылки — ставит atlas.js при инициализации, чтобы избежать циклов */
let _atlas2d=null, _rng=null, _avg=null, _icon=null, _iconc=null;
export function bindAtlasInternals(refs){
  _atlas2d=refs.atlas2d; _rng=refs.mulberry32;
  _avg=refs.AVG; _icon=refs.ICON; _iconc=refs.ICONC;
}
function getAtlas2d(){ return _atlas2d; }
function getRng(){ return _rng || (()=>Math.random); }
function getAVG(){ return _avg||[]; }
function getICON(){ return _icon||{}; }
function getICONC(){ return _iconc||{}; }
