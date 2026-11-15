// Three.js boilerplate: renderer, camera, lights, camera controls.

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CENTER_X, CENTER_Z, GRID_HEIGHT, GRID_LENGTH, GRID_WIDTH } from '../config';

// Pan limit: the point the camera orbits around must stay inside the grid.
// (Cells are centered on integers, so the grid spans -0.5 .. size-0.5.)
const PAN_MIN = new THREE.Vector3(-0.5, 0, -0.5);
const PAN_MAX = new THREE.Vector3(GRID_WIDTH - 0.5, GRID_HEIGHT - 1, GRID_LENGTH - 0.5);

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
  // Zoom limits: the camera's distance from the target point, in world units
  // (1 unit = 1 block). It starts about 25 away.
  controls.minDistance = 5;
  controls.maxDistance = 40;
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

  // Call every frame, after controls.update().
  // If panning pushed the target outside the grid, pull it back, and move the
  // camera by the same amount so the view angle and zoom don't change.
  const clamped = new THREE.Vector3(); // reused every frame
  function clampPan(): void {
    clamped.copy(controls.target).clamp(PAN_MIN, PAN_MAX);
    if (clamped.equals(controls.target)) return; // inside the grid, nothing to do
    camera.position.add(clamped.sub(controls.target)); // clamped now holds the correction
    controls.target.add(clamped);
  }

  return { renderer, scene, camera, controls, clampPan };
}
