// Draws the current enemy path as yellow arrowheads, one per step, each
// pointing at the NEXT cell on the path. Steps up and down tilt the arrow.
//
// Rotating an arrow so it points in a direction:
// - The arrow model points along +Z (FORWARD).
// - A quaternion is Three.js's way of storing a rotation.
//   setFromUnitVectors(FORWARD, dir) gives "the rotation that turns FORWARD into dir".
// - compose(position, rotation, scale) packs all three into one instance matrix.

import * as THREE from 'three';
import type { Cell } from '../config';
import type { Grid } from '../grid';

const FORWARD = new THREE.Vector3(0, 0, 1);
const NO_SCALE = new THREE.Vector3(1, 1, 1);
const SPEED = 1.5; // steps per second

export class PathView {
  readonly mesh: THREE.InstancedMesh;
  private cells: Cell[] = [];
  // 0..1: how far every arrow is along its own step.
  private phase = 0;
  // Reused every sync, so nothing new is created per arrow.
  private readonly matrix = new THREE.Matrix4();
  private readonly position = new THREE.Vector3();
  private readonly direction = new THREE.Vector3();
  private readonly rotation = new THREE.Quaternion();

  constructor(grid: Grid) {
    // A cone with 4 sides is a pyramid, which makes a boxy arrowhead.
    // Cones point up (+Y) by default; tip it over so it points along +Z.
    const geometry = new THREE.ConeGeometry(0.22, 0.5, 4);
    geometry.rotateX(Math.PI / 2);

    this.mesh = new THREE.InstancedMesh(
      geometry,
      new THREE.MeshStandardMaterial({ color: 0xffd23f, emissive: 0xffd23f, emissiveIntensity: 0.5 }),
      grid.cells.length, // a path can't be longer than the number of cells
    );
    this.mesh.count = 0;
  }

  // Called when the path changes. Remember it; update() redraws it every frame.
  sync(path: Cell[] | null): void {
    this.cells = path ?? [];
    this.draw();
  }

  // Called every frame. Advance the phase and wrap it back into 0..1,
  // so the arrows loop forever.
  update(dt: number): void {
    this.phase = (this.phase + SPEED * dt) % 1;
    this.draw();
  }

  private draw(): void {
    const cells = this.cells;
    const t = this.phase;
    let i = 0;

    // One arrow per step: from cells[k] toward cells[k + 1].
    // The last cell is the base, which has nowhere to point, so it gets no arrow.
    for (let k = 0; k < cells.length - 1; k++) {
      const from = cells[k];
      const to = cells[k + 1];

      // Direction to the next cell. Includes y, so steps up and down tilt the arrow 45°.
      this.direction.set(to.x - from.x, to.y - from.y, to.z - from.z).normalize();
      this.rotation.setFromUnitVectors(FORWARD, this.direction);

      // Lerp: part of the way from `from` to `to` (t = 0 → from, t = 1 → to).
      // The - 0.3 keeps it just above the floor of the cell (the floor is at y - 0.5).
      this.position.set(
        from.x + (to.x - from.x) * t,
        from.y + (to.y - from.y) * t - 0.3,
        from.z + (to.z - from.z) * t,
      );

      this.matrix.compose(this.position, this.rotation, NO_SCALE);
      this.mesh.setMatrixAt(i++, this.matrix);
    }

    this.mesh.count = i;
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}
