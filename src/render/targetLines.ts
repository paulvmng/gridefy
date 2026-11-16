// Draws a line from each tower to the enemy it's aiming at.
//
// LineSegments draws pairs of points: (p0, p1) is one line, (p2, p3) the
// next, and so on. We allocate room for the most lines we could ever need
// once, then each frame fill in the first N and tell Three.js to draw only those
// (setDrawRange), the same idea as InstancedMesh.count in blocks.ts.

import * as THREE from 'three';
import type { Cell } from '../config';
import type { Grid } from '../grid';
import type { Tower } from '../tower';
import { ENEMY_CENTER_Y } from '../enemy';

export class TargetLines {
  readonly mesh: THREE.LineSegments;
  private readonly positions: Float32Array;
  private readonly attr: THREE.BufferAttribute;
  private readonly pos: Cell = { x: 0, y: 0, z: 0 }; // reused every frame

  constructor(grid: Grid) {
    // Worst case: every cell is a tower. 2 points per line x 3 numbers (x, y, z) per point.
    this.positions = new Float32Array(grid.cells.length * 2 * 3);
    this.attr = new THREE.BufferAttribute(this.positions, 3);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', this.attr);
    this.mesh = new THREE.LineSegments(geometry, new THREE.LineBasicMaterial({ color: 0xffffff }));
    this.mesh.frustumCulled = false; // the points move every frame, so skip the bounding check
  }

  sync(towers: Iterable<Tower>): void {
    let n = 0; // numbers written so far
    for (const tower of towers) {
      if (!tower.target) continue;
      const p = tower.target.position(this.pos);
      const a = tower.cell;
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
    this.attr.needsUpdate = true;
  }
}
