// The state of the match as a whole: things that don't belong to any one
// enemy or tower. Plain data plus rules (no DOM, no Three.js), like enemy.ts.
// The HUD only READS this. Money and waves will live here too, later.

export const START_LIVES = 10;

export class Game {
  lives = START_LIVES;

  get over(): boolean {
    return this.lives <= 0;
  }

  // An enemy reached the base. Lives never go below 0.
  loseLife(): void {
    this.lives = Math.max(this.lives - 1, 0);
  }
}
