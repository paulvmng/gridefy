// Draws one enemy as a red box. It owns no game state: every frame it just
// copies the enemy's position onto the mesh.

import * as THREE from 'three';
import type { Cell } from '../config';
import type { Enemy } from '../enemy';

const SIZE = 0.6;

// The cell's floor is at y - 0.5, and the box sits on it, so the box's
// middle is this far from the cell's center (used to aim at it).
export const ENEMY_CENTER_Y = -0.5 + SIZE / 2;

export class EnemyView {
  readonly mesh: THREE.Mesh;
  private readonly pos: Cell = { x: 0, y: 0, z: 0 }; // reused every frame

  constructor() {
    this.mesh = new THREE.Mesh(
      new THREE.BoxGeometry(SIZE, SIZE, SIZE),
      new THREE.MeshStandardMaterial({ color: 0xe0393e }),
    );
  }

  sync(enemy: Enemy): void {
    const p = enemy.position(this.pos);
    // Lower the box so it sits on the floor instead of floating in the middle of the cell.
    this.mesh.position.set(p.x, p.y + ENEMY_CENTER_Y, p.z);
  }
}
