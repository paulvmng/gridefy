// The world as data. No Three.js here: this file only knows which cells are
// solid. Keeping it separate from rendering means we can test it, run
// pathfinding on it, or (later) validate it on a server.

import { GRID_HEIGHT, GRID_LENGTH, GRID_WIDTH, type Cell } from './config';

// What can be in a cell. A plain object instead of a TS `enum` works better with Vite.
export const Block = {
  Air: 0,
  Bedrock: 1,
  Placed: 2, // a plain wall
  Tower: 3, // solid like a wall (enemies path around it), and later it shoots
} as const;
export type Block = (typeof Block)[keyof typeof Block];

export class Grid {
  readonly width: number;
  readonly height: number;
  readonly length: number;
  // One byte per cell, stored as a flat list instead of grid[x][y][z].
  readonly cells: Uint8Array;

  constructor(width: number, height: number, length: number) {
    this.width = width;
    this.height = height;
    this.length = length;
    this.cells = new Uint8Array(width * height * length); // starts as all 0 = Air
  }

  // Turn (x, y, z) into a position in the flat array.
  // Layout: one horizontal layer (width x length) after another, going up.
  index(x: number, y: number, z: number): number {
    return x + z * this.width + y * this.width * this.length;
  }

  // The reverse of index(): flat position -> (x, y, z).
  coords(i: number): Cell {
    const layer = this.width * this.length; // cells per horizontal layer
    return {
      x: i % this.width,
      y: Math.floor(i / layer),
      z: Math.floor((i % layer) / this.width),
    };
  }

  inBounds(x: number, y: number, z: number): boolean {
    return (
      x >= 0 && x < this.width &&
      y >= 0 && y < this.height &&
      z >= 0 && z < this.length
    );
  }

  // Outside the grid counts as Air.
  get(x: number, y: number, z: number): Block {
    if (!this.inBounds(x, y, z)) return Block.Air;
    return this.cells[this.index(x, y, z)] as Block;
  }

  set(x: number, y: number, z: number, block: Block): void {
    if (!this.inBounds(x, y, z)) return;
    this.cells[this.index(x, y, z)] = block;
  }

  isSolid(x: number, y: number, z: number): boolean {
    return this.get(x, y, z) !== Block.Air;
  }
}

export function createWorld(): Grid {
  const grid = new Grid(GRID_WIDTH, GRID_HEIGHT, GRID_LENGTH);
  resetWorld(grid);
  return grid;
}

// Back to the starting world, IN PLACE: the renderers keep a reference to
// this grid, so we change its cells instead of making a new Grid.
export function resetWorld(grid: Grid): void {
  grid.cells.fill(Block.Air);
  // Fill the bottom layer with bedrock.
  for (let x = 0; x < grid.width; x++) {
    for (let z = 0; z < grid.length; z++) {
      grid.set(x, 0, z, Block.Bedrock);
    }
  }
}
