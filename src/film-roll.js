import { addInteractionGuide } from './interaction-guide.js';
import * as THREE from 'three';
import gsap from 'gsap';
import { artwork } from './artwork.js';
import { wrapIndex } from './film-utils.js';
import { createRippleType } from './ripple-type.js';
import { filmSegment } from './film-ring.js';

export function openFilmRoll({ category, reduced = false, onClose }) {
  const previous=document.activeElement, works=category.projects;
  const sources=works.map((work,i)=>(work.cover ? `${import.meta.env.BASE_URL}${work.cover}` : artwork(category,i).toDataURL('image/webp')));
  const previews=works.map((work,i)=>work.previewCover ? `${import.meta.env.BASE_URL}${work.previewCover}` : sources[i]);
  const dialog=document.createElement('dialog'); dialog.className='film-space film-ring-space'; dialog.setAttribute('aria-label','Visual artwork film reel');
  dialog.innerHTML=`<header class="film-header"><button class="film-close" aria-label="Back to TV Tower">↖ <span>BACK TO SIGNAL</span></button><span>THE ENDLESS REEL / VISUAL ARCHIVE</span><span class="film-count"></span></header><div class="film-caption" aria-live="polite"><span class="film-meta"></span><h1 class="film-wave-title"><span class="film-title-accessible"></span><span class="film-title-wave" aria-hidden="true"></span></h1><button class="film-open">VIEW ARTWORK ↗</button></div><div class="film-ring-stage" aria-label="Film reel. Drag horizontally or use arrow keys." tabindex="0"></div><footer class="film-footer"><button class="film-prev" aria-label="Previous artwork">←</button><div class="film-dots"></div><button class="film-next" aria-label="Next artwork">→</button></footer><span class="film-stock">SHI PIN — 35 MM / DRAG TO EXPLORE</span><div class="film-full" hidden><button class="film-unfold-close" aria-label="Back to film reel">↙ BACK TO REEL</button><div class="film-full-image"><img class="film-original"/><img class="film-cover-transition" aria-hidden="true"/></div><p></p></div>`;
  const disposeGuide = addInteractionGuide(dialog, 'film');
  document.body.append(dialog); dialog.showModal();
  const stage=dialog.querySelector('.film-ring-stage'), full=dialog.querySelector('.film-full');
  let captionAngle = -.16;
  const caption=dialog.querySelector('.film-caption');
  const titleRipple=createRippleType(dialog.querySelector('.film-title-wave'),reduced,{width:1400,height:260,fontSize:180,center:true,taper:1,transition:true,lines:[works[0].en],angle:()=>captionAngle});
  const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true}); renderer.setPixelRatio(Math.min(devicePixelRatio,1.6)); renderer.outputColorSpace=THREE.SRGBColorSpace; stage.append(renderer.domElement);
  const scene=new THREE.Scene(); scene.fog=new THREE.Fog('#eeeeea',8,18);
  const camera=new THREE.PerspectiveCamera(42,1,.1,60); camera.position.set(0,2.9,12.8); camera.lookAt(0,0,0);
  scene.add(new THREE.HemisphereLight(0xffffff,0x5e6685,2));
  const light=new THREE.DirectionalLight(0xffffff,2.2);light.position.set(-2,6,8);scene.add(light);
  const tilt=new THREE.Group(); tilt.rotation.z=.16; scene.add(tilt);
  const ring=new THREE.Group();tilt.add(ring);
  const count=Math.ceil(16/works.length)*works.length, angleStep=Math.PI*2/count, motion={position:0,target:0};
  let index=0, closed=false, dragging=null, wheelTimer, frameId, previousTime=performance.now(), ready=false;
  const materials=[],textures=[],meshes=[],covers=[];let hoverIndex=-1;
  function paintCover(state, hover=0, now=0) {
    const { canvas:c, ctx:x, image, i, texture }=state;
    x.clearRect(0,0,c.width,c.height);
    x.fillStyle='#101219';x.fillRect(0,0,c.width,c.height);
    x.fillStyle='#e8e8e3';x.fillRect(18,53,988,574);
    const scale=Math.min(988/image.width,574/image.height),w=image.width*scale,h=image.height*scale;
    x.drawImage(image,18+(988-w)/2,53+(574-h)/2,w,h);
    const veil=x.createLinearGradient(0,0,0,560);veil.addColorStop(0,'#071733a0');veil.addColorStop(.35,'#07173300');veil.addColorStop(1,'#0717339a');x.fillStyle=veil;x.fillRect(18,53,988,574);
    x.fillStyle='#ffffff';x.font='bold 37px Menlo, Monaco, monospace';x.fillText(works[i].en,46,110);
    x.font='20px Menlo, Monaco, monospace';x.fillText(works[i].title,47,574);
    x.font='13px monospace';x.fillText(`VISUAL ARCHIVE  /  ${String(i+1).padStart(2,'0')}`,47,603);
    if(hover>.005){
      x.fillStyle=`rgba(5,22,74,${.91*hover})`;x.fillRect(18,53,988,574);
      x.save();x.globalAlpha=hover;
      x.fillStyle='#dfe9ff';x.font='bold 23px monospace';x.textAlign='center';
      x.fillText('CLICK TO WATCH IMMERSIVELY',512,295);
      x.strokeStyle='#b7d6ff';x.lineWidth=2;x.strokeRect(266,330,492,31);
      const progress=((now*.28)%1);x.fillStyle='#dbe9ff';x.fillRect(271,335,482*progress,21);
      x.fillStyle='#8fb7ff';x.font='13px monospace';x.fillText(`${Math.floor(progress*100).toString().padStart(2,'0')}% / SIGNAL READY`,512,390);
      x.fillStyle='#9cc9ff66';for(let j=0;j<9;j++){const yy=75+(j*79+now*42)%520;x.fillRect(18,yy,988,1);}
      x.restore();
    }
    for(let hole=0;hole<24;hole++){x.clearRect(12+hole*42,12,19,24);x.clearRect(12+hole*42,644,19,24);}
    x.fillStyle='#b4c3e8';x.font='11px monospace';x.textAlign='left';x.fillText(`${String(i+1).padStart(2,'0')}  ▷  ${works[i].en}`,24,640);
    texture.needsUpdate=true;
  }
  works.forEach((work,i)=>{
    const c=document.createElement('canvas');c.width=1024;c.height=680;
    const texture=new THREE.CanvasTexture(c);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());textures.push(texture);
    const state={canvas:c,ctx:c.getContext('2d'),image:artwork(category,i),i,texture,hover:0};covers.push(state);paintCover(state);
    const mat=new THREE.MeshStandardMaterial({map:texture,side:THREE.DoubleSide,alphaTest:.5,roughness:.72,metalness:0});materials.push(mat);
    const img=new Image();img.onload=()=>{if(!closed){state.image=img;paintCover(state,state.hover,performance.now()/1000);}};img.src=previews[i];
  });
  for(let slot=0;slot<count;slot++){
    const mesh=new THREE.Mesh(filmSegment(10,2.55,slot*angleStep-angleStep/2,slot*angleStep+angleStep/2),materials[slot%works.length]);
    mesh.userData.slot=slot;ring.add(mesh);meshes.push(mesh);
  }
  const dots=dialog.querySelector('.film-dots');
  works.forEach((work,i)=>{const b=document.createElement('button');b.setAttribute('aria-label',`Select artwork: ${work.title}`);b.onclick=()=>{const at=Math.round(motion.target),d=wrapIndex(i-wrapIndex(at,works.length)+works.length/2,works.length)-works.length/2;settle(at+d);};dots.append(b);});
  function labels(){index=wrapIndex(Math.round(motion.position),works.length);dialog.querySelector('.film-count').textContent=`${String(index+1).padStart(2,'0')} / ${String(works.length).padStart(2,'0')}`;dialog.querySelector('.film-meta').textContent=[works[index].title,works[index].year||works[index].kind].filter(Boolean).join(' / ');dialog.querySelector('.film-title-accessible').textContent=works[index].en;titleRipple.setText([works[index].en]);[...dots.children].forEach((b,i)=>b.setAttribute('aria-pressed',i===index));}
  function settle(value){motion.target=Math.round(value);if(reduced){motion.position=motion.target;labels();}}
  function step(d){if(!full.hidden)return;clearTimeout(wheelTimer);settle(Math.round(motion.target)+d);}
  function inspect(){settle(motion.position);labels();full.querySelector('.film-original').src=sources[index];full.querySelector('.film-original').alt=works[index].title;full.querySelector('.film-cover-transition').src=previews[index];full.querySelector('p').textContent=works[index].title+' / '+works[index].kind;full.hidden=false;full.querySelector('button').focus();if(!reduced){gsap.fromTo(full,{opacity:0},{opacity:1,duration:.35});gsap.fromTo(full.querySelector('.film-cover-transition'),{opacity:1,scale:1.08,y:-22},{opacity:0,scale:1,y:42,duration:1.05,ease:'power2.inOut'});}else gsap.set(full.querySelector('.film-cover-transition'),{opacity:0});}
  function fold(){full.hidden=true;gsap.killTweensOf(full.querySelector('.film-cover-transition'));dialog.querySelector('.film-open').focus();}
  function close(){if(closed)return;closed=true;titleRipple.dispose();gsap.killTweensOf(full);clearTimeout(wheelTimer);cancelAnimationFrame(frameId);observer.disconnect();meshes.forEach(m=>m.geometry.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());renderer.dispose();disposeGuide();dialog.close();dialog.remove();onClose();if(previous?.isConnected)previous.focus({preventScroll:true});}
  dialog.querySelector('.film-close').onclick=close;dialog.querySelector('.film-prev').onclick=()=>step(-1);dialog.querySelector('.film-next').onclick=()=>step(1);dialog.querySelector('.film-open').onclick=inspect;dialog.querySelector('.film-unfold-close').onclick=fold;
  dialog.addEventListener('cancel',e=>{e.preventDefault();full.hidden?close():fold();});
  dialog.addEventListener('keydown',e=>{if(!full.hidden)return;if(['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();step(e.key==='ArrowLeft'?-1:1);}});
  const raycaster=new THREE.Raycaster();
  function hit(e){const r=stage.getBoundingClientRect();raycaster.setFromCamera(new THREE.Vector2((e.clientX-r.left)/r.width*2-1,1-(e.clientY-r.top)/r.height*2),camera);return raycaster.intersectObjects(meshes,false)[0];}
  stage.addEventListener('pointerdown',e=>{if(e.button!==0||dragging)return;clearTimeout(wheelTimer);motion.target=motion.position;dragging={id:e.pointerId,x:e.clientX,origin:motion.position,moved:false,lastX:e.clientX,time:performance.now(),velocity:0};stage.setPointerCapture(e.pointerId);stage.classList.add('is-dragging');});
  stage.addEventListener('pointermove',e=>{if(!dragging){const target=hit(e);hoverIndex=target?target.object.userData.slot%works.length:-1;stage.style.cursor=target?'grab':'default';return;}if(e.pointerId!==dragging.id)return;const dx=e.clientX-dragging.x;if(Math.abs(dx)>6)dragging.moved=true;const now=performance.now(), span=Math.max(140,stage.clientWidth*.36);dragging.velocity=-(e.clientX-dragging.lastX)/span/Math.max((now-dragging.time)/1000,.008);dragging.lastX=e.clientX;dragging.time=now;motion.target=dragging.origin-dx/span;});
  function release(e,cancel=false){if(!dragging||e.pointerId!==dragging.id)return;const moved=dragging.moved, velocity=performance.now()-dragging.time<100?dragging.velocity:0;dragging=null;stage.classList.remove('is-dragging');if(stage.hasPointerCapture(e.pointerId))stage.releasePointerCapture(e.pointerId);settle(motion.target+(cancel?0:THREE.MathUtils.clamp(velocity*.12,-.7,.7)));if(!moved&&!cancel){const target=hit(e);if(target){const current=wrapIndex(Math.round(motion.position),count),slot=target.object.userData.slot,delta=wrapIndex(slot-current+count/2,count)-count/2;if(delta===0)inspect();else settle(Math.round(motion.position)+delta);}}}
  stage.addEventListener('pointerleave',()=>{if(!dragging)hoverIndex=-1;});
  stage.addEventListener('pointerup',e=>release(e));stage.addEventListener('pointercancel',e=>release(e,true));stage.addEventListener('lostpointercapture',e=>release(e,true));
  stage.addEventListener('wheel',e=>{e.preventDefault();if(dragging)return;const unit=e.deltaMode===1?16:e.deltaMode===2?stage.clientHeight:1;motion.target+=THREE.MathUtils.clamp((e.deltaX||e.deltaY)*unit,-120,120)*.004;labels();clearTimeout(wheelTimer);wheelTimer=setTimeout(()=>settle(motion.target),140);},{passive:false});
  function resize(){const w=stage.clientWidth,h=stage.clientHeight;renderer.setSize(w,h);camera.aspect=w/h;camera.position.set(0,1.6,dialog.clientWidth<600?15.4:13.9);camera.zoom=1;camera.lookAt(0,.25,10);camera.updateProjectionMatrix();
    camera.updateMatrixWorld();tilt.updateMatrixWorld(true);
    const left=new THREE.Vector3(-1,0,10).applyMatrix4(tilt.matrixWorld).project(camera),right=new THREE.Vector3(1,0,10).applyMatrix4(tilt.matrixWorld).project(camera);
    captionAngle=Math.atan2(-(right.y-left.y)*h,(right.x-left.x)*w);
    caption.style.transform=`rotate(${captionAngle}rad)`;
  }
  const observer=new ResizeObserver(resize);observer.observe(stage);resize();labels();
  stage.setAttribute('aria-busy','true');
  renderer.compileAsync(scene,camera).then(()=>{if(closed)return;textures.forEach(t=>renderer.initTexture(t));ready=true;stage.setAttribute('aria-busy','false');}).catch(error=>{console.warn('Film precompile:',error);if(!closed){ready=true;stage.setAttribute('aria-busy','false');}});
  function frame(now){
    if(closed)return;
    const dt=Math.min((now-previousTime)/1000,.05);previousTime=now;
    if(!document.hidden && ready){
      if(full.hidden)titleRipple.update(now/1000,dt);
      motion.position=reduced?motion.target:THREE.MathUtils.damp(motion.position,motion.target,dragging?18:9,dt);
      if(!dragging && Math.abs(motion.position-motion.target)<.0001){motion.position=motion.target;if(Number.isInteger(motion.target)){motion.target=motion.position=wrapIndex(motion.target,count);}}
      const next=wrapIndex(Math.round(motion.position),works.length);if(next!==index)labels();
      covers.forEach((cover,i)=>{const target=i===hoverIndex&&!dragging&&full.hidden?1:0;const next=reduced?target:THREE.MathUtils.damp(cover.hover,target,9,dt);if(Math.abs(next-cover.hover)>.002||next>.99&&target){cover.hover=next;paintCover(cover,next,now/1000);}});
      ring.rotation.y=-motion.position*angleStep;renderer.render(scene,camera);
    }
    frameId=requestAnimationFrame(frame);
  }frameId=requestAnimationFrame(frame);
  dialog.querySelector('.film-next').focus({preventScroll:true});
}
