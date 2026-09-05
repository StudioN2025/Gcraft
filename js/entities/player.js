import * as THREE from 'three';
import { G } from '../core/state.js';
import { clamp } from '../core/utils.js';
import { B, SOLID } from '../data/blocks.js';
import { camera, sfx } from '../engine/renderer.js';
import { getBlock, isWaterAt, isLavaAt } from '../world/world.js';
import { renderHunger, renderAir, renderHealth, showToast, damage, addHunger } from '../ui/hud.js';
import { travelPortal, toEnd, exitEnd } from '../gameplay/interaction.js';

let bobT=0, bobK=0, stepAcc=0, wasGround=true, lastVy=0, lastHSpeed=0, wallHit=false;

export function moveAxis(axis, amt){
  if(!amt) return;
  const p=G.player.pos;
  p[axis]+=amt;
  const x0=Math.floor(p.x-0.3), x1=Math.floor(p.x+0.3);
  const y0=Math.floor(p.y),     y1=Math.floor(p.y+1.79);
  const z0=Math.floor(p.z-0.3), z1=Math.floor(p.z+0.3);
  let hit=false;
  for(let x=x0;x<=x1&&!hit;x++) for(let y=y0;y<=y1&&!hit;y++) for(let z=z0;z<=z1&&!hit;z++)
    if(SOLID[getBlock(x,y,z)]) hit=true;
  if(!hit) return;
  if(axis==='y'){
    if(amt<0){ p.y=Math.floor(p.y)+1; G.player.onGround=true; }
    else p.y=Math.floor(p.y+1.79)-1.8-0.001;
    G.player.vel.y=0;
  } else if(axis==='x'){
    p.x = amt>0 ? Math.floor(p.x+0.3)-0.301 : Math.floor(p.x-0.3)+1.301;
    G.player.vel.x=0;
  } else {
    p.z = amt>0 ? Math.floor(p.z+0.3)-0.301 : Math.floor(p.z-0.3)+1.301;
    G.player.vel.z=0;
  }
}
export function updatePlayer(dt){
  const P=G.player;
  const keys=window._keys||{};
  const key=c=>!!keys[c];
  const joy=G.joy;
  let inF=(key('KeyW')||key('ArrowUp')?1:0)-(key('KeyS')||key('ArrowDown')?1:0);
  let inS=(key('KeyD')||key('ArrowRight')?1:0)-(key('KeyA')||key('ArrowLeft')?1:0);
  if(joy.id!==null){ inF += -joy.vy; inS += joy.vx; }
  const inMag=Math.hypot(inF,inS);
  if(inMag>1){ inF/=inMag; inS/=inMag; }
  const sprint = key('ShiftLeft')||key('ShiftRight')||(joy.id!==null && joy.mag>0.95 && inF>0.25);
  const inWater = isWaterAt(P.pos.x,P.pos.y+0.4,P.pos.z) || isWaterAt(P.pos.x,P.pos.y+1.2,P.pos.z);
  const inLava  = isLavaAt(P.pos.x,P.pos.y+0.4,P.pos.z) || isLavaAt(P.pos.x,P.pos.y+0.9,P.pos.z);
  const inFluid = inWater || inLava;
  let speed = P.fly ? 12 : (sprint?6.8:4.32);
  if(inWater && !P.fly) speed*=0.6;
  if(inLava && !P.fly) speed*=0.4;
  let mx=0,mz=0;
  if(inF||inS){
    const sy=Math.sin(G.yaw), cy=Math.cos(G.yaw);
    mx=-sy*inF+cy*inS; mz=-cy*inF-sy*inS;
    const l=Math.hypot(mx,mz); mx/=l; mz/=l;
  }
  const accel = P.fly?10 : P.onGround?14:3.5;
  const k=1-Math.exp(-accel*dt);
  P.vel.x += (mx*speed-P.vel.x)*k;
  P.vel.z += (mz*speed-P.vel.z)*k;
  if(P.fly){
    const vy=(key('Space')?1:0)-(key('KeyC')?1:0);
    P.vel.y += (vy*9-P.vel.y)*(1-Math.exp(-10*dt));
  } else if(inFluid){
    P.vel.y -= (inLava?6:10)*dt;
    if(key('Space')) P.vel.y += (inLava?18:30)*dt;
    P.vel.y = clamp(P.vel.y, inLava?-1.4:-3.2, inLava?2.2:3.2);
  } else {
    P.vel.y -= 28*dt;
    if(key('Space') && P.onGround){ P.vel.y=8.7; addHunger(-0.08); }
    P.vel.y = Math.max(P.vel.y,-42);
  }
  wasGround=P.onGround; lastVy=P.vel.y;
  P.onGround=false; wallHit=false;
  const maxV=Math.max(Math.abs(P.vel.x),Math.abs(P.vel.y),Math.abs(P.vel.z));
  const steps=Math.max(1,Math.ceil(maxV*dt/0.4));
  for(let i=0;i<steps;i++){
    moveAxis('y',P.vel.y*dt/steps);
    moveAxis('x',P.vel.x*dt/steps);
    moveAxis('z',P.vel.z*dt/steps);
  }
  if(inWater && wallHit && key('Space')) P.vel.y=Math.max(P.vel.y,6.8);
  if(!wasGround && P.onGround && lastVy<-9) sfx('land');
  const landed = !wasGround && P.onGround;
  if(landed && G.game.mode==='survival' && P.falling){
    const d = P.fallStartY - P.pos.y;
    if(d>3.5) damage(Math.floor(d-3), 'падение с высоты');
  }
  if(P.onGround || inFluid || P.fly) P.falling=false;
  else if(P.vel.y<0 && !P.falling){ P.falling=true; P.fallStartY=P.pos.y; }
  const hSpeed=Math.hypot(P.vel.x,P.vel.z);
  lastHSpeed=hSpeed;
  if(P.onGround && hSpeed>1.5){
    stepAcc+=hSpeed*dt;
    if(stepAcc>2.1){ stepAcc=0; sfx('step'); }
  } else stepAcc=0;
  if(G.settings.bob){
    const bobTarget=(P.onGround&&hSpeed>0.5)?Math.min(1,hSpeed/4.3):0;
    bobK += (bobTarget-bobK)*Math.min(1,dt*8);
    bobT += hSpeed*dt*1.7;
  } else bobK*=Math.max(0,1-dt*8);
  const bobY=Math.abs(Math.sin(bobT))*0.075*bobK;
  const roll=Math.sin(bobT)*0.006*bobK;
  camera.position.set(P.pos.x, P.pos.y+1.62+bobY, P.pos.z);
  camera.rotation.set(G.pitch, G.yaw, roll);
  const tf=G.settings.fov+(sprint&&hSpeed>5?8:0)+(P.fly?4:0);
  if(Math.abs(camera.fov-tf)>0.01){
    camera.fov += (tf-camera.fov)*Math.min(1,dt*9);
    camera.updateProjectionMatrix();
  }
  if(G.portalCd>0){ G.portalCd-=dt; G.portalTimer=0; }
  else {
    const fb=getBlock(Math.floor(P.pos.x),Math.floor(P.pos.y+0.1),Math.floor(P.pos.z));
    if(fb===B.PORTAL && G.dim!==2){
      G.portalTimer+=dt;
      if(G.portalTimer>0.8){ G.portalTimer=0; travelPortal(); }
    } else if(fb===B.END_PORTAL){
      G.portalTimer+=dt;
      if(G.portalTimer>0.5){
        G.portalTimer=0;
        if(G.dim===0) toEnd();
        else if(G.dim===2 && window._dragonDead) exitEnd();
      }
    } else G.portalTimer=0;
  }
}
export function updateSurvival(dt,t){
  const P=G.player;
  if(G.game.mode!=='survival' || G.dead) return;
  const headWater = isWaterAt(camera.position.x, camera.position.y, camera.position.z);
  if(headWater){
    P.air -= dt;
    if(P.air<=0){
      P.air=0; P.drownT+=dt;
      if(P.drownT>=1){ P.drownT=0; damage(2,'утопление'); }
    }
  } else { P.air=Math.min(10, P.air+dt*3); P.drownT=0; }
  renderAir();
  const bodyLava = isLavaAt(P.pos.x,P.pos.y+0.2,P.pos.z) || isLavaAt(P.pos.x,P.pos.y+1.0,P.pos.z);
  if(bodyLava){
    P.lavaT+=dt;
    if(P.lavaT>=0.5){ P.lavaT=0; damage(3,'в лаве'); }
  } else P.lavaT=0;
  const keys=window._keys||{};
  const sprint = keys['ShiftLeft']||keys['ShiftRight'];
  const drain = sprint&&lastHSpeed>4.5 ? 0.09 : lastHSpeed>0.5 ? 0.028 : 0.010;
  addHunger(-drain*dt);
  if(P.hunger>=18 && P.health<20 && t-P.lastDamageT>5){
    P.regenAcc+=dt;
    if(P.regenAcc>=2.5){
      P.regenAcc=0;
      P.health=Math.min(20,P.health+1);
      addHunger(-0.6);
      renderHealth();
    }
  }
  if(P.hunger<=0){
    P.starveT+=dt;
    if(P.starveT>=4){
      P.starveT=0;
      if(P.health>1) damage(1,'голод');
    }
  } else P.starveT=0;
}
export function updateVoid(dt){
  const P=G.player;
  if(G.game.mode==='survival' && P.pos.y<-12){
    P.voidT+=dt;
    if(P.voidT>0.4){ P.voidT=0; damage(4,'бездна'); }
  }
  if(G.dim===2 && P.pos.y<-30 && !G.dead){
    const ty=window._surfaceYAt ? window._surfaceYAt(0,0) : 40;
    P.pos.set(0.5, ty+2, 0.5);
    P.vel.set(0,0,0); P.falling=false;
    return;
  }
  if(P.pos.y<-50){
    if(G.dim!==0){ window._setDimension && window._setDimension(0); }
    P.pos.set(G.spawnPos.x, G.spawnPos.y+2, G.spawnPos.z);
    P.vel.set(0,0,0); P.falling=false;
  }
}
