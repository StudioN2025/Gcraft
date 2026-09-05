import * as THREE from 'three';

/* Всё изменяемое состояние игры в одном объекте G.
   Модули импортируют G и читают/пишут его поля. */

const settings = { sens:1.0, view:IS_TOUCH_DEFAULT(), fov:75, vol:0.8, shadows:!IS_TOUCH_DEFAULT(), bob:true };
try{
  const s = JSON.parse(localStorage.getItem('mcjs_settings')||'null');
  if(s) Object.assign(settings, s);
}catch(e){}
function saveSettings(){ try{ localStorage.setItem('mcjs_settings', JSON.stringify(settings)); }catch(e){} }
function IS_TOUCH_DEFAULT(){
  return (window.matchMedia && matchMedia('(pointer: coarse)').matches)
      || (('ontouchstart' in window) && navigator.maxTouchPoints > 0);
}

export const G = {
  SEED: (Math.random()*2**31)|0,
  settings,
  saveSettings,
  game: { mode:'survival', worldName:'Новый мир' },

  screenState:'title', settingsFrom:'title',
  worldCreated:false, dead:false, playing:false, fallback:false,
  invOpen:false, uiMode:'inv2',
  dim:0, portalCd:0, portalTimer:0, winShown:false,

  VIEW: settings.view,
  FOG_FAR: Math.max(40, settings.view*16-6),
  FOG_NEAR: Math.round(Math.max(40, settings.view*16-6)*0.55),

  yaw:0, pitch:-0.1, lastSpace:-1,
  mouseBtn:[false,false,false],
  lastMine:0, lastPlace:0, lastAtk:0,
  drag:{down:false, moved:false, btn:0, acc:0},

  player:{
    pos:new THREE.Vector3(), vel:new THREE.Vector3(),
    onGround:false, fly:false,
    health:20, air:10, hunger:20,
    lastDamageT:-99, regenAcc:0, drownT:0, voidT:0, starveT:0, lavaT:0,
    falling:false, fallStartY:0
  },
  spawnPos:{x:0.5, y:40, z:0.5},

  worldT:0.3,
  mine:{active:false,x:0,y:0,z:0,progress:0,hitT:0},
  strongholdPos:null,

  inv:new Array(36).fill(null),
  slot:0,
  cursor:null,
  currentScreen:'title',

  joy:{id:null,bx:0,by:0,vx:0,vy:0,mag:0},
  touchLook:{id:null,sx:0,sy:0,lx:0,ly:0,t0:0,moved:false,mining:false,timer:0},

  hudTex:{},
};

export function recalcView(){
  G.VIEW = settings.view;
  G.FOG_FAR = Math.max(40, G.VIEW*16-6);
  G.FOG_NEAR = Math.round(G.FOG_FAR*0.55);
}
