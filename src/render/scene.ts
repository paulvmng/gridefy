// Three.js boilerplate: renderer, camera, lights, camera controls.

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CENTER_X, CENTER_Z } from '../config';

export function createScene(container: HTMLElement) {
  // The renderer draws the scene onto a <canvas>.
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // cap it for performance
  renderer.setSize(window.innerWidth, window.innerHeight);
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1e2230);

  // Perspective camera: (field of view in degrees, aspect ratio, near, far).
  const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 200);
  camera.position.set(CENTER_X + 14, 16, CENTER_Z + 14);

  // OrbitControls rotate the camera around a target point (the grid center).
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(CENTER_X, 1, CENTER_Z);
  controls.enableDamping = true; // smooth stop after you let go
  controls.maxPolarAngle = Math.PI / 2 - 0.05; // don't let the camera go under the floor
  controls.update();

  // Lighting: a soft sky/ground fill plus one "sun" so box faces get different shades.
  scene.add(new THREE.HemisphereLight(0xffffff, 0x444466, 1.2));
  const sun = new THREE.DirectionalLight(0xffffff, 1.8);
  sun.position.set(10, 20, 5);
  scene.add(sun);

  // Keep everything correct when the window is resized.
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  return { renderer, scene, camera, controls };
}
