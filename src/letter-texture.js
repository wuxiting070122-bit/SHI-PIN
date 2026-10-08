import * as THREE from 'three';

const INK = '#172f62';
const BLUE = '#2859bb';
const LINE = '#9ab2da';
const PAPER = '#fcfcf7';

function paperCanvas(width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = PAPER; ctx.fillRect(0, 0, width, height);
  let seed = 61;
  for (let i = 0; i < 950; i++) {
    seed = (1664525 * seed + 1013904223) >>> 0; const x = seed % width;
    seed = (1664525 * seed + 1013904223) >>> 0; const y = seed % height;
    ctx.fillStyle = 'rgba(42,72,115,.045)'; ctx.fillRect(x, y, 2 + seed % 8, 1);
  }
  return { canvas, ctx };
}

function textureFrom(canvas) {
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

function foldArtwork(index, title) {
  const { canvas, ctx } = paperCanvas(1200, 480);
  const lines = [
    ['CHRISTIANITY', 'AND LAW'],
    ['THE SCHOOL', 'OF ATHENS'],
    ['NATURE IN WUXIA', 'CINEMA'],
  ][index] || [title, ''];
  ctx.fillStyle = BLUE; ctx.fillRect(38, 36, 16, 395);
  ctx.font = '29px Menlo, Monaco, monospace';
  ctx.fillText(`SHI PIN / PAPER ${String(index + 1).padStart(2, '0')}`, 90, 86);
  ctx.fillStyle = INK; ctx.font = 'bold 105px Menlo, Monaco, monospace';
  ctx.fillText(lines[0], 88, 225, 1060);
  ctx.fillText(lines[1], 88, 354, 1060);
  ctx.fillStyle = LINE; ctx.fillRect(88, 403, 1045, 4);
  return textureFrom(canvas);
}

function companionArtwork(index) {
  const topics = [
    ['LAW / HISTORY', 'CANON · ETHICS · SOCIETY'],
    ['ART / REASON', 'HUMANISM · RENAISSANCE'],
    ['FILM / SYMBOLS', 'BAMBOO · RAIN · DESERT'],
    ['03 PAPERS', 'TEXT · IMAGE · MEANING'],
  ];
  const [headline, detail] = topics[index];
  const { canvas, ctx } = paperCanvas(1200, 480);
  ctx.fillStyle = BLUE; ctx.fillRect(40, 34, 18, 400);
  ctx.font = '30px Menlo, Monaco, monospace';ctx.fillText('SHI PIN / TRANSMISSION', 90, 91);
  ctx.fillStyle = INK;ctx.font = 'bold 102px Menlo, Monaco, monospace';
  ctx.fillText(headline, 86, 244, 1060);
  ctx.fillStyle = BLUE;ctx.font = '36px Menlo, Monaco, monospace';
  ctx.fillText(detail, 90, 323, 1060);
  ctx.fillStyle = LINE;ctx.fillRect(90, 393, 1030, 4);
  for(let i=0;i<32;i++){
    ctx.fillStyle=i%5<3?BLUE:'#dce5f2';
    ctx.fillRect(90+i*32,415,13,23);
  }
  return textureFrom(canvas);
}

function indexArtwork() {
  const { canvas, ctx } = paperCanvas(1200, 480);
  ctx.fillStyle = BLUE;ctx.fillRect(40, 34, 18, 400);
  ctx.font='30px Menlo, Monaco, monospace';ctx.fillText('SHI PIN / RESEARCH ARCHIVE',90,91);
  ctx.fillStyle=INK;ctx.font='bold 106px Menlo, Monaco, monospace';
  ctx.fillText('PAPER INDEX',86,245);
  ctx.fillText('03 DOCUMENTS',86,368);
  ctx.fillStyle=LINE;ctx.fillRect(90,413,1030,4);
  return textureFrom(canvas);
}

function bodyArtwork(count) {
  const { canvas, ctx } = paperCanvas(1200, 760);
  ctx.strokeStyle = INK; ctx.lineWidth = 6; ctx.strokeRect(48, 45, 1104, 670);
  ctx.strokeStyle = LINE; ctx.lineWidth = 2;
  for (let x = 90; x < 1140; x += 75) { ctx.beginPath(); ctx.moveTo(x, 47); ctx.lineTo(x, 712); ctx.stroke(); }
  ctx.fillStyle = INK; ctx.font = '600 63px Menlo, Monaco, monospace';
  ctx.fillText('SHI PIN', 90, 167);
  ctx.font = '51px Menlo, Monaco, monospace'; ctx.fillText('DOCUMENT RECEIVER', 90, 275);
  ctx.fillStyle = BLUE; ctx.font = '32px Menlo, Monaco, monospace';
  ctx.fillText(`ARCHIVE / WU XITING / ${String(count).padStart(2, '0')} FILES`, 90, 366);
  ctx.fillText('TEXT  /  MEMORY  /  TRANSMISSION', 90, 452);
  for (let i = 0; i < 42; i++) {
    ctx.fillStyle = i % 5 < 3 ? BLUE : '#dce5f2';
    ctx.fillRect(90 + i * 24, 612, 13, 36);
  }
  return textureFrom(canvas);
}

function foldPlane(back = false) {
  // The GLB leaf is a YZ plane. Its front faces local -X, and local -Z is up.
  const geometry = new THREE.BufferGeometry();
  const x=back?.016:-.016;
  geometry.setAttribute('position', new THREE.Float32BufferAttribute([
    x, -.72, -.055,  x, .72, -.055,
    x, .72, -.595,  x, -.72, -.595,
  ], 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 1], 2));
  geometry.setIndex(back?[0,2,1,0,3,2]:[0,1,2,0,2,3]);
  geometry.computeVertexNormals();
  return geometry;
}

export function applySignalIndexTexture(model, works) {
  const resources = [];
  const add = (parent, geometry, map) => {
    const material = new THREE.MeshBasicMaterial({ map, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -1 });
    const decal = new THREE.Mesh(geometry, material);
    decal.name = 'Signal Index print';
    decal.raycast = () => {}; // Keep the underlying folding sheet clickable.
    parent.add(decal);
    resources.push(geometry, material, map);
  };
  for (let index=0;index<4;index++) {
    const inner=model.getObjectByName(`Fold_${String(index*2+1).padStart(2,'0')}_Hinge_Geometry`);
    const outer=model.getObjectByName(`Fold_${String(index*2+2).padStart(2,'0')}_Hinge_Geometry`);
    const topic=companionArtwork(index);
    const title=works[index]?foldArtwork(index,works[index].title):indexArtwork();
    if(inner){add(inner,foldPlane(),topic);add(inner,foldPlane(true),title);}
    if(outer){add(outer,foldPlane(),title);add(outer,foldPlane(true),topic);}
    // The paired prints use separate geometry and material but share their maps.
    if(!inner&&!outer){topic.dispose();title.dispose();}
  }
  const box = model.getObjectByName('Open_Box');
  if (box) {
    const geometry = new THREE.PlaneGeometry(1.55, .94);
    geometry.translate(0, .69, .505);
    add(box, geometry, bodyArtwork(works.length));
  }
  return () => resources.forEach(resource => resource.dispose());
}
