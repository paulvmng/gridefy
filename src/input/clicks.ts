// Tell a CLICK apart from a DRAG.
// The same mouse buttons both edit blocks (click) and move the camera (drag).
// If the mouse moved less than a few pixels between press and release, it was
// a click.

const DRAG_THRESHOLD_PX = 5;

export function onClick(
  element: HTMLElement,
  handler: (button: number, clientX: number, clientY: number) => void,
): void {
  let downX = 0;
  let downY = 0;
  let downButton = -1;

  element.addEventListener('pointerdown', (e) => {
    downX = e.clientX;
    downY = e.clientY;
    downButton = e.button; // 0 = left, 1 = middle, 2 = right
  });

  element.addEventListener('pointerup', (e) => {
    if (e.button !== downButton) return;
    const moved = Math.hypot(e.clientX - downX, e.clientY - downY);
    if (moved < DRAG_THRESHOLD_PX) handler(e.button, e.clientX, e.clientY);
  });

  // Stop the browser's right-click menu from popping up over the game.
  element.addEventListener('contextmenu', (e) => e.preventDefault());
}
