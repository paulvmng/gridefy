// Draws a line from each tower to the enemy it's aiming at.
// Right after a shot the line flashes yellow; the rest of the time it's white.
//
// LineSegments draws pairs of points: (p0, p1) is one line, (p2, p3) the
// next, and so on. We allocate room for the most lines we could ever need
// once, then each frame fill in the first N and tell Three.js to draw only those
// (setDrawRange), the same idea as InstancedMesh.count in blocks.ts.
//
// Vertex colors: a second buffer, laid out exactly like positions, but holding
// (r, g, b) per point instead of (x, y, z). With `vertexColors: true` the
// material uses those instead of one color for the whole mesh, so a single
// draw call can mix white lines and yellow ones.

import * as THREE from 'three';
import type { Cell } from '../config';
import type { Grid } from '../grid';
import type { Tower } from '../tower';
import { ENEMY_CENTER_Y } from '../enemy';

const FLASH_TIME = 0.08; // seconds a line stays yellow after a shot
const AIM = new THREE.Color(0xffffff);
const SHOT = new THREE.Color(0xffdd00);

export class TargetLines {
  readonly mesh: THREE.LineSegments;
  private readonly positions: Float32Array;
  private readonly colors: Float32Array;
  private readonly posAttr: THREE.BufferAttribute;
  private readonly colorAttr: THREE.BufferAttribute;
  private readonly pos: Cell = { x: 0, y: 0, z: 0 }; // reused every frame

  constructor(grid: Grid) {
    // Worst case: every cell is a tower. 2 points per line x 3 numbers per point.
    const size = grid.cells.length * 2 * 3;
    this.positions = new Float32Array(size);
    this.colors = new Float32Array(size);
    this.posAttr = new THREE.BufferAttribute(this.positions, 3);
    this.colorAttr = new THREE.BufferAttribute(this.colors, 3);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', this.posAttr);
    geometry.setAttribute('color', this.colorAttr); // the name 'color' is what Three.js looks for
    this.mesh = new THREE.LineSegments(geometry, new THREE.LineBasicMaterial({ vertexColors: true }));
    this.mesh.frustumCulled = false; // the points move every frame, so skip the bounding check
  }

  sync(towers: Iterable<Tower>): void {
    let n = 0; // numbers written so far (the same count for positions and colors)
    for (const tower of towers) {
      if (!tower.target) continue;
      const p = tower.target.position(this.pos);
      const a = tower.cell;
      const c = tower.sinceShot < FLASH_TIME ? SHOT : AIM;
      // both ends of the line get the same color
      for (let k = n; k < n + 6; k += 3) {
        this.colors[k] = c.r;
        this.colors[k + 1] = c.g;
        this.colors[k + 2] = c.b;
      }
      // from the tower's center...
      this.positions[n++] = a.x;
      this.positions[n++] = a.y;
      this.positions[n++] = a.z;
      // ...to the middle of the enemy's box
      this.positions[n++] = p.x;
      this.positions[n++] = p.y + ENEMY_CENTER_Y;
      this.positions[n++] = p.z;
    }
    this.mesh.geometry.setDrawRange(0, n / 3); // counted in points, not numbers
    this.posAttr.needsUpdate = true;
    this.colorAttr.needsUpdate = true;
  }
}
