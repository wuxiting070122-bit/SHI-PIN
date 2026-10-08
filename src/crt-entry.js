import gsap from 'gsap';

// Composite the actual tower into a coarse framebuffer, then restore its signal.
export function playCrtEntry({boot,tower,reduced,onReveal}) {
  return new Promise(resolve=>{
    const overlay=document.createElement('div');overlay.className='crt-entry';overlay.setAttribute('aria-hidden','true');
    const canvas=document.createElement('canvas');overlay.append(canvas);document.body.append(overlay);
    const ctx=canvas.getContext('2d'),small=document.createElement('canvas'),sx=small.getContext('2d');
    const phase={value:0};let lastFrame=-1;
    function draw(){
      const p=phase.value,frame=Math.floor(p*30);if(frame===lastFrame)return;lastFrame=frame;
      canvas.width=innerWidth;canvas.height=innerHeight;ctx.imageSmoothingEnabled=false;
      const inverted=(p<.10)||(p>=.28&&p<.36)||(p>=.55&&p<.62);
      const block=p<.22?32:p<.43?18:p<.65?(inverted?24:9):p<.82?4:1;
      small.width=Math.max(1,Math.ceil(canvas.width/block));small.height=Math.max(1,Math.ceil(canvas.height/block));
      tower.renderer.render(tower.scene,tower.camera);
      sx.drawImage(tower.renderer.domElement,0,0,small.width,small.height);
      ctx.fillStyle='#090c13';ctx.fillRect(0,0,canvas.width,canvas.height);
      // Three short polarity reversals; faster local corruption between them.
      ctx.filter=inverted?'grayscale(1) invert(1) contrast(2.2)':p<.72?'grayscale(1) contrast(1.8)':'none';
      ctx.drawImage(small,0,0,canvas.width,canvas.height);ctx.filter='none';
      if(p<.76){
        for(let i=0;i<11;i++){
          const y=((i*173+frame*41)%canvas.height),height=block*(i%2+1),shift=Math.sin(i*17+frame)*65*(1-p);
          ctx.drawImage(small,0,Math.floor(y/block),small.width,Math.max(1,height/block),shift,y,canvas.width,height);
        }
        // Small monochrome dropouts flicker independently of full-frame polarity.
        for(let i=0;i<12;i++){
          const x=((frame*137+i*241)%canvas.width),y=((frame*79+i*113)%canvas.height);
          ctx.fillStyle=(i+frame)%2?'#05080dd9':'#e5e7ebbb';
          ctx.fillRect(x,y,block*(1+i%4),block*(1+i%2));
        }
        ctx.fillStyle='#07112855';for(let y=0;y<canvas.height;y+=5)ctx.fillRect(0,y,canvas.width,1);
      }
    }
    function finish(){overlay.remove();gsap.set(boot.querySelector('.crt-shell'),{clearProps:'transform,filter'});resolve();}
    if(reduced){overlay.style.opacity='1';boot.hidden=true;onReveal();gsap.to(overlay,{opacity:0,duration:.3,onComplete:finish});return;}
    const shell=boot.querySelector('.crt-shell');
    const timeline=gsap.timeline({onComplete:finish});
    timeline.to(shell,{scaleY:.006,scaleX:.94,filter:'brightness(2)',duration:.46,ease:'power3.inOut'})
      .to(shell,{scaleX:.22,duration:.16,ease:'power2.in'})
      .set(overlay,{opacity:1})
      .call(()=>{boot.hidden=true;onReveal();draw();})
      .to(phase,{value:1,duration:1.5,ease:'none',onUpdate:draw})
      .to(overlay,{opacity:0,duration:.3,ease:'power2.out'});
  });
}
