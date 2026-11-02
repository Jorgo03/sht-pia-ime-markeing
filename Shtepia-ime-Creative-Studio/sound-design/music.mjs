// Original music beds composed to a film's own cuts (no samples, no licence).
// A bed is a plan: length, tempo, mood, and the moments that matter:
//   { duration: 20, bpm: 100, mood: 'warm', hits: [2.9, 12.0], payoff: 17.4, end: 20 }
// - hits:   scene cuts that get a soft kick + a motif note
// - payoff: the one big moment (riser into it, wide chord on it)
// - mood:   warm | night | bright | cinematic | paper (changes chords, pulse, colour)
// Used by `studio music` and by the builder when storyboard.audio.music.bed is set.
import { Mix, env, SR } from './dsp.mjs';

const MOODS = {
  // [chords per bar (MIDI), pulse density 0..1, pad cutoff range, pluck brightness]
  warm: { chords: [[50, 57, 62, 64, 66, 69], [47, 54, 59, 62, 66, 69], [43, 50, 55, 59, 62, 66], [45, 52, 57, 61, 64, 69]], pulse: 0.7, cut: [700, 3600], bright: 0.7, motif: [69, 66, 74, 73, 69, 71] },
  night: { chords: [[45, 52, 57, 60, 64], [41, 48, 53, 57, 60], [43, 50, 55, 59, 62], [40, 47, 52, 55, 59]], pulse: 0.55, cut: [400, 2200], bright: 0.5, motif: [64, 60, 67, 64, 62, 60] },
  bright: { chords: [[48, 55, 60, 64, 67, 71], [45, 52, 57, 60, 64, 69], [41, 48, 53, 57, 60, 65], [43, 50, 55, 59, 62, 67]], pulse: 1.0, cut: [1200, 5200], bright: 1.0, motif: [72, 71, 67, 76, 74, 72] },
  cinematic: { chords: [[38, 45, 50, 57, 62], [34, 41, 46, 53, 58], [36, 43, 48, 55, 60], [33, 40, 45, 52, 57]], pulse: 0.25, cut: [300, 2600], bright: 0.45, motif: [62, 65, 69, 67, 65, 62] },
  paper: { chords: [[55, 59, 62, 66, 71], [52, 55, 59, 64, 67], [48, 52, 55, 60, 64], [50, 54, 57, 62, 66]], pulse: 0.85, cut: [1600, 4200], bright: 0.9, motif: [74, 71, 79, 78, 74, 76] },
};

export function composeBed({ duration = 20, bpm = 100, mood = 'warm', hits = [], payoff = null, intro = 1.2, seed = 7 } = {}) {
  const M = MOODS[mood] || MOODS.warm;
  const m = new Mix(duration + 0.2, seed);
  const beat = 60 / bpm, bar = beat * 4;
  const payT = payoff ?? Math.max(duration - 4, duration * 0.75);
  const cut = env([[0, M.cut[0]], [payT, M.cut[1]], [duration, M.cut[0] * 1.2]]);

  // Pads: one chord per bar, the progression looping.
  for (let b = 0, t = 0; t < duration; b++, t += bar) {
    const ch = M.chords[b % M.chords.length];
    const g = t >= payT ? 0.55 : t < intro ? 0.3 : 0.42;
    m.pad(ch, Math.max(0, t - 0.05), Math.min(duration, t + bar + 0.1), g, cut, { wet: 0.5, attack: t === 0 ? 1.0 : 0.08, release: 0.15 });
  }
  // Pulse: eighth-note plucks over the chord tones after the intro.
  for (let i = 0, t = intro; t < payT - 0.1; i++, t = intro + i * (beat / 2)) {
    if ((i % 4 === 3 && M.pulse < 0.6) || (i % 2 && M.pulse < 0.4)) continue;
    const b = Math.floor(t / bar); const ch = M.chords[b % M.chords.length];
    const tones = ch.slice(-4);
    m.pluck(tones[(i * 3 + b) % tones.length] + 12, t, i % 2 ? 0.04 : 0.06, { decay: 0.35, pan: i % 2 ? 0.35 : -0.35, wet: 0.35, bright: M.bright * 0.7 });
  }
  // Soft kick on the beat once the pulse is in (not under the intro).
  if (M.pulse > 0.5) for (let t = intro + bar; t < payT - beat; t += beat) m.kick(t, 0.22, { len: 0.35 });
  // Hits on the film's cuts: a kick + one motif note each.
  hits.forEach((h, i) => { if (h < duration - 0.3) { m.kick(h, 0.36); m.pluck(M.motif[i % M.motif.length], h + 0.01, 0.1, { decay: 1.6, wet: 0.6, bright: M.bright }); } });
  // Riser into the payoff, then the wide chord + boom.
  if (payT > 2.2) m.noise(payT - 1.8, 1.78, 0.14, { hp: 0.3, lpFrom: 600, lpTo: 8000, wet: 0.6, shape: (x) => x ** 2.5 * (x < 0.98 ? 1 : (1 - x) * 50) });
  m.kick(payT, 0.7, { low: 36, high: 70, drop: 14, decay: 3, len: 1.4, wet: 0.2 });
  const home = M.chords[0];
  m.pad([...home, home[home.length - 1] + 5], payT, duration + 0.2, env([[payT, 0.75], [payT + 1, 0.55], [duration, 0.25]]), env([[payT, 4000], [duration, 1000]]), { wet: 0.7, attack: 0.03, release: 0.6 });
  home.slice(-5).forEach((n, k) => m.pluck(n + 12, payT + k * 0.035, 0.08, { decay: 2.4, pan: (k - 2) * 0.2, wet: 0.75, bright: M.bright }));

  m.master({ reverb: 0.55, fadeOut: 0.8, peak: 0.8 });
  return m;
}

export const moods = Object.keys(MOODS);
export { SR };
