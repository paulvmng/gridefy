import './style.css';
import { SPAWN, type Cell } from './config';
import { Enemy } from './enemy';
import { EnemyView } from './render/enemyView';
import { Block, createWorld } from './grid';
import { checkDelete, checkPlace } from './edit';
import { createScene } from './render/scene';
import { BlockRenderer } from './render/blocks';
import { createBoundsOutline, createMarkers } from './render/markers';
import { Picker, type Pick } from './render/picker';
import { Ghost } from './render/ghost';
import { PathView } from './render/pathView';
import { Heatmap } from './render/heatmap';
import { computeFlowField, findPath } from './pathfinding';
import { onClick } from './input/clicks';
import { Message } from './ui/message';
import { findTowers, type Tower } from './tower';
import { TargetLines } from './render/targetLines';

// --- Setup -------------------------------------------------------------
const grid = createWorld();
const { renderer, scene, camera, controls, clampPan } = createScene(document.getElementById('app')!);

const blocks = new BlockRenderer(grid);
const pathView = new PathView(grid);
const heatmap = new Heatmap(grid);
scene.add(blocks.mesh, pathView.mesh, heatmap.mesh);

const pathInfo = document.getElementById('pathinfo')!;

// The current flow field. Kept here (not just inside refreshWorld) because
// the enemy reads it every frame in update().
let field: Int32Array;
// Same idea for the towers: rebuilt from the grid on every change, read every frame.
let towers: Tower[] = [];
const targetLines = new TargetLines(grid);
scene.add(targetLines.mesh);

// Call whenever the grid changes: redraw the boxes, recompute the flow field,
// then redraw the path and the heatmap from it.
function refreshWorld(): void {
  blocks.sync(grid);
  towers = findTowers(grid);
  field = computeFlowField(grid);
  const path = findPath(grid, field);
  pathView.sync(path);
  heatmap.sync(grid, field);
  // Steps = how many moves. Cost = what they add up to (climbs count extra).
  const cost = field[grid.index(SPAWN.x, SPAWN.y, SPAWN.z)];
  pathInfo.textContent = path ? `${path.length - 1} steps, cost ${cost}` : 'BLOCKED';
}
refreshWorld();

// The build tool: which block a left-click places. 1 = wall, 2 = tower.
const TOOLS = [
  { key: 'Digit1', block: Block.Placed, name: 'wall' },
  { key: 'Digit2', block: Block.Tower, name: 'tower' },
];
let tool = TOOLS[0];
const toolInfo = document.getElementById('tool')!;
toolInfo.textContent = tool.name;

window.addEventListener('keydown', (e) => {
  if (e.code === 'KeyF') heatmap.toggle();
  const picked = TOOLS.find((t) => t.key === e.code);
  if (picked) {
    tool = picked;
    toolInfo.textContent = tool.name;
  }
});

const markers = createMarkers();
scene.add(markers.spawn, markers.base, createBoundsOutline(grid));

const picker = new Picker(camera, renderer.domElement, blocks.mesh);
const ghost = new Ghost();
scene.add(ghost.mesh);
const message = new Message(document.getElementById('msg')!);

// One enemy for now. When it reaches the base, a new one starts at the spawn.
let enemy = new Enemy(SPAWN);
const enemyView = new EnemyView();
scene.add(enemyView.mesh);

// --- Editing -----------------------------------------------------------

// A new block goes against the face you clicked:
// the hit block's cell + the face direction.
function placeTarget(p: Pick): Cell {
  return { x: p.cell.x + p.normal.x, y: p.cell.y + p.normal.y, z: p.cell.z + p.normal.z };
}

onClick(renderer.domElement, (button, x, y) => {
  const p = picker.pick(x, y);
  if (!p) return;

  if (button === 0) {
    // Left-click: place.
    const target = placeTarget(p);
    const error = checkPlace(grid, target, tool.block, enemy.cells());
    if (error) return message.show(error);
    grid.set(target.x, target.y, target.z, tool.block);
  } else if (button === 2) {
    // Right-click: delete.
    const error = checkDelete(grid, p.cell, enemy.cells());
    if (error) return message.show(error);
    grid.set(p.cell.x, p.cell.y, p.cell.z, Block.Air);
  } else {
    return;
  }

  refreshWorld(); // the data changed, so redraw everything that depends on it
});

// Remember where the mouse is. The ghost is updated every frame (below),
// so it also stays correct while the camera moves.
let pointer: { x: number; y: number } | null = null;
renderer.domElement.addEventListener('pointermove', (e) => (pointer = { x: e.clientX, y: e.clientY }));
renderer.domElement.addEventListener('pointerleave', () => (pointer = null));

function updateGhost(): void {
  const p = pointer && picker.pick(pointer.x, pointer.y);
  if (!p) return ghost.hide();
  const target = placeTarget(p);
  ghost.show(target, checkPlace(grid, target, tool.block, enemy.cells()) === null);
}

// --- Game loop ---------------------------------------------------------
// update(dt) changes the game state; render draws it. dt = seconds since the
// last frame. Multiplying speeds by dt makes things move at the same speed
// on a 60 Hz and a 144 Hz screen.

function update(dt: number): void {
  markers.base.rotation.y += 1.0 * dt; // 1 radian per second, at any frame rate
  updateGhost();
  message.update(dt);
  pathView.update(dt);

  enemy.update(dt, grid, field); // logic first...
  if (enemy.arrived) enemy = new Enemy(SPAWN);
  enemyView.sync(enemy); // ...then copy the result to the screen

  // Towers aim AFTER the enemy has moved, so they aim at where it is this frame.
  const enemies = [enemy];
  for (const tower of towers) tower.aim(enemies, grid);
  targetLines.sync(towers);
}

let last = performance.now();

function frame(now: number): void {
  // Clamp: if the tab was in the background, don't jump 30 seconds at once.
  const dt = Math.min(Math.max((now - last) / 1000, 0), 0.1);
  last = now;

  update(dt);
  controls.update(); // needed every frame for damping
  clampPan(); // keep the camera target inside the grid
  renderer.render(scene, camera);

  requestAnimationFrame(frame); // ask the browser to call us again next frame
}

requestAnimationFrame(frame);
