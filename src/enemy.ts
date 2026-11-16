// One enemy, as plain data plus rules. No Three.js here (same idea as grid.ts):
// the renderer only READS an enemy to know where to draw it.
//
// An enemy is always "between two cells": it left `from`, it's heading to `to`,
// and `t` (0..1) says how far along it is. That's the same lerp as the arrows,
// but the enemy picks each next cell itself, by reading the flow field.

import type { Cell } from './config';
import type { Grid } from './grid';
import { nextCell } from './pathfinding';

const SPEED = 1.5; // steps per second

export class Enemy {
  from: Cell;
  to: Cell;
  t: number;
  arrived = false; // true once it has reached the base

  constructor(start: Cell) {
    // Start "already arrived" at the start cell (from = to, t = 1),
    // so the very first update() picks the first real step.
    this.from = start;
    this.to = start;
    this.t = 1;
  }

  // Called every frame. `field` is the CURRENT flow field, so if the player
  // changes the grid, the enemy follows the new route from its next cell on.
  update(dt: number, grid: Grid, field: Int32Array): void {
    if (this.arrived) return;

    // 1. Move forward along the current step.
    this.t += SPEED * dt;
    if (this.t < 1) return; // still between two cells

    // 2. We've reached `to`: it becomes the cell we're leaving next.
    this.from = this.to;

    // 3. Ask the flow field where to go from here.
    const { x, y, z } = this.from;
    const next = nextCell(grid, field, grid.index(x, y, z));
    if (next === -1) {
      // At the base. (Known gap: -1 can also mean "this cell became
      // unreachable". See ideas.md; we'll handle that later.)
      this.arrived = true;
      this.t = 0;
      return;
    }
    this.to = grid.coords(next);

    // 4. Keep the leftover. If this frame took t from 0.95 to 1.05, the extra
    //    0.05 counts toward the next step. With t = 0 it would be lost, and
    //    the enemy would walk slower on screens with bigger frames.
    this.t -= 1;
  }

  // Where to draw the enemy right now: the lerp from `from` to `to` at `t`.
  // Writes into `out` instead of returning a new object, so nothing is
  // created per frame.
  position(out: Cell): Cell {
    const { from, to, t } = this;
    out.x = from.x + (to.x - from.x) * t;
    out.y = from.y + (to.y - from.y) * t;
    out.z = from.z + (to.z - from.z) * t;
    return out;
  }
}
