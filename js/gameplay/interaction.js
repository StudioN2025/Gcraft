import * as THREE from 'three';
import { G } from '../core/state.js';
import { B, IT, ITEMS, SOLID, NEIGH, HARDNESS, DROPS, PICKS, AXES, PICK_TIER, ORE_TIER, RING,
         nameOf, isBlockItem, isTool } from '../data/blocks.js';
import { camera, scene, sfx, crackMesh, crackMat, crackTexs, hl } from '../engine/renderer.js';
import { ICONC } from '../engine/atlas.js';
import { getBlock, setBlockWorld, surfaceYAt, portalsReg } from '../world/world.js';
import { spawnParticles, spawnBreakParticles } from '../world/particles.js';
import { spawnDrop, addItem } from './drops.js';
import { renderHotbar, showToast } from '../ui/hud.js';
import { openInventory, openFurnace, openChest, closeInventory, furnaces, chests,
         furnKeyCur, chestKeyCur, renderInvUI } from './inventory.js';
import { pickMob, tryAttack, spawnDragon, isDragonDead } from '../entities/mobs.js';
import { setDimension } from '../world/world.js';
import { vibrate } from '../core/utils.js';

const _dir=new THREE.Vector3();
function ddaRay(maxDist, wantFluid){
  const o=camera.position, d=camera.getWorldDirection(_dir);
  let x=Math.floor(o.x), y=Math.floor(o.y), z=Math.floor(o.z);
  const sx=d.x>=0?1:-1, sy=d.y>=0?1:-1, sz=d.z>=0?1:-1;
  const ax=Math.abs(d.x), ay=Math.abs(d.y), az=Math.abs(d.z);
  const tdx=ax>1e-9?1/ax:Infinity, tdy=ay>1e-9?1/ay:Infinity, tdz=az>1e-9?1/az:Infinity;
  let tmx=ax>1e-9?(sx>0?(x+1-o.x):(o.x-x))*tdx:Infinity;
  let tmy=ay>1e-9?(sy>0?(y+1-o.y):(o.y-y))*tdy:Infinity;
  let tmz=az>1e-9?(sz>0?(z+1-o.z):(o.z-z))*tdz:Infinity;
  let fx=0,fy=0,fz=0;
  for(let i=0;i<80;i++){
    const b=getBlock(x,y,z);
    if(wantFluid){
      if(b===B.WATER || b===B.LAVA) return {x,y,z,b,fx,fy,fz};
      if(b!==B.AIR) return null;
    } else {
      if(b!==B.AIR && b!==B.WATER && b!==B.LAVA) return {x,y,z,b,fx,fy,fz};
    }
    if(tmx<tmy && tmx<tmz){ if(tmx>maxDist)break; x+=sx; tmx+=tdx; fx=-sx;fy=0;fz=0; }
    else if(tmy<tmz)       { if(tmy>maxDist)break; y+=sy; tmy+=tdy; fx=0;fy=-sy;fz=0; }
    else                   { if(tmz>maxDist)break; z+=sz; tmz+=tdz; fx=0;fy=0;fz=-sz; }
  }
  return null;
}
export function raycastBlock(maxDist=6){ return ddaRay(maxDist,false); }
export function raycastFluid(maxDist=4.6){ return ddaRay(maxDist,true); }
export function reachNow(){ return G.game.mode==='survival' ? 4.6 : 6; }
function boxIntersectsPlayer(bx,by,bz){
  const p=G.player.pos;
  return bx<p.x+0.3 && bx+1>p.x-0.3 && by<p.y+1.8 && by+1>p.y && bz<p.z+0.3 && bz+1>p.z-0.3;
}
function pickTierOf(){
  const it=G.inv[G.slot];
  if(it && isTool(it.id)){
    const tl=ITEMS[it.id].tool;
    if(tl.type==='pick') return PICK_TIER[it.id]||0;
  }
  return 0;
}
function canHarvest(b){
  const need=ORE_TIER[b]||0;
  return need===0 || pickTierOf()>=need;
}
function miningTime(b){
  let t=HARDNESS[b]!==undefined?HARDNESS[b]:1;
  const it=G.inv[G.slot];
  if(it && isTool(it.id)){
    const tl=ITEMS[it.id].tool;
    if(tl.type==='pick' && PICKS.has(b) && (ORE_TIER[b]||0)<=(PICK_TIER[it.id]||0)) t/=tl.mult;
    else if(tl.type==='axe' && AXES.has(b)) t/=tl.mult;
  }
  return t;
}
export function attackDmgOf(){
  const it=G.inv[G.slot];
  if(it && isTool(it.id) && ITEMS[it.id].tool.dmg) return ITEMS[it.id].tool.dmg;
  return 1;
}
const posKey = (x,y,z)=> x+','+y+','+z;
export { posKey };
export function breakBlock(x,y,z,b){
  if(b===B.FURNACE){
    const f=furnaces.get(posKey(x,y,z));
    if(f){
      for(const s of [f.inp,f.fuel,f.out]) if(s) spawnDrop(s.id,s.count, x+0.5,y+0.5,z+0.5);
      furnaces.delete(posKey(x,y,z));
      if(G.uiMode==='furnace' && furnKeyCur===posKey(x,y,z)) closeInventory(true);
    }
  }
  if(b===B.CHEST){
    const arr=chests.get(posKey(x,y,z));
    if(arr){
      for(const s of arr) if(s) spawnDrop(s.id,s.count===Infinity?1:s.count, x+0.5,y+0.5,z+0.5);
      chests.delete(posKey(x,y,z));
      if(G.uiMode==='chest' && chestKeyCur===posKey(x,y,z)) closeInventory(true);
    }
  }
  let nb=B.AIR;
  for(const [dx,dy,dz] of NEIGH){
    const n=getBlock(x+dx,y+dy,z+dz);
    if(n===B.WATER||n===B.LAVA){ nb=n; break; }
  }
  setBlockWorld(x,y,z,nb);
  spawnBreakParticles(x,y,z,b);
  sfx('break');
  vibrate(25);
  if(G.game.mode==='survival'){
    let dropId;
    if(b===B.LEAVES||b===B.BIRCH_LEAVES||b===B.SPRUCE_LEAVES||b===B.ACACIA_LEAVES)
      dropId = Math.random()<0.08 ? IT.APPLE : -1;
    else if(b===B.GLASS) dropId = -1;
    else if(!canHarvest(b)) dropId = -1;
    else dropId = DROPS[b]!==undefined ? DROPS[b] : b;
    if(dropId>=0 && addItem(dropId,1)) sfx('pop');
    const held=G.inv[G.slot];
    if(held && isTool(held.id)){
      held.dur--;
      if(held.dur<=0){ G.inv[G.slot]=null; showToast(nameOf(held.id)+' сломался!'); sfx('break'); }
      renderHotbar();
    }
  }
}
function checkWin(){
  if(G.winShown) return;
  const has=id=>G.inv.some(it=>it&&it.id===id);
  if(has(IT.DIAMOND_PICK)&&has(IT.DIAMOND_SWORD)&&has(IT.DIAMOND_AXE)){
    G.winShown=true;
    showToast('★ Алмазный сет! Теперь обсидиан → Ад → дракон!');
  }
}
function placeFluid(x,y,z,fluid){
  if(fluid===B.LAVA){
    let touching=false;
    for(const [dx,dy,dz] of NEIGH)
      if(getBlock(x+dx,y+dy,z+dz)===B.WATER){ touching=true; break; }
    if(touching){
      setBlockWorld(x,y,z,B.OBSIDIAN);
      sfx('fizz'); spawnParticles(x,y,z,[90,60,140],8);
      showToast('Лава + вода = обсидиан!');
      return;
    }
    setBlockWorld(x,y,z,B.LAVA);
  } else {
    setBlockWorld(x,y,z,B.WATER);
    for(const [dx,dy,dz] of NEIGH)
      if(getBlock(x+dx,y+dy,z+dz)===B.LAVA){
        setBlockWorld(x+dx,y+dy,z+dz,B.OBSIDIAN);
        sfx('fizz'); spawnParticles(x+dx,y+dy,z+dz,[90,60,140],8);
      }
  }
}
function tryIgnitePortal(x,y,z){
  if(getBlock(x,y,z)!==B.AIR) return false;
  for(const axis of ['x','z']){
    let by=y, g=0;
    while(by>1 && getBlock(x,by-1,z)===B.AIR && g++<4) by--;
    if(getBlock(x,by-1,z)!==B.OBSIDIAN) continue;
    let lx=x, lz=z;
    for(let i=0;i<3;i++){
      const nb = axis==='x'?getBlock(lx-1,by,lz):getBlock(lx,by,lz-1);
      if(nb!==B.AIR) break;
      if(axis==='x') lx--; else lz--;
    }
    const left = axis==='x'?getBlock(lx-1,by,lz):getBlock(lx,by,lz-1);
    if(left!==B.OBSIDIAN) continue;
    const pos=(i,j)=> axis==='x' ? [lx+i,by+j,lz] : [lx,by+j,lz+i];
    for(const w of [2,3]) for(const h of [3,4]){
      let ok=true;
      for(let i=0;i<w&&ok;i++) for(let j=0;j<h&&ok;j++){
        const [px,py,pz]=pos(i,j);
        if(getBlock(px,py,pz)!==B.AIR) ok=false;
      }
      for(let i=0;i<w&&ok;i++){
        if(getBlock(...pos(i,-1))!==B.OBSIDIAN) ok=false;
        if(getBlock(...pos(i,h))!==B.OBSIDIAN) ok=false;
      }
      for(let j=0;j<h&&ok;j++){
        if(getBlock(...pos(-1,j))!==B.OBSIDIAN) ok=false;
        if(getBlock(...pos(w,j))!==B.OBSIDIAN) ok=false;
      }
      if(ok){
        for(let i=0;i<w;i++) for(let j=0;j<h;j++){
          const [px,py,pz]=pos(i,j);
          setBlockWorld(px,py,pz,B.PORTAL);
        }
        portalsReg[G.dim].push({x:lx,y:by,z:lz});
        sfx('portal');
        showToast(G.dim===0?'Портал в Ад открыт! Шагни внутрь':'Портал домой открыт!');
        return true;
      }
    }
  }
  return false;
}
function buildPortalFrame(ix,iy,iz){
  const set=(x,y,z,b)=>setBlockWorld(x,y,z,b);
  for(let i=-1;i<=2;i++){
    set(ix+i,iy-1,iz,B.OBSIDIAN);
    set(ix+i,iy+3,iz,B.OBSIDIAN);
  }
  for(let j=0;j<3;j++){
    set(ix-1,iy+j,iz,B.OBSIDIAN);
    set(ix+2,iy+j,iz,B.OBSIDIAN);
    for(let i=0;i<2;i++) set(ix+i,iy+j,iz,B.PORTAL);
  }
  const NON_SOLID=new Set([B.AIR,B.LEAVES,B.WATER,B.GLASS,B.PORTAL,B.LAVA]);
  for(let dx=-2;dx<=3;dx++) for(let dy=0;dy<4;dy++) for(let dz=-1;dz<=1;dz++){
    if(dz===0 && dx>=-1 && dx<=2) continue;
    const b=getBlock(ix+dx,iy+dy,iz+dz);
    if(!NON_SOLID.has(b)) set(ix+dx,iy+dy,iz+dz,B.AIR);
  }
}
export function ensurePortalAt(d, wx, wz){
  const list=portalsReg[d];
  let best=null, bd=1e9;
  for(const p of list){
    const dd=Math.hypot(p.x-wx,p.z-wz);
    if(dd<bd){ bd=dd; best=p; }
  }
  if(best && bd<96) return best;
  let ix=wx, iy=16, iz=wz, found=false;
  if(d===1){
    outer1:
    for(let r=0;r<14 && !found;r++){
      const steps=Math.max(1,r*6);
      for(let a=0;a<steps;a++){
        const ang=a/steps*Math.PI*2;
        const x=Math.round(wx+Math.cos(ang)*r), z=Math.round(wz+Math.sin(ang)*r);
        for(let y=38;y>=15;y--){
          if(getBlock(x,y,z)===B.NETHERRACK && getBlock(x,y+1,z)===B.AIR
             && getBlock(x,y+2,z)===B.AIR && getBlock(x,y+3,z)===B.AIR){
            ix=x; iy=y+1; iz=z; found=true; break outer1;
          }
        }
      }
    }
    if(!found){
      ix=wx; iz=wz; iy=15;
      for(let dx=-2;dx<=3;dx++) for(let dz=-1;dz<=1;dz++){
        setBlockWorld(ix+dx,14,iz+dz,B.NETHERRACK);
        for(let dy=0;dy<5;dy++) setBlockWorld(ix+dx,15+dy,iz+dz,B.AIR);
      }
    }
  } else {
    outer0:
    for(let r=0;r<16 && !found;r++){
      const steps=Math.max(1,r*6);
      for(let a=0;a<steps;a++){
        const ang=a/steps*Math.PI*2;
        const x=Math.round(wx+Math.cos(ang)*r), z=Math.round(wz+Math.sin(ang)*r);
        const sy=surfaceYAt(x,z);
        if(getBlock(x,sy-1,z)!==B.WATER && sy<58){
          ix=x; iy=sy; iz=z; found=true; break outer0;
        }
      }
    }
    if(!found){ iy=surfaceYAt(wx,wz); }
  }
  buildPortalFrame(ix,iy,iz);
  const p={x:ix,y:iy,z:iz};
  list.push(p);
  return p;
}
export function travelPortal(){
  const to = G.dim===0 ? 1 : 0;
  const wx=Math.round(G.player.pos.x), wz=Math.round(G.player.pos.z);
  setDimension(to);
  const spot=ensurePortalAt(to, wx, wz);
  G.player.pos.set(spot.x+1, spot.y, spot.z+0.5);
  G.portalCd=4; G.portalTimer=0;
  sfx('portal');
  showToast(to===1?'Добро пожаловать в Ад... Ищи ифритов!':'Ты вернулся домой');
}
export function toEnd(){
  if(G.portalCd>0) return;
  setDimension(2);
  import('../world/world.js').then(({getChunk})=>{
    for(let dx=-3;dx<=3;dx++) for(let dz=-3;dz<=3;dz++) getChunk(dx,dz);
    import('../engine/meshing.js').then(({buildChunk})=>{
      for(let dx=-2;dx<=2;dx++) for(let dz=-2;dz<=2;dz++){
        const c=getBlock(0,0,0)!==null ? null : null;
      }
      buildEndSpawn(getChunk, buildChunk);
    });
  });
  function buildEndSpawn(getChunk, buildChunk){
    import('../world/world.js').then(({surfaceYAt: sYAt})=>{
      const ty=sYAt(0,0);
      G.player.pos.set(0.5, ty, 0.5);
      G.portalCd=4;
      sfx('portal');
      showToast('Энд-мир. Дракон Края ждёт...');
      if(!isDragonDead()) spawnDragon();
    });
  }
}
export function exitEnd(){
  if(G.portalCd>0) return;
  setDimension(0);
  G.player.pos.set(G.spawnPos.x, G.spawnPos.y, G.spawnPos.z);
  G.portalCd=4;
  sfx('portal');
  showToast('Возвращение в обычный мир. Спасибо за игру!');
}
export function doPlace(force=false){
  const held=G.inv[G.slot];
  if(held && ITEMS[held.id] && ITEMS[held.id].food){
    if(G.game.mode!=='survival'){ showToast('Еда не нужна в творческом'); return; }
    if(G.player.hunger>19.5){ showToast('Ты не голоден'); return; }
    window._addHunger(ITEMS[held.id].food);
    showToast('Ням! +'+ITEMS[held.id].food+' сытости');
    held.count--;
    if(held.count<=0) G.inv[G.slot]=null;
    renderHotbar();
    sfx('eat'); vibrate(30);
    return;
  }
  if(held && held.id===IT.BUCKET_WATER){
    const hit=raycastBlock(reachNow());
    if(hit){
      const nx=hit.x+hit.fx, ny=hit.y+hit.fy, nz=hit.z+hit.fz;
      if(getBlock(nx,ny,nz)===B.AIR){
        placeFluid(nx,ny,nz,B.WATER);
        sfx('splash');
        if(G.game.mode==='survival'){ G.inv[G.slot]={id:IT.BUCKET,count:1}; renderHotbar(); }
      }
    }
    return;
  }
  if(held && held.id===IT.BUCKET_LAVA){
    const hit=raycastBlock(reachNow());
    if(hit){
      const nx=hit.x+hit.fx, ny=hit.y+hit.fy, nz=hit.z+hit.fz;
      if(getBlock(nx,ny,nz)===B.AIR){
        placeFluid(nx,ny,nz,B.LAVA);
        sfx('splash');
        if(G.game.mode==='survival'){ G.inv[G.slot]={id:IT.BUCKET,count:1}; renderHotbar(); }
      }
    }
    return;
  }
  if(held && held.id===IT.BUCKET){
    const w=raycastFluid(reachNow());
    if(w){
      setBlockWorld(w.x,w.y,w.z,B.AIR);
      sfx('splash');
      if(G.game.mode==='survival'){
        G.inv[G.slot]={id: w.b===B.LAVA?IT.BUCKET_LAVA:IT.BUCKET_WATER, count:1};
        renderHotbar();
      }
      showToast(w.b===B.LAVA?'Лава набрана!':w.b===B.WATER?'Вода набрана':'');
    } else showToast('Наведись на жидкость поближе');
    return;
  }
  if(held && held.id===IT.FLINT_STEEL){
    const hit=raycastBlock(reachNow());
    if(hit){
      const nx=hit.x+hit.fx, ny=hit.y+hit.fy, nz=hit.z+hit.fz;
      if(!tryIgnitePortal(nx,ny,nz)) showToast('Нужна рамка из обсидиана (внутри 2×3)');
      else if(G.game.mode==='survival'){
        held.dur--;
        if(held.dur<=0){ G.inv[G.slot]=null; showToast('Огниво сгорело'); }
        renderHotbar();
      }
    }
    return;
  }
  if(held && held.id===IT.ENDER_EYE){
    const hit=raycastBlock(reachNow());
    if(hit && hit.b===B.END_FRAME){
      setBlockWorld(hit.x,hit.y,hit.z,B.END_FRAME_EYE);
      sfx('place'); vibrate(20);
      if(G.game.mode==='survival'){ held.count--; if(held.count<=0) G.inv[G.slot]=null; renderHotbar(); }
      checkEndPortalComplete();
      return;
    }
    if(G.dim===2){ showToast('Ты уже в Энд-мире'); return; }
    useEye();
    if(G.game.mode==='survival'){ held.count--; if(held.count<=0) G.inv[G.slot]=null; renderHotbar(); }
    return;
  }
  if(held && held.id===IT.ENDER_PEARL){
    if(G.game.mode!=='survival'){ showToast('Жемчуг работает только в выживании'); return; }
    const hit=raycastBlock(18);
    if(hit){
      const tx=hit.x+hit.fx+0.5, ty=hit.y+hit.fy, tz=hit.z+hit.fz+0.5;
      spawnParticles(G.player.pos.x-0.5,G.player.pos.y,G.player.pos.z-0.5,[80,220,160],10,2);
      G.player.pos.set(tx,ty,tz);
      G.player.vel.set(0,0,0);
      spawnParticles(tx-0.5,ty,tz-0.5,[80,220,160],10,2);
      window._damage(2,'телепорт жемчугом');
      sfx('tp'); vibrate(30);
      held.count--;
      if(held.count<=0) G.inv[G.slot]=null;
      renderHotbar();
    } else showToast('Слишком далеко');
    return;
  }
  const hit=raycastBlock(reachNow());
  if(!hit) return;
  if(hit.b===B.CRAFT && !force){ openInventory(3); return; }
  if(hit.b===B.FURNACE && !force){ openFurnace(posKey(hit.x,hit.y,hit.z)); return; }
  if(hit.b===B.CHEST && !force){ openChest(posKey(hit.x,hit.y,hit.z)); return; }
  const nx=hit.x+hit.fx, ny=hit.y+hit.fy, nz=hit.z+hit.fz;
  if(ny<1||ny>=72) return;
  const cur=getBlock(nx,ny,nz);
  if(cur!==B.AIR && cur!==B.WATER && cur!==B.LAVA) return;
  if(boxIntersectsPlayer(nx,ny,nz)) return;
  if(!held){ showToast('Пусто — добудь блоки'); return; }
  if(!isBlockItem(held.id)){ showToast(nameOf(held.id)+' нельзя поставить'); return; }
  if(held.id===B.LAVA) placeFluid(nx,ny,nz,B.LAVA);
  else setBlockWorld(nx,ny,nz,held.id);
  sfx('place');
  vibrate(15);
  if(G.game.mode==='survival'){
    held.count--;
    if(held.count<=0) G.inv[G.slot]=null;
    renderHotbar();
  }
}
const eyeFx=[];
export function clearEyeFx(){ for(const e of eyeFx) scene.remove(e.sp); eyeFx.length=0; }
export function updateEyeFx(dt){
  for(let i=eyeFx.length-1;i>=0;i--){
    const e=eyeFx[i];
    e.age+=dt;
    e.vy-=3*dt;
    e.sp.position.x+=e.vx*dt; e.sp.position.y+=e.vy*dt; e.sp.position.z+=e.vz*dt;
    e.sp.material.rotation+=dt*4;
    if(e.age>1.5){
      spawnParticles(e.sp.position.x-0.5,e.sp.position.y-0.5,e.sp.position.z-0.5,[80,220,160],8,2);
      scene.remove(e.sp); eyeFx.splice(i,1);
    }
  }
}
function useEye(){
  if(!G.strongholdPos) return;
  const dx=G.strongholdPos.x-G.player.pos.x, dz=G.strongholdPos.z-G.player.pos.z;
  const dist=Math.hypot(dx,dz);
  const l=Math.hypot(dx,dz)||1;
  const dirs=['север','северо-восток','восток','юго-восток','юг','юго-запад','запад','северо-запад'];
  const ang=Math.atan2(dx,-dz);
  const idx=Math.round(((ang%(Math.PI*2))+Math.PI*2)%(Math.PI*2)/(Math.PI/4))%8;
  showToast(dist<24
    ? 'Око дрожит — крепость прямо под тобой! Копай вниз!'
    : `Око летит на ${dirs[idx]}, ~${Math.max(5,Math.round(dist/5)*5)} м`);
  sfx('tp');
  const s=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(ICONC[IT.ENDER_EYE]), transparent:true}));
  s.scale.set(0.5,0.5,0.42);
  const d=camera.getWorldDirection(_dir);
  s.position.copy(camera.position).addScaledVector(d,0.6);
  scene.add(s);
  eyeFx.push({sp:s, vx:dx/l*6, vy:2.2, vz:dz/l*6, age:0});
}
function checkEndPortalComplete(){
  const c=G.strongholdPos;
  if(!c) return;
  for(const [dx,dz] of RING)
    if(getBlock(c.x+dx,c.y,c.z+dz)!==B.END_FRAME_EYE) return;
  for(let dx=-1;dx<=1;dx++) for(let dz=-1;dz<=1;dz++)
    setBlockWorld(c.x+dx,c.y,c.z+dz,B.END_PORTAL);
  showToast('★ Портал в Энд активирован! Прыгай!');
  sfx('portal');
}
const mine={active:false,x:0,y:0,z:0,progress:0,hitT:0};
export function updateInteraction(t,dt){
  const mobHit=pickMob();
  const hit = mobHit ? null : raycastBlock(reachNow());
  if(hit){
    hl.visible=true;
    hl.position.set(hit.x+0.5,hit.y+0.5,hit.z+0.5);
    hl.material.opacity=0.4+0.2*Math.sin(t*6);
  } else hl.visible=false;
  const mouseHeld = G.fallback ? (G.drag.down && !G.drag.moved && G.drag.btn===0) : G.mouseBtn[0];
  const touchHeld = G.touchLook.id!==null && G.touchLook.mining && !G.touchLook.moved;
  const held = mouseHeld || touchHeld;
  if(mobHit){
    crackMesh.visible=false; mine.active=false;
    if(held && t-G.lastAtk>0.45) tryAttack(mobHit, t);
    return;
  }
  if(G.game.mode==='creative'){
    crackMesh.visible=false; mine.active=false;
    if(held && hit && t-G.lastMine>=0.24){ G.lastMine=t; breakBlock(hit.x,hit.y,hit.z,hit.b); }
  } else {
    if(held && hit && isFinite(HARDNESS[hit.b])){
      if(!mine.active || mine.x!==hit.x || mine.y!==hit.y || mine.z!==hit.z){
        mine.active=true; mine.x=hit.x; mine.y=hit.y; mine.z=hit.z;
        mine.progress=0; mine.hitT=0;
      }
      mine.progress += dt/miningTime(hit.b);
      mine.hitT -= dt;
      if(mine.hitT<=0){ mine.hitT=0.24; sfx('dig'); }
      crackMesh.visible=true;
      crackMesh.position.set(hit.x+0.5,hit.y+0.5,hit.z+0.5);
      crackMat.map = crackTexs[Math.min(3,(mine.progress*4)|0)];
      if(mine.progress>=1){
        breakBlock(hit.x,hit.y,hit.z,hit.b);
        mine.active=false; crackMesh.visible=false;
      }
    } else { mine.active=false; crackMesh.visible=false; }
  }
  if(!G.fallback && G.mouseBtn[2] && t-G.lastPlace>=0.24){
    G.lastPlace=t;
    doPlace(window._keys['ShiftLeft']||window._keys['ShiftRight']);
  }
}
