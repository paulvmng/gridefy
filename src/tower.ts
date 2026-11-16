// Towers as plain data plus rules (no Three.js), like enemy.ts.
// The grid says WHERE the towers are; a Tower object holds what the grid
// can't: who it's aiming at (and later its cooldown).

import type { Cell } from './config';
import { Block, type Grid } from './grid';
import { ENEMY_CENTER_Y, type Enemy } from './enemy';
import { hasLineOfSight } from './sight';

export const RANGE = 3; // in cells, from the tower's center to the enemy's position

const pos: Cell = { x: 0, y: 0, z: 0 }; // reused scratch object, so aim() allocates nothing

export class Tower {
  readonly cell: Cell;
  target: Enemy | null = null;

  constructor(cell: Cell) {
    this.cell = cell;
  }

  // Aim at the closest enemy that is within RANGE AND visible, or at nothing.
  //
  // Squared distances: comparing d² with RANGE² gives the same answer as
  // comparing d with RANGE, without a square root.
  // bestD2 starts at RANGE², so anything out of range is never picked.
  //
  // Cheap check first: the line-of-sight walk only runs for an enemy that
  // would actually become the new best.
  aim(enemies: Enemy[], grid: Grid): void {
    let best: Enemy | null = null;
    let bestD2 = RANGE * RANGE;

    for (const enemy of enemies) {
      enemy.position(pos);
      pos.y += ENEMY_CENTER_Y; // aim at the middle of its body
      const dx = pos.x - this.cell.x;
      const dy = pos.y - this.cell.y;
      const dz = pos.z - this.cell.z;
      const d2 = dx * dx + dy * dy + dz * dz;
      if (d2 <= bestD2 && hasLineOfSight(grid, this.cell, pos)) {
        best = enemy;
        bestD2 = d2;
      }
    }

    this.target = best;
  }
}

// Build the tower list from the grid. Call it whenever the grid changes.
export function findTowers(grid: Grid): Tower[] {
  const towers: Tower[] = [];
  for (let i = 0; i < grid.cells.length; i++) {
    if (grid.cells[i] === Block.Tower) towers.push(new Tower(grid.coords(i)));
  }
  return towers;
}
