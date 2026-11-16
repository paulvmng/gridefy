import './style.css';
import { SPAWN, type Cell } from './config';
import { Enemy } from './enemy';
import { Game } from './game';
import { EnemyView, MAX_ENEMIES } from './render/enemyView';
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
import { syncTowers, type Towers } from './tower';
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
// Same idea for the towers: synced with the grid on every change, read every frame.
// Existing towers are reused, so their state survives edits (see syncTowers).
let towers: Towers = new Map();
const targetLines = new TargetLines(grid);
scene.add(targetLines.mesh);

// Call whenever the grid changes: redraw the boxes, recompute the flow field,
// then redraw the path and the heatmap from it.
function refreshWorld(): void {
  blocks.sync(grid);
  towers = syncTowers(grid, towers);
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

// Every enemy on the field. The waves decide when a new one spawns (waves.ts);
// enemies that reach the base or die are removed (see update()).
let enemies: Enemy[] = [];
const enemyView = new EnemyView();
scene.add(enemyView.mesh);

// Every cell any enemy is touching. Edits must keep ALL of them connected to the base.
const enemyCells = () => enemies.flatMap((e) => e.cells());

// The match: lives, money and waves. The HUD just shows what's in it.
const game = new Game();
const livesInfo = document.getElementById('lives')!;
const moneyInfo = document.getElementById('money')!;
const waveInfo = document.getElementById('wave')!;
function showHud(): void {
  livesInfo.textContent = String(game.lives);
  moneyInfo.textContent = String(game.money);
  const w = game.waves;
  const n = Math.min(w.index + 1, w.total); // shown 1-based; stays at the last one when done
  const next = w.state === 'break' ? ` · next in ${Math.ceil(w.breakLeft)}s` : '';
  waveInfo.textContent = `${n}/${w.total}${next}`;
}
showHud();

// --- Editing -----------------------------------------------------------

// A new block goes against the face you clicked:
// the hit block's cell + the face direction.
function placeTarget(p: Pick): Cell {
  return { x: p.cell.x + p.normal.x, y: p.cell.y + p.normal.y, z: p.cell.z + p.normal.z };
}

// Can the current tool be built at `target`? Two kinds of rules:
// the match (money, in game.ts) and the world (edit.ts).
// Money first: it's one comparison, while checkPlace runs a pathfinding pass.
function placeProblem(target: Cell): string | null {
  if (!game.canAfford(tool.block)) return 'Not enough money';
  return checkPlace(grid, target, tool.block, enemyCells());
}

onClick(renderer.domElement, (button, x, y) => {
  if (game.over) return; // no building after the game has ended
  const p = picker.pick(x, y);
  if (!p) return;

  if (button === 0) {
    // Left-click: place.
    const target = placeTarget(p);
    const error = placeProblem(target);
    if (error) return message.show(error);
    grid.set(target.x, target.y, target.z, tool.block);
    game.buy(tool.block);
  } else if (button === 2) {
    // Right-click: delete.
    const error = checkDelete(grid, p.cell, enemyCells());
    if (error) return message.show(error);
    game.refund(grid.get(p.cell.x, p.cell.y, p.cell.z)); // read the block BEFORE it's gone
    grid.set(p.cell.x, p.cell.y, p.cell.z, Block.Air);
  } else {
    return;
  }

  refreshWorld(); // the data changed, so redraw everything that depends on it
  showHud();
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
  ghost.show(target, placeProblem(target) === null);
}

// --- Game loop ---------------------------------------------------------
// update(dt) changes the game state; render draws it. dt = seconds since the
// last frame. Multiplying speeds by dt makes things move at the same speed
// on a 60 Hz and a 144 Hz screen.

function update(dt: number): void {
  markers.base.rotation.y += 1.0 * dt; // 1 radian per second, at any frame rate
  message.update(dt);
  pathView.update(dt);

  // Game over: skip all the game logic below. The scene is still drawn every
  // frame (see frame()), so the board stays on screen, frozen.
  if (game.over) return ghost.hide();
  updateGhost();

  // Spawn when the waves say so. `enemies.length` is how many are alive: the
  // waves wait for 0 before starting the next break (or declaring the win).
  // MAX_ENEMIES is only a safety cap for the renderer; waves stay well below it.
  if (game.waves.update(dt, enemies.length) && enemies.length < MAX_ENEMIES) {
    enemies.push(new Enemy(SPAWN));
  }

  // Logic first: the enemies move...
  for (const enemy of enemies) enemy.update(dt, grid, field);

  // ...then the towers aim at where they are NOW, count down, and fire (damage).
  for (const tower of towers.values()) {
    tower.aim(enemies, grid);
    tower.update(dt);
  }

  // Draw the lines before removing anyone, so the killing shot still flashes
  // at the spot where the enemy died.
  targetLines.sync(towers.values());

  // Remove the ones that reached the base or were killed. Done AFTER the loops
  // above, in one pass: removing items from an array while looping over it
  // shifts the indexes and skips the next item.
  // Settle up before they're removed: reaching the base costs a life, a kill pays.
  for (const enemy of enemies) {
    if (enemy.arrived) game.loseLife();
    if (enemy.dead) game.enemyKilled();
  }
  showHud();
  if (game.lost) message.show('Game over! Reload the page to play again.', Infinity);
  else if (game.won) message.show('You win! Every wave cleared. Reload to play again.', Infinity);

  enemies = enemies.filter((e) => !e.arrived && !e.dead);
  enemyView.sync(enemies); // then copy the result to the screen
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
