// Level-up upgrade choices for EMBERFALL ARENA.
// One clear job: offer three upgrades the player has not maxed yet, and apply
// the one they pick. Each upgrade knows its own target (weapon or player),
// so this file never touches game balance numbers directly.

import { UPGRADES } from './config.js';

export function rollUpgrades(rng, taken) {
  const available = UPGRADES.filter((u) => (taken[u.id] ?? 0) < u.max);
  const picks = [];
  const pool = [...available];
  while (picks.length < 3 && pool.length > 0) {
    const index = Math.floor(rng.next() * pool.length);
    picks.push(pool.splice(index, 1)[0]);
  }
  return picks;
}

export function applyUpgrade(upgrade, weapon, player, taken) {
  if (upgrade.target === 'player') upgrade.apply(player);
  else upgrade.apply(weapon);
  taken[upgrade.id] = (taken[upgrade.id] ?? 0) + 1;
}

export function upgradeLevel(taken, id) {
  return taken[id] ?? 0;
}
