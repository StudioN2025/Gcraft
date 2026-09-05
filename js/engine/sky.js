import * as THREE from 'three';
import { G } from '../core/state.js';
import { fbm } from '../core/utils.js';
import { scene, camera, bgColor, sunLight, amb, waterMat } from './renderer.js';
import { B } from '../data/blocks.js';

let chunksRef=null, dimRef=()=>0;
export function bindWorldRefs(r){ chunksRef=r.chunks; dimRef=r.getDim; }

export const sky = new THREE.Group(); scene.add(sky);
{
  const sun = new THREE.Mesh(new THREE.PlaneGeometry(36,36),
    new THREE.MeshBasicMaterial({color:0xffdf6b, fog:false, side:THREE.DoubleSide, depthWrite:false}));
  sun.position.set(420,0,0); sun.rotation.y=-Math.PI/2; sky.add(sun);
  const moon = new THREE.Mesh(new THREE.PlaneGeometry(26,26),
    new THREE.MeshBasicMaterial({color:0xdfe4f2, fog:false, side:THREE.DoubleSide, depthWrite:false}));
  moon.position.set(-420,0,0); moon.rotation.y=Math.PI/2; sky.add(moon);
}
export const starsMat = new THREE.PointsMaterial({color:0xffffff, size:1.8, sizeAttenuation:false,
                                           transparent:true, opacity:0, fog:false, depthWrite:false});
{
  const sp=[];
  for(let i=0;i<380;i++){
    const v=new THREE.Vector3(Math.random()*2-1,Math.random()*2-1,Math.random()*2-1).normalize().multiplyScalar(430);
    sp.push(v.x,v.y,v.z);
  }
  const g=new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(sp),3));
  sky.add(new THREE.Points(g, starsMat));
}
const cloudMat = new THREE.MeshBasicMaterial({transparent:true, opacity:0.55, depthWrite:false, side:THREE.DoubleSide});
let cloudTex = null;
export function rebuildClouds(){
  const cnv=document.createElement('canvas'); cnv.width=cnv.height=128;
  const ctx=cnv.getContext('2d'); const img=ctx.createImageData(128,128);
  const S=(x,y)=>fbm(x*0.09+7000,y*0.09-7000,3);
  for(let y=0;y<128;y++) for(let x=0;x<128;x++){
    const wx=x/128, wy=y/128;
    const v=( S(x,y)*(1-wx)*(1-wy) + S(x-128,y)*wx*(1-wy)
           +  S(x,y-128)*(1-wx)*wy + S(x-128,y-128)*wx*wy );
    const i=(y*128+x)*4;
    img.data[i]=img.data[i+1]=img.data[i+2]=255;
    img.data[i+3]=v>0.565?255:0;
  }
  ctx.putImageData(img,0,0);
  if(cloudTex) cloudTex.dispose();
  cloudTex=new THREE.CanvasTexture(cnv);
  cloudTex.magFilter=cloudTex.minFilter=THREE.NearestFilter; cloudTex.generateMipmaps=false;
  cloudTex.wrapS=cloudTex.wrapT=THREE.RepeatWrapping; cloudTex.repeat.set(2,2);
  cloudMat.map=cloudTex; cloudMat.needsUpdate=true;
}
export const clouds = new THREE.Mesh(new THREE.PlaneGeometry(2048,2048), cloudMat);
clouds.rotation.x=-Math.PI/2; clouds.position.y=84; scene.add(clouds);

const dayTop=new THREE.Color(0.48,0.74,1.0), nightTop=new THREE.Color(0.013,0.02,0.055);
const sunsetC=new THREE.Color(1.0,0.52,0.28);
const dayLight=new THREE.Color(1,1,1), nightLight=new THREE.Color(0.14,0.17,0.30);
const skyC=new THREE.Color(), lightC=new THREE.Color();
const waterFog=new THREE.Color(0.04,0.18,0.42);
const netherBg=new THREE.Color(0.16,0.035,0.02);
const netherFog=new THREE.Color(0.22,0.05,0.02);
const endBg=new THREE.Color(0.012,0.01,0.022);

function getBlockLocal(x,y,z){
  if(y<0||y>=72) return 0;
  const c=chunksRef().get(Math.floor(x)>>4===0?0:0);
  // delegate через world api
  return _gb(x,y,z);
}
let _gb=(x,y,z)=>0;
export function setGetBlock(fn){ _gb=fn; }

export function updateSky(dt){
  const a=G.worldT*Math.PI*2;
  const elev=Math.sin(a);
  let dl=clamp((elev+0.1)/0.25,0,1);
  const daylight=dl*dl*(3-2*dl);
  const sunset=Math.max(0,1-Math.abs(elev)/0.28);
  const uw=_gb(Math.floor(camera.position.x),Math.floor(camera.position.y),Math.floor(camera.position.z));
  const FOG_NEAR=G.FOG_NEAR, FOG_FAR=G.FOG_FAR;
  let fogN=FOG_NEAR, fogF=FOG_FAR;
  const dim=dimRef();
  if(dim===1){
    skyC.copy(netherBg);
    lightC.setRGB(1.0,0.82,0.7);
    if(uw===B.LAVA){
      bgColor.setRGB(0.45,0.1,0.02);
      scene.fog.color.copy(bgColor); fogN=1; fogF=6;
      document.getElementById('lavaOverlay').style.display='block';
    } else {
      bgColor.copy(skyC);
      scene.fog.color.copy(netherFog); fogN=8; fogF=FOG_FAR+8;
      document.getElementById('lavaOverlay').style.display='none';
    }
    document.getElementById('waterOverlay').style.display='none';
  } else if(dim===2){
    skyC.copy(endBg);
    lightC.setRGB(0.75,0.7,0.85);
    bgColor.copy(skyC);
    scene.fog.color.copy(skyC); fogN=30; fogF=FOG_FAR+40;
    document.getElementById('waterOverlay').style.display='none';
    document.getElementById('lavaOverlay').style.display='none';
  } else {
    skyC.copy(nightTop).lerp(dayTop,daylight).lerp(sunsetC,sunset*0.5);
    lightC.copy(nightLight).lerp(dayLight,daylight).lerp(sunsetC,sunset*0.18);
    if(uw===B.WATER){
      bgColor.copy(waterFog);
      scene.fog.color.copy(waterFog); fogN=2; fogF=20;
      document.getElementById('waterOverlay').style.display='block';
      document.getElementById('lavaOverlay').style.display='none';
    } else if(uw===B.LAVA){
      bgColor.setRGB(0.45,0.1,0.02);
      scene.fog.color.copy(bgColor); fogN=1; fogF=6;
      document.getElementById('lavaOverlay').style.display='block';
      document.getElementById('waterOverlay').style.display='none';
    } else {
      bgColor.copy(skyC);
      scene.fog.color.copy(skyC);
      document.getElementById('waterOverlay').style.display='none';
      document.getElementById('lavaOverlay').style.display='none';
    }
  }
  scene.fog.near=fogN; scene.fog.far=fogF;
  amb.color.copy(lightC);
  amb.intensity = dim===1?0.8 : dim===2?0.75 : 0.42+0.42*daylight;
  sunLight.color.copy(lightC);
  sunLight.intensity = dim===1?0.3 : dim===2?0.35 : 0.12+0.75*daylight;
  const shDirY = dim===0 ? Math.max(20, Math.sin(a)*80) : 60;
  sunLight.position.set(
    camera.position.x+Math.cos(a)*70,
    camera.position.y+shDirY,
    camera.position.z+40);
  sunLight.target.position.copy(camera.position);
  sunLight.target.updateMatrixWorld();
  sunLight.castShadow = G.settings.shadows && daylight>0.05;
  waterMat.color.copy(lightC);
  cloudMat.color.setScalar(0.35+0.65*daylight);
  sky.visible = dim===0;
  clouds.visible = dim===0;
  sky.position.copy(camera.position);
  sky.rotation.z=a;
  starsMat.opacity = dim===0 ? (1-daylight)*0.85 : dim===2 ? 0.9 : 0;
  const drift=performance.now()/1000*1.4;
  clouds.position.x=Math.round((camera.position.x-drift)/1024)*1024+drift;
  clouds.position.z=Math.round(camera.position.z/1024)*1024;
  clouds.position.y=84;
}
