// Text-free channel symbols and the matching CRT hover card.
const labels = {
  writing: ['RESEARCH', 'PAPERS'],
  script: ['SCREENPLAYS'],
  visual: ['ILLUSTRATION', '& ARTWORK'],
  image: ['VIDEO', '& FILMS'],
};

export function createChannelArtwork(id) {
  const icon = document.createElement('canvas'); icon.width = 960; icon.height = 720;
  const x = icon.getContext('2d');
  x.fillStyle = '#f2f6fb'; x.fillRect(0, 0, 960, 720);
  x.strokeStyle = '#173b85'; x.fillStyle = '#173b85';
  x.lineWidth = 24; x.lineCap = 'round'; x.lineJoin = 'round';
  const path = points => { x.beginPath(); points.forEach(([a,b],i) => i ? x.lineTo(a,b) : x.moveTo(a,b)); x.stroke(); };
  const circle = (a,b,r) => { x.beginPath(); x.arc(a,b,r,0,Math.PI*2); x.stroke(); };
  if (id === 'writing') {
    path([[555,514],[282,514],[282,146],[510,146],[590,226],[590,300]]);
    path([[508,148],[508,228],[588,228]]);
    path([[340,285],[467,285]]); path([[340,350],[438,350]]); path([[340,415],[424,415]]);
    x.fillStyle='#f2f6fb';x.beginPath();x.arc(586,430,99,0,Math.PI*2);x.fill();x.stroke();
    x.lineWidth=32;path([[658,502],[730,574]]);
  } else if (id === 'script') {
    const mask=(cx,cy,angle,happy)=>{
      x.save();x.translate(cx,cy);x.rotate(angle);
      x.fillStyle='#f2f6fb';x.beginPath();x.moveTo(-133,-136);x.quadraticCurveTo(0,-105,133,-136);x.lineTo(124,30);x.quadraticCurveTo(110,142,0,181);x.quadraticCurveTo(-110,142,-124,30);x.closePath();x.fill();x.stroke();
      path([[-78,-38],[-39,-38]]);path([[39,-38],[78,-38]]);
      x.beginPath();x.moveTo(-57,happy?38:82);x.quadraticCurveTo(0,happy?126:1,57,happy?38:82);x.stroke();x.restore();
    };
    mask(376,300,-.19,false);mask(598,377,.18,true);
  } else if (id === 'visual') {
    x.strokeRect(235,169,422,358);
    circle(345,277,34);
    path([[260,490],[389,366],[465,429],[543,350],[630,442]]);
    x.save();x.translate(668,366);x.rotate(.55);
    x.fillStyle='#f2f6fb';x.beginPath();x.moveTo(-24,-219);x.quadraticCurveTo(0,-252,24,-219);x.lineTo(30,89);x.lineTo(-30,89);x.closePath();x.fill();x.stroke();
    path([[-30,49],[30,49]]);
    x.fillStyle='#173b85';x.beginPath();x.moveTo(-29,91);x.bezierCurveTo(-59,127,-37,174,-65,210);x.bezierCurveTo(27,206,58,156,29,91);x.closePath();x.fill();x.restore();
  } else {
    x.strokeRect(213,165,534,390);
    path([[213,231],[747,231]]);path([[213,489],[747,489]]);
    for(let i=0;i<6;i++){x.fillRect(243+i*83,186,34,24);x.fillRect(243+i*83,510,34,24);}
    x.beginPath();x.moveTo(429,283);x.lineTo(566,360);x.lineTo(429,437);x.closePath();x.fill();
  }
  const hover = document.createElement('canvas'); hover.width=960;hover.height=720;
  const h=hover.getContext('2d');
  function paintHover(progress=.12) {
    h.fillStyle='#081c57';h.fillRect(0,0,960,720);
    h.strokeStyle='#799bdd';h.lineWidth=2;h.strokeRect(35,35,890,650);
    h.fillStyle='#a7bde9';h.textAlign='center';h.font='22px Menlo, Monaco, monospace';h.fillText('SELECTED CHANNEL',480,139);
    const lines=labels[id]||['ARCHIVE'];
    h.fillStyle='#f0f5ff';h.font='bold 108px Menlo, Monaco, monospace';
    lines.forEach((line,i)=>h.fillText(line,480,lines.length===1?330:278+i*104,840));
    h.strokeStyle='#c0d2f5';h.strokeRect(172,438,616,47);
    h.fillStyle='#d7e6ff';
    for(let i=0;i<24;i++)if((i+.5)/24<=progress)h.fillRect(180+i*25,446,19,31);
    h.font='bold 35px Menlo, Monaco, monospace';h.fillText('CLICK TO OPEN',480,557);
    h.fillStyle='#809ccc';h.font='18px Menlo, Monaco, monospace';h.fillText('SIGNAL READY',480,605);
  }
  paintHover();
  return {icon,hover,paintHover};
}
