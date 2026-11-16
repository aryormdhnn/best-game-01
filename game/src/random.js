// Seeded randomness for EMBERFALL ARENA.
// mulberry32 is small, fast and deterministic: the same seed replays the same
// arena, which is what the staged screenshot scenes rely on. Live play seeds
// from Math.random once at start; staged scenes seed from the ?seed= query.

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function makeRng(seed) {
  const next = mulberry32(seed);
  return {
    next,
    // Float in [min, max).
    range(min, max) {
      return min + next() * (max - min);
    },
    // Integer in [min, max] inclusive.
    int(min, max) {
      return Math.floor(min + next() * (max - min + 1));
    },
    // One element of an array.
    pick(array) {
      return array[Math.floor(next() * array.length)];
    },
    // Angle in radians, uniform over the circle.
    angle() {
      return next() * Math.PI * 2;
    },
  };
}
