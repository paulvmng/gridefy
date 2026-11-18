// A short on-screen message ("Bedrock can't be deleted") that fades out.
// Its timer counts down in update(dt), the same way everything in the game
// loop measures time.

const SHOW_SECONDS = 1.5;

export class Message {
  private readonly el: HTMLElement;
  private timeLeft = 0;

  constructor(el: HTMLElement) {
    this.el = el;
  }

  // `seconds = Infinity` keeps the message up for good (used for "Game over").
  show(text: string, seconds = SHOW_SECONDS): void {
    this.el.textContent = text;
    this.el.classList.add('visible');
    this.timeLeft = seconds;
  }

  // Take it down right away (also a permanent one).
  hide(): void {
    this.timeLeft = 0;
    this.el.classList.remove('visible');
  }

  update(dt: number): void {
    if (this.timeLeft <= 0) return;
    this.timeLeft -= dt;
    if (this.timeLeft <= 0) this.el.classList.remove('visible');
  }
}
