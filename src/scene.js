import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { screenFrame } from './math.js';
import { WalkCamera } from './WalkCamera.js';
import { buildEnvironment } from './environment.js';
import { categoryForScreen } from './data.js';
import { createChannelArtwork } from './channel-artwork.js';
import { paperPalette, stylePaperModel } from './paper-style.js';

export class TowerScene {
  constructor(container, { onSelect, onHover, canInteract, onProgress, reduced = false }) {
    this.reduced = reduced; this.composition = { offset: 1 };
    this.container = container; this.onSelect = onSelect; this.onHover = onHover; this.canInteract = canInteract; this.onProgress = onProgress;
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.6));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.setClearColor(paperPalette.background, 1);
    container.appendChild(this.renderer.domElement);
    this.scene = new THREE.Scene(); this.scene.background = new THREE.Color(paperPalette.background); this.scene.fog = new THREE.FogExp2(paperPalette.background, .035);
    this.camera = new THREE.PerspectiveCamera(52, container.clientWidth / container.clientHeight, .04, 65);
    this.renderer.shadowMap.enabled = true; this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.shadowMap.autoUpdate = false;
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x9aabc5, 1.25));
    const key = new THREE.DirectionalLight(0xffffff, 2.0); key.position.set(-3.5,8,6);
    key.castShadow=true; key.shadow.mapSize.set(1024,1024); key.shadow.camera.left=-8; key.shadow.camera.right=8; key.shadow.camera.top=8;key.shadow.camera.bottom=-8;key.shadow.camera.far=30;key.shadow.normalBias=.025;key.shadow.bias=-.0001;this.scene.add(key);
    const rim = new THREE.DirectionalLight(0xb8c5d9, .55); rim.position.set(4,5,-5);this.scene.add(rim);
    buildEnvironment(this.scene);
    this.screens=[];this.pickables=[];this.raycaster=new THREE.Raycaster();this.pointer=new THREE.Vector2(9,9);this.currentHover=null;
    const dom=this.renderer.domElement;
    const updatePointer=e=>{const rect=dom.getBoundingClientRect();this.pointer.set((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);};
    this.navigation = new WalkCamera(this.camera,dom,{canInteract,reduced,onTap:e=>{updatePointer(e);const hit=this.pick();if(hit)this.onSelect(hit);}});
    dom.addEventListener('pointermove',updatePointer);
    dom.addEventListener('pointerleave',()=>this.pointer.set(9,9));
    this.resizeObserver = new ResizeObserver(() => this.resize()); this.resizeObserver.observe(container); this.resize();
  }
  async load() {
    const gltf = await new GLTFLoader().loadAsync(`${import.meta.env.BASE_URL}models/retro_tv_stack.glb`, e => this.onProgress(e.loaded, e.total));
    this.model = gltf.scene; this.scene.add(this.model); this.model.updateMatrixWorld(true);
    const textures = new Map(); this.channelCards = new Map();
    // Preserve the approved sheet exactly; each quadrant becomes one screen texture.
    const coverSheet=await new THREE.ImageLoader().loadAsync(`${import.meta.env.BASE_URL}images/channel-covers/minimal-paper-sheet.png`);
    const channelCovers=new Map(['writing','script','visual','image'].map((id,index)=>{
      const canvas=document.createElement('canvas');canvas.width=coverSheet.width/2;canvas.height=coverSheet.height/2;
      canvas.getContext('2d').drawImage(coverSheet,(index%2)*canvas.width,Math.floor(index/2)*canvas.height,canvas.width,canvas.height,0,0,canvas.width,canvas.height);
      return [id,new THREE.CanvasTexture(canvas)];
    }));
    this.model.traverse(child => {
      if (!child.isMesh) return;
      this.pickables.push(child); child.castShadow=true; child.receiveShadow=true;
      if (/Screen/.test(child.name)) {
        const category = categoryForScreen(child.name); child.userData.category = category;
        if (!textures.has(category.id)) {
          const card=createChannelArtwork(category.id);
          const t=channelCovers.get(category.id),hoverTexture=new THREE.CanvasTexture(card.hover);
          for(const texture of [t,hoverTexture]){texture.colorSpace=THREE.SRGBColorSpace;texture.flipY=false;texture.anisotropy=Math.min(4,this.renderer.capabilities.getMaxAnisotropy());}
          textures.set(category.id,t);this.channelCards.set(category.id,{...card,hoverTexture,lastPaint:-1});
        }
        child.material = new THREE.MeshBasicMaterial({ map: textures.get(category.id), color: 0xffffff });
        // 在标准贴图上叠扫描线与细微噪点，保留 Three.js 色彩管理。
        child.material.onBeforeCompile = shader => {
          shader.uniforms.uChannelHover = { value: this.channelCards.get(category.id).hoverTexture };shader.uniforms.uHover = { value: 0 };shader.uniforms.uTime = { value: 0 }; shader.uniforms.uSeed = { value: child.userData.phase * 1.71 };
          shader.fragmentShader = 'uniform sampler2D uChannelHover; uniform float uTime; uniform float uSeed; uniform float uHover;\n' + shader.fragmentShader;
          shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', `#include <map_fragment>
            float scan = sin(vMapUv.y * 480.0) * 0.04;
            float noise = fract(sin(dot(floor(vMapUv * 280.0), vec2(12.9898,78.233)) + floor(uTime * 8.0) + uSeed) * 43758.5453);
            float pulse = .5 + .5 * sin(uTime * .7 + uSeed);
            float sweep = pow(max(0.,sin(vMapUv.y*6.28-uTime*1.2+uSeed)),12.);
            diffuseColor.rgb *= .94 + pulse*.04 + scan*.3 + noise*.02;
            diffuseColor.rgb += vec3(.012,.018,.03)*sweep;
            
            vec3 channelCard = texture2D(uChannelHover, vMapUv).rgb;
            channelCard *= .97 + scan * .35 + noise * .025;
            diffuseColor.rgb = mix(diffuseColor.rgb, channelCard, smoothstep(0.,1.,uHover));`);
          child.userData.shader = shader;
        };
        child.userData.phase = this.screens.length; this.screens.push(child);
      } else {
        for (const mat of (Array.isArray(child.material) ? child.material : [child.material])) { mat.roughness = .86; mat.metalness = Math.min(mat.metalness, .15); }
      }
    });
    const sketchTexture = await new THREE.TextureLoader().loadAsync(`${import.meta.env.BASE_URL}images/tv-sketch-paper.png`);
    sketchTexture.colorSpace = THREE.SRGBColorSpace;
    sketchTexture.wrapS = sketchTexture.wrapT = THREE.RepeatWrapping;
    sketchTexture.anisotropy = Math.min(4, this.renderer.capabilities.getMaxAnisotropy());
    this.disposePaperStyle = stylePaperModel(this.model, { keep: mesh => /Screen/.test(mesh.name), paperMap: sketchTexture });
    const bottomScreens=[...this.screens].sort((a,b)=>screenFrame(a).center.y-screenFrame(b).center.y).slice(0,4);
    const litScreens=[...new Set([...this.screens.filter((_,i)=>i%5===0).slice(0,4),...bottomScreens])];
    this.screenLights=litScreens.map(screen=>{
      const frame=screenFrame(screen),light=new THREE.PointLight(0x2458ef,4,3.8,2);
      light.userData.screen=screen;light.userData.bottom=bottomScreens.includes(screen);
      light.position.copy(frame.center).addScaledVector(frame.normal,.32);this.scene.add(light);return light;
    });
    this.navigation.pose.pitch=.10; this.navigation.target.pitch=.10; this.navigation.apply();
    this.navigation.obstacles = this.pickables.map(mesh => new THREE.Box3().setFromObject(mesh).expandByScalar(.2));
    this.renderer.shadowMap.needsUpdate=true;
    this.ready = true;
  }
  get timeline() { return this.navigation?.timeline; }
  resize() { const w=this.container.clientWidth,h=this.container.clientHeight;this.renderer.setSize(w,h);this.camera.aspect=w/h;this.applyComposition(); }
  applyComposition() { const w=this.container.clientWidth,h=this.container.clientHeight; if(w>760) this.camera.setViewOffset(w,h,w*.18*this.composition.offset,0,w,h); else this.camera.clearViewOffset(); this.camera.updateProjectionMatrix(); }
  pick() { this.camera.updateMatrixWorld();this.raycaster.setFromCamera(this.pointer,this.camera);const hit=this.raycaster.intersectObjects(this.pickables,false)[0];return hit?.object.userData.category ? hit.object : null; }
  setEnabled(enabled) { this.navigation?.setEnabled(enabled); }
  reset(animated=true) { this.navigation.reset(animated); }
  focus(screen,reduced,complete) { return this.navigation.focus(screen,complete); }
  returnHome(reduced,complete) { this.navigation.returnHome(complete); }
  update(t,dt) {
    this.navigation.update(dt);
    const wanted=this.navigation.saved?0:1; this.composition.offset=THREE.MathUtils.damp(this.composition.offset,wanted,6,dt); this.applyComposition();
    const motionTime=this.reduced?0:t;
    const hover = this.canInteract() && !this.navigation.pointers.size ? this.pick() : null;
    if (hover !== this.currentHover) {
      this.currentHover=hover;this.hoverStarted=t;this.container.classList.toggle('hoverable',!!hover);this.onHover(hover);
    }
    if(hover){
      const card=this.channelCards.get(hover.userData.category.id);
      if(t-card.lastPaint>.05){
        const progress=this.reduced ? .86 : .12+.78*(1-Math.exp(-(t-this.hoverStarted)*2.5));
        card.paintHover(progress);card.hoverTexture.needsUpdate=true;card.lastPaint=t;
      }
    }
    this.screenLights?.forEach((light,i)=>{
      const base=light.userData.bottom?4.2:3.5;
      const pulse=Math.sin(motionTime*.85+i*1.6)*(light.userData.bottom?.8:2.7);
      const target=base+pulse+(light.userData.screen===this.currentHover?6:0);
      light.intensity=THREE.MathUtils.damp(light.intensity,target,7,dt);
      light.color.setHSL(.62+Math.sin(motionTime*.3+i)*.018,.85,.5);
    });
    for (const screen of this.screens) {
      if (screen.userData.shader) {
        const uniforms=screen.userData.shader.uniforms;uniforms.uTime.value=motionTime;
        uniforms.uHover.value=this.reduced?(screen===this.currentHover?1:0):THREE.MathUtils.damp(uniforms.uHover.value,screen===this.currentHover?1:0,12,dt);
      }
      screen.material.color?.setScalar(.97 + Math.sin(motionTime * .8 + screen.userData.phase) * .025);
    }
    this.renderer.render(this.scene, this.camera);
  }
  async capture() {
    this.renderer.render(this.scene, this.camera);
    const source = this.renderer.domElement, c = document.createElement('canvas');
    c.width = Math.min(1600, source.width); c.height = Math.round(source.height * c.width / source.width);
    const x = c.getContext('2d'); x.fillStyle = paperPalette.background; x.fillRect(0, 0, c.width, c.height); x.drawImage(source, 0, 0, c.width, c.height);
    x.strokeStyle = paperPalette.graphite; x.lineWidth = 2; const m = c.width * .04, s = c.width * .035;
    for (const [a,b,sx,sy] of [[m,m,1,1],[c.width-m,m,-1,1],[m,c.height-m,1,-1],[c.width-m,c.height-m,-1,-1]]) { x.beginPath(); x.moveTo(a+sx*s,b); x.lineTo(a,b); x.lineTo(a,b+sy*s); x.stroke(); }
    x.fillStyle = paperPalette.graphite; x.font = `${Math.max(12,c.width*.014)}px monospace`; x.fillText('TV TOWER / MEMORY FRAME', m, c.height-m-12); x.fillText(new Date().toLocaleString('zh-CN'), m, m+25);
    return new Promise((resolve, reject) => c.toBlob(b => b ? resolve(b) : reject(new Error('截图失败')), 'image/jpeg', .9));
  }
}
