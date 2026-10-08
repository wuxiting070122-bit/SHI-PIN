import * as THREE from 'three';

export const paperPalette = {
  background: '#f4f3ef',
  paper: '#fbfaf5',
  shade: '#dfdfda',
  graphite: '#42464c',
  paleLine: '#abb1b4',
  blue: '#315fca',
};

let paperMap;
export function paperTexture() {
  if (paperMap) return paperMap;
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 256;
  const context = canvas.getContext('2d');
  context.fillStyle = paperPalette.paper; context.fillRect(0, 0, 256, 256);
  const image = context.getImageData(0, 0, 256, 256);
  // Deterministic speckles prevent a visible change when the page is reloaded.
  let seed = 47;
  for (let i = 0; i < image.data.length; i += 4) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    const grain = (seed >>> 24) - 128;
    for (let channel = 0; channel < 3; channel++) image.data[i + channel] = Math.max(0, Math.min(255, image.data[i + channel] + grain * .035));
  }
  context.putImageData(image, 0, 0);
  context.lineCap = 'round';
  for (let i = 0; i < 130; i++) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    const x = seed % 256;
    seed = (seed * 1664525 + 1013904223) >>> 0;
    const y = seed % 256;
    const length = 3 + (seed >>> 27);
    context.strokeStyle = i % 5 === 0 ? 'rgba(57,63,68,.055)' : 'rgba(57,63,68,.025)';
    context.lineWidth = i % 6 === 0 ? .8 : .45;
    context.beginPath();
    context.moveTo(x, y);
    context.lineTo(x + length, y - 1.6);
    context.stroke();
  }
  paperMap = new THREE.CanvasTexture(canvas);
  paperMap.colorSpace = THREE.SRGBColorSpace;
  paperMap.wrapS = paperMap.wrapT = THREE.RepeatWrapping;
  paperMap.anisotropy = 4;
  return paperMap;
}

function materialTone(name, original) {
  if (/screen|display|vinyl|groove/i.test(name)) return null;
  if (/blue|signal|accent/i.test(name)) return paperPalette.blue;
  if (/rubber|recess|graphite|edge|dark|trim|cable|disc/i.test(name)) return paperPalette.graphite;
  if (/metal|aluminum|silver/i.test(name)) return paperPalette.shade;
  if (/paper|ivory|enamel|card|white|body/i.test(name)) return paperPalette.paper;
  const lightness = original.color?.getHSL({ h: 0, s: 0, l: 0 }).l ?? 1;
  return lightness < .32 ? paperPalette.graphite : paperPalette.paper;
}

export function stylePaperModel(root, { keep = () => false, outlines = true, paperMap = paperTexture() } = {}) {
  const created = [];
  const converted = new Map();
  const ink = new THREE.LineBasicMaterial({ color: paperPalette.graphite, transparent: true, opacity: .68, depthWrite: false });
  created.push(ink);
  root.traverse(object => {
    if (!object.isMesh) return;
    const originals = Array.isArray(object.material) ? object.material : [object.material];
    const result = originals.map(original => {
      if (keep(object, original)) return original;
      if (!converted.has(original)) {
        const color = materialTone(original.name || '', original);
        if (!color) { converted.set(original, original); return original; }
        const mat = new THREE.MeshStandardMaterial({ color, roughness: 1, metalness: 0, side: original.side });
        if (color === paperPalette.paper) {
          mat.map = paperMap;
          // Paper texture is nearly white; base color stays warm.
          mat.color.set('#ffffff');
        }
        mat.name = `Pencil / ${original.name || 'surface'}`;
        converted.set(original, mat); created.push(mat);
      }
      return converted.get(original);
    });
    object.material = Array.isArray(object.material) ? result : result[0];
    if (!outlines || /screen/i.test(object.name)) return;
    const box = new THREE.Box3().setFromObject(object);
    const size = box.getSize(new THREE.Vector3());
    // Edges on tiny cylinders create dark noise, so only describe readable forms.
    if (Math.max(size.x, size.y, size.z) < .18 || size.length() > 45) return;
    const edgeGeometry = new THREE.EdgesGeometry(object.geometry, 35);
    if (edgeGeometry.attributes.position.count < 2 || edgeGeometry.attributes.position.count > 3200) { edgeGeometry.dispose(); return; }
    const lines = new THREE.LineSegments(edgeGeometry, ink);
    lines.name = 'Pencil outline'; lines.renderOrder = 2;
    object.add(lines); created.push(edgeGeometry);
  });
  return () => created.forEach(resource => resource.dispose());
}
