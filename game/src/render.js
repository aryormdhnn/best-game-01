// All canvas drawing for EMBERFALL ARENA: the arena, entities, particles,
// HUD and every screen (title, upgrade, paused, game over, victory).
// It reads the world state and never mutates it.

import { VIEW, PALETTE, ENEMY_TYPES, TOTAL_WAVES, CONTROLS } from './config.js';

const TAU = Math.PI * 2;

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function polygon(ctx, x, y, radius, sides, rotation) {
  ctx.beginPath();
  for (let i = 0; i < sides; i += 1) {
    const a = rotation + (i / sides) * TAU;
    const px = x + Math.cos(a) * radius;
    const py = y + Math.sin(a) * radius;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

function drawHeart(ctx, x, y, size, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size / 10, size / 10);
  ctx.beginPath();
  ctx.moveTo(0, 3);
  ctx.bezierCurveTo(-6, -3, -11, 2, 0, 9);
  ctx.bezierCurveTo(11, 2, 6, -3, 0, 3);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.restore();
}

function motePosition(i, time) {
  // Deterministic drifting ember: position is a pure function of index and
  // time, so a staged screenshot at a fixed time always looks the same.
  const x = ((i * 137.5 + time * (6 + (i % 5) * 2)) % (VIEW.width + 40)) - 20;
  const y = (i * 211.3) % VIEW.height + Math.sin(time * 0.7 + i * 1.7) * 14;
  return { x, y, r: 1 + (i % 3) * 0.8, a: 0.25 + ((i * 7) % 10) / 28 };
}

export function drawBackground(ctx, time) {
  const grad = ctx.createLinearGradient(0, 0, 0, VIEW.height);
  grad.addColorStop(0, PALETTE.bgTop);
  grad.addColorStop(1, PALETTE.bgBottom);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);

  ctx.strokeStyle = PALETTE.grid;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = 64; x < VIEW.width; x += 64) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x, VIEW.height);
  }
  for (let y = 64; y < VIEW.height; y += 64) {
    ctx.moveTo(0, y);
    ctx.lineTo(VIEW.width, y);
  }
  ctx.stroke();

  ctx.strokeStyle = PALETTE.gridBright;
  ctx.beginPath();
  ctx.moveTo(VIEW.width / 2, 0);
  ctx.lineTo(VIEW.width / 2, VIEW.height);
  ctx.moveTo(0, VIEW.height / 2);
  ctx.lineTo(VIEW.width, VIEW.height / 2);
  ctx.stroke();

  ctx.strokeStyle = PALETTE.arenaEdge;
  ctx.lineWidth = 2;
  ctx.strokeRect(10, 10, VIEW.width - 20, VIEW.height - 20);

  for (let i = 0; i < 42; i += 1) {
    const m = motePosition(i, time);
    ctx.globalAlpha = m.a * (0.6 + 0.4 * Math.sin(time * 2 + i));
    ctx.fillStyle = i % 3 === 0 ? '#ffd166' : '#ff9f1c';
    ctx.beginPath();
    ctx.arc(m.x, m.y, m.r, 0, TAU);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawEnemy(ctx, e, time) {
  const def = ENEMY_TYPES[e.type];
  const scale = Math.min(1, e.spawnAge / 0.3 + 0.01);
  ctx.save();
  ctx.translate(e.x, e.y);
  ctx.scale(scale, scale);
  const angle = Math.atan2(e.vy, e.vx);
  ctx.globalAlpha = 0.92;
  ctx.fillStyle = def.color;
  ctx.strokeStyle = 'rgba(0,0,0,0.35)';
  ctx.lineWidth = 2;
  if (def.shape === 'tri') {
    polygon(ctx, 0, 0, e.radius + 2, 3, angle);
    ctx.fill();
    ctx.stroke();
  } else if (def.shape === 'square') {
    ctx.rotate(time * 0.8 + e.id);
    ctx.fillRect(-e.radius, -e.radius, e.radius * 2, e.radius * 2);
    ctx.strokeRect(-e.radius, -e.radius, e.radius * 2, e.radius * 2);
  } else if (def.shape === 'hex') {
    polygon(ctx, 0, 0, e.radius + 2, 6, time * 0.5);
    ctx.fill();
    ctx.stroke();
  } else if (def.shape === 'diamond') {
    polygon(ctx, 0, 0, e.radius + 3, 4, Math.PI / 4 + (e.telegraph > 0 ? Math.sin(time * 30) * 0.15 : 0));
    ctx.fill();
    ctx.stroke();
    if (e.telegraph > 0) {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      polygon(ctx, 0, 0, e.radius + 8, 4, Math.PI / 4);
      ctx.stroke();
    }
  } else if (def.shape === 'crown') {
    polygon(ctx, 0, 0, e.radius, 8, time * 0.25);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#ffd166';
    for (let i = 0; i < 5; i += 1) {
      const a = -Math.PI / 2 + (i - 2) * 0.5;
      polygon(ctx, Math.cos(a) * (e.radius - 6), Math.sin(a) * (e.radius - 6) - 6, 7, 3, a);
      ctx.fill();
    }
  }
  if (e.flash > 0) {
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, 0, e.radius, 0, TAU);
    ctx.fill();
  }
  ctx.restore();

  // Health bar for tough enemies and the boss.
  if (e.maxHp >= 5) {
    const w = e.type === 'boss' ? 120 : 40;
    const y = e.y - e.radius - 12;
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(e.x - w / 2, y, w, 5);
    ctx.fillStyle = def.color;
    ctx.fillRect(e.x - w / 2, y, w * Math.max(0, e.hp / e.maxHp), 5);
  }
}

function drawPlayer(ctx, world, time) {
  const p = world.player;
  if (!p.alive) return;
  const blink = p.invuln > 0 && Math.floor(time * 16) % 2 === 0;
  ctx.save();
  ctx.translate(p.x, p.y);
  if (blink) ctx.globalAlpha = 0.35;

  if (p.aura > 0) {
    ctx.globalAlpha = 0.16 + 0.06 * Math.sin(time * 4);
    ctx.fillStyle = '#ff9f1c';
    ctx.beginPath();
    ctx.arc(0, 0, 110 + p.aura * 20, 0, TAU);
    ctx.fill();
    ctx.globalAlpha = blink ? 0.35 : 1;
  }

  // Aim tick.
  ctx.strokeStyle = PALETTE.playerRing;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(Math.cos(p.angle) * (p.radius + 4), Math.sin(p.angle) * (p.radius + 4));
  ctx.lineTo(Math.cos(p.angle) * (p.radius + 16), Math.sin(p.angle) * (p.radius + 16));
  ctx.stroke();

  ctx.fillStyle = PALETTE.player;
  ctx.strokeStyle = PALETTE.playerRing;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(0, 0, p.radius, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = PALETTE.playerCore;
  ctx.beginPath();
  ctx.arc(0, 0, p.radius * 0.45, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#14101f';
  ctx.beginPath();
  ctx.arc(Math.cos(p.angle) * 6, Math.sin(p.angle) * 6, 4, 0, TAU);
  ctx.fill();
  ctx.restore();
}

export function drawWorld(ctx, world, time) {
  ctx.save();
  if (world.shake > 0.2) {
    const s = world.shake;
    ctx.translate((Math.random() * 2 - 1) * s, (Math.random() * 2 - 1) * s);
  }

  // Pickups.
  for (const pk of world.pickups) {
    const bob = Math.sin(time * 3 + pk.x) * 2;
    if (pk.kind === 'shard') {
      ctx.save();
      ctx.translate(pk.x, pk.y + bob);
      ctx.rotate(time * 2 + pk.x);
      ctx.fillStyle = PALETTE.shard;
      ctx.fillRect(-5, -5, 10, 10);
      ctx.strokeStyle = '#fff3c4';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(-5, -5, 10, 10);
      ctx.restore();
    } else {
      drawHeart(ctx, pk.x, pk.y + bob, 11, PALETTE.heart);
    }
  }

  for (const e of world.enemies) drawEnemy(ctx, e, time);
  drawPlayer(ctx, world, time);

  // Player bullets with a short trail.
  for (const b of world.bullets) {
    ctx.strokeStyle = 'rgba(255, 230, 109, 0.5)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(b.x - b.vx * 0.02, b.y - b.vy * 0.02);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
    ctx.fillStyle = PALETTE.bullet;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.radius, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.radius * 0.45, 0, TAU);
    ctx.fill();
  }

  // Enemy bullets.
  for (const b of world.enemyBullets) {
    ctx.fillStyle = PALETTE.enemyBullet;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.radius, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.radius, 0, TAU);
    ctx.stroke();
  }

  // Particles.
  for (const pt of world.particles) {
    ctx.globalAlpha = Math.max(0, pt.life / pt.maxLife);
    ctx.fillStyle = pt.color;
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, pt.size, 0, TAU);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Floating score text.
  for (const t of world.texts) {
    ctx.globalAlpha = Math.max(0, t.life / t.maxLife);
    ctx.font = `700 ${t.size}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillStyle = t.color;
    ctx.fillText(t.text, t.x, t.y);
  }
  ctx.globalAlpha = 1;
  ctx.restore();

  // Hurt flash.
  if (world.flash > 0) {
    ctx.fillStyle = `rgba(255, 60, 90, ${world.flash * 0.35})`;
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  }
}

function text(ctx, str, x, y, size, color, weight = 700, align = 'center') {
  ctx.font = `${weight} ${size}px system-ui, sans-serif`;
  ctx.textAlign = align;
  ctx.fillStyle = color;
  ctx.fillText(str, x, y);
}

export function drawHud(ctx, world) {
  const p = world.player;
  // Top-left: hearts + level.
  for (let i = 0; i < p.maxHp; i += 1) {
    const x = 34 + i * 30;
    if (i < p.hp) drawHeart(ctx, x, 34, 11, PALETTE.heart);
    else {
      ctx.strokeStyle = 'rgba(255,93,143,0.4)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, 34, 9, 0, TAU);
      ctx.stroke();
    }
  }
  text(ctx, `LVL ${world.level}`, 34, 66, 15, PALETTE.textDim, 700, 'left');

  // Top-center: wave + enemies left.
  text(ctx, `WAVE ${world.wave} / ${TOTAL_WAVES}`, VIEW.width / 2, 36, 22, PALETTE.text, 800);
  const left = world.enemies.length + world.spawnQueue.length;
  text(ctx, left > 0 ? `${left} enemies remain` : 'Wave clear!', VIEW.width / 2, 60, 14, PALETTE.textDim, 600);

  // Top-right: score + kills.
  text(ctx, `${world.score.toLocaleString('en-US')}`, VIEW.width - 34, 38, 26, PALETTE.text, 800, 'right');
  text(ctx, `SCORE   •   ${world.kills} KILLS`, VIEW.width - 34, 62, 13, PALETTE.textDim, 600, 'right');

  // Bottom: XP bar.
  const barW = 520;
  const barX = (VIEW.width - barW) / 2;
  const barY = VIEW.height - 38;
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  rr(ctx, barX - 2, barY - 2, barW + 4, 14, 7);
  ctx.fill();
  ctx.fillStyle = '#3a2f5e';
  rr(ctx, barX, barY, barW, 10, 5);
  ctx.fill();
  const frac = Math.max(0, Math.min(1, world.xp / world.xpNext));
  if (frac > 0) {
    ctx.fillStyle = PALETTE.accent;
    rr(ctx, barX, barY, barW * frac, 10, 5);
    ctx.fill();
  }
  text(ctx, `XP ${world.xp} / ${world.xpNext}`, VIEW.width / 2, barY + 28, 12, PALETTE.textDim, 600);

  // Boss health bar.
  const boss = world.enemies.find((e) => e.type === 'boss');
  if (boss) {
    const bw = 420;
    const bx = (VIEW.width - bw) / 2;
    const by = 78;
    text(ctx, 'THE ASHEN KING', VIEW.width / 2, by + 14, 14, PALETTE.boss, 800);
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    rr(ctx, bx, by + 20, bw, 10, 5);
    ctx.fill();
    ctx.fillStyle = PALETTE.boss;
    rr(ctx, bx, by + 20, bw * Math.max(0, boss.hp / boss.maxHp), 10, 5);
    ctx.fill();
  }
}

function panel(ctx, x, y, w, h) {
  ctx.fillStyle = PALETTE.panel;
  rr(ctx, x, y, w, h, 14);
  ctx.fill();
  ctx.strokeStyle = PALETTE.panelEdge;
  ctx.lineWidth = 1.5;
  rr(ctx, x, y, w, h, 14);
  ctx.stroke();
}

export function drawTitle(ctx, time, bestScore) {
  ctx.fillStyle = 'rgba(10, 7, 20, 0.55)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  const pulse = 1 + Math.sin(time * 2.4) * 0.02;
  ctx.save();
  ctx.translate(VIEW.width / 2, 236);
  ctx.scale(pulse, pulse);
  ctx.font = '800 96px system-ui, sans-serif';
  ctx.textAlign = 'center';
  const grad = ctx.createLinearGradient(0, -70, 0, 10);
  grad.addColorStop(0, '#ffe66d');
  grad.addColorStop(0.55, '#ff9f1c');
  grad.addColorStop(1, '#ff5d3d');
  ctx.fillStyle = grad;
  ctx.fillText('EMBERFALL', 0, 0);
  ctx.font = '800 34px system-ui, sans-serif';
  ctx.fillStyle = PALETTE.text;
  ctx.fillText('A R E N A', 0, 46);
  ctx.restore();

  text(ctx, 'Hold the arena. Ten waves. One warden. No mercy.', VIEW.width / 2, 330, 19, PALETTE.textDim, 600);
  if (bestScore > 0) {
    text(ctx, `BEST SCORE  ${bestScore.toLocaleString('en-US')}`, VIEW.width / 2, 362, 15, PALETTE.accent, 700);
  }

  const boxW = 460;
  const boxX = (VIEW.width - boxW) / 2;
  panel(ctx, boxX, 392, boxW, CONTROLS.length * 30 + 28);
  CONTROLS.forEach(([label, keys], i) => {
    const y = 392 + 34 + i * 30;
    text(ctx, label, boxX + 24, y, 15, PALETTE.textDim, 600, 'left');
    text(ctx, keys, boxX + boxW - 24, y, 15, PALETTE.text, 700, 'right');
  });

  const blink = Math.floor(time * 1.6) % 2 === 0;
  if (blink) text(ctx, 'CLICK OR PRESS ENTER TO START', VIEW.width / 2, 672, 20, PALETTE.accent, 800);
}

export function drawUpgrade(ctx, choices, level, mouse, taken) {
  ctx.fillStyle = 'rgba(10, 7, 20, 0.62)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  text(ctx, `LEVEL ${level}  —  CHOOSE AN UPGRADE`, VIEW.width / 2, 130, 30, PALETTE.text, 800);
  text(ctx, 'Click a card, or press 1, 2 or 3', VIEW.width / 2, 164, 16, PALETTE.textDim, 600);

  const cardW = 300;
  const cardH = 300;
  const gap = 36;
  const totalW = cardW * 3 + gap * 2;
  const startX = (VIEW.width - totalW) / 2;
  const y = 210;
  choices.forEach((choice, i) => {
    const x = startX + i * (cardW + gap);
    const hover = mouse.x >= x && mouse.x <= x + cardW && mouse.y >= y && mouse.y <= y + cardH;
    ctx.save();
    if (hover) ctx.translate(0, -8);
    ctx.fillStyle = hover ? 'rgba(38, 26, 60, 0.95)' : PALETTE.panel;
    rr(ctx, x, y, cardW, cardH, 14);
    ctx.fill();
    ctx.strokeStyle = hover ? PALETTE.accent : PALETTE.panelEdge;
    ctx.lineWidth = hover ? 2.5 : 1.5;
    rr(ctx, x, y, cardW, cardH, 14);
    ctx.stroke();

    ctx.fillStyle = PALETTE.accent;
    ctx.beginPath();
    ctx.arc(x + cardW / 2, y + 58, 30, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#14101f';
    ctx.font = '800 26px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(String(i + 1), x + cardW / 2, y + 67);

    text(ctx, choice.name, x + cardW / 2, y + 132, 24, PALETTE.text, 800);
    const lvl = taken[choice.id] ?? 0;
    for (let p = 0; p < choice.max; p += 1) {
      ctx.fillStyle = p < lvl ? PALETTE.accent : 'rgba(255,255,255,0.18)';
      ctx.beginPath();
      ctx.arc(x + cardW / 2 + (p - (choice.max - 1) / 2) * 22, y + 162, 6, 0, TAU);
      ctx.fill();
    }
    // Wrap the description over two lines if it is long.
    const words = choice.desc.split(' ');
    let line = '';
    const lines = [];
    for (const word of words) {
      if ((line + ' ' + word).trim().length > 26) {
        lines.push(line.trim());
        line = word;
      } else line += ' ' + word;
    }
    lines.push(line.trim());
    lines.forEach((ln, li) => text(ctx, ln, x + cardW / 2, y + 208 + li * 24, 16, PALETTE.textDim, 600));
    ctx.restore();
  });
}

export function drawPaused(ctx) {
  ctx.fillStyle = 'rgba(10, 7, 20, 0.6)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  text(ctx, 'PAUSED', VIEW.width / 2, 330, 56, PALETTE.text, 800);
  text(ctx, 'Press P or click to resume  •  M to mute', VIEW.width / 2, 380, 18, PALETTE.textDim, 600);
}

function statLine(ctx, label, value, x, y) {
  text(ctx, label, x, y, 17, PALETTE.textDim, 600, 'left');
  text(ctx, value, x + 420, y, 17, PALETTE.text, 800, 'right');
}

export function drawGameOver(ctx, world, time) {
  ctx.fillStyle = 'rgba(10, 7, 20, 0.66)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  panel(ctx, VIEW.width / 2 - 290, 170, 580, 380);
  text(ctx, 'THE EMBERS FADE', VIEW.width / 2, 250, 46, PALETTE.bad, 800);
  text(ctx, 'The arena claims another warden.', VIEW.width / 2, 288, 17, PALETTE.textDim, 600);
  statLine(ctx, 'SCORE', world.score.toLocaleString('en-US'), VIEW.width / 2 - 210, 340);
  statLine(ctx, 'WAVE REACHED', `${world.wave} / ${TOTAL_WAVES}`, VIEW.width / 2 - 210, 372);
  statLine(ctx, 'ENEMIES FELLED', String(world.kills), VIEW.width / 2 - 210, 404);
  statLine(ctx, 'LEVEL', String(world.level), VIEW.width / 2 - 210, 436);
  const blink = Math.floor(time * 1.6) % 2 === 0;
  if (blink) text(ctx, 'PRESS R OR CLICK TO TRY AGAIN', VIEW.width / 2, 512, 19, PALETTE.accent, 800);
}

export function drawVictory(ctx, world, time) {
  ctx.fillStyle = 'rgba(10, 7, 20, 0.6)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  panel(ctx, VIEW.width / 2 - 290, 170, 580, 380);
  text(ctx, 'THE ARENA IS YOURS', VIEW.width / 2, 250, 44, PALETTE.good, 800);
  text(ctx, 'Ten waves. The Ashen King falls. The embers bow to you.', VIEW.width / 2, 288, 17, PALETTE.textDim, 600);
  statLine(ctx, 'FINAL SCORE', world.score.toLocaleString('en-US'), VIEW.width / 2 - 210, 340);
  statLine(ctx, 'WAVES CLEARED', `${TOTAL_WAVES} / ${TOTAL_WAVES}`, VIEW.width / 2 - 210, 372);
  statLine(ctx, 'ENEMIES FELLED', String(world.kills), VIEW.width / 2 - 210, 404);
  statLine(ctx, 'LEVEL', String(world.level), VIEW.width / 2 - 210, 436);
  const blink = Math.floor(time * 1.6) % 2 === 0;
  if (blink) text(ctx, 'PRESS R OR CLICK TO PLAY AGAIN', VIEW.width / 2, 512, 19, PALETTE.accent, 800);
}

export function drawWaveBanner(ctx, world) {
  const age = world.time - (world.waveStartAt ?? 0);
  if (world.waveState !== 'spawning' || age > 2) return;
  const alpha = age < 1.6 ? 1 : 1 - (age - 1.6) / 0.4;
  ctx.save();
  ctx.globalAlpha = Math.max(0, alpha);
  text(ctx, `WAVE ${world.wave}`, VIEW.width / 2, 300, 54, PALETTE.text, 800);
  if (world.wave === TOTAL_WAVES) {
    text(ctx, 'THE ASHEN KING AWAKENS', VIEW.width / 2, 340, 20, PALETTE.boss, 800);
  }
  ctx.restore();
}
