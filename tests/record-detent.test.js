import test from 'node:test';
import assert from 'node:assert/strict';
import {createRecordDetent,recordDragTarget} from '../src/record-detent.js';
test('滚动惯性持续输入只跨过一个停靠点',()=>{
 const gate=createRecordDetent(3);let target=0;
 for(let t=0;t<1000;t+=16)target=gate.wheel(target,25,t).target;
 assert.equal(target,1);
 target=gate.wheel(target,80,1400).target;assert.equal(target,2);
});
test('轻滑停在阻力区，反向滑动能返回上一项',()=>{
 const gate=createRecordDetent(3);assert.ok(gate.wheel(1,20,0).target<1.5);
 assert.equal(gate.wheel(1,-80,500).target,0);
 assert.equal(gate.wheel(0,-80,1000).target,0);
});
test('拖动不足三分之一回弹，长拖也只切换一项',()=>{
 assert.equal(recordDragTarget(1,40,3,true),1);
 assert.equal(recordDragTarget(1,65,3,true),2);
 assert.equal(recordDragTarget(1,1800,3,true),2);
 assert.equal(recordDragTarget(1,-1800,3,true),0);
 assert.ok(recordDragTarget(1,1800,3)<1.5);
});
test('循环选片可以连续跨过末项，反向也可越过首项',()=>{
 const gate=createRecordDetent(1,true);let target=0;
 for(let i=0;i<5;i++)target=gate.wheel(target,80,i*700).target;
 assert.equal(target,5);
 assert.equal(recordDragTarget(1,150,1,true,true),2);
 assert.equal(recordDragTarget(0,-150,1,true,true),-1);
});
test('信件增强阻尼仍能逐封经过四个停靠点，尾部惯性不会跳号',()=>{
 const gate=createRecordDetent(3,true,{threshold:95,cooldown:560,idle:240});let target=0;
 const visited=[];
 for(let gesture=0;gesture<4;gesture++){
  const start=gesture*1100;
  for(let t=0;t<350;t+=16)target=gate.wheel(target,t<80?35:3,start+t).target;
  visited.push(((Math.round(target)%4)+4)%4);
 }
 assert.deepEqual(visited,[1,2,3,0]);
 for(let gesture=0;gesture<3;gesture++){
  const start=5000+gesture*1100;
  for(let t=0;t<350;t+=16)target=gate.wheel(target,t<80?-35:-3,start+t).target;
  visited.push(((Math.round(target)%4)+4)%4);
 }
 assert.deepEqual(visited.slice(4),[3,2,1]);
});

test('信件连续滚轮在停靠后重新解锁，不需要停手才能翻下一封',()=>{
 const gate=createRecordDetent(3,true,{threshold:95,cooldown:560,idle:240,repeat:true});
 let target=0;const committed=[];
 for(let t=0;t<2200;t+=16){const step=gate.wheel(target,30,t);target=step.target;if(step.committed)committed.push(target);}
 assert.deepEqual(committed,[1,2,3,4]);
});
test('信件冷却期间开始的新手势不会永久锁住，微小惯性不再翻页',()=>{
 const gate=createRecordDetent(3,true,{threshold:95,cooldown:560,idle:240,repeat:true});
 let target=gate.wheel(0,100,0).target;
 for(let t=300;t<900;t+=20)target=gate.wheel(target,30,t).target;
 assert.equal(Math.round(target),2);
 for(let t=900;t<1800;t+=20)target=gate.wheel(target,2,t).target;
 assert.equal(target,2);
});
