// Draws one enemy as a red box. It owns no game state: every frame it just
// copies the enemy's position onto the mesh.

import * as THREE from 'three';
import type { Cell } from '../config';
import { ENEMY_CENTER_Y, ENEMY_SIZE as SIZE, type Enemy } from '../enemy';

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
