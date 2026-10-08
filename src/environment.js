import * as THREE from 'three';

export function buildEnvironment(scene) {
  // 地面纹理提供近景参照；低对比度避免变成界面装饰。
  const tile=document.createElement('canvas');tile.width=tile.height=256;
  const ctx=tile.getContext('2d');ctx.fillStyle='#f7f6f2';ctx.fillRect(0,0,256,256);
  const grain=ctx.getImageData(0,0,256,256);
  for(let i=0;i<grain.data.length;i+=4){const n=(Math.random()-.5)*8;grain.data[i]+=n;grain.data[i+1]+=n;grain.data[i+2]+=n;}ctx.putImageData(grain,0,0);
  ctx.strokeStyle='#c9c9c4';ctx.lineWidth=2;ctx.strokeRect(0,0,256,256);
  const map=new THREE.CanvasTexture(tile);map.colorSpace=THREE.SRGBColorSpace;map.wrapS=map.wrapT=THREE.RepeatWrapping;map.repeat.set(9,9);map.anisotropy=4;
  const floor=new THREE.Mesh(new THREE.PlaneGeometry(44,44),new THREE.MeshStandardMaterial({map,color:0xffffff,roughness:1}));
  floor.rotation.x=-Math.PI/2;floor.position.y=-.06;floor.receiveShadow=true;scene.add(floor);
  const cableMat=new THREE.MeshStandardMaterial({color:0x767a7c,roughness:.8});
  const cableRoutes=[
    [[-1,.02,0],[-2,.02,2.5],[-4,.02,3.4],[-5,.02,4.9],[-4,.02,6.5],[-7,.02,8.8],[-9,.02,12]],
    [[1,.018,-.4],[2.9,.018,1.7],[3.5,.018,4],[5.4,.018,4.8],[6.9,.018,7.3],[9.5,.018,7.8]],
    [[0,.012,-1],[2,.012,-3],[4,.012,-4],[5,.012,-7],[4.4,.012,-9]],
  ];
  for(const route of cableRoutes){const curve=new THREE.CatmullRomCurve3(route.map(p=>new THREE.Vector3(...p)));const cable=new THREE.Mesh(new THREE.TubeGeometry(curve,100,.018,5,false),cableMat);scene.add(cable);}
  const metal=new THREE.MeshStandardMaterial({color:0x9ca2a4,roughness:.85});
  // 稀疏的支架与灯管在行走中产生遮挡和视差，标定房间的实际尺度。
  for(const [x,z,angle] of [[-8,-7,.2],[-10,6,.7]]){
    const frame=new THREE.Group();frame.position.set(x,0,z);frame.rotation.y=angle;
    for(const offset of [-.65,.65]){const bar=new THREE.Mesh(new THREE.BoxGeometry(.04,3.8,.04),metal);bar.position.set(offset,1.9,0);frame.add(bar);}
    const top=new THREE.Mesh(new THREE.BoxGeometry(1.35,.04,.04),metal);top.position.y=3.8;frame.add(top);
    const strip=new THREE.Mesh(new THREE.BoxGeometry(.75,.025,.035),new THREE.MeshBasicMaterial({color:0x7798d6}));strip.position.set(0,3.5,0);frame.add(strip);scene.add(frame);
  }
  const shadowCanvas=document.createElement('canvas');shadowCanvas.width=shadowCanvas.height=128;
  const sx=shadowCanvas.getContext('2d'),gradient=sx.createRadialGradient(64,64,8,64,64,64);gradient.addColorStop(0,'rgba(34,45,65,.24)');gradient.addColorStop(1,'rgba(0,0,0,0)');sx.fillStyle=gradient;sx.fillRect(0,0,128,128);
  const shadow=new THREE.Mesh(new THREE.PlaneGeometry(8,6),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(shadowCanvas),transparent:true,depthWrite:false}));shadow.rotation.x=-Math.PI/2;shadow.position.set(0,-.04,-.4);scene.add(shadow);
}
