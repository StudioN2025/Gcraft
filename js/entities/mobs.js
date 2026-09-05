import * as THREE from 'three';
import { G } from '../core/state.js';
import { clamp } from '../core/utils.js';
import { B, IT, SOLID } from '../data/blocks.js';
import { scene, camera, sfx } from '../engine/renderer.js';
import { getBlock, getChunks, ckey, floorYAt, surfaceYAt } from '../world/world.js';
import { spawnDrop } from '../gameplay/drops.js';
import { damage, addHunger, showToast, refreshScreens } from '../ui/hud.js';
import { spawnParticles } from '../world/particles.js';
import { setBlockWorld } from '../world/world.js';

export const mobRoot = new THREE.Group(); scene.add(mobRoot);
export const mobs = [];
const RED = new THREE.Color(1, 0.2, 0.15);
const MOB_CAP = (window.matchMedia && matchMedia('(pointer: coarse)').matches) ? 8 : 12;
let mobSpawnT = 1;
export let t2 = 0;
export function tickT2(dt){ t2+=dt; }

export let dragon=null, dragonDead=false, dragonT=0, dragonState='circle';
const dragonTarget=new THREE.Vector3();
export function isDragonDead(){ return dragonDead; }
export function resetDragonState(){ dragonDead=false; }

function part(group, w,h,d, color, x,y,z, ty){
  const geo=new THREE.BoxGeometry(w,h,d);
  if(ty==='leg') geo.translate(0,-h/2,0);
  const mat=new THREE.MeshLambertMaterial({color});
  mat.userData.base=new THREE.Color(color);
  const m=new THREE.Mesh(geo,mat);
  m.castShadow = G.settings.shadows;
  m.position.set(x,y,z);
  group.add(m);
  return m;
}
export function makeMob(type,x,y,z){
  const g=new THREE.Group();
  const legs=[];
  let hp=10, speed=1.3, voice='oink';
  if(type==='pig'){
    part(g,0.62,0.55,0.95,0xefa2a2,0,0.62,0);
    part(g,0.46,0.44,0.4,0xf3b0b0,0,0.72,0.6);
    part(g,0.24,0.16,0.1,0xd97b7b,0,0.66,0.84);
    for(const [lx,lz] of [[-0.2,0.3],[0.2,0.3],[-0.2,-0.3],[0.2,-0.3]])
      legs.push(part(g,0.18,0.36,0.18,0xe08f8f,lx,0.36,lz,'leg'));
    hp=10; speed=1.3; voice='oink';
  } else if(type==='cow'){
    part(g,0.75,0.7,1.2,0x5f4433,0,0.85,0);
    part(g,0.5,0.5,0.45,0x6b4d3a,0,1.02,0.76);
    part(g,0.32,0.2,0.1,0xcbb59a,0,0.94,1.02);
    part(g,0.05,0.32,0.5,0xe8e2d6,-0.4,0.9,0.05);
    part(g,0.05,0.32,0.5,0xe8e2d6, 0.4,0.9,-0.2);
    for(const [lx,lz] of [[-0.24,0.42],[0.24,0.42],[-0.24,-0.42],[0.24,-0.42]])
      legs.push(part(g,0.2,0.5,0.2,0x4a3526,lx,0.5,lz,'leg'));
    hp=12; speed=1.15; voice='moo';
  } else if(type==='chicken'){
    part(g,0.4,0.42,0.55,0xf2f2f2,0,0.5,0);
    part(g,0.26,0.3,0.24,0xf7f7f7,0,0.84,0.28);
    part(g,0.12,0.08,0.14,0xe8a13c,0,0.82,0.46);
    part(g,0.08,0.1,0.06,0xd23c3c,0,0.72,0.42);
    legs.push(part(g,0.06,0.28,0.4,0xe0e0e0,-0.23,0.68,0,'leg'));
    legs.push(part(g,0.06,0.28,0.4,0xe0e0e0, 0.23,0.68,0,'leg'));
    legs.push(part(g,0.07,0.28,0.07,0xd8a24a,-0.09,0.3,0.02,'leg'));
    legs.push(part(g,0.07,0.28,0.07,0xd8a24a, 0.09,0.3,0.02,'leg'));
    hp=4; speed=1.5; voice='cluck';
  } else if(type==='enderman'){
    part(g,0.5,1.05,0.32,0x101014,0,1.5,0);
    part(g,0.46,0.44,0.44,0x14141a,0,2.25,0);
    part(g,0.36,0.07,0.06,0xc45ff0,-0.1,2.32,0.22);
    part(g,0.36,0.07,0.06,0xc45ff0, 0.1,2.32,0.22);
    for(const [lx,lz] of [[-0.14,0],[0.14,0]])
      legs.push(part(g,0.14,1.0,0.14,0x0c0c10,lx,1.0,lz,'leg'));
    part(g,0.12,0.95,0.12,0x101014,-0.32,1.55,0);
    part(g,0.12,0.95,0.12,0x101014, 0.32,1.55,0);
    hp=20; speed=1.3; voice='growl';
  } else if(type==='blaze'){
    part(g,0.5,0.5,0.5,0xe8b52e,0,0.9,0);
    part(g,0.1,0.09,0.09,0x3a2a08,-0.11,0.98,0.24);
    part(g,0.1,0.09,0.09,0x3a2a08, 0.11,0.98,0.24);
    const rods=new THREE.Group();
    for(let i=0;i<8;i++){
      const a=i/8*Math.PI*2;
      part(rods,0.12,0.5,0.12,0xd89a20, Math.cos(a)*0.42, 0, Math.sin(a)*0.42);
    }
    rods.position.y=0.35;
    g.add(rods);
    hp=20; speed=0; voice='fire';
    g.userData.rods=rods;
  }
  g.position.set(x,y,z);
  const mob={type,group:g,legs,hp,maxHp:hp,yaw:Math.random()*6.28,t:0,walk:false,
             vy:0,kx:0,kz:0,flash:0,dying:0,voice,inWater:false,v:0,age:0,
             aggro:false,stare:0,losOk:false,losT:0,atkCd:0,
             shootCd:2+Math.random()*2,baseY:y,speed};
  g.traverse(o=>{ o.userData.mob=mob; });
  mobRoot.add(g);
  mobs.push(mob);
  return mob;
}
export function removeMob(i){
  const m=mobs[i];
  mobRoot.remove(m.group);
  m.group.traverse(o=>{
    if(o.geometry) o.geometry.dispose();
    if(o.material) o.material.dispose();
  });
  mobs.splice(i,1);
}
export function clearMobs(){ while(mobs.length) removeMob(0); }
function killMob(i){
  const m=mobs[i];
  const table={pig:[IT.RAW_PORK,2],cow:[IT.RAW_BEEF,2],chicken:[IT.RAW_CHICKEN,1],
               enderman:[IT.ENDER_PEARL,1],blaze:[IT.BLAZE_ROD,1]};
  const [id,n]=table[m.type];
  const cnt = 1 + (Math.random()<0.4 && n>1 ? 1 : 0);
  spawnDrop(id, cnt, m.group.position.x, m.group.position.y+0.5, m.group.position.z);
  removeMob(i);
}
export function tryAttack(m, t){
  if(t-G.lastAtk<0.45 || m.dying>0) return;
  G.lastAtk=t;
  m.hp -= window._attackDmg ? window._attackDmg() : 1;
  m.flash=0.15;
  if(m.type==='enderman'){ m.aggro=true; m.stare=2; }
  if(m.type!=='dragon'){
    const dx=m.group.position.x-G.player.pos.x, dz=m.group.position.z-G.player.pos.z;
    const l=Math.hypot(dx,dz)||1;
    m.kx=dx/l*4.5; m.kz=dz/l*4.5; m.vy=3.2;
    if(m.type==='enderman' && Math.random()<0.35) endermanTeleport(m);
  }
  sfx('hit'); sfx(m.voice); window._vibrate && window._vibrate(20);
  addHunger(-0.1);
  if(m.hp<=0){
    if(m.type==='dragon') dragonDeath();
    else m.dying=0.35;
  }
}
function endermanTeleport(m){
  for(let k=0;k<8;k++){
    const a=Math.random()*Math.PI*2, d=4+Math.random()*6;
    const nx=m.group.position.x+Math.cos(a)*d, nz=m.group.position.z+Math.sin(a)*d;
    if(!getChunks().has(ckey(Math.floor(nx)>>4, Math.floor(nz)>>4))) continue;
    const fy=floorYAt(nx, m.group.position.y+2, nz);
    if(fy<70){
      spawnParticles(m.group.position.x-0.5,m.group.position.y,m.group.position.z-0.5,[160,80,220],8,2);
      m.group.position.set(nx,fy,nz);
      sfx('tp');
      return;
    }
  }
}
const raycaster = new THREE.Raycaster();
export function pickMob(){
  raycaster.setFromCamera({x:0,y:0}, camera);
  raycaster.far = 4.2;
  const hits = raycaster.intersectObjects(mobRoot.children, true);
  for(const h of hits){
    const m=h.object.userData.mob;
    if(m && m.hp>0 && m.dying<=0) return m;
  }
  return null;
}
const _losV=new THREE.Vector3();
function hasLOS(from, to){
  _losV.subVectors(to, from);
  const len=_losV.length();
  if(len<0.5) return true;
  _losV.divideScalar(len);
  const steps=Math.floor(len/0.6);
  const p=new THREE.Vector3();
  for(let i=1;i<=steps;i++){
    p.copy(from).addScaledVector(_losV, i*0.6);
    if(SOLID[getBlock(Math.floor(p.x),Math.floor(p.y),Math.floor(p.z))]) return false;
  }
  return true;
}
const _fwd=new THREE.Vector3(), _toMob=new THREE.Vector3();
export function updateMobs(dt,t){
  mobSpawnT-=dt;
  if(mobSpawnT<=0){
    mobSpawnT=1.4;
    if(mobs.length<MOB_CAP) trySpawnMob();
  }
  for(let i=mobs.length-1;i>=0;i--){
    const m=mobs[i], g=m.group;
    if(m.dying>0){
      m.dying-=dt;
      const p=1-Math.max(0,m.dying)/0.35;
      g.scale.set(1,Math.max(0.05,1-p),1);
      g.rotation.z=p*Math.PI/2;
      if(m.dying<=0) killMob(i);
      continue;
    }
    const distP=Math.hypot(g.position.x-G.player.pos.x, g.position.z-G.player.pos.z);
    m.age+=dt;
    if((m.age>30 && distP>44) || g.position.y<-10){ removeMob(i); continue; }
    if(!getChunks().has(ckey(Math.floor(g.position.x)>>4, Math.floor(g.position.z)>>4))) continue;
    if(m.type==='blaze'){ updateBlaze(m,g,dt,distP,t); continue; }

    let chaseSpeed = m.speed;
    if(m.type==='enderman'){
      m.losT-=dt;
      if(m.losT<=0){
        m.losT=0.15;
        camera.getWorldDirection(_fwd);
        _toMob.set(g.position.x-camera.position.x, g.position.y+2.2-camera.position.y, g.position.z-camera.position.z).normalize();
        const look = _fwd.dot(_toMob);
        if(!m.aggro && distP<20 && look>0.985) m.stare += 0.15;
        else m.stare = Math.max(0, m.stare-0.3);
        if(m.stare>0.9){ m.aggro=true; sfx('growl'); }
        m.losOk = hasLOS(camera.position, g.position.clone().setY(g.position.y+2.2));
      }
      if(m.aggro && distP>26){ m.aggro=false; m.stare=0; }
      if(m.aggro && distP<32 && m.losOk){
        m.yaw=Math.atan2(G.player.pos.x-g.position.x, G.player.pos.z-g.position.z);
        m.walk=true; m.t=Math.max(m.t,0.2);
        chaseSpeed=3.4;
        m.atkCd-=dt;
        if(distP<1.9 && m.atkCd<=0){ m.atkCd=1.0; damage(3,'эндермен'); }
      } else if(m.t<=0){
        m.walk=Math.random()<0.6;
        if(m.walk) m.yaw=Math.random()*Math.PI*2;
        m.t=m.walk?1.2+Math.random()*2.0:0.6+Math.random()*1.4;
      }
    } else if(m.t<=0){
      m.walk=Math.random()<0.6;
      if(m.walk) m.yaw=Math.random()*Math.PI*2;
      m.t=m.walk?1.2+Math.random()*2.0:0.6+Math.random()*1.4;
    }

    let vx = m.walk?Math.sin(m.yaw)*chaseSpeed:0;
    let vz = m.walk?Math.cos(m.yaw)*chaseSpeed:0;
    vx+=m.kx; vz+=m.kz;
    m.kx*=Math.exp(-5*dt); m.kz*=Math.exp(-5*dt);
    if(vx||vz){
      const nx=g.position.x+vx*dt, nz=g.position.z+vz*dt;
      const fx=Math.floor(nx), fz=Math.floor(nz);
      const b2=getBlock(fx, Math.floor(g.position.y+1.6), fz);
      const fl=floorYAt(nx, g.position.y+1.15, nz);
      const stepUp = fl-g.position.y;
      if(!SOLID[b2] && stepUp<=1.05){
        g.position.x=nx; g.position.z=nz;
        if(fl>g.position.y && m.vy<=0) g.position.y=fl;
      } else if(stepUp>1.05 && stepUp<1.9 && Math.abs(m.vy)<0.01){
        m.vy=7.4;
      } else {
        m.yaw=Math.random()*Math.PI*2; m.t=0.4;
      }
    }
    m.inWater = getBlock(Math.floor(g.position.x),Math.floor(g.position.y+0.2),Math.floor(g.position.z))===B.WATER;
    m.vy-=24*dt;
    if(m.inWater) m.vy=clamp(m.vy+10*dt, -1.5, 1.8);
    if(m.type==='chicken') m.vy=Math.max(m.vy,-3);
    g.position.y+=m.vy*dt;
    const fl2=floorYAt(g.position.x, g.position.y+0.4, g.position.z);
    if(g.position.y<=fl2){ g.position.y=fl2; m.vy=0; }

    let dy=m.yaw-g.rotation.y;
    while(dy>Math.PI) dy-=Math.PI*2;
    while(dy<-Math.PI) dy+=Math.PI*2;
    g.rotation.y += dy*Math.min(1,dt*8);
    const realSpeed=Math.hypot(vx,vz);
    m.v += dt*(realSpeed>0.15?9:0);
    const swing = realSpeed>0.15 ? 0.6 : 0;
    for(let li=0;li<m.legs.length;li++)
      m.legs[li].rotation.x=Math.sin(m.v+(li%2?Math.PI:0))*swing;
    if(m.flash>0){
      m.flash-=dt;
      const f=Math.max(0,m.flash)/0.15;
      g.traverse(o=>{ if(o.material&&o.material.userData.base)
        o.material.color.copy(o.material.userData.base).lerp(RED,f*0.85); });
    }
    if(distP<10 && Math.random()<dt*0.05) sfx(m.voice);
  }
}
function updateBlaze(m,g,dt,distP,t){
  const fl=floorYAt(g.position.x, g.position.y+0.5, g.position.z);
  const targetY = Math.max(fl+1.6, m.baseY);
  g.position.y += (targetY-g.position.y)*Math.min(1,dt*1.5) + Math.sin(t*2+m.age)*dt*0.3;
  g.rotation.y += dt*0.8;
  if(g.userData.rods) g.userData.rods.rotation.y += dt*4;
  m.shootCd-=dt;
  if(distP<16 && m.shootCd<=0 && G.playing && !G.dead){
    m.shootCd=2.2+Math.random()*1.5;
    const from=g.position.clone(); from.y+=0.9;
    const to=G.player.pos.clone(); to.y+=1.4;
    spawnFireball(from, to);
    sfx('fire');
  }
  if(m.flash>0){
    m.flash-=dt;
    const f=Math.max(0,m.flash)/0.15;
    g.traverse(o=>{ if(o.material&&o.material.userData.base)
      o.material.color.copy(o.material.userData.base).lerp(RED,f*0.85); });
  }
}
function trySpawnMob(){
  const a=Math.random()*Math.PI*2, d=10+Math.random()*14;
  const x=Math.floor(G.player.pos.x+Math.cos(a)*d), z=Math.floor(G.player.pos.z+Math.sin(a)*d);
  if(!getChunks().has(ckey(x>>4,z>>4))) return;
  if(G.dim===1){
    for(let y=44;y>=14;y--){
      const b=getBlock(x,y,z);
      if(b===B.NETHERRACK && getBlock(x,y+1,z)===B.AIR && getBlock(x,y+2,z)===B.AIR){
        makeMob('blaze', x+0.5, y+1.2, z+0.5);
        return;
      }
    }
    return;
  }
  if(G.dim===2) return;
  const sy=surfaceYAt(x,z);
  if(sy<=31) return;
  if(getBlock(x,sy,z)!==B.AIR || getBlock(x,sy+1,z)!==B.AIR) return;
  const ground=getBlock(x,sy-1,z);
  const night = G.worldT<0.22 || G.worldT>0.78;
  if(night && Math.random()<0.45){ makeMob('enderman', x+0.5, sy, z+0.5); return; }
  if(ground!==B.GRASS) return;
  const r=Math.random();
  makeMob(r<0.34?'pig':r<0.67?'cow':'chicken', x+0.5, sy, z+0.5);
}

/* огненные шары */
const fireballs=[];
const fbGeo=new THREE.SphereGeometry(0.22,6,6);
const fbMat=new THREE.MeshBasicMaterial({color:0xffa028});
function spawnFireball(from,to){
  const m=new THREE.Mesh(fbGeo,fbMat);
  m.position.copy(from);
  scene.add(m);
  const d=new THREE.Vector3().subVectors(to,from).normalize();
  fireballs.push({sp:m, v:d.multiplyScalar(9), age:0});
}
export function updateFireballs(dt){
  for(let i=fireballs.length-1;i>=0;i--){
    const f=fireballs[i];
    f.age+=dt;
    f.sp.position.addScaledVector(f.v,dt);
    f.sp.position.y -= dt*1.2;
    const p=f.sp.position;
    let dead = f.age>5 || SOLID[getBlock(Math.floor(p.x),Math.floor(p.y),Math.floor(p.z))];
    if(!dead){
      const dp=p.distanceTo(G.player.pos.clone().add(new THREE.Vector3(0,1,0)));
      if(dp<1.1){ damage(4,'ифрит'); dead=true; }
    }
    if(dead){
      spawnParticles(p.x-0.5,p.y-0.5,p.z-0.5,[255,140,40],8,2);
      scene.remove(f.sp);
      fireballs.splice(i,1);
    }
  }
}
export function clearFireballs(){
  for(const f of fireballs) scene.remove(f.sp);
  fireballs.length=0;
}

/* дракон */
export function spawnDragon(){
  const g=new THREE.Group();
  part(g,1.6,1.4,4.5,0x1a1a20,0,0,0);
  part(g,0.8,0.8,1.6,0x22222a,0,0.2,2.8);
  part(g,1.1,0.9,1.4,0x26262e,0,0.4,4.2);
  part(g,0.5,0.25,0.3,0xc45ff0,-0.3,0.6,4.95);
  part(g,0.5,0.25,0.3,0xc45ff0, 0.3,0.6,4.95);
  const wingL=part(g,5.5,0.14,2.6,0x2a2a34,-3.2,0.7,0.4);
  const wingR=part(g,5.5,0.14,2.6,0x2a2a34, 3.2,0.7,0.4);
  part(g,0.9,0.8,2.2,0x1a1a20,0,0.1,-3.2);
  part(g,0.6,0.55,2.0,0x16161c,0,0.1,-5.2);
  g.position.set(0,47,0);
  const dm={type:'dragon',group:g,legs:[],hp:60,maxHp:60,yaw:0,v:0,walk:false,
            vy:0,kx:0,kz:0,flash:0,dying:0,voice:'roar',t:0,wingL,wingR};
  g.traverse(o=>{ o.userData.mob=dm; });
  mobRoot.add(g);
  dragon=dm; dragonDead=false; dragonState='circle'; dragonT=0;
  document.getElementById('bossbar').style.display='flex';
  sfx('roar');
}
export function updateDragon(dt,t){
  if(!dragon) return;
  const g=dragon.group;
  if(dragonState==='circle'){
    dragonT+=dt*0.4;
    const R=24;
    const tx=Math.cos(dragonT)*R, tz=Math.sin(dragonT)*R;
    const ty=47+Math.sin(t*0.5)*3;
    const dx=tx-g.position.x, dz=tz-g.position.z, dy=ty-g.position.y;
    const l=Math.hypot(dx,dz)||1;
    g.position.x+=dx/l*9*dt;
    g.position.z+=dz/l*9*dt;
    g.position.y+=dy*Math.min(1,dt);
    dragon.yaw=Math.atan2(dx,dz);
    if(Math.random()<dt*0.18){
      dragonState='swoop';
      dragonTarget.set(G.player.pos.x, G.player.pos.y+1.2, G.player.pos.z);
      sfx('roar');
    }
  } else {
    const d=new THREE.Vector3().subVectors(dragonTarget, g.position);
    const dist=d.length();
    if(dist>1.2){
      d.normalize();
      g.position.addScaledVector(d, 16*dt);
      dragon.yaw=Math.atan2(d.x,d.z);
      if(dist<2.2 && G.playing && !G.dead){
        damage(6,'дракон');
        const kb=new THREE.Vector3().subVectors(G.player.pos,g.position).normalize();
        G.player.vel.x+=kb.x*10; G.player.vel.z+=kb.z*10; G.player.vel.y=6;
      }
    } else {
      dragonState='circle';
      dragonT=Math.atan2(g.position.z,g.position.x);
    }
  }
  g.rotation.y=dragon.yaw;
  const flap=Math.sin(t*6)*0.5;
  dragon.wingL.rotation.z=flap;
  dragon.wingR.rotation.z=-flap;
  if(dragon.flash>0){
    dragon.flash-=dt;
    const f=Math.max(0,dragon.flash)/0.15;
    g.traverse(o=>{ if(o.material&&o.material.userData.base)
      o.material.color.copy(o.material.userData.base).lerp(RED,f*0.85); });
  }
  document.getElementById('bbFill').style.width =
    Math.max(0,dragon.hp/dragon.maxHp*100)+'%';
}
function dragonDeath(){
  if(!dragon) return;
  const p=dragon.group.position;
  spawnParticles(p.x-2,p.y,p.z-2,[190,70,220],20,6);
  spawnParticles(p.x-2,p.y+1,p.z-2,[255,220,120],16,5);
  sfx('roar'); sfx('fizz');
  mobRoot.remove(dragon.group);
  dragon=null;
  dragonDead=true;
  document.getElementById('bossbar').style.display='none';
  const ty=surfaceYAt(0,0);
  for(let dx=-1;dx<=1;dx++) for(let dz=-1;dz<=1;dz++)
    setBlockWorld(dx,ty,dz,B.END_PORTAL);
  showToast('★ ДРАКОН ПОБЕЖДЁН! Портал домой открыт ★');
  G.playing=false;
  document.getElementById('win').style.display='flex';
  if(document.pointerLockElement) document.exitPointerLock();
  refreshScreens();
}
document.getElementById('winBtn').addEventListener('click',()=>{
  document.getElementById('win').style.display='none';
  window._lockPointer && window._lockPointer();
});
export function removeDragon(){ if(dragon){ mobRoot.remove(dragon.group); dragon=null; } }
export function getDragonState(){ return {dead:dragonDead}; }
