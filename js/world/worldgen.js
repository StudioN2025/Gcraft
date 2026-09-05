import { G } from '../core/state.js';
import { clamp, lerp, hash2, hash3, hash2s, vnoise3, fbm, mulberry32 } from '../core/utils.js';
import { B, RING } from '../data/blocks.js';

export let chunksRef = null;
export function bindChunks(ch){ chunksRef = ch; }

export const SEA = 30, CY = 72;

/* климат: температура/влажность/необычность → биом */
export function biomeAt(x,z){
  const temp = fbm(x*0.0016+3000, z*0.0016-3000, 2);
  const humid = fbm(x*0.0019-4000, z*0.0019+4000, 2);
  const weird = fbm(x*0.0022+5000, z*0.0022-5000, 2);
  if(temp>0.72 && humid<0.38) return weird>0.5?'mesa':'desert';
  if(temp<0.28) return 'snowy_peaks';
  if(humid>0.68) return temp>0.5?'swamp':'taiga';
  if(humid>0.52) return weird>0.5?'birch':'forest';
  return 'plains';
}
export const BIOMES_RU = { plains:'Равнины', forest:'Лес', birch:'Берёзовая роща',
  taiga:'Тайга', swamp:'Болото', snowy_peaks:'Снежные пики', desert:'Пустыня', mesa:'Меза' };
export const BIOME_TREE = {
  plains:{type:'oak', dens:0.003},
  forest:{type:'oak', dens:0.022},
  birch:{type:'birch', dens:0.020},
  taiga:{type:'spruce', dens:0.018},
  swamp:{type:'oak', dens:0.008},
  snowy_peaks:{type:'spruce', dens:0.004},
  desert:null, mesa:null
};
export const TINT_TARGETS = {
  plains:{grass:[145,189,89], oak:[119,171,47], birch:[138,180,80], spruce:[97,153,97], acacia:[119,171,47], water:[63,118,228]},
  forest:{grass:[119,171,47], oak:[119,171,47], birch:[138,180,80], spruce:[97,153,97], acacia:[119,171,47], water:[63,118,228]},
  birch:{grass:[138,180,80], oak:[119,171,47], birch:[138,180,80], spruce:[97,153,97], acacia:[119,171,47], water:[63,118,228]},
  taiga:{grass:[118,158,72], oak:[119,171,47], birch:[138,180,80], spruce:[80,138,80], acacia:[119,171,47], water:[48,100,200]},
  swamp:{grass:[106,127,80], oak:[106,120,60], birch:[110,130,70], spruce:[90,130,90], acacia:[106,120,60], water:[97,109,198]},
  snowy_peaks:{grass:[130,160,120], oak:[110,150,90], birch:[120,160,100], spruce:[97,153,97], acacia:[110,150,90], water:[80,120,210]},
  desert:{grass:[191,183,99], oak:[140,160,80], birch:[150,170,90], spruce:[110,150,100], acacia:[140,160,80], water:[63,118,228]},
  mesa:{grass:[167,157,90], oak:[140,160,80], birch:[150,170,90], spruce:[110,150,100], acacia:[140,160,80], water:[63,118,228]},
};

/* рельеф: континентальность → эрозия → пики-долины */
function terrainBase(x,z){
  const cont = fbm(x*0.0011+100, z*0.0011-100, 3);
  const ero = fbm(x*0.0032+700, z*0.0032-700, 3);
  const pv = fbm(x*0.0048-2000, z*0.0048+2000, 3);
  const pvR = 1-Math.abs(pv*2-1);
  let base;
  if(cont<0.38) base = lerp(6, SEA, cont/0.38);
  else base = lerp(SEA, 42, (cont-0.38)/0.62);
  const erof = clamp((ero-0.3)/0.5, 0, 1);
  const mountain = Math.pow(pvR,2.2) * (1-erof) * 26 * clamp((cont-0.5)/0.5,0,1);
  return { base, erof, mountain };
}
export function terrainHeight(x,z){
  const { base, erof, mountain } = terrainBase(x,z);
  const detail = (fbm(x*0.016+500, z*0.016-500, 4)-0.5)*10*(1-erof*0.8);
  return clamp(Math.floor(base + detail + mountain), 4, CY-12);
}

/* пещеры 1.21: noodle + cheese, воронки-входы */
export function isCave(x,y,z,h){
  if(y<5 || y>50) return false;
  const a = vnoise3(x*0.019, y*0.042, z*0.019) - 0.5;
  if(Math.abs(a) < 0.044){
    const b2 = vnoise3(x*0.019+520.7, y*0.042+520.7, z*0.019-311.3) - 0.5;
    if(Math.abs(b2) < 0.044){
      if(y < h-6) return true;
      if(y <= h && fbm(x*0.010-5000, z*0.010+5000, 2) > 0.58) return true;
    }
  }
  const cheese = vnoise3(x*0.045+911.7, y*0.075, z*0.045-411.3);
  const cheeseThr = y<20 ? 0.70 : y<32 ? 0.775 : 0.83;
  if(cheese > cheeseThr && y < h-6) return true;
  return false;
}
export function canyonColumn(x,z,h){
  if(h<=SEA+2) return 0;
  const s = Math.abs(fbm(x*0.0045+9000, z*0.0045-9000, 2)-0.5)*2;
  if(s>=0.09) return 0;
  const t = 1 - s/0.09;
  if(t<0.15 && fbm(x*0.02-3000, z*0.02+3000, 2)<0.45) return 0;
  return Math.max(10, Math.round(lerp(h-6, 10, t)));
}
function oreVein(x,y,z,salt,prob,r){
  const cx=x>>2, cy=y>>2, cz=z>>2;
  if(hash3(cx*31+salt, cy*17, cz*13) > prob) return false;
  const ox=hash3(cx+salt,cy,cz)*4, oy=hash3(cx,cy+salt,cz)*4, oz=hash3(cx,cy,cz+salt)*4;
  const dx=(x&3)+0.5-ox, dy=(y&3)+0.5-oy, dz=(z&3)+0.5-oz;
  return dx*dx+dy*dy+dz*dz <= r*r;
}
const _geodeCache=new Map();
function geodeAt(gx,gz){
  const k=Math.floor(gx/56)+','+Math.floor(gz/56);
  if(_geodeCache.has(k)) return _geodeCache.get(k);
  const cxx=Math.floor(gx/56), czz=Math.floor(gz/56);
  let g=null;
  if(hash3(cxx*77+111, 5, czz*91-111)<0.14){
    g={x:Math.floor(cxx*56+8+hash3(cxx,5,czz)*40), y:16+Math.floor(hash3(cxx,6,czz)*20),
       z:Math.floor(czz*56+8+hash3(cxx,7,czz)*40), r:4+Math.floor(hash3(cxx,8,czz)*3)};
  }
  _geodeCache.set(k,g);
  return g;
}
export function clearWorldCaches(){
  _geodeCache.clear();
  villageCache.clear();
  pyramidCache.clear();
}
const villageCache = new Map();
export function villageAt(cx,cz){
  const k=cx+','+cz;
  if(villageCache.has(k)) return villageCache.get(k);
  let v=null;
  if(hash2(cx*13+77, cz*17-77)<0.055) v={x:cx*16+8, z:cz*16+8};
  villageCache.set(k,v);
  return v;
}
const pyramidCache = new Map();
export function pyramidAt(cx,cz){
  const k=cx+','+cz;
  if(pyramidCache.has(k)) return pyramidCache.get(k);
  let p=null;
  if(hash2(cx*7+555, cz*11-555)<0.05) p={x:cx*16+8, z:cz*16+8};
  pyramidCache.set(k,p);
  return p;
}
export function computeStronghold(){
  const a = hash2(G.SEED,777)*Math.PI*2;
  const d = 120 + hash2(G.SEED,778)*70;
  G.strongholdPos = { x:Math.round(Math.cos(a)*d), y:18, z:Math.round(Math.sin(a)*d) };
}

function setInChunk(data,cx,cz,wx,wy,wz,b,soft){
  if(wy<0||wy>=CY) return;
  if((wx>>4)!==cx || (wz>>4)!==cz) return;
  const i = (wy*16+(wz&15))*16+(wx&15);
  if(soft && data[i]!==B.AIR) return;
  data[i]=b;
}

function placeTree(data,cx,cz,wx,wy,wz,type){
  const rng = mulberry32((wx*341873128 + wz*132897987) ^ G.SEED);
  if(type==='spruce'){
    const th = 7+Math.floor(rng()*4);
    for(let ly=wy+2; ly<=wy+th; ly++){
      const fromTop = wy+th-ly;
      const rr = fromTop===0?0:fromTop===1?0:1+((fromTop%3)===0?1:0);
      for(let dx=-rr;dx<=rr;dx++) for(let dz=-rr;dz<=rr;dz++){
        if(dx===0&&dz===0&&ly<=wy+th-1) continue;
        setInChunk(data,cx,cz,wx+dx,ly,wz+dz,B.SPRUCE_LEAVES,true);
      }
    }
    setInChunk(data,cx,cz,wx,wy+th+1,wz,B.SPRUCE_LEAVES,true);
    for(let i=1;i<=th;i++) setInChunk(data,cx,cz,wx,wy+i,wz,B.SPRUCE_LOG,false);
    return;
  }
  if(type==='birch'){
    const th = 5+Math.floor(rng()*3);
    for(let ly=wy+th-2; ly<=wy+th+1; ly++){
      const top = ly>=wy+th;
      const r = top?1:2;
      for(let dx=-r;dx<=r;dx++) for(let dz=-r;dz<=r;dz++){
        if(!top && dx===0 && dz===0) continue;
        if(ly===wy+th+1 && Math.abs(dx)+Math.abs(dz)>1) continue;
        if(Math.abs(dx)===r && Math.abs(dz)===r && rng()<0.5) continue;
        setInChunk(data,cx,cz,wx+dx,ly,wz+dz,B.BIRCH_LEAVES,true);
      }
    }
    for(let i=1;i<=th;i++) setInChunk(data,cx,cz,wx,wy+i,wz,B.BIRCH_LOG,false);
    return;
  }
  if(type==='acacia'){
    const bend = rng()<0.5?1:-1;
    for(let i=1;i<=2;i++) setInChunk(data,cx,cz,wx,wy+i,wz,B.ACACIA_LOG,false);
    setInChunk(data,cx,cz,wx+bend,wy+3,wz,B.ACACIA_LOG,false);
    setInChunk(data,cx,cz,wx+bend*2,wy+4,wz,B.ACACIA_LOG,false);
    for(let dx=-2;dx<=2;dx++) for(let dz=-2;dz<=2;dz++){
      if(Math.abs(dx)===2&&Math.abs(dz)===2&&rng()<0.6) continue;
      setInChunk(data,cx,cz,wx+bend*2+dx,wy+5,wz+dz,B.ACACIA_LEAVES,true);
      if(Math.abs(dx)+Math.abs(dz)<=1) setInChunk(data,cx,cz,wx+bend*2+dx,wy+6,wz+dz,B.ACACIA_LEAVES,true);
    }
    return;
  }
  const th = 4 + Math.floor(rng()*3);
  for(let ly=wy+th-2; ly<=wy+th+1; ly++){
    const top = ly>=wy+th;
    const r = top?1:2;
    for(let dx=-r;dx<=r;dx++) for(let dz=-r;dz<=r;dz++){
      if(!top && dx===0 && dz===0) continue;
      if(ly===wy+th+1 && Math.abs(dx)+Math.abs(dz)>1) continue;
      if(Math.abs(dx)===r && Math.abs(dz)===r && rng()<0.5) continue;
      setInChunk(data,cx,cz,wx+dx,ly,wz+dz,B.LEAVES,true);
    }
  }
  for(let i=1;i<=th;i++) setInChunk(data,cx,cz,wx,wy+i,wz,B.LOG,false);
}

export function genChunkOver(cx,cz){
  const data = new Uint8Array(16*CY*16);
  const heights=[]; const biomes=[];
  for(let x=0;x<16;x++){ heights[x]=[]; biomes[x]=[];
    for(let z=0;z<16;z++){
      const wx=cx*16+x, wz=cz*16+z;
      heights[x][z]=terrainHeight(wx,wz);
      biomes[x][z]=biomeAt(wx,wz);
    }
  }
  const biomeHere = biomes[8][8];
  for(let x=0;x<16;x++) for(let z=0;z<16;z++){
    const wx=cx*16+x, wz=cz*16+z;
    const h = heights[x][z];
    const biome = biomes[x][z];
    const canCarve = h > SEA+1;
    const canyonBottom = canyonColumn(wx, wz, h);
    const geode = geodeAt(wx,wz);
    const topBlock = biome==='desert'?B.SAND : biome==='mesa'?B.RED_SAND
                   : biome==='snowy_peaks'?B.SNOW
                   : h<=SEA+1?B.SAND : B.GRASS;
    const subBlock = biome==='desert'||biome==='mesa' ? (biome==='mesa'?B.TERRACOTTA:B.SAND)
                   : h<=SEA+1?B.SAND : B.DIRT;
    for(let y=0;y<=h;y++){
      let b;
      if(y===0) b=B.BEDROCK;
      else if(y<h-4) b=B.STONE;
      else if(y<h) b = subBlock;
      else b = topBlock;
      if(biome==='mesa' && y>h-14 && y<h){
        const layer = Math.abs(Math.sin(y*0.9+Math.floor(wx/16)*3));
        b = layer>0.72?B.TERRACOTTA_ORANGE : layer>0.45?B.TERRACOTTA_YELLOW : B.TERRACOTTA;
      }
      if(geode){
        const gd=geode;
        const d3=Math.hypot(wx-gd.x, y-gd.y, wz-gd.z);
        if(d3<gd.r*1.5 && y<h-4){
          b = d3<gd.r*0.7 ? B.AIR : (d3<gd.r ? B.AMETHYST : B.CALCITE);
        }
      }
      if(b!==B.BEDROCK && canCarve && ((canyonBottom && y>=canyonBottom) || isCave(wx,y,wz,h))){
        data[(y*16+z)*16+x] = (y<=10 ? B.LAVA : B.AIR);
        continue;
      }
      if(b===B.STONE){
        if(y<52  && oreVein(wx,y,wz,101,0.10,  1.25)) b=B.COAL_ORE;
        else if(y<30 && oreVein(wx,y,wz,202,0.06,  1.10)) b=B.IRON_ORE;
        else if(y<15 && oreVein(wx,y,wz,303,0.028, 1.00)) b=B.DIAMOND_ORE;
        else if(y<12 && oreVein(wx,y,wz,404,0.03,  1.05)) b=B.OBSIDIAN;
        else if(y<40 && oreVein(wx,y,wz,505,0.02, 1.0)) b=B.GRAVEL;
      }
      data[(y*16+z)*16+x]=b;
    }
    for(let y=h+1;y<=SEA;y++) data[(y*16+z)*16+x]=B.WATER;
    if(biome==='swamp' && h<=SEA && h>0 && data[(h*16+z)*16+x]!==B.WATER) data[(h*16+z)*16+x]=B.CLAY;
  }
  const treeInfo = BIOME_TREE[biomeHere];
  if(treeInfo){
    for(let dx=0;dx<16;dx++) for(let dz=0;dz<16;dz++){
      const wx=cx*16+dx, wz=cz*16+dz;
      const h=heights[dx][dz];
      const info=BIOME_TREE[biomes[dx][dz]];
      if(!info) continue;
      if(h<=SEA+1||h>=CY-14) continue;
      if(data[(h*16+dz)*16+dx]!==B.GRASS) continue;
      if(hash2s(wx,wz,11)<info.dens) placeTree(data,cx,cz,wx,h,wz,info.type);
    }
  }
  const vil = villageAt(cx,cz);
  if(vil && !['desert','mesa','snowy_peaks'].includes(biomeHere)){
    const vx=vil.x, vz=vil.z;
    const vh=terrainHeight(vx,vz);
    if(vh>SEA+1 && vh<CY-10){
      for(let dx=-2;dx<=2;dx++) for(let dz=-2;dz<=2;dz++) for(let dy=0;dy<4;dy++){
        const wx=vx+dx, wz=vz+dz, wy=vh+dy;
        const wall = (Math.abs(dx)===2||Math.abs(dz)===2||dy===0||dy===3);
        const isDoor = (dz===-2 && dx===0 && dy===1);
        const isWindow = (Math.abs(dx)===2 && dz===0 && dy===1);
        setInChunk(data,cx,cz,wx,wy,wz,
          isDoor?B.AIR : isWindow?B.GLASS : wall?B.PLANKS : B.AIR, false);
      }
      setInChunk(data,cx,cz,vx-1,vh+3,vz,B.COBBLE,false);
      setInChunk(data,cx,cz,vx+1,vh+3,vz,B.COBBLE,false);
      setInChunk(data,cx,cz,vx,vh+3,vz-1,B.CRAFT,false);
    }
  }
  const pyr = pyramidAt(cx,cz);
  if(pyr && biomeHere==='desert'){
    const px=pyr.x, pz=pyr.z;
    const ph=terrainHeight(px,pz);
    if(ph>SEA+1 && ph<CY-14){
      for(let lvl=0; lvl<7; lvl++){
        const rr=7-lvl;
        for(let dx=-rr;dx<=rr;dx++) for(let dz=-rr;dz<=rr;dz++)
          setInChunk(data,cx,cz,px+dx,ph+1+lvl,pz+dz,
            (lvl%2===0)?B.TERRACOTTA_YELLOW:B.SMOOTH_STONE,false);
      }
      for(let dx=-1;dx<=1;dx++) for(let dz=-1;dz<=1;dz++) for(let dy=0;dy<2;dy++)
        setInChunk(data,cx,cz,px+dx,ph+1,pz+dz,B.AIR,false);
      setInChunk(data,cx,cz,px,ph+1,pz,B.CHEST,false);
      for(let dx=-1;dx<=1;dx++) for(let dz=-1;dz<=1;dz++)
        setInChunk(data,cx,cz,px+dx,ph,pz+dz,B.LAVA,false);
    }
  }
  if(G.strongholdPos){
    const s=G.strongholdPos;
    const x0=s.x-5, x1=s.x+5, z0=s.z-5, z1=s.z+5, y0=s.y-1, y1=s.y+4;
    const bx0=cx*16, bx1=cx*16+15, bz0=cz*16, bz1=cz*16+15;
    if(x1>=bx0 && x0<=bx1 && z1>=bz0 && z0<=bz1){
      for(let wx=Math.max(x0,bx0); wx<=Math.min(x1,bx1); wx++)
        for(let wz=Math.max(z0,bz0); wz<=Math.min(z1,bz1); wz++)
          for(let y=Math.max(y0,0); y<=Math.min(y1,CY-1); y++){
            const onWall = (wx===x0||wx===x1||wz===z0||wz===z1||y===y0||y===y1);
            data[(y*16+(wz&15))*16+(wx&15)] = onWall ? B.MOSSY_COBBLE : B.AIR;
          }
      for(const [dx,dz] of RING){
        const wx=s.x+dx, wz=s.z+dz;
        if(wx>=bx0&&wx<=bx1&&wz>=bz0&&wz<=bz1){
          data[(s.y*16+(wz&15))*16+(wx&15)] =
            hash2s(wx,wz,55)<0.25 ? B.END_FRAME_EYE : B.END_FRAME;
        }
      }
    }
  }
  let maxY=0;
  for(let y=CY-1;y>=0;y--){ let any=false;
    for(let i=0;i<256;i++) if(data[y*256+i]){ any=true; break; }
    if(any){ maxY=y; break; }
  }
  return {cx,cz,data,maxY,mesh:null,water:null,built:false};
}

const PILLARS = [];
for(let k=0;k<6;k++){
  const a=k/6*Math.PI*2;
  PILLARS.push({x:Math.round(Math.cos(a)*14), z:Math.round(Math.sin(a)*14), h:34+((k*7)%6)});
}
export { PILLARS };
export function genChunkNether(cx,cz){
  const data = new Uint8Array(16*CY*16);
  for(let x=0;x<16;x++) for(let z=0;z<16;z++){
    const wx=cx*16+x, wz=cz*16+z;
    let fh = 12 + fbm(wx*0.02+400, wz*0.02-400, 3)*14;
    const pillar = fbm(wx*0.05-900, wz*0.05+900, 2);
    if(pillar>0.62) fh += (pillar-0.62)*70;
    fh = clamp(Math.floor(fh), 8, 42);
    for(let y=0;y<CY;y++){
      let b;
      if(y===0 || y===CY-1) b=B.BEDROCK;
      else if(y<=fh || y>=58) b=B.NETHERRACK;
      else b=B.AIR;
      if(b===B.AIR && y<=12) b=B.LAVA;
      if(b===B.NETHERRACK && y===57 && vnoise3(wx*0.2, 57, wz*0.2)>0.865) b=B.GLOWSTONE;
      data[(y*16+z)*16+x]=b;
    }
  }
  return {cx,cz,data,maxY:CY-1,mesh:null,water:null,built:false};
}
export function genChunkEnd(cx,cz){
  const data = new Uint8Array(16*CY*16);
  for(let x=0;x<16;x++) for(let z=0;z<16;z++){
    const wx=cx*16+x, wz=cz*16+z;
    const r=Math.hypot(wx,wz);
    if(r<30){
      const top = 36 + Math.round(fbm(wx*0.06,wz*0.06,2)*3-1);
      const bot = 36 - Math.round((30-r)*0.55);
      for(let y=Math.max(1,bot); y<=top; y++) data[(y*16+z)*16+x]=B.END_STONE;
      if(r<=1.5) for(let y=top+1;y<=49;y++) data[(y*16+z)*16+x]=B.OBSIDIAN;
      for(const p of PILLARS){
        if(Math.hypot(wx-p.x,wz-p.z)<2.2)
          for(let y=top+1;y<=p.h;y++) data[(y*16+z)*16+x]=B.OBSIDIAN;
      }
    }
  }
  let maxY=0;
  for(let y=CY-1;y>=0;y--){ let any=false;
    for(let i=0;i<256;i++) if(data[y*256+i]){ any=true; break; }
    if(any){ maxY=y; break; }
  }
  return {cx,cz,data,maxY,mesh:null,water:null,built:false};
}
