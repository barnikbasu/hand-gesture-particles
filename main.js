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
    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        const landmarks = results.multiHandLandmarks[0];

        // 1. PINCH SCALING LOGIC
        const dist = Math.sqrt(Math.pow(landmarks[4].x - landmarks[8].x, 2) + Math.pow(landmarks[4].y - landmarks[8].y, 2));
        targetScale = THREE.MathUtils.mapLinear(dist, 0.05, 0.3, 0.2, 4.0);

        // 2. GESTURE ESTIMATION LOGIC
        // Convert landmarks to fingerpose format
        const fpLandmarks = landmarks.map(lm => [lm.x * 640, lm.y * 480, lm.z * 640]);
        const estimation = gestureEstimator.estimate(fpLandmarks, 8.5);

        if (estimation.gestures.length > 0) {
            const bestGesture = estimation.gestures.reduce((p, c) => (p.confidence > c.confidence) ? p : c);
            
            // Switch templates based on gesture
            if (bestGesture.name === 'peace' && currentTemplate !== 'hearts') {
                setTemplate('hearts');
            } else if (bestGesture.name === 'thumbs_up' && currentTemplate !== 'fireworks') {
                setTemplate('fireworks');
            }
        }
    }
});

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
