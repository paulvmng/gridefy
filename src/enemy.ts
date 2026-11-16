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

// Hop height on steps up and down. Its minimum depends on the box size in
// enemyView.ts (0.6, so half = 0.3): going up, the box's front face reaches
// the block's edge when t² = 0.5 - 0.3, so t ≈ 0.447, and by then its bottom
// must be a full block up. That gives HOP ≥ 1 / (4 * 0.447) ≈ 0.56.
// A bigger box needs a bigger hop.
const HOP = 0.6;

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
      // At the base. edit.ts never lets the player cut off an enemy's cells,
      // so -1 can't mean "trapped" any more.
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

  // The cells this enemy is touching right now. Edits must keep both of
  // them connected to the base (see edit.ts).
  cells(): Cell[] {
    return [this.from, this.to];
  }

  // Where to draw the enemy right now, between `from` and `to` at `t`.
  // Writes into `out` instead of returning a new object, so nothing is
  // created per frame.
  //
  // On level ground it's a straight lerp. On a step up or down, a straight
  // lerp would cut through the corner of a block, so horizontal and vertical
  // motion each get their own curve (same t, different shape):
  //   - vertical: the lerp plus an arc, HOP * 4t(1-t) (0 at both ends, so it
  //     always lands exactly on `to`)
  //   - horizontal: up = t² (rise first, then go forward);
  //     down = 1-(1-t)² (go forward first, then drop). Down is up played backwards.
  position(out: Cell): Cell {
    const { from, to, t } = this;
    const dy = to.y - from.y;

    let h = t; // horizontal progress
    let arc = 0; // extra height on top of the lerp
    if (dy > 0) h = t * t;
    if (dy < 0) h = 1 - (1 - t) * (1 - t);
    if (dy !== 0) arc = HOP * 4 * t * (1 - t);

    out.x = from.x + (to.x - from.x) * h;
    out.y = from.y + dy * t + arc;
    out.z = from.z + (to.z - from.z) * h;
    return out;
  }
}
