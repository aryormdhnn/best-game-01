// Synthesised sound for EMBERFALL ARENA — no audio files, everything is
// WebAudio oscillators and filtered noise, built on first user gesture (the
// browser will not let audio start before one). A tiny step sequencer plays a
// quiet bass pulse under the game; M mutes everything.

export function createAudio() {
  let ctx = null;
  let master = null;
  let musicGain = null;
  let muted = false;
  let musicTimer = null;
  let step = 0;

  // A minor-key bass line the sequencer walks, one note per step.
  const BASS = [55, 0, 55, 65.41, 0, 55, 49, 58.27, 55, 0, 55, 65.41, 73.42, 0, 65.41, 49];

  function ensure() {
    if (ctx) {
      if (ctx.state === 'suspended') void ctx.resume();
      return true;
    }
    try {
      const AC = window.AudioContext ?? window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : 0.5;
      master.connect(ctx.destination);
      musicGain = ctx.createGain();
      musicGain.gain.value = 0.16;
      musicGain.connect(master);
      startMusic();
      return true;
    } catch {
      return false;
    }
  }

  function tone({ freq, endFreq = null, dur, type = 'square', vol = 0.2, when = 0 }) {
    if (!ctx || muted) return;
    const t0 = ctx.currentTime + when;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(Math.max(20, freq), t0);
    if (endFreq !== null) osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), t0 + dur);
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain);
    gain.connect(master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  function noise({ dur, vol = 0.25, freq = 1200, when = 0 }) {
    if (!ctx || muted) return;
    const t0 = ctx.currentTime + when;
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = freq;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    src.start(t0);
  }

  function startMusic() {
    if (musicTimer !== null) return;
    musicTimer = window.setInterval(() => {
      if (!ctx || muted) return;
      const freq = BASS[step % BASS.length];
      step += 1;
      if (freq > 0) {
        const t0 = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.5, t0);
        gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.42);
        osc.connect(gain);
        gain.connect(musicGain);
        osc.start(t0);
        osc.stop(t0 + 0.45);
      }
      // A soft hat tick on every other step keeps the pulse moving.
      if (step % 2 === 0) noise({ dur: 0.03, vol: 0.05, freq: 6000 });
    }, 240);
  }

  return {
    // Call from any user gesture (click / key) so audio is allowed to start.
    unlock() {
      ensure();
    },
    toggleMute() {
      muted = !muted;
      if (master) master.gain.value = muted ? 0 : 0.5;
      return muted;
    },
    isMuted() {
      return muted;
    },
    shoot() {
      tone({ freq: 720, endFreq: 190, dur: 0.09, type: 'square', vol: 0.08 });
    },
    enemyShoot() {
      tone({ freq: 320, endFreq: 140, dur: 0.12, type: 'sawtooth', vol: 0.05 });
    },
    hit() {
      noise({ dur: 0.06, vol: 0.12, freq: 2400 });
    },
    explode() {
      noise({ dur: 0.35, vol: 0.3, freq: 900 });
      tone({ freq: 160, endFreq: 40, dur: 0.3, type: 'sine', vol: 0.3 });
    },
    pickup() {
      tone({ freq: 880, dur: 0.07, type: 'sine', vol: 0.12 });
      tone({ freq: 1318, dur: 0.09, type: 'sine', vol: 0.1, when: 0.06 });
    },
    hurt() {
      tone({ freq: 220, endFreq: 55, dur: 0.25, type: 'sawtooth', vol: 0.22 });
      noise({ dur: 0.15, vol: 0.18, freq: 700 });
    },
    levelUp() {
      [523, 659, 784, 1047].forEach((f, i) => tone({ freq: f, dur: 0.16, type: 'sine', vol: 0.14, when: i * 0.07 }));
    },
    waveClear() {
      [392, 523, 659].forEach((f, i) => tone({ freq: f, dur: 0.18, type: 'triangle', vol: 0.14, when: i * 0.09 }));
    },
    boss() {
      tone({ freq: 98, endFreq: 36, dur: 0.8, type: 'sawtooth', vol: 0.25 });
      noise({ dur: 0.7, vol: 0.2, freq: 400 });
    },
    click() {
      tone({ freq: 660, dur: 0.05, type: 'sine', vol: 0.12 });
    },
    victory() {
      [523, 659, 784, 1047, 1319].forEach((f, i) => tone({ freq: f, dur: 0.25, type: 'triangle', vol: 0.15, when: i * 0.1 }));
    },
  };
}
