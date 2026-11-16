// Pathfinding: where can enemies stand, how do they move, and how far is
// every cell from the base? No Three.js here, only the grid.

import { BASE, SPAWN, type Cell } from './config';
import type { Grid } from './grid';

export const UNREACHABLE = -1;

// The 4 horizontal directions as [dx, dz]: east, west, south, north. No diagonals.
const DIRECTIONS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
] as const;

// An enemy can stand in a cell if the cell is empty and the cell below it is solid.
export function canStand(grid: Grid, x: number, y: number, z: number): boolean {
  return grid.inBounds(x, y, z) && !grid.isSolid(x, y, z) && grid.isSolid(x, y - 1, z);
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

// FLOW FIELD: for every cell, the number of steps to reach the base.
// The base is 0, its neighbors are 1, their neighbors are 2, and so on.
// UNREACHABLE (-1) means no path. Computed with BFS (breadth-first search).
export function computeFlowField(grid: Grid): Int32Array {
  const dist = new Int32Array(grid.cells.length).fill(UNREACHABLE);

  // BFS queue of flat cell indices. Each cell enters it at most once, so its size
  // can be the number of cells. `head` is the next one to read, `tail` the next free slot.
  const queue = new Int32Array(grid.cells.length);
  let head = 0;
  let tail = 0;

  if (!canStand(grid, BASE.x, BASE.y, BASE.z)) return dist; // should never happen

  // Start the wave at the base.
  const start = grid.index(BASE.x, BASE.y, BASE.z);
  dist[start] = 0;
  queue[tail++] = start;

  while (head < tail) {
    // Take the oldest cell from the queue. BFS goes in order of distance:
    // every distance-3 cell is processed before any distance-4 cell.
    const current = queue[head++];
    const { x, y, z } = grid.coords(current);
    const nextDist = dist[current] + 1;

    forEachMove(grid, x, y, z, (nx, ny, nz) => {
      const n = grid.index(nx, ny, nz);
      if (dist[n] !== UNREACHABLE) return; // already reached, by a path at least as short
      dist[n] = nextDist;
      queue[tail++] = n;
    });
  }

  return dist;
}

// THE DOWNHILL RULE: from cell `current` (a flat index), the neighbor with the
// smallest distance to the base. Returns -1 if there is none: we're at the base
// (distance 0), or this cell can't reach the base at all.
// findPath() and enemies both use this, so they always agree on the route.
export function nextCell(grid: Grid, field: Int32Array, current: number): number {
  let best = -1;
  let bestDist = field[current];
  const { x, y, z } = grid.coords(current);

  forEachMove(grid, x, y, z, (nx, ny, nz) => {
    const n = grid.index(nx, ny, nz);
    if (field[n] !== UNREACHABLE && field[n] < bestDist) {
      best = n;
      bestDist = field[n];
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
