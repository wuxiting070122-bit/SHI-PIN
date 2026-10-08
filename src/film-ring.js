import * as THREE from 'three';

export function filmSegment(radius, height, start, end, segments = 48) {
  const positions = [], uv = [], indices = [];
  for(let i=0;i<=segments;i++) {
    const u=i/segments, angle=start+(end-start)*u;
    for(let row=0;row<2;row++) { positions.push(Math.sin(angle)*radius,(row-.5)*height,Math.cos(angle)*radius); uv.push(u,row); }
    if(i<segments) { const a=i*2; indices.push(a,a+2,a+1,a+2,a+3,a+1); }
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
  geometry.setIndex(indices); geometry.computeVertexNormals(); return geometry;
}
