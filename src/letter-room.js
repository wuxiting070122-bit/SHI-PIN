import * as THREE from 'three';

const seasons = [
  { sky:'#edf5f7', foliage:'#9bbab8', light:'#f1faff', name:'SPRING' },
  { sky:'#dcebf8', foliage:'#668b9d', light:'#e9f4ff', name:'SUMMER' },
  { sky:'#e6eaf2', foliage:'#a79999', light:'#edf1ff', name:'AUTUMN' },
  { sky:'#e2e9f5', foliage:'#f7faff', light:'#dbe8ff', name:'WINTER' },
];

export function createLetterRoom(scene, bounds, light, reduced=false) {
  const owned=[],root=new THREE.Group();scene.add(root);
  const weights=[1,0,0,0];let target=0;
  function canvasMap(paint){
    const c=document.createElement('canvas');c.width=c.height=768;
    paint(c.getContext('2d'));const map=new THREE.CanvasTexture(c);
    map.colorSpace=THREE.SRGBColorSpace;owned.push(map);return map;
  }
  function texture(desk){return canvasMap(ctx=>{
    ctx.fillStyle=desk?'#e6e9ee':'#edf0f4';ctx.fillRect(0,0,768,768);
    let seed=17;
    for(let i=0;i<10000;i++){
      seed=(seed*1664525+1013904223)>>>0;const x=seed%768;
      seed=(seed*1664525+1013904223)>>>0;
      ctx.fillStyle='rgba(59,77,105,.018)';ctx.fillRect(x,seed%768,desk?8:1,1);
    }
    if(!desk)return;
    const halo=ctx.createRadialGradient(260,350,20,260,350,340);
    halo.addColorStop(0,'rgba(249,253,255,.85)');halo.addColorStop(1,'rgba(249,253,255,0)');
    ctx.fillStyle=halo;ctx.fillRect(0,0,768,768);
    ctx.save();ctx.translate(120,130);ctx.transform(1,-.25,.32,1,0,0);
    ctx.shadowBlur=18;ctx.shadowColor='#f5faff';ctx.fillStyle='rgba(255,255,255,.62)';
    for(let r=0;r<3;r++)for(let c=0;c<2;c++)ctx.fillRect(c*170,r*142,153,126);
    ctx.restore();
  });}
  function mesh(geometry,material){owned.push(geometry,material);const m=new THREE.Mesh(geometry,material);root.add(m);return m;}
  function surface(w,h,map){const m=mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshStandardMaterial({map,roughness:1}));m.receiveShadow=true;return m;}
  const floor=surface(36,28,texture(true));floor.rotation.x=-Math.PI/2;floor.position.set(0,bounds.min.y-.025,2);
  const wall=surface(32,22,texture(false));wall.position.set(0,bounds.min.y+10,-3.8);wall.material.emissive.set('#e8edf5');wall.material.emissiveIntensity=.3;
  const wx=-8.0,wy=bounds.min.y+6.15,wz=-3.65,ww=16,wh=11;
  const views=seasons.map((season,index)=>{
    const map=canvasMap(ctx=>{
      ctx.fillStyle=season.sky;ctx.fillRect(0,0,768,768);
      ctx.fillStyle='#f9fcff';ctx.beginPath();ctx.arc(580,130,62,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='#c9d4e1';ctx.beginPath();ctx.moveTo(0,650);ctx.bezierCurveTo(180,470,420,730,768,530);ctx.lineTo(768,768);ctx.lineTo(0,768);ctx.fill();
      ctx.save();ctx.translate(330,0);ctx.scale(.6,1);
      ctx.strokeStyle='#506987';ctx.lineWidth=5;ctx.lineCap='round';
      const branches=[[250,780,280,330],[270,560,100,370],[275,470,450,270],[265,620,475,470],[280,360,210,220]];
      branches.forEach(([x,y,a,b])=>{ctx.beginPath();ctx.moveTo(x,y);ctx.quadraticCurveTo(x-15,b+65,a,b);ctx.stroke();});
      for(let i=0;i<65;i++){
        const x=85+(i*97%460),y=230+(i*71%310);
        if(index===3){ctx.fillStyle='#fff';ctx.beginPath();ctx.arc((i*139)%768,(i*107)%740,3+i%3,0,7);ctx.fill();continue;}
        ctx.fillStyle=index===0&&i%4===0?'#f9faff':season.foliage;
        ctx.globalAlpha=index===1?.75:.6;
        ctx.beginPath();ctx.ellipse(x,index===2&&i%3===0?y+170:y,index===1?28:16,10,(i%5)*.6,0,7);ctx.fill();
      }
      ctx.globalAlpha=1;
      if(index===3){ctx.strokeStyle='#fbfdff';ctx.lineWidth=9;ctx.beginPath();ctx.moveTo(105,365);ctx.lineTo(230,496);ctx.stroke();}
      ctx.restore();
      ctx.fillStyle='#385477';ctx.font='18px monospace';ctx.fillText(`0${index+1} / ${season.name}`,38,715);
    });
    const m=mesh(new THREE.PlaneGeometry(ww,wh),new THREE.MeshBasicMaterial({map,transparent:true,opacity:index===0?1:0,depthWrite:false}));
    m.position.set(wx,wy,wz+.01*index);m.renderOrder=index+1;return m;
  });
  // Physical frame and sill, rather than a window-shaped pool of light alone.
  function bar(x,y,w,h,d=.12){const m=mesh(new THREE.BoxGeometry(w,h,d),new THREE.MeshStandardMaterial({color:'#f5f8fc',roughness:.8}));m.position.set(x,y,wz+.14);m.castShadow=true;m.receiveShadow=true;return m;}
  bar(wx-ww/2,wy,.11,wh+.15);bar(wx+ww/2,wy,.11,wh+.15);
  bar(wx,wy+wh/2,ww+.15,.11);bar(wx,wy-wh/2,ww+.35,.15,.5);
  bar(-3.2,wy,.09,wh);bar(-6.4,wy,.09,wh);bar(wx,bounds.min.y+3.5,ww,.09);
  const colors=seasons.map(s=>new THREE.Color(s.light));
  return {
    setSeason(index){target=THREE.MathUtils.euclideanModulo(index,4);},
    update(dt){
      const color=new THREE.Color(0,0,0);
      weights.forEach((weight,i)=>{weights[i]=reduced?(i===target?1:0):THREE.MathUtils.damp(weight,i===target?1:0,2.5,dt);views[i].material.opacity=weights[i];color.add(colors[i].clone().multiplyScalar(weights[i]));});
      light.color.copy(color);light.intensity=weights.reduce((sum,w,i)=>sum+w*[2,2.35,1.8,1.65][i],0);
    },
    dispose(){scene.remove(root);owned.forEach(resource=>resource.dispose());},
  };
}
