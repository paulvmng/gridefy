// Line of sight: can you draw a straight line from A to B without passing
// through a solid cell? No Three.js here; it only reads the grid.
//
// Voxel traversal (Amanatides & Woo, a 3D "DDA"): walk along the line one
// cell at a time, visiting EXACTLY the cells it passes through, in order.
//
// Cell (x, y, z) spans x-0.5..x+0.5 (and the same for y and z), so the cell a
// point is in = Math.round(point).
//
// t measures progress along the line: 0 = at A, 1 = at B.
//   tMax[axis]   = the t where the line crosses the NEXT cell border on that axis
//   tDelta[axis] = how much t it takes to cross one whole cell on that axis
// Each step moves into the next cell on the axis whose border comes first
// (the smallest tMax), then pushes that tMax one cell further.

import type { Cell } from './config';
import type { Grid } from './grid';

export function hasLineOfSight(grid: Grid, a: Cell, b: Cell): boolean {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dz = b.z - a.z;

  // The cell we start in, and the cell we want to reach.
  let x = Math.round(a.x);
  let y = Math.round(a.y);
  let z = Math.round(a.z);
  const endX = Math.round(b.x);
  const endY = Math.round(b.y);
  const endZ = Math.round(b.z);

  // Which way to step on each axis: +1, -1 or 0.
  const stepX = Math.sign(dx);
  const stepY = Math.sign(dy);
  const stepZ = Math.sign(dz);

  // Moving 1 cell on an axis covers 1/|d| of the line. Not moving = never (Infinity).
  const tDeltaX = stepX !== 0 ? 1 / Math.abs(dx) : Infinity;
  const tDeltaY = stepY !== 0 ? 1 / Math.abs(dy) : Infinity;
  const tDeltaZ = stepZ !== 0 ? 1 / Math.abs(dz) : Infinity;

  // The first border on each axis is half a cell from the cell's center
  // (x + 0.5 going +, x - 0.5 going -). Divide by d to turn that distance into t.
  let tMaxX = stepX !== 0 ? (x + 0.5 * stepX - a.x) / dx : Infinity;
  let tMaxY = stepY !== 0 ? (y + 0.5 * stepY - a.y) / dy : Infinity;
  let tMaxZ = stepZ !== 0 ? (z + 0.5 * stepZ - a.z) / dz : Infinity;

  // The start cell (the tower itself) is never checked.
  while (x !== endX || y !== endY || z !== endZ) {
    // Step on the axis whose border comes first.
    if (tMaxX <= tMaxY && tMaxX <= tMaxZ) {
      if (tMaxX > 1) break; // past B: nothing was in the way
      x += stepX;
      tMaxX += tDeltaX;
    } else if (tMaxY <= tMaxZ) {
      if (tMaxY > 1) break;
      y += stepY;
      tMaxY += tDeltaY;
    } else {
      if (tMaxZ > 1) break;
      z += stepZ;
      tMaxZ += tDeltaZ;
    }

    if (x === endX && y === endY && z === endZ) break; // reached the target's cell
    if (grid.isSolid(x, y, z)) return false; // blocked
  }
  return true;
}
