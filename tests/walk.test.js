import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { createWalkPath, walkPose, wrap01, shortestProgress, inspectionPath, curveClear, damp } from '../src/walk-path.js';
import { screenFrame, fitDistance } from '../src/math.js';

test('原地转头不会改变相机站立位置', () => {
  const path=createWalkPath(),front=walkPose(path,.2,0,.14),side=walkPose(path,.2,1.3,.4);
  assert.equal(front.position.distanceTo(side.position),0);
  assert.ok(front.quaternion.angleTo(side.quaternion)>1);
});
test('沿路径移动保持人眼高度，闭合处连续',()=>{
  const path=createWalkPath();
  for(let i=0;i<=100;i++) assert.ok(Math.abs(walkPose(path,i/100).position.y-1.62)<1e-6);
  assert.ok(walkPose(path,1).position.distanceTo(walkPose(path,0).position)<1e-8);
  assert.ok(walkPose(path,1-1e-6).quaternion.angleTo(walkPose(path,1+1e-6).quaternion)<.001);
  assert.ok(walkPose(path,0).position.distanceTo(walkPose(path,.1).position)>3);
});
test('路径跨接缝选择短路，阻尼不依赖帧率',()=>{
  assert.ok(Math.abs(shortestProgress(.98,.02)-1.02)<1e-8);
  assert.ok(Math.abs(shortestProgress(.02,.98)+.02)<1e-8);
  assert.ok(Math.abs(wrap01(-.1)-.9)<1e-8);
  const simulate=fps=>{let value=0;for(let i=0;i<fps;i++)value=damp(value,1,6,1/fps);return value;};
  assert.ok(Math.abs(simulate(30)-simulate(144))<1e-8);
});
test('真实 GLB 的 23 块屏幕：桌面与竖屏靠近路线都绕开模型',async()=>{
  const bytes=await readFile(new URL('../public/models/retro_tv_stack.glb',import.meta.url));
  const gltf=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
  const meshes=[],screens=[];gltf.scene.updateMatrixWorld(true);
  gltf.scene.traverse(node=>{if(node.isMesh){meshes.push(node);if(/Screen/.test(node.name))screens.push(node);}});
  assert.equal(screens.length,23);
  const obstacles=meshes.map(mesh=>new THREE.Box3().setFromObject(mesh).expandByScalar(.2));
  for(const aspect of [16/9,390/844]){
    const path=createWalkPath(aspect<.75?1.28:1);
    assert.ok(curveClear(path,obstacles),'步行路线位于塔体之外');
    for(const screen of screens){
      const frame=screenFrame(screen),distance=Math.max(1.7,fitDistance(frame.width*1.9,frame.height*1.9,58,aspect));
      for(const progress of [0,.33,.66]){
        const start=walkPose(path,progress).position;
        const curve=inspectionPath(path,progress,start,frame,distance,obstacles);
        assert.ok(curve,`${screen.name} aspect=${aspect} progress=${progress} 有安全路线`);
        assert.ok(curve.getPointAt(0).distanceTo(start)<1e-6,'转场从当前机位开始');
        assert.ok(curveClear(curve,obstacles),'检查沿途相机半径，不穿过电视');
        assert.ok(curve.getPointAt(1).clone().sub(frame.center).dot(frame.normal)>0,'终点在屏幕正面');
      }
    }
  }
});
