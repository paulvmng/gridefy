// The RULES for editing the world. No Three.js and no mouse code here:
// just "is this allowed?". Each check returns null if allowed, or a reason
// string if not. Step 3 will add "would this block the enemies' path?".

import { BASE, SPAWN, type Cell } from './config';
import { Block, type Grid } from './grid';

const sameCell = (a: Cell, b: Cell) => a.x === b.x && a.y === b.y && a.z === b.z;

export function checkPlace(grid: Grid, cell: Cell): string | null {
  if (!grid.inBounds(cell.x, cell.y, cell.z)) return 'Outside the build area';
  if (grid.isSolid(cell.x, cell.y, cell.z)) return 'There is already a block there';
  if (sameCell(cell, SPAWN)) return "Can't build on the spawn";
  if (sameCell(cell, BASE)) return "Can't build on the base";
  return null;
}

export function checkDelete(grid: Grid, cell: Cell): string | null {
  const block = grid.get(cell.x, cell.y, cell.z);
  if (block === Block.Air) return 'Nothing to delete';
  if (block === Block.Bedrock) return "Bedrock can't be deleted";
  return null;
}
