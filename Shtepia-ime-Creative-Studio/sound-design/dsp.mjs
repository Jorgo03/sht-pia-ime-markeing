// Tiny deterministic DSP toolkit for original, licence-free sound.
// Generalised from the app repo's marketing/launch-video/audio/score.mjs.
// No samples: every sound is synthesised from oscillators and seeded noise.
import fs from 'node:fs';

export const SR = 48000;
export const midi = (m) => 440 * 2 ** ((m - 69) / 12);
const smooth = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));

// Piecewise automation through [time, value] points (smoothstep between).
export const env = (pts) => (t) => {
  if (t <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) {
    if (t <= pts[i][0]) {
      const [t0, v0] = pts[i - 1]; const [t1, v1] = pts[i];
      return v0 + (v1 - v0) * smooth((t - t0) / (t1 - t0));
    }
  }
  return pts[pts.length - 1][1];
};

export class Mix {
  constructor(seconds, seed = 7) {
    this.N = Math.ceil(seconds * SR);
    this.L = new Float32Array(this.N); this.R = new Float32Array(this.N);
    this.sendL = new Float32Array(this.N); this.sendR = new Float32Array(this.N);
    this.seed = seed >>> 0 || 7;
  }
  rand() { this.seed = (this.seed * 1664525 + 1013904223) >>> 0; return (this.seed / 2 ** 32) * 2 - 1; }
  add(i, l, r, wet = 0) {
    if (i < 0 || i >= this.N) return;
    this.L[i] += l; this.R[i] += r; this.sendL[i] += l * wet; this.sendR[i] += r * wet;
  }

  // Warm pad: detuned saws through a one-pole low-pass (cutoff(t) in Hz).
  pad(notes, t0, t1, gain, cutoff, { wet = 0.5, attack = 0.9, release = 0.9 } = {}) {
    const g0 = typeof gain === 'number' ? () => gain : gain;
    const c0 = typeof cutoff === 'number' ? () => cutoff : cutoff;
    const a = Math.floor(t0 * SR), b = Math.min(this.N, Math.floor(t1 * SR));
    notes.forEach((m, k) => {
      const fr = [-0.08, 0, 0.07].map((d) => midi(m + d));
      const ph = fr.map((_, v) => (k * 0.37 + v * 0.21) % 1);
      let lp = 0; const pan = ((k % 2) * 2 - 1) * 0.35;
      for (let i = a; i < b; i++) {
        const t = i / SR; let s = 0;
        for (let v = 0; v < 3; v++) { ph[v] = (ph[v] + fr[v] / SR) % 1; s += ph[v] * 2 - 1; }
        lp += (s / 3 - lp) * (1 - Math.exp((-2 * Math.PI * c0(t)) / SR));
        const fade = Math.max(0, Math.min(1, (t - t0) / attack, (t1 - t) / release));
        const g = (g0(t) * fade) / notes.length;
        this.add(i, lp * g * (1 - pan), lp * g * (1 + pan), wet);
      }
    });
  }
  // Felt-piano pluck: decaying harmonics, soft attack.
  pluck(m, t, gain, { decay = 1.6, pan = 0, wet = 0.45, bright = 1 } = {}) {
    const f = midi(m); const a = Math.floor(t * SR); const len = Math.floor(decay * 2.2 * SR);
    const harm = [[1, 1], [2, 0.42 * bright], [3, 0.16 * bright], [4.01, 0.07 * bright]];
    for (let j = 0; j < len; j++) {
      const tt = j / SR; let s = 0;
      for (const [h, amp] of harm) s += Math.sin(2 * Math.PI * f * h * tt) * amp * Math.exp((-tt * h) / decay);
      const v = s * gain * Math.min(1, tt / 0.004);
      this.add(a + j, v * (1 - pan), v * (1 + pan), wet);
    }
  }
  // Kick / boom: a sine dropping in pitch.
  kick(t, gain, { low = 45, high = 90, drop = 28, decay = 7, len = 0.45, wet = 0.05 } = {}) {
    const a = Math.floor(t * SR); let ph = 0;
    for (let j = 0; j < len * SR; j++) {
      const tt = j / SR; ph += (2 * Math.PI * (low + high * Math.exp(-tt * drop))) / SR;
      const v = Math.sin(ph) * Math.exp(-tt * decay) * gain;
      this.add(a + j, v, v, wet);
    }
  }
  // Filtered noise with a shape(x in 0..1) envelope; `hp` 0..1 brightens,
  // `sweep` moves a low-pass from lpFrom to lpTo Hz over the sound.
  noise(t0, dur, gain, { hp = 0.9, shape = (x) => Math.exp(-x * 40), pan = 0, wet = 0.3, lpFrom = 12000, lpTo = 12000, panSweep = 0 } = {}) {
    const a = Math.floor(t0 * SR); const len = Math.floor(dur * SR);
    let prev = 0, lp = 0, lp2 = 0;
    for (let j = 0; j < len; j++) {
      const x = j / len; const n = this.rand();
      const h = n - prev * hp; prev = n;
      const fc = lpFrom + (lpTo - lpFrom) * x; const k = 1 - Math.exp((-2 * Math.PI * fc) / SR);
      lp += (h - lp) * k; lp2 += (lp - lp2) * k;
      const p = pan + panSweep * (x * 2 - 1);
      const v = lp2 * gain * shape(x);
      this.add(a + j, v * (1 - p), v * (1 + p), wet);
    }
  }
  // Sine tone with envelope (sub swells, soft UI tones). Not used for chimes.
  tone(t0, t1, f, gain, { wet = 0, pan = 0 } = {}) {
    const g0 = typeof gain === 'number' ? () => gain : gain;
    const a = Math.floor(t0 * SR), b = Math.min(this.N, Math.floor(t1 * SR));
    for (let i = a; i < b; i++) { const t = i / SR; const v = Math.sin(2 * Math.PI * f * t) * g0(t); this.add(i, v * (1 - pan), v * (1 + pan), wet); }
  }

  // Schroeder reverb on the send bus, then saturation, fade, normalise.
  master({ reverb = 0.55, fadeOut = 0.4, peak = 0.89, drive = 1.2 } = {}) {
    const rv = (input, combs, aps, fb = 0.84, damp = 0.25) => {
      const out = new Float32Array(this.N);
      for (const d of combs) {
        const buf = new Float32Array(d); let idx = 0, lp = 0;
        for (let i = 0; i < this.N; i++) { const y = buf[idx]; lp = y * (1 - damp) + lp * damp; buf[idx] = input[i] + lp * fb; out[i] += y / combs.length; idx = (idx + 1) % d; }
      }
      for (const d of aps) {
        const buf = new Float32Array(d); let idx = 0;
        for (let i = 0; i < this.N; i++) { const bv = buf[idx]; const y = -out[i] + bv; buf[idx] = out[i] + bv * 0.5; out[i] = y; idx = (idx + 1) % d; }
      }
      return out;
    };
    const s = SR / 44100;
    const rL = rv(this.sendL, [1557, 1617, 1491, 1422].map((x) => Math.round(x * s)), [225, 556].map((x) => Math.round(x * s)));
    const rR = rv(this.sendR, [1580, 1640, 1514, 1445].map((x) => Math.round(x * s)), [248, 579].map((x) => Math.round(x * s)));
    let pk = 0;
    for (let i = 0; i < this.N; i++) {
      const f = fadeOut > 0 ? Math.min(1, (this.N - i) / (fadeOut * SR)) : 1;
      this.L[i] = Math.tanh((this.L[i] + rL[i] * reverb) * drive) * f;
      this.R[i] = Math.tanh((this.R[i] + rR[i] * reverb) * drive) * f;
      pk = Math.max(pk, Math.abs(this.L[i]), Math.abs(this.R[i]));
    }
    const g = pk > 0 ? peak / pk : 1;
    for (let i = 0; i < this.N; i++) { this.L[i] *= g; this.R[i] *= g; }
    return this;
  }

  // Time (s) of the loudest sample: where a sound "hits".
  peakTime() {
    let pk = 0, at = 0;
    for (let i = 0; i < this.N; i++) { const v = Math.max(Math.abs(this.L[i]), Math.abs(this.R[i])); if (v > pk) { pk = v; at = i; } }
    return at / SR;
  }

  wav(file) {
    const n = this.N; const buf = Buffer.alloc(44 + n * 4);
    buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * 4, 4); buf.write('WAVE', 8);
    buf.write('fmt ', 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22);
    buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34);
    buf.write('data', 36); buf.writeUInt32LE(n * 4, 40);
    for (let i = 0; i < n; i++) {
      buf.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(this.L[i] * 32767))), 44 + i * 4);
      buf.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(this.R[i] * 32767))), 46 + i * 4);
    }
    fs.writeFileSync(file, buf);
    return file;
  }
}
