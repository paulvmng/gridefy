// Draws one enemy as a box. It owns no game state: every frame it just
// copies the enemy's position and health onto the mesh.
// Full HP is red; it fades toward dark grey as HP drops.

import * as THREE from 'three';
import type { Cell } from '../config';
import { ENEMY_CENTER_Y, ENEMY_SIZE as SIZE, MAX_HP, type Enemy } from '../enemy';

const FULL = new THREE.Color(0xe0393e);
const EMPTY = new THREE.Color(0x333333);

export class EnemyView {
  readonly mesh: THREE.Mesh;
  private readonly material = new THREE.MeshStandardMaterial({ color: FULL });
  private readonly pos: Cell = { x: 0, y: 0, z: 0 }; // reused every frame

  constructor() {
    this.mesh = new THREE.Mesh(new THREE.BoxGeometry(SIZE, SIZE, SIZE), this.material);
  }

  sync(enemy: Enemy): void {
    const p = enemy.position(this.pos);
    // Lower the box so it sits on the floor instead of floating in the middle of the cell.
    this.mesh.position.set(p.x, p.y + ENEMY_CENTER_Y, p.z);
    // lerpColors(a, b, f): f = 0 gives a, f = 1 gives b. Here f is "how healthy".
    this.material.color.lerpColors(EMPTY, FULL, enemy.hp / MAX_HP);
  }
}
