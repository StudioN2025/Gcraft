import * as THREE from 'three';
import { G } from '../core/state.js';
import { clamp, hash2s, hash3, mulberry32 } from '../core/utils.js';
import { BLOCKS } from '../data/blocks.js';
import { bindAtlasInternals, applyModTextures, bindAtlasFns } from '../data/mods.js';
import { buildItemIcons } from './itemIcons.js';

export const atlas = document.createElement('canvas');
atlas.width = atlas.height = 512;
export const actx2d = atlas.getContext('2d');
export const AVG = [];
export const ICON = {};
export const ICONC = {};
const P8 = v => clamp(v|0, 0, 255);

bindAtlasInternals({ atlas2d:actx2d, mulberry32, AVG, ICON, ICONC });

export function setTile(tile, fn){
  const tx=(tile&31)*16, ty=(tile>>5)*16;
  const rng = mulberry32(G.SEED ^ (tile*7919 + 13));
  for(let y=0;y<16;y++) for(let x=0;x<16;x++){
    const c = fn(x,y,rng);
    actx2d.fillStyle=`rgb(${c[0]|0},${c[1]|0},${c[2]|0})`;
    actx2d.globalAlpha = c.length>3 ? c[3]/255 : 1;
    actx2d.fillRect(tx+x,ty+y,1,1);
  }
  actx2d.globalAlpha=1;
}
export function buildAtlas(){
  actx2d.clearRect(0,0,512,512);
  drawBaseTiles();
  if(atlasTex) atlasTex.needsUpdate = true;
  applyModTextures();
  buildIcons();
  buildItemIcons();
}
function drawBaseTiles(){
  setTile(0,(x,y,r)=>{ const v=r(); return [P8(84+v*38), P8(146+v*48), P8(54+v*30)]; });
  {
    const rr = mulberry32(G.SEED ^ 0xA17);
    const gd = Array.from({length:16}, ()=> 2 + (rr()*3|0));
    setTile(1,(x,y,r)=>{
      const v=r();
      if (y < gd[x]) return [P8(84+v*38), P8(146+v*48), P8(54+v*30)];
      return [P8(122+v*32), P8(86+v*26), P8(58+v*20)];
    });
  }
  setTile(2,(x,y,r)=>{ const v=r(); return r()<0.06 ? [92,92,96] : [P8(122+v*34), P8(86+v*26), P8(58+v*20)]; });
  setTile(3,(x,y,r)=>{ const v=r(); const g=P8(112+v*34-(r()<0.08?28:0)); return [g,g,g+3]; });
  setTile(4,(x,y,r)=>{ const v=r(); return [P8(210+v*20), P8(196+v*18), P8(148+v*18)]; });
  setTile(5,(x,y,r)=>{ const v=r(); const b=(x%4<2)?-16:9;
    return [P8(108+b+v*14), P8(83+b*0.7+v*10), P8(49+b*0.5+v*8)]; });
  setTile(6,(x,y,r)=>{ const d=Math.max(Math.abs(x-7.5),Math.abs(y-7.5)); const v=r();
    if(d>6.5) return [P8(104+v*14), P8(79+v*10), P8(46+v*8)];
    return ((d|0)%2) ? [P8(172+v*14),P8(138+v*12),P8(86+v*10)] : [P8(143+v*12),P8(112+v*10),P8(66+v*8)]; });
  setTile(7,(x,y,r)=>{ const v=r(); return r()<0.24 ? [40,86,32] : [P8(52+v*30), P8(108+v*42), P8(36+v*24)]; });
  setTile(8,(x,y,r)=>{ const v=r(); const w=((y+((x/4)|0))%8<1)?14:0;
    return [P8(44+v*14+w), P8(94+v*24+w), P8(188+v*28+w)]; });
  setTile(9,(x,y,r)=>{ const v=r();
    if(y%4===3) return [96+v*10,72+v*8,42+v*6];
    if(x===((y>>2)*5+3)%16) return [110,84,50];
    return [P8(166+v*24), P8(130+v*18), P8(80+v*14)]; });
  setTile(10,(x,y,r)=>{ const v=r(); const border=(x%4===0||y%4===0);
    const cell=hash2s(x>>2,y>>2,99)*26-13; const g=P8(border?70+v*14:116+v*22+cell);
    return [g,g,g]; });
  setTile(11,(x,y,r)=>{
    if(x===0||y===0||x===15||y===15) return [208,230,240,255];
    if((x-y===4||x-y===5)&&x<12) return [238,246,250,255];
    return [0,0,0,0];
  });
  setTile(12,(x,y,r)=>{ const v=r(); const row=y>>2; const off=(row%2)?4:0;
    if(y%4===3 || (x+off)%8===0) return [184+v*10,178+v*10,170+v*10];
    return [P8(146+v*24), P8(66+v*14), P8(56+v*12)]; });
  setTile(13,(x,y,r)=>{ const v=r(); return [P8(234+v*18), P8(240+v*14), P8(247+v*8)]; });
  setTile(14,(x,y,r)=>{ const v=r(); const g=v<0.35?P8(40+v*20):v<0.75?P8(62+v*18):P8(92+v*20); return [g,g,g]; });
  setTile(15,(x,y,r)=>{ const v=r();
    if(x<1||x>14||y<1||y>14) return [P8(94+v*10),P8(64+v*8),P8(34+v*6)];
    if(x===5||x===10||y===5||y===10) return [P8(112+v*12),P8(82+v*10),P8(48+v*8)];
    return [P8(152+v*22),P8(116+v*18),P8(72+v*14)]; });
  setTile(16,(x,y,r)=>{ const v=r(); let g=P8(112+v*34-(r()<0.08?28:0));
    if(hash3(x>>1,y>>1,x*7+y)<0.22) g=P8(18+v*26);
    return [g,g,g+2]; });
  setTile(17,(x,y,r)=>{ const v=r(); let g=P8(112+v*34-(r()<0.08?28:0));
    if(hash3(x>>1,y>>1,x*5+y*3)<0.22) return [P8(206+v*24),P8(158+v*20),P8(126+v*16)];
    return [g,g,g+2]; });
  setTile(18,(x,y,r)=>{ const v=r();
    if(x===0||x===15||y===0||y===15) return [P8(72+v*12),P8(72+v*12),P8(74+v*12)];
    if(y>=9&&y<=13&&x>=4&&x<=11) return [P8(20+v*12),P8(18+v*10),P8(16+v*10)];
    if(y===8&&x>=4&&x<=11) return [46,46,48];
    const g=P8(116+v*22); return [g,g,g+2]; });
  setTile(19,(x,y,r)=>{ const v=r(); let g=P8(112+v*34-(r()<0.08?28:0));
    if(hash3(x>>1,y>>1,x*3+y*11)<0.20) return [P8(70+v*30),P8(220+v*30),P8(216+v*30)];
    return [g,g,g+2]; });
  setTile(20,(x,y,r)=>{ const v=r();
    if(x<1||x>14||y<1||y>14) return [P8(90+v*14),P8(66+v*10),P8(34+v*8)];
    if(y===7||y===8) return [P8(104+v*12),P8(80+v*10),P8(44+v*8)];
    if(x>=6&&x<=9&&y>=5&&y<=10) return [P8(160+v*20),P8(140+v*16),P8(90+v*12)];
    return [P8(150+v*20),P8(112+v*16),P8(62+v*12)]; });
  setTile(21,(x,y,r)=>{ const v=r(); const g=P8(14+v*18);
    if(r()<0.08) return [P8(60+v*20),P8(30+v*14),P8(80+v*24)];
    return [g,g,P8(g+12)]; });
  setTile(22,(x,y,r)=>{ const v=r(); const g=P8(86+v*30);
    return [P8(g*1.05),P8(g*0.42),P8(g*0.38)]; });
  setTile(23,(x,y,r)=>{ const v=r();
    if(hash3(x>>1,y>>1,x+y*3)<0.35) return [P8(240+v*14),P8(210+v*20),P8(120+v*40)];
    return [P8(196+v*24),P8(150+v*20),P8(66+v*16)]; });
  setTile(24,(x,y,r)=>{ const v=r(); const s=Math.sin(x*1.3+y*0.8)*0.5+0.5;
    return [P8(120+s*70+v*30), P8(30+s*40), P8(160+s*70), 205]; });
  setTile(25,(x,y,r)=>{ const v=r(); const g=P8(220+v*18);
    return [g, P8(g*0.97), P8(g*0.78)]; });
  setTile(26,(x,y,r)=>{ const v=r(); const g=P8(196+v*20);
    if(x>4&&x<11&&y>4&&y<11&&((x+y)%3!==0)) return [P8(90+v*20),P8(150+v*24),P8(110+v*20)];
    return [g, P8(g*0.97), P8(g*0.78)]; });
  setTile(27,(x,y,r)=>{ const v=r(); const g=P8(196+v*20);
    const d=Math.hypot(x-7.5,y-7.5);
    if(d<3.6) return [24,50,42];
    if(d<4.6) return [P8(80+v*30),P8(190+v*40),P8(150+v*30)];
    return [g, P8(g*0.97), P8(g*0.78)]; });
  setTile(28,(x,y,r)=>{ const v=r(); const g=P8(6+v*10);
    if(r()<0.04) return [P8(120+v*60),P8(160+v*60),P8(180+v*60)];
    return [g,g,P8(g+4)]; });
  setTile(29,(x,y,r)=>{ const v=r(); const w=((y+((x/3)|0))%7<1)?30:0;
    return [P8(226+v*24+w), P8(96+v*40+w*0.5), P8(18+v*12)]; });
  setTile(30,(x,y,r)=>{ const v=r(); const b=(x%4<2)?34:-10;
    return [P8(216+b+v*12), P8(212+b+v*10), P8(200+b+v*10)]; });
  setTile(31,(x,y,r)=>{ const v=r(); return [P8(106+v*30), P8(150+v*40), P8(70+v*26)]; });
  setTile(32,(x,y,r)=>{ const v=r(); const b=(x%4<2)?20:-12;
    return [P8(88+b+v*14), P8(58+b*0.8+v*10), P8(32+b*0.6+v*8)]; });
  setTile(33,(x,y,r)=>{ const v=r(); return r()<0.2?[46,92,42]:[P8(60+v*22),P8(98+v*30),P8(48+v*20)]; });
  setTile(34,(x,y,r)=>{ const v=r(); return [P8(200+v*16), P8(120+v*14), P8(60+v*10)]; });
  setTile(35,(x,y,r)=>{ const v=r(); return [P8(150+v*22), P8(96+v*16), P8(64+v*12)]; });
  setTile(36,(x,y,r)=>{ const v=r(); return [P8(150+v*40), P8(90+v*50), P8(200+v*55)]; });
  setTile(37,(x,y,r)=>{ const v=r(); const g=P8(222+v*16); return [g, g, P8(g*0.96)]; });
  setTile(38,(x,y,r)=>{ const v=r(); const g=P8(140+v*22); return [g,g,P8(g+4)]; });
  setTile(39,(x,y,r)=>{ const v=r(); const g=P8(138+v*30-(r()<0.2?30:0)); return [g,g,g]; });
  setTile(40,(x,y,r)=>{ const v=r(); return [P8(150+v*20), P8(158+v*20), P8(160+v*18)]; });
  setTile(41,(x,y,r)=>{ const v=r(); return [P8(64+v*16), P8(110+v*20), P8(96+v*16)]; });
  setTile(42,(x,y,r)=>{ const v=r(); const border=(x%4===0||y%4===0);
    const moss=r()<0.3; const g=P8(border?(moss?80:70)+v*14:116+v*22-(moss?20:0));
    return moss?[P8(g*0.8),g,P8(g*0.7)]:[g,g,g]; });
  setTile(43,(x,y,r)=>{ const v=r(); return [P8(180+v*20), P8(110+v*14), P8(60+v*10)]; });
  setTile(44,(x,y,r)=>{ const v=r(); return [P8(214+v*18), P8(150+v*16), P8(52+v*12)]; });
}
export function drawIsoIcon(cnv, bId){
  const ctx=cnv.getContext('2d');
  ctx.setTransform(1,0,0,1,0,0);
  ctx.clearRect(0,0,48,48);
  ctx.imageSmoothingEnabled=false;
  const W=12,H=12,cx=24,cy=13;
  const bl=BLOCKS[bId];
  if(!bl) return;
  const tilePos=t=>[(t&31)*16,(t>>5)*16];
  const [tx0,ty0]=tilePos(bl.top), [sx0,sy0]=tilePos(bl.side);
  ctx.setTransform(W/16,W/32,-W/16,W/32,cx,cy);
  ctx.drawImage(atlas,tx0,ty0,16,16,0,0,16,16);
  ctx.setTransform(W/16,W/32,0,H/16,cx-W,cy+W/2);
  ctx.drawImage(atlas,sx0,sy0,16,16,0,0,16,16);
  ctx.fillStyle='rgba(0,0,20,0.22)'; ctx.fillRect(0,0,16,16);
  ctx.setTransform(W/16,-W/32,0,H/16,cx,cy+W);
  ctx.drawImage(atlas,sx0,sy0,16,16,0,0,16,16);
  ctx.fillStyle='rgba(0,0,20,0.4)'; ctx.fillRect(0,0,16,16);
  ctx.setTransform(1,0,0,1,0,0);
}
export function buildIcons(){
  for(const idStr in BLOCKS){
    const id=+idStr;
    const c=document.createElement('canvas'); c.width=c.height=48;
    drawIsoIcon(c,id);
    ICON[id]=c.toDataURL(); ICONC[id]=c;
  }
}
export const atlasTex = new THREE.CanvasTexture(atlas);
atlasTex.magFilter = atlasTex.minFilter = THREE.NearestFilter;
atlasTex.generateMipmaps = false;
atlasTex.colorSpace = THREE.SRGBColorSpace;
bindAtlasFns({ atlasTex, buildIcons, buildAtlas, drawIsoIcon });
buildAtlas();
