import './style.css';
import { createWorld } from './grid';
import { createScene } from './render/scene';
import { BlockRenderer } from './render/blocks';
import { createBoundsOutline, createMarkers } from './render/markers';

// --- Setup -------------------------------------------------------------
const grid = createWorld();
const { renderer, scene, camera, controls } = createScene(document.getElementById('app')!);

const blocks = new BlockRenderer(grid);
blocks.sync(grid);
scene.add(blocks.mesh);

const markers = createMarkers();
scene.add(markers.spawn, markers.base, createBoundsOutline(grid));

// --- Game loop ---------------------------------------------------------
// update(dt) changes the game state; render draws it. dt = seconds since the
// last frame. Multiplying speeds by dt makes things move at the same speed
// on a 60 Hz and a 144 Hz screen.

function update(dt: number): void {
  markers.base.rotation.y += 1.0 * dt; // 1 radian per second, at any frame rate
}

let last = performance.now();

function frame(now: number): void {
  // Clamp: if the tab was in the background, don't jump 30 seconds at once.
  const dt = Math.min(Math.max((now - last) / 1000, 0), 0.1);
  last = now;

  update(dt);
  controls.update(); // needed every frame for damping
  renderer.render(scene, camera);

  requestAnimationFrame(frame); // ask the browser to call us again next frame
}

requestAnimationFrame(frame);
