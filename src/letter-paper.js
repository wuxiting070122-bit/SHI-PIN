import * as THREE from 'three';

// A continuous sheet: edge vertices bend together, rather than a detached flap.
export function createLetterPaper(host,reduced){
 const renderer=new THREE.WebGLRenderer({alpha:true,antialias:true});
 renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.domElement.className='letter-paper-canvas';renderer.domElement.setAttribute('aria-hidden','true');host.prepend(renderer.domElement);
 const scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(-1,1,1,-1,.1,2000);camera.position.z=900;
 scene.add(new THREE.AmbientLight(0xffffff,2));const light=new THREE.DirectionalLight(0xffffff,2.2);light.position.set(-200,300,500);scene.add(light);
 const geometry=new THREE.PlaneGeometry(1,1,48,60),base=geometry.attributes.position.array.slice();
 const material=new THREE.MeshStandardMaterial({color:'#f8fafc',roughness:1,side:THREE.DoubleSide});
 const sheet=new THREE.Mesh(geometry,material);scene.add(sheet);
 let width=1,height=1,hover=0,target=0,px=.8,py=.9,clickX=.5,clickY=.5,age=10,disposed=false;
 function resize(){width=host.clientWidth;height=host.clientHeight;if(!width||!height)return;renderer.setSize(width+32,height+32,false);camera.left=-width/2-16;camera.right=width/2+16;camera.top=height/2+16;camera.bottom=-height/2-16;camera.updateProjectionMatrix();}
 const observer=new ResizeObserver(resize);observer.observe(host);resize();
 function move(e){if(reduced||e.pointerType==='touch')return;const r=host.getBoundingClientRect();px=THREE.MathUtils.clamp((e.clientX-r.left)/r.width,0,1);py=THREE.MathUtils.clamp((e.clientY-r.top)/r.height,0,1);target=THREE.MathUtils.smoothstep(py,.55,1);}
 function leave(){target=0;}
 function down(e){const r=host.getBoundingClientRect();clickX=(e.clientX-r.left)/r.width;clickY=(e.clientY-r.top)/r.height;age=0;}
 host.addEventListener('pointermove',move);host.addEventListener('pointerleave',leave);host.addEventListener('pointerdown',down);
 return {
 update(dt){if(disposed||host.hidden)return;hover=THREE.MathUtils.damp(hover,target,9,dt);age+=dt;
 const pos=geometry.attributes.position;
 for(let i=0;i<pos.count;i++){
  const u=base[i*3]+.5,v=.5-base[i*3+1];let x=base[i*3]*width,y=base[i*3+1]*height,z=0;
  if(!reduced){
   const edge=THREE.MathUtils.smoothstep(v,.66,1),across=Math.exp(-Math.pow((u-px)/.29,2));
   const bend=edge*edge*across*hover;
   z+=bend*55;y+=bend*24;
   const dx=(u-clickX)*width,dy=(v-clickY)*height,r=Math.hypot(dx,dy),angle=Math.atan2(dy,dx);
   const envelope=Math.exp(-age*5)*Math.exp(-r/150)*(1-Math.exp(-age*25));
   z+=Math.sin(r*.07-age*15)*Math.cos(angle*3)*envelope*4;
  }
  pos.setXYZ(i,x,y,z);
 }
 pos.needsUpdate=true;geometry.computeVertexNormals();renderer.render(scene,camera);
 },
 dispose(){disposed=true;observer.disconnect();host.removeEventListener('pointermove',move);host.removeEventListener('pointerleave',leave);host.removeEventListener('pointerdown',down);geometry.dispose();material.dispose();renderer.dispose();renderer.domElement.remove();}
 };
}
