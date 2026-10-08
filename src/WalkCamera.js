import * as THREE from 'three';
import gsap from 'gsap';
import { createWalkPath, walkPose, damp, shortestProgress, inspectionPath } from './walk-path.js';
import { isClick, screenFrame, fitDistance } from './math.js';
import { edgeOrbitInput } from './edge-orbit.js';

export class WalkCamera {
  constructor(camera, element, { canInteract, onTap, reduced = false }) {
    this.camera = camera; this.element = element; this.canInteract = canInteract; this.onTap = onTap; this.reduced = reduced;
    this.path = createWalkPath(camera.aspect < .75 ? 1.28 : 1);
    this.pose = { progress: 0, yaw: 0, pitch: .10 }; this.target = { ...this.pose };
    this.gaze = new THREE.Vector2(); this.enabled = false; this.pointers = new Map(); this.keys = new Set(); this.holdDirection = 0;
    this.obstacles = []; this.timeline = null; this.saved = null; this.multi = false; this.dragging = false;
    this.edgeInput = 0; this.edgeVelocity = 0;
    this.apply(); this.bind();
  }
  bind() {
    this.element.addEventListener('pointerdown', e => {
      if (!this.enabled || !this.canInteract() || e.button !== 0) return;
      this.edgeInput = 0; this.edgeVelocity = 0;
      e.preventDefault(); this.element.parentElement.focus({ preventScroll: true });
      this.pointers.set(e.pointerId, { x:e.clientX,y:e.clientY,start:{x:e.clientX,y:e.clientY},moved:false });
      if (this.pointers.size > 1) this.multi = true;
      this.element.setPointerCapture(e.pointerId);
    });
    this.element.addEventListener('pointermove', e => {
      if (!this.enabled || !this.canInteract()) return;
      const rect = this.element.getBoundingClientRect();
      this.edgeInput = e.pointerType === 'mouse' && !this.pointers.size && !e.buttons
        ? edgeOrbitInput(e.clientX - rect.left, rect.width) : 0;
      if (e.pointerType === 'mouse') this.gaze.set((e.clientX-rect.left)/rect.width-.5, (e.clientY-rect.top)/rect.height-.5);
      const p = this.pointers.get(e.pointerId); if (!p) return;
      const dx = e.clientX-p.x, dy = e.clientY-p.y; p.x=e.clientX; p.y=e.clientY;
      if (!isClick(p.start,p)) p.moved = true;
      if (!p.moved && !this.multi) return;
      this.dragging = true; this.element.parentElement.classList.add('dragging');
      if (this.multi) this.target.progress -= dy * .0009;
      else { this.target.yaw -= dx * .0034; this.target.pitch = THREE.MathUtils.clamp(this.target.pitch-dy*.0027,-.58,.88); }
    });
    const release = (e,cancel = false) => {
      const p = this.pointers.get(e.pointerId);
      const tap = p && !cancel && !p.moved && !this.multi && this.enabled && this.canInteract();
      this.pointers.delete(e.pointerId);
      if (this.element.hasPointerCapture(e.pointerId)) this.element.releasePointerCapture(e.pointerId);
      if (!this.pointers.size) { this.multi=false; this.dragging=false; this.element.parentElement.classList.remove('dragging'); }
      if (tap) this.onTap(e);
    };
    this.element.addEventListener('pointerup', e => release(e));
    this.element.addEventListener('pointercancel', e => release(e,true));
    this.element.addEventListener('lostpointercapture', e => { this.pointers.delete(e.pointerId); if (!this.pointers.size) { this.dragging=false; this.multi=false; this.element.parentElement.classList.remove('dragging'); } });
    this.element.addEventListener('pointerleave', () => { this.gaze.set(0,0); this.edgeInput = 0; });
    this.element.addEventListener('wheel', e => {
      if (!this.enabled || !this.canInteract()) return;
      this.edgeInput = 0; this.edgeVelocity = 0;
      e.preventDefault(); const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? innerHeight : 1;
      this.target.progress += THREE.MathUtils.clamp((e.deltaY + e.deltaX) * unit,-160,160)*.00048;
    },{passive:false});
    window.addEventListener('keydown', e => {
      if (!this.enabled || !this.canInteract() || e.target.closest('input,textarea,select,[contenteditable="true"],summary')) return;
      if (['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','KeyW','KeyS','KeyA','KeyD'].includes(e.code)) { this.keys.add(e.code); e.preventDefault(); }
    });
    window.addEventListener('keyup', e => this.keys.delete(e.code));
    window.addEventListener('blur', () => this.clearInput());
    document.addEventListener('visibilitychange', () => { if(document.hidden) this.clearInput(); });
  }
  clearInput() {
    this.edgeInput = 0; this.edgeVelocity = 0;
    this.keys.clear(); this.holdDirection=0; this.gaze.set(0,0); this.pointers.clear(); this.multi=false; this.dragging=false;
    this.element.parentElement.classList.remove('dragging');
  }
  setEnabled(enabled) {
    this.enabled = enabled;
    if (!enabled) { this.clearInput(); this.target={...this.pose}; }
  }
  apply() {
    const gaze = this.reduced || this.pointers.size ? new THREE.Vector2() : this.gaze;
    const view = walkPose(this.path,this.pose.progress,this.pose.yaw-gaze.x*.026,this.pose.pitch-gaze.y*.018);
    this.camera.position.copy(view.position); this.camera.quaternion.copy(view.quaternion);
  }
  update(dt) {
    if (!this.enabled || this.timeline) return;
    if (!this.canInteract()) { this.clearInput(); return; }
    this.edgeVelocity = damp(this.edgeVelocity, this.pointers.size ? 0 : this.edgeInput * .032, 10, dt);
    this.target.progress += this.edgeVelocity * dt;
    const walk = this.holdDirection + (this.keys.has('KeyW')||this.keys.has('KeyD')?1:0) - (this.keys.has('KeyS')||this.keys.has('KeyA')?1:0);
    this.target.progress += walk * dt * .045;
    this.target.yaw += ((this.keys.has('ArrowLeft')?1:0)-(this.keys.has('ArrowRight')?1:0))*dt*.85;
    this.target.pitch = THREE.MathUtils.clamp(this.target.pitch+((this.keys.has('ArrowUp')?1:0)-(this.keys.has('ArrowDown')?1:0))*dt*.55,-.58,.88);
    const speed = this.reduced ? 18 : 6;
    for(const key of ['progress','yaw','pitch']) this.pose[key]=damp(this.pose[key],this.target[key],speed,dt);
    const view=walkPose(this.path,this.pose.progress,this.pose.yaw-(this.reduced?0:this.gaze.x*.026),this.pose.pitch-(this.reduced?0:this.gaze.y*.018));
    this.camera.position.copy(view.position);
    this.camera.quaternion.slerp(view.quaternion,1-Math.exp(-12*dt));
  }
  lookQuaternion(position, target) {
    return new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().lookAt(position,target,new THREE.Vector3(0,1,0)));
  }
  focus(screen, complete) {
    this.timeline?.kill(); this.setEnabled(false);
    this.saved={ pose:{...this.pose},position:this.camera.position.clone(),quaternion:this.camera.quaternion.clone() };
    const frame=screenFrame(screen), distance=Math.max(1.7,fitDistance(frame.width*1.9,frame.height*1.9,this.camera.fov,this.camera.aspect));
    this.focusCurve=inspectionPath(this.path,this.pose.progress,this.camera.position,frame,distance,this.obstacles);
    if (!this.focusCurve) { this.saved=null; return false; }
    this.travel={u:0};
    const turn={u:0}, initial=this.camera.quaternion.clone();
    const facing=this.lookQuaternion(this.camera.position,frame.center);
    this.timeline=gsap.timeline({onComplete:()=>{this.timeline=null;complete();}});
    this.timeline.to(turn,{u:1,duration:this.reduced ? .05 : .28,ease:'sine.inOut',onUpdate:()=>this.camera.quaternion.slerpQuaternions(initial,facing,turn.u)});
    this.timeline.to(this.travel,{u:1,duration:this.reduced ? .08 : Math.min(2.8,1.0+this.focusCurve.getLength()*.12),ease:'sine.inOut',onUpdate:()=>{
      this.camera.position.copy(this.focusCurve.getPointAt(this.travel.u));
      this.camera.quaternion.copy(this.lookQuaternion(this.camera.position,frame.center));
    }});
    return true;
  }
  returnHome(complete) {
    if(!this.saved){complete();return;}
    this.timeline?.kill(); this.setEnabled(false);
    const saved=this.saved, from=this.travel.u, initial=this.camera.quaternion.clone(), transition={u:0};
    this.timeline=gsap.timeline({onComplete:()=>{
      this.pose={...saved.pose}; this.target={...saved.pose}; this.camera.position.copy(saved.position); this.camera.quaternion.copy(saved.quaternion);
      this.saved=null;this.timeline=null;complete();
    }});
    this.timeline.to(transition,{u:1,duration:this.reduced ? .08 : Math.max(.4,Math.min(2.3,this.focusCurve.getLength()*from*.13+.45)),ease:'sine.inOut',onUpdate:()=>{
      this.camera.position.copy(this.focusCurve.getPointAt(from*(1-transition.u)));
      this.camera.quaternion.slerpQuaternions(initial,saved.quaternion,transition.u);
    }});
  }
  reset(animated=true) {
    this.timeline?.kill(); this.setEnabled(false); this.saved=null;
    const progress=shortestProgress(this.pose.progress,0);
    const yaw=this.pose.yaw + Math.atan2(Math.sin(-this.pose.yaw),Math.cos(-this.pose.yaw));
    if(!animated){this.pose={progress:0,yaw:0,pitch:.10};this.target={...this.pose};this.apply();return;}
    this.timeline=gsap.timeline({onComplete:()=>{this.timeline=null;this.target={...this.pose};this.setEnabled(this.canInteract());this.element.parentElement.focus({preventScroll:true});}});
    this.timeline.to(this.pose,{progress,yaw,pitch:.10,duration:this.reduced ? .08 : 1.2,ease:'sine.inOut',onUpdate:()=>this.apply()});
  }
}
