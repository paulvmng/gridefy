// A see-through box showing where the next block would go.
// Green = allowed, red = not allowed.

import * as THREE from 'three';
import type { Cell } from '../config';

const OK = new THREE.Color(0x5ee07a);
const BAD = new THREE.Color(0xff5a5a);

export class Ghost {
  readonly mesh: THREE.Mesh;
  private readonly material: THREE.MeshBasicMaterial;

  constructor() {
    this.material = new THREE.MeshBasicMaterial({
      color: OK,
      transparent: true,
      opacity: 0.35,
      depthWrite: false, // don't hide things behind it
    });
    // Slightly bigger than 1 so it doesn't flicker against neighboring faces.
    this.mesh = new THREE.Mesh(new THREE.BoxGeometry(1.02, 1.02, 1.02), this.material);
    this.mesh.visible = false;
  }

  show(cell: Cell, allowed: boolean): void {
    this.mesh.position.set(cell.x, cell.y, cell.z);
    this.material.color.copy(allowed ? OK : BAD);
    this.mesh.visible = true;
  }

  hide(): void {
    this.mesh.visible = false;
  }
}
