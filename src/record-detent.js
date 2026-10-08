const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
// One wheel burst can cross one detent. Momentum extends the burst, not the selection.
export function createRecordDetent(maxIndex, loop = false, { threshold = 70, cooldown = 420, idle = 240, repeat = false } = {}) {
  const limit=value=>loop?value:clamp(value,0,maxIndex);
  let last=-Infinity,lockedUntil=0,consumed=false,total=0,base=0;
  return {
    wheel(current,delta,now){
      if(now-last>idle){base=Math.round(current);total=0;consumed=now<lockedUntil;}
      last=now;
      // Continuous wheel input has no idle gap. Re-arm after settling rather
      // than keeping the entire stream consumed forever. Ignore tiny tails.
      if(consumed && repeat && now>=lockedUntil && Math.abs(delta)>=8){
        consumed=false;base=Math.round(current);total=0;
      }
      if(consumed)return {target:current,committed:false};
      total+=clamp(delta,-100,100);
      if(Math.abs(total)>=threshold){consumed=true;lockedUntil=now+cooldown;return {target:limit(base+Math.sign(total)),committed:true};}
      return {target:limit(base+total/threshold*.23),committed:false};
    },
    reset(){last=-Infinity;lockedUntil=0;total=0;consumed=false;},
  };
}
export function recordDragTarget(base,distance,maxIndex,release=false,loop=false){
  const fraction=distance/180;
  const target=base+(release?(Math.abs(fraction)>=1/3?Math.sign(fraction):0):Math.tanh(fraction)*.30);
  return loop?target:clamp(target,0,maxIndex);
}
