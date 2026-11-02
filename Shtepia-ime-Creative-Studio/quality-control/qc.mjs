// QUALITY CONTROL ENGINE — 12 checks on the RENDERED file and the live page.
//
// Every check reads real evidence: decoded frames of the MP4 (motion, blank
// frames, the hook), the mixed audio (EBU R128 loudness, true peak), the page
// running in Chromium at sampled times (every visible text box against the
// format's safe zone and the mobile size floor), HyperFrames' own `check`
// (lint, runtime errors, contrast), and the storyboard against
// config/features.json (claims) and the official logo files (branding).
//
// What it cannot judge — taste, story, whether a frame is beautiful — is left
// to the review step: it writes qc/contact.jpg (one frame per second) for a
// human or Claude to LOOK at, and says so in QC.md.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { KIT, readJSON, registry, resolveFormat, hf } from '../render/build.mjs';

const sh = (cmd, args, opts = {}) => execFileSync(cmd, args, { encoding: 'utf8', maxBuffer: 1 << 30, ...opts });
const sha = (f) => crypto.createHash('sha1').update(fs.readFileSync(f)).digest('hex');

// Weights add to 100. Required checks must pass for the film to be "final".
const CHECKS = [
  ['playable', 'The exported video plays', 12, true],
  ['duration', 'Duration matches the storyboard', 6, true],
  ['hook', 'First 1.5 s are engaging (content on frame 0, motion, change)', 10, true],
  ['motion', 'No long stretch without meaningful movement', 9, false],
  ['transitions', 'Transitions are smooth (no blank or flash frames)', 7, false],
  ['readable', 'Text is readable on a phone (size floor, contrast)', 10, true],
  ['safe', 'Text and product inside the platform safe zone', 9, true],
  ['captions', 'Subtitles synchronised with the voice', 6, false],
  ['audio', 'Audio balanced (loudness, peaks, presence)', 7, false],
  ['assets', 'No missing assets or runtime errors', 8, true],
  ['brand', 'Official branding used correctly', 8, true],
  ['accuracy', 'Only real, live app features are shown or claimed', 8, true],
];

export async function qc({ projectDir, video, log = console.log, checkJson = true }) {
  const sb = JSON.parse(fs.readFileSync(path.join(projectDir, 'storyboard.json'), 'utf8'));
  const fmt = resolveFormat(JSON.parse(fs.readFileSync(path.join(projectDir, 'meta.json'), 'utf8')).format);
  const outDir = path.join(projectDir, 'qc'); fs.mkdirSync(outDir, { recursive: true });
  const R = {}; const set = (k, status, detail, evidence = {}) => { R[k] = { status, detail, evidence }; };
  const idx = fs.readFileSync(path.join(projectDir, 'index.html'), 'utf8');
  const filmDur = +idx.match(/data-composition-id="main"[^>]*data-duration="([\d.]+)"/)[1];

  // ---------- 1. Playable ----------
  let probe = null;
  try {
    probe = JSON.parse(sh('ffprobe', ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', video]));
    const v = probe.streams.find((s) => s.codec_type === 'video');
    const a = probe.streams.find((s) => s.codec_type === 'audio');
    const dec = spawnSync('ffmpeg', ['-v', 'error', '-i', video, '-f', 'null', '-'], { encoding: 'utf8' });
    const errs = (dec.stderr || '').trim();
    const [n, d] = String(v.r_frame_rate).split('/').map(Number);
    const fps = n / (d || 1);
    const problems = [];
    if (errs) problems.push(`decoder errors: ${errs.split('\n')[0]}`);
    if (v.codec_name !== 'h264') problems.push(`video codec ${v.codec_name} (expected h264)`);
    if (v.width !== fmt.width || v.height !== fmt.height) problems.push(`${v.width}x${v.height} (expected ${fmt.width}x${fmt.height})`);
    if (Math.abs(fps - fmt.fps) > 0.01) problems.push(`${fps} fps (expected ${fmt.fps})`);
    if (v.pix_fmt !== 'yuv420p') problems.push(`pixel format ${v.pix_fmt} (yuv420p plays everywhere)`);
    set('playable', problems.length ? 'fail' : 'pass', problems.length ? problems.join('; ') : `h264 ${v.width}x${v.height} ${fps} fps${a ? ', ' + a.codec_name + ' audio' : ', no audio track'}; full decode clean`, { codec: v.codec_name, fps, audio: a ? a.codec_name : null });
  } catch (e) { set('playable', 'fail', `ffprobe/ffmpeg could not read the file: ${String(e.message).slice(0, 200)}`); }

  // ---------- 2. Duration ----------
  const fileDur = probe ? +probe.format.duration : 0;
  const target = sb.targetDuration ?? filmDur;
  const dd = Math.abs(fileDur - filmDur);
  set('duration', dd <= 0.1 && Math.abs(filmDur - target) <= 0.6 ? 'pass' : dd <= 0.1 ? 'warn' : 'fail',
    `file ${fileDur.toFixed(2)} s, timeline ${filmDur} s, requested ${target} s`, { fileDur, filmDur, target });

  // ---------- Frame analysis (10 fps, 72x128 grey) ----------
  const FW = 72, FH = Math.round(72 * fmt.height / fmt.width), FPS = 10;
  let frames = [];
  if (R.playable.status !== 'fail' || probe) {
    const raw = execFileSync('ffmpeg', ['-v', 'error', '-i', video, '-vf', `fps=${FPS},scale=${FW}:${FH},format=gray`, '-f', 'rawvideo', '-'], { maxBuffer: 1 << 30 });
    const n = Math.floor(raw.length / (FW * FH));
    for (let i = 0; i < n; i++) {
      const f = raw.subarray(i * FW * FH, (i + 1) * FW * FH);
      let s = 0, s2 = 0; for (const p of f) { s += p; s2 += p * p; }
      const mean = s / f.length; const sd = Math.sqrt(Math.max(0, s2 / f.length - mean * mean));
      let diff = 0;
      if (i) { const g = raw.subarray((i - 1) * FW * FH, i * FW * FH); for (let k = 0; k < f.length; k++) diff += Math.abs(f[k] - g[k]); diff /= f.length; }
      frames.push({ t: i / FPS, mean, sd, diff });
    }
  }

  // ---------- 3. Hook ----------
  if (frames.length) {
    const f0 = frames[0]; const early = frames.filter((f) => f.t > 0 && f.t <= 1.5);
    const moving = early.filter((f) => f.diff > 0.8).length / Math.max(1, early.length);
    const firstScene = sb.scenes[0] && registry()[sb.scenes[0].scene];
    const problems = [];
    if (f0.sd < 6) problems.push(`frame 0 is nearly empty (contrast σ=${f0.sd.toFixed(1)}): it is the thumbnail`);
    if (moving < 0.3) problems.push(`only ${(moving * 100).toFixed(0)}% of the first 1.5 s moves`);
    const hookish = firstScene && (firstScene.category === 'hooks' || (firstScene.tags || []).includes('hook'));
    set('hook', problems.length ? (f0.sd < 6 ? 'fail' : 'warn') : 'pass',
      problems.length ? problems.join('; ') : `frame 0 carries content (σ=${f0.sd.toFixed(1)}), ${(moving * 100).toFixed(0)}% of the first 1.5 s moves${hookish ? ', opens on a hook scene' : ''}`,
      { frame0Contrast: +f0.sd.toFixed(1), movingShare: +moving.toFixed(2), opensOnHookScene: !!hookish });
  }

  // ---------- 4. Motion ----------
  if (frames.length) {
    const holdEnd = Math.max(0, filmDur - 2.6); // the final card may hold still
    const runs = []; let start = null;
    for (const f of frames) {
      const still = f.diff < 0.35;
      if (still && start === null) start = f.t;
      if ((!still || f.t >= holdEnd) && start !== null) { if (f.t - start >= 2.5) runs.push([+start.toFixed(1), +f.t.toFixed(1)]); start = null; }
    }
    set('motion', runs.length ? 'warn' : 'pass', runs.length ? `still stretches ≥2.5 s at ${runs.map((r) => r.join('–') + ' s').join(', ')}` : 'something moves in every 2.5 s window (the end card may hold)', { stillRuns: runs });
  }

  // ---------- 5. Transitions ----------
  if (frames.length) {
    const blank = frames.filter((f) => f.t > 0.2 && f.t < filmDur - 0.3 && f.sd < 2.5 && (f.mean < 12 || f.mean > 243));
    const groups = []; for (const f of blank) { const g = groups[groups.length - 1]; if (g && f.t - g[1] <= 0.11) g[1] = f.t; else groups.push([f.t, f.t]); }
    const long = groups.filter(([a, b]) => b - a >= 0.15);
    const flashes = frames.filter((f, i) => i > 1 && f.diff > 60 && frames[i - 1].diff > 60);
    const problems = [];
    if (long.length) problems.push(`blank frames at ${long.map(([a, b]) => `${a.toFixed(1)}–${b.toFixed(1)} s`).join(', ')}`);
    if (flashes.length > 2) problems.push(`${flashes.length} flash frames (two huge changes in a row)`);
    set('transitions', problems.length ? 'warn' : 'pass', problems.length ? problems.join('; ') : 'no blank or flash frames between scenes', { blank: long, flashes: flashes.map((f) => f.t) });
  }

  // ---------- 6 + 7. Text: size and safe zone, measured in the live page ----------
  try {
    const text = await textAudit(projectDir, filmDur, fmt);
    const tooSmall = text.boxes.filter((b) => b.h < 26 && !b.decor);
    // A box that leaves the zone for a single sample (an exit zoom, a slam
    // overshoot) is motion, not layout: flag text outside in ≥2 consecutive samples.
    const bad = text.boxes.filter((b) => !b.decor && !b.inSafe);
    const outside = bad.filter((b) => bad.some((o) => o.text === b.text && Math.abs(o.t - b.t - 0.5) < 0.01));
    set('safe', outside.length ? (outside.length > 3 ? 'fail' : 'warn') : 'pass',
      outside.length ? `${outside.length} text boxes outside the ${fmt.name} safe zone, e.g. "${outside[0].text}" at t=${outside[0].t}s (${outside[0].rect.join(',')})` : `${text.boxes.length} text boxes across ${text.samples} samples, all inside the safe zone`,
      { samples: text.samples, outside: outside.slice(0, 12) });
    R.__text = { tooSmall, collisions: text.collisions };
  } catch (e) { set('safe', 'warn', `could not audit the live page: ${String(e.message).slice(0, 200)}`); R.__text = { tooSmall: [], collisions: [] }; }

  let check = null;
  if (checkJson) {
    try { const out = hf(['check', '--json'], { cwd: projectDir }); check = JSON.parse(out.slice(out.indexOf('{'))); }
    catch (e) { const o = String(e.stdout || ''); try { check = JSON.parse(o.slice(o.indexOf('{'))); } catch { check = null; } }
  }
  const findings = (k) => ((check && check[k] && check[k].findings) || []);
  {
    const contrast = findings('contrast').filter((f) => f.severity === 'error' || f.severity === 'warning');
    const floor = [...findings('craft'), ...findings('layout')].filter((f) => /text_below_floor|line_unread/.test(f.code));
    const small = R.__text.tooSmall;
    const problems = [];
    if (small.length) problems.push(`${small.length} text boxes under 26 px tall (unreadable on a phone), e.g. "${small[0].text}"`);
    if (contrast.length) problems.push(`${contrast.length} contrast findings`);
    const col = R.__text.collisions || [];
    if (col.length) problems.push(`${col.length} text collisions (two lines overlapping ≥0.5 s), e.g. "${col[0].a}" over "${col[0].b}" at ${col[0].t}s`);
    if (floor.length) problems.push(`${floor.length} lines too small or on screen too briefly (${[...new Set(floor.map((f) => f.code))].join(', ')})`);
    set('readable', small.length > 2 || contrast.length > 3 || col.length > 3 ? 'fail' : problems.length ? 'warn' : 'pass', problems.length ? problems.join('; ') : 'all text ≥26 px tall, no collisions, contrast or reading-time findings', { small: small.slice(0, 10), contrast: contrast.slice(0, 10).map((f) => f.message), floor: floor.slice(0, 10).map((f) => f.message), collisions: col.slice(0, 10) });
  }
  delete R.__text;

  // ---------- 8. Captions ----------
  {
    const words = (() => { try { return JSON.parse(fs.readFileSync(path.join(projectDir, 'assets/voice/words.json'), 'utf8')); } catch { return Array.isArray(sb.captions && sb.captions.words) ? sb.captions.words : null; } })();
    const capScene = sb.scenes.find((s) => (registry()[s.scene] || {}).trackKind === 'captions');
    const hasVoice = /id="vo-|id="voice"/.test(idx) || (sb.footage || []).some((f) => f.hasAudio !== false);
    if (!hasVoice) set('captions', 'pass', 'no speech in the film: nothing to caption');
    else if (!capScene) set('captions', 'warn', 'the film has speech but no caption track (most viewers watch muted)');
    else if (!words && !(sb.captions && sb.captions.words)) set('captions', 'warn', 'caption track present but no word timings: captions use preview text');
    else {
      const ws = words || [];
      const est = ws.filter((w) => w.estimated).length;
      const bad = ws.filter((w) => w.end < w.start || w.start < 0 || w.end > filmDur + 0.05);
      set('captions', bad.length ? 'fail' : est ? 'warn' : 'pass', bad.length ? `${bad.length} words with impossible timings` : est ? `${est}/${ws.length} word timings estimated (no aligner): check sync by eye` : `${ws.length} words timed from ${fs.existsSync(path.join(projectDir, 'assets/voice/words.json')) ? 'the voice track' : 'the transcript'}`, { words: ws.length, estimated: est });
    }
  }

  // ---------- 9. Audio ----------
  {
    const a = probe && probe.streams.find((s) => s.codec_type === 'audio');
    if (!a) set('audio', filmDur > 15 ? 'warn' : 'pass', filmDur > 15 ? 'no audio track in a film over 15 s' : 'no audio (short piece)');
    else {
      const r = spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-i', video, '-af', 'ebur128=peak=true', '-f', 'null', '-'], { encoding: 'utf8' }).stderr;
      const I = +((r.match(/I:\s+(-?[\d.]+) LUFS/g) || []).pop() || '').replace(/[^-\d.]/g, '');
      const tp = +((r.match(/Peak:\s+(-?[\d.]+) dBFS/g) || []).pop() || '').replace(/[^-\d.]/g, '');
      const problems = [];
      if (!(I > -70)) problems.push('the track is silent');
      else if (I < -20 || I > -11) problems.push(`integrated loudness ${I} LUFS (social target −16 to −13)`);
      if (tp > -0.5) problems.push(`true peak ${tp} dBFS (keep ≤ −1)`);
      set('audio', problems.length ? (I > -70 ? 'warn' : 'fail') : 'pass', problems.length ? problems.join('; ') : `${I} LUFS integrated, true peak ${tp} dBFS (measured, not listened to)`, { lufs: I, truePeak: tp });
    }
  }

  // ---------- 10. Assets ----------
  {
    const missing = [];
    for (const m of idx.matchAll(/src="([^"]+)"/g)) if (!/^https?:/.test(m[1]) && !fs.existsSync(path.join(projectDir, m[1]))) missing.push(m[1]);
    for (const f of fs.readdirSync(path.join(projectDir, 'compositions'))) {
      const html = fs.readFileSync(path.join(projectDir, 'compositions', f), 'utf8');
      for (const m of html.matchAll(/(?:src|href)="(assets\/[^"]+)"/g)) if (!fs.existsSync(path.join(projectDir, m[1]))) missing.push(`${f}: ${m[1]}`);
    }
    const rt = [...findings('runtime'), ...findings('lint')].filter((f) => f.severity === 'error');
    const problems = [];
    if (missing.length) problems.push(`missing: ${missing.slice(0, 5).join(', ')}`);
    if (rt.length) problems.push(`${rt.length} lint/runtime errors: ${rt[0].code}`);
    set('assets', problems.length ? 'fail' : 'pass', problems.length ? problems.join('; ') : `every referenced file present${check ? ', hyperframes check: no lint/runtime errors' : ''}`, { missing, errors: rt.slice(0, 5).map((f) => f.code + ': ' + f.message) });
  }

  // ---------- 11. Brand ----------
  {
    const problems = [];
    const official = path.join(KIT, 'assets/logos');
    const used = fs.existsSync(path.join(projectDir, 'assets/logos')) ? fs.readdirSync(path.join(projectDir, 'assets/logos')) : [];
    for (const f of used) {
      const o = path.join(official, f);
      if (!fs.existsSync(o)) problems.push(`${f} is not an official logo file`);
      else if (sha(o) !== sha(path.join(projectDir, 'assets/logos', f))) problems.push(`${f} differs from the official file`);
    }
    // The orange door must never sit on an orange ground.
    for (const s of sb.scenes) {
      const vals = JSON.stringify(s.vars || {});
      const html = fs.readFileSync(path.join(registry()[s.scene].dir, 'scene.html'), 'utf8');
      if ((s.palette === 'orange' || registry()[s.scene].palette === 'orange') && /symbol-orange|lockup-horizontal|lockup-stacked/.test(html + vals)) problems.push(`${s.scene}: logo on the orange palette`);
    }
    const css = fs.readFileSync(path.join(projectDir, 'assets/kit/brand.css'), 'utf8');
    if (!/--door: #FF5F1F/i.test(css)) problems.push('brand.css lost the door colour #FF5F1F');
    set('brand', problems.length ? 'fail' : 'pass', problems.length ? problems.join('; ') : `${used.length} logo files, byte-identical to the official set; no logo on orange`, { logos: used });
  }

  // ---------- 12. Accuracy ----------
  {
    const F = readJSON('config/features.json');
    const live = (id) => F.features[id] && (F.features[id].status === 'live' || F.overrides[id] === true);
    const problems = []; const warns = [];
    const ids = new Set(sb.features || []);
    for (const s of sb.scenes) for (const f of (registry()[s.scene].features || [])) ids.add(f);
    for (const id of ids) { if (!F.features[id]) problems.push(`unknown feature "${id}"`); else if (!live(id)) problems.push(`"${id}" is ${F.features[id].status}, not live`); }
    const screensJ = readJSON('config/screens.json');
    for (const m of idx.matchAll(/"screen":"([\w-]+)"/g)) if (!screensJ.screens[m[1]]) problems.push(`screen "${m[1]}" is not a real capture`);
    // Copy scan for claims the app cannot back.
    let copy = sb.scenes.map((s) => Object.values(s.vars || {}).join(' ') + ' ' + (s.vo || '')).join(' ') + ' ' + (sb.caption || '');
    // Claims the storyboard backs with evidence (e.g. a count read off a real screen) are exempt.
    const backed = Object.keys(sb.evidence || {});
    for (const b of backed) copy = copy.split(b).join(' ');
    if (backed.length) warns.push(`${backed.length} claim(s) backed by declared evidence: ${backed.map((b) => `"${b}" ← ${sb.evidence[b]}`).join('; ')}`);
    const risky = [[/#\s?1|numri\s*1|më\s+i\s+miri|the best|il migliore|garantuar|guaranteed|garantit|verifikuar|verified/i, 'superlative or guarantee'], [/\b\d[\d.,]*\s*(përdorues|users|utenti|shkarkime|downloads|prona\b|listings|annunci)/i, 'a count with no data source'], [/hipotek|mortgage|mutuo|kredi|loan/i, 'mortgage/loan claim'], [/AI|inteligjenc|intelligenza/i, 'AI claim (AI features are flagged, not live)']];
    for (const [re, why] of risky) { const m = copy.match(re); if (m) (why.startsWith('AI') && live('ai-assistant') ? null : (why.startsWith('AI') ? warns : problems)).push(`copy says "${m[0]}": ${why}`); }
    if (readJSON('config/listings.json').demo && /villa-dhermi|apartment-blloku|listing/.test(JSON.stringify(sb.scenes)) && !sb.demoListingsOk) warns.push('uses the DEMO listings (fictional): fine for app demos, not for property offers');
    set('accuracy', problems.length ? 'fail' : warns.length ? 'warn' : 'pass', problems.length ? problems.join('; ') : warns.length ? warns.join('; ') : `${ids.size} features shown, all live; no unbacked claims in the copy`, { features: [...ids], warnings: warns });
  }

  // ---------- Contact sheet for the human/Claude visual review ----------
  const sheet = path.join(outDir, 'contact.jpg');
  const cols = fmt.width > fmt.height ? 4 : 8;
  const rows = Math.ceil(Math.ceil(filmDur) / cols);
  spawnSync('ffmpeg', ['-v', 'error', '-y', '-i', video, '-vf', `fps=1,scale=${fmt.width > fmt.height ? 480 : 270}:-1,tile=${cols}x${rows}`, '-frames:v', '1', '-q:v', '3', sheet]);

  // ---------- Score ----------
  let score = 0; const required = [];
  for (const [k, label, w, req] of CHECKS) {
    const r = R[k] || { status: 'warn', detail: 'not run' };
    r.label = label; r.weight = w; r.required = req;
    score += r.status === 'pass' ? w : r.status === 'warn' ? w * 0.5 : 0;
    if (req && r.status === 'fail') required.push(k);
  }
  score = Math.round(score);
  const final = required.length === 0 && score >= 75;
  const report = { project: path.basename(projectDir), video: path.relative(projectDir, video), format: fmt.name, score, final, failedRequired: required, checks: Object.fromEntries(CHECKS.map(([k]) => [k, R[k]])), contactSheet: 'qc/contact.jpg', at: new Date().toISOString() };
  fs.writeFileSync(path.join(outDir, 'qc.json'), JSON.stringify(report, null, 2));
  const icon = { pass: '✅', warn: '⚠️', fail: '❌' };
  const md = [`# QC — ${report.project} (${fmt.name})`, '', `**Score ${score}/100 — ${final ? 'PASSED: ready to export' : `NOT FINAL${required.length ? ` (required checks failed: ${required.join(', ')})` : ' (score below 75)'}`}**`, '',
    '| | Check | Weight | Result |', '|---|---|---|---|',
    ...CHECKS.map(([k, label, w, req]) => `| ${icon[R[k]?.status] || '·'} | ${label}${req ? ' *(required)*' : ''} | ${w} | ${(R[k]?.detail || '').replace(/\|/g, '/')} |`), '',
    '## Still to do by eye', '', 'These numbers are measurements. Before publishing, open `qc/contact.jpg` (one frame per second) and the video itself, and judge what QC cannot: story, taste, whether every frame reads as intended. Sound was measured, not heard.', ''].join('\n');
  fs.writeFileSync(path.join(outDir, 'QC.md'), md);
  log(`QC ${report.project}: ${score}/100 ${final ? 'PASS' : 'NOT FINAL'}${required.length ? ' — failed: ' + required.join(', ') : ''}`);
  for (const [k] of CHECKS) log(`  ${icon[R[k]?.status] || '·'} ${k.padEnd(12)} ${R[k]?.detail || ''}`);
  return report;
}

// Seek the live page (HyperFrames preview runtime) and collect every visible
// text box: its rect, height and whether it sits inside the safe zone.
async function textAudit(projectDir, dur, fmt) {
  const { chromium } = createRequire(import.meta.url)('playwright'); // pre-installed (NODE_PATH); or npm i playwright
  const port = 4700 + Math.floor((Date.now() / 1000) % 200);
  const bin = path.join(KIT, 'node_modules/.bin/hyperframes');
  const start = JSON.parse(sh(bin, ['preview', '--background', '--json', '--port', String(port)], { cwd: projectDir }).trim().split('\n').pop());
  const url = `${start.result.serverUrl}/api/projects/${encodeURIComponent(start.result.projectName)}/preview`;
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: fmt.width, height: fmt.height } });
    await page.goto(url); await page.waitForFunction(() => window.__player && window.__playerReady !== false, null, { timeout: 30000 });
    await page.waitForTimeout(1500);
    const times = []; for (let t = 0.25; t < dur; t += 0.5) times.push(+t.toFixed(2));
    const boxes = []; const collisions = [];
    for (const t of times) {
      await page.evaluate(async (tt) => { window.__player.seek(tt); if (window.__hfWaitForSeekCompletion) await window.__hfWaitForSeekCompletion(); }, t);
      await page.waitForTimeout(40);
      const found = await page.evaluate(({ safe, W, H }) => {
        const out = [];
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        const seen = new Set();
        while (walker.nextNode()) {
          const n = walker.currentNode; const txt = n.textContent.trim();
          if (!txt || txt.length < 2) continue;
          const el = n.parentElement; if (!el || seen.has(el)) continue; seen.add(el);
          if (el.closest('[data-layout-ignore],script,style,template,title')) continue;
          const r = document.createRange(); r.selectNodeContents(n); const rb = r.getBoundingClientRect();
          // Clip by every overflow-hidden ancestor (masked reveals, phone screens).
          let L = rb.left, T = rb.top, Rr = rb.right, B = rb.bottom;
          for (let a = el; a && a !== document.body; a = a.parentElement) {
            const cs = getComputedStyle(a);
            if (cs.overflow !== 'visible' || cs.clipPath !== 'none') { const ab = a.getBoundingClientRect(); if (cs.overflow !== 'visible') { L = Math.max(L, ab.left); T = Math.max(T, ab.top); Rr = Math.min(Rr, ab.right); B = Math.min(B, ab.bottom); } }
          }
          const b = { left: L, top: T, right: Rr, bottom: B, width: Rr - L, height: B - T };
          if (b.width < 2 || b.height < 2 || b.right < 0 || b.bottom < 0 || b.left > W || b.top > H) continue;
          let op = 1, e = el, hidden = false;
          while (e && e !== document.body) { const cs = getComputedStyle(e); op *= +cs.opacity; if (cs.visibility === 'hidden' || cs.display === 'none') hidden = true; e = e.parentElement; }
          if (hidden || op < 0.35) continue;
          const ui = !!el.closest('.ui-phone,.d3-phone,.ui-lift');
          // Vertical formats: the action rail (likes, comments, share) covers
          // x > safe.right from ~45% of the height down to the caption band.
          const portrait = H > W * 1.3;
          const underRail = portrait && b.right > safe.right + 4 && b.bottom > H * 0.45 && b.top < safe.bottom;
          const inSafe = b.top >= safe.top - 4 && b.bottom <= safe.bottom + 4 && b.left >= safe.left - 4 && b.right <= W - safe.left + 4 && !underRail;
          // Per-line boxes: a phrase that wraps has one rect per line (its union box would overlap its neighbours).
          const lines = Array.from(r.getClientRects()).filter((q) => q.width > 1 && q.height > 1).map((q) => [q.left, q.top, q.right, q.bottom].map(Math.round));
          out.push({ text: txt.slice(0, 40), rect: [b.left, b.top, b.right, b.bottom].map(Math.round), lines, h: Math.round(rb.height), inSafe, decor: ui });
        }
        return out;
      }, { safe: fmt.safe, W: fmt.width, H: fmt.height });
      for (const f of found) boxes.push({ t, ...f });
      // Text-on-text collisions between different lines in this sample.
      const live = found.filter((f) => !f.decor);
      for (let i = 0; i < live.length; i++) for (let j = i + 1; j < live.length; j++) {
        let hit = false;
        for (const a of live[i].lines.length ? live[i].lines : [live[i].rect]) for (const b of live[j].lines.length ? live[j].lines : [live[j].rect]) {
          const ix = Math.min(a[2], b[2]) - Math.max(a[0], b[0]), iy = Math.min(a[3], b[3]) - Math.max(a[1], b[1]);
          if (ix <= 0 || iy <= 0) continue;
          const small = Math.min((a[2] - a[0]) * (a[3] - a[1]), (b[2] - b[0]) * (b[3] - b[1]));
          if (ix * iy > 0.2 * small) hit = true;
        }
        if (hit) collisions.push({ t, a: live[i].text, b: live[j].text });
      }
    }
    // Keep collisions that persist across two consecutive samples.
    const lasting = collisions.filter((c) => collisions.some((o) => o.a === c.a && o.b === c.b && Math.abs(o.t - c.t - 0.5) < 0.01));
    return { samples: times.length, boxes, collisions: lasting };
  } finally {
    await browser.close();
    try { sh(bin, ['preview', '--stop', '--port', String(port)], { cwd: projectDir }); } catch { /* already stopped */ }
  }
}
