// EMBERFALL ARENA — bootstrap, game loop and state machine.
// One clear job: own the mode (title / playing / upgrade / paused /
// gameover / victory), drive updateWorld and the renderers, and wire input
// and audio. All simulation lives in world.js, all drawing in render.js.

import { VIEW } from './config.js';
import { makeRng } from './random.js';
import { createInput } from './input.js';
import { createAudio } from './audio.js';
import { createWorld, startRun, updateWorld } from './world.js';
import { rollUpgrades, applyUpgrade } from './upgrades.js';
import {
  drawBackground, drawWorld, drawHud, drawTitle, drawUpgrade, drawPaused,
  drawGameOver, drawVictory, drawWaveBanner,
} from './render.js';
import { buildShot, shotTime } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const statusEl = document.getElementById('status');
const input = createInput(canvas);
const audio = createAudio();

const params = new URLSearchParams(window.location.search);
const shotName = params.get('shot');
const seed = Number(params.get('seed') ?? 1) || 1;

// Best score, kept across visits. Guarded: localStorage may be unavailable.
let bestScore = 0;
try {
  bestScore = Number(window.localStorage.getItem('emberfall-best') ?? 0) || 0;
} catch {
  bestScore = 0;
}
function saveBest(score) {
  if (score <= bestScore) return;
  bestScore = score;
  try {
    window.localStorage.setItem('emberfall-best', String(score));
  } catch {
    // No storage, no problem: the run still counts.
  }
}

function setStatus(text) {
  if (statusEl) statusEl.textContent = text;
}

// --- Staged screenshot mode -----------------------------------------------
// ?shot=start|play|upgrade|end renders one fixed scene and never simulates,
// so a screenshot is identical every time it is taken.
const staged = shotName ? buildShot(shotName, seed) : null;
if (staged) {
  const fixedTime = shotTime(shotName);
  const frame = () => {
    drawBackground(ctx, fixedTime);
    if (staged.mode === 'title') {
      drawTitle(ctx, fixedTime, 0);
    } else if (staged.mode === 'playing') {
      drawWorld(ctx, staged.world, fixedTime);
      drawHud(ctx, staged.world);
    } else if (staged.mode === 'upgrade') {
      drawWorld(ctx, staged.world, fixedTime);
      drawHud(ctx, staged.world);
      drawUpgrade(ctx, staged.choices, staged.world.level, { x: -100, y: -100 }, staged.world.taken);
    } else if (staged.mode === 'victory') {
      drawWorld(ctx, staged.world, fixedTime);
      drawVictory(ctx, staged.world, fixedTime);
    }
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
} else {
  // --- Live game ----------------------------------------------------------
  const world = createWorld(makeRng((Math.random() * 0xffffffff) >>> 0));
  let mode = 'title';
  let choices = [];
  let lastWave = 0;
  let titleTime = 0;

  function startGame() {
    startRun(world);
    mode = 'playing';
    choices = [];
    lastWave = 0;
    setStatus('Wave 1. Move with WASD, aim with the mouse, hold click to fire.');
    audio.unlock();
    audio.click();
  }

  function openUpgrade() {
    choices = rollUpgrades(world.rng, world.taken);
    mode = 'upgrade';
    setStatus(`Level ${world.level}. Choose an upgrade: 1, 2 or 3.`);
    audio.unlock();
  }

  function pickUpgrade(index) {
    const choice = choices[index];
    if (!choice) return;
    applyUpgrade(choice, world.weapon, world.player, world.taken);
    world.pendingLevels -= 1;
    audio.levelUp();
    audio.click();
    if (world.pendingLevels > 0) {
      openUpgrade();
    } else {
      mode = 'playing';
      setStatus(`Wave ${world.wave}.`);
    }
  }

  function upgradeCardAt(mx, my) {
    const cardW = 300;
    const cardH = 300;
    const gap = 36;
    const totalW = cardW * 3 + gap * 2;
    const startX = (VIEW.width - totalW) / 2;
    const y = 210;
    if (my < y || my > y + cardH) return -1;
    for (let i = 0; i < 3; i += 1) {
      const x = startX + i * (cardW + gap);
      if (mx >= x && mx <= x + cardW) return i;
    }
    return -1;
  }

  function endRun(won) {
    saveBest(world.score);
    mode = won ? 'victory' : 'gameover';
    if (won) {
      audio.victory();
      setStatus(`Victory! Final score ${world.score}. Press R to play again.`);
    } else {
      setStatus(`Game over. Score ${world.score}. Press R to try again.`);
    }
  }

  let last = performance.now();
  // Read-only hook for automated play-testing: exposes the current mode and
  // a few counters, and never affects the game.
  window.__emberfall = {
    state() {
      return {
        mode,
        wave: world.wave,
        score: world.score,
        kills: world.kills,
        level: world.level,
        hp: world.player.hp,
        enemies: world.enemies.length,
        pendingLevels: world.pendingLevels,
        player: { x: world.player.x, y: world.player.y },
      };
    },
    nearestEnemy() {
      let best = null;
      let bestD = Infinity;
      for (const e of world.enemies) {
        const d = Math.hypot(e.x - world.player.x, e.y - world.player.y);
        if (d < bestD) {
          bestD = d;
          best = { x: e.x, y: e.y };
        }
      }
      return best;
    },
  };

  function frame(now) {
    const dt = Math.min(0.033, Math.max(0.001, (now - last) / 1000));
    last = now;

    // Global keys.
    if (input.wasPressed('KeyM')) {
      const muted = audio.toggleMute();
      setStatus(muted ? 'Sound muted.' : 'Sound on.');
    }
    if (input.wasPressed('Enter') || input.wasPressed('Space')) audio.unlock();
    if (input.wasClicked()) audio.unlock();

    if (mode === 'title') {
      titleTime += dt;
      if (input.wasPressed('Enter') || input.wasPressed('Space') || input.wasClicked()) {
        startGame();
      }
    } else if (mode === 'playing') {
      if (input.wasPressed('KeyP')) {
        mode = 'paused';
        setStatus('Paused. Press P to resume.');
      } else if (input.wasPressed('KeyR')) {
        startGame();
      } else {
        const events = updateWorld(world, input, dt, audio);
        if (world.wave === 10 && lastWave !== 10) audio.boss();
        lastWave = world.wave;
        if (events.gameOver) endRun(false);
        else if (events.victory) endRun(true);
        else if (world.pendingLevels > 0) openUpgrade();
      }
    } else if (mode === 'upgrade') {
      if (input.wasPressed('Digit1')) pickUpgrade(0);
      else if (input.wasPressed('Digit2')) pickUpgrade(1);
      else if (input.wasPressed('Digit3')) pickUpgrade(2);
      else if (input.wasClicked()) {
        const hit = upgradeCardAt(input.mouse.x, input.mouse.y);
        if (hit >= 0) pickUpgrade(hit);
      }
    } else if (mode === 'paused') {
      if (input.wasPressed('KeyP') || input.wasClicked()) {
        mode = 'playing';
        setStatus(`Wave ${world.wave}.`);
      }
    } else if (mode === 'gameover' || mode === 'victory') {
      if (input.wasPressed('KeyR') || input.wasPressed('Enter') || input.wasClicked()) {
        startGame();
      }
    }

    // --- Draw ---
    const t = mode === 'title' ? titleTime : world.time;
    drawBackground(ctx, t);
    if (mode === 'title') {
      drawTitle(ctx, titleTime, bestScore);
    } else {
      drawWorld(ctx, world, world.time);
      if (mode === 'playing' || mode === 'paused' || mode === 'upgrade') {
        drawHud(ctx, world);
        drawWaveBanner(ctx, world);
      }
      if (mode === 'upgrade') drawUpgrade(ctx, choices, world.level, input.mouse, world.taken);
      else if (mode === 'paused') drawPaused(ctx);
      else if (mode === 'gameover') drawGameOver(ctx, world, world.time);
      else if (mode === 'victory') drawVictory(ctx, world, world.time);
    }

    input.endFrame();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
