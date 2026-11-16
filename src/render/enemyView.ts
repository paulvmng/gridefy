// Draws every enemy as a box. It owns no game state: every frame it just
// copies each enemy's position and health onto one instance.
// Full HP is red; it fades toward dark grey as HP drops.
//
// Same InstancedMesh idea as blocks.ts: one draw call for all enemies,
// with a matrix and a color per instance.

import * as THREE from 'three';
import type { Cell } from '../config';
import { ENEMY_CENTER_Y, ENEMY_SIZE as SIZE, MAX_HP, type Enemy } from '../enemy';

const FULL = new THREE.Color(0xe0393e);
const EMPTY = new THREE.Color(0x333333);

// The most enemies we can draw at once. An InstancedMesh has a fixed capacity.
export const MAX_ENEMIES = 100;

export class EnemyView {
  readonly mesh: THREE.InstancedMesh;
  private readonly pos: Cell = { x: 0, y: 0, z: 0 }; // reused every frame
  private readonly matrix = new THREE.Matrix4();
  private readonly color = new THREE.Color();

  constructor() {
    const geometry = new THREE.BoxGeometry(SIZE, SIZE, SIZE);
    const material = new THREE.MeshStandardMaterial({ color: 0xffffff }); // white x instance color
    this.mesh = new THREE.InstancedMesh(geometry, material, MAX_ENEMIES);
    this.mesh.count = 0;
    // Three.js skips (culls) objects outside the camera view using a bounding
    // sphere, and for an InstancedMesh it computes that sphere ONCE. Blocks
    // recompute it on every edit, but enemies move every frame, so a stale
    // sphere could make them vanish. There are few of them, so we just never cull.
    this.mesh.frustumCulled = false;
  }

  sync(enemies: Enemy[]): void {
    const n = Math.min(enemies.length, MAX_ENEMIES);
    for (let i = 0; i < n; i++) {
      const enemy = enemies[i];
      const p = enemy.position(this.pos);
      // Lower the box so it sits on the floor instead of floating in the middle of the cell.
      this.matrix.makeTranslation(p.x, p.y + ENEMY_CENTER_Y, p.z);
      this.mesh.setMatrixAt(i, this.matrix);
      // lerpColors(a, b, f): f = 0 gives a, f = 1 gives b. Here f is "how healthy".
      this.mesh.setColorAt(i, this.color.lerpColors(EMPTY, FULL, enemy.hp / MAX_HP));
    }
    this.mesh.count = n; // only draw the instances we filled in
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }
}
