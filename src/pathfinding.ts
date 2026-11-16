// Pathfinding: where can enemies stand, how do they move, and how far is
// every cell from the base? No Three.js here, only the grid.

import { BASE, SPAWN, type Cell } from './config';
import { Block, type Grid } from './grid';

export const UNREACHABLE = -1;

// The 4 horizontal directions as [dx, dz]: east, west, south, north. No diagonals.
const DIRECTIONS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
] as const;

// An enemy can stand in a cell if the cell is empty and the cell below it is
// solid ground. Towers are solid but NOT ground: enemies can't walk on top of
// them, so a tower always blocks (no climbing over a row of towers).
export function canStand(grid: Grid, x: number, y: number, z: number): boolean {
  if (!grid.inBounds(x, y, z) || grid.isSolid(x, y, z)) return false;
  const below = grid.get(x, y - 1, z);
  return below !== Block.Air && below !== Block.Tower;
}

// Calls visit() for every cell an enemy standing at (x, y, z) can move to in one step.
//
//   LEVEL            STEP UP                     STEP DOWN
//                    headroom above me needed    the cell in front of me must be empty
//   E → .            .                           E → .
//   █   █            E → .                       █   .
//                    █   █                       █   █
//
// These moves are SYMMETRIC: if A → B is allowed, so is B → A, because both
// need the same cell to be empty. That's what lets us search backwards from
// the base and use the result for enemies walking forwards.
// (The COSTS are not symmetric, though: see moveCost().)
export function forEachMove(
  grid: Grid,
  x: number,
  y: number,
  z: number,
  visit: (nx: number, ny: number, nz: number) => void,
): void {
  for (const [dx, dz] of DIRECTIONS) {
    const nx = x + dx;
    const nz = z + dz;

    if (canStand(grid, nx, y, nz)) {
      visit(nx, y, nz); // level
    } else if (canStand(grid, nx, y + 1, nz) && !grid.isSolid(x, y + 1, z)) {
      visit(nx, y + 1, nz); // step up 1
    } else if (canStand(grid, nx, y - 1, nz) && !grid.isSolid(nx, y, nz)) {
      visit(nx, y - 1, nz); // step down 1
    }
    // Anything else (a 2+ high wall or a 2+ deep drop) is not a move.
  }
}

// What one move costs an ENEMY walking from height fromY to height toY.
// Climbing is harder, so it costs more. All costs must be at least 1.
export const COST_LEVEL = 1;
export const COST_UP = 2;
export const COST_DOWN = 1;

export function moveCost(fromY: number, toY: number): number {
  if (toY > fromY) return COST_UP;
  if (toY < fromY) return COST_DOWN;
  return COST_LEVEL;
}

// FLOW FIELD: for every cell, the cheapest total cost to reach the base.
// The base is 0. UNREACHABLE (-1) means no path.
//
// Computed with DIJKSTRA: always expand the cheapest cell we know about.
// The costs are small whole numbers, so instead of a priority queue we use
// BUCKETS: buckets[d] lists the cells found at cost d, and we work through
// bucket 0, then 1, then 2... It's BFS with one queue per cost.
export function computeFlowField(grid: Grid): Int32Array {
  const dist = new Int32Array(grid.cells.length).fill(UNREACHABLE);
  if (!canStand(grid, BASE.x, BASE.y, BASE.z)) return dist; // should never happen

  const buckets: number[][] = [];
  const add = (cell: number, d: number) => {
    dist[cell] = d;
    (buckets[d] ??= []).push(cell);
  };

  add(grid.index(BASE.x, BASE.y, BASE.z), 0);

  // buckets.length grows as we find more expensive cells, so this keeps going
  // until no new buckets appear.
  for (let d = 0; d < buckets.length; d++) {
    for (const current of buckets[d] ?? []) {
      // A cell can sit in two buckets if a cheaper route turned up after it was
      // first added. Only the copy matching its final cost counts; skip the old one.
      if (dist[current] !== d) continue;

      const { x, y, z } = grid.coords(current);
      forEachMove(grid, x, y, z, (nx, ny, nz) => {
        const n = grid.index(nx, ny, nz);
        // BACKWARDS: the search goes current → n, but the enemy walks n → current.
        const cost = d + moveCost(ny, y);
        if (dist[n] === UNREACHABLE || cost < dist[n]) add(n, cost);
      });
    }
  }

  return dist;
}

// THE DOWNHILL RULE: from cell `current` (a flat index), the neighbor where
// (cost of the move + that neighbor's cost to the base) is smallest.
// Just picking the smallest neighbor isn't enough anymore: a low number behind
// an expensive climb can be worse than a slightly higher number on the level.
// Returns -1 at the base (cost 0) or on a cell that can't reach the base.
// findPath() and enemies both use this, so they always agree on the route.
export function nextCell(grid: Grid, field: Int32Array, current: number): number {
  const here = field[current];
  if (here <= 0) return -1; // at the base, or UNREACHABLE

  let best = -1;
  let bestTotal = Infinity;
  const { x, y, z } = grid.coords(current);

  forEachMove(grid, x, y, z, (nx, ny, nz) => {
    const n = grid.index(nx, ny, nz);
    // Only real progress counts (field[n] < here), so we can never walk in circles.
    if (field[n] === UNREACHABLE || field[n] >= here) return;
    const total = moveCost(y, ny) + field[n]; // forwards: the enemy walks current → n
    if (total < bestTotal) {
      best = n;
      bestTotal = total;
    }
  });

  return best;
}

// Follow the field downhill from the spawn until we reach 0 (the base).
// Returns null if the spawn can't reach the base.
export function findPath(grid: Grid, field: Int32Array): Cell[] | null {
  let current = grid.index(SPAWN.x, SPAWN.y, SPAWN.z);
  if (field[current] === UNREACHABLE) return null;

  const path: Cell[] = [grid.coords(current)];

  while (field[current] > 0) {
    const next = nextCell(grid, field, current);
    if (next === -1) break; // can't happen with a valid field, but never loop forever
    current = next;
    path.push(grid.coords(current));
  }

  return path;
}
