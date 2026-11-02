#!/usr/bin/env node
// Shtëpia.ime Creative Studio — command line.
//
//   node studio.mjs <command> [args]      (or: npm run studio -- <command>)
//
// Commands
//   init                         check the machine, generate brand.css, the sfx library, previews
//   scenes [--mode m] [--json]   list the scene bank
//   templates                    list campaign templates
//   new <template> [--lang sq|en|it] [--format reel] [--id x]   storyboard from a template
//   plan "<one sentence>"        draft storyboard from a brief (rule-based; Claude refines it)
//   build <storyboard.json> [--format f]   storyboard -> HyperFrames project in projects/
//   music <project>              compose an original bed timed to the project's cuts
//   voice <project>              narration from storyboard.voice (OpenAI / ElevenLabs / file / none)
//   check <project>              hyperframes check (lint, runtime, layout, contrast)
//   snapshot <project> [--at 1,2]  PNG frames + contact sheet
//   render <project> [--quality draft|delivery] [--format f]
//   qc <project> [--video file]  quality gates + 0–100 score → QC.md / qc.json
//   export <project> [--formats reel,square]  final folder in exports/<id>/
//   video <storyboard|template> [--formats ...]  build → music → check → render → qc → export
//   previews [--only id,id]      regenerate scene-bank previews
//   preview-scene <scene-id>     one-scene project you can open in the Studio
import fs from 'node:fs';
import path from 'node:path';
import { KIT, build, registry, brandCss, readJSON, hf, timeline } from './render/build.mjs';

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
const loadStoryboard = (p) => {
  const file = fs.existsSync(p) ? p : fs.existsSync(path.join(KIT, p)) ? path.join(KIT, p) : null;
  if (!file) die(`no storyboard at ${p}`);
  const sb = JSON.parse(fs.readFileSync(file, 'utf8'));
  sb.__dir = path.dirname(path.resolve(file));
  return sb;
};

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
    const sb = { id: '_scene-bank-previews', title: 'Scene bank previews', format: flags.format || 'reel', autoSfx: false, scenes: list.map((s) => ({ scene: s.id, ...(s.previewVars ? { vars: s.previewVars } : {}) })) };
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
