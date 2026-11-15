// Visual helpers: spawn/base markers and an outline of the buildable space.

import * as THREE from 'three';
import { BASE, SPAWN, type Cell } from '../config';
import type { Grid } from '../grid';

function markerBox(cell: Cell, color: number, size: number): THREE.Mesh {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(size, size, size),
    new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.4 }),
  );
  mesh.position.set(cell.x, cell.y, cell.z);
  return mesh;
}

export function createMarkers() {
  return {
    spawn: markerBox(SPAWN, 0xff5a5a, 0.5),
    base: markerBox(BASE, 0x4da3ff, 0.7),
  };
}

// A wireframe box around the open space above bedrock (y = 1 .. height-1).
export function createBoundsOutline(grid: Grid): THREE.LineSegments {
  const w = grid.width;
  const l = grid.length;
  const h = grid.height - 1;
  const lines = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(w, h, l)),
    new THREE.LineBasicMaterial({ color: 0x8899aa, transparent: true, opacity: 0.35 }),
  );
  // Cells are centered on integers, so the grid spans -0.5 .. size-0.5.
  lines.position.set((w - 1) / 2, 0.5 + h / 2, (l - 1) / 2);
  return lines;
}
