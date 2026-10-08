import * as THREE from 'three';

export const wrap01 = value => ((value % 1) + 1) % 1;
export const shortestProgress = (from, to) => from + ((to - from + .5) % 1 + 1) % 1 - .5;
export const damp = (from, to, speed, dt) => THREE.MathUtils.lerp(from, to, 1 - Math.exp(-speed * dt));

// 固定眼高的闭合步行路线，半径变化让前后景产生真实的视差。
export function createWalkPath(scale = 1) {
  return new THREE.CatmullRomCurve3([
    [1.1, 1.62, 6.8], [5.4, 1.62, 4.6], [6.7, 1.62, -.8],
    [3.6, 1.62, -6.1], [-1.4, 1.62, -6.8], [-5.9, 1.62, -3.8],
    [-6.4, 1.62, 1.8], [-3.5, 1.62, 6.8],
  ].map(([x,y,z]) => new THREE.Vector3(x * scale, y, (z + .35) * scale - .35)), true, 'centripetal');
}
export function walkPose(path, progress, yaw = 0, pitch = .14) {
  const position = path.getPointAt(wrap01(progress));
  // 行走方向提供默认朝向，转头偏移独立保存，不锁定模型中心的 lookAt。
  const heading = Math.atan2(position.x, position.z + .35);
  const quaternion = new THREE.Quaternion().setFromEuler(new THREE.Euler(pitch, heading + yaw, 0, 'YXZ'));
  return { position, quaternion };
}
export function closestProgress(path, point) {
  let closest = 0, distance = Infinity;
  for (let i = 0; i < 240; i++) {
    const p = path.getPointAt(i / 240);
    const d = (p.x - point.x) ** 2 + (p.z - point.z) ** 2;
    if (d < distance) { distance = d; closest = i / 240; }
  }
  return closest;
}
export function segmentClear(a, b, obstacles) {
  const direction = b.clone().sub(a), length = direction.length();
  if (length < 1e-8) return !obstacles.some(box => box.containsPoint(a));
  const ray = new THREE.Ray(a, direction.divideScalar(length));
  return !obstacles.some(box => {
    if (box.containsPoint(a)) return true;
    const hit = ray.intersectBox(box, new THREE.Vector3());
    return hit && hit.distanceTo(a) <= length + 1e-7;
  });
}
export function curveClear(curve, obstacles) {
  const points = curve.getPoints(240);
  return points.every((p,i) => !i || segmentClear(points[i-1],p,obstacles));
}
// 优先沿步行路线来到屏幕正面，再在塔外调整高度，最后靠近。
export function inspectionPath(path, progress, start, frame, distance, obstacles) {
  const { center, normal } = frame;
  const outer = center.clone().addScaledVector(normal, 5.3);
  const arrival = closestProgress(path, outer), end = shortestProgress(progress, arrival);
  let goal = center.clone().addScaledVector(normal, distance);
  for (let i = 0; i < 16 && obstacles.some(box => box.containsPoint(goal)); i++) goal.addScaledVector(normal,.25);
  const points = [start.clone()];
  const steps = Math.max(2,Math.ceil(Math.abs(end-progress)*64));
  for (let i=1;i<=steps;i++) points.push(path.getPointAt(wrap01(progress+(end-progress)*i/steps)));
  points.push(new THREE.Vector3(outer.x,1.62,outer.z),outer,goal);
  const unique = points.filter((point,i) => !i || point.distanceTo(points[i-1]) > .015);
  const smooth = new THREE.CatmullRomCurve3(unique,false,'centripetal');
  if (curveClear(smooth,obstacles)) return smooth;
  const safe = new THREE.CurvePath();
  for (let i=1;i<unique.length;i++) safe.add(new THREE.LineCurve3(unique[i-1],unique[i]));
  // 极端模型改动时拒绝穿模转场，而不是让相机进入几何体。
  return curveClear(safe,obstacles) ? safe : null;
}
