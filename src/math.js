import * as THREE from 'three';
export function screenFrame(screen) {
  screen.updateWorldMatrix(true, false);
  screen.geometry.computeBoundingBox();
  const box = screen.geometry.boundingBox;
  const center = screen.localToWorld(box.getCenter(new THREE.Vector3()));
  const scale = screen.getWorldScale(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3()).multiply(scale);
  const normal = new THREE.Vector3(0, 0, 1).applyNormalMatrix(new THREE.Matrix3().getNormalMatrix(screen.matrixWorld)).normalize();
  return { center, normal, width: Math.abs(size.x), height: Math.abs(size.y) };
}
export function fitDistance(width, height, verticalFov, aspect, cover = false) {
  const tan = Math.tan(THREE.MathUtils.degToRad(verticalFov / 2));
  const distances = [height / (2 * tan), width / (2 * tan * aspect)];
  return (cover ? Math.min(...distances) : Math.max(...distances));
}
export function isClick(start, end, maxDistance = 7) { return Math.hypot(start.x - end.x, start.y - end.y) < maxDistance; }
