import { addInteractionGuide } from './interaction-guide.js';
import { createLetterPaper } from './letter-paper.js';
import * as THREE from 'three';
import gsap from 'gsap';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { createRecordDetent, recordDragTarget } from './record-detent.js';
import { createLetterRoom } from './letter-room.js';
import { papers as manuscripts } from './english-copy.js';
import { paperPalette, stylePaperModel } from './paper-style.js';
import { applySignalIndexTexture } from './letter-texture.js';

export async function openLetterSpace({ onClose, reduced = false }) {
  const host = document.createElement('section'); host.className = 'letter-space'; host.setAttribute('aria-label', 'Folded manuscript archive');
  host.innerHTML = `<div class="letter-stage" aria-label="Click a fold to select a paper"></div><button class="record-back" aria-label="Back to TV Tower">←</button><button class="letter-zoom" disabled>FOCUS ON PAPERS ↗</button><span class="letter-gesture">DRAG OR SWIPE HORIZONTALLY / WIDE ↔ PAPER ↔ READING</span><div class="letter-labels"></div><button class="letter-peek" hidden><span class="letter-stamp">MANUSCRIPT</span><strong></strong><span class="letter-meta"></span><span class="letter-summary"></span><span class="letter-excerpt"></span><span class="letter-peek-arrow" aria-hidden="true">↗</span></button><dialog class="letter-reader" aria-labelledby="letter-title"><button class="letter-fold-back" aria-label="Close paper">↙</button><article tabindex="0"><div class="letter-sheet letter-sheet-top"><span class="letter-stamp">MANUSCRIPT / <span class="letter-number"></span></span><h1 id="letter-title"></h1><p class="letter-reader-meta"></p></div><div class="letter-sheet letter-sheet-body"></div><div class="letter-sheet letter-sheet-end">END OF DOCUMENT.</div></article></dialog><span class="letter-status" role="status">ARRANGING PAPERS…</span>`;
  const background = [...document.body.children].filter(el => el.tagName !== 'SCRIPT').map(el => [el, el.inert]);
  background.forEach(([el]) => { el.inert = true; }); const disposeGuide = addInteractionGuide(host, 'letters');
  document.body.append(host);
  const stage = host.querySelector('.letter-stage'), peek = host.querySelector('.letter-peek'), reader = host.querySelector('dialog'), status = host.querySelector('.letter-status');
  let renderer, model, frame, disposed = false, selected = -1, reading = false, animation, disposePaperStyle, disposeRoom, disposeSignalPrint;
  const labels = [], hinges = [], surfaces = [], resources = new Set(), textures = [], cleanups = [];
  const scene = new THREE.Scene(); scene.background = new THREE.Color(paperPalette.background);
  const camera = new THREE.PerspectiveCamera(35, 1, .1, 80); const ray = new THREE.Raycaster();
  const center = new THREE.Vector3(0, 2.7, 0); let height = 5.5;
  let zoomTarget=0,zoom=0,lastTime=performance.now(),drag=null,wheelTimer,selectionPosition=0,selectionTarget=0,selectionLock=0;
  const detent=createRecordDetent(manuscripts.length-1,true,{threshold:95,cooldown:560,idle:240,repeat:true}),letterGroups=[],homes=[],cameraHome=new THREE.Vector3(),cameraLook=new THREE.Vector3(),focusPoint=new THREE.Vector3(),readPoint=new THREE.Vector3();
  const readMotion={amount:0};const readingOffsets=new Map();let openedHistory=false,returnWide=false;
  function setZoom(value){if(reading)return;zoomTarget=value;peek.inert=!value;host.dataset.zoom=value?'near':'wide';host.querySelector('.letter-zoom').textContent=value?'VIEW FULL ARCHIVE ↙':'FOCUS ON PAPERS ↗';if(value&&selected<0)choose(0);}
  host.querySelector('.letter-zoom').onclick=()=>setZoom(zoomTarget?0:1);
  function listen(el, event, fn, options) { el.addEventListener(event, fn, options); cleanups.push(() => el.removeEventListener(event, fn, options)); }
  const paperEffect=createLetterPaper(peek,reduced);
  function resize() {
    if (!renderer) return;
    const w = stage.clientWidth, h = stage.clientHeight; renderer.setSize(w, h); camera.aspect = w / h;
    const distance = Math.max(height * 1.04 / Math.tan(THREE.MathUtils.degToRad(17.5)) / 2, 3.3 / camera.aspect);
    cameraHome.copy(center).add(new THREE.Vector3(.24,.2,1).normalize().multiplyScalar(distance));camera.updateProjectionMatrix();
  }
  const observer = new ResizeObserver(resize);
  function close() {
    if (disposed) return; disposed = true; animation?.kill(); cancelAnimationFrame(frame);clearTimeout(wheelTimer);letterGroups.forEach(g=>{gsap.killTweensOf(g.position);}); cleanups.forEach(fn => fn()); observer.disconnect();
    gsap.killTweensOf(peek);paperEffect.dispose(); reader.close();
    model?.traverse(o => { if (o.isMesh) { o.geometry.dispose(); (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => resources.add(m)); } });
    letterGroups.forEach(g=>g.traverse(o=>{if(o.isMesh){o.geometry.dispose();(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>resources.add(m));}}));disposeRoom?.dispose();disposePaperStyle?.();disposeSignalPrint?.(); resources.forEach(m => m.dispose()); textures.forEach(t => t.dispose()); renderer?.dispose(); disposeGuide();host.remove(); background.forEach(([el, inert]) => { el.inert = inert; }); onClose();
  }
  host.querySelector('.record-back').onclick = close;
  // As with the record player, browsing drives the actual glTF hinge rotations.
  // Each manuscript owns two connected leaves; their pivots remain on the crease.
  const browseAmounts=manuscripts.map(()=>0);
  function animateFolds(dt) {
    letterGroups.forEach((group,i)=>{
      const distance=Math.abs(THREE.MathUtils.euclideanModulo(selectionPosition-i+manuscripts.length/2,manuscripts.length)-manuscripts.length/2);
      const target=zoomTarget?Math.max(0,1-distance):0;
      browseAmounts[i]=reduced?target:THREE.MathUtils.damp(browseAmounts[i],target,5.8,dt);
      const opening=browseAmounts[i],home=homes[i];
      // Clear the stack first. The outer leaf follows with a slight delay.
      const inner=THREE.MathUtils.smoothstep(opening,.12,.85);
      const outer=THREE.MathUtils.smoothstep(opening,.32,1);
      group.position.copy(home.position);
      group.position.z+=opening*.68;
      group.position.y+=Math.sin(opening*Math.PI/2)*.18;
      hinges[i*2].rotation.x=THREE.MathUtils.lerp(home.first,.32,inner);
      hinges[i*2+1].rotation.x=THREE.MathUtils.lerp(home.second,-.85,outer);
    });
  }
  function choose(index) {
    if (disposed || reading || !manuscripts[index]) return;
    selected = index;disposeRoom?.setSeason(index);peek.inert=false;zoomTarget=1;host.dataset.zoom='near';host.querySelector('.letter-zoom').textContent='VIEW FULL ARCHIVE ↙';

    host.dataset.selected = String(index + 1);
    labels.forEach((b, i) => b.setAttribute('aria-pressed', String(i === index)));
    surfaces.forEach(({ mesh, index: i }) => { mesh.material.color.set(i === index ? '#c9dafb' : '#fffaf0'); });
    const work = manuscripts[index];
    peek.querySelector('strong').textContent = work.title; peek.querySelector('.letter-meta').textContent = `${work.kind} · ${work.author}`;
    peek.querySelector('.letter-summary').textContent = work.summary;peek.querySelector('.letter-excerpt').textContent='CLICK TO UNFOLD AND READ THE ORIGINAL TEXT.'; peek.setAttribute('aria-label', `Read full text: ${work.title}`);
    peek.hidden = false; positionLabels(); gsap.killTweensOf(peek);
    gsap.fromTo(peek, { x: -130, opacity: 0, rotateY: -65,scaleX:.6 }, { x: 0, opacity: 1, rotateY: -3,scaleX:1, duration: reduced ? 0 : .8, ease: 'power3.out' });
    status.textContent = `Selected ${work.title}. Click the paper to read.`;
  }
  function foldBack(fromHistory=false) {
    if (!reading) return;readingOffsets.set(selected,reader.scrollTop);animation?.kill();
    if(openedHistory&&!fromHistory){history.back();return;}openedHistory=false;if(!fromHistory){const url=new URL(location.href);url.searchParams.delete('work');history.replaceState(null,'',url);}
    const article=reader.querySelector('article');
    reader.scrollTop=0;
    peek.hidden=false;peek.style.visibility='hidden';
    const destination=peek.getBoundingClientRect(),rect=article.getBoundingClientRect();
    animation=gsap.timeline({onComplete:()=>{
      reader.close();reading=false;peek.hidden=false;peek.style.visibility='';peek.inert=false;
      gsap.set(peek,{opacity:1,x:0,y:0,scale:1,rotateY:-3});
      gsap.set(article,{clearProps:'transform,opacity'});if(returnWide){returnWide=false;setZoom(0);}peek.focus({preventScroll:true});
    }});
    animation.to(reader,{'--reader-reveal':0,duration:reduced?0:.65,ease:'power2.inOut'},0);
    animation.to(article,{x:destination.left-rect.left,y:destination.top-rect.top,scale:destination.width/rect.width,duration:reduced?0:.8,ease:'power3.inOut'},0);
    animation.to(article,{opacity:0,duration:reduced?0:.12},reduced?0:.68);
    animation.call(()=>{peek.hidden=false;peek.style.visibility='';gsap.set(peek,{opacity:1});},[],reduced?0:.68);
  }
  function unfold(fromHistory=false) {
    if (selected < 0 || reading || disposed) return;
    reading = true;browseAmounts[selected]=1;peek.inert=true; const work = manuscripts[selected];
    if(!fromHistory){const url=new URL(location.href);url.searchParams.set('scene','letters');url.searchParams.set('work',String(selected+1));history.pushState({letter:true},'',url);openedHistory=true;}
    const group=letterGroups[selected],home=homes[selected];gsap.killTweensOf(group.position);
    readPoint.copy(center).add(new THREE.Vector3(0,.8,1.5));
    reader.querySelector('#letter-title').textContent = work.title; reader.querySelector('.letter-number').textContent = String(selected + 1).padStart(2, '0');
    reader.querySelector('.letter-reader-meta').textContent = `${work.kind} / ${work.author}`;
    const body = reader.querySelector('.letter-sheet-body'); body.replaceChildren(...work.paragraphs.map(text => { const heading=text.trim().length<60 && !/^[\[【]/.test(text.trim()) && (/^(摘要|正文|引言|结语|结论|参考文献|目录)/.test(text.trim()) || /^[一二三四五六七八九十]+[、，.．]/.test(text.trim())); const p = document.createElement(heading?'h2':'p'); p.textContent = text; return p; }));
    reader.scrollTop = 0;
    const article = reader.querySelector('article');
    animation?.kill(); gsap.set(article, { opacity: 1, rotateX: 0 });
    // Match the paper's on-screen rectangle, then push straight into it.
    // The model stays in place; one continuous paper surface leads into reading.
    const previewBounds=peek.getBoundingClientRect();
    reader.showModal();reader.scrollTop=0;
    gsap.set(article,{x:0,y:0,scale:1,opacity:1});
    const destination=article.getBoundingClientRect();
    gsap.set(reader,{'--reader-reveal':0});
    gsap.set(article,{x:previewBounds.left-destination.left,y:previewBounds.top-destination.top,scale:previewBounds.width/destination.width,transformOrigin:'top left'});
    peek.style.visibility='hidden';
    animation=gsap.timeline({onComplete:()=>{
      peek.style.visibility='';peek.hidden=true;
      reader.scrollTop=readingOffsets.get(selected)||0;
      host.querySelector('.letter-fold-back').focus({preventScroll:true});
    }});
    animation.to(article,{x:0,y:0,scale:1,duration:reduced?0:1.05,ease:'power3.inOut'},0);
    animation.to(reader,{'--reader-reveal':1,duration:reduced?0:.8,ease:'power2.inOut'},reduced?0:.2);

  }
  function navigateLetter(direction){
    if(animation?.isActive())return;
    if(direction>0){
      if(reading)return;
      if(!zoomTarget){setZoom(1);return;}
      positionLabels();unfold();
    }else if(reading){returnWide=false;foldBack();}
    else if(zoomTarget)setZoom(0);
  }
  let swipe=null,suppressClickUntil=0;
  listen(host,'pointerdown',e=>{
    if(e.button!==0||animation?.isActive())return;
    swipe={id:e.pointerId,x:e.clientX,y:e.clientY};
  },true);
  listen(window,'pointerup',e=>{
    if(!swipe||swipe.id!==e.pointerId)return;
    const dx=e.clientX-swipe.x,dy=e.clientY-swipe.y;swipe=null;
    if(Math.abs(dx)<75||Math.abs(dx)<Math.abs(dy)*1.3)return;
    suppressClickUntil=performance.now()+350;
    // Cancel the stage gesture so it cannot also change zoom on release.
    drag=null;
    if(animation?.isActive())return;
    navigateLetter(dx>0?1:-1);
  },true);
  listen(window,'pointercancel',()=>{swipe=null;});
  listen(host,'click',e=>{
    if(performance.now()<suppressClickUntil){e.preventDefault();e.stopImmediatePropagation();}
  },true);
  peek.onclick = ()=>unfold(); host.querySelector('.letter-fold-back').onclick = ()=>foldBack();
  listen(window,'popstate',()=>{if(reading)foldBack(true);});
  listen(reader, 'cancel', e => { e.preventDefault(); e.stopPropagation(); foldBack(); });
  listen(host, 'keydown', e => { if (e.key !== 'Escape') return; e.stopPropagation(); if (reading) return; if (selected >= 0) { const old = selected; selected = -1; peek.hidden = true; labels.forEach(b => b.setAttribute('aria-pressed', 'false')); surfaces.forEach(({mesh}) => mesh.material.color.set('#fffaf0')); labels[old].focus(); } else close(); });
  function positionLabels() {
    if (!model) return;
    model.updateMatrixWorld(true);
    labels.forEach((b, i) => {
      // DOM labels have no depth test: hide other letters while a fold is in front.
      b.hidden = reading || ((zoomTarget > 0 || zoom > .05) && i !== selected);
      if (b.hidden) return;
      const v = hinges[i * 2].localToWorld(new THREE.Vector3(-.61, .3, .01)).project(camera);
      b.style.left = `${(v.x * .5 + .5) * stage.clientWidth}px`; b.style.top = `${(-v.y * .5 + .5) * stage.clientHeight}px`;
    });
    if (selected >= 0) {
      const v = hinges[selected * 2].localToWorld(new THREE.Vector3(.74, .3, 0)).project(camera);
      const w = stage.clientWidth, h = stage.clientHeight, pw = peek.offsetWidth, ph = peek.offsetHeight;
      if(!reading)peek.style.left = `${w>650?w*.59:Math.max(12,w-pw-16)}px`;
      if(!reading)peek.style.top = `${Math.max(85,(h-ph)*.48)}px`;
    }
  }
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true }); renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.outputColorSpace = THREE.SRGBColorSpace; stage.append(renderer.domElement);
    renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    scene.add(new THREE.HemisphereLight(0xf6f9ff, 0xb6c4db, 1.65));
    const light = new THREE.DirectionalLight(0xf1faff, 2.0); light.position.set(-5, 8, 4); light.castShadow=true;
    light.shadow.mapSize.set(2048,2048);Object.assign(light.shadow.camera,{left:-7,right:7,top:9,bottom:-5,near:.1,far:30});
    light.shadow.normalBias=.025;light.shadow.bias=-.00015;light.shadow.radius=3;scene.add(light);
    observer.observe(stage); resize();
    const gltf = await new GLTFLoader().loadAsync(`${import.meta.env.BASE_URL}models/fold-installation.glb`); model = gltf.scene;
    if (disposed) { model.traverse(o => { if (o.isMesh) { o.geometry.dispose(); (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => m.dispose()); } }); return; }
    scene.add(model);
    for (let i = 1; i <= 8; i++) { const h = model.getObjectByName(`Fold_${String(i).padStart(2, '0')}_Hinge`); if (!h) throw new Error('Fold hinge missing'); hinges.push(h); }
    model.traverse(o => {
      if (!o.isMesh) return;
      o.castShadow=true;o.receiveShadow=true;
      let owner = o, match;
      while (owner && !match) { match = owner.name.match(/^Fold_(\d+)_Hinge_Geometry/); owner = owner.parent; }
      if (match) { resources.add(o.material); o.material = o.material.clone(); o.material.color.set('#fffaf0'); surfaces.push({ mesh: o, index: Math.floor((Number(match[1]) - 1) / 2) }); }
    });
    disposePaperStyle = stylePaperModel(model, { keep: mesh => surfaces.some(surface => surface.mesh === mesh) });
    disposeSignalPrint = applySignalIndexTexture(model, manuscripts);
    const bounds = new THREE.Box3().setFromObject(model); disposeRoom=createLetterRoom(scene,bounds,light,reduced);bounds.getCenter(center); height = bounds.getSize(new THREE.Vector3()).y; resize();
    model.updateMatrixWorld(true);
    manuscripts.forEach((_,i)=>{const h=hinges[i*2],group=new THREE.Group();h.getWorldPosition(group.position);scene.add(group);group.attach(h);letterGroups.push(group);homes.push({position:group.position.clone(),first:h.rotation.x,second:hinges[i*2+1].rotation.x});});
    // Independent groups preserve the original world transforms of the folded chain.
    host.querySelector('.letter-zoom').disabled=false;
    manuscripts.forEach((work, i) => {
      const b = document.createElement('button'); b.className = 'letter-tab'; b.textContent = String(i + 1).padStart(2, '0'); b.setAttribute('aria-label', `Select fold: ${work.title}`); b.setAttribute('aria-pressed', 'false'); b.onclick = () => {selectionTarget=selectionPosition=i;choose(i);}; labels.push(b); host.querySelector('.letter-labels').append(b);
    });
    const pick = e => {
      const rect = stage.getBoundingClientRect(); ray.setFromCamera(new THREE.Vector2((e.clientX - rect.left) / rect.width * 2 - 1, -(e.clientY - rect.top) / rect.height * 2 + 1), camera);
      const hit = ray.intersectObjects([model,...letterGroups], true)[0];
      // Match only a fold's own paper; serial parent ancestry would also select ornaments.
      const index=hit ? surfaces.find(s => s.mesh === hit.object)?.index : undefined;return index<manuscripts.length?index:undefined;
    };
    listen(stage,'pointerdown',e=>{if(reading||e.button!==0)return;clearTimeout(wheelTimer);detent.reset();drag={id:e.pointerId,x:e.clientX,y:e.clientY,axis:null,base:Math.round(selectionTarget)};stage.setPointerCapture(e.pointerId);});
    listen(stage,'pointermove',e=>{if(!drag){stage.style.cursor=pick(e)===undefined?'grab':'pointer';return;}const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(!drag.axis&&Math.max(Math.abs(dx),Math.abs(dy))>8)drag.axis=Math.abs(dx)>Math.abs(dy)?'x':'y';if(drag.axis==='y'&&performance.now()>selectionLock){setZoom(1);selectionTarget=recordDragTarget(drag.base,-dy,manuscripts.length-1,false,true);}});
    function release(e){if(!drag||drag.id!==e.pointerId)return;const d=drag;drag=null;if(stage.hasPointerCapture(e.pointerId))stage.releasePointerCapture(e.pointerId);if(e.type!=='pointerup'){selectionTarget=d.base;return;}if(d.axis==='x'){if(Math.abs(e.clientX-d.x)>60)setZoom(e.clientX<d.x?1:0);}else if(d.axis==='y'){if(performance.now()<=selectionLock){selectionTarget=d.base;return;}selectionTarget=recordDragTarget(d.base,d.y-e.clientY,manuscripts.length-1,true,true);selectionLock=performance.now()+560;}else{const hit=pick(e);if(hit!==undefined){selectionTarget=selectionPosition=hit;choose(hit);}else setZoom(zoomTarget?0:1);}}
    listen(stage,'pointerup',release);listen(stage,'pointercancel',release);
    let horizontalTotal=0,horizontalLast=-Infinity,horizontalLock=0,horizontalConsumed=false;
    listen(host,'wheel',e=>{
      const now=performance.now();
      if(Math.abs(e.deltaX)>Math.abs(e.deltaY)*1.2){
        e.preventDefault();
        if(now-horizontalLast>240){horizontalTotal=0;horizontalConsumed=false;}
        horizontalLast=now;
        if(horizontalConsumed||now<horizontalLock||animation?.isActive())return;
        horizontalTotal+=e.deltaX*(e.deltaMode===1?16:1);
        if(Math.abs(horizontalTotal)<85)return;
        // Natural scrolling reports the opposite sign to the fingers' movement.
        const towardReading=horizontalTotal<0;
        horizontalTotal=0;horizontalConsumed=true;horizontalLock=now+900;
        navigateLetter(towardReading?1:-1);
        return;
      }
      if(reading)return;
      e.preventDefault();setZoom(1);if(now<selectionLock)return;
      const step=detent.wheel(selectionTarget,e.deltaY*(e.deltaMode===1?16:e.deltaMode===2?stage.clientHeight:1),now);
      selectionTarget=step.target;clearTimeout(wheelTimer);wheelTimer=setTimeout(()=>selectionTarget=Math.round(selectionTarget),240);
    },{passive:false});
    listen(host,'keydown',e=>{if(reading)return;if(['ArrowUp','ArrowDown'].includes(e.key)&&!e.repeat){e.preventDefault();setZoom(1);if(performance.now()<selectionLock)return;selectionLock=performance.now()+560;selectionTarget=Math.round(selectionTarget)+(e.key==='ArrowDown'?1:-1);}if(e.key==='ArrowLeft')setZoom(1);if(e.key==='ArrowRight')setZoom(0);});
    status.classList.add('record-sr'); status.textContent = `${manuscripts.length} papers ready`; labels[0].focus({ preventScroll: true });
    function render(now=performance.now()) {
      if(disposed)return;const dt=Math.min((now-lastTime)/1000,.05);lastTime=now;
      zoom=reduced?zoomTarget:THREE.MathUtils.damp(zoom,zoomTarget,5,dt);
      if(!reading){selectionPosition=reduced?selectionTarget:THREE.MathUtils.damp(selectionPosition,selectionTarget,10,dt);const next=THREE.MathUtils.euclideanModulo(Math.round(selectionPosition),manuscripts.length);if(zoomTarget&&next!==selected)choose(next);}
      if(!reading)animateFolds(dt);
      disposeRoom?.update(dt);
      paperEffect.update(dt);
      const anchor=selected>=0?(reading?homes[selected].position:letterGroups[selected].position):center;focusPoint.copy(anchor).add(new THREE.Vector3(0,.4,0));
      const compositionPoint=focusPoint.clone();compositionPoint.x+=camera.aspect>1? .9:.35;
      cameraLook.copy(center).lerp(compositionPoint,zoom).lerp(readPoint,readMotion.amount);
      const nearDistance=Math.max(3.4,2.5/camera.aspect),readDistance=Math.max(1.5,1.7/camera.aspect);
      camera.position.copy(cameraHome).lerp(compositionPoint.clone().add(new THREE.Vector3(.12,.3,nearDistance)),zoom).lerp(readPoint.clone().add(new THREE.Vector3(0,0,readDistance)),readMotion.amount);camera.lookAt(cameraLook);
      if(!reading)peek.style.opacity=zoom;host.querySelector('.letter-labels').style.opacity=1-readMotion.amount;
      positionLabels();renderer.render(scene,camera);frame=requestAnimationFrame(render);
    } render();
    const requested=Number(new URL(location.href).searchParams.get('work'))-1;if(requested>=0&&requested<manuscripts.length){selectionTarget=selectionPosition=requested;choose(requested);unfold(true);}
  } catch (error) { console.error(error); status.textContent = 'Paper archive failed to load. Go back and retry.'; }
  return { close };
}
