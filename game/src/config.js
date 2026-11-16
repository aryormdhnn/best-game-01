// EMBERFALL ARENA — tuning, palette, waves and upgrade definitions.
// One clear job: every number the game balances on lives here, so tuning never
// means hunting through logic. All colours are drawn from one ember palette.

export const VIEW = { width: 1280, height: 720 };

export const PALETTE = {
  bgTop: '#14101f',
  bgBottom: '#0a0714',
  grid: 'rgba(148, 120, 220, 0.07)',
  gridBright: 'rgba(148, 120, 220, 0.14)',
  arenaEdge: 'rgba(255, 170, 80, 0.35)',
  player: '#ffd166',
  playerCore: '#fff3c4',
  playerRing: '#ff9f1c',
  bullet: '#ffe66d',
  enemyBullet: '#ff5d8f',
  cinder: '#ff7b3d',
  sparker: '#c77dff',
  splinter: '#4cc9f0',
  darter: '#80ed99',
  boss: '#ff3d5e',
  shard: '#ffd166',
  heart: '#ff5d8f',
  text: '#f5efe0',
  textDim: '#a89ec4',
  accent: '#ff9f1c',
  panel: 'rgba(16, 12, 30, 0.88)',
  panelEdge: 'rgba(255, 159, 28, 0.45)',
  good: '#80ed99',
  bad: '#ff5d8f',
};

export const PLAYER = {
  radius: 16,
  speed: 265,
  maxHp: 5,
  fireInterval: 0.16,
  bulletSpeed: 640,
  bulletDamage: 1,
  bulletRadius: 5,
  bulletRange: 560,
  contactCooldown: 0.8,
  pickupRadius: 70,
};

export const ENEMY_TYPES = {
  cinder: {
    name: 'Cinder',
    hp: 3, speed: 96, radius: 14, score: 50, shards: 1,
    color: PALETTE.cinder, shape: 'tri', damage: 1,
  },
  sparker: {
    name: 'Sparker',
    hp: 5, speed: 58, radius: 16, score: 100, shards: 2,
    color: PALETTE.sparker, shape: 'square', damage: 1, shootEvery: 2.4,
  },
  splinter: {
    name: 'Splinter',
    hp: 6, speed: 74, radius: 18, score: 150, shards: 2,
    color: PALETTE.splinter, shape: 'hex', damage: 1, splitsInto: 'cinder',
  },
  darter: {
    name: 'Darter',
    hp: 4, speed: 62, radius: 13, score: 120, shards: 2,
    color: PALETTE.darter, shape: 'diamond', damage: 1, dashEvery: 2.8, dashSpeed: 460,
  },
  boss: {
    name: 'The Ashen King',
    hp: 420, speed: 42, radius: 48, score: 5000, shards: 12,
    color: PALETTE.boss, shape: 'crown', damage: 2, shootEvery: 1.6,
  },
};

// Waves 1-10. Each entry lists how many of each enemy type the wave spawns,
// plus a spawn interval (seconds between spawns). Wave 10 is the boss wave.
export const WAVES = [
  { cinder: 6, interval: 1.1 },
  { cinder: 10, sparker: 2, interval: 1.0 },
  { cinder: 10, sparker: 4, darter: 2, interval: 0.95 },
  { cinder: 12, sparker: 5, splinter: 3, darter: 3, interval: 0.9 },
  { cinder: 14, sparker: 6, splinter: 4, darter: 4, interval: 0.85 },
  { cinder: 16, sparker: 8, splinter: 5, darter: 5, interval: 0.8 },
  { cinder: 18, sparker: 9, splinter: 6, darter: 6, interval: 0.75 },
  { cinder: 20, sparker: 10, splinter: 7, darter: 7, interval: 0.7 },
  { cinder: 22, sparker: 12, splinter: 8, darter: 8, interval: 0.65 },
  { boss: 1, cinder: 8, sparker: 4, interval: 1.2 },
];

export const TOTAL_WAVES = WAVES.length;

export function xpForLevel(level) {
  return 6 + (level - 1) * 5;
}

export const UPGRADES = [
  {
    id: 'heavy-rounds', name: 'Heavy Rounds', max: 5,
    desc: '+25% bullet damage',
    apply: (w) => { w.damage *= 1.25; },
  },
  {
    id: 'rapid-fire', name: 'Rapid Trigger', max: 5,
    desc: '+18% fire rate',
    apply: (w) => { w.fireInterval *= 0.85; },
  },
  {
    id: 'twin-shot', name: 'Twin Shot', max: 3,
    desc: '+1 projectile per shot',
    apply: (w) => { w.projectiles += 1; },
  },
  {
    id: 'piercing', name: 'Piercing Rounds', max: 3,
    desc: 'Bullets pierce +1 enemy',
    apply: (w) => { w.pierce += 1; },
  },
  {
    id: 'long-barrel', name: 'Long Barrel', max: 3,
    desc: '+20% bullet speed and range',
    apply: (w) => { w.bulletSpeed *= 1.2; w.bulletRange *= 1.2; },
  },
  {
    id: 'swift-boots', name: 'Swift Boots', max: 4,
    desc: '+12% move speed',
    apply: (p) => { p.speed *= 1.12; },
    target: 'player',
  },
  {
    id: 'ember-heart', name: 'Ember Heart', max: 4,
    desc: '+1 max HP and heal 2 HP',
    apply: (p) => { p.maxHp += 1; p.hp = Math.min(p.maxHp, p.hp + 2); },
    target: 'player',
  },
  {
    id: 'magnet', name: 'Shard Magnet', max: 3,
    desc: '+70% shard pickup radius',
    apply: (p) => { p.pickupRadius *= 1.7; },
    target: 'player',
  },
  {
    id: 'ember-aura', name: 'Ember Aura', max: 3,
    desc: 'Burning aura hurts nearby enemies',
    apply: (p) => { p.aura = (p.aura ?? 0) + 1; },
    target: 'player',
  },
];

export const CONTROLS = [
  ['Move', 'WASD / Arrow keys'],
  ['Aim', 'Mouse'],
  ['Fire', 'Hold left click / Space'],
  ['Pause', 'P'],
  ['Mute', 'M'],
  ['Restart', 'R'],
  ['Pick upgrade', '1 / 2 / 3 or click'],
];
