import * as THREE from 'three';
import { G } from '../core/state.js';
import { ICONC } from '../engine/atlas.js';
import { scene, sfx } from '../engine/renderer.js';
import { floorYAt } from '../world/world.js';
import { addItem } from './inventory.js';

const drops=[];
const dropMats={};
function dropMat(id){
  let m=dropMats[id];
  if(!m){
    const t=new THREE.CanvasTexture(ICONC[id]||ICONC[3]);
    t.magFilter=t.minFilter=THREE.NearestFilter;
    m=new THREE.SpriteMaterial({map:t, transparent:true});
    dropMats[id]=m;
  }
  return m;
}
export function spawnDrop(id,count,x,y,z){
  const s=new THREE.Sprite(dropMat(id));
  s.scale.set(0.42,0.42,0.42);
  scene.add(s);
  drops.push({id,count,x,y,z,vy:2+Math.random()*1.5,sp:s,age:0,cool:0});
}
export function updateDrops(dt,t){
  for(let i=drops.length-1;i>=0;i--){
    const d=drops[i];
    d.age+=dt; d.cool-=dt;
    d.vy-=18*dt; d.y+=d.vy*dt;
    const fl=floorYAt(d.x, d.y+0.3, d.z);
    if(d.y<fl+0.15){ d.y=fl+0.15; d.vy=0; }
    const dx=G.player.pos.x-d.x, dy=(G.player.pos.y+0.9)-d.y, dz=G.player.pos.z-d.z;
    const dist=Math.hypot(dx,dy,dz);
    if(dist>0.01 && dist<1.9){
      d.x+=dx/dist*4.2*dt; d.y+=dy/dist*4.2*dt; d.z+=dz/dist*4.2*dt;
      if(dist<0.6 && d.cool<=0){
        if(addItem(d.id,d.count)){
          sfx('pop'); scene.remove(d.sp); drops.splice(i,1); continue;
        } else d.cool=1.2;
      }
    }
    d.sp.position.set(d.x, d.y+Math.sin(t*3+i)*0.05, d.z);
    if(d.age>180){ scene.remove(d.sp); drops.splice(i,1); }
  }
}
export function clearDrops(){
  for(const d of drops) scene.remove(d.sp);
  drops.length=0;
}
