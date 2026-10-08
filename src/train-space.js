import { addInteractionGuide } from './interaction-guide.js';
import { screenplayWorks as scripts } from './english-copy.js';

export function openTrainSpace({onClose,reduced=false}){
 const background=[...document.body.children].filter(e=>e.tagName!=='SCRIPT').map(e=>[e,e.inert]);background.forEach(([e])=>e.inert=true);
 const host=document.createElement('section');host.className='train-space';host.setAttribute('aria-label','Train window screenplay archive');
 host.innerHTML=`<button class="record-back" aria-label="Back to TV Tower">←</button><div class="train-sign">SHI PIN EXPRESS <span>THE WINDOW ARCHIVE</span></div><div class="train-window" tabindex="0" aria-label="Drag the window view horizontally to select a screenplay"><canvas aria-hidden="true"></canvas><div class="train-articles"></div><div class="train-glass"></div></div><div class="train-wall-label">${String(scripts.length).padStart(2,'0')} STOPS / STORIES IN TRANSIT</div><div class="train-seat"><div class="train-suitcase"><i></i><span>SHI PIN<br>TRAVEL ARCHIVE</span></div></div><footer><span class="train-count"></span><span>DRAG THE VIEW / STOP TO READ</span></footer><dialog class="train-reader"><button aria-label="Back to train window">↙</button><article tabindex="0"></article></dialog>`;
 const disposeGuide = addInteractionGuide(host, 'train');
  document.body.append(host);
 const windowEl=host.querySelector('.train-window'),canvas=host.querySelector('canvas'),ctx=canvas.getContext('2d'),track=host.querySelector('.train-articles'),reader=host.querySelector('dialog');
 const works=scripts;
 works.forEach((w,i)=>{const button=document.createElement('button');button.className='train-work';button.innerHTML='<small></small><h1></h1><p></p><span>READ SCRIPT ↗</span>';button.querySelector('small').textContent=`0${i+1} / ${w.kind} · ${w.author}`;button.querySelector('h1').textContent=w.title;button.querySelector('p').textContent=w.summary;button.onclick=()=>{if(performance.now()<suppress)return;openReading();};track.append(button);});
 const cards=[...track.children],cleanups=[];let position=0,target=0,selected=0,drag=null,suppress=0,frame,last=performance.now(),wheelTimer,w=1,h=1,disposed=false;
 const clamp=v=>Math.max(0,Math.min(works.length-1,v));
 function listen(el,event,fn,opts){el.addEventListener(event,fn,opts);cleanups.push(()=>el.removeEventListener(event,fn,opts));}
 function resize(){w=windowEl.clientWidth;h=windowEl.clientHeight;const dpr=Math.min(devicePixelRatio,2);canvas.width=w*dpr;canvas.height=h*dpr;ctx.setTransform(dpr,0,0,dpr,0,0);}
 const observer=new ResizeObserver(resize);observer.observe(windowEl);resize();
 function draw(){
  ctx.fillStyle='#e6edf5';ctx.fillRect(0,0,w,h);
  const sunX=w*.77-position*w*.04;ctx.fillStyle='#fafcff';ctx.beginPath();ctx.arc(sunX,h*.2,h*.085,0,7);ctx.fill();
  for(let layer=0;layer<3;layer++){
   const speed=[.13,.28,.58][layer],base=[.55,.69,.86][layer];
   ctx.fillStyle=['#cbd7e6','#a8bccf','#839cad'][layer];ctx.beginPath();ctx.moveTo(0,h);
   for(let x=0;x<=w+12;x+=12){const phase=x/w+position*speed;ctx.lineTo(x,h*(base+Math.sin(phase*7+layer)*.055+Math.sin(phase*17+layer)*.025));}
   ctx.lineTo(w,h);ctx.fill();
  }
  ctx.fillStyle='#718797';
  for(let i=-2;i<12;i++){const x=i*w*.24-position*w*.38;if(x<-100||x>w+100)continue;const bh=h*(.12+(i%3+3)%3*.03);ctx.fillRect(x,h*.68-bh,w*.12,bh);ctx.fillStyle='#d7e2ec';for(let j=0;j<3;j++)ctx.fillRect(x+12+j*18,h*.68-bh+12,7,11);ctx.fillStyle='#718797';}
  ctx.strokeStyle='#334c69';ctx.lineWidth=4;
  for(let i=-1;i<7;i++){const x=i*w*.65-position*w*.9;ctx.beginPath();ctx.moveTo(x,h);ctx.lineTo(x,h*.12);ctx.moveTo(x-28,h*.19);ctx.lineTo(x+28,h*.19);ctx.stroke();ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x,h*.15);ctx.quadraticCurveTo(x+w*.325,h*.23,x+w*.65,h*.15);ctx.stroke();ctx.lineWidth=4;}
 }
 function render(now){if(disposed)return;const dt=Math.min((now-last)/1000,.05);last=now;position=reduced?target:position+(target-position)*(1-Math.exp(-9*dt));selected=Math.round(position);
  cards.forEach((card,i)=>{card.style.transform=`translateX(${(i-position)*125}%)`;card.style.opacity=Math.max(0,1-Math.abs(i-position));card.inert=i!==selected;});
  host.querySelector('.train-count').textContent=`${String(selected+1).padStart(2,'0')} / ${String(works.length).padStart(2,'0')}`;draw();frame=requestAnimationFrame(render);
 }
 function openReading(){if(reader.open)return;target=selected;const work=works[selected],article=reader.querySelector('article');article.replaceChildren();const title=document.createElement('h1');title.textContent=work.title;article.append(title);const byline=document.createElement('p');byline.className='train-byline';byline.textContent=`WRITTEN BY ${work.author}`;article.append(byline);work.paragraphs.slice(2).forEach(text=>{const heading=/^(第[一二三四五六七八九十百零0-9]+幕|故事梗概$|故事背景$|人物介绍$|主要人物$|背景$|正文$|剧本$|初稿简述$)/.test(text.trim());const p=document.createElement(heading?'h2':'p');p.textContent=text;article.append(p);});host.classList.add('is-reading');reader.showModal();reader.scrollTop=0;article.focus();}
 function back(){reader.close();host.classList.remove('is-reading');windowEl.focus({preventScroll:true});}
 host.querySelector('.record-back').onclick=()=>{disposed=true;cancelAnimationFrame(frame);clearTimeout(wheelTimer);observer.disconnect();cleanups.forEach(fn=>fn());disposeGuide();host.remove();background.forEach(([e,inert])=>e.inert=inert);onClose();};reader.querySelector('button').onclick=back;listen(reader,'cancel',e=>{e.preventDefault();back();});
 listen(windowEl,'pointerdown',e=>{if(e.button!==0)return;clearTimeout(wheelTimer);drag={id:e.pointerId,x:e.clientX,start:target,moved:false};windowEl.setPointerCapture(e.pointerId);});
 listen(windowEl,'pointermove',e=>{if(!drag)return;const dx=e.clientX-drag.x;if(Math.abs(dx)>6)drag.moved=true;target=clamp(drag.start-dx/(w*.65));});
 function release(e){if(!drag||drag.id!==e.pointerId)return;const moved=drag.moved;drag=null;if(windowEl.hasPointerCapture(e.pointerId))windowEl.releasePointerCapture(e.pointerId);target=Math.round(target);if(moved)suppress=performance.now()+350;else if(e.type==='pointerup')openReading();}
 listen(windowEl,'pointerup',release);listen(windowEl,'pointercancel',release);
 listen(windowEl,'wheel',e=>{e.preventDefault();target=clamp(target+(Math.abs(e.deltaX)>Math.abs(e.deltaY)?e.deltaX:e.deltaY)/(w*.8));clearTimeout(wheelTimer);wheelTimer=setTimeout(()=>target=Math.round(target),180);},{passive:false});
 listen(windowEl,'keydown',e=>{if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();target=clamp(Math.round(target)+(e.key==='ArrowRight'?1:-1));}if(e.key==='Enter')openReading();});
 frame=requestAnimationFrame(render);windowEl.focus({preventScroll:true});
}
