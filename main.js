import * as THREE from 'three';

let currentTemplate = 'hearts';
let pinchScale = 1.0;
let targetScale = 1.0;
const PARTICLE_COUNT = 5000;

// Setup Scene
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);
camera.position.z = 50;

// Particles
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
        } else {
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

// Hand Tracking Logic
const videoElement = document.getElementById('webcam');
const hands = new Hands({locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`});
hands.setOptions({ maxNumHands: 1, modelComplexity: 1, minDetectionConfidence: 0.5 });
hands.onResults((results) => {
    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        const landmarks = results.multiHandLandmarks[0];
        const dist = Math.sqrt(Math.pow(landmarks[4].x - landmarks[8].x, 2) + Math.pow(landmarks[4].y - landmarks[8].y, 2));
        targetScale = THREE.MathUtils.mapLinear(dist, 0.05, 0.3, 0.2, 4.0);
    }
});

const cameraInput = new Camera(videoElement, {onFrame: async () => { await hands.send({image: videoElement}); }, width: 640, height: 480});
cameraInput.start();

function animate() {
    requestAnimationFrame(animate);
    // Smooth scaling (Lerp)
    pinchScale += (targetScale - pinchScale) * 0.1;
    particleSystem.scale.set(pinchScale, pinchScale, pinchScale);
    particleSystem.rotation.y += 0.005;
    renderer.render(scene, camera);
}
setTemplate('hearts');
animate();
