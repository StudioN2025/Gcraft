import * as THREE from 'three';
import { G } from '../core/state.js';
import { mulberry32, clamp } from '../core/utils.js';
import { atlasTex } from './atlas.js';

export const IS_TOUCH = (window.matchMedia && matchMedia('(pointer: coarse)').matches)
              || (('ontouchstart' in window) && navigator.maxTouchPoints > 0);
export const SMALL_TOUCH = IS_TOUCH && Math.min(screen.width||9999, screen.height||9999) < 520;
if (IS_TOUCH) document.body.classList.add('touch-mode');

export const canvas = document.getElementById('game');
export const renderer = new THREE.WebGLRenderer({canvas, antialias:!IS_TOUCH});
renderer.setPixelRatio(Math.min(devicePixelRatio||1, IS_TOUCH ? (SMALL_TOUCH?1.25:1.5) : 1.75));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = G.settings.shadows;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

export const scene = new THREE.Scene();
export const bgColor = new THREE.Color(0.48,0.74,1.0);
scene.background = bgColor;
scene.fog = new THREE.Fog(bgColor.getHex(), G.FOG_NEAR, G.FOG_FAR);

export const camera = new THREE.PerspectiveCamera(G.settings.fov, innerWidth/innerHeight, 0.08, 1400);
camera.rotation.order = 'YXZ';

addEventListener('resize', ()=>{
  camera.aspect = innerWidth/innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
addEventListener('orientationchange', ()=>setTimeout(()=>dispatchEvent(new Event('resize')),150));

export const opaqueMat = new THREE.MeshLambertMaterial({map:atlasTex, vertexColors:true, alphaTest:0.35});
export const waterMat  = new THREE.MeshBasicMaterial({map:atlasTex, vertexColors:true, transparent:true,
                                               opacity:0.78, side:THREE.DoubleSide, depthWrite:false});
export const amb = new THREE.AmbientLight(0xffffff, 0.85); scene.add(amb);
export const sunLight = new THREE.DirectionalLight(0xffffff, 0.5);
sunLight.castShadow = G.settings.shadows;
sunLight.shadow.mapSize.set(IS_TOUCH?1024:2048, IS_TOUCH?1024:2048);
sunLight.shadow.camera.left=-48; sunLight.shadow.camera.right=48;
sunLight.shadow.camera.top=48; sunLight.shadow.camera.bottom=-48;
sunLight.shadow.camera.near=10; sunLight.shadow.camera.far=260;
sunLight.shadow.bias=-0.0004;
sunLight.shadow.normalBias=0.03;
scene.add(sunLight); scene.add(sunLight.target);

export const crackTexs = [];
for(let s=0;s<4;s++){
  const c=document.createElement('canvas'); c.width=c.height=16;
  const ctx=c.getContext('2d');
  const rng=mulberry32(1234+s*77);
  ctx.strokeStyle='rgba(0,0,0,0.85)'; ctx.lineWidth=1;
  for(let i=0;i<3+s*2;i++){
    let x=4+(rng()*8|0), y=4+(rng()*8|0);
    ctx.beginPath(); ctx.moveTo(x,y);
    const steps=3+(rng()*4|0);
    for(let k=0;k<steps;k++){ x+=rng()*6-3; y+=rng()*6-3; ctx.lineTo(clamp(x|0,0,15),clamp(y|0,0,15)); }
    ctx.stroke();
  }
  const t=new THREE.CanvasTexture(c);
  t.magFilter=t.minFilter=THREE.NearestFilter; t.generateMipmaps=false;
  crackTexs.push(t);
}
export const crackMat = new THREE.MeshBasicMaterial({map:crackTexs[0], transparent:true, depthWrite:false,
                                              polygonOffset:true, polygonOffsetFactor:-2});
export const crackMesh = new THREE.Mesh(new THREE.BoxGeometry(1.002,1.002,1.002), crackMat);
crackMesh.visible=false; scene.add(crackMesh);

export const hl = new THREE.LineSegments(
  new THREE.EdgesGeometry(new THREE.BoxGeometry(1.004,1.004,1.004)),
  new THREE.LineBasicMaterial({color:0x000000, transparent:true, opacity:0.55}));
hl.visible=false; scene.add(hl);

export function applyShadows(){
  renderer.shadowMap.enabled=G.settings.shadows;
  sunLight.castShadow=G.settings.shadows;
  opaqueMat.needsUpdate=true;
}

/* ---------- звук ---------- */
let AC=null, noiseBuffer=null, masterGain=null;
export function ac(){
  if(!AC){
    AC=new (window.AudioContext||window.webkitAudioContext)();
    masterGain=AC.createGain();
    masterGain.gain.value=G.settings.vol;
    masterGain.connect(AC.destination);
    const len=AC.sampleRate*0.3;
    noiseBuffer=AC.createBuffer(1,len,AC.sampleRate);
    const d=noiseBuffer.getChannelData(0);
    for(let i=0;i<len;i++) d[i]=Math.random()*2-1;
  }
  if(AC.state==='suspended') AC.resume();
  if(masterGain) masterGain.gain.value=G.settings.vol;
  return AC;
}
export function getMasterGain(){ return masterGain; }
export function sfx(type){
  try{
    const a=ac(), t0=a.currentTime, out=masterGain;
    const noise=(dur,freq,vol,rate)=>{
      const s=a.createBufferSource(); s.buffer=noiseBuffer; s.playbackRate.value=rate;
      const f=a.createBiquadFilter(); f.type='lowpass'; f.frequency.value=freq;
      const g=a.createGain();
      g.gain.setValueAtTime(vol,t0);
      g.gain.exponentialRampToValueAtTime(0.001,t0+dur);
      s.connect(f); f.connect(g); g.connect(out); s.start(t0);
    };
    const tone=(type2,f0,f1,dur,vol)=>{
      const o=a.createOscillator(); o.type=type2;
      o.frequency.setValueAtTime(f0,t0);
      o.frequency.exponentialRampToValueAtTime(Math.max(30,f1),t0+dur);
      const g=a.createGain();
      g.gain.setValueAtTime(vol,t0);
      g.gain.exponentialRampToValueAtTime(0.001,t0+dur);
      o.connect(g); g.connect(out); o.start(t0); o.stop(t0+dur+0.02);
    };
    if(type==='break') noise(0.14, 750+Math.random()*300, 0.4, 0.8+Math.random()*0.4);
    else if(type==='dig') noise(0.05, 1000, 0.14, 1.4);
    else if(type==='step') noise(0.07, 480, 0.13, 0.7+Math.random()*0.5);
    else if(type==='land') noise(0.12, 380, 0.32, 0.55);
    else if(type==='place'){
      tone('triangle',185+Math.random()*40,88,0.1,0.3);
      noise(0.05, 900, 0.1, 1.2);
    }
    else if(type==='pop') tone('square',520,940,0.09,0.16);
    else if(type==='hurt') tone('sawtooth',220,70,0.24,0.32);
    else if(type==='hit') noise(0.08, 1400, 0.3, 1.6);
    else if(type==='eat'){ noise(0.07, 900, 0.28, 0.9); setTimeout(()=>{ try{ noise(0.07, 700, 0.24, 0.8); }catch(e){} },120); }
    else if(type==='splash') noise(0.2, 1200, 0.2, 0.7);
    else if(type==='fizz') noise(0.35, 2200, 0.22, 0.6);
    else if(type==='oink') tone('square',300,190,0.12,0.12);
    else if(type==='moo') tone('sawtooth',165,90,0.4,0.14);
    else if(type==='cluck') tone('square',740,520,0.08,0.1);
    else if(type==='portal'){ noise(0.5, 400, 0.28, 0.35); tone('sine',140,420,0.5,0.14); }
    else if(type==='tp') tone('square',900,180,0.16,0.16);
    else if(type==='roar'){ tone('sawtooth',110,38,0.7,0.3); noise(0.5, 300, 0.2, 0.4); }
    else if(type==='fire') noise(0.16, 700, 0.2, 0.9);
    else if(type==='growl') tone('sawtooth',70,140,0.3,0.12);
  }catch(e){}
}
