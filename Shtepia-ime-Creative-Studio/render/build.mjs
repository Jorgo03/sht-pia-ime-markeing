// Storyboard -> self-contained HyperFrames project.
//
// A storyboard (see documentation/STORYBOARD.md) lists scenes from the scene
// bank with their variables, durations and sounds. build() writes:
//   projects/<id>/index.html            root: scene hosts, audio, footage
//   projects/<id>/compositions/*.html   one instance per scene (ids renamed)
//   projects/<id>/assets/kit/*          runtime, engines, vendored GSAP/Three, brand.css, data.js
//   projects/<id>/assets/...            only the media the film uses
//   projects/<id>/storyboard.json       the plan it was built from
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export const KIT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const HF_VERSION = JSON.parse(fs.readFileSync(path.join(KIT, 'package.json'), 'utf8')).dependencies.hyperframes.replace(/^[^\d]*/, '');
export const readJSON = (p) => JSON.parse(fs.readFileSync(path.isAbsolute(p) ? p : path.join(KIT, p), 'utf8'));
const write = (p, s) => { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, s); };
const copy = (from, to) => { fs.mkdirSync(path.dirname(to), { recursive: true }); fs.copyFileSync(from, to); };
const attr = (s) => String(s).replace(/&/g, '&amp;').replace(/'/g, '&#39;').replace(/</g, '&lt;');

export const MODES = ['print', '3d', 'ui-motion', 'kinetic-typography', 'talking-head', 'cinematic'];

// ---------- Brand ----------
const kebab = (k) => k.replace(/[A-Z0-9]/g, (c) => '-' + c.toLowerCase()).replace(/-(\d)/, '$1');
export function brandCss(brand = readJSON('config/brand.json'), def = 'night') {
  const vars = (p) => Object.entries(p).filter(([k]) => k !== 'label').map(([k, v]) => `  --${kebab(k)}: ${v};`).join('\n');
  const f = brand.fonts;
  let out = `/* Generated from config/brand.json — edit that file, not this one. */\n`;
  out += `:root {\n  --font-serif: "${f.serif}"; --font-sans: "${f.sans}"; --font-mono: "${f.mono}"; --font-display: "${f.display}";\n  --door: ${brand.logo.door};\n${vars(brand.palettes[def])}\n}\n`;
  for (const [name, p] of Object.entries(brand.palettes)) out += `[data-palette="${name}"] {\n${vars(p)}\n  color: var(--ink);\n}\n`;
  return out;
}

// ---------- Scene bank ----------
let _registry = null;
export function registry() {
  if (_registry) return _registry;
  const root = path.join(KIT, 'scene-bank');
  const out = {};
  for (const cat of fs.readdirSync(root)) {
    const cdir = path.join(root, cat);
    if (!fs.statSync(cdir).isDirectory()) continue;
    for (const id of fs.readdirSync(cdir)) {
      const dir = path.join(cdir, id);
      const metaFile = path.join(dir, 'meta.json');
      if (!fs.existsSync(metaFile)) continue;
      const meta = JSON.parse(fs.readFileSync(metaFile, 'utf8'));
      if (meta.id !== id) throw new Error(`scene-bank/${cat}/${id}: meta.id is "${meta.id}"`);
      if (out[id]) throw new Error(`duplicate scene id ${id}`);
      out[id] = { ...meta, category: cat, dir, rel: `scene-bank/${cat}/${id}` };
    }
  }
  return (_registry = out);
}
export const resetRegistry = () => { _registry = null; };

// Declared variables for a scene's root (HyperFrames' data-composition-variables).
function declareVars(meta) {
  const std = {
    duration: { type: 'number', label: 'Duration (s)', default: meta.duration ?? 3, min: 0.5, max: 600, step: 0.1 },
    start: { type: 'number', label: 'Start in film (s, set by the builder)', default: 0, min: 0, max: 3600, step: 0.01 },
    in: { type: 'enum', label: 'Transition in', default: meta.in ?? 'auto', options: ['auto', 'none', 'blur', 'whip-left', 'whip-right', 'whip-up', 'zoom-in', 'zoom-out', 'iris', 'slide-up', 'shutter', 'paper', 'flood', 'dip'] },
    out: { type: 'enum', label: 'Transition out', default: meta.out ?? 'auto', options: ['auto', 'none', 'blur', 'whip-left', 'whip-right', 'whip-up', 'zoom-in', 'zoom-out', 'iris', 'slide-up', 'shutter', 'paper', 'dip'] },
    palette: { type: 'enum', label: 'Palette', default: meta.palette ?? '', options: ['', 'night', 'paper', 'orange', 'navy', 'mono'] },
  };
  const all = { ...std, ...(meta.vars || {}) };
  return Object.entries(all).map(([id, v]) => {
    const d = { id, type: v.type || 'string', label: v.label || id, default: v.default };
    if (d.type === 'enum') d.options = (v.options || []).map((o) => (typeof o === 'object' ? o : { value: o, label: o || '(scene default)' }));
    for (const k of ['min', 'max', 'step', 'placeholder', 'maxLength']) if (v[k] !== undefined) d[k] = v[k];
    if (d.type === 'screen') { d.type = 'enum'; d.options = Object.keys(readJSON('config/screens.json').screens).map((s) => ({ value: s, label: s })); }
    if (d.type === 'image' || d.type === 'asset') d.type = 'string';
    if (d.type === 'json') { d.type = 'string'; d.default = JSON.stringify(v.default); }
    return d;
  });
}

// Render one scene instance: rename its composition id and set its canvas.
export function instantiate(meta, iid, fmt) {
  let html = fs.readFileSync(path.join(meta.dir, 'scene.html'), 'utf8');
  const id = meta.id;
  html = html.replaceAll(`"${id}"`, `"${iid}"`).replaceAll(`'${id}'`, `'${iid}'`);
  html = html.replace(/data-width="\d+"/, `data-width="${fmt.width}"`).replace(/data-height="\d+"/, `data-height="${fmt.height}"`);
  const decl = JSON.stringify(declareVars(meta));
  if (!/data-composition-variables=/.test(html)) throw new Error(`${meta.rel}/scene.html: root needs data-composition-variables='[]'`);
  html = html.replace(/data-composition-variables='[^']*'/, `data-composition-variables='${attr(decl)}'`);
  return html;
}

// ---------- Assets ----------
const MEDIA_RE = /assets\/(?:logos|screenshots|property-images|illustrations|footage|music|sound|audio|images|voice)\/[\w\-./%]+\.(?:png|jpe?g|webp|svg|gif|mp3|m4a|wav|aac|mp4|webm|mov|json)/g;
function collectAssets(texts, screenIds) {
  const set = new Set();
  for (const t of texts) for (const m of String(t).matchAll(MEDIA_RE)) set.add(decodeURIComponent(m[0]));
  const all = texts.join('\n');
  for (const s of screenIds) if (new RegExp(`["'\\s:,\\[]${s.replace('-', '\\-')}["'\\s,\\]]`).test(all)) {
    set.add(`assets/screenshots/light/${s}.png`); set.add(`assets/screenshots/dark/${s}.png`);
  }
  return [...set];
}

// ---------- Build ----------
export function resolveFormat(name) {
  const F = readJSON('config/formats.json');
  const f = F.formats[name || F.default];
  if (!f) throw new Error(`unknown format "${name}" (have: ${Object.keys(F.formats).join(', ')})`);
  return { name: name || F.default, ...f, fps: F.fps };
}

export function timeline(sb) {
  const reg = registry();
  let t = 0; const out = [];
  sb.scenes.forEach((s, i) => {
    const meta = reg[s.scene];
    if (!meta) throw new Error(`scene ${i + 1}: "${s.scene}" is not in the scene bank (npm run scenes lists them)`);
    const dur = +(s.duration ?? meta.duration ?? 3);
    // Overlay transitions (meta.overlay) sit centred on the seam they follow
    // and do not move the timeline on; they paint above everything.
    if (meta.overlay) {
      const start = s.start !== undefined ? +s.start : Math.max(0, t - dur / 2);
      out.push({ ...s, meta, index: i, start: +start.toFixed(3), duration: +dur.toFixed(3), z: s.z ?? 900 + i, iid: `s${String(i + 1).padStart(2, '0')}-${meta.id}` });
      return;
    }
    const start = s.start !== undefined ? +s.start : Math.max(0, t - (s.overlap ?? 0));
    out.push({ ...s, meta, index: i, start: +start.toFixed(3), duration: +dur.toFixed(3), iid: `s${String(i + 1).padStart(2, '0')}-${meta.id}` });
    t = Math.max(t, start + dur);
  });
  return { scenes: out, duration: +t.toFixed(3) };
}

export function build(sb, { out, format, log = console.log } = {}) {
  const fmt = resolveFormat(format || sb.format);
  const id = sb.id || 'untitled';
  const dir = out || path.join(KIT, 'projects', fmt.name === (sb.format || 'reel') ? id : `${id}--${fmt.name}`);
  const brand = readJSON('config/brand.json');
  const screens = readJSON('config/screens.json');
  const map = readJSON('assets/illustrations/albania-map.json');
  const sfxLib = readJSON('assets/sound/sfx/library.json');
  const { scenes, duration: scenesEnd } = timeline(sb);

  fs.rmSync(path.join(dir, 'compositions'), { recursive: true, force: true });
  fs.mkdirSync(path.join(dir, 'compositions'), { recursive: true });

  // Kit runtime.
  const kit = path.join(dir, 'assets/kit');
  fs.mkdirSync(kit, { recursive: true });
  for (const f of ['core.js', 'animations.js', 'camera.js', 'studio.css']) copy(path.join(KIT, 'components', f), path.join(kit, f));
  for (const f of ['gsap.min.js', 'three.min.js']) copy(path.join(KIT, 'components/vendor', f), path.join(kit, f));
  write(path.join(kit, 'fonts.css'), fs.readFileSync(path.join(KIT, 'components/fonts.css'), 'utf8'));
  write(path.join(kit, 'brand.css'), brandCss(brand, sb.palette || 'night'));
  const modeFiles = [];
  for (const m of MODES) for (const ext of ['js', 'css']) {
    const f = path.join(KIT, 'modes', m, `engine.${ext}`);
    if (fs.existsSync(f)) { copy(f, path.join(kit, `modes/${m}.${ext}`)); modeFiles.push(`modes/${m}.${ext}`); }
  }
  // The official logo set always ships (scenes pick dark/light versions at run time).
  for (const f of fs.readdirSync(path.join(KIT, 'assets/logos')).filter((x) => x.endsWith('.svg'))) copy(path.join(KIT, 'assets/logos', f), path.join(dir, 'assets/logos', f));
  for (const f of ['paper-grain.png', 'film-grain.png']) copy(path.join(KIT, 'assets/illustrations', f), path.join(dir, 'assets/illustrations', f));
  for (const f of fs.readdirSync(path.join(KIT, 'assets/fonts'))) copy(path.join(KIT, 'assets/fonts', f), path.join(dir, 'assets/fonts', f));
  let words = null;
  if (sb.captions && Array.isArray(sb.captions.words)) words = sb.captions.words;
  else if (sb.captions && sb.captions.words) words = readJSON(path.isAbsolute(sb.captions.words) ? sb.captions.words : path.join(sb.__dir || KIT, sb.captions.words));
  write(path.join(kit, 'data.js'), `// Generated by render/build.mjs\nwindow.STUDIO_DATA = ${JSON.stringify({ brand: { name: brand.name, handle: brand.handle, website: brand.website }, screens, map: { width: map.width, height: map.height, paths: map.paths, cities: map.cities }, listings: readJSON('config/listings.json').listings, words, lang: sb.language || 'sq' })};\n`);

  // Scenes.
  const texts = [];
  const hosts = [];
  for (const s of scenes) {
    const html = instantiate(s.meta, s.iid, fmt);
    write(path.join(dir, 'compositions', `${s.iid}.html`), html);
    texts.push(html);
    const vals = { ...(s.vars || {}), duration: s.duration, start: s.start };
    if (s.in) vals.in = s.in; if (s.out) vals.out = s.out; if (s.palette) vals.palette = s.palette;
    texts.push(JSON.stringify(vals));
    const kind = s.meta.trackKind || 'graphics';
    hosts.push(`      <div id="${s.iid}" class="clip" data-composition-id="${s.iid}" data-composition-src="compositions/${s.iid}.html" data-start="${s.start}" data-duration="${s.duration}" data-track-index="${s.track ?? (kind === 'captions' ? 9 : 1)}" data-track-kind="${kind}" data-variable-values='${attr(JSON.stringify(vals))}' style="z-index:${s.z ?? 10 + s.index}"></div>`);
  }

  // Footage (talking head / real video), placed directly in the root.
  const media = [];
  let track = 20;
  (sb.footage || []).forEach((f, i) => {
    const len = +(f.out - f.in).toFixed(3);
    texts.push(f.src);
    // rect: place the footage in part of the frame (split screens), e.g. {"top":0,"height":"50%"}.
    const r = f.rect || {};
    const box = r.top !== undefined || r.height !== undefined ? `left:${r.left ?? 0};top:${r.top ?? 0};width:${r.width ?? '100%'};height:${r.height ?? '100%'}` : 'inset:0';
    media.push(`      <div id="fw-${i}" class="clip footage" data-start="${f.start}" data-duration="${len}" data-track-index="0" style="position:absolute;${box};z-index:${f.z ?? 1};overflow:hidden">
        <div id="fp-${i}" class="punch" style="position:absolute;inset:0">
          <video id="fv-${i}" src="${f.src}" data-media-start="${f.in}" ${f.hasAudio === false ? 'muted' : 'data-has-audio="true"'} data-volume="${f.volume ?? 1}" playsinline style="position:absolute;left:0;top:0;width:100%;height:100%;object-fit:cover"></video>
        </div>
      </div>`);
  });

  // Audio: voice, music, sound effects (peak lands one frame after the picture).
  const audio = [];
  const A = sb.audio || {};
  const frame = 1 / fmt.fps;
  const film = sb.duration ? +sb.duration : scenesEnd;
  // Narration clips from the voice studio (one per scene line).
  for (const v of A.voiceClips || []) {
    texts.push(v.src);
    audio.push(`      <audio id="${v.id}" class="clip" src="${v.src}" data-start="${v.start}" data-duration="${v.duration}" data-track-index="${track++}" data-volume="${v.volume ?? 1}"></audio>`);
  }
  if (A.voice && A.voice.src) {
    texts.push(A.voice.src);
    audio.push(`      <audio id="voice" class="clip" src="${A.voice.src}" data-start="${A.voice.start ?? 0}" data-track-index="${track++}" data-volume="${A.voice.volume ?? 1}"></audio>`);
  }
  if (A.music && A.music.src) {
    texts.push(A.music.src);
    const hasVoice = (A.voice && A.voice.src) || (A.voiceClips && A.voiceClips.length);
    const vol = A.music.volume ?? (hasVoice ? 0.16 : 0.55);
    audio.push(`      <audio id="music" class="clip" src="${A.music.src}" data-start="${A.music.start ?? 0}" data-duration="${film}" data-track-index="${track++}" data-volume="${vol}" data-fade-in="${A.music.fadeIn ?? 0.3}" data-fade-out="${A.music.fadeOut ?? 1.2}"></audio>`);
  }
  const cues = [...(A.sfx || [])];
  if (sb.autoSfx !== false) for (const s of scenes) for (const c of (s.sfx ?? s.meta.sfx ?? [])) cues.push({ ...c, at: s.start + (c.at ?? 0) });
  cues.sort((a, b) => a.at - b.at);
  const used = {};
  cues.forEach((c, i) => {
    let key = c.id;
    // Rotate takes: whoosh-air -> whoosh-air-1/2/3 in turn.
    const takes = Object.keys(sfxLib).filter((k) => k === key || k.startsWith(key + '-') && /^\d+$/.test(k.slice(key.length + 1)));
    if (!sfxLib[key] && takes.length) { used[key] = (used[key] || 0) + 1; key = takes[(used[key] - 1) % takes.length]; }
    const s = sfxLib[key];
    if (!s) { log(`  ! sfx "${c.id}" not in assets/sound/sfx/library.json — skipped`); return; }
    const at = Math.max(0, c.at + frame - s.peak);
    if (at >= film) return;
    texts.push(s.file);
    audio.push(`      <audio id="sfx-${i}" class="clip" src="${s.file}" data-start="${at.toFixed(3)}" data-duration="${Math.min(s.duration, film - at).toFixed(3)}" data-track-index="${track++}" data-volume="${c.volume ?? 0.7}"></audio>`);
  });

  // Root timeline: footage punch-ins live here (they act on root elements).
  const rootTweens = [];
  (sb.footage || []).forEach((f, i) => {
    for (const p of f.punch || []) rootTweens.push(`tl.set('#fp-${i}', { scale: ${p.scale ?? 1.15}, xPercent: ${p.x ?? 0}, yPercent: ${p.y ?? 0} }, ${(+f.start + +p.at - +f.in).toFixed(3)});`);
  });

  const safe = fmt.safe;
  const capX = Math.max(safe.left, fmt.width - safe.right);
  const styleVars = `--W:${fmt.width}px;--H:${fmt.height}px;--safe-top:${safe.top}px;--safe-bottom:${safe.bottom}px;--safe-left:${safe.left}px;--safe-right:${safe.right}px;--cap-x:${capX}px`;
  const index = `<!doctype html>
<!-- ${brand.name} Creative Studio — "${(sb.title || id).replace(/--/g, '-')}"
     Built by render/build.mjs from storyboard.json (${fmt.label}). Edit the
     storyboard and rebuild, or edit these files directly in the HyperFrames Studio. -->
<html lang="${sb.language || 'sq'}" data-format="${fmt.name}" data-w="${fmt.width}" data-h="${fmt.height}" data-orient="${fmt.orientation}" data-resolution="${fmt.orientation === 'landscape' ? 'landscape' : 'portrait'}" style="${styleVars}">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=${fmt.width}, height=${fmt.height}" />
    <title>${(sb.title || id).replace(/</g, '')}</title>
    <link rel="stylesheet" href="assets/kit/fonts.css" />
    <link rel="stylesheet" href="assets/kit/brand.css" />
    <link rel="stylesheet" href="assets/kit/studio.css" />
${modeFiles.filter((f) => f.endsWith('.css')).map((f) => `    <link rel="stylesheet" href="assets/kit/${f}" />`).join('\n')}
    <script src="assets/kit/gsap.min.js"></script>
    <script src="assets/kit/data.js"></script>
    <script src="assets/kit/core.js"></script>
    <script src="assets/kit/animations.js"></script>
    <script src="assets/kit/camera.js"></script>
${modeFiles.filter((f) => f.endsWith('.js')).map((f) => `    <script src="assets/kit/${f}"></script>`).join('\n')}
    <style>
      #root { position: relative; width: ${fmt.width}px; height: ${fmt.height}px; overflow: hidden; }
      #backdrop { position: absolute; inset: 0; background: var(--ground); }
    </style>
  </head>
  <body data-palette="${sb.palette || 'night'}">
    <div id="root" data-composition-id="main" data-start="0" data-duration="${film}" data-width="${fmt.width}" data-height="${fmt.height}" data-fps="${fmt.fps}">
      <div id="backdrop"></div>
${media.join('\n')}
${hosts.join('\n')}
${audio.join('\n')}
    </div>
    <script>
      window.__timelines = window.__timelines || {};
      const tl = gsap.timeline({ paused: true });
      ${rootTweens.join('\n      ')}
      window.__timelines['main'] = tl;
    </script>
  </body>
</html>
`;
  write(path.join(dir, 'index.html'), index);
  texts.push(index);

  // Listing photos are referenced by listing key (config/listings.json).
  const listings = readJSON('config/listings.json').listings;
  const allText = texts.join('\n');
  for (const [k, L] of Object.entries(listings)) if (allText.includes(k) && L.photo) texts.push(L.photo);
  // Scenes whose default listing is used without a storyboard override.
  for (const s of scenes) { const d = s.meta.vars && s.meta.vars.listing && s.meta.vars.listing.default; if (d && listings[d] && !(s.vars && s.vars.listing)) texts.push(listings[d].photo); }
  // Media the film uses (and nothing else).
  const assets = collectAssets(texts, Object.keys(screens.screens));
  const missing = [];
  for (const a of assets) {
    // Media generated straight into the project (voice, music) is already in place.
    if (/^assets\/(voice|audio)\//.test(a) && fs.existsSync(path.join(dir, a))) continue;
    const src = path.isAbsolute(a) ? a : [path.join(sb.__dir || KIT, a), path.join(KIT, a)].find((p) => fs.existsSync(p));
    if (!src) { missing.push(a); continue; }
    copy(src, path.join(dir, a));
  }
  if (missing.length) log(`  ! missing assets: ${missing.join(', ')}`);

  // Project files so the folder works on its own with the HyperFrames CLI.
  write(path.join(dir, 'meta.json'), JSON.stringify({ id, name: sb.title || id, format: fmt.name, builtFrom: 'Shtepia-ime-Creative-Studio' }, null, 2) + '\n');
  write(path.join(dir, 'hyperframes.json'), JSON.stringify({ $schema: 'https://hyperframes.heygen.com/schema/hyperframes.json', paths: { blocks: 'compositions', components: 'compositions/components', assets: 'assets' }, media: { autoProxy: true } }, null, 2) + '\n');
  write(path.join(dir, 'package.json'), JSON.stringify({ name: id, private: true, type: 'module', scripts: { dev: `npx --yes hyperframes@${HF_VERSION} preview`, check: `npx --yes hyperframes@${HF_VERSION} check`, render: `npx --yes hyperframes@${HF_VERSION} render` } }, null, 2) + '\n');
  const { __dir, ...clean } = sb;
  write(path.join(dir, 'storyboard.json'), JSON.stringify(clean, null, 2) + '\n');
  write(path.join(dir, '.gitignore'), '.hyperframes/\nrenders/\n');
  log(`built ${path.relative(KIT, dir) || dir}: ${scenes.length} scenes, ${film}s, ${fmt.width}x${fmt.height}, ${audio.length} audio clips, ${assets.length - missing.length} media files`);
  return { dir, fmt, scenes, duration: film, missing };
}

// The hyperframes CLI, pinned, with the fast headless shell when present.
export function hf(args, { cwd, stdio = 'pipe', timeout = 1800000 } = {}) {
  const bin = path.join(KIT, 'node_modules/.bin/hyperframes');
  const env = { ...process.env };
  if (!env.PRODUCER_HEADLESS_SHELL_PATH) {
    const base = '/opt/pw-browsers';
    try {
      for (const d of fs.readdirSync(base).filter((x) => x.startsWith('chromium_headless_shell'))) {
        const p = path.join(base, d, 'chrome-headless-shell-linux64/chrome-headless-shell');
        if (fs.existsSync(p)) env.PRODUCER_HEADLESS_SHELL_PATH = p;
      }
    } catch { /* not this machine */ }
  }
  return execFileSync(fs.existsSync(bin) ? bin : 'npx', fs.existsSync(bin) ? args : ['--yes', `hyperframes@${HF_VERSION}`, ...args], { cwd, env, stdio, timeout, maxBuffer: 1 << 28, encoding: 'utf8' });
}
