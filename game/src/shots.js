// Staged screenshot scenes for EMBERFALL ARENA.
// `?shot=start|play|upgrade|end&seed=N` builds a fixed, deterministic scene
// so screenshots are reproducible: the title screen, a busy mid-game moment,
// the level-up choice, and the victory screen. Live play never uses these.

import { makeRng } from './random.js';
import { createWorld, startRun, startWave, spawnEnemy, burst } from './world.js';
import { rollUpgrades } from './upgrades.js';
import { VIEW } from './config.js';

function placeEnemy(world, type, x, y) {
  const e = spawnEnemy(world, type);
  e.x = x;
  e.y = y;
  e.spawnAge = 1;
  return e;
}

function buildPlayScene(seed) {
  const rng = makeRng(seed);
  const world = createWorld(rng);
  startRun(world);
  world.time = 14.5;
  startWave(world, 4);
  world.waveState = 'fighting';
  world.spawnQueue = ['cinder', 'sparker', 'darter'];
  world.score = 2450;
  world.kills = 31;
  world.level = 3;
  world.xp = 9;
  world.xpNext = 16;
  world.player.hp = 4;
  world.player.x = 640;
  world.player.y = 380;
  world.player.angle = -0.5;
  world.weapon.projectiles = 2;
  world.weapon.damage = 1.25;

  placeEnemy(world, 'cinder', 420, 250);
  placeEnemy(world, 'cinder', 860, 300);
  placeEnemy(world, 'cinder', 520, 520);
  placeEnemy(world, 'sparker', 980, 180);
  placeEnemy(world, 'sparker', 300, 480);
  placeEnemy(world, 'splinter', 760, 520);
  placeEnemy(world, 'darter', 900, 440);
  placeEnemy(world, 'darter', 380, 160);

  // Bullets mid-flight and a fresh explosion, so the frame reads as action.
  for (let i = 0; i < 5; i += 1) {
    const a = -0.5 + (i - 2) * 0.09;
    world.bullets.push({
      x: 640 + Math.cos(a) * (60 + i * 46), y: 380 + Math.sin(a) * (60 + i * 46),
      vx: Math.cos(a) * 640, vy: Math.sin(a) * 640,
      damage: 1.25, pierce: 0, range: 560, traveled: 60 + i * 46,
      radius: 5, hit: new Set(),
    });
  }
  world.enemyBullets.push({ x: 940, y: 220, vx: -160, vy: 120, radius: 6, damage: 1 });
  world.enemyBullets.push({ x: 350, y: 430, vx: 140, vy: -90, radius: 6, damage: 1 });
  burst(world, 420, 250, '#ff7b3d', 14, 240);
  burst(world, 760, 520, '#4cc9f0', 10, 180);
  // Let the explosions bloom: advance the fresh particles a quarter second
  // so the burst reads as a burst instead of a single dot.
  for (const pt of world.particles) {
    pt.x += pt.vx * 0.28;
    pt.y += pt.vy * 0.28;
    pt.life -= 0.28;
  }

  for (let i = 0; i < 6; i += 1) {
    world.pickups.push({
      kind: 'shard', x: 480 + i * 34, y: 300 + (i % 2) * 40,
      vx: 0, vy: 0, value: 1, radius: 7, age: 0,
    });
  }
  world.pickups.push({ kind: 'heart', x: 700, y: 470, vx: 0, vy: 0, value: 1, radius: 10, age: 0 });
  return world;
}

function buildUpgradeScene(seed) {
  const rng = makeRng(seed);
  const world = createWorld(rng);
  startRun(world);
  world.time = 20;
  startWave(world, 3);
  world.waveState = 'fighting';
  world.score = 1980;
  world.kills = 24;
  world.level = 4;
  world.xp = 2;
  world.xpNext = 21;
  world.player.x = 640;
  world.player.y = 360;
  world.taken = { 'heavy-rounds': 1, 'swift-boots': 1 };
  const choices = rollUpgrades(rng, world.taken);
  return { world, choices };
}

function buildEndScene(seed) {
  const rng = makeRng(seed);
  const world = createWorld(rng);
  startRun(world);
  world.time = 30;
  world.wave = 10;
  world.score = 18450;
  world.kills = 212;
  world.level = 9;
  world.xp = 12;
  world.xpNext = 46;
  world.player.hp = 3;
  return world;
}

// Returns { mode, world, choices } for the requested shot, or null when the
// query names no staged shot (live play).
export function buildShot(shot, seed) {
  if (shot === 'start') {
    const world = createWorld(makeRng(seed));
    world.time = 2.6;
    return { mode: 'title', world, choices: [] };
  }
  if (shot === 'play') {
    return { mode: 'playing', world: buildPlayScene(seed), choices: [] };
  }
  if (shot === 'upgrade') {
    const scene = buildUpgradeScene(seed);
    return { mode: 'upgrade', world: scene.world, choices: scene.choices };
  }
  if (shot === 'end') {
    return { mode: 'victory', world: buildEndScene(seed), choices: [] };
  }
  return null;
}

export function shotTime(shot) {
  // Fixed scene clocks keep every staged render identical run to run.
  // The title clock is chosen so the blinking start prompt is visible.
  if (shot === 'start') return 2.6;
  if (shot === 'play') return 14.5;
  if (shot === 'upgrade') return 20;
  if (shot === 'end') return 30;
  return 0;
}

export { VIEW };
