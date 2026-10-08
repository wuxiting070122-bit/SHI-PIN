import test from 'node:test';
import assert from 'node:assert/strict';
import { filmSegment } from '../src/film-ring.js';

test('曲面胶片各段连续，最后一段闭合，法线朝外',()=>{
  const count=8,step=Math.PI*2/count;
  const pieces=Array.from({length:count},(_,i)=>filmSegment(4.6,2.55,i*step-step/2,i*step+step/2));
  pieces.forEach((g,i)=>{
    const p=g.attributes.position,n=g.attributes.normal,next=pieces[(i+1)%count].attributes.position;
    for(let row=0;row<2;row++)for(let axis=0;axis<3;axis++)assert.ok(Math.abs(p.array[(p.count-2+row)*3+axis]-next.array[row*3+axis])<1e-5);
    for(let v=0;v<p.count;v++){assert.ok(Math.abs(Math.hypot(p.getX(v),p.getZ(v))-4.6)<1e-5);assert.ok(p.getX(v)*n.getX(v)+p.getZ(v)*n.getZ(v)>0);}
    g.dispose();
  });
});
