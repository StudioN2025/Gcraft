import { G } from '../core/state.js';
import { BLOCKS, ITEMS, nameOf } from '../data/blocks.js';
import { ICON } from '../engine/atlas.js';
import { sfx, applyShadows } from '../engine/renderer.js';

export const hotbarEl=document.getElementById('hotbar');
const itemNameEl=document.getElementById('itemName');
const worldLabelEl=document.getElementById('worldLabel');
const statsEl=document.getElementById('stats');
let toastTimer=null;
export function showToast(msg){
  itemNameEl.textContent=msg;
  itemNameEl.style.opacity=1;
  clearTimeout(toastTimer);
  toastTimer=setTimeout(()=>itemNameEl.style.opacity=0,1600);
}
export const slotEls=[];
for(let i=0;i<9;i++){
  const d=document.createElement('div'); d.className='slot';
  const n=document.createElement('span'); n.className='num'; n.textContent=i+1;
  const img=document.createElement('img'); img.draggable=false; img.style.display='none';
  const cnt=document.createElement('span'); cnt.className='cnt';
  const dur=document.createElement('span'); dur.className='durbar';
  const durFill=document.createElement('i'); dur.append(durFill);
  d.append(n,img,cnt,dur);
  d.addEventListener('click',()=>selectSlot(i));
  hotbarEl.append(d);
  slotEls.push({el:d,img,cnt,dur,durFill});
}
export function renderHotbar(){
  for(let i=0;i<9;i++){
    const s=slotEls[i], it=G.inv[i];
    if(it){
      s.img.src=ICON[it.id]; s.img.style.display='block';
      s.cnt.textContent = (G.game.mode==='survival' && it.count!==Infinity && it.count>1)?it.count:'';
      const tool=ITEMS[it.id]&&ITEMS[it.id].tool;
      if(tool && G.game.mode==='survival' && it.dur!=null){
        s.dur.style.display='block';
        const p=Math.max(0,it.dur/tool.dur);
        s.durFill.style.width=(p*100)+'%';
        s.durFill.style.background = p>0.5?'#57d13b': p>0.25?'#e8c33a':'#e04c3a';
      } else s.dur.style.display='none';
    } else {
      s.img.style.display='none'; s.cnt.textContent=''; s.dur.style.display='none';
    }
    s.el.classList.toggle('sel', i===G.slot);
    if(G.hudTex.hotbar_selection && i===G.slot){
      s.el.style.background=`url(${G.hudTex.hotbar_selection.src}) center/100% 100% no-repeat`;
    } else {
      s.el.style.background='';
    }
  }
}
export function selectSlot(i){
  G.slot=i;
  renderHotbar();
  const it=G.inv[i];
  if(it) showToast(nameOf(it.id));
  if(G.invOpen) window._renderInvUI();
}
const healthEl=document.getElementById('health');
const hungerEl=document.getElementById('hunger');
const airEl=document.getElementById('air');
const heartCvs=[], hungerCvs=[], airCvs=[];
for(let i=0;i<10;i++){
  const c=document.createElement('canvas'); c.width=9; c.height=9;
  healthEl.append(c); heartCvs.push(c);
}
for(let i=0;i<10;i++){
  const c=document.createElement('canvas'); c.width=9; c.height=9;
  hungerEl.append(c); hungerCvs.push(c);
}
for(let i=0;i<10;i++){
  const c=document.createElement('canvas'); c.width=9; c.height=9;
  airEl.append(c); airCvs.push(c);
}
const HEART_MAP=['.XX.XX.','XXXXXXX','XXXXXXX','.XXXXX.','..XXX..','...X...'];
const DRUM_MAP =['.XXXXX.','XXXXXXX','XXXXXXX','.XXXXX.','...XX..','..X....'];
function drawMap(c,map,color,half,accent){
  const ctx=c.getContext('2d');
  for(let y=0;y<6;y++) for(let x=0;x<7;x++){
    if(map[y][x]!=='X') continue;
    const filled = half===2 || (half===1 && x<3.5);
    ctx.fillStyle = filled ? ((x===1&&y===1&&accent)?'#ff9d9d':color) : '#3d3d3d';
    ctx.fillRect(x+1,y+1,1,1);
  }
}
function drawBubble(c,on){
  const ctx=c.getContext('2d');
  if(!on) return;
  for(let y=0;y<9;y++) for(let x=0;x<9;x++){
    const dx=x-4, dy=y-4;
    if(dx*dx+dy*dy<=11){
      ctx.fillStyle = (dx<0&&dy<0) ? '#eaf7ff' : '#8ed1f8';
      ctx.fillRect(x,y,1,1);
    }
  }
}
export function renderHealth(){
  if(G.game.mode!=='survival'){ healthEl.style.display='none'; return; }
  healthEl.style.display='flex';
  for(let i=0;i<10;i++){
    const ctx=heartCvs[i].getContext('2d');
    ctx.clearRect(0,0,9,9);
    const hp=G.player.health;
    const fill = hp>=(i+1)*2?2 : hp===i*2+1?1 : 0;
    if(G.hudTex.container) ctx.drawImage(G.hudTex.container,0,0,9,9);
    else drawMap(heartCvs[i],HEART_MAP,'#3d3d3d',2,false);
    if(fill>0){
      const img = fill===2 ? G.hudTex.full : G.hudTex.half;
      if(img) ctx.drawImage(img,0,0,9,9);
      else drawMap(heartCvs[i],HEART_MAP,'#e33b3b',fill,true);
    }
  }
}
export function renderHunger(){
  if(G.game.mode!=='survival'){ hungerEl.style.display='none'; return; }
  hungerEl.style.display='flex';
  for(let i=0;i<10;i++){
    const ctx=hungerCvs[i].getContext('2d');
    ctx.clearRect(0,0,9,9);
    const hu=G.player.hunger;
    const fill = hu>=(i+1)*2?2 : hu>=i*2+1?1 : 0;
    if(G.hudTex.food_empty) ctx.drawImage(G.hudTex.food_empty,0,0,9,9);
    else drawMap(hungerCvs[i],DRUM_MAP,'#3d3d3d',2,false);
    if(fill>0){
      const img = fill===2 ? G.hudTex.food_full : G.hudTex.food_half;
      if(img) ctx.drawImage(img,0,0,9,9);
      else drawMap(hungerCvs[i],DRUM_MAP,'#b5673a',fill,false);
    }
  }
}
export function renderAir(){
  if(G.game.mode!=='survival' || G.player.air>=9.95){ airEl.style.display='none'; return; }
  airEl.style.display='flex';
  const n=Math.ceil(G.player.air);
  for(let i=0;i<10;i++){
    const ctx=airCvs[i].getContext('2d');
    ctx.clearRect(0,0,9,9);
    if(i<n){
      if(G.hudTex.air) ctx.drawImage(G.hudTex.air,0,0,9,9);
      else drawBubble(airCvs[i],true);
    }
  }
}
const hurtEl=document.getElementById('hurtOverlay');
function flashHurt(){
  hurtEl.style.transition='none'; hurtEl.style.opacity='0.85';
  void hurtEl.offsetWidth;
  hurtEl.style.transition='opacity .55s'; hurtEl.style.opacity='0';
}
export function damage(n,cause){
  if(G.game.mode!=='survival' || G.dead || n<=0) return;
  G.player.health=Math.max(0,G.player.health-n);
  G.player.lastDamageT=performance.now()/1000;
  G.player.regenAcc=0;
  renderHealth(); sfx('hurt'); flashHurt(); window._vibrate && window._vibrate(60);
  if(G.player.health<=0) die(cause);
}
export function addHunger(v){
  if(G.game.mode!=='survival') return;
  G.player.hunger=clampH(G.player.hunger+v, 0, 20);
  renderHunger();
}
function clampH(v,a,b){ return v<a?a : v>b?b : v; }
const deathEl=document.getElementById('death');
const deathCauseEl=document.getElementById('deathCause');
function die(cause){
  G.dead=true; G.playing=false; G.invOpen=false;
  deathCauseEl.textContent = cause ? 'Причина: '+cause : '';
  refreshScreens();
  if(document.pointerLockElement) document.exitPointerLock();
}
export function updateWorldLabel(){
  const DIM_NAMES = ['Обычный мир','Ад','Энд'];
  worldLabelEl.textContent = G.game.worldName+'\n'+(G.game.mode==='survival'?'Выживание':'Творческий')+'\n'+DIM_NAMES[G.dim];
}
let fpsFrames=0, fpsTime=0, fpsVal=0, statTimer=0;
export function updateHUD(dt){
  fpsFrames++; fpsTime+=dt;
  if(fpsTime>=0.5){ fpsVal=Math.round(fpsFrames/fpsTime); fpsFrames=0; fpsTime=0; }
  statTimer+=dt;
  if(statTimer<0.25) return;
  statTimer=0;
  const wt=(G.worldT*24+6)%24;
  const hh=String(Math.floor(wt)).padStart(2,'0');
  const mm=String(Math.floor((wt%1)*60)).padStart(2,'0');
  const biome = window._biomeAt && G.dim===0 ? window._biomeAt(Math.floor(G.player.pos.x),Math.floor(G.player.pos.z)) : null;
  const DIM_NAMES = ['Обычный мир','Ад','Энд'];
  statsEl.textContent =
    `XYZ: ${G.player.pos.x.toFixed(0)} / ${G.player.pos.y.toFixed(0)} / ${G.player.pos.z.toFixed(0)}`+
    `\nFPS: ${fpsVal}   Время: ${hh}:${mm}`+
    (biome?`\nБиом: ${window._biomeRu(biome)}`:'')+
    `\n${DIM_NAMES[G.dim]}   Сид: ${G.SEED}`;
}
function refreshScreens(){ window._refreshScreens(); }
