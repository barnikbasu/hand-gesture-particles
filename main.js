import * as THREE from 'three';

// ---------------- GESTURE DEFINITIONS ----------------
const thumbsUp = new fp.GestureDescription("thumbs_up");
thumbsUp.addCurl(fp.Finger.Thumb, fp.FingerCurl.NoCurl, 1.0);
[fp.Finger.Index, fp.Finger.Middle, fp.Finger.Ring, fp.Finger.Pinky]
.forEach(f => thumbsUp.addCurl(f, fp.FingerCurl.FullCurl, 1.0));

const peace = new fp.GestureDescription("peace");
peace.addCurl(fp.Finger.Index, fp.FingerCurl.NoCurl, 1.0);
peace.addCurl(fp.Finger.Middle, fp.FingerCurl.NoCurl, 1.0);
[fp.Finger.Thumb, fp.Finger.Ring, fp.Finger.Pinky]
.forEach(f => peace.addCurl(f, fp.FingerCurl.FullCurl, 1.0));

const gestureEstimator = new fp.GestureEstimator([thumbsUp, peace]);

// ---------------- SCENE SETUP ----------------
let currentTemplate = 'hearts';
let pinchScale = 1.0;
let targetScale = 1.0;
const PARTICLE_COUNT = 5000;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
camera.position.z = 50;

const renderer = new THREE.WebGLRenderer({ antialias:true, alpha:true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.getElementById("video-container").appendChild(renderer.domElement);

// ---------------- PARTICLES ----------------
const geometry = new THREE.BufferGeometry();
const positions = new Float32Array(PARTICLE_COUNT*3);
const velocities = new Float32Array(PARTICLE_COUNT*3);

for(let i=0;i<velocities.length;i++){
  velocities[i] = (Math.random()-0.5)*0.03;
}

geometry.setAttribute("position", new THREE.BufferAttribute(positions,3));

const material = new THREE.PointsMaterial({
  size:0.6,
  color:0x00ffcc,
  transparent:true,
  blending:THREE.AdditiveBlending
});

const particleSystem = new THREE.Points(geometry,material);
scene.add(particleSystem);

// ---------------- HAND FIELD ----------------
let handField=null;
let fieldMode="attract";

// ---------------- TEMPLATES ----------------
function setTemplate(type){
  const pos=geometry.attributes.position;
  for(let i=0;i<PARTICLE_COUNT;i++){
    const t=Math.random()*Math.PI*2;
    let x,y,z;

    if(type==="hearts"){
      x=16*Math.pow(Math.sin(t),3);
      y=13*Math.cos(t)-5*Math.cos(2*t)-2*Math.cos(3*t)-Math.cos(4*t);
      z=(Math.random()-0.5)*5;
    } else {
      const r=20*Math.cos(5*t);
      x=r*Math.cos(t); y=r*Math.sin(t); z=(Math.random()-0.5)*5;
    }
    pos.setXYZ(i,x,y,z);
  }
  pos.needsUpdate=true;
}
setTemplate("hearts");

// ---------------- HAND TRACKING ----------------
const videoElement=document.getElementById("webcam");
const hands=new Hands({locateFile:f=>`https://cdn.jsdelivr.net/npm/@mediapipe/hands/${f}`});
hands.setOptions({maxNumHands:1,minDetectionConfidence:0.5});

hands.onResults(res=>{
  if(res.multiHandLandmarks){
    const hand=res.multiHandLandmarks[0];

    // Pinch scale
    const d=Math.hypot(hand[4].x-hand[8].x,hand[4].y-hand[8].y);
    targetScale=THREE.MathUtils.mapLinear(d,0.05,0.3,0.3,4);

    // Hand Field
    handField={
      x:(hand[8].x-0.5)*80,
      y:-(hand[8].y-0.5)*80,
      z:(hand[8].z||0)*40
    };

    // Gesture Detect
    const data=hand.map(p=>[p.x*100,p.y*100,p.z*100]);
    const est=gestureEstimator.estimate(data,7.5);
    if(est.gestures.length){
      const g=est.gestures.sort((a,b)=>b.score-a.score)[0].name;
      if(g==="thumbs_up") fieldMode="attract";
      if(g==="peace") fieldMode="repel";
    }
  }
});

const cam=new Camera(videoElement,{
  onFrame:async()=>await hands.send({image:videoElement}),
  width:640,height:480
});
cam.start();

// ---------------- PHYSICS ----------------
function applyFieldPhysics(){
  if(!handField) return;
  const pos=geometry.attributes.position.array;

  for(let i=0;i<PARTICLE_COUNT;i++){
    const k=i*3;
    let dx=handField.x-pos[k];
    let dy=handField.y-pos[k+1];
    let dz=handField.z-pos[k+2];
    let d=Math.sqrt(dx*dx+dy*dy+dz*dz)+0.1;

    let f=(fieldMode==="attract"?0.05:-0.05)/d;

    velocities[k]+=dx*f*0.01;
    velocities[k+1]+=dy*f*0.01;
    velocities[k+2]+=dz*f*0.01;

    velocities[k]*=0.95;
    velocities[k+1]*=0.95;
    velocities[k+2]*=0.95;

    pos[k]+=velocities[k];
    pos[k+1]+=velocities[k+1];
    pos[k+2]+=velocities[k+2];
  }
  geometry.attributes.position.needsUpdate=true;
}

// ---------------- ANIMATE ----------------
function animate(){
  requestAnimationFrame(animate);
  pinchScale+=(targetScale-pinchScale)*0.1;
  particleSystem.scale.set(pinchScale,pinchScale,pinchScale);
  applyFieldPhysics();
  particleSystem.rotation.y+=0.002;
  renderer.render(scene,camera);
}
animate();
