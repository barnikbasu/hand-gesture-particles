
let handField = null;
let particleSpeed = 1;
let particleHue = 0;
import * as THREE from 'three';

// ---------------- GESTURES ----------------
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

// ---------------- SCENE ----------------
let pinchScale = 1, targetScale = 1;
const PARTICLE_COUNT = 5000;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, innerWidth/innerHeight, 0.1, 1000);
camera.position.z = 50;

const renderer = new THREE.WebGLRenderer({antialias:true,alpha:true});
renderer.setSize(innerWidth, innerHeight);
document.getElementById("video-container").appendChild(renderer.domElement);

// ---------------- PARTICLES ----------------
const geometry = new THREE.BufferGeometry();
const positions = new Float32Array(PARTICLE_COUNT*3);
const velocities = new Float32Array(PARTICLE_COUNT*3);

for(let i=0;i<velocities.length;i++) velocities[i]=(Math.random()-0.5)*0.03;
geometry.setAttribute("position", new THREE.BufferAttribute(positions,3));

const material = new THREE.PointsMaterial({size:0.6,color:0x00ffcc,transparent:true,blending:THREE.AdditiveBlending});
const particleSystem = new THREE.Points(geometry,material);
scene.add(particleSystem);

// ---------------- BUBBLES ----------------
let bubbles=[];
let score=0;

function spawnBubble(){
  bubbles.push({x:(Math.random()-0.5)*60,y:(Math.random()-0.5)*40,z:(Math.random()-0.5)*20,r:2});
}
setInterval(spawnBubble,2000);

// ---------------- HAND FIELD ----------------
let handField=null, fieldMode="attract";

// ---------------- TEMPLATES ----------------
export function setTemplate(type){
  const pos=geometry.attributes.position;
  for(let i=0;i<PARTICLE_COUNT;i++){
    const t=Math.random()*Math.PI*2;
    let x,y,z;
    if(type==="hearts"){
      x=16*Math.pow(Math.sin(t),3);
      y=13*Math.cos(t)-5*Math.cos(2*t)-2*Math.cos(3*t)-Math.cos(4*t);
      z=(Math.random()-0.5)*5;
    }else{
      const r=20*Math.cos(5*t);
      x=r*Math.cos(t); y=r*Math.sin(t); z=(Math.random()-0.5)*5;
    }
    pos.setXYZ(i,x,y,z);
  }
  pos.needsUpdate=true;
}

export function updateColor(c){ material.color.set(c); }
setTemplate("hearts");

// ---------------- HAND TRACKING ----------------
const video=document.getElementById("webcam");
const hands=new Hands({locateFile:f=>`https://cdn.jsdelivr.net/npm/@mediapipe/hands/${f}`});
hands.setOptions({maxNumHands:1,minDetectionConfidence:0.5});

hands.onResults(r=>{
 if(r.multiHandLandmarks){
  const h=r.multiHandLandmarks[0];
  const d=Math.hypot(h[4].x-h[8].x,h[4].y-h[8].y);
  targetScale=THREE.MathUtils.mapLinear(d,0.05,0.3,0.3,4);

  handField={x:(h[8].x-0.5)*80,y:-(h[8].y-0.5)*80,z:(h[8].z||0)*40};

  const data=h.map(p=>[p.x*100,p.y*100,p.z*100]);
  const est=gestureEstimator.estimate(data,7.5);
  if(est.gestures.length){
    const g=est.gestures.sort((a,b)=>b.score-a.score)[0].name;
    fieldMode = g==="peace" ? "repel" : "attract";
  }
 }
});

const cam=new Camera(video,{onFrame:async()=>await hands.send({image:video}),width:640,height:480});
cam.start();

// ---------------- PHYSICS ----------------
function applyFieldPhysics(){
 if(!handField) return;
 const pos=geometry.attributes.position.array;
 for(let i=0;i<PARTICLE_COUNT;i++){
  const k=i*3;
  let dx=handField.x-pos[k], dy=handField.y-pos[k+1], dz=handField.z-pos[k+2];
  let d=Math.sqrt(dx*dx+dy*dy+dz*dz)+0.1;
  let f=(fieldMode==="attract"?0.05:-0.05)/d;
  velocities[k]+=dx*f*0.01; velocities[k+1]+=dy*f*0.01; velocities[k+2]+=dz*f*0.01;
  velocities[k]*=0.95; velocities[k+1]*=0.95; velocities[k+2]*=0.95;
  pos[k]+=velocities[k]; pos[k+1]+=velocities[k+1]; pos[k+2]+=velocities[k+2];
 }
 geometry.attributes.position.needsUpdate=true;
}

// ---------------- BUBBLE HIT ----------------
function checkBubbleHits(){
 if(!handField) return;
 bubbles=bubbles.filter(b=>{
  const d=Math.hypot(b.x-handField.x,b.y-handField.y,b.z-handField.z);
  if(d<b.r){
   score++;
   document.getElementById("scoreBoard").innerText="Score: "+score;
   return false;
  }
  return true;
 });
}

// ---------------- ANIMATE ----------------
function animate(){
 requestAnimationFrame(animate);
 pinchScale+=(targetScale-pinchScale)*0.1;
 particleSystem.scale.set(pinchScale,pinchScale,pinchScale);
 bubbles.forEach(b=>b.y+=0.03);
 applyFieldPhysics();
 checkBubbleHits();
 renderer.render(scene,camera);
}
animate();
