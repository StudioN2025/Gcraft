import * as THREE from 'three';
import { G } from '../core/state.js';
import { scene } from '../engine/renderer.js';
import { SOLID, BLOCKS } from '../data/blocks.js';
import { AVG } from '../engine/atlas.js';
import { getBlock } from './world.js';

const MAXP = (window.matchMedia && matchMedia('(pointer: coarse)').matches) ? 120 : 240;
const pMesh=new THREE.InstancedMesh(new THREE.BoxGeometry(0.1,0.1,0.1), new THREE.MeshBasicMaterial(), MAXP);
pMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
pMesh.frustumCulled=false; pMesh.count=0; scene.add(pMesh);
const particles=[];
const dummy=new THREE.Object3D(); const pCol=new THREE.Color();
export function spawnParticles(bx,by,bz,rgb,n,spread=3.6){
  for(let i=0;i<n;i++){
    if(particles.length>=MAXP) particles.shift();
    const k=0.7+Math.random()*0.5;
    particles.push({
      x:bx+0.2+Math.random()*0.6, y:by+0.2+Math.random()*0.6, z:bz+0.2+Math.random()*0.6,
      vx:(Math.random()-0.5)*spread, vy:1.5+Math.random()*4, vz:(Math.random()-0.5)*spread,
      ttl:0.4+Math.random()*0.45, s:0.6+Math.random()*0.8,
      r:rgb[0]*k/255, g:rgb[1]*k/255, b:rgb[2]*k/255
    });
  }
}
export function spawnBreakParticles(bx,by,bz,block){
  const bl=BLOCKS[block];
  const rgb = AVG[bl.side] || [200,200,200];
  spawnParticles(bx,by,bz,rgb,10);
}
export function updateParticles(dt){
  let n=0;
  for(let i=particles.length-1;i>=0;i--){
    const p=particles[i];
    p.ttl-=dt;
    if(p.ttl<=0){ particles.splice(i,1); continue; }
    p.vy-=22*dt;
    const nx=p.x+p.vx*dt, ny=p.y+p.vy*dt, nz=p.z+p.vz*dt;
    if(SOLID[getBlock(Math.floor(nx),Math.floor(ny),Math.floor(nz))]){
      p.vx*=0.4; p.vz*=0.4; p.vy=Math.abs(p.vy)*0.25;
    } else { p.x=nx; p.y=ny; p.z=nz; }
  }
  for(const p of particles){
    dummy.position.set(p.x,p.y,p.z);
    dummy.scale.setScalar(p.s*Math.min(1,p.ttl*3));
    dummy.updateMatrix();
    pMesh.setMatrixAt(n,dummy.matrix);
    pMesh.setColorAt(n,pCol.setRGB(p.r,p.g,p.b));
    n++;
  }
  pMesh.count=n;
  pMesh.instanceMatrix.needsUpdate=true;
  if(pMesh.instanceColor) pMesh.instanceColor.needsUpdate=true;
}
