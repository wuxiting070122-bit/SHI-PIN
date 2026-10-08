const cache = new Map();
// 程序绘制的概念研究画面，同时用于电视屏幕与详情封面。
export function artwork(category, variant = 0) {
  const key = `${category.id}-${variant}`;
  if (cache.has(key)) return cache.get(key);
  const c = document.createElement('canvas'); c.width = 960; c.height = 720;
  const x = c.getContext('2d'), dark = '#4a4e53', pale = '#f3f2ed';
  x.fillStyle = pale; x.fillRect(0, 0, 960, 720);
  x.strokeStyle = dark; x.fillStyle = dark;
  if (category.id === 'visual') {
    x.lineWidth = 3;
    for (let i = 0; i < 16; i++) { x.beginPath(); x.arc(480 + variant * 60, 355, 65 + i * 15, -.95, Math.PI * 1.35); x.stroke(); }
    x.fillRect(452, 190, 56, 330);
  } else if (category.id === 'script') {
    x.strokeStyle='#315fca';x.lineWidth=10;x.strokeRect(240,130,480,420);
    x.beginPath();x.moveTo(480,130);x.lineTo(480,550);x.moveTo(240,380);x.lineTo(720,380);x.stroke();
    x.fillStyle='#315fca';x.font='24px monospace';x.fillText('TRAIN WINDOW / SCRIPTS',240,600);
  } else if (category.id === 'digital') {
    for (let i = 0; i < 9; i++) { x.globalAlpha = 1 - i * .07; x.fillStyle = i % 2 ? pale : dark; x.fillRect(195 + i * 28, 110 + i * 23, 570 - i * 56, 480 - i * 46); } x.globalAlpha = 1;
  } else if (category.id === 'image') {
    const g = x.createLinearGradient(0, 100, 0, 620); g.addColorStop(0, '#c6cdd1'); g.addColorStop(.65, '#e6e8e5'); g.addColorStop(1, pale); x.fillStyle = g; x.fillRect(130, 95, 700, 520);
    x.fillStyle = '#faf9f5'; x.beginPath(); x.arc(600, 240, 75, 0, Math.PI * 2); x.fill(); x.fillStyle = dark;
    for (let i = 0; i < 10; i++) x.fillRect(130 + i * 75, 430 - Math.sin(i * 7 + variant) * 70, 65, 185);
  } else if (category.id === 'writing') {
    x.fillStyle = '#fffaf0'; x.fillRect(220, 130, 520, 420); x.strokeStyle = '#4265a5'; x.lineWidth = 3; x.strokeRect(220,130,520,420); x.beginPath(); x.moveTo(220,130); x.lineTo(480,340); x.lineTo(740,130); x.stroke();
    x.fillStyle = '#4265a5'; x.fillRect(460, 320, 40, 40);
  } else if (category.id === 'space') {
    x.lineWidth = 2;
    for (let i = 0; i < 9; i++) { const a = 60 + i * 23; x.strokeRect(480 - a, 340 - a * .8, a * 2, a * 1.6); }
    x.fillStyle = '#b9b7b0'; x.beginPath(); x.moveTo(220, 548); x.lineTo(480, 340); x.lineTo(740, 548); x.fill(); x.fillStyle = dark; x.fillRect(445, 220, 70, 170);
  } else {
    x.lineWidth = 4;
    for (let i = 0; i < 7; i++) { x.beginPath(); for (let p = 0; p <= 600; p += 3) { const y = 220 + i * 42 + Math.sin(p / 45 + i + variant) * 47; if (!p) x.moveTo(180 + p, y); else x.lineTo(180 + p, y); } x.stroke(); }
  }
  x.globalAlpha = .45; x.strokeStyle = dark; x.lineWidth = 1; x.strokeRect(30, 30, 900, 660); x.globalAlpha = 1;
  x.fillStyle = '#315fca'; x.fillRect(44, 43, 116, 50);
  x.fillStyle = '#fffaf0'; x.font = 'bold 28px monospace'; x.fillText(category.channel, 58, 78);
  x.fillStyle = dark; x.font = '18px monospace'; x.fillText(`STUDY ${category.channel} / 0${variant + 1}`, 55, 68); x.textAlign = 'right'; x.fillText('TV TOWER — 2026', 905, 68);
  x.textAlign = 'left'; x.font = 'bold 40px sans-serif'; x.fillText(category.projects[variant % category.projects.length]?.en || (category.pending ? 'COMING SOON' : category.en), 55, 658);
  cache.set(key, c); return c;
}
