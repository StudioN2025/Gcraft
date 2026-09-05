import { G } from '../core/state.js';
import { BLOCKS, ITEMS, RECIPES, SMELT, SMELT_T, FUEL, nameOf, isStackable, isTool } from '../data/blocks.js';
import { ICON } from '../engine/atlas.js';
import { sfx } from '../engine/renderer.js';
import { renderHotbar, showToast } from '../ui/hud.js';
import { refreshScreens, lockPointer } from '../ui/screens.js';

const invScreenEl=document.getElementById('invScreen');
const invTitleEl=document.getElementById('invTitle');
const invStorageEl=document.getElementById('invStorage');
const invHotbarEl=document.getElementById('invHotbar');
const craftGridEl=document.getElementById('craftGrid');
const craftOutEl=document.getElementById('craftOut');
const craftAreaEl=document.getElementById('craftArea');
const furnAreaEl=document.getElementById('furnArea');
const chestAreaEl=document.getElementById('chestArea');
const chestGridEl=document.getElementById('chestGrid');
const flameFillEl=document.getElementById('flameFill');
const arrowFillEl=document.getElementById('arrowFill');
const creativePalEl=document.getElementById('creativePal');
const cursorEl=document.getElementById('cursorItem');
const cursorImg=cursorEl.querySelector('img');
const cursorCnt=cursorEl.querySelector('.cnt');

export const furnaces = new Map();
export const chests = new Map();
export let furnCur=null, furnKeyCur=null, chestCur=null, chestKeyCur=null;
export function tickFurnaces(dt){
  for(const f of furnaces.values()){
    const rec = f.inp ? SMELT[f.inp.id] : null;
    const canOut = rec && (!f.out || (f.out.id===rec && f.out.count<64));
    if(f.burn>0) f.burn-=dt;
    if(canOut){
      if(f.burn<=0 && f.fuel && FUEL[f.fuel.id]){
        f.burnMax=FUEL[f.fuel.id];
        f.burn=f.burnMax;
        if(f.fuel.count!==Infinity){
          f.fuel.count--;
          if(f.fuel.count<=0) f.fuel=null;
        }
      }
      if(f.burn>0){
        f.prog+=dt;
        if(f.prog>=SMELT_T){
          f.prog=0;
          if(f.out) f.out.count++;
          else f.out={id:rec,count:1};
          if(f.inp.count!==Infinity){
            f.inp.count--;
            if(f.inp.count<=0) f.inp=null;
          }
        }
      } else f.prog=Math.max(0,f.prog-dt);
    } else f.prog=Math.max(0,f.prog-dt);
  }
}
export function getFurnaces(){ return furnaces; }
export function getChests(){ return chests; }
export function getFurnKeys(){ return {cur:furnCur, key:furnKeyCur}; }
export function getChestKeys(){ return {cur:chestCur, key:chestKeyCur}; }

document.addEventListener('pointermove',e=>{
  cursorEl.style.left=(e.clientX-22)+'px';
  cursorEl.style.top =(e.clientY-22)+'px';
});
function renderCursor(){
  if(G.cursor){
    cursorImg.src=ICON[G.cursor.id];
    cursorCnt.textContent = G.cursor.count===Infinity?'∞':(G.cursor.count>1?G.cursor.count:'');
    cursorEl.style.display='block';
  } else cursorEl.style.display='none';
}
export function renderCursorItem(){ renderCursor(); }
function mkSlotEl(){
  const el=document.createElement('div'); el.className='slotInv';
  const img=document.createElement('img'); img.draggable=false;
  const cnt=document.createElement('span'); cnt.className='cnt';
  const dur=document.createElement('span'); dur.className='durbar';
  const durFill=document.createElement('i');
  dur.append(durFill);
  el.append(img,cnt,dur);
  return {el,img,cnt,dur,durFill};
}
function fillSlotEl(s,it){
  if(it){
    s.img.src=ICON[it.id]; s.img.style.display='block';
    s.cnt.textContent = it.count===Infinity?'∞':(it.count>1?it.count:'');
    const tool=ITEMS[it.id]&&ITEMS[it.id].tool;
    if(tool && it.dur!=null){
      s.dur.style.display='block';
      const p=Math.max(0,it.dur/tool.dur);
      s.durFill.style.width=(p*100)+'%';
      s.durFill.style.background = p>0.5?'#4fae35': p>0.25?'#d8b23a':'#c4432f';
    } else s.dur.style.display='none';
  } else {
    s.img.style.display='none'; s.cnt.textContent=''; s.dur.style.display='none';
  }
}
function clickSlot(arr,i){
  const it=arr[i];
  if(G.cursor){
    if(!it){ arr[i]=G.cursor; G.cursor=null; }
    else if(it.id===G.cursor.id && isStackable(it.id) && it.count<64){
      const move=Math.min(G.cursor.count===Infinity?64:G.cursor.count, 64-it.count);
      it.count+=move;
      if(G.cursor.count!==Infinity){
        G.cursor.count-=move;
        if(G.cursor.count<=0) G.cursor=null;
      } else G.cursor=null;
    } else { arr[i]=G.cursor; G.cursor=null; }
  } else if(it){ G.cursor=it; arr[i]=null; }
}
function rightClickSlot(arr,i){
  const it=arr[i];
  if(G.cursor){
    if(!it){
      arr[i]={id:G.cursor.id,count:1,...(G.cursor.dur!=null?{dur:G.cursor.dur}:{})};
      if(G.cursor.count!==Infinity){ G.cursor.count--; if(G.cursor.count<=0) G.cursor=null; }
      else G.cursor=null;
    }
    else if(it.id===G.cursor.id && isStackable(it.id) && it.count<64){
      it.count++;
      if(G.cursor.count!==Infinity){ G.cursor.count--; if(G.cursor.count<=0) G.cursor=null; }
    }
  } else if(it && it.count>1){
    const half=Math.ceil(it.count/2);
    G.cursor={id:it.id,count:half};
    it.count-=half;
    if(it.count<=0) arr[i]=null;
  } else if(it){ G.cursor=it; arr[i]=null; }
}
function fillGrid(container, arr, idxs, creativeHotbar, palette){
  container.innerHTML='';
  for(const i of idxs){
    const s=mkSlotEl();
    if(creativeHotbar){ fillSlotEl(s, arr[i]); }
    else fillSlotEl(s, arr[i]);
    s.el.addEventListener('click',e=>{
      e.stopPropagation();
      if(creativeHotbar){ window._selectSlot(i); renderInvUI(); return; }
      clickSlot(arr,i); updateCraftResult(); renderInvUI();
    });
    s.el.addEventListener('contextmenu',e=>{
      e.preventDefault(); e.stopPropagation();
      if(creativeHotbar) return;
      rightClickSlot(arr,i); updateCraftResult(); renderInvUI();
    });
    container.append(s.el);
  }
}
function patEq(rows,pat){
  if(pat.length!==rows.length) return false;
  for(let i=0;i<pat.length;i++){
    if(pat[i].length!==rows[i].length) return false;
    for(let j=0;j<pat[i].length;j++)
      if((pat[i][j]||0)!==rows[i][j]) return false;
  }
  return true;
}
const mirrorPat = pat => pat.map(r=>[...r].reverse());
function gridMatch(size){
  const rows=[];
  for(let r=0;r<size;r++){
    const row=[];
    for(let c=0;c<size;c++){
      const it=window._craftGrid[r*3+c];
      row.push(it?it.id:0);
    }
    rows.push(row);
  }
  while(rows.length && rows[0].every(v=>!v)) rows.shift();
  while(rows.length && rows[rows.length-1].every(v=>!v)) rows.pop();
  if(!rows.length) return null;
  while(rows.every(r=>!r[0])) rows.forEach(r=>r.shift());
  while(rows.every(r=>!r[r.length-1])) rows.forEach(r=>r.pop());
  for(const rec of RECIPES){
    if(rec.any){
      const ids=[];
      rows.forEach(r=>r.forEach(v=>{ if(v) ids.push(v); }));
      if(ids.length!==rec.any.length) continue;
      const a=[...ids].sort(), b=[...rec.any].sort();
      if(a.every((v,i)=>v===b[i])) return rec;
    } else {
      if(patEq(rows,rec.pattern)||patEq(rows,mirrorPat(rec.pattern))) return rec;
    }
  }
  return null;
}
function updateCraftResult(){
  window._craftResult = G.game.mode==='survival' ? gridMatch(window._craftSize) : null;
}
function returnGridToInv(){
  for(let i=0;i<9;i++){
    if(window._craftGrid[i]){
      window._addItem(window._craftGrid[i].id, window._craftGrid[i].count, window._craftGrid[i].dur);
      window._craftGrid[i]=null;
    }
  }
}
function takeCraftResult(){
  if(!window._craftResult) return;
  const rec=window._craftResult;
  const isT=isTool(rec.out);
  const made = isT ? {id:rec.out,count:1,dur:ITEMS[rec.out].tool.dur}
                   : {id:rec.out,count:rec.n};
  if(G.cursor){
    if(G.cursor.id!==rec.out || !isStackable(rec.out) || G.cursor.count+rec.n>64) return;
    G.cursor.count+=rec.n;
  } else G.cursor=made;
  for(let i=0;i<9;i++){
    const it=window._craftGrid[i];
    if(it){ it.count--; if(it.count<=0) window._craftGrid[i]=null; }
  }
  updateCraftResult(); renderInvUI(); sfx('pop');
}
export function renderInvUI(){
  const creative = G.uiMode!=='furnace' && G.uiMode!=='chest' && G.game.mode==='creative';
  invTitleEl.textContent =
    G.uiMode==='furnace' ? 'Печь' :
    G.uiMode==='chest' ? 'Сундук' :
    creative ? 'Творческий режим' :
    (window._craftSize===3?'Верстак':'Инвентарь');
  craftAreaEl.style.display   = (!creative && G.uiMode!=='furnace' && G.uiMode!=='chest') ? 'flex' : 'none';
  furnAreaEl.style.display    = G.uiMode==='furnace' ? 'flex' : 'none';
  chestAreaEl.style.display   = G.uiMode==='chest' ? 'block' : 'none';
  invStorageEl.style.display  = creative ? 'none' : 'grid';
  creativePalEl.style.display = creative ? 'grid' : 'none';
  if(!creative && G.uiMode!=='furnace' && G.uiMode!=='chest'){
    fillGrid(invStorageEl, G.inv, Array.from({length:27},(_,k)=>k+9), false);
    craftGridEl.innerHTML='';
    craftGridEl.style.gridTemplateColumns = `repeat(${window._craftSize}, var(--sl))`;
    const cells = window._craftSize===3 ? [0,1,2,3,4,5,6,7,8] : [0,1,3,4];
    for(const i of cells){
      const s=mkSlotEl();
      fillSlotEl(s, window._craftGrid[i]);
      s.el.addEventListener('click',e=>{
        e.stopPropagation();
        clickSlot(window._craftGrid,i); updateCraftResult(); renderInvUI();
      });
      s.el.addEventListener('contextmenu',e=>{
        e.preventDefault(); e.stopPropagation();
        rightClickSlot(window._craftGrid,i); updateCraftResult(); renderInvUI();
      });
      craftGridEl.append(s.el);
    }
    craftOutEl.innerHTML='';
    const so=mkSlotEl(); so.el.id='craftOutSlot';
    fillSlotEl(so, window._craftResult?{id:window._craftResult.out,count:window._craftResult.n}:null);
    so.el.addEventListener('click',e=>{ e.stopPropagation(); takeCraftResult(); });
    craftOutEl.append(so.el);
  } else if(G.uiMode==='furnace'){
    fillGrid(invStorageEl, G.inv, Array.from({length:27},(_,k)=>k+9), false);
  } else if(G.uiMode==='chest'){
    fillGrid(invStorageEl, G.inv, Array.from({length:27},(_,k)=>k+9), false);
    fillGrid(chestGridEl, chestCur, Array.from({length:27},(_,k)=>k), false);
  } else {
    buildCreativePal();
  }
  fillGrid(invHotbarEl, G.inv, [0,1,2,3,4,5,6,7,8], creative);
  renderHotbar(); renderCursor();
}
function buildCreativePal(){
  creativePalEl.innerHTML='';
  for(const id of window._PALETTE){
    const s=mkSlotEl();
    fillSlotEl(s,{id,count:1});
    s.el.title=nameOf(id);
    s.el.addEventListener('click',e=>{
      e.stopPropagation();
      const tool=ITEMS[id]&&ITEMS[id].tool;
      G.inv[G.slot] = tool ? {id,count:1,dur:tool.dur} : {id,count:Infinity};
      sfx('pop');
      showToast(nameOf(id)+' → слот '+(G.slot+1));
      renderInvUI();
    });
    creativePalEl.append(s.el);
  }
}
function resetUIInputs(){
  for(const k in (window._keys||{})) window._keys[k]=false;
  G.mouseBtn[0]=G.mouseBtn[2]=false; G.drag.down=false;
  window._joyHide && window._joyHide();
  clearTimeout(G.touchLook.timer); G.touchLook.id=null; G.touchLook.mining=false;
  document.querySelectorAll('.tbtn.pressed').forEach(b=>b.classList.remove('pressed'));
}
export function openInventory(size=2){
  if(G.dead) return;
  G.uiMode = size===3?'table':'inv2';
  G.invOpen=true;
  window._craftSize=size;
  window._craftGrid=new Array(9).fill(null);
  window._craftResult=null; G.cursor=null;
  resetUIInputs();
  if(document.pointerLockElement) document.exitPointerLock();
  refreshScreens(); renderInvUI();
}
export function openFurnace(key){
  if(G.dead) return;
  let f=furnaces.get(key);
  if(!f){ f={inp:null,fuel:null,out:null,burn:0,burnMax:0,prog:0}; furnaces.set(key,f); }
  furnCur=f; furnKeyCur=key;
  G.uiMode='furnace';
  G.invOpen=true; G.cursor=null;
  resetUIInputs();
  if(document.pointerLockElement) document.exitPointerLock();
  refreshScreens(); renderInvUI();
}
export function openChest(key){
  if(G.dead) return;
  let arr=chests.get(key);
  if(!arr){ arr=new Array(27).fill(null); chests.set(key,arr); }
  chestCur=arr; chestKeyCur=key;
  G.uiMode='chest';
  G.invOpen=true; G.cursor=null;
  resetUIInputs();
  if(document.pointerLockElement) document.exitPointerLock();
  refreshScreens(); renderInvUI();
}
export function closeInventory(relock=true){
  returnGridToInv();
  if(G.cursor){ window._addItem(G.cursor.id, G.cursor.count, G.cursor.dur); G.cursor=null; }
  G.invOpen=false; furnCur=null; furnKeyCur=null; chestCur=null; chestKeyCur=null;
  refreshScreens();
  if(relock && G.screenState==='game') lockPointer();
}
invScreenEl.addEventListener('click',e=>{
  if(e.target===invScreenEl) closeInventory();
});
document.getElementById('invClose').addEventListener('click',()=>closeInventory());

const finSlot=mkSlotEl(), ffuelSlot=mkSlotEl(), foutSlot=mkSlotEl();
document.getElementById('finWrap').append(finSlot.el);
document.getElementById('ffuelWrap').append(ffuelSlot.el);
document.getElementById('foutWrap').append(foutSlot.el);
function furnGet(kind){ return kind==='in'?furnCur.inp : kind==='fuel'?furnCur.fuel : furnCur.out; }
function furnSet(kind,v){ if(kind==='in')furnCur.inp=v; else if(kind==='fuel')furnCur.fuel=v; else furnCur.out=v; }
function slotClickFurn(kind, right){
  if(!furnCur) return;
  if(kind==='out'){
    const it=furnGet('out');
    if(!it) return;
    if(!G.cursor){ G.cursor=it; furnSet('out',null); }
    else if(G.cursor.id===it.id && isStackable(it.id) && G.cursor.count+it.count<=64){
      G.cursor.count+=it.count; furnSet('out',null);
    }
    renderInvUI(); return;
  }
  if(right){
    if(G.cursor){
      const it=furnGet(kind);
      if(!it){
        furnSet(kind,{id:G.cursor.id,count:1,...(G.cursor.dur!=null?{dur:G.cursor.dur}:{})});
        if(G.cursor.count!==Infinity){ G.cursor.count--; if(G.cursor.count<=0) G.cursor=null; }
        else G.cursor=null;
      }
      else if(it.id===G.cursor.id && isStackable(it.id) && it.count<64){
        it.count++;
        if(G.cursor.count!==Infinity){ G.cursor.count--; if(G.cursor.count<=0) G.cursor=null; }
      }
    } else {
      const it=furnGet(kind);
      if(it && it.count>1){
        const h=Math.ceil(it.count/2);
        G.cursor={id:it.id,count:h};
        it.count-=h;
        if(it.count<=0) furnSet(kind,null);
      } else if(it){ G.cursor=it; furnSet(kind,null); }
    }
  } else {
    const it=furnGet(kind);
    if(G.cursor){
      if(!it){ furnSet(kind,G.cursor); G.cursor=null; }
      else if(it.id===G.cursor.id && isStackable(it.id) && it.count<64){
        const mv=Math.min(G.cursor.count===Infinity?64:G.cursor.count, 64-it.count);
        it.count+=mv;
        if(G.cursor.count!==Infinity){ G.cursor.count-=mv; if(G.cursor.count<=0) G.cursor=null; }
        else G.cursor=null;
      } else { furnSet(kind,G.cursor); G.cursor=null; }
    } else if(it){ G.cursor=it; furnSet(kind,null); }
  }
  renderInvUI();
}
finSlot.el.addEventListener('click',e=>{ e.stopPropagation(); slotClickFurn('in',false); });
finSlot.el.addEventListener('contextmenu',e=>{ e.preventDefault(); e.stopPropagation(); slotClickFurn('in',true); });
ffuelSlot.el.addEventListener('click',e=>{ e.stopPropagation(); slotClickFurn('fuel',false); });
ffuelSlot.el.addEventListener('contextmenu',e=>{ e.preventDefault(); e.stopPropagation(); slotClickFurn('fuel',true); });
foutSlot.el.addEventListener('click',e=>{ e.stopPropagation(); slotClickFurn('out',false); });
export function renderFurnaceUI(){
  if(!furnCur) return;
  fillSlotEl(finSlot, furnCur.inp);
  fillSlotEl(ffuelSlot, furnCur.fuel);
  fillSlotEl(foutSlot, furnCur.out);
  flameFillEl.style.height = furnCur.burnMax ? (clamp(furnCur.burn/furnCur.burnMax,0,1)*100)+'%' : '0%';
  arrowFillEl.style.width = (clamp(furnCur.prog/SMELT_T,0,1)*100)+'%';
}
function clamp(v,a,b){ return v<a?a : v>b?b : v; }
