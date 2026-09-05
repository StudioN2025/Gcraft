import * as THREE from 'three';
import { G } from '../core/state.js';
import { clamp } from '../core/utils.js';
import { BLOCKS, OPAQUE, AOS, B } from '../data/blocks.js';
import { scene, opaqueMat, waterMat } from './renderer.js';

export const FACES = [
  {dir:[ 1,0,0], corners:[[1,0,0],[1,1,0],[1,1,1],[1,0,1]], uvs:[[0,0],[0,1],[1,1],[1,0]], shade:0.62},
  {dir:[-1,0,0], corners:[[0,0,1],[0,1,1],[0,1,0],[0,0,0]], uvs:[[1,0],[1,1],[0,1],[0,0]], shade:0.62},
  {dir:[0, 1,0], corners:[[0,1,0],[0,1,1],[1,1,1],[1,1,0]], uvs:[[0,0],[0,1],[1,1],[1,0]], shade:1.0 },
  {dir:[0,-1,0], corners:[[0,0,0],[1,0,0],[1,0,1],[0,0,1]], uvs:[[0,0],[1,0],[1,1],[0,1]], shade:0.45},
  {dir:[0,0, 1], corners:[[0,0,1],[1,0,1],[1,1,1],[0,1,1]], uvs:[[0,0],[1,0],[1,1],[0,1]], shade:0.8 },
  {dir:[0,0,-1], corners:[[0,0,0],[0,1,0],[1,1,0],[1,0,0]], uvs:[[0,0],[0,1],[1,1],[1,0]], shade:0.8 },
];
const AO_MUL = [0.35, 0.58, 0.77, 1.0];
const INS = 0.02;

/* world.js передаёт через setWorldAPI свои функции, чтобы не было циклов */
let _getBlock=null, _dim=()=>0;
export function setWorldAPI(api){
  _getBlock = api.getBlock;
  _dim = api.getDim;
}

export function buildChunk(c){
  const bx=c.cx*16, bz=c.cz*16, data=c.data;
  const P=[],C=[],U=[],I=[], WP=[],WC=[],WU=[],WI=[];
  const dim=_dim();
  function at(wx,wy,wz){
    if(wy<0) return (dim===2)?0:13;
    if(wy>=72) return 0;
    const lx=wx-bx, lz=wz-bz;
    if(lx>=0&&lx<16&&lz>=0&&lz<16) return data[(wy*16+lz)*16+lx];
    return _getBlock(wx,wy,wz);
  }
  function calcAO(wx,wy,wz,d,cn){
    let ux=0,uy=0,uz=0, vx=0,vy=0,vz=0, n=0;
    for(let i=0;i<3;i++){
      if(d[i]) continue;
      const o = cn[i]?1:-1;
      if(n===0){ if(i===0)ux=o; else if(i===1)uy=o; else uz=o; n=1; }
      else     { if(i===0)vx=o; else if(i===1)vy=o; else vz=o; }
    }
    const ax=wx+d[0], ay=wy+d[1], az=wz+d[2];
    const s1=AOS[at(ax+ux,ay+uy,az+uz)]?1:0;
    const s2=AOS[at(ax+vx,ay+vy,az+vz)]?1:0;
    if(s1&&s2) return 0;
    const co=AOS[at(ax+ux+vx,ay+uy+vy,az+uz+vz)]?1:0;
    return 3-(s1+s2+co);
  }
  function face(P,C,U,I, wx,wy,wz, F, tile, ts, aoOn){
    const base=P.length/3;
    let a0=1,a1=1,a2=1,a3=1;
    if(aoOn){
      a0=AO_MUL[calcAO(wx,wy,wz,F.dir,F.corners[0])];
      a1=AO_MUL[calcAO(wx,wy,wz,F.dir,F.corners[1])];
      a2=AO_MUL[calcAO(wx,wy,wz,F.dir,F.corners[2])];
      a3=AO_MUL[calcAO(wx,wy,wz,F.dir,F.corners[3])];
    }
    const flip = a0+a2 < a1+a3;
    const tu=tile&31, tv=tile>>5;
    const L=[a0,a1,a2,a3];
    for(let i=0;i<4;i++){
      const cn=F.corners[i];
      P.push(wx+cn[0], wy+(cn[1]?ts:0), wz+cn[2]);
      const l=F.shade*L[i];
      C.push(l,l,l);
      U.push((tu+INS+F.uvs[i][0]*(1-2*INS))/32, 1-(tv+INS+(1-F.uvs[i][1])*(1-2*INS))/32);
    }
    if(flip) I.push(base+1,base+2,base+3, base+1,base+3,base);
    else     I.push(base,base+1,base+2, base,base+2,base+3);
  }
  for(let y=0;y<=c.maxY;y++) for(let z=0;z<16;z++) for(let x=0;x<16;x++){
    const b=data[(y*16+z)*16+x];
    if(!b) continue;
    const wx=bx+x, wz=bz+z;
    if(b===B.WATER || b===B.LAVA || b===B.PORTAL){
      const tile = b===B.WATER?8 : b===B.LAVA?29 : 24;
      const ts = (b===B.PORTAL || at(wx,y+1,wz)===b) ? 1 : 0.88;
      for(let f=0;f<6;f++){
        const F=FACES[f];
        const nb=at(wx+F.dir[0], y+F.dir[1], wz+F.dir[2]);
        if(nb===b || OPAQUE[nb]) continue;
        face(WP,WC,WU,WI, wx,y,wz, F, tile, ts, false);
      }
      continue;
    }
    for(let f=0;f<6;f++){
      const F=FACES[f];
      const nb=at(wx+F.dir[0], y+F.dir[1], wz+F.dir[2]);
      let show;
      if(b===B.LEAVES||b===B.BIRCH_LEAVES||b===B.SPRUCE_LEAVES||b===B.ACACIA_LEAVES)
        show = !OPAQUE[nb];
      else if(b===B.GLASS)  show = !OPAQUE[nb] && nb!==B.GLASS;
      else                  show = !OPAQUE[nb];
      if(!show) continue;
      const bl=BLOCKS[b];
      const tile = f===2 ? bl.top : f===3 ? bl.bot : bl.side;
      face(P,C,U,I, wx,y,wz, F, tile, 1, true);
    }
  }
  if(c.mesh){ scene.remove(c.mesh); c.mesh.geometry.dispose(); c.mesh=null; }
  if(c.water){ scene.remove(c.water); c.water.geometry.dispose(); c.water=null; }
  function makeGeo(p,cl,u,i){
    if(!i.length) return null;
    const g=new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(p),3));
    g.setAttribute('color',    new THREE.BufferAttribute(new Float32Array(cl),3));
    g.setAttribute('uv',       new THREE.BufferAttribute(new Float32Array(u),2));
    g.setIndex(new THREE.BufferAttribute(new Uint32Array(i),1));
    g.computeVertexNormals();
    g.computeBoundingSphere();
    return g;
  }
  const g=makeGeo(P,C,U,I);
  if(g){
    c.mesh=new THREE.Mesh(g,opaqueMat);
    c.mesh.castShadow = G.settings.shadows;
    c.mesh.receiveShadow = G.settings.shadows;
    scene.add(c.mesh);
  }
  const wg=makeGeo(WP,WC,WU,WI);
  if(wg){ c.water=new THREE.Mesh(wg,waterMat); scene.add(c.water); }
  c.built=true;
}
export function disposeMeshes(c){
  if(c.mesh){ scene.remove(c.mesh); c.mesh.geometry.dispose(); c.mesh=null; }
  if(c.water){ scene.remove(c.water); c.water.geometry.dispose(); c.water=null; }
  c.built=false;
}
