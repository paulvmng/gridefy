// All the numbers that define the world, in one place.
// Coordinates: 0-based, Y is up (same as Three.js).
//   x = width, z = length, y = height

export type Cell = { x: number; y: number; z: number };

export const GRID_WIDTH = 13; // x: must be odd
export const GRID_LENGTH = 13; // z: must be odd
export const GRID_HEIGHT = 10; // y: 0 = bedrock, 1..9 = open space

// Odd sizes guarantee a single true center cell.
if (GRID_WIDTH % 2 === 0 || GRID_LENGTH % 2 === 0) {
  throw new Error(`Grid width/length must be odd (got ${GRID_WIDTH} x ${GRID_LENGTH})`);
}

export const CENTER_X = (GRID_WIDTH - 1) / 2; // 13 -> 6
export const CENTER_Z = (GRID_LENGTH - 1) / 2;

// Both stand on top of bedrock, so they're at y = 1.
export const SPAWN: Cell = { x: 0, y: 1, z: 0 };
export const BASE: Cell = { x: CENTER_X, y: 1, z: CENTER_Z };
