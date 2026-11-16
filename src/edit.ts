// The RULES for editing the world. No Three.js and no mouse code here:
// just "is this allowed?". Each check returns null if allowed, or a reason
// string if not.

import { BASE, SPAWN, type Cell } from './config';
import { Block, type Grid } from './grid';
import { computeFlowField, UNREACHABLE } from './pathfinding';

const sameCell = (a: Cell, b: Cell) => a.x === b.x && a.y === b.y && a.z === b.z;

// "What if?": make the change, check that the spawn AND every cell an enemy is
// touching can still reach the base, then put the cell back exactly as it was.
//
// Checking the enemy cells covers every way to break an enemy:
// building into its cell, deleting the block under it, or walling it into a pocket.
// All three leave that cell UNREACHABLE.
function pathProblem(grid: Grid, cell: Cell, block: Block, enemyCells: Cell[]): string | null {
  const before = grid.get(cell.x, cell.y, cell.z);
  grid.set(cell.x, cell.y, cell.z, block);
  const field = computeFlowField(grid);
  grid.set(cell.x, cell.y, cell.z, before);

  const cutOff = (c: Cell) => field[grid.index(c.x, c.y, c.z)] === UNREACHABLE;
  if (cutOff(SPAWN)) return 'That would block the enemy path';
  if (enemyCells.some(cutOff)) return 'That would trap an enemy';
  return null;
}

// `block` is what's being placed. The "what if?" must test the REAL block:
// a wall can be walked on, but a tower can't, so they change the paths differently.
export function checkPlace(grid: Grid, cell: Cell, block: Block, enemyCells: Cell[] = []): string | null {
  if (!grid.inBounds(cell.x, cell.y, cell.z)) return 'Outside the build area';
  if (grid.isSolid(cell.x, cell.y, cell.z)) return 'There is already a block there';
  if (sameCell(cell, SPAWN)) return "Can't build on the spawn";
  if (sameCell(cell, BASE)) return "Can't build on the base";
  // No tower stacking: nothing goes directly on top of a tower.
  // (Walls on walls and towers on walls are fine.)
  if (grid.get(cell.x, cell.y - 1, cell.z) === Block.Tower) return "Can't build on top of a tower";
  return pathProblem(grid, cell, block, enemyCells);
}

export function checkDelete(grid: Grid, cell: Cell, enemyCells: Cell[] = []): string | null {
  const block = grid.get(cell.x, cell.y, cell.z);
  if (block === Block.Air) return 'Nothing to delete';
  if (block === Block.Bedrock) return "Bedrock can't be deleted";
  // Deleting can block the path too, for example by removing a stair step and leaving a 2-high climb.
  return pathProblem(grid, cell, Block.Air, enemyCells);
}
