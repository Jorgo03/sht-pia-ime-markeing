#!/usr/bin/env node
// Shtëpia.ime Creative Studio — command line.
//
//   node studio.mjs <command> [args]      (or: npm run studio -- <command>)
//
// Commands
//   init                         check the machine, regenerate brand.css, the sfx library and previews
//   scenes [--mode m] [--json]   list the scene bank
//   templates                    list campaign templates
//   new <template> [--lang sq|en|it] [--format reel] [--id x]   storyboard from a template
//   plan "<one sentence>"        draft storyboard from a brief (rule-based; Claude refines it)
//   build <storyboard.json> [--format f]   storyboard -> HyperFrames project in projects/
//   voices                       narration providers and whether they are configured here
//   talking-head <video> [--lang sq]  silence cuts + transcript → a storyboard for real footage
//   check <project>              hyperframes check (lint, runtime, layout, contrast)
//   snapshot <project> [--at 1,2]  PNG frames + contact sheet
//   render <project> [--quality draft|delivery] [--format f]
//   qc <project> [--video file]  quality gates + 0–100 score → QC.md / qc.json
//   export <storyboard|template> [--formats reel,square]  render + QC + final folder in exports/<id>/
//   video <storyboard|template> [--formats reel,youtube] [--lang en] [--quality draft]
//                                the whole pipeline: voice → music → build → render → QC → export
//   previews [--only id,id]      regenerate scene-bank previews
//   preview-scene <scene-id>     one-scene project you can open in the Studio
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { KIT, build, registry, brandCss, readJSON, hf, timeline, resolveFormat } from './render/build.mjs';
import { produce, exportBundle, render as renderProject, projectPath, prepareAudio } from './render/produce.mjs';
import { qc as runQc } from './quality-control/qc.mjs';
import { PROVIDERS, available, loadEnv } from './voice-studio/voice.mjs';
import { planFromBrief, localize } from './render/plan.mjs';

const [, , cmd, ...rest] = process.argv;
const flags = {}; const args = [];
for (let i = 0; i < rest.length; i++) {
  const a = rest[i];
  if (a.startsWith('--')) { const [k, v] = a.slice(2).split('='); flags[k] = v ?? (rest[i + 1] && !rest[i + 1].startsWith('--') ? rest[++i] : true); }
  else args.push(a);
}
const die = (m) => { console.error(`✗ ${m}`); process.exit(1); };
const projectDir = (p) => {
  if (!p) die('which project? (a folder in projects/ or a path)');
  const cands = [p, path.join(KIT, 'projects', p)];
  const d = cands.find((x) => fs.existsSync(path.join(x, 'index.html')));
  if (!d) die(`no built project at ${p}`);
  return path.resolve(d);
};
// A storyboard file, or a campaign template id (localised with --lang).
const loadStoryboard = (p) => {
  const tpl = path.join(KIT, 'templates/campaigns', `${p}.json`);
  const file = fs.existsSync(p) ? p : fs.existsSync(path.join(KIT, p)) ? path.join(KIT, p) : fs.existsSync(tpl) ? tpl : null;
  if (!file) die(`no storyboard or template "${p}" (npm run templates lists templates)`);
  let sb = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (sb.template || file === tpl) sb = localize(sb, flags.lang || sb.language || 'sq');
  if (flags.id) sb.id = flags.id;
  sb.__dir = path.dirname(path.resolve(file));
  return sb;
};
const formatsFlag = () => (flags.formats ? String(flags.formats).split(',') : flags.format ? [String(flags.format)] : null);

const commands = {
  async brand() {
    fs.writeFileSync(path.join(KIT, 'components/brand.css'), brandCss());
    console.log('components/brand.css regenerated from config/brand.json');
  },

  async scenes() {
    const reg = registry();
    const list = Object.values(reg).filter((s) => !flags.mode || s.mode === flags.mode).sort((a, b) => a.rel.localeCompare(b.rel));
    if (flags.json) return console.log(JSON.stringify(list.map(({ dir, ...s }) => s), null, 2));
    let cat = '';
    for (const s of list) {
      if (s.category !== cat) { cat = s.category; console.log(`\n${cat}/`); }
      console.log(`  ${s.id.padEnd(26)} ${String(s.mode).padEnd(19)} ${String(s.duration).padStart(4)}s  ${s.name}`);
    }
    console.log(`\n${list.length} scenes`);
  },

  async build() {
    const sb = loadStoryboard(args[0] || die('build <storyboard.json>'));
    build(sb, { format: flags.format });
  },

  async check() {
    const dir = projectDir(args[0]);
    try { process.stdout.write(hf(['check'], { cwd: dir })); } catch (e) { process.stdout.write(String(e.stdout || '')); process.stderr.write(String(e.stderr || '')); process.exitCode = 1; }
  },

  async snapshot() {
    const dir = projectDir(args[0]);
    const a = ['snapshot', '--json'];
    if (flags.at) a.push('--at', String(flags.at));
    if (flags.frames) a.push('--frames', String(flags.frames));
    const out = hf(a, { cwd: dir });
    const j = JSON.parse(out.slice(out.indexOf('{')));
    console.log(j.contactSheets?.join('\n') || out);
  },

  // Every scene (or --only a,b) in one project; one snapshot per scene at
  // meta.previewAt (fraction of its duration, default 0.8) → preview.png.
  async previews() {
    const reg = registry();
    const only = flags.only ? String(flags.only).split(',') : null;
    const list = Object.values(reg).filter((s) => !only || only.includes(s.id)).sort((a, b) => a.rel.localeCompare(b.rel));
    const sb = { id: '_scene-bank-previews', title: 'Scene bank previews', format: flags.format || 'reel', autoSfx: false, scenes: [] };
    // Explicit starts: overlay scenes (transitions, talking-head layers) would otherwise sit on a seam.
    let t0 = 0;
    for (const s of list) { const d = s.duration ?? 3; sb.scenes.push({ scene: s.id, start: +t0.toFixed(3), duration: d, ...(s.previewVars ? { vars: s.previewVars } : {}) }); t0 += d; }
    sb.duration = +t0.toFixed(3);
    const { dir, scenes } = build(sb, { format: flags.format });
    if (flags.check) { try { hf(['check'], { cwd: dir }); } catch (e) { console.log(String(e.stdout).slice(-3000)); } }
    const at = scenes.map((s) => +(s.start + s.duration * (s.meta.previewAt ?? 0.8)).toFixed(2));
    const out = hf(['snapshot', '--at', at.join(','), '--json'], { cwd: dir });
    const j = JSON.parse(out.slice(out.indexOf('{')));
    const frames = j.frames || j.snapshots || [];
    const { execFileSync } = await import('node:child_process');
    scenes.forEach((s, i) => {
      const f = frames.find((x) => Math.abs(x.time - at[i]) < 0.02) || frames[i];
      if (!f) return;
      execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-i', f.path, '-vf', 'scale=360:-1', path.join(s.meta.dir, 'preview.png')]);
    });
    // One overview sheet of all previews (8 per row).
    const pngs = scenes.map((s) => path.join(s.meta.dir, 'preview.png')).filter((p) => fs.existsSync(p));
    const sheet = path.join(KIT, 'scene-bank', 'CONTACT-SHEET.jpg');
    if (!only && pngs.length) {
      const cols = 8, rows = Math.ceil(pngs.length / cols);
      const layout = pngs.map((_, i) => `${(i % cols) * 360}_${Math.floor(i / cols) * 640}`).join('|');
      const fill = cols * rows - pngs.length;
      const inputs = pngs.flatMap((p) => ['-i', p]);
      const pads = Array.from({ length: fill }, () => ['-f', 'lavfi', '-i', 'color=c=0x111111:s=360x640']).flat();
      const all = pngs.length + fill;
      const lay = layout + (fill ? '|' + Array.from({ length: fill }, (_, k) => `${((pngs.length + k) % cols) * 360}_${Math.floor((pngs.length + k) / cols) * 640}`).join('|') : '');
      execFileSync('ffmpeg', ['-loglevel', 'error', '-y', ...inputs, ...pads, '-filter_complex', `${Array.from({ length: all }, (_, i) => `[${i}]`).join('')}xstack=inputs=${all}:layout=${lay}`, '-frames:v', '1', '-q:v', '4', sheet]);
      console.log(`contact sheet: ${path.relative(KIT, sheet)}`);
    }
    console.log(`${pngs.length} previews written (scene-bank/<category>/<id>/preview.png)`);
  },

  async templates() {
    const dir = path.join(KIT, 'templates/campaigns');
    for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.json')).sort()) {
      const t = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
      console.log(`  ${t.id.padEnd(24)} ${String(t.targetDuration).padStart(3)}s  ${t.modes.join(' + ').padEnd(34)} ${localize(t, 'en').title}`);
    }
  },

  // Storyboard from a template, written to storyboards/<id>.json for editing.
  async new() {
    const sb = loadStoryboard(args[0] || die('new <template-id> [--lang sq|en|it] [--id name]'));
    if (flags.format) sb.format = String(flags.format);
    if (flags.palette) sb.palette = String(flags.palette);
    delete sb.__dir;
    const out = path.join(KIT, 'storyboards', `${sb.id}.json`);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, JSON.stringify(sb, null, 2) + '\n');
    console.log(`storyboards/${sb.id}.json written (${sb.language}, ${sb.scenes.length} scenes). Next: npm run video -- storyboards/${sb.id}.json`);
  },

  // One sentence -> draft storyboard (rule-based). It never renders: the
  // draft is for approval (Claude refines the copy and scenes with the person).
  async plan() {
    const brief = args.join(' ').trim() || die('plan "<one sentence describing the video>"');
    const { sb, reasoning } = planFromBrief(brief);
    const out = path.join(KIT, 'storyboards', `${sb.id}.json`);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, JSON.stringify(sb, null, 2) + '\n');
    console.log(reasoning.map((r) => '  · ' + r).join('\n'));
    console.log(`\ndraft: storyboards/${sb.id}.json — ${sb.scenes.length} scenes, ${sb.targetDuration}s, ${sb.language}, ${sb.format}`);
    for (const [i, s] of sb.scenes.entries()) console.log(`  ${String(i + 1).padStart(2)}. ${String(s.duration).padStart(4)}s  ${s.scene}`);
    console.log('\nReview / edit it, then: npm run video -- storyboards/' + sb.id + '.json');
  },

  async voices() {
    loadEnv(KIT);
    for (const [k, p] of Object.entries(PROVIDERS)) {
      const a = available(k);
      console.log(`  ${k.padEnd(11)} ${a.ok ? '✓ ready      ' : '✗ unavailable'} ${p.label} [${p.languages.join(', ')}]${a.ok ? '' : ' — ' + a.why}${p.note ? '\n              ' + p.note : ''}`);
    }
  },

  async 'talking-head'() {
    const { prepareTalkingHead } = await import('./modes/talking-head/prepare.mjs');
    const r = await prepareTalkingHead(args[0] || die('talking-head <video file> [--lang sq] [--id name]'), { lang: flags.lang || 'sq', id: flags.id, minSilence: flags.silence ? +flags.silence : 0.45 });
    console.log(`storyboards/${r.id}.json written: ${r.cuts} cuts kept from ${r.source}s → ${r.duration}s; words: ${r.words}`);
  },

  async qc() {
    const dir = projectDir(args[0]);
    const meta = JSON.parse(fs.readFileSync(path.join(dir, 'meta.json'), 'utf8'));
    const video = flags.video ? path.resolve(String(flags.video)) : path.join(dir, 'renders', `${meta.id}.mp4`);
    if (!fs.existsSync(video)) die(`no render at ${video} (run: node studio.mjs render ${args[0]})`);
    const r = await runQc({ projectDir: dir, video });
    if (!r.final) process.exitCode = 2;
  },

  // Full pipeline for one storyboard or template.
  async video() {
    const sb = loadStoryboard(args[0] || die('video <storyboard.json | template-id> [--formats reel,youtube] [--lang en]'));
    const results = await produce(sb, { formats: formatsFlag(), quality: flags.quality || 'delivery' });
    exportBundle(sb, results);
    const bad = results.filter((r) => r.report && !r.report.final);
    if (bad.length) { console.log(`\n⚠ not final: ${bad.map((r) => r.format + ' (' + r.report.score + '/100)').join(', ')} — read QC_<format>.md`); process.exitCode = 2; }
  },
  async export() { return commands.video(); },

  // A project with one scene, for working on it in the HyperFrames Studio.
  async 'preview-scene'() {
    const id = args[0] || die('preview-scene <scene-id>');
    const m = registry()[id] || die(`no scene "${id}"`);
    const { dir } = build({ id: `scene--${id}`, title: m.name, format: flags.format || 'reel', duration: m.duration, scenes: [{ scene: id, start: 0 }] }, {});
    console.log(`open it: cd ${path.relative(process.cwd(), dir)} && npx hyperframes preview`);
  },

  // Check the machine and (re)generate everything derived.
  async init() {
    const ok = (b, m) => console.log(`${b ? '  ✓' : '  ✗'} ${m}`);
    const [maj] = process.versions.node.split('.').map(Number);
    ok(maj >= 22, `Node ${process.versions.node} (need ≥ 22)`);
    let ff = false; try { execSync('ffmpeg -version', { stdio: 'pipe' }); ff = true; } catch { /* missing */ }
    ok(ff, 'FFmpeg on PATH');
    ok(fs.existsSync(path.join(KIT, 'node_modules/.bin/hyperframes')), 'hyperframes installed (npm install)');
    try { hf(['doctor']); ok(true, 'hyperframes doctor: Chrome found'); } catch (e) { ok(/Chrome\s+(system|bundled|✓)/.test(String(e.stdout)), 'hyperframes doctor (see `npx hyperframes doctor`)'); }
    await commands.brand();
    execSync('node sound-design/sfx.mjs', { cwd: KIT, stdio: 'inherit' });
    if (!flags['no-previews']) await commands.previews();
    await commands.voices();
    console.log('\nReady. Try:  npm run templates   ·   npm run video -- why-shtepia-ime');
  },

  async render() {
    const dir = projectDir(args[0]);
    const q = flags.quality || 'delivery';
    const name = JSON.parse(fs.readFileSync(path.join(dir, 'meta.json'), 'utf8')).id;
    const out = path.join(dir, 'renders', `${name}.mp4`);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    hf(['render', '-q', q, '-o', out], { cwd: dir, stdio: 'inherit' });
    console.log(out);
  },
};

if (!cmd || cmd === 'help' || flags.help) {
  console.log(fs.readFileSync(new URL(import.meta.url), 'utf8').split('\n').slice(1, 25).map((l) => l.replace(/^\/\/ ?/, '')).join('\n'));
} else if (!commands[cmd]) die(`unknown command "${cmd}" (try: node studio.mjs help)`);
else await commands[cmd]();
