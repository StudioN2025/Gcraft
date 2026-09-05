import { G } from './state.js';

export const clamp = (v,a,b)=> v<a?a : v>b?b : v;
export const lerp  = (a,b,t)=> a+(b-a)*t;

export function hash2(x, z){
  let h = (Math.imul(x,374761393) + Math.imul(z,668265263) + G.SEED)|0;
  h = Math.imul(h ^ (h>>>13), 1274126177);
  return ((h ^ (h>>>16)) >>> 0) / 4294967296;
}
export function hash3(x,y,z){
  let h = (Math.imul(x,374761393) + Math.imul(y,2246822519) + Math.imul(z,3266489917) + G.SEED)|0;
  h = Math.imul(h ^ (h>>>13), 1274126177);
  return ((h ^ (h>>>16)) >>> 0) / 4294967296;
}
export const hash2s = (x,z,s)=> hash2(x + Math.imul(s,3163), z - Math.imul(s,9277));

export function vnoise(x,z){
  const xi=Math.floor(x), zi=Math.floor(z);
  const u=(x-xi)*(x-xi)*(3-2*(x-xi)), v=(z-zi)*(z-zi)*(3-2*(z-zi));
  return lerp(lerp(hash2(xi,zi),hash2(xi+1,zi),u), lerp(hash2(xi,zi+1),hash2(xi+1,zi+1),u), v);
}
export function vnoise3(x,y,z){
  const xi=Math.floor(x), yi=Math.floor(y), zi=Math.floor(z);
  const u=(x-xi)*(x-xi)*(3-2*(x-xi));
  const v=(y-yi)*(y-yi)*(3-2*(y-yi));
  const w=(z-zi)*(z-zi)*(3-2*(z-zi));
  return lerp(
    lerp(lerp(hash3(xi,yi,zi),   hash3(xi+1,yi,zi),  u),
         lerp(hash3(xi,yi+1,zi), hash3(xi+1,yi+1,zi),u), v),
    lerp(lerp(hash3(xi,yi,zi+1),   hash3(xi+1,yi,zi+1),  u),
         lerp(hash3(xi,yi+1,zi+1), hash3(xi+1,yi+1,zi+1),u), v), w);
}
export function fbm(x,z,oct){
  let val=0, amp=0.5, f=1, norm=0;
  for(let i=0;i<oct;i++){ val+=vnoise(x*f,z*f)*amp; norm+=amp; amp*=0.5; f*=2; }
  return val/norm;
}
export function mulberry32(a){
  return function(){
    a|=0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a>>>15, 1|a);
    t = t + Math.imul(t ^ t>>>7, 61|t) ^ t;
    return ((t ^ t>>>14) >>> 0)/4294967296;
  };
}
export function hashSeed(str){
  str = (str||'').trim();
  if(!str) return (Math.random()*2**31)|0;
  if(/^-?\d+$/.test(str)) return parseInt(str,10)|0;
  let h=1779033703 ^ str.length;
  for(let i=0;i<str.length;i++){ h=Math.imul(h ^ str.charCodeAt(i), 3432918353); h = h<<13 | h>>>19; }
  return h|0;
}
export function vibrate(ms){ if(navigator.vibrate){ try{ navigator.vibrate(ms); }catch(e){} } }
