// Keyboard and mouse input for EMBERFALL ARENA.
// One clear job: turn DOM events into a plain, pollable state the game loop
// reads each frame. Mouse coordinates are converted into the game's logical
// 1280x720 space, whatever size the canvas is displayed at.

import { VIEW } from './config.js';

export function createInput(canvas) {
  const keys = new Set();
  const pressed = new Set(); // Keys pressed since the last poll (edge-triggered).
  const mouse = { x: VIEW.width / 2, y: VIEW.height / 2, down: false, clicked: false };

  function toLogical(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((clientX - rect.left) / rect.width) * VIEW.width,
      y: ((clientY - rect.top) / rect.height) * VIEW.height,
    };
  }

  window.addEventListener('keydown', (event) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) {
      event.preventDefault();
    }
    if (!event.repeat) pressed.add(event.code);
    keys.add(event.code);
  });
  window.addEventListener('keyup', (event) => {
    keys.delete(event.code);
  });
  window.addEventListener('blur', () => {
    keys.clear();
    mouse.down = false;
  });

  canvas.addEventListener('mousemove', (event) => {
    const p = toLogical(event.clientX, event.clientY);
    mouse.x = p.x;
    mouse.y = p.y;
  });
  canvas.addEventListener('mousedown', (event) => {
    if (event.button !== 0) return;
    const p = toLogical(event.clientX, event.clientY);
    mouse.x = p.x;
    mouse.y = p.y;
    mouse.down = true;
    mouse.clicked = true;
  });
  window.addEventListener('mouseup', (event) => {
    if (event.button === 0) mouse.down = false;
  });
  canvas.addEventListener('contextmenu', (event) => event.preventDefault());

  return {
    keys,
    mouse,
    // Held-down movement vector, normalised, from WASD or arrow keys.
    moveVector() {
      let x = 0;
      let y = 0;
      if (keys.has('KeyA') || keys.has('ArrowLeft')) x -= 1;
      if (keys.has('KeyD') || keys.has('ArrowRight')) x += 1;
      if (keys.has('KeyW') || keys.has('ArrowUp')) y -= 1;
      if (keys.has('KeyS') || keys.has('ArrowDown')) y += 1;
      if (x !== 0 && y !== 0) {
        const inv = 1 / Math.hypot(x, y);
        x *= inv;
        y *= inv;
      }
      return { x, y };
    },
    firing() {
      return mouse.down || keys.has('Space');
    },
    // True once for each physical press; consumed by the caller each frame.
    wasPressed(code) {
      return pressed.has(code);
    },
    wasClicked() {
      return mouse.clicked;
    },
    // Call at the end of every frame: edge-triggered state lives one frame.
    endFrame() {
      pressed.clear();
      mouse.clicked = false;
    },
  };
}
