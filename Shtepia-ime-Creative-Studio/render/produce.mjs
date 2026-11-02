// Production pipeline: storyboard -> narration -> music -> project -> check ->
// render -> QC -> export. Each step can also run alone from studio.mjs.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { KIT, build, timeline, readJSON, resolveFormat, hf, registry } from './build.mjs';
import { narrate, loadEnv } from '../voice-studio/voice.mjs';
import { composeBed } from '../sound-design/music.mjs';
import { qc } from '../quality-control/qc.mjs';

export function projectPath(sb, fmtName) {
  const base = sb.format || 'reel';
  return path.join(KIT, 'projects', !fmtName || fmtName === base ? sb.id : `${sb.id}--${fmtName}`);
}

// Narration + music are generated once per storyboard into the project, then
// the project is (re)built with them on the timeline.
export async function prepareAudio(sb, { format, log = console.log } = {}) {
  loadEnv(KIT);
  const dir = projectPath(sb, format);
  fs.mkdirSync(path.join(dir, 'assets/audio'), { recursive: true });
  const { scenes, duration } = timeline(sb);
  const film = sb.duration ? +sb.duration : duration;
  const A = (sb.audio = sb.audio || {});
  // Voice.
  if (sb.voice && sb.voice.provider && sb.voice.provider !== 'none') {
    const r = await narrate({ voice: sb.voice, scenes, projectDir: dir, kitDir: KIT, sbDir: sb.__dir, log });
    A.voiceClips = r.clips;
    if (r.words.length) sb.captions = { ...(sb.captions || {}), words: r.words };
    if (r.skipped) sb.__notes = [...(sb.__notes || []), `Narration skipped: ${r.skipped}`];
  }
  // Music: an original bed composed to this film's cuts.
  if (A.music && A.music.bed && !A.music.src) {
    const hits = scenes.filter((s) => !s.meta.overlay && s.start > 0.5).map((s) => s.start);
    const pay = scenes.find((s) => s.payoff) || [...scenes].reverse().find((s) => ['logo-reveals', 'outros', 'call-to-actions'].includes(s.meta.category)) || scenes[scenes.length - 1];
    const m = composeBed({ duration: film, bpm: A.music.bpm || 100, mood: A.music.bed, hits, payoff: Math.min(film - 1.2, pay.start), seed: A.music.seed || 7 });
    const wav = path.join(dir, 'assets/audio/bed.wav');
    m.wav(wav);
    execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-i', wav, '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11', '-ar', '48000', '-c:a', 'aac', '-b:a', '192k', path.join(dir, 'assets/audio/bed.m4a')]);
    fs.rmSync(wav);
    A.music = { ...A.music, src: 'assets/audio/bed.m4a' };
    log(`  music: original "${A.music.bed}" bed, ${hits.length} hits on the cuts, payoff at ${pay.start}s`);
  }
  return sb;
}

export async function produce(sb, { formats, quality = 'delivery', log = console.log, skipQc = false } = {}) {
  const list = formats && formats.length ? formats : [sb.format || 'reel'];
  const results = [];
  for (const f of list) {
    const s = JSON.parse(JSON.stringify(sb)); s.__dir = sb.__dir;
    log(`\n▶ ${s.id} — ${resolveFormat(f).label}`);
    await prepareAudio(s, { format: f, log });
    const { dir } = build(s, { format: f, out: projectPath(s, f), log });
    const video = render(dir, { quality, log });
    const report = skipQc ? null : await qc({ projectDir: dir, video, log });
    results.push({ format: f, dir, video, report, notes: s.__notes || [] });
  }
  return results;
}

export function render(dir, { quality = 'delivery', log = console.log } = {}) {
  const meta = JSON.parse(fs.readFileSync(path.join(dir, 'meta.json'), 'utf8'));
  const out = path.join(dir, 'renders', `${meta.id}.mp4`);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  const t0 = Date.now();
  hf(['render', '-q', quality, '-o', out], { cwd: dir, stdio: ['ignore', 'pipe', 'pipe'] });
  log(`  rendered ${path.relative(KIT, out)} in ${((Date.now() - t0) / 1000).toFixed(0)} s`);
  return out;
}

// ---------- Export ----------
// exports/<id>/ : one MP4 per format + thumbnail + script + caption + hashtags
// + storyboard + QC report + the source project(s).
export function exportBundle(sb, results, { log = console.log } = {}) {
  const out = path.join(KIT, 'exports', sb.id);
  fs.rmSync(out, { recursive: true, force: true });
  fs.mkdirSync(path.join(out, 'source'), { recursive: true });
  const reg = registry();
  const { scenes, duration } = timeline(sb);
  for (const r of results) {
    const name = `${sb.id}_${r.format}.mp4`;
    fs.copyFileSync(r.video, path.join(out, name));
    if (r.report) fs.copyFileSync(path.join(r.dir, 'qc/QC.md'), path.join(out, `QC_${r.format}.md`));
    if (r.report && fs.existsSync(path.join(r.dir, 'qc/contact.jpg'))) fs.copyFileSync(path.join(r.dir, 'qc/contact.jpg'), path.join(out, `contact_${r.format}.jpg`));
    // Source project without renders / caches.
    fs.cpSync(r.dir, path.join(out, 'source', path.basename(r.dir)), { recursive: true, filter: (p) => !/[\\/](renders|\.hyperframes|qc)([\\/]|$)/.test(p) });
  }
  // Thumbnail: the frame most of the film's identity is on (thumbnailAt, else 35%).
  const first = results[0];
  const at = sb.thumbnailAt ?? +(duration * 0.35).toFixed(2);
  execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-ss', String(at), '-i', first.video, '-frames:v', '1', '-q:v', '2', path.join(out, 'thumbnail.jpg')]);
  // Script + storyboard (human-readable).
  const lines = [`# ${sb.title || sb.id}`, '', `Language: ${sb.language || 'sq'} · ${duration.toFixed(1)} s · formats: ${results.map((r) => r.format).join(', ')}`, ''];
  if (sb.concept) lines.push('## Concept', '', sb.concept, '');
  lines.push('## Storyboard', '', '| # | Time | Scene | Mode | On screen | Voice-over | Sound |', '|---|---|---|---|---|---|---|');
  scenes.forEach((s, i) => {
    const m = reg[s.scene];
    const onScreen = Object.entries(s.vars || {}).filter(([k, v]) => typeof v === 'string' && !/^assets\//.test(v) && !['theme', 'listing', 'screen', 'region', 'city', 'from', 'to'].includes(k)).map(([, v]) => v.replace(/\*/g, '')).join(' / ');
    const sfx = (s.sfx ?? m.sfx ?? []).map((x) => x.id).join(', ');
    lines.push(`| ${i + 1} | ${s.start.toFixed(1)}–${(s.start + s.duration).toFixed(1)} s | ${m.name} (\`${m.id}\`) | ${m.mode} | ${onScreen || '(scene defaults)'} | ${s.vo || ''} | ${sfx} |`);
  });
  lines.push('', '## Script (voice-over)', '', ...(scenes.some((s) => s.vo) ? scenes.filter((s) => s.vo).map((s) => `- **${s.start.toFixed(1)} s** — ${s.vo}`) : ['No narration: the film is carried by on-screen text and sound.']), '');
  fs.writeFileSync(path.join(out, 'script-and-storyboard.md'), lines.join('\n'));
  fs.writeFileSync(path.join(out, 'storyboard.json'), JSON.stringify({ ...sb, __dir: undefined, __notes: undefined }, null, 2));
  fs.writeFileSync(path.join(out, 'caption.txt'), (sb.caption || '').trim() + '\n');
  fs.writeFileSync(path.join(out, 'hashtags.txt'), (sb.hashtags || []).map((h) => (h.startsWith('#') ? h : '#' + h)).join(' ') + '\n');
  const summary = results.map((r) => `- ${r.format}: \`${sb.id}_${r.format}.mp4\`${r.report ? ` — QC ${r.report.score}/100 ${r.report.final ? '✅ final' : '⚠️ not final (' + (r.report.failedRequired.join(', ') || 'score') + ')'}` : ''}`).join('\n');
  fs.writeFileSync(path.join(out, 'README.md'), [`# ${sb.title || sb.id}`, '', summary, '', 'Files: thumbnail.jpg · caption.txt · hashtags.txt · script-and-storyboard.md · storyboard.json · QC_<format>.md · contact_<format>.jpg · source/ (open any folder there with `npx hyperframes preview`)', '', ...(results.flatMap((r) => r.notes).length ? ['## Notes', '', ...new Set(results.flatMap((r) => r.notes)).values()].map((n) => (n.startsWith('#') || !n ? n : '- ' + n)) : [])].join('\n') + '\n');
  log(`\nexported → ${path.relative(KIT, out)}/`);
  return out;
}
