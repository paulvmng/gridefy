// Waves: the match is a fixed list of waves. Each wave sends `count` enemies,
// one every `interval` seconds. Between waves there's a break to build.
//
// This is a STATE MACHINE: it's always in exactly one state, and each state
// has one rule for when to move to the next one.
//
//   break ──(timer runs out)──► spawning ──(all spawned)──► clearing
//     ▲                                                        │
//     └───────────(field empty, more waves left)───────────────┤
//                                                              ▼
//                                        (field empty, last wave)  done
//
// No DOM, no Three.js: each frame it only answers "spawn an enemy now?".

export interface Wave {
  count: number; // how many enemies
  interval: number; // seconds between two spawns
}

export const WAVES: Wave[] = [
  { count: 5, interval: 2 },
  { count: 8, interval: 1.5 },
  { count: 12, interval: 1 },
];
export const BREAK_SECONDS = 5;

export type WaveState = 'break' | 'spawning' | 'clearing' | 'done';

export class Waves {
  state: WaveState = 'break';
  index = 0; // the current wave, 0-based (during a break: the NEXT wave)
  private spawned = 0; // how many of the current wave have spawned
  // One timer, two meanings. break: seconds LEFT. spawning: seconds SINCE the last spawn.
  private timer = BREAK_SECONDS;

  constructor(private readonly waves: Wave[] = WAVES) {}

  get total(): number {
    return this.waves.length;
  }

  // Seconds until the next wave starts (0 when not on a break).
  get breakLeft(): number {
    return this.state === 'break' ? this.timer : 0;
  }

  // Call once per frame. `alive` = how many enemies are on the field.
  // Returns true when one enemy should spawn this frame.
  update(dt: number, alive: number): boolean {
    const wave = this.waves[this.index];

    if (this.state === 'break') {
      this.timer -= dt;
      if (this.timer <= 0) {
        this.state = 'spawning';
        this.spawned = 0;
        this.timer = wave.interval; // start "full", so the first enemy comes right away
      }
      return false;
    }

    if (this.state === 'spawning') {
      // Same "count up and keep the leftover" timer as a tower's cooldown.
      this.timer += dt;
      if (this.timer < wave.interval) return false;
      this.timer -= wave.interval;
      this.spawned++;
      if (this.spawned === wave.count) this.state = 'clearing';
      return true;
    }

    if (this.state === 'clearing' && alive === 0) {
      this.index++;
      if (this.index === this.waves.length) {
        this.state = 'done';
      } else {
        this.state = 'break';
        this.timer = BREAK_SECONDS;
      }
    }
    return false;
  }
}
