import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { screenFrame, fitDistance, isClick } from '../src/math.js';
import { AppState } from '../src/state.js';
import { categoryForScreen } from '../src/data.js';

test('带局部偏移、父旋转的屏幕中心正确转换到世界坐标', () => {
  const parent = new THREE.Group(); parent.position.set(2,3,4); parent.rotation.y = Math.PI / 2;
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(2,1).translate(0,.035,.55)); parent.add(screen);
  const frame = screenFrame(screen);
  assert.ok(frame.center.distanceTo(new THREE.Vector3(2.55,3.035,4)) < 1e-6);
  assert.ok(frame.normal.distanceTo(new THREE.Vector3(1,0,0)) < 1e-6);
});
test('横竖屏聚焦分别覆盖视口，不硬编码距离', () => {
  const fov = 50, width = 1.2, height = .8;
  for (const aspect of [16/9,9/16]) {
    const d = fitDistance(width,height,fov,aspect,true), viewportHeight = 2*d*Math.tan(fov*Math.PI/360);
    assert.ok(viewportHeight <= height + 1e-8); assert.ok(viewportHeight*aspect <= width + 1e-8);
  }
});
test('拖动与点击分离', () => { assert.equal(isClick({x:0,y:0},{x:3,y:2}),true); assert.equal(isClick({x:0,y:0},{x:20,y:2}),false); });
test('加载期间禁止聚焦，聚焦取消后可以稳定返回', () => {
  const s = new AppState(); assert.equal(s.set('FOCUS_TV'),false);
  for (const next of ['GROUND','LENS_ZOOM','BOOT','VIEWFINDER','FOCUS_TV','RETURNING','VIEWFINDER']) assert.equal(s.set(next),true);
});
test('23 块屏幕都分配到四类作品', () => { const active=[];for(let i=1;i<=23;i++){const c=categoryForScreen(`TV_${String(i).padStart(2,'0')}_Screen`);assert.ok(c);active.push(c.id);}assert.equal(new Set(active).size,4); });

import { wrapIndex } from '../src/film-utils.js';
test('胶片可以双向循环，单作品不越界',()=>{assert.equal(wrapIndex(-1,4),3);assert.equal(wrapIndex(4,4),0);assert.equal(wrapIndex(17,4),1);assert.equal(wrapIndex(-1,1),0);});
