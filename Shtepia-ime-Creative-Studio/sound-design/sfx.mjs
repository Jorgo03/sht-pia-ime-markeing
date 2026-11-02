#!/usr/bin/env node
// Generates the kit's ORIGINAL sound-effect library into assets/sound/sfx/
// (as .m4a) and writes assets/sound/sfx/library.json: one entry per sound
// with its file, length, peak time (where it "hits") and what it is for.
// Repeated sounds get 2–3 takes so a film never plays the same whoosh twice.
//
//   node sound-design/sfx.mjs
//
// The library also lists the Pixabay sounds that ship with HyperFrames
// (assets/sound/sfx/*.mp3, see CREDITS.md); peaks are measured for those too.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { Mix, env, SR } from './dsp.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'assets/sound/sfx');
const TMP = fs.mkdtempSync(path.join(fs.realpathSync(process.env.TMPDIR || '/tmp'), 'sfx-'));
fs.mkdirSync(OUT, { recursive: true });

const defs = [];
const def = (id, use, len, fn, opts = {}) => defs.push({ id, use, len, fn, opts });

// ---- Whooshes (scene cuts, big cards moving fast) ----
for (const [k, seed] of [[1, 3], [2, 17], [3, 29]]) {
  def(`whoosh-air-${k}`, 'scene cut / fast card move', 0.7, (m) => {
    m.seed = seed;
    m.noise(0.02, 0.62, 0.55, { hp: 0.2, lpFrom: 700 + k * 150, lpTo: 5200, wet: 0.25, panSweep: 0.5 * (k % 2 ? 1 : -1),
      shape: (x) => Math.sin(Math.PI * Math.pow(x, 0.7)) ** 2 });
  });
}
for (const [k, seed] of [[1, 5], [2, 41]]) {
  def(`whoosh-paper-${k}`, 'paper sheet sliding / print-mode transition', 0.55, (m) => {
    m.seed = seed;
    m.noise(0.0, 0.5, 0.45, { hp: 0.75, lpFrom: 2500, lpTo: 9000, wet: 0.12, shape: (x) => Math.sin(Math.PI * x) * (0.7 + 0.3 * Math.sin(x * 60)) });
  });
}
def('whoosh-deep', 'camera dive / zoom-through', 1.1, (m) => {
  m.noise(0.0, 1.0, 0.6, { hp: 0.05, lpFrom: 250, lpTo: 2200, wet: 0.4, shape: (x) => x ** 2 * (x < 0.9 ? 1 : (1 - x) * 10) });
  m.kick(0.92, 0.35, { low: 38, high: 50, decay: 5, len: 0.6 });
});

// ---- Impacts ----
def('impact-soft', 'headline landing, chapter beat', 1.2, (m) => {
  m.kick(0.01, 0.75, { low: 42, high: 80, drop: 22, decay: 5, len: 1.1 });
  m.noise(0.0, 0.09, 0.22, { hp: 0.5, lpTo: 3000, wet: 0.5 });
});
def('impact-cinema', 'the payoff, once per film', 2.2, (m) => {
  m.kick(0.01, 0.9, { low: 34, high: 70, drop: 14, decay: 2.6, len: 2.0, wet: 0.2 });
  m.noise(0.0, 0.25, 0.3, { hp: 0.3, lpFrom: 6000, lpTo: 600, wet: 0.7, shape: (x) => Math.exp(-x * 6) });
  m.tone(0.0, 2.0, 41.2, env([[0, 0.25], [2, 0]]));
});
def('impact-type', 'kinetic type slam', 0.5, (m) => {
  m.kick(0.0, 0.6, { low: 60, high: 120, drop: 40, decay: 12, len: 0.4 });
  m.noise(0.0, 0.06, 0.35, { hp: 0.9, wet: 0.2 });
});

// ---- Logo reveal: warm chord + boom (D major, the kit's home key) ----
def('logo-reveal', 'logo / end card', 3.2, (m) => {
  m.kick(0.05, 0.6, { low: 36, high: 60, drop: 12, decay: 3, len: 1.6, wet: 0.2 });
  [62, 66, 69, 74, 78].forEach((n, k) => m.pluck(n, 0.06 + k * 0.035, 0.12, { decay: 2.4, pan: (k - 2) * 0.2, wet: 0.7, bright: 0.7 }));
  m.pad([50, 57, 62, 66, 69], 0.05, 3.1, env([[0, 0.6], [1, 0.45], [3.1, 0]]), env([[0, 3500], [3, 900]]), { wet: 0.7, attack: 0.05, release: 1.6 });
}, { reverb: 0.7 });

// ---- UI ----
for (const [k, seed] of [[1, 9], [2, 23]]) {
  def(`ui-tap-${k}`, 'a press on a real UI element', 0.18, (m) => {
    m.seed = seed;
    m.noise(0.0, 0.03, 0.55, { hp: 0.95, lpTo: 7000 - k * 1500, shape: (x) => Math.exp(-x * 8) });
    m.kick(0.0, 0.25, { low: 180 + k * 40, high: 300, drop: 80, decay: 60, len: 0.08 });
  });
}
def('ui-swipe', 'screen-to-screen navigation', 0.35, (m) => {
  m.noise(0.0, 0.3, 0.3, { hp: 0.85, lpFrom: 3000, lpTo: 9000, panSweep: 0.6, shape: (x) => Math.sin(Math.PI * x) });
});
for (const [k, seed] of [[1, 11], [2, 31], [3, 47]]) {
  def(`type-tick-${k}`, 'letters / lines arriving', 0.08, (m) => {
    m.seed = seed;
    m.noise(0.0, 0.025, 0.4, { hp: 0.97, lpTo: 9000, shape: (x) => Math.exp(-x * 10) });
  });
}
for (const [k, seed] of [[1, 13], [2, 37]]) {
  def(`pop-${k}`, 'chip, badge or number landing', 0.25, (m) => {
    m.seed = seed;
    m.kick(0.0, 0.45, { low: 220 + 60 * k, high: 500, drop: 50, decay: 30, len: 0.18 });
    m.noise(0.0, 0.02, 0.2, { hp: 0.9 });
  });
}

// ---- Paper ----
for (const [k, seed] of [[1, 19], [2, 53]]) {
  def(`paper-drop-${k}`, 'a paper sheet landing on the table', 0.4, (m) => {
    m.seed = seed;
    m.noise(0.0, 0.35, 0.5, { hp: 0.6, lpFrom: 5000, lpTo: 1200, shape: (x) => (x < 0.05 ? x * 20 : Math.exp(-(x - 0.05) * 9)) });
    m.kick(0.0, 0.18, { low: 90, high: 60, drop: 30, decay: 18, len: 0.2 });
  });
}
def('paper-rustle', 'paper layers settling, page turn', 0.9, (m) => {
  for (let i = 0; i < 9; i++) m.noise(i * 0.085, 0.12, 0.25 + 0.15 * Math.sin(i), { hp: 0.8, lpTo: 8000, shape: (x) => Math.sin(Math.PI * x) });
});
def('stamp', 'a stamp hitting paper', 0.5, (m) => {
  m.kick(0.0, 0.7, { low: 70, high: 140, drop: 45, decay: 14, len: 0.35 });
  m.noise(0.0, 0.08, 0.4, { hp: 0.7, lpTo: 4000 });
});

// ---- Risers and ambience ----
def('riser', 'tension into the payoff (once)', 2.0, (m) => {
  m.noise(0.0, 1.95, 0.5, { hp: 0.3, lpFrom: 400, lpTo: 8000, wet: 0.5, shape: (x) => x ** 2.4 * (x < 0.97 ? 1 : (1 - x) * 33) });
  m.tone(0.0, 1.95, 110, env([[0, 0], [1.9, 0.12], [1.95, 0]]));
});
def('ambient-room', 'quiet interior room tone under cinematic stills', 8, (m) => {
  m.noise(0.0, 8, 0.12, { hp: 0.02, lpFrom: 500, lpTo: 500, wet: 0.6, shape: (x) => Math.min(1, x * 8, (1 - x) * 8) });
}, { reverb: 0.4, fadeOut: 0.5 });
def('ambient-city', 'distant city air for Tirana / map beats', 8, (m) => {
  m.noise(0.0, 8, 0.2, { hp: 0.05, lpFrom: 900, lpTo: 700, wet: 0.5, shape: (x) => Math.min(1, x * 6, (1 - x) * 6) });
  m.tone(0.0, 8, 55, env([[0, 0], [1, 0.05], [7, 0.05], [8, 0]]));
}, { reverb: 0.5, fadeOut: 0.5 });

// ---- Render ----
const ffm = (args) => execFileSync('ffmpeg', ['-loglevel', 'error', '-y', ...args]);
const library = {};
for (const d of defs) {
  const m = new Mix(d.len + 0.05, 1);
  d.fn(m);
  m.master({ reverb: d.opts.reverb ?? 0.35, fadeOut: d.opts.fadeOut ?? 0.03, peak: 0.79 });
  const peak = m.peakTime();
  const wav = m.wav(path.join(TMP, d.id + '.wav'));
  const file = `${d.id}.m4a`;
  ffm(['-i', wav, '-c:a', 'aac', '-b:a', '192k', path.join(OUT, file)]);
  library[d.id] = { file: `assets/sound/sfx/${file}`, duration: +d.len.toFixed(3), peak: +peak.toFixed(3), use: d.use, origin: 'original (sound-design/sfx.mjs)' };
}

// Measure the bundled Pixabay set too (peak via decoded PCM).
const manifest = JSON.parse(fs.readFileSync(path.join(OUT, 'manifest.json'), 'utf8'));
for (const [id, info] of Object.entries(manifest)) {
  const f = path.join(OUT, info.file);
  if (!fs.existsSync(f)) continue;
  const pcm = execFileSync('ffmpeg', ['-loglevel', 'error', '-i', f, '-ac', '1', '-ar', String(SR), '-f', 's16le', '-'], { maxBuffer: 1 << 28 });
  let pk = 0, at = 0;
  for (let i = 0; i < pcm.length / 2; i++) { const v = Math.abs(pcm.readInt16LE(i * 2)); if (v > pk) { pk = v; at = i; } }
  library[`px-${id}`] = { file: `assets/sound/sfx/${info.file}`, duration: info.duration, peak: +(at / SR).toFixed(3), use: info.description, origin: 'Pixabay Content License (see CREDITS.md)' };
}

fs.writeFileSync(path.join(OUT, 'library.json'), JSON.stringify(library, null, 1));
fs.rmSync(TMP, { recursive: true, force: true });
console.log(`sfx: ${defs.length} original sounds + ${Object.keys(library).length - defs.length} bundled → assets/sound/sfx/library.json`);
