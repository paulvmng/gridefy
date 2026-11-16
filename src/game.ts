// The state of the match as a whole: things that don't belong to any one
// enemy or tower. Plain data plus rules (no DOM, no Three.js), like enemy.ts.
// The HUD only READS this. Waves will live here too, later.

import { Block } from './grid';

export const START_LIVES = 10;
export const START_MONEY = 20;
export const KILL_REWARD = 1;

// What each buildable block costs. Deleting one refunds the full cost.
export const COST: Partial<Record<Block, number>> = {
  [Block.Placed]: 1,
  [Block.Tower]: 5,
};
const costOf = (block: Block) => COST[block] ?? 0;

export class Game {
  lives = START_LIVES;
  money = START_MONEY;

  get over(): boolean {
    return this.lives <= 0;
  }

  // An enemy reached the base. Lives never go below 0.
  loseLife(): void {
    this.lives = Math.max(this.lives - 1, 0);
  }

  enemyKilled(): void {
    this.money += KILL_REWARD;
  }

  canAfford(block: Block): boolean {
    return this.money >= costOf(block);
  }

  // Call only after the build is allowed (canAfford + the grid rules).
  buy(block: Block): void {
    this.money -= costOf(block);
  }

  refund(block: Block): void {
    this.money += costOf(block);
  }
}
