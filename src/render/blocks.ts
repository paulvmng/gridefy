// Draws every solid cell of the grid as a box.
//
// InstancedMesh = one geometry + one material, drawn many times in a SINGLE
// draw call, with a different position (matrix) and color per copy.
// 1,690 separate meshes would be 1,690 draw calls; this is 1.
//
// World position = cell coordinate. The box for cell (3, 1, 5) is centered at
// (3, 1, 5) and spans 2.5 to 3.5 on x, and so on.

import * as THREE from 'three';
import { Block, type Grid } from '../grid';

const COLORS: Record<number, [THREE.Color, THREE.Color]> = {
  // Two shades each, for a checkerboard so you can count cells.
  [Block.Bedrock]: [new THREE.Color(0x55595f), new THREE.Color(0x4a4e54)],
  [Block.Placed]: [new THREE.Color(0xc8a86b), new THREE.Color(0xb8985b)],
  [Block.Tower]: [new THREE.Color(0x4a8fe0), new THREE.Color(0x3f80cf)],
};

export class BlockRenderer {
  readonly mesh: THREE.InstancedMesh;
  private readonly matrix = new THREE.Matrix4(); // reused, so we don't allocate every call

  constructor(grid: Grid) {
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshStandardMaterial({ color: 0xffffff }); // white x instance color
    // Capacity = every cell in the grid, the most we could ever need.
    this.mesh = new THREE.InstancedMesh(geometry, material, grid.cells.length);
  }

  // Rebuild all instances from the grid. Call this whenever the grid changes.
  sync(grid: Grid): void {
    let i = 0;
    for (let y = 0; y < grid.height; y++) {
      for (let z = 0; z < grid.length; z++) {
        for (let x = 0; x < grid.width; x++) {
          const block = grid.get(x, y, z);
          if (block === Block.Air) continue;

          this.matrix.makeTranslation(x, y, z);
          this.mesh.setMatrixAt(i, this.matrix);
          this.mesh.setColorAt(i, COLORS[block][(x + y + z) % 2]);
          i++;
        }
      }
    }
    this.mesh.count = i; // only draw the instances we filled in
    this.mesh.instanceMatrix.needsUpdate = true; // tell Three.js to re-upload to the GPU
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
    this.mesh.computeBoundingSphere(); // needed later for clicking (raycasting)
  }
}
