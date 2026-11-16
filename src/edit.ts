// The RULES for editing the world. No Three.js and no mouse code here:
// just "is this allowed?". Each check returns null if allowed, or a reason
// string if not.

import { BASE, SPAWN, type Cell } from './config';
import { Block, type Grid } from './grid';
import { computeFlowField, UNREACHABLE } from './pathfinding';

const sameCell = (a: Cell, b: Cell) => a.x === b.x && a.y === b.y && a.z === b.z;

// "What if?": make the change, check whether the spawn can still reach the
// base, then put the cell back exactly as it was.
function wouldBlockPath(grid: Grid, cell: Cell, block: Block): boolean {
  const before = grid.get(cell.x, cell.y, cell.z);
  grid.set(cell.x, cell.y, cell.z, block);
  const field = computeFlowField(grid);
  grid.set(cell.x, cell.y, cell.z, before);
  return field[grid.index(SPAWN.x, SPAWN.y, SPAWN.z)] === UNREACHABLE;
}

export function checkPlace(grid: Grid, cell: Cell): string | null {
  if (!grid.inBounds(cell.x, cell.y, cell.z)) return 'Outside the build area';
  if (grid.isSolid(cell.x, cell.y, cell.z)) return 'There is already a block there';
  if (sameCell(cell, SPAWN)) return "Can't build on the spawn";
  if (sameCell(cell, BASE)) return "Can't build on the base";
  if (wouldBlockPath(grid, cell, Block.Placed)) return 'That would block the enemy path';
  return null;
}

export function checkDelete(grid: Grid, cell: Cell): string | null {
  const block = grid.get(cell.x, cell.y, cell.z);
  if (block === Block.Air) return 'Nothing to delete';
  if (block === Block.Bedrock) return "Bedrock can't be deleted";
  // Deleting can block the path too, for example by removing a stair step and leaving a 2-high climb.
  if (wouldBlockPath(grid, cell, Block.Air)) return 'That would block the enemy path';
  return null;
}
