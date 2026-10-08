import sys
sys.path.insert(0,'/Users/airland/Documents/Codex/2026-09-24/nie-k/work/blender-deps')
import bpy,bmesh,json,hashlib
from pathlib import Path
ROOT=Path('/Users/airland/Documents/ChatGPT/作品集网页')
bpy.ops.wm.open_mainfile(filepath=str(ROOT/'backups/tv-hard-corners/retro_tv_stack-original.blend'))
transforms={o.name:list(sum((list(row) for row in o.matrix_world),[])) for o in bpy.context.scene.objects}
def mesh_digest(o):return hashlib.sha256(repr([(tuple(v.co)) for v in o.data.vertices]).encode()).hexdigest()
screens={o.name:mesh_digest(o) for o in bpy.context.scene.objects if o.name.endswith('_Screen')}
changed=[]
for o in list(bpy.context.scene.objects):
 if not o.name.endswith('_Body'):continue
 bm=bmesh.new();bm.from_mesh(o.data);seen=set();targets=[]
 for v in bm.verts:
  if v in seen:continue
  comp={v};todo=[v];seen.add(v)
  while todo:
   current=todo.pop()
   for e in current.link_edges:
    n=e.other_vert(current)
    if n not in seen:seen.add(n);comp.add(n);todo.append(n)
  lo=[min(v.co[k] for v in comp) for k in range(3)];hi=[max(v.co[k] for v in comp) for k in range(3)]
  mats={f.material_index for v in comp for f in v.link_faces}
  if len(mats)==1 and o.data.materials[next(iter(mats))].name.startswith('Ivory') and min(hi[k]-lo[k] for k in range(3))>.15:
   targets.append((comp,lo,hi,next(iter(mats))))
 assert len(targets)==2,(o.name,len(targets))
 for comp,lo,hi,mat in targets:
  bmesh.ops.delete(bm,geom=list(comp),context='VERTS')
  result=bmesh.ops.create_cube(bm,size=1)
  for v in result['verts']:
   for k in range(3):v.co[k]=v.co[k]*(hi[k]-lo[k])+(lo[k]+hi[k])/2
  for f in {f for v in result['verts'] for f in v.link_faces}:f.material_index=mat;f.smooth=False
 bm.normal_update();bm.to_mesh(o.data);bm.free();o.data.update();changed.append(o.name)
assert len(changed)==23
for o in bpy.context.scene.objects:
 assert transforms[o.name]==list(sum((list(row) for row in o.matrix_world),[])),o.name
 if o.name in screens:assert screens[o.name]==mesh_digest(o),o.name
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'models-source/retro_tv_stack-hard-corners.blend'))
bpy.ops.object.select_all(action='DESELECT')
for o in bpy.context.scene.objects:
 if o.name.startswith('TV_'):o.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(ROOT/'public/models/retro_tv_stack.glb'),use_selection=True,export_extras=True,export_yup=True)
(ROOT/'models-source/hard-corners-verification.json').write_text(json.dumps({'modified_bodies':changed,'shells_replaced':46,'object_transforms_unchanged':True,'screens_geometry_unchanged':True},indent=2))
print('VERIFIED: 46 shells replaced, 23 screen meshes and all object transforms unchanged')
