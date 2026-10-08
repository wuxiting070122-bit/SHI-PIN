import * as THREE from 'three';

// The text is rendered once; only its UV coordinates move under the cursor.
export function createRippleType(host, reduced, options = {}) {
  const canvas = document.createElement('canvas'); canvas.width = options.width || 1400; canvas.height = options.height || 900;
  const ctx = canvas.getContext('2d');
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  function paintText(lines) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#152b65';
    let size = options.fontSize || 164;
    ctx.font = `600 ${size}px Menlo, Monaco, Consolas, monospace`;
    if (options.center) {
      size *= Math.min(1, (canvas.width - 100) / Math.max(...lines.map(line => ctx.measureText(line).width)));
      ctx.font = `600 ${size}px Menlo, Monaco, Consolas, monospace`;
    }
    ctx.textAlign = options.center ? 'center' : 'left';
    ctx.textBaseline = options.center ? 'middle' : 'alphabetic';
    lines.forEach((line, i) => ctx.fillText(line, options.center ? canvas.width / 2 : (options.textX ?? 42), options.center ? canvas.height / 2 : (options.textY ?? 175) + i * (options.lineHeight ?? 178)));
    texture.needsUpdate = true;
  }
  let currentLines=options.lines || ['A collection', 'of images,', 'stories &', 'other signals.'];
  let pendingLines=null, transitionPhase=0, transitionTime=0;
  paintText(currentLines);
  function setText(lines) {
    if (JSON.stringify(lines)===JSON.stringify(pendingLines || currentLines)) return;
    if (!options.transition || reduced) { currentLines=lines;paintText(lines);return; }
    pendingLines=lines;
    // Repeated input replaces the destination without restarting the dissolve.
    if (transitionPhase===0) { transitionPhase=1;transitionTime=0; }
    else if (transitionPhase===2) { transitionPhase=1;transitionTime=(1-transitionTime/.42)*.32; }
  }
  const renderer = new THREE.WebGLRenderer({alpha:true,antialias:true}); renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  host.append(renderer.domElement);
  const scene = new THREE.Scene(), camera = new THREE.OrthographicCamera(-1,1,1,-1,0,2); camera.position.z = 1;
  const uniforms = { image:{value:texture}, time:{value:0}, pointer:{value:new THREE.Vector2(.5,.5)}, strength:{value:0}, melt:{value:0}, taper:{value:options.taper || 0} };
  const material = new THREE.ShaderMaterial({transparent:true, uniforms, vertexShader: `varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader: `uniform sampler2D image; uniform float time; uniform vec2 pointer; uniform float strength; uniform float melt; uniform float taper; varying vec2 vUv;
    void main(){
      vec2 delta=vUv-pointer;
      float d=length(delta*vec2(1.5,1.));
      vec2 warp=normalize(delta+vec2(.0001))*sin(d*30.-time*4.)*.014*exp(-d*5.)*strength;
      vec2 uv=vUv+warp;
      float side=(uv.x-.5)*2.;
      uv.x=mix(uv.x,.5+asin(clamp(side*sin(.95),-.999,.999))/(2.*.95),taper);
      uv.y=.5+(uv.y-.5)/mix(1.,sqrt(max(.25,1.-side*side*.58)),taper);
      float flow=sin(uv.x*24.+time*3.)*.65+sin(uv.x*53.-uv.y*8.-time*2.)*.35;
      uv+=melt*vec2(sin(uv.y*22.+uv.x*13.+time*2.)*.045,flow*.19);
      vec4 ink=texture2D(image,clamp(uv,vec2(.001),vec2(.999)));
      float breakup=.5+.5*sin(uv.x*81.+sin(uv.y*35.+time)*3.);
      ink.a*=1.-smoothstep(.20+breakup*.22,.94,melt);
      ink.a*=step(0.,uv.x)*step(uv.x,1.)*step(0.,uv.y)*step(uv.y,1.);
      gl_FragColor=ink;
      #include <colorspace_fragment>
    }` });
  const geometry = new THREE.PlaneGeometry(2,2); scene.add(new THREE.Mesh(geometry,material));
  let target = new THREE.Vector2(.5,.5), active = false;
  const move = e => { const box=host.getBoundingClientRect(); const angle=options.angle?.() || 0, dx=e.clientX-(box.left+box.width/2), dy=e.clientY-(box.top+box.height/2); const x=(dx*Math.cos(angle)+dy*Math.sin(angle))/host.clientWidth+.5, y=(-dx*Math.sin(angle)+dy*Math.cos(angle))/host.clientHeight+.5; target.set(x,1-y); active=x>=0&&x<=1&&y>=0&&y<=1; };
  window.addEventListener('pointermove',move,{passive:true});
  const observer=new ResizeObserver(()=>{renderer.setSize(host.clientWidth,host.clientHeight);renderer.render(scene,camera);}); observer.observe(host);
  return { setText, update(t,dt){
    if(transitionPhase){
      transitionTime+=Math.min(dt,.05);
      const duration=transitionPhase===1?.32:.42;
      const progress=Math.min(1,transitionTime/duration);
      const ease=progress*progress*(3-2*progress);
      uniforms.melt.value=transitionPhase===1?ease:1-ease;
      if(progress===1){
        if(transitionPhase===1){currentLines=pendingLines;pendingLines=null;paintText(currentLines);transitionPhase=2;}
        else transitionPhase=0;
        transitionTime=0;
      }
    }
    uniforms.time.value=t;uniforms.pointer.value.lerp(target,1-Math.exp(-dt*9));uniforms.strength.value=THREE.MathUtils.lerp(uniforms.strength.value,!reduced&&active?(options.strength ?? 1):0,1-Math.exp(-dt*5));renderer.render(scene,camera);}, dispose(){observer.disconnect();window.removeEventListener('pointermove',move);texture.dispose();material.dispose();geometry.dispose();renderer.dispose();} };
}
