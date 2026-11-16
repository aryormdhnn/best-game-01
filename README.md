# Emberfall Arena

[![best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/c/best-game-01)
[![rank](https://make.fun/badge/best-game-01/aryormdhnn/best-game-01/rank.svg)](https://make.fun/c/best-game-01)
[![reward](https://make.fun/badge/best-game-01/aryormdhnn/best-game-01/reward.svg)](https://make.fun/c/best-game-01)

An original 2D roguelite arena shooter for the [make.fun](https://make.fun)
best-game-01 bounty. Hold the arena through ten waves, level up, choose
upgrades, and face the Ashen King.

## Play

Open `game/index.html` in a desktop browser (serve `game/` with any static
server, e.g. `python3 -m http.server` from inside `game/`), or play the
entry the way the bounty serves it: static files only, no network requests,
no build step.

| Action | Control |
| --- | --- |
| Move | WASD / Arrow keys |
| Aim | Mouse |
| Fire | Hold left click / Space |
| Pause | P |
| Mute | M |
| Restart | R |
| Pick upgrade | 1 / 2 / 3 or click a card |

## The game

You are the Ember Warden, a lone light in a dark arena. Enemies arrive in
waves — Cinders that chase, Sparkers that shoot, Splinters that break apart,
Darters that telegraph and dash — and on wave 10, the Ashen King.

- **Ten waves, one boss.** Clear a wave for a score bonus; wave 10 ends the
  run in victory or defeat.
- **Level up, choose.** Fallen enemies drop ember shards. Fill the XP bar to
  level up and pick 1 of 3 upgrades: heavier rounds, faster fire, twin shot,
  piercing, a burning aura, and more. Nine upgrades, each stackable.
- **Feedback everywhere.** Particles, screen shake, floating score text,
  hit flashes, and a fully synthesised WebAudio soundscape (sound effects
  plus a bass-pulse music loop, M to mute).
- **Complete loop.** Title screen with controls, HUD (hearts, wave, score,
  kills, XP), pause, game-over and victory screens with stats and restart.
  Best score is kept in localStorage.

## Structure

```
main.ts            the entry program: copies game/ + screenshots/ to /output
                   and writes /output/dossier.json (Node 22, stdlib only)
game/
  index.html       the page; loads src/main.js as a module
  src/
    config.js      tuning, palette, waves, upgrade definitions
    random.js      seeded RNG (mulberry32)
    input.js       keyboard + mouse, in logical 1280x720 space
    audio.js       synthesised WebAudio SFX + music loop
    upgrades.js    level-up rolls and application
    world.js       the simulation: player, enemies, bullets, waves, pickups
    render.js      all canvas drawing: arena, entities, HUD, screens
    shots.js       deterministic staged scenes (?shot=start|play|upgrade|end)
    main.js        bootstrap, game loop and state machine
screenshots/      1-title, 2-play, 3-upgrade, 4-victory (cover first by name)
vendor/
  makefun-game.ts  the kit's dossier library, unchanged
```

The game is entirely original: its own code, art drawn in canvas, sounds
synthesised in WebAudio, and names invented for it. No assets are borrowed
from anywhere.

## License

MIT — see [LICENSE](LICENSE).
