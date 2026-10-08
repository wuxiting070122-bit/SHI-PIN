import './interaction-guide.css';
import { createRippleType } from './ripple-type.js';

const guides = {
  tower: [['HOVER A SCREEN', 'Reveal the work category'], ['CLICK A SCREEN', 'Enter the collection'], ['DRAG / TWO-FINGER SCROLL', 'Rotate the TV tower']],
  letters: [['CLICK A FOLD / NUMBER', 'Select a paper'], ['SCROLL UP / DOWN', 'Browse papers one at a time'], ['DRAG / SWIPE RIGHT', 'Overview → paper → full reading'], ['DRAG / SWIPE LEFT', 'Return one view']],
  record: [['CLICK THE SCREEN', 'Enter the film close-up'], ['CLICK THE DISC', 'Play / pause the film'], ['SCROLL UP / DOWN', 'Select another film']],
  film: [['DRAG LEFT / RIGHT', 'Browse the artworks'], ['CLICK VIEW ARTWORK', 'Open the complete image'], ['BACK TO SIGNAL', 'Return to the TV tower']],
  train: [['DRAG THE WINDOW', 'Switch between scripts'], ['CLICK A SCRIPT', 'Open the full story'], ['TOP-LEFT ARROW', 'Return to the TV tower']],
};

export function addInteractionGuide(parent, scene) {
  const guide = document.createElement('aside');
  guide.className = 'interaction-guide';
  guide.dataset.scene = scene;
  guide.setAttribute('aria-label', 'Interaction instructions');
  const heading = document.createElement('strong');
  heading.textContent = '> HOW TO EXPLORE';
  guide.append(heading);
  for (const [action, result] of guides[scene]) {
    const row = document.createElement('p');
    const label = document.createElement('span');
    label.textContent = action;
    row.append(label, document.createTextNode(result));
    guide.append(row);
  }
  const ink = document.createElement('div');
  ink.className = 'interaction-guide-ink';
  ink.setAttribute('aria-hidden', 'true');
  guide.append(ink);
  const mount = scene === 'record' ? parent.querySelector('.record-notes') : parent;
  mount.append(guide);
  const lines = scene === 'record' ? ['> HOW TO EXPLORE', 'CLICK SCREEN / FILM CLOSE-UP', 'CLICK DISC / PLAY OR PAUSE', 'SCROLL UP / DOWN / SELECT FILM'] : scene === 'train' ? ['> HOW TO EXPLORE', 'DRAG WINDOW / SWITCH SCRIPTS', 'CLICK SCRIPT / READ FULL STORY', 'TOP-LEFT ARROW / BACK TO TOWER'] : ['> HOW TO EXPLORE', '', ...guides[scene].flatMap(([action, result]) => [action, result, ''])];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  // One transparent text surface uses the same ripple shader as the tower title.
  let ripple;
  try {
    ripple = createRippleType(ink, reduced, {
      width: 960, height: (lines.length * 32 + 16) * 2,
      fontSize: 44, textX: 20, textY: 52, lineHeight: 64, strength: .22, lines,
    });
    guide.classList.add('has-ripple');
  } catch {
    ink.remove(); // Keep the readable DOM text when WebGL is unavailable.
    return () => guide.remove();
  }
  let frame, last = performance.now();
  function render(now) {
    const dt = Math.min((now - last) / 1000, .05);
    last = now;
    if (guide.isConnected && !parent.inert && guide.checkVisibility({checkOpacity:true,checkVisibilityCSS:true})) {
      ripple.update(now / 1000, dt);
    }
    frame = requestAnimationFrame(render);
  }
  frame = requestAnimationFrame(render);
  return () => { cancelAnimationFrame(frame); ripple.dispose(); guide.remove(); };
}
