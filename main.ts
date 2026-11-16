// EMBERFALL ARENA — the entry program for best-game-01 (Node 22, stdlib only).
//
// The game itself is game/: plain static files a desktop browser loads
// offline (game/index.html plus its ES modules, no library, no network
// request). This program hands it in: it copies game/ and screenshots/ from
// beside this file to /output and writes /output/dossier.json, the summary
// the judge reads, with the vendored make.fun library.
//
// Outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
//
// The program is deterministic: it reads files, copies them and hashes them,
// and writes the same bytes every run — no clock, no randomness, no network.

import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// Clear only the paths this program writes, so a re-run never carries stale
// files from an earlier entry (a stale screenshot would silently survive an
// otherwise clean copy).
for (const name of ['game', 'screenshots', 'dossier.json']) {
  rmSync(join(out, name), { recursive: true, force: true });
}

mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
}

// The scorer's own caps (from the kit's gate): only text_max_bytes shapes
// the dossier's bytes; the others refuse an entry the scorer would refuse
// (more than 4 screenshots or one over 256 KiB; more than 993 files in game/
// or 48 MiB of game files in all, or a path under game/ over 1000 bytes:
// game/ counts beside /output's own 1000-entry cap, its screenshots/ and
// dossier.json).
const dossier = buildDossier(out, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});
writeFileSync(join(out, 'dossier.json'), dossier);

// A short run summary on stdout: counts only, nothing time-varying, so the
// program's output stays deterministic run to run.
function countFiles(dir) {
  let files = 0;
  for (const name of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, name.name);
    files += name.isDirectory() ? countFiles(path) : 1;
  }
  return files;
}
const gameFiles = countFiles(join(out, 'game'));
const shots = readdirSync(join(out, 'screenshots')).filter((n) => !n.startsWith('.'));
const dossierBytes = statSync(join(out, 'dossier.json')).size;
console.log(`emberfall-arena: ${gameFiles} game files, ${shots.length} screenshots, dossier.json ${dossierBytes} bytes -> ${out}`);
