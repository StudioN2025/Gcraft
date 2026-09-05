import { IT } from '../data/blocks.js';
import { ICON, ICONC } from './atlas.js';

function pxCanvas(){
  const c=document.createElement('canvas'); c.width=c.height=48;
  const ctx=c.getContext('2d');
  return [c,(x,y,col)=>{ ctx.fillStyle=col; ctx.fillRect(x*3,y*3,3,3); }];
}
export function buildItemIcons(){
  const [sc,sp]=pxCanvas();
  for(let i=0;i<8;i++){ sp(4+i,12-i,'#6e4a1e'); sp(5+i,12-i,'#9c6b30'); }
  function toolIcon(kind, light, dark){
    const [c,p]=pxCanvas();
    for(let i=0;i<9;i++){ p(2+i,13-i,dark); p(3+i,13-i,light); }
    if(kind==='pick'){
      for(let x=3;x<=12;x++){ p(x,2,(x%2)?light:dark); p(x,3,(x%2)?dark:light); }
      p(2,3,light); p(2,4,dark); p(13,3,light); p(13,4,dark);
    } else if(kind==='axe'){
      for(let y=1;y<=6;y++) for(let x=8;x<=13;x++){
        if(y===6&&x>11) continue;
        p(x,y,((x+y)%2)?light:dark);
      }
      p(7,2,dark); p(7,3,light);
    } else {
      for(let i=0;i<9;i++){ p(12-i,1+i,light); p(11-i,1+i,dark); }
      p(2,9,dark); p(3,10,dark); p(4,9,dark); p(4,11,dark);
      p(2,11,'#5a3d1c'); p(1,12,'#5a3d1c'); p(2,12,'#7d5a26');
    }
    return c;
  }
  function lumpIcon(base, hi){
    const [c,p]=pxCanvas();
    const pts=[[6,5],[7,4],[8,4],[9,5],[10,6],[10,7],[10,8],[9,9],[8,10],[7,10],[6,9],[5,8],[5,7],[5,6],[7,6],[8,6],[6,7],[7,7],[8,7],[9,7],[6,8],[7,8],[8,8],[9,8],[7,9],[8,9]];
    pts.forEach((pt,i)=>p(pt[0],pt[1], i%4===0?hi:base));
    return c;
  }
  function ingotIcon(top, side){
    const [c,p]=pxCanvas();
    for(let x=3;x<=12;x++){ p(x,7,top); p(x,8,side); p(x,9,side); }
    p(4,6,top); p(5,6,top); p(11,10,side); p(12,10,side);
    return c;
  }
  function meatIcon(main, dark, bone){
    const [c,p]=pxCanvas();
    for(let y=3;y<=9;y++) for(let x=6;x<=12;x++){
      if((x===6||x===12)&&(y===3||y===9)) continue;
      p(x,y,(x+y)%5?main:dark);
    }
    if(bone){ p(4,10,bone); p(3,11,bone); p(5,10,dark); p(4,11,'#c9c2ae'); p(2,12,'#c9c2ae'); p(3,12,'#c9c2ae'); }
    return c;
  }
  function bucketIcon(fill){
    const [c,p]=pxCanvas();
    p(4,2,'#9a9a9a'); p(5,1,'#9a9a9a'); p(6,1,'#b5b5b5'); p(7,1,'#b5b5b5');
    p(8,1,'#b5b5b5'); p(9,1,'#b5b5b5'); p(10,1,'#9a9a9a'); p(11,2,'#9a9a9a');
    const rows=[[5,10],[5,10],[4,11],[4,11],[3,12],[3,12],[3,12],[3,12]];
    for(let i=0;i<rows.length;i++){
      const y=4+i, [x0,x1]=rows[i];
      for(let x=x0;x<=x1;x++){
        let col = (x===x0||x===x1||y===11) ? '#9a9a9a' : '#6f6f6f';
        if(fill && i<3 && x>x0 && x<x1){
          col = fill==='water' ? ((x===x0+1&&y===4)?'#7fa8f0':'#3f6fd8')
                               : ((x===x0+1&&y===4)?'#ffc266':'#e2711c');
        }
        p(x,y,col);
      }
    }
    return c;
  }
  function appleIcon(){
    const [c,p]=pxCanvas();
    p(7,1,'#5a3d1c'); p(7,2,'#5a3d1c'); p(7,3,'#5a3d1c');
    p(8,1,'#4f8f2f'); p(9,1,'#4f8f2f'); p(9,2,'#4f8f2f');
    for(let y=3;y<=10;y++) for(let x=4;x<=11;x++){
      if((x===4||x===11)&&(y===3||y===10)) continue;
      if(x>=6&&x<=9&&y<=2) continue;
      p(x,y,(x===5&&y===5)?'#ff9d9d':((x+y)%6?'#d23a3a':'#a82424'));
    }
    return c;
  }
  function rodIcon(main, hi){
    const [c,p]=pxCanvas();
    for(let i=0;i<11;i++){ p(3+i,13-i,main); p(4+i,13-i,hi); }
    return c;
  }
  function powderIcon(main, hi){
    const [c,p]=pxCanvas();
    const pts=[[5,10],[6,10],[7,10],[8,10],[9,10],[10,10],[6,9],[7,9],[8,9],[9,9],[7,8],[8,8],[9,8],[6,11],[7,11],[8,11],[9,11]];
    pts.forEach((pt,i)=>p(pt[0],pt[1], i%3===0?hi:main));
    return c;
  }
  function orbIcon(main, hi, pupil){
    const [c,p]=pxCanvas();
    for(let y=3;y<=11;y++) for(let x=3;x<=11;x++){
      const dx=x-7, dy=y-7;
      const d=dx*dx+dy*dy;
      if(d<=16){
        let col=(d<=4)?hi:main;
        if(pupil && dx>0 && dx<3 && dy>-1 && dy<2) col=pupil;
        p(x,y,col);
      }
    }
    return c;
  }
  function flintIcon(){
    const [c,p]=pxCanvas();
    for(let i=0;i<7;i++){ p(8+((i*0.6)|0),4+i,'#c8c8c8'); p(9+((i*0.6)|0),4+i,'#8f8f8f'); }
    p(3,9,'#3a3a3a'); p(4,8,'#4a4a4a'); p(4,9,'#3a3a3a'); p(5,8,'#4a4a4a'); p(3,10,'#2a2a2a'); p(4,10,'#333333'); p(5,9,'#333333');
    return c;
  }
  const W=['#b3854a','#7d5a26'], St=['#a8a8a8','#6f6f6f'], Ir=['#d8d8d8','#9a9a9a'], Dm=['#7ce8ea','#38b8bc'];
  const defs = [
    [IT.STICK, sc],
    [IT.WOOD_PICK, toolIcon('pick',...W)], [IT.STONE_PICK, toolIcon('pick',...St)],
    [IT.IRON_PICK, toolIcon('pick',...Ir)], [IT.DIAMOND_PICK, toolIcon('pick',...Dm)],
    [IT.WOOD_AXE, toolIcon('axe',...W)],   [IT.STONE_AXE, toolIcon('axe',...St)],
    [IT.IRON_AXE, toolIcon('axe',...Ir)],  [IT.DIAMOND_AXE, toolIcon('axe',...Dm)],
    [IT.WOOD_SWORD, toolIcon('sword',...W)],[IT.STONE_SWORD, toolIcon('sword',...St)],
    [IT.IRON_SWORD, toolIcon('sword',...Ir)],[IT.DIAMOND_SWORD, toolIcon('sword',...Dm)],
    [IT.COAL, lumpIcon('#26262a','#4a4a52')],
    [IT.RAW_IRON, lumpIcon('#c89878','#e8c4a4')],
    [IT.IRON_INGOT, ingotIcon('#e2e2e6','#9a9aa2')],
    [IT.DIAMOND, lumpIcon('#3fd6d6','#aef4f4')],
    [IT.RAW_PORK, meatIcon('#e8938f','#c96b68','#c9c2ae')],
    [IT.COOKED_PORK, meatIcon('#b5773e','#8a5628','#c9c2ae')],
    [IT.RAW_BEEF, meatIcon('#c23a3a','#8f2424','#e8e2d6')],
    [IT.STEAK, meatIcon('#7a4a26','#573217','#c9c2ae')],
    [IT.RAW_CHICKEN, meatIcon('#ecc9b8','#d0a68f','#c9c2ae')],
    [IT.COOKED_CHICKEN, meatIcon('#c98a4a','#9c6430','#c9c2ae')],
    [IT.BUCKET, bucketIcon(false)],
    [IT.BUCKET_WATER, bucketIcon('water')],
    [IT.BUCKET_LAVA, bucketIcon('lava')],
    [IT.APPLE, appleIcon()],
    [IT.FLINT_STEEL, flintIcon()],
    [IT.BLAZE_ROD, rodIcon('#e8b52e','#f8d878')],
    [IT.BLAZE_POWDER, powderIcon('#e8912e','#f8c868')],
    [IT.ENDER_PEARL, orbIcon('#1f6158','#4fc3ae',null)],
    [IT.ENDER_EYE, orbIcon('#3fae76','#a8f0c8','#143c2c')],
  ];
  for(const [id, cnv] of defs){ ICON[id]=cnv.toDataURL(); ICONC[id]=cnv; }
}
