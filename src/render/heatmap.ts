// Shows the flow field: a thin colored tile on every cell an enemy can reach.
// Blue = close to the base, red = far away. Toggled with F.

import * as THREE from 'three';
import type { Grid } from '../grid';
import { UNREACHABLE } from '../pathfinding';

export class Heatmap {
  readonly mesh: THREE.InstancedMesh;
  private readonly matrix = new THREE.Matrix4();
  private readonly color = new THREE.Color();

  constructor(grid: Grid) {
    this.mesh = new THREE.InstancedMesh(
      new THREE.BoxGeometry(0.9, 0.04, 0.9), // a flat tile
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.75 }),
      grid.cells.length,
    );
    this.mesh.count = 0;
    this.mesh.visible = false; // hidden until F is pressed
  }

  toggle(): void {
    this.mesh.visible = !this.mesh.visible;
  }

  sync(grid: Grid, field: Int32Array): void {
    // Find the largest distance, so the colors stretch from 0 to the max.
    let maxDist = 1;
    for (const d of field) if (d > maxDist) maxDist = d;

    let i = 0;
    field.forEach((d, index) => {
      if (d === UNREACHABLE) return;
      const c = grid.coords(index);
      this.matrix.makeTranslation(c.x, c.y - 0.47, c.z); // lying on the floor of the cell
      this.mesh.setMatrixAt(i, this.matrix);
      // Hue 0.66 = blue (near), 0 = red (far).
      this.color.setHSL(0.66 * (1 - d / maxDist), 0.85, 0.55);
      this.mesh.setColorAt(i, this.color);
      i++;
    });

    this.mesh.count = i;
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }
}
