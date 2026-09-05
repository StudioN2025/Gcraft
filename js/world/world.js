import { G } from '../core/state.js';
import { clamp } from '../core/utils.js';
import { B, SOLID, NEIGH } from '../data/blocks.js';
import { buildChunk, disposeMeshes } from '../engine/meshing.js';
import { genChunkOver, genChunkNether, genChunkEnd, terrainHeight, biomeAt,
         computeStronghold, clearWorldCaches } from './worldgen.js';

export const worlds = [new Map(), new Map(), new Map()];
let chunks = worlds[0];
export const ckey = (cx,cz)=> cx*65536 + cz;

export function getChunk(cx,cz){
  const k = ckey(cx,cz);
  let c = chunks.get(k);
  if(!c){
    c = (G.dim===1)?genChunkNether(cx,cz):(G.dim===2)?genChunkEnd(cx,cz):genChunkOver(cx,cz);
    chunks.set(k,c);
  }
  return c;
}
export function getBlock(wx,wy,wz){
  if(wy<0) return (G.dim===2)?B.AIR:B.BEDROCK;
  if(wy>=72) return B.AIR;
  const c = chunks.get(ckey(wx>>4, wz>>4));
  if(!c) return B.AIR;
  return c.data[(wy*16+(wz&15))*16+(wx&15)];
}
export function floorYAt(x,y,z){
  const ix=Math.floor(x), iz=Math.floor(z);
  let iy=Math.min(71, Math.floor(y));
  for(; iy>=0; iy--){
    if(SOLID[getBlock(ix,iy,iz)]) return iy+1;
  }
  return 1;
}
export function surfaceYAt(wx,wz){
  for(let y=71;y>0;y--){
    const b=getBlock(wx,y,wz);
    if(b!==B.AIR && b!==B.WATER) return y+1;
  }
  return 1;
}
export function getChunks(){ return chunks; }
export function getDim(){ return G.dim; }

let meshQueue=[];
let lastScan=0, lastPcx=1e9, lastPcz=1e9;
export function scanChunks(force){
  const fx = G.screenState==='game' ? G.player.pos.x : G.spawnPos.x;
  const fz = G.screenState==='game' ? G.player.pos.z : G.spawnPos.z;
  const pcx=Math.floor(fx/16), pcz=Math.floor(fz/16);
  const now=performance.now()/1000;
  if(!force && pcx===lastPcx && pcz===lastPcz && now-lastScan<0.5) return;
  lastPcx=pcx; lastPcz=pcz; lastScan=now;
  for(let dx=-G.VIEW-1;dx<=G.VIEW+1;dx++) for(let dz=-G.VIEW-1;dz<=G.VIEW+1;dz++) getChunk(pcx+dx,pcz+dz);
  meshQueue.length=0;
  for(let dx=-G.VIEW;dx<=G.VIEW;dx++) for(let dz=-G.VIEW;dz<=G.VIEW;dz++){
    const c=chunks.get(ckey(pcx+dx,pcz+dz));
    if(c && !c.built) meshQueue.push([pcx+dx,pcz+dz,dx*dx+dz*dz]);
  }
  meshQueue.sort((a,b)=>a[2]-b[2]);
  for(const c of chunks.values())
    if(c.built && (Math.abs(c.cx-pcx)>G.VIEW+1 || Math.abs(c.cz-pcz)>G.VIEW+1)) disposeMeshes(c);
}
export function processQueue(){
  if(!meshQueue.length) return;
  let n = G.screenState==='game' ? 2 : 4;
  while(n-- && meshQueue.length){
    const [cx,cz]=meshQueue.shift();
    const c=chunks.get(ckey(cx,cz));
    if(c && !c.built) buildChunk(c);
  }
}
export function rebuildNow(cx,cz){
  const c=chunks.get(ckey(cx,cz));
  if(c && c.built) buildChunk(c);
}
export function setBlockWorld(x,y,z,b){
  const cx=x>>4, cz=z>>4;
  const c=chunks.get(ckey(cx,cz));
  if(!c) return;
  c.data[(y*16+(z&15))*16+(x&15)]=b;
  if(b!==B.AIR && y>c.maxY) c.maxY=y;
  const lx=x&15, lz=z&15;
  rebuildNow(cx,cz);
  if(lx===0)rebuildNow(cx-1,cz); if(lx===15)rebuildNow(cx+1,cz);
  if(lz===0)rebuildNow(cx,cz-1); if(lz===15)rebuildNow(cx,cz+1);
  if(lx===0 &&lz===0 )rebuildNow(cx-1,cz-1); if(lx===0 &&lz===15)rebuildNow(cx-1,cz+1);
  if(lx===15&&lz===0 )rebuildNow(cx+1,cz-1); if(lx===15&&lz===15)rebuildNow(cx+1,cz+1);
}
export const portalsReg = [[],[],[]];
export function setDimension(d){
  for(const c of chunks.values()) disposeMeshes(c);
  G.dim=d; chunks=worlds[d];
  meshQueue.length=0; lastPcx=1e9; lastPcz=1e9;
  G.player.vel.set(0,0,0); G.player.falling=false;
  scanChunks(true);
}
export function resetWorlds(){
  for(const w of worlds)
    for(const c of w.values()) disposeMeshes(c);
  worlds[0].clear(); worlds[1].clear(); worlds[2].clear();
  chunks=worlds[0];
  meshQueue.length=0; lastPcx=1e9; lastPcz=1e9;
  G.dim=0;
  clearWorldCaches();
}
export function isWaterAt(x,y,z){ return getBlock(Math.floor(x),Math.floor(y),Math.floor(z))===B.WATER; }
export function isLavaAt(x,y,z){ return getBlock(Math.floor(x),Math.floor(y),Math.floor(z))===B.LAVA; }
export function findSpawn(){
  for(let r=0;r<120;r++){
    const steps=Math.max(1,r*8);
    for(let a=0;a<steps;a++){
      const ang=a/steps*Math.PI*2;
      const x=Math.round(Math.cos(ang)*r), z=Math.round(Math.sin(ang)*r);
      const b=biomeAt(x,z);
      const h=terrainHeight(x,z);
      if(h>31 && h<50 && b!=='snowy_peaks') return {x:x+0.5, y:h+1, z:z+0.5};
    }
  }
  return {x:0.5, y:terrainHeight(0,0)+1, z:0.5};
}
