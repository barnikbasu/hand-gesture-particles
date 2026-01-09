import * as THREE from 'three';

// --- NEW GESTURE DEFINITIONS ---
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

// --- SCENE SETUP ---
let currentTemplate = 'hearts';
let pinchScale = 1.0;
let targetScale = 1.0;
const PARTICLE_COUNT = 5000;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.getElementById('video-container').appendChild(renderer.domElement);
camera.position.z = 50;

const geometry = new THREE.BufferGeometry();
const positions = new Float32Array(PARTICLE_COUNT * 3);
geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
const material = new THREE.PointsMaterial({ size: 0.5, transparent: true, blending: THREE.AdditiveBlending, color: 0x00ffcc });
const particleSystem = new THREE.Points(geometry, material);
scene.add(particleSystem);

export function setTemplate(type) {
    currentTemplate = type;
    const posAttr = geometry.attributes.position;
    for (let i = 0; i < PARTICLE_COUNT; i++) {
        let x, y, z;
        const t = Math.random() * Math.PI * 2;
        if (type === 'hearts') {
            x = 16 * Math.pow(Math.sin(t), 3);
            y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
            z = (Math.random() - 0.5) * 5;
        } else if (type === 'flowers') {
            const r = 20 * Math.cos(5 * t);
            x = r * Math.cos(t); y = r * Math.sin(t); z = (Math.random() - 0.5) * 5;
        } else { // Fireworks / Sphere
            const phi = Math.acos(-1 + (2 * i) / PARTICLE_COUNT);
            const theta = Math.sqrt(PARTICLE_COUNT * Math.PI) * phi;
            x = 20 * Math.cos(theta) * Math.sin(phi);
            y = 20 * Math.sin(theta) * Math.sin(phi);
            z = 20 * Math.cos(phi);
        }
        posAttr.setXYZ(i, x, y, z);
    }
    posAttr.needsUpdate = true;
}

export function updateColor(val) { material.color.set(val); }

// --- HAND TRACKING & GESTURE LOGIC ---
const videoElement = document.getElementById('webcam');
const hands = new Hands({locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`});
hands.setOptions({ maxNumHands: 1, modelComplexity: 1, minDetectionConfidence: 0.5 });

hands.onResults((results) => {
    if (results.multiHandLandmarks) {
        for (const hand of results.multiHandLandmarks) {
            
            // 1. PINCH SCALING (Existing logic)
            const dist = Math.sqrt(Math.pow(hand[4].x - hand[8].x, 2) + Math.pow(hand[4].y - hand[8].y, 2));
            targetScale = THREE.MathUtils.mapLinear(dist, 0.05, 0.3, 0.2, 4.0);

            // 2. GESTURE ESTIMATION (New logic)
            // Note: We format hand data for fingerpose [x, y, z]
            const fingerData = hand.map(lm => [lm.x * 100, lm.y * 100, lm.z * 100]);
            const estimation = gestureEstimator.estimate(fingerData, 7.5);

            if (estimation.gestures.length > 0) {
                // Sort by confidence score
                const gesture = estimation.gestures.sort((a, b) => b.score - a.score)[0].name;

                if (gesture === "thumbs_up") triggerFireworks();
                if (gesture === "peace") toggleSwarm();
            }

            // 3. AUXILIARY HANDLERS (Required to prevent errors)
            airPaint(hand);
            detectSwipe(hand);
            kineticMapping(hand);
        }
    }
});

// --- NEW HANDLER FUNCTIONS ---

function triggerFireworks() {
    console.log("Gesture Detected: Thumbs Up!");
    setTemplate('fireworks');
    material.color.setHex(0xffaa00); // Pulse color to gold
}

function toggleSwarm() {
    console.log("Gesture Detected: Peace!");
    setTemplate('hearts');
    material.color.setHex(0xff0066); // Pulse color to pink
}

// Placeholder functions for the logic you requested
function airPaint(hand) {
    // You can implement index-finger drawing logic here
}

function detectSwipe(hand) {
    // You can implement horizontal movement tracking here
}

function kineticMapping(hand) {
    // Maps hand rotation or movement to the particle rotation
    particleSystem.rotation.x = hand[0].y * 2;
    particleSystem.rotation.z = hand[0].x * 2;
}

const cameraInput = new Camera(videoElement, {
    onFrame: async () => { await hands.send({image: videoElement}); }, 
    width: 640, height: 480
});
cameraInput.start();

function animate() {
    requestAnimationFrame(animate);
    pinchScale += (targetScale - pinchScale) * 0.1;
    particleSystem.scale.set(pinchScale, pinchScale, pinchScale);
    particleSystem.rotation.y += 0.005;
    renderer.render(scene, camera);
}

setTemplate('hearts');
animate();

let prevTip = null;

function airPaint(hand){
  const tip = hand[8];
  if(!prevTip) prevTip = tip;

  const speed = Math.hypot(tip.x-prevTip.x, tip.y-prevTip.y);

  if(speed > 0.01){
    spawnParticleAt(tip.x, tip.y, speed * 120);
  }

  prevTip = tip;
}

let lastX = null;

function detectSwipe(hand){
  const x = hand[8].x;

  if(lastX && Math.abs(x-lastX) > 0.12){
    if(x > lastX) nextPreset();
    else prevPreset();
  }

  lastX = x;
}

let lastPos=null, lastTime=Date.now();

function kineticMapping(hand){
  const now = Date.now();
  const tip = hand[8];

  if(lastPos){
    const dist = Math.hypot(tip.x-lastPos.x, tip.y-lastPos.y);
    const speed = dist / (now-lastTime);

    particleSpeed = Math.min(speed*1000, 8);
    particleHue += speed * 40;
  }

  lastPos = tip;
  lastTime = now;
}
