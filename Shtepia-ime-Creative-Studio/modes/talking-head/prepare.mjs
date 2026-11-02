// TALKING HEAD STUDIO — prepare a real recording for editing.
//
//   node studio.mjs talking-head path/to/recording.mp4 [--lang sq] [--id name] [--silence 0.45]
//
// 1. Silence detection (ffmpeg silencedetect, −35 dB, ≥ minSilence s): the
//    pauses are cut out, keeping 0.12 s of air around each phrase (jump cuts).
// 2. Transcription: `npx hyperframes transcribe` (Parakeet or whisper.cpp,
//    on-device). If neither is installed it says so and captions fall back to
//    "no transcript" — the kit never invents words.
// 3. Word timings are moved onto the cut timeline.
// 4. A storyboard is written: footage segments (punch-in on every other cut,
//    the classic jump-cut rhythm), a word-by-word caption track, a lower third,
//    and a closing card — ready for `npm run video -- storyboards/<id>.json`.
// It never generates or alters a person: it only cuts and frames real footage.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { KIT } from '../../render/build.mjs';

const probe = (f) => JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', f], { encoding: 'utf8' }));

export function detectSpeech(file, { noise = -35, minSilence = 0.45, pad = 0.12 } = {}) {
  const dur = +probe(file).format.duration;
  const r = spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-i', file, '-af', `silencedetect=noise=${noise}dB:d=${minSilence}`, '-f', 'null', '-'], { encoding: 'utf8' }).stderr;
  const sil = []; let s0 = null;
  for (const line of r.split('\n')) {
    const a = line.match(/silence_start: (-?[\d.]+)/); if (a) s0 = Math.max(0, +a[1]);
    const b = line.match(/silence_end: ([\d.]+)/); if (b && s0 !== null) { sil.push([s0, +b[1]]); s0 = null; }
  }
  if (s0 !== null) sil.push([s0, dur]);
  // Speech = the gaps between silences, padded.
  const keep = []; let t = 0;
  for (const [a, b] of sil) { if (a - t > 0.15) keep.push([Math.max(0, t - pad), Math.min(dur, a + pad)]); t = b; }
  if (dur - t > 0.15) keep.push([Math.max(0, t - pad), dur]);
  // Merge segments that overlap after padding.
  const merged = [];
  for (const k of keep) { const m = merged[merged.length - 1]; if (m && k[0] <= m[1] + 0.05) m[1] = Math.max(m[1], k[1]); else merged.push([...k]); }
  return { duration: dur, silences: sil, keep: merged.map(([a, b]) => [+a.toFixed(3), +b.toFixed(3)]) };
}

function transcribe(file, lang) {
  const bin = path.join(KIT, 'node_modules/.bin/hyperframes');
  const tmp = fs.mkdtempSync(path.join(KIT, 'projects', '.th-'));
  const model = lang === 'en' ? 'small.en' : 'small';
  const r = spawnSync(bin, ['transcribe', file, '--dir', tmp, '--json', '--model', model, '--language', lang === 'sq' ? 'sq' : lang, '--optional'], { encoding: 'utf8', timeout: 900000 });
  const out = path.join(tmp, 'assets/transcript.json');
  let words = null;
  if (fs.existsSync(out)) {
    const j = JSON.parse(fs.readFileSync(out, 'utf8'));
    words = (Array.isArray(j) ? j : j.words || []).map((w) => ({ text: String(w.text).trim(), start: +w.start, end: +w.end })).filter((w) => w.text);
  }
  fs.rmSync(tmp, { recursive: true, force: true });
  return { words, log: (r.stderr || '').slice(-400) };
}

// A transcript you already have: [{text,start,end}] JSON, or .srt/.vtt (each
// cue's words spread evenly over the cue).
export function readTranscript(f) {
  const txt = fs.readFileSync(f, 'utf8');
  if (/\.json$/i.test(f)) { const j = JSON.parse(txt); return (Array.isArray(j) ? j : j.words).map((w) => ({ text: String(w.text).trim(), start: +w.start, end: +w.end })); }
  const ts = (x) => { const [h, m, r] = x.replace(',', '.').split(':'); return +h * 3600 + +m * 60 + +r; };
  const out = [];
  for (const block of txt.split(/\n\s*\n/)) {
    const m = block.match(/(\d+:\d+:\d+[.,]\d+)\s*-->\s*(\d+:\d+:\d+[.,]\d+)\s*\n([\s\S]+)/);
    if (!m) continue;
    const a = ts(m[1]), b = ts(m[2]); const ws = m[3].replace(/<[^>]+>/g, '').split(/\s+/).filter(Boolean);
    ws.forEach((w, i) => out.push({ text: w, start: +(a + ((b - a) * i) / ws.length).toFixed(3), end: +(a + ((b - a) * (i + 0.9)) / ws.length).toFixed(3), estimated: true }));
  }
  return out;
}

export async function prepareTalkingHead(file, { lang = 'sq', id, minSilence = 0.45, transcript = null } = {}) {
  if (!fs.existsSync(file)) throw new Error(`no file ${file}`);
  const name = id || path.basename(file).replace(/\.[^.]+$/, '').toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const ext = path.extname(file).toLowerCase() || '.mp4';
  // The footage is copied into the kit so the project is self-contained.
  const rel = `assets/footage/${name}${ext}`;
  fs.mkdirSync(path.join(KIT, 'assets/footage'), { recursive: true });
  fs.copyFileSync(file, path.join(KIT, rel));
  const info = probe(file);
  const hasAudio = info.streams.some((s) => s.codec_type === 'audio');
  const { duration, keep } = hasAudio ? detectSpeech(file, { minSilence }) : { duration: +info.format.duration, keep: [[0, +info.format.duration]] };
  const tr = transcript ? { words: readTranscript(transcript) } : hasAudio ? transcribe(path.join(KIT, rel), lang) : { words: null };
  // Footage segments on the film timeline + word times mapped through the cuts.
  const footage = []; let t = 0; const words = [];
  keep.forEach(([a, b], i) => {
    const seg = { src: rel, start: +t.toFixed(3), in: a, out: b, hasAudio, volume: 1 };
    if (i % 2 === 1) seg.punch = [{ at: a, scale: 1.14, y: -3 }];
    footage.push(seg);
    // A word belongs to the segment that holds its midpoint; clamp it to the cut.
    for (const w of tr.words || []) {
      const mid = (w.start + w.end) / 2;
      if (mid < a || mid > b) continue;
      const s0 = Math.max(a, w.start), e0 = Math.min(b, w.end);
      words.push({ text: w.text, start: +(t + (s0 - a)).toFixed(3), end: +(t + (e0 - a)).toFixed(3), ...(w.estimated ? { estimated: true } : {}) });
    }
    t += b - a;
  });
  const film = +t.toFixed(3);
  const sb = {
    id: name, title: `Talking head — ${name}`, language: lang, format: 'reel', palette: 'night', targetDuration: +(film + 2.6).toFixed(1),
    modes: ['talking-head'],
    footage, autoSfx: true,
    captions: words.length ? { words } : undefined,
    audio: { music: { bed: 'warm', bpm: 96, volume: 0.12 } },
    scenes: [
      { scene: 'th-captions', start: 0, duration: film, vars: { keywords: 'Shtëpia.ime' } },
      { scene: 'th-lower-third', start: 0.3, duration: 3.6, vars: { name: 'Emri Mbiemri', role: 'Shtëpia.ime' } },
      { scene: 'outro-lockup-tagline', start: film, duration: 2.6 },
    ],
    duration: +(film + 2.6).toFixed(2),
    notes: [
      `${keep.length} speech segments kept from ${duration.toFixed(1)} s of footage (${(duration - film).toFixed(1)} s of pauses cut).`,
      words.length ? `${words.length} transcribed words (${lang}).` : `No transcript: ${hasAudio ? 'install a speech model (npx hyperframes models install parakeet, or whisper.cpp) and run again' : 'the file has no audio'}. Captions are off until then.`,
      'Replace the lower third placeholder with the speaker\'s real name and role. Add th-broll-card / th-split-screen scenes at the sentences that name a feature.',
    ],
  };
  if (!words.length) sb.scenes = sb.scenes.filter((s) => s.scene !== 'th-captions');
  const out = path.join(KIT, 'storyboards', `${name}.json`);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify(sb, null, 2) + '\n');
  return { id: name, cuts: keep.length, source: +duration.toFixed(1), duration: film, words: words.length };
}
