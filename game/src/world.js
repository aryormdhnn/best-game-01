// The arena simulation for EMBERFALL ARENA: player, enemies, bullets,
// pickups, particles and waves. No drawing here — render.js draws the state
// this file owns. updateWorld advances one fixed step and reports the events
// the state machine in main.js needs (level-ups, wave clear, game over, win).

import { VIEW, PLAYER, ENEMY_TYPES, WAVES, TOTAL_WAVES, xpForLevel } from './config.js';

let nextId = 1;

export function createWorld(rng) {
  return {
    rng,
    time: 0,
    wave: 0,
    waveState: 'idle', // idle | spawning | fighting | clear | breather
    spawnQueue: [],
    spawnTimer: 0,
    breatherTimer: 0,
    score: 0,
    kills: 0,
    level: 1,
    xp: 0,
    xpNext: xpForLevel(2),
    pendingLevels: 0,
    player: {
      x: VIEW.width / 2, y: VIEW.height / 2, vx: 0, vy: 0, angle: -Math.PI / 2,
      hp: PLAYER.maxHp, maxHp: PLAYER.maxHp, speed: PLAYER.speed,
      radius: PLAYER.radius, pickupRadius: PLAYER.pickupRadius,
      invuln: 0, fireTimer: 0, aura: 0, auraTimer: 0, alive: true,
    },
    weapon: {
      damage: PLAYER.bulletDamage, fireInterval: PLAYER.fireInterval,
      bulletSpeed: PLAYER.bulletSpeed, bulletRange: PLAYER.bulletRange,
      bulletRadius: PLAYER.bulletRadius, projectiles: 1, pierce: 0,
    },
    taken: {},
    bullets: [],
    enemyBullets: [],
    enemies: [],
    particles: [],
    texts: [],
    pickups: [],
    shake: 0,
    flash: 0,
    waveStartAt: 0,
    bossSpawned: false,
  };
}

export function startRun(world) {
  world.time = 0;
  world.score = 0;
  world.kills = 0;
  world.level = 1;
  world.xp = 0;
  world.xpNext = xpForLevel(2);
  world.pendingLevels = 0;
  world.bullets = [];
  world.enemyBullets = [];
  world.enemies = [];
  world.particles = [];
  world.texts = [];
  world.pickups = [];
  world.taken = {};
  world.shake = 0;
  world.flash = 0;
  world.bossSpawned = false;
  const p = world.player;
  p.x = VIEW.width / 2;
  p.y = VIEW.height / 2;
  p.vx = 0;
  p.vy = 0;
  p.hp = PLAYER.maxHp;
  p.maxHp = PLAYER.maxHp;
  p.speed = PLAYER.speed;
  p.pickupRadius = PLAYER.pickupRadius;
  p.aura = 0;
  p.invuln = 0;
  p.fireTimer = 0;
  p.alive = true;
  const w = world.weapon;
  w.damage = PLAYER.bulletDamage;
  w.fireInterval = PLAYER.fireInterval;
  w.bulletSpeed = PLAYER.bulletSpeed;
  w.bulletRange = PLAYER.bulletRange;
  w.bulletRadius = PLAYER.bulletRadius;
  w.projectiles = 1;
  w.pierce = 0;
  startWave(world, 1);
}

export function startWave(world, waveNumber) {
  const def = WAVES[waveNumber - 1];
  const queue = [];
  for (const [type, count] of Object.entries(def)) {
    if (type === 'interval') continue;
    for (let i = 0; i < count; i += 1) queue.push(type);
  }
  // Shuffle the queue so the wave never arrives in type blocks.
  for (let i = queue.length - 1; i > 0; i -= 1) {
    const j = Math.floor(world.rng.next() * (i + 1));
    [queue[i], queue[j]] = [queue[j], queue[i]];
  }
  world.wave = waveNumber;
  world.spawnQueue = queue;
  world.spawnTimer = 0.6;
  world.waveState = 'spawning';
  world.waveStartAt = world.time;
  world.bossSpawned = queue.includes('boss');
}

function edgeSpawnPoint(rng) {
  const side = Math.floor(rng.next() * 4);
  const m = 30;
  if (side === 0) return { x: rng.range(m, VIEW.width - m), y: m };
  if (side === 1) return { x: rng.range(m, VIEW.width - m), y: VIEW.height - m };
  if (side === 2) return { x: m, y: rng.range(m, VIEW.height - m) };
  return { x: VIEW.width - m, y: rng.range(m, VIEW.height - m) };
}

export function spawnEnemy(world, type) {
  const def = ENEMY_TYPES[type];
  const pos = edgeSpawnPoint(world.rng);
  const enemy = {
    id: nextId, type, x: pos.x, y: pos.y, vx: 0, vy: 0,
    hp: def.hp * (1 + (world.wave - 1) * 0.12),
    maxHp: def.hp * (1 + (world.wave - 1) * 0.12),
    speed: def.speed * world.rng.range(0.9, 1.1),
    radius: def.radius, score: def.score, shards: def.shards,
    shootTimer: world.rng.range(1, def.shootEvery ?? 99),
    dashTimer: world.rng.range(1.5, 3),
    dashing: 0, telegraph: 0, flash: 0, spawnAge: 0,
  };
  nextId += 1;
  world.enemies.push(enemy);
  burst(world, pos.x, pos.y, def.color, 10, 140);
  return enemy;
}

export function burst(world, x, y, color, count, speed) {
  for (let i = 0; i < count; i += 1) {
    const a = world.rng.angle();
    const s = world.rng.range(speed * 0.3, speed);
    world.particles.push({
      x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
      life: world.rng.range(0.25, 0.6), maxLife: 0.6,
      size: world.rng.range(2, 5), color, drag: 0.92,
    });
  }
}

function addText(world, x, y, text, color, size = 16) {
  world.texts.push({ x, y, vy: -46, life: 0.9, maxLife: 0.9, text, color, size });
}

function dropPickups(world, enemy) {
  for (let i = 0; i < enemy.shards; i += 1) {
    const a = world.rng.angle();
    world.pickups.push({
      kind: 'shard', x: enemy.x, y: enemy.y,
      vx: Math.cos(a) * 90, vy: Math.sin(a) * 90,
      value: 1, radius: 7, age: 0,
    });
  }
  if (world.rng.next() < 0.05) {
    world.pickups.push({
      kind: 'heart', x: enemy.x, y: enemy.y, vx: 0, vy: -30,
      value: 1, radius: 10, age: 0,
    });
  }
}

function killEnemy(world, enemy, audio) {
  world.kills += 1;
  world.score += enemy.score;
  addText(world, enemy.x, enemy.y, `+${enemy.score}`, '#ffd166', 16);
  burst(world, enemy.x, enemy.y, ENEMY_TYPES[enemy.type].color, enemy.type === 'boss' ? 60 : 18, 260);
  world.shake = Math.min(14, world.shake + (enemy.type === 'boss' ? 14 : 4));
  dropPickups(world, enemy);
  if (audio) audio.explode();
  if (enemy.type === 'splinter') {
    for (let i = 0; i < 2; i += 1) {
      const child = spawnEnemy(world, 'cinder');
      child.x = enemy.x + (i === 0 ? -18 : 18);
      child.y = enemy.y;
    }
  }
}

function damageEnemy(world, enemy, amount, audio) {
  enemy.hp -= amount;
  enemy.flash = 0.12;
  if (enemy.hp <= 0) killEnemy(world, enemy, audio);
  else if (audio) audio.hit();
}

function firePlayerBullet(world, angle, audio) {
  const p = world.player;
  const w = world.weapon;
  const mx = Math.cos(angle);
  const my = Math.sin(angle);
  world.bullets.push({
    x: p.x + mx * (p.radius + 8), y: p.y + my * (p.radius + 8),
    vx: mx * w.bulletSpeed, vy: my * w.bulletSpeed,
    damage: w.damage, pierce: w.pierce, range: w.bulletRange,
    traveled: 0, radius: w.bulletRadius, hit: new Set(),
  });
  burst(world, p.x + mx * (p.radius + 6), p.y + my * (p.radius + 6), '#ffe66d', 2, 60);
  if (audio) audio.shoot();
}

function fireEnemyBullet(world, from, angle, speed, audio) {
  world.enemyBullets.push({
    x: from.x, y: from.y,
    vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
    radius: 6, damage: 1,
  });
  if (audio) audio.enemyShoot();
}

function hurtPlayer(world, damage, fromX, fromY, audio) {
  const p = world.player;
  if (p.invuln > 0 || !p.alive) return;
  p.hp -= damage;
  p.invuln = PLAYER.contactCooldown;
  world.flash = 0.35;
  world.shake = Math.min(16, world.shake + 8);
  const a = Math.atan2(p.y - fromY, p.x - fromX);
  p.vx += Math.cos(a) * 320;
  p.vy += Math.sin(a) * 320;
  burst(world, p.x, p.y, '#ff5d8f', 16, 240);
  if (audio) audio.hurt();
  if (p.hp <= 0) {
    p.alive = false;
    burst(world, p.x, p.y, '#ffd166', 50, 380);
    world.shake = 18;
    if (audio) audio.explode();
  }
}

function gainXp(world, amount, audio) {
  world.xp += amount;
  while (world.xp >= world.xpNext) {
    world.xp -= world.xpNext;
    world.level += 1;
    world.xpNext = xpForLevel(world.level + 1);
    world.pendingLevels += 1;
    if (audio) audio.levelUp();
    addText(world, world.player.x, world.player.y - 30, 'LEVEL UP!', '#80ed99', 22);
  }
}

// One fixed simulation step. Returns events for the state machine.
export function updateWorld(world, input, dt, audio) {
  const events = { levelUps: 0, waveCleared: false, gameOver: false, victory: false };
  const p = world.player;
  const w = world.weapon;
  world.time += dt;
  world.shake = Math.max(0, world.shake - dt * 30);
  world.flash = Math.max(0, world.flash - dt);

  // --- Player movement and aim ---
  if (p.alive) {
    const move = input.moveVector();
    p.vx = move.x * p.speed;
    p.vy = move.y * p.speed;
    p.x = Math.max(p.radius, Math.min(VIEW.width - p.radius, p.x + p.vx * dt));
    p.y = Math.max(p.radius, Math.min(VIEW.height - p.radius, p.y + p.vy * dt));
    p.angle = Math.atan2(input.mouse.y - p.y, input.mouse.x - p.x);
    p.invuln = Math.max(0, p.invuln - dt);
    p.fireTimer -= dt;
    if (input.firing() && p.fireTimer <= 0) {
      p.fireTimer = w.fireInterval;
      const count = w.projectiles;
      const spread = 0.14;
      for (let i = 0; i < count; i += 1) {
        const offset = count === 1 ? 0 : (i - (count - 1) / 2) * spread;
        firePlayerBullet(world, p.angle + offset, audio);
      }
    }
    // Ember aura burns nearby enemies.
    if (p.aura > 0) {
      p.auraTimer -= dt;
      if (p.auraTimer <= 0) {
        p.auraTimer = 0.5;
        for (const e of world.enemies) {
          const d = Math.hypot(e.x - p.x, e.y - p.y);
          if (d < 110 + p.aura * 20 + e.radius) {
            damageEnemy(world, e, p.aura, null);
            burst(world, e.x, e.y, '#ff9f1c', 3, 80);
          }
        }
      }
    }
  }

  // --- Wave spawning ---
  if (world.waveState === 'spawning' || world.waveState === 'fighting') {
    if (world.spawnQueue.length > 0) {
      world.spawnTimer -= dt;
      if (world.spawnTimer <= 0) {
        world.spawnTimer = WAVES[world.wave - 1].interval;
        spawnEnemy(world, world.spawnQueue.shift());
        if (world.spawnQueue.length === 0) world.waveState = 'fighting';
      }
    } else if (world.enemies.length === 0) {
      world.waveState = 'clear';
      const bonus = 250 * world.wave;
      world.score += bonus;
      addText(world, VIEW.width / 2, VIEW.height / 2 - 40, `WAVE ${world.wave} CLEAR  +${bonus}`, '#80ed99', 26);
      if (audio) audio.waveClear();
      events.waveCleared = true;
      world.breatherTimer = 2.4;
      if (world.wave >= TOTAL_WAVES) {
        events.victory = true;
      }
    }
  } else if (world.waveState === 'clear') {
    world.breatherTimer -= dt;
    if (world.breatherTimer <= 0 && world.wave < TOTAL_WAVES) {
      startWave(world, world.wave + 1);
    }
  }

  // --- Enemies ---
  for (const e of world.enemies) {
    e.spawnAge += dt;
    e.flash = Math.max(0, e.flash - dt);
    const dx = p.x - e.x;
    const dy = p.y - e.y;
    const dist = Math.hypot(dx, dy) || 1;
    const nx = dx / dist;
    const ny = dy / dist;
    const def = ENEMY_TYPES[e.type];

    if (e.type === 'cinder' || e.type === 'splinter') {
      e.vx = nx * e.speed;
      e.vy = ny * e.speed;
    } else if (e.type === 'sparker') {
      // Keep a firing distance, drift sideways so it never sits still.
      const want = 270;
      const radial = dist > want + 30 ? 1 : dist < want - 30 ? -1 : 0;
      const strafe = Math.sin(world.time * 1.3 + e.id) * 0.6;
      e.vx = (nx * radial + -ny * strafe) * e.speed;
      e.vy = (ny * radial + nx * strafe) * e.speed;
      e.shootTimer -= dt;
      if (e.shootTimer <= 0 && dist < 560 && p.alive) {
        e.shootTimer = def.shootEvery;
        fireEnemyBullet(world, e, Math.atan2(dy, dx), 230, audio);
      }
    } else if (e.type === 'darter') {
      e.dashTimer -= dt;
      if (e.dashing > 0) {
        e.dashing -= dt;
        e.vx = Math.cos(e.dashAngle) * def.dashSpeed;
        e.vy = Math.sin(e.dashAngle) * def.dashSpeed;
      } else if (e.telegraph > 0) {
        e.telegraph -= dt;
        e.vx = 0;
        e.vy = 0;
        if (e.telegraph <= 0) {
          e.dashing = 0.35;
          e.dashAngle = Math.atan2(dy, dx);
        }
      } else {
        e.vx = nx * e.speed;
        e.vy = ny * e.speed;
        if (e.dashTimer <= 0 && dist < 420) {
          e.dashTimer = def.dashEvery;
          e.telegraph = 0.4;
        }
      }
    } else if (e.type === 'boss') {
      e.vx = nx * e.speed;
      e.vy = ny * e.speed;
      e.shootTimer -= dt;
      if (e.shootTimer <= 0 && p.alive) {
        e.shootTimer = def.shootEvery;
        const n = 12;
        for (let i = 0; i < n; i += 1) {
          fireEnemyBullet(world, e, (i / n) * Math.PI * 2 + world.time, 190, null);
        }
        if (audio) audio.enemyShoot();
        // The king summons cinders while the fight lasts.
        if (world.enemies.length < 14) {
          spawnEnemy(world, 'cinder');
          spawnEnemy(world, 'cinder');
        }
      }
    }

    e.x += e.vx * dt;
    e.y += e.vy * dt;
    e.x = Math.max(e.radius, Math.min(VIEW.width - e.radius, e.x));
    e.y = Math.max(e.radius, Math.min(VIEW.height - e.radius, e.y));
  }

  // Gentle separation so enemies never stack into one blob.
  for (let i = 0; i < world.enemies.length; i += 1) {
    for (let j = i + 1; j < world.enemies.length; j += 1) {
      const a = world.enemies[i];
      const b = world.enemies[j];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const d = Math.hypot(dx, dy);
      const min = a.radius + b.radius;
      if (d > 0 && d < min) {
        const push = (min - d) / 2;
        const ux = dx / d;
        const uy = dy / d;
        a.x -= ux * push;
        a.y -= uy * push;
        b.x += ux * push;
        b.y += uy * push;
      }
    }
  }

  // --- Player bullets ---
  for (const b of world.bullets) {
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.traveled += Math.hypot(b.vx, b.vy) * dt;
    for (const e of world.enemies) {
      if (b.hit.has(e.id)) continue;
      const d = Math.hypot(e.x - b.x, e.y - b.y);
      if (d < e.radius + b.radius) {
        b.hit.add(e.id);
        damageEnemy(world, e, b.damage, audio);
        burst(world, b.x, b.y, '#ffe66d', 4, 120);
        if (b.pierce > 0) {
          b.pierce -= 1;
        } else {
          b.traveled = b.range + 1; // Mark spent.
          break;
        }
      }
    }
  }
  world.bullets = world.bullets.filter(
    (b) => b.traveled <= b.range && b.x > -20 && b.x < VIEW.width + 20 && b.y > -20 && b.y < VIEW.height + 20,
  );

  // --- Enemy bullets ---
  for (const b of world.enemyBullets) {
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    if (p.alive) {
      const d = Math.hypot(p.x - b.x, p.y - b.y);
      if (d < p.radius + b.radius) {
        hurtPlayer(world, b.damage, b.x - b.vx, b.y - b.vy, audio);
        b.x = -9999; // Mark spent.
      }
    }
  }
  world.enemyBullets = world.enemyBullets.filter(
    (b) => b.x > -40 && b.x < VIEW.width + 40 && b.y > -40 && b.y < VIEW.height + 40,
  );

  // --- Contact damage ---
  if (p.alive) {
    for (const e of world.enemies) {
      const d = Math.hypot(e.x - p.x, e.y - p.y);
      if (d < e.radius + p.radius) {
        hurtPlayer(world, ENEMY_TYPES[e.type].damage, e.x, e.y, audio);
        damageEnemy(world, e, 1, null);
        e.x += ((e.x - p.x) / (d || 1)) * 26;
        e.y += ((e.y - p.y) / (d || 1)) * 26;
      }
    }
  }

  // Remove the dead (killEnemy already paid out their score and drops).
  world.enemies = world.enemies.filter((e) => e.hp > 0);

  // --- Pickups ---
  for (const pk of world.pickups) {
    pk.age += dt;
    const dx = p.x - pk.x;
    const dy = p.y - pk.y;
    const d = Math.hypot(dx, dy) || 1;
    if (p.alive && d < p.pickupRadius) {
      const pull = 620 * (1 - d / (p.pickupRadius + 60));
      pk.vx += (dx / d) * pull * dt * 4;
      pk.vy += (dy / d) * pull * dt * 4;
    }
    pk.vx *= 0.94;
    pk.vy *= 0.94;
    pk.x += pk.vx * dt;
    pk.y += pk.vy * dt;
    if (p.alive && d < p.radius + pk.radius + 4) {
      pk.taken = true;
      if (pk.kind === 'shard') {
        world.score += 10;
        gainXp(world, pk.value, audio);
        if (audio) audio.pickup();
      } else if (pk.kind === 'heart') {
        p.hp = Math.min(p.maxHp, p.hp + 1);
        addText(world, p.x, p.y - 26, '+1 HP', '#ff5d8f', 16);
        if (audio) audio.pickup();
      }
    }
  }
  world.pickups = world.pickups.filter((pk) => !pk.taken && pk.age < 25);

  // --- Particles and floating text ---
  for (const pt of world.particles) {
    pt.life -= dt;
    pt.x += pt.vx * dt;
    pt.y += pt.vy * dt;
    pt.vx *= pt.drag;
    pt.vy *= pt.drag;
  }
  world.particles = world.particles.filter((pt) => pt.life > 0);
  for (const t of world.texts) {
    t.life -= dt;
    t.y += t.vy * dt;
  }
  world.texts = world.texts.filter((t) => t.life > 0);

  if (world.pendingLevels > 0) events.levelUps = world.pendingLevels;
  if (!p.alive) events.gameOver = true;
  return events;
}
