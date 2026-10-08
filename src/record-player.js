import { addInteractionGuide } from './interaction-guide.js';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { paperPalette, stylePaperModel } from './paper-style.js';
import { categories } from './data.js';
import { artwork } from './artwork.js';
import { createRecordDetent, recordDragTarget } from './record-detent.js';
import { createRippleType } from './ripple-type.js';

export const recordWorks = categories.find(c => c.id === 'image').projects.map((work, i) => ({ ...work, color: ['#234fa2','#567190','#344e83'][i%3], cover: work.cover ? `${import.meta.env.BASE_URL}${work.cover}` : null, previewCover: work.previewCover ? `${import.meta.env.BASE_URL}${work.previewCover}` : null, discCover: work.discCover ? `${import.meta.env.BASE_URL}${work.discCover}` : null, video: work.video ? `${import.meta.env.BASE_URL}${work.video}` : null }));

export async function openRecordPlayer({ onClose, reduced = false }) {
  const previous=document.activeElement, host=document.createElement('section');
  host.className='record-space record-cinema';host.setAttribute('aria-label','Record player film archive');
  host.innerHTML=`<header class="record-heading"><button class="record-back" aria-label="Back to TV Tower">↖</button><span>SHI PIN / MOTION ARCHIVE</span><span class="record-counter"></span></header><div class="record-stage" tabindex="0" role="region" aria-label="Record player. Click the screen for a close-up; click the disc to play or pause; drag vertically or scroll to change films."></div><aside class="record-notes"><span class="record-kicker">SIDE A / SELECTED FILM</span><h1 class="record-wave-heading"><span class="record-title-label record-sr"></span><span class="record-title-wave" aria-hidden="true"></span></h1><p class="record-subtitle"></p><div class="record-lyrics"></div><button class="record-toggle" disabled>LOADING…</button><button class="record-watch" disabled>← SWIPE LEFT / FILM ONLY</button><p class="record-demo">MOTION PREVIEW</p></aside><footer class="record-controls"><span class="record-browse-hint">CLICK SCREEN / CLOSE-UP · CLICK DISC / PLAY · ↕ SCROLL / SELECT</span><div class="record-pages" aria-label="Select film"></div><span class="record-time">00:00 / 00:24</span><input class="record-seek" type="range" min="0" max="24" step="0.1" value="0" aria-label="Playback position"><button class="record-mute" aria-label="Mute audio">AUDIO ON</button></footer><span class="record-status record-sr" role="status"></span>`;
  const background=[...document.body.children].filter(e=>e.tagName!=='SCRIPT').map(e=>[e,e.inert]);background.forEach(([e])=>e.inert=true);const disposeGuide = addInteractionGuide(host, 'record');
  document.body.append(host);
  const $=s=>host.querySelector(s),stage=$('.record-stage'),status=$('.record-status');
  const immersive=document.createElement('section');immersive.className='record-immersive';immersive.setAttribute('aria-label','Full-screen film');immersive.inert=true;
  immersive.innerHTML='<canvas class="record-full-film" width="1024" height="600" aria-label="Film preview"></canvas><nav class="record-full-nav"><button class="record-details">SWIPE RIGHT / DETAILS →</button><span class="record-full-title"></span><button class="record-full-toggle">▶ PLAY</button></nav>';
  host.append(immersive);const fullCtx=$('.record-full-film').getContext('2d');
  let viewTarget=0,viewPosition=0,viewMode=0,viewWheelTimer;
  function setView(mode){
    viewMode=mode;viewTarget=mode;host.dataset.view=mode?'film':'details';immersive.inert=!mode;
    [stage,$('.record-notes'),$('.record-controls'),$('.record-heading')].forEach(el=>el.inert=!!mode);
    if(mode){browsing=false;clearTimeout(browseTimer);browseTarget=Math.round(browseTarget);$('.record-details').focus({preventScroll:true});}
    else $('.record-watch').focus({preventScroll:true});
  }
  const titleRipple=createRippleType($('.record-title-wave'),reduced,{width:1200,height:260,fontSize:180,center:true,transition:true,lines:[recordWorks[0].en]});
  let browseTarget=0,browseProgress=0,browseOpen=0,browsing=false,browseTimer,drag=null,foldLift,rails,hinges=[],textStrength=0,textActive=false;
  const detent=createRecordDetent(recordWorks.length-1,true);let wheelSettleTimer,detentLock=0;
  const filterId='record-ink-'+Math.random().toString(36).slice(2);
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('width','0');svg.setAttribute('height','0');svg.style.position='absolute';svg.innerHTML=`<defs><filter id="${filterId}" x="-10%" y="-15%" width="120%" height="130%"><feTurbulence type="fractalNoise" baseFrequency=".012 .04" numOctaves="2" seed="4" result="noise"/><feDisplacementMap in="SourceGraphic" in2="noise" scale="0" xChannelSelector="R" yChannelSelector="G"/></filter></defs>`;host.append(svg);$('.record-lyrics').style.filter=`url(#${filterId})`;
  const displacement=svg.querySelector('feDisplacementMap');

  let renderer,model,frame,disposeStyle,disposed=false,index=0,playing=false,engage=0,elapsed=0,last=performance.now(),disc,arm,lift,screen,coverMesh,videoTexture,loadToken=0,posterImage=null,posterToken=0,screenHoverTarget=0,screenHover=0;
  const resources=new Set(),cleanups=[];
  const video=document.createElement('video');video.playsInline=true;video.preload='metadata';video.muted=false;video.className='record-full-video';video.hidden=true;immersive.prepend(video);
  const scene=new THREE.Scene();scene.background=new THREE.Color(paperPalette.background);
  const camera=new THREE.PerspectiveCamera(33,1,.1,50);
  const screenCenter=new THREE.Vector3(),screenNormal=new THREE.Vector3(),screenRotation=new THREE.Quaternion(),focusPosition=new THREE.Vector3(),lookTarget=new THREE.Vector3();
  const screenCanvas=document.createElement('canvas');screenCanvas.width=1024;screenCanvas.height=600;const ctx=screenCanvas.getContext('2d');
  const screenTexture=new THREE.CanvasTexture(screenCanvas);screenTexture.colorSpace=THREE.SRGBColorSpace;resources.add(screenTexture);
  const coverCanvas=document.createElement('canvas');coverCanvas.width=coverCanvas.height=512;const coverCtx=coverCanvas.getContext('2d');const coverTexture=new THREE.CanvasTexture(coverCanvas);coverTexture.colorSpace=THREE.SRGBColorSpace;resources.add(coverTexture);
  function listen(target,event,fn,opts){target.addEventListener(event,fn,opts);cleanups.push(()=>target.removeEventListener(event,fn,opts));}
  function duration(){return recordWorks[index].video&&Number.isFinite(video.duration)?video.duration:24;}
  function timeLabel(t){return `${String(Math.floor(t/60)).padStart(2,'0')}:${String(Math.floor(t%60)).padStart(2,'0')}`;}
  function sync(){$('.record-full-toggle').textContent=playing?'Ⅱ PAUSE':'▶ PLAY';$('.record-full-toggle').setAttribute('aria-pressed',String(playing));host.dataset.playing=String(playing);$('.record-toggle').textContent=playing?'Ⅱ PAUSE FILM':elapsed>=duration()?'↻ REPLAY':elapsed>0?'▶ RESUME':'▶ CLICK THE DISC / PLAY';$('.record-toggle').setAttribute('aria-pressed',String(playing));status.textContent=playing?'Playing '+recordWorks[index].title:'Paused '+recordWorks[index].title;}
  async function toggle(){
    if(!model)return;
    browsing=false;clearTimeout(browseTimer);browseTarget=Math.round(browseTarget);
    if(playing){playing=false;video.pause();sync();return;}
    const token=++loadToken;
    if(elapsed>=duration()){elapsed=0;video.currentTime=0;}
    if(recordWorks[index].video){try{await video.play();}catch{status.textContent='Video unavailable. Please check the file.';return;}}
    if(disposed||token!==loadToken)return;
    playing=true;sync();
  }
  function select(next){
    loadToken++;playing=false;video.pause();elapsed=0;index=(next+recordWorks.length)%recordWorks.length;
    videoTexture?.dispose();videoTexture=null;video.removeAttribute('src');video.load();
    const work=recordWorks[index];$('.record-full-title').textContent=work.title;video.hidden=!work.video;$('.record-full-film').hidden=!!work.video;if(work.video){video.src=work.video;video.poster=work.previewCover||work.cover||'';videoTexture=new THREE.VideoTexture(video);videoTexture.colorSpace=THREE.SRGBColorSpace;}
    posterImage=null;const currentPoster=++posterToken;if(work.previewCover){const img=new Image();img.onload=()=>{if(!disposed&&currentPoster===posterToken)posterImage=img;};img.src=work.previewCover;}
    if(screen){screen.material.map=screenTexture;screen.material.needsUpdate=true;}
    $('.record-counter').textContent=`${String(index+1).padStart(2,'0')} / ${String(recordWorks.length).padStart(2,'0')}`;
    $('.record-kicker').textContent=`SIDE ${String.fromCharCode(65+index)} / SELECTED FILM`;
    $('.record-title-label').textContent=work.en;titleRipple.setText([work.en]);$('.record-subtitle').textContent=[work.title,work.year].filter(Boolean).join(' / ');
    $('.record-lyrics').replaceChildren(...[work.description,work.note,work.role].flatMap(t=>t.split(/[。；]/).filter(Boolean)).map(line=>{const p=document.createElement('p');p.textContent=line;return p;}));
    $('.record-demo').textContent=work.video?'ORIGINAL FILM / '+work.kind:'MOTION PREVIEW';
    [...$('.record-pages').children].forEach((b,i)=>b.setAttribute('aria-pressed',String(i===index)));
    const art=artwork(categories.find(c=>c.id==='image'),index);coverCtx.drawImage(art,0,0,512,512);coverTexture.needsUpdate=true;
    if(work.discCover||work.cover){const selected=index,img=new Image();img.onload=()=>{if(!disposed&&index===selected){const side=Math.min(img.naturalWidth,img.naturalHeight);coverCtx.drawImage(img,(img.naturalWidth-side)/2,(img.naturalHeight-side)/2,side,side,0,0,512,512);coverTexture.needsUpdate=true;}};img.src=work.discCover||work.cover;}
    sync();
  }
  function startBrowse(){
    if(playing){playing=false;video.pause();sync();}browsing=true;clearTimeout(browseTimer);
    browseTimer=setTimeout(()=>{browseTarget=Math.round(browseTarget);browsing=false;},3200);
  }
  function browseBy(delta){if(!model||performance.now()<detentLock)return;startBrowse();browseTarget=Math.round(browseTarget)+Math.sign(delta);detentLock=performance.now()+420;}
  function wheelBrowse(delta){
    if(!model||drag)return;
    startBrowse();const result=detent.wheel(browseTarget,delta,performance.now());browseTarget=result.target;
    if(result.committed)detentLock=performance.now()+420;
    clearTimeout(wheelSettleTimer);wheelSettleTimer=setTimeout(()=>{browseTarget=Math.round(browseTarget);},240);
  }
  listen($('.record-lyrics'),'pointerenter',()=>textActive=true);listen($('.record-lyrics'),'pointerleave',()=>textActive=false);
  let viewportWidth=0,viewportHeight=0,viewportDirty=true;
  function resize(){
    if(!renderer)return;
    const w=Math.max(1,stage.clientWidth),h=Math.max(1,stage.clientHeight);
    if(w===viewportWidth&&h===viewportHeight){viewportDirty=false;return;}
    viewportWidth=w;viewportHeight=h;viewportDirty=false;
    // Resizing clears the drawing buffer: only do it immediately before rendering.
    renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();
  }
  const observer=new ResizeObserver(()=>{viewportDirty=true;});
  function close(){if(disposed)return;disposed=true;loadToken++;posterToken++;cancelAnimationFrame(frame);clearTimeout(browseTimer);clearTimeout(viewWheelTimer);clearTimeout(wheelSettleTimer);titleRipple.dispose();video.pause();video.removeAttribute('src');video.load();videoTexture?.dispose();observer.disconnect();cleanups.forEach(fn=>fn());disposeStyle?.();model?.traverse(o=>{if(o.isMesh){resources.add(o.geometry);(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>resources.add(m));}});resources.forEach(r=>r.dispose());renderer?.dispose();disposeGuide();host.remove();background.forEach(([e,inert])=>e.inert=inert);onClose();previous?.isConnected&&previous.focus({preventScroll:true});}
  $('.record-watch').onclick=()=>setView(1);$('.record-details').onclick=()=>setView(0);$('.record-full-toggle').onclick=toggle;
  $('.record-back').onclick=close;$('.record-toggle').onclick=toggle;
  $('.record-mute').onclick=()=>{video.muted=!video.muted;$('.record-mute').textContent=video.muted?'MUTED':'AUDIO ON';$('.record-mute').setAttribute('aria-label',video.muted?'Enable audio':'Mute audio');};
  listen(video,'ended',()=>{playing=false;sync();});listen(video,'error',()=>{playing=false;sync();status.textContent='Video failed to load. Select another film or retry.';});
  listen($('.record-seek'),'input',e=>{elapsed=Number(e.target.value);if(recordWorks[index].video&&video.readyState>=1)video.currentTime=elapsed;});
  listen(host,'keydown',e=>{if(e.key==='Escape'){e.stopPropagation();if(viewMode)setView(0);else close();}else if(e.target.tagName!=='INPUT'&&['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();setView(e.key==='ArrowLeft'?1:0);}else if(!viewMode&&e.target.tagName!=='INPUT'&&['ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();if(!e.repeat)browseBy(e.key==='ArrowDown'?1:-1);}else if(e.code==='Space'&&(e.target===stage||e.target===immersive)){e.preventDefault();toggle();}});
  recordWorks.forEach((work,i)=>{const b=document.createElement('button');b.style.setProperty('--work-color',work.color);b.setAttribute('aria-label',`Select film: ${work.title}`);b.onclick=()=>{clearTimeout(wheelSettleTimer);detent.reset();browseTarget=Math.round(browseTarget)+(i-THREE.MathUtils.euclideanModulo(Math.round(browseTarget),recordWorks.length));startBrowse();select(i);};$('.record-pages').append(b);});select(0);
  try{
    renderer=new THREE.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.8));renderer.outputColorSpace=THREE.SRGBColorSpace;stage.append(renderer.domElement);observer.observe(stage);resize();
    scene.add(new THREE.HemisphereLight(0xffffff,0x8894ac,2.2));const light=new THREE.DirectionalLight(0xffffff,2.5);light.position.set(-3,6,5);scene.add(light);
    const gltf=await new GLTFLoader().loadAsync(`${import.meta.env.BASE_URL}models/record-player.glb`);model=gltf.scene;
    if(disposed){model.traverse(o=>{if(o.isMesh){o.geometry.dispose();(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>m.dispose());}});return;}
    scene.add(model);model.traverse(o=>{if(o.isMesh)(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>resources.add(m));});
    disposeStyle=stylePaperModel(model);
    foldLift=model.getObjectByName('Fold_Lift');rails=model.getObjectByName('Fold_Telescopic_Rails');
    hinges=[1,2,3,4].map(i=>model.getObjectByName(`FoldPanel_0${i}_Hinge`));
    hinges.forEach((hinge,i)=>{const art=artwork(categories.find(c=>c.id==='image'),i%recordWorks.length);const texture=new THREE.CanvasTexture(art);texture.colorSpace=THREE.SRGBColorSpace;resources.add(texture);
      const card=new THREE.Mesh(new THREE.PlaneGeometry(1.42,.38),new THREE.MeshBasicMaterial({map:texture,side:THREE.DoubleSide}));card.position.set(0,.22,.065);hinge.add(card);
    });
    const lid=model.getObjectByName('Lid_Hinge');lid.rotation.x=THREE.MathUtils.degToRad(-100);
    // Add a predictable UV surface just above the original inset display.
    screen=new THREE.Mesh(new THREE.PlaneGeometry(1.93,1.13),new THREE.MeshBasicMaterial({map:screenTexture,side:THREE.DoubleSide}));screen.rotation.x=Math.PI/2;screen.position.set(0,.142,.66);lid.add(screen);
    disc=model.getObjectByName('Record_Pivot');arm=model.getObjectByName('Tonearm_Swivel');lift=model.getObjectByName('Tonearm_Lift');
    coverMesh=new THREE.Mesh(new THREE.CircleGeometry(.405,96),new THREE.MeshBasicMaterial({map:coverTexture}));coverMesh.rotation.x=-Math.PI/2;coverMesh.position.y=.016;disc.add(coverMesh);
    const hole=new THREE.Mesh(new THREE.CircleGeometry(.035,32),new THREE.MeshBasicMaterial({color:'#dcdedc'}));hole.rotation.x=-Math.PI/2;hole.position.y=.017;disc.add(hole);
    const ray=new THREE.Raycaster();function hit(e){const r=stage.getBoundingClientRect();ray.setFromCamera(new THREE.Vector2((e.clientX-r.left)/r.width*2-1,1-(e.clientY-r.top)/r.height*2),camera);if(ray.intersectObject(screen).length)return 'screen';if(ray.intersectObject(disc,true).length)return 'disc';return null;}
    listen(host,'pointerdown',e=>{
      if(e.button!==0||drag||e.target.closest('button,input,a'))return;clearTimeout(wheelSettleTimer);detent.reset();
      drag={id:e.pointerId,x:e.clientX,y:e.clientY,startX:e.clientX,startY:e.clientY,startView:viewMode,browseBase:Math.round(browseTarget),browseAllowed:performance.now()>=detentLock,axis:null,onStage:stage.contains(e.target)};
    });
    listen(host,'pointermove',e=>{
      if(!drag){if(stage.contains(e.target)){const target=hit(e);stage.style.cursor=target?'pointer':'grab';screenHoverTarget=target==='screen'&&!playing&&elapsed===0?1:0;}else screenHoverTarget=0;return;}
      screenHoverTarget=0;
      if(drag.id!==e.pointerId)return;
      const dx=e.clientX-drag.startX,dy=e.clientY-drag.startY;
      if(!drag.axis&&Math.max(Math.abs(dx),Math.abs(dy))>9){drag.axis=Math.abs(dx)>Math.abs(dy)*1.2?'x':'y';if(drag.axis==='x'||drag.onStage)host.setPointerCapture(e.pointerId);}
      if(drag.axis==='x'){
        const raw=drag.startView-dx/Math.max(240,host.clientWidth*.65);
        viewTarget=raw<0?raw*.16:raw>1?1+(raw-1)*.16:raw;
        host.classList.add('is-view-dragging');
      }else if(drag.axis==='y'&&drag.onStage&&!viewMode&&drag.browseAllowed){startBrowse();browseTarget=recordDragTarget(drag.browseBase,drag.startY-e.clientY,recordWorks.length-1,false,true);}
      drag.x=e.clientX;drag.y=e.clientY;
    });
    listen(stage,'pointerleave',()=>{screenHoverTarget=0;});
    function release(e){
      if(!drag||drag.id!==e.pointerId)return;
      const finished=drag;drag=null;host.classList.remove('is-view-dragging');
      if(host.hasPointerCapture(e.pointerId))host.releasePointerCapture(e.pointerId);
      if(finished.axis==='x'){
        const dx=e.clientX-finished.startX,threshold=Math.min(150,host.clientWidth*.18);
        setView(e.type==='pointerup'&&Math.abs(dx)>threshold?(dx<0?1:0):finished.startView);
      }else if(!finished.axis&&finished.onStage&&e.type==='pointerup'){const target=hit(e);if(target==='screen')setView(1);else if(target==='disc')toggle();}
      else if(finished.axis==='y'&&finished.onStage&&finished.browseAllowed){browseTarget=recordDragTarget(finished.browseBase,e.type==='pointerup'?finished.startY-e.clientY:0,recordWorks.length-1,true,true);detentLock=performance.now()+420;}else browseTarget=Math.round(browseTarget);
    }
    listen(host,'pointerup',release);listen(host,'pointercancel',release);listen(host,'lostpointercapture',release);
    listen(host,'wheel',e=>{
      if(e.target.closest('input'))return;
      const unit=e.deltaMode===1?16:e.deltaMode===2?stage.clientHeight:1;
      if(Math.abs(e.deltaX)>Math.abs(e.deltaY)*1.2){
        e.preventDefault();viewTarget=THREE.MathUtils.clamp(viewTarget-e.deltaX*unit/500,0,1);
        clearTimeout(viewWheelTimer);viewWheelTimer=setTimeout(()=>setView(viewTarget>=.5?1:0),160);
      }else if(stage.contains(e.target)&&!viewMode){e.preventDefault();wheelBrowse(e.deltaY*unit);}
    },{passive:false});
    $('.record-toggle').disabled=false;$('.record-watch').disabled=false;stage.focus();
    function drawScreen(t){
      ctx.fillStyle='#101729';ctx.fillRect(0,0,1024,600);
      if(recordWorks[index].video&&video.readyState>=2&&(playing||elapsed>0)){const scale=Math.min(1024/video.videoWidth,600/video.videoHeight),vw=video.videoWidth*scale,vh=video.videoHeight*scale;ctx.drawImage(video,(1024-vw)/2,(600-vh)/2,vw,vh);screenTexture.needsUpdate=true;return;}
      if(elapsed===0&&!playing&&posterImage){
        ctx.drawImage(posterImage,0,0,1024,600);
      }else if(elapsed===0&&!playing){
        ctx.fillStyle='#b9c9ed';ctx.font='600 61px Menlo, Monaco, monospace';ctx.textAlign='center';ctx.fillText('Ready when you are.',512,220);
        ctx.strokeStyle='#8195bb';ctx.lineWidth=2;ctx.strokeRect(225,300,574,35);ctx.fillStyle='#3159a0';ctx.fillRect(230,305,390,25);
        ctx.font='18px monospace';ctx.fillStyle='#b9c9ed';ctx.fillText('AWAITING PLAY / CLICK THE RECORD',512,395);
      }else{
        const phase=elapsed*.6;ctx.fillStyle=recordWorks[index].color;ctx.fillRect(0,0,1024,600);
        for(let i=0;i<22;i++){ctx.beginPath();ctx.ellipse(512+Math.sin(phase)*130,290,35+i*24,35+i*14,phase*.15,0,Math.PI*2);ctx.strokeStyle=`rgba(235,242,255,${.2+i*.025})`;ctx.lineWidth=2;ctx.stroke();}
        ctx.textAlign='left';ctx.fillStyle='#fff';ctx.font='600 48px Menlo, Monaco, monospace';ctx.fillText(recordWorks[index].en,55,490);ctx.font='18px monospace';ctx.fillText('MOTION STUDY / PREVIEW',60,538);
      }
      if(elapsed===0&&!playing&&screenHover>.005){
        ctx.save();ctx.globalAlpha=screenHover;ctx.fillStyle='#0b1a50';ctx.fillRect(0,0,1024,600);
        ctx.fillStyle='#dce8ff';ctx.textAlign='center';ctx.font='600 58px Menlo, Monaco, monospace';ctx.fillText('Ready when you are.',512,225);
        ctx.strokeStyle='#90a9de';ctx.lineWidth=3;ctx.strokeRect(205,306,614,45);
        ctx.fillStyle='#3866b9';ctx.fillRect(211,312,390+Math.sin(t*3)*12,33);
        ctx.fillStyle='#a9bee9';ctx.font='20px monospace';ctx.fillText('AWAITING PLAY / CLICK THE RECORD',512,420);
        ctx.restore();
      }
      ctx.fillStyle='#ffffff05';for(let y=0;y<600;y+=5)ctx.fillRect(0,y,1024,1);screenTexture.needsUpdate=true;
    }
    let lastPaint=-1,highlightKey='';
    function render(now){if(disposed)return;const dt=Math.min((now-last)/1000,.05);last=now;
      if(!document.hidden){
        screenHover=reduced?screenHoverTarget:THREE.MathUtils.damp(screenHover,screenHoverTarget,9,dt);
        viewPosition=reduced?viewTarget:THREE.MathUtils.damp(viewPosition,viewTarget,drag?.axis==='x'?10:4.5,dt);
        const travel=THREE.MathUtils.clamp(viewPosition,0,1);
        if(!drag&&Math.abs(viewPosition-viewTarget)<.0001)viewPosition=viewTarget;
        host.style.setProperty('--view-shift',String(travel));
        host.style.setProperty('--stage-expand',String(THREE.MathUtils.smoothstep(travel,0,.72)));
        host.style.setProperty('--detail-opacity',String(1-THREE.MathUtils.smoothstep(travel,0,.3)));
        host.style.setProperty('--film-opacity',String(THREE.MathUtils.smoothstep(travel,.94,.999)));
        immersive.style.pointerEvents=viewMode?'auto':'none';
        // Resolve the animated CSS size, camera and draw in the same frame.
        if(viewportDirty||travel>0&&travel<1)resize();
        if(viewPosition<.999)titleRipple.update(now/1000,dt);
        textStrength=THREE.MathUtils.damp(textStrength,textActive&&!reduced?9:0,7,dt);displacement.setAttribute('scale',textStrength);if(textStrength>.01)svg.querySelector('feTurbulence').setAttribute('baseFrequency',`${.012+Math.sin(now*.001)*.002} .04`);
        browseOpen=reduced?(browsing?1:0):THREE.MathUtils.damp(browseOpen,browsing?1:0,5,dt);
        browseProgress=reduced?browseTarget:THREE.MathUtils.damp(browseProgress,browseTarget,12,dt);
        const selected=THREE.MathUtils.euclideanModulo(Math.round(browseProgress),recordWorks.length);if(selected!==index)select(selected);
        foldLift.position.y=THREE.MathUtils.lerp(.52,1.95,browseOpen);foldLift.visible=browseOpen>.015;rails.visible=browseOpen>.015;
        const foldPhase=THREE.MathUtils.euclideanModulo(browseProgress,6),foldPosition=foldPhase<=3?foldPhase:6-foldPhase;
        hinges.forEach((hinge,i)=>{const turn=THREE.MathUtils.smoothstep(foldPosition,i-1,i);const spread=i===0?-15:(i%2?1:-1)*THREE.MathUtils.lerp(155,25,turn);hinge.rotation.x=THREE.MathUtils.degToRad(THREE.MathUtils.lerp(i===0?-85:(i%2?165:-165),spread,browseOpen));});
        
        engage=reduced?(playing?1:0):THREE.MathUtils.damp(engage,playing?1:0,6,dt);
        model.position.y=-.12*engage;
        // Approach the real display along its world-space normal, matching its plane.
        model.updateMatrixWorld(true);screen.getWorldPosition(screenCenter);screen.getWorldQuaternion(screenRotation);
        screenNormal.set(0,0,1).applyQuaternion(screenRotation);if(screenNormal.z<0)screenNormal.negate();
        const originalAspect=host.clientWidth<650?host.clientWidth/(host.clientHeight*.47):(host.clientWidth*.59)/(host.clientHeight*.75);
        // Overview scale: previous 110% reduced by 4%, giving 105.6%; keep close-up fitting unchanged.
        const distance=(Math.max(3.7,2.85/originalAspect)+browseOpen*1.35)/1.056;
        const fit=Math.max(1.13,1.93/camera.aspect)/(2*Math.tan(THREE.MathUtils.degToRad(camera.fov/2)));
        focusPosition.copy(screenCenter).addScaledVector(screenNormal,fit);
        const approach=THREE.MathUtils.smoothstep(travel,.08,1);
        camera.position.set(0,1.05+distance*.43,distance).lerp(focusPosition,approach);
        lookTarget.set(0,1.05+browseOpen*.65,0).lerp(screenCenter,THREE.MathUtils.smoothstep(travel,0,.78));camera.lookAt(lookTarget);
        arm.rotation.y=THREE.MathUtils.lerp(.1,-.42,engage);lift.rotation.x=THREE.MathUtils.lerp(-.16,0,engage);lift.position.y=THREE.MathUtils.lerp(.115,.067,engage);
        if(playing){elapsed=recordWorks[index].video?video.currentTime:Math.min(24,elapsed+dt);if(!reduced)disc.rotation.y+=dt*1.4*engage;if(elapsed>=duration()){playing=false;sync();}}
        const useVideo=videoTexture&&elapsed>0&&video.readyState>=2;const map=screenTexture;if(screen.material.map!==map){screen.material.map=map;screen.material.needsUpdate=true;}
        if(now-lastPaint>50){drawScreen(now/1000);if(viewPosition>.001&&!recordWorks[index].video)fullCtx.drawImage(screenCanvas,0,0);lastPaint=now;$('.record-time').textContent=`${timeLabel(elapsed)} / ${timeLabel(duration())}`;$('.record-seek').max=duration();$('.record-seek').value=elapsed;
          const lines=[...$('.record-lyrics').children],active=Math.min(lines.length-1,Math.floor(elapsed/duration()*lines.length));lines.forEach((p,i)=>p.classList.toggle('is-current',i===active));const key=index+':'+active;if(key!==highlightKey){highlightKey=key;const lyrics=$('.record-lyrics');lyrics.scrollTo({top:Math.max(0,lines[active].offsetTop-lyrics.offsetTop-lyrics.clientHeight*.3),behavior:reduced?'instant':'smooth'});}}
        renderer.render(scene,camera);
      }frame=requestAnimationFrame(render);
    }frame=requestAnimationFrame(render);
  }catch(error){console.error(error);status.classList.remove('record-sr');status.textContent='Record player failed to load. Go back and retry.';}
  return {close};
}
