// Raycasting: "what is under the mouse?"
//
// 1. Convert the mouse position to "normalized device coordinates" (NDC):
//    x and y from -1 to +1, where (0, 0) is the center of the screen.
// 2. Shoot a ray from the camera through that point into the 3D scene.
// 3. Three.js returns everything the ray hits, nearest first. For an
//    InstancedMesh, each hit tells us WHICH instance (instanceId) and WHICH
//    face (face.normal, a direction like (0, 1, 0) for the top face).

import * as THREE from 'three';
import type { Cell } from '../config';

export type Pick = {
  cell: Cell; // the block that was hit
  normal: Cell; // the face that was hit, as a direction, e.g. {x:0, y:1, z:0} = top
};

export class Picker {
  private readonly raycaster = new THREE.Raycaster();
  private readonly ndc = new THREE.Vector2();
  private readonly matrix = new THREE.Matrix4();
  private readonly position = new THREE.Vector3();

  private readonly camera: THREE.Camera;
  private readonly canvas: HTMLCanvasElement;
  private readonly mesh: THREE.InstancedMesh;

  constructor(camera: THREE.Camera, canvas: HTMLCanvasElement, mesh: THREE.InstancedMesh) {
    this.camera = camera;
    this.canvas = canvas;
    this.mesh = mesh;
  }

  pick(clientX: number, clientY: number): Pick | null {
    // Step 1: pixels -> NDC. (Screen y goes down, NDC y goes up, hence the minus.)
    const rect = this.canvas.getBoundingClientRect();
    this.ndc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.ndc.y = -((clientY - rect.top) / rect.height) * 2 + 1;

    // Steps 2 and 3: cast the ray and take the nearest hit.
    this.raycaster.setFromCamera(this.ndc, this.camera);
    const hit = this.raycaster.intersectObject(this.mesh, false)[0];
    if (!hit || hit.instanceId === undefined || !hit.face) return null;

    // Which cell is that instance? Read its position back out of its matrix.
    this.mesh.getMatrixAt(hit.instanceId, this.matrix);
    this.position.setFromMatrixPosition(this.matrix);

    const n = hit.face.normal;
    return {
      cell: { x: Math.round(this.position.x), y: Math.round(this.position.y), z: Math.round(this.position.z) },
      normal: { x: Math.round(n.x), y: Math.round(n.y), z: Math.round(n.z) },
    };
  }
}
