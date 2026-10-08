import { addInteractionGuide } from './interaction-guide.js';
import { openResume } from './resume.js';
import { openTrainSpace } from './train-space.js';
import './style.css';
import { playCrtEntry } from './crt-entry.js';
import gsap from 'gsap';
import { TowerScene } from './scene.js';
import { AppState } from './state.js';
import { categories } from './data.js';
import { artwork } from './artwork.js';
import { openRecordPlayer } from './record-player.js';
import { openFilmRoll } from './film-roll.js';
import { createRippleType } from './ripple-type.js';
import { openLetterSpace } from './letter-space.js';

const $ = s => document.querySelector(s);
addInteractionGuide(document.querySelector('#tower-editorial'), 'tower');
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const state = new AppState(value => {
  document.body.dataset.state = value;
  tower?.setEnabled(value === 'VIEWFINDER');

});
let tower, introDone = false, panelOrigin = 'VIEWFINDER', focusCategory = null, lastFocus = null;
let soundEnabled = false, audioContext, toastTimer, capturing = false, currentPanel = '';
const photos = [];
let rippleType;
let bootTimeline, towerReady=false, bootRevealing=false;
const bootProgress={value:0};
async function revealTower() {
  if (!towerReady || state.value !== 'BOOT' || bootRevealing) return;
  bootRevealing=true;bootTimeline?.kill();$('#boot-enter').disabled=true;
  document.body.classList.add('crt-entering');
  gsap.set('#transition',{opacity:0});
  await playCrtEntry({boot:$('#boot'),tower,reduced,onReveal:()=>{
    introDone=true;$('#viewfinder').hidden=false;$('#explore-bottom').hidden=false;
    state.set('VIEWFINDER');tower.setEnabled(false);
  }});
  document.body.classList.remove('crt-entering');tower.setEnabled(true);$('#scene').focus({preventScroll:true});
}
function updateBootProgress() {
  const value=Math.round(bootProgress.value),bar=$('.boot-progress');
  bar.style.setProperty('--progress',value+'%');bar.setAttribute('aria-valuenow',value);
  $('.boot-status').textContent=value<75?'RECEIVING SIGNAL...':value<100?'TUNING INTO THE ARCHIVE...':'SIGNAL CONNECTED / SYSTEM READY';
}
function bootCamera() {
  state.set('BOOT');$('#loader').hidden=true;$('#boot').hidden=false;gsap.set('#transition',{opacity:0});
  bootTimeline=gsap.to(bootProgress,{value:75,duration:reduced?.2:2.4,ease:'steps(18)',onUpdate:updateBootProgress});
}
$('#boot-enter').onclick=revealTower;
document.body.dataset.state = 'LOADING';
const imageFor = (cat, i = 0) => cat.projects[i]?.previewCover || cat.projects[i]?.cover || cat.cover || artwork(cat, i).toDataURL('image/webp');

function toast(message) { $('#toast').textContent = message; $('#toast').classList.add('visible'); clearTimeout(toastTimer); toastTimer = setTimeout(() => $('#toast').classList.remove('visible'), 2600); }
function sound(type = 'click') {
  if (!soundEnabled) return;
  try {
    audioContext ||= new (window.AudioContext || window.webkitAudioContext)(); audioContext.resume();
    const oscillator = audioContext.createOscillator(), gain = audioContext.createGain();
    oscillator.type = type === 'shutter' ? 'square' : 'sine'; const now = audioContext.currentTime;
    oscillator.frequency.setValueAtTime(type === 'shutter' ? 180 : type === 'success' ? 660 : 430, now);
    oscillator.frequency.exponentialRampToValueAtTime(type === 'shutter' ? 55 : 230, now + .11);
    gain.gain.setValueAtTime(.035, now); gain.gain.exponentialRampToValueAtTime(.001, now + .14);
    oscillator.connect(gain); gain.connect(audioContext.destination); oscillator.start(); oscillator.stop(now + .15);
  } catch { soundEnabled = false; updateSound(); }
}
function updateSound() { $('#sound-state').textContent = soundEnabled ? 'ON' : 'OFF'; $('#sound').setAttribute('aria-pressed', soundEnabled); $('#sound').setAttribute('aria-label', soundEnabled ? 'Mute audio' : 'Enable audio'); }
$('#sound').onclick = () => { soundEnabled = !soundEnabled; updateSound(); sound(); };

const noiseCanvas = $('#transition canvas'), nx = noiseCanvas.getContext('2d'); noiseCanvas.width = 180; noiseCanvas.height = 120;
const noiseData = nx.createImageData(180, 120); let noiseTick = 0;
function drawNoise(t) { if (t - noiseTick < .075) return; noiseTick = t; for (let i = 0; i < noiseData.data.length; i += 4) { const v = Math.random() * 130 + 40; noiseData.data[i] = v; noiseData.data[i+1] = v + 9; noiseData.data[i+2] = v + 5; noiseData.data[i+3] = 255; } nx.putImageData(noiseData, 0, 0); }
function selectScreen(screen) {
  if(!screen.userData.category)return;
  if(screen.userData.category.pending){toast('Screenplays / Window Archive');return;}
  if (!state.set('FOCUS_TV')) return;
  sound(); focusCategory = screen.userData.category;
  const started = tower.focus(screen, reduced, () => {
    if (state.value !== 'FOCUS_TV') return;
    showPanel('category', focusCategory, true);
  });
  if (!started) { returnFromFocus(); toast('View blocked. Try another angle.'); }
}
function returnFromFocus() {
  if (!['FOCUS_TV', 'DETAIL'].includes(state.value)) return;
  state.set('RETURNING'); focusCategory = null;
  tower.returnHome(reduced, () => { state.set('VIEWFINDER'); $('#scene').focus({ preventScroll: true }); });
}

function showPanel(type, data, fromFocus = false) {
  if(type==='category'&&(!data||data.pending)){toast('Screenplays / Window Archive');return;}
  if (['LOADING','LENS_ZOOM','BOOT','RETURNING'].includes(state.value) || (state.value === 'FOCUS_TV' && !fromFocus)) return;
  if (state.value !== 'DETAIL') {
    panelOrigin = fromFocus ? 'FOCUS_TV' : state.value; lastFocus = document.activeElement;
    if (!state.set('DETAIL')) return;
  }
  $('#quick-menu').open = false;
  if(type==='about'){
    $('#panel').close();
    openResume({reduced,trigger:document.querySelector('.about-window'),onClose:()=>{
      if(panelOrigin==='FOCUS_TV')returnFromFocus();
      else {state.set(panelOrigin);if(lastFocus?.isConnected)lastFocus.focus({preventScroll:true});}
    }});
    return;
  }
  if (type === 'category' && ['visual', 'image', 'writing', 'script'].includes(data.id)) {
    $('#panel').close();
    const openSpace = data.id === 'script' ? openTrainSpace : data.id === 'visual' ? openFilmRoll : data.id === 'writing' ? openLetterSpace : openRecordPlayer;
    openSpace({ category:data, reduced, onClose: () => {
      if (panelOrigin === 'FOCUS_TV') returnFromFocus();
      else { state.set(panelOrigin); $('#scene').focus({ preventScroll: true }); }
    } });
    return;
  }
  currentPanel = type;
  const content = $('#panel-content');
  if (type === 'index') {
    $('#panel-kicker').textContent = `THE ARCHIVE / ${String(categories.length).padStart(2, '0')} CHANNELS`;
    content.innerHTML = `<div class="panel-heading"><div><h2 id="panel-title">EVERY FREQUENCY HAS AN ECHO.</h2><p class="panel-subtitle">Select a channel to explore the archive.</p></div><span class="sample-badge">SELECTED WORKS / PREVIEW</span></div><div class="category-list">${categories.map(c => `<button class="category-item" data-category="${c.id}"><span class="number">${c.channel}</span><strong>${c.title}<span>${c.en}</span></strong><small>${c.tag} · ${c.pending?'COMING SOON':String(c.projects.length).padStart(2,'0')}</small><span class="arrow">↗</span></button>`).join('')}</div>`;
  } else if (type === 'category') {
    const c = data;
    $('#panel-kicker').textContent = `CH.${c.channel} / ${c.en.toUpperCase()}`;
    content.innerHTML = `<button class="back-link" data-panel="index">← ALL CHANNELS</button><div class="panel-heading"><div><h2 id="panel-title">${c.title}</h2><p class="panel-subtitle">${c.intro}</p></div><span class="sample-badge">SELECTED WORKS / ${c.projects.length} PROJECTS</span></div><div class="project-grid">${c.projects.map((p,i) => `<button class="project-card" data-project="${p.id}"><img src="${imageFor(c,i)}" alt="${p.title} cover"/><div class="card-info"><h3>${p.title} ↗</h3><span>${p.year}</span></div><p>${p.kind}</p></button>`).join('')}</div>`;
  } else if (type === 'project') {
    const { category: c, project: p, index } = data;
    $('#panel-kicker').textContent = `SELECTED STUDY / ${p.en}`;
    content.innerHTML = `<button class="back-link" data-category="${c.id}">← ${c.title}</button><div class="panel-heading"><div><h2 id="panel-title">${p.title}</h2><p class="panel-subtitle">${p.kind} · ${p.year || "ARCHIVE"}</p></div><span class="sample-badge">CONCEPT STUDY</span></div><img class="project-hero" src="${imageFor(c,index)}" alt="${p.title} artwork"/><div class="project-story"><div><p class="eyebrow">01 / THE IDEA</p><h3>ABOUT THIS WORK</h3><p>${p.description}</p></div><div><p class="eyebrow">02 / THE PROCESS</p>${p.note ? `<p>${p.note}</p>` : ""}<p>${p.role || "WU XITING"}</p></div></div>${p.id === 'signal' ? '<div class="game"><p class="eyebrow">TUNE IN / INTERACTIVE EXPERIMENT</p><h3>A CHANNEL HIDES IN THE STATIC.</h3><label for="tuner">Tune the frequency until the signal is clear.</label><div class="frequency"><output id="frequency">88.0</output> <small>MHz</small></div><input id="tuner" type="range" min="880" max="1080" value="880" step="1" aria-label="Frequency"/><div class="signal-meter"><i id="signal-strength"></i></div><p id="signal-feedback" aria-live="polite">Tune slowly and watch the signal strength.</p><button id="lock-signal" class="primary">LOCK CHANNEL <span>↗</span></button></div>' : ''}`;
    if (p.id === 'signal') setupGame();
  } else if (type === 'about') {
    $('#panel-kicker').textContent = 'BEHIND THE VIEWFINDER';
    content.innerHTML = `<div class="about-copy"><p class="eyebrow">HELLO, STRANGER.</p><h2 id="panel-title">COLLECTING SIGNALS<br/>BETWEEN THE FRAMES.</h2><p>SHI PIN is Wu Xiting’s archive of images, stories, research, and motion. Each old television leads to a different way of seeing the work.</p><p>An invitation to pause, look closer, and follow a signal that catches your eye.</p><div class="about-tags"><span>VISUAL DESIGN</span><span>DIGITAL EXPERIENCES</span><span>CREATIVE EXPLORATION</span></div><p>Explore original papers, screenplays, illustrations, and films throughout the archive.</p><div class="signature">Thanks for tuning in.</div></div>`;
  } else if (type === 'help') {
    $('#panel-kicker').textContent = 'A SMALL FIELD GUIDE';
    content.innerHTML = `<h2 id="panel-title">HOW TO EXPLORE</h2><p class="panel-subtitle">Take your time. Explore from every angle.</p><div class="help-list"><div><span>Look around</span><kbd>Drag / Arrow keys</kbd></div><div><span>Move forward or back</span><kbd>Wheel / W S / Bottom arrows</kbd></div><div><span>On touch screens</span><kbd>One finger to look / Two to move</kbd></div><div><span>Open a channel</span><kbd>Click a TV screen</kbd></div><div><span>Capture this view</span><kbd>Space / Shutter button</kbd></div><div><span>Close a detail or focus</span><kbd>ESC / Close</kbd></div><div><span>Browse all works</span><kbd>Work index</kbd></div></div><p class="panel-subtitle">Photos stay in this session and can be downloaded from the album. Audio starts muted.</p>`;
  } else if (type === 'album') {
    $('#panel-kicker').textContent = `MEMORY ROLL / ${String(photos.length).padStart(2,'0')} FRAMES`;
    content.innerHTML = `<div class="panel-heading"><div><h2 id="panel-title">CAPTURE THE SIGNAL.</h2><p class="panel-subtitle">Up to 12 images from this session. Refreshing clears them.</p></div></div>${photos.length ? `<div class="album-grid">${photos.map((p,i) => `<article class="photo"><img src="${p.url}" alt="TV Tower frame ${i+1}"/><div class="photo-footer"><span>FRAME ${String(i+1).padStart(2,'0')} / ${p.time}</span><a href="${p.url}" download="tv-tower-${i+1}.jpg">DOWNLOAD ↓</a></div></article>`).join('')}</div>` : '<div class="empty"><strong>NO FRAMES CAPTURED.</strong>Return to the tower and press Space or the shutter button<br/>to save a favorite view.</div>'}`;
  }
  if (!$('#panel').open) $('#panel').showModal();
  $('#panel').scrollTop = 0; $('#close-panel').focus({ preventScroll: true }); sound();
}
function closePanel() {
  if (!$('#panel').open) return;
  $('#panel').close();
  if (panelOrigin === 'FOCUS_TV') returnFromFocus();
  else { state.set(panelOrigin); if (panelOrigin === 'ERROR') $('#loader').hidden = false; if (lastFocus?.isConnected) lastFocus.focus({ preventScroll: true }); }
  currentPanel = '';
}
$('#close-panel').onclick = closePanel;
$('#panel').addEventListener('cancel', e => { e.preventDefault(); closePanel(); });
$('#panel').addEventListener('click', e => { if (e.target === $('#panel')) { const r = e.target.getBoundingClientRect(); if(e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) closePanel(); } });
document.addEventListener('click', e => {
  const panel = e.target.closest('[data-panel]'), category = e.target.closest('[data-category]'), project = e.target.closest('[data-project]');
  if (panel) showPanel(panel.dataset.panel);
  if (category) showPanel('category', categories.find(c => c.id === category.dataset.category));
  if (project) { const c = categories.find(c => c.projects.some(p => p.id === project.dataset.project)); const index = c.projects.findIndex(p => p.id === project.dataset.project); showPanel('project', { category: c, project: c.projects[index], index }); }
});
function reset() { if (state.value !== 'VIEWFINDER' || tower.timeline) return; $('#quick-menu').open = false; sound(); tower.reset(); }
$('#reset').onclick = reset;
$('#quick-menu').addEventListener('toggle', () => tower?.setEnabled(state.value === 'VIEWFINDER' && !$('#quick-menu').open && !tower.timeline));
document.addEventListener('pointerdown', e => { if ($('#quick-menu').open && !e.target.closest('#quick-menu')) $('#quick-menu').open = false; });
for (const [selector,direction] of [['#walk-back',-1],['#walk-forward',1]]) {
  const button=$(selector); let pressed=0;
  button.addEventListener('pointerdown', e => { if(state.value!=='VIEWFINDER'||tower.timeline)return;e.preventDefault();pressed=performance.now();tower.navigation.holdDirection=direction;button.setPointerCapture(e.pointerId); });
  button.addEventListener('pointerup', e => { if(pressed && performance.now()-pressed<180 && state.value==='VIEWFINDER' && !tower.timeline)tower.navigation.target.progress+=direction*.022;pressed=0;tower.navigation.holdDirection=0;if(button.hasPointerCapture(e.pointerId))button.releasePointerCapture(e.pointerId); });
  button.addEventListener('pointercancel', () => { pressed=0;if(tower)tower.navigation.holdDirection=0; });
  button.addEventListener('lostpointercapture', () => { if(tower)tower.navigation.holdDirection=0; });
  button.addEventListener('click', e => { if(e.detail===0 && state.value==='VIEWFINDER' && !tower.timeline)tower.navigation.target.progress+=direction*.022; });
}

function setupGame() {
  let target = 900 + Math.floor(Math.random() * 161), solved = false;
  const tuner = $('#tuner'), update = () => {
    const value = Number(tuner.value), distance = Math.abs(value - target);
    $('#frequency').textContent = (value / 10).toFixed(1);
    $('#signal-strength').style.width = `${Math.max(2, 100 - distance * 2)}%`;
    $('#signal-feedback').textContent = distance <= 2 ? 'SIGNAL CLEAR. LOCK THE CHANNEL.' : distance < 12 ? 'GETTING CLOSER… TUNE SLOWLY.' : 'ONLY STATIC. KEEP SEARCHING.';
  };
  tuner.oninput = update;
  $('#lock-signal').onclick = () => {
    if (solved) { target = 900 + Math.floor(Math.random() * 161); solved = false; tuner.disabled = false; tuner.value = '880'; $('#lock-signal').innerHTML = 'LOCK CHANNEL <span>↗</span>'; update(); return; }
    if (Math.abs(Number(tuner.value) - target) <= 2) { solved = true; tuner.disabled = true; $('#signal-feedback').textContent = 'SIGNAL RECEIVED. FIND YOUR FREQUENCY.'; $('#lock-signal').textContent = 'FIND ANOTHER SIGNAL ↻'; sound('success'); }
    else { $('#signal-feedback').textContent = 'SIGNAL WEAK. TUNE CLOSER.'; sound(); }
  };
}

async function takePhoto() {
  if (state.value !== 'VIEWFINDER' || capturing) return;
  capturing = true; $('#shutter').disabled = true;
  try {
    const blob = await tower.capture(), url = URL.createObjectURL(blob);
    if (photos.length >= 12) URL.revokeObjectURL(photos.shift().url);
    photos.push({ url, time: new Date().toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'}) });
    $('#photo-count').textContent = String(photos.length).padStart(2,'0');
    $('.photo-preview')?.remove(); const thumb = document.createElement('img'); thumb.className = 'photo-preview'; thumb.src = url; thumb.alt = ''; $('.controls').append(thumb);
    if (!reduced) gsap.from(thumb, { y: -80, opacity: 0, rotate: -12, duration: .6 });
    document.body.classList.add('taking-photo'); setTimeout(() => document.body.classList.remove('taking-photo'), 750);
    gsap.fromTo('#flash', { opacity: reduced ? .08 : .65 }, { opacity: 0, duration: .25 }); sound('shutter'); toast(`FRAME ${photos.length} SAVED TO ALBUM`);
  } catch { toast('Capture failed. Please try again.'); }
  finally { capturing = false; $('#shutter').disabled = false; }
}
$('#shutter').onclick = takePhoto;
window.addEventListener('keydown', e => {
  if (e.repeat) return;
  if (e.key === 'Escape' && $('#quick-menu').open) { $('#quick-menu').open = false; if(state.value==='VIEWFINDER') $('#scene').focus({preventScroll:true}); return; }
  if (e.key === 'Escape' && state.value === 'FOCUS_TV') { returnFromFocus(); return; }
  if (e.code === 'Space' && state.value === 'VIEWFINDER' && !e.target.closest('button,a,input')) { e.preventDefault(); takePhoto(); }
});
$('#retry').onclick = () => location.reload(); $('#fallback').onclick = () => { $('#loader').hidden = true; showPanel('index'); };

async function start() {
  bootCamera();
  try {
    tower = new TowerScene($('#scene'), { onSelect: selectScreen, onHover: () => {}, reduced, canInteract: () => state.value === 'VIEWFINDER' && !tower?.timeline && !$('#quick-menu').open, onProgress: (loaded,total) => {
      $('#load-number').textContent = total ? `${Math.floor(loaded / total * 100)}%` : `${(loaded/1048576).toFixed(1)} MB`;
      $('#load-fill').style.width = total ? `${loaded / total * 100}%` : '35%';
      $('#load-text').textContent = total && loaded >= total ? 'ARRANGING THE SCENE…' : 'RECEIVING THE TV TOWER…';
    } });
    await tower.load();
    $('#load-text').textContent = 'SIGNAL CONNECTED'; $('#load-number').textContent = '100%'; $('#load-fill').style.width = '100%';
    rippleType = createRippleType($('#ripple-type'), reduced);
    towerReady=true;$('#boot-enter').disabled=false;bootTimeline?.kill();
    bootTimeline=gsap.timeline({onComplete:revealTower});
    bootTimeline.to(bootProgress,{value:100,duration:reduced?.15:1.2,ease:'steps(12)',onUpdate:updateBootProgress}).to({}, {duration:reduced?.05:.45});
    let previous = performance.now(), elapsed = 0;
    const frame = now => {
      const dt = Math.min((now - previous) / 1000, .05); previous = now;
      if (!document.hidden) {
        elapsed += dt;
        if (state.value === 'LENS_ZOOM') drawNoise(elapsed);
        if (introDone && (state.value !== 'DETAIL' || tower.timeline)) tower.update(elapsed, dt);
        if(state.value === 'VIEWFINDER') rippleType?.update(elapsed,dt);

      }
      requestAnimationFrame(frame);
    }; requestAnimationFrame(frame);
    tower.renderer.domElement.addEventListener('webglcontextlost', e => { e.preventDefault(); toast('Graphics connection lost. Refresh to reconnect.'); });
  } catch (error) {
    console.error('Scene failed to load', error);bootTimeline?.kill();$('#boot').hidden=true;$('#loader').hidden=false;state.set('ERROR'); $('#load-text').textContent = 'CONNECTION LOST. PLEASE RETRY.'; $('#load-number').textContent = '—'; $('#retry').hidden = false; $('#fallback').hidden = false;
  }
}
if (new URLSearchParams(location.search).get('scene') === 'resume') {
  $('#loader').hidden=true;openResume({reduced,onClose:()=>{location.href='?scene=tower';}});
} else if (new URLSearchParams(location.search).get('scene') === 'film') {
  $('#loader').hidden = true;
  openFilmRoll({category:categories.find(c=>c.id==='visual'),reduced,onClose:()=>{location.href='?scene=tower';}});
} else if (new URLSearchParams(location.search).get('scene') === 'record-player') {
  $('#loader').hidden = true;
  openRecordPlayer({ reduced, onClose: () => { location.href = '?scene=tower'; } });
} else if (new URLSearchParams(location.search).get('scene') === 'letters') {
  $('#loader').hidden = true;
  openLetterSpace({ reduced, onClose: () => { location.href = '?scene=tower'; } });
} else if(new URLSearchParams(location.search).get('scene')==='train'){
  $('#loader').hidden=true;openTrainSpace({reduced,onClose:()=>{location.href='?scene=tower';}});
} else start();
