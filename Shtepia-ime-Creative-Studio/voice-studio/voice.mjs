// VOICE STUDIO — narration for a storyboard, one clip per scene line.
//
// storyboard.voice = {
//   "provider": "none" | "file" | "openai" | "elevenlabs" | "kokoro",
//   "voice": "<provider voice id/name>",  "model": "<optional model>",
//   "language": "sq" | "en" | "it",       "speed": 1.0
// }
// and each scene may carry  "vo": "Text spoken over this scene."  (or, for
// provider "file", "voFile": "assets/voice/my-take.m4a").
//
// Keys are read from the environment only (OPENAI_API_KEY, ELEVENLABS_API_KEY),
// optionally from a git-ignored .env next to studio.mjs. Nothing is written to
// source files. Without a key the provider is reported as unavailable and the
// film is built without narration (and says so) — never with a fake voice.
//
// Output: <project>/assets/voice/sNN.m4a per line + <project>/assets/voice/words.json
// (word timings in FILM seconds: ElevenLabs alignment when available, else an
// even spread by characters — marked "estimated" for QC).
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

export const PROVIDERS = {
  none: { label: 'No narration', languages: ['sq', 'en', 'it'] },
  file: { label: 'Your own recordings (voFile per scene)', languages: ['sq', 'en', 'it'] },
  openai: { label: 'OpenAI TTS (gpt-4o-mini-tts)', env: 'OPENAI_API_KEY', languages: ['sq', 'en', 'it'], defaultVoice: 'alloy', note: 'Multilingual; Albanian pronunciation is acceptable but check names and ë/ç sounds.' },
  elevenlabs: { label: 'ElevenLabs (eleven_multilingual_v2 / eleven_v3)', env: 'ELEVENLABS_API_KEY', languages: ['sq', 'en', 'it'], defaultVoice: '21m00Tcm4TlvDq8ikWAM', note: 'Returns character alignment → exact caption timing. Use eleven_v3 for Albanian.' },
  kokoro: { label: 'Kokoro-82M local (npx hyperframes tts)', languages: ['en'], note: 'Free and offline, English voices only (af_heart, am_michael, bf_emma…). No Albanian or Italian voice: use OpenAI/ElevenLabs or your own recording for those.' },
};

export function loadEnv(kitDir) {
  const f = path.join(kitDir, '.env');
  if (!fs.existsSync(f)) return;
  for (const line of fs.readFileSync(f, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

export function available(provider) {
  const p = PROVIDERS[provider];
  if (!p) return { ok: false, why: `unknown provider "${provider}"` };
  if (p.env && !process.env[p.env]) return { ok: false, why: `${p.env} is not set (add it to Shtepia-ime-Creative-Studio/.env)` };
  return { ok: true };
}

const probeDur = (f) => +execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f], { encoding: 'utf8' }).trim();
const toM4a = (from, to) => execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-i', from, '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11', '-ar', '48000', '-c:a', 'aac', '-b:a', '160k', to]);

async function openai(text, { voice, model, speed, language }) {
  const res = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: model || 'gpt-4o-mini-tts', voice: voice || 'alloy', input: text, speed: speed || 1, response_format: 'mp3',
      instructions: `Speak ${language === 'sq' ? 'Albanian' : language === 'it' ? 'Italian' : 'English'} naturally, warm and confident, like a premium real-estate brand.` }),
  });
  if (!res.ok) throw new Error(`OpenAI TTS ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return { audio: Buffer.from(await res.arrayBuffer()), ext: 'mp3', alignment: null };
}

async function elevenlabs(text, { voice, model, language }) {
  const id = voice || PROVIDERS.elevenlabs.defaultVoice;
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${id}/with-timestamps`, {
    method: 'POST',
    headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, model_id: model || (language === 'sq' ? 'eleven_v3' : 'eleven_multilingual_v2'), output_format: 'mp3_44100_128' }),
  });
  if (!res.ok) throw new Error(`ElevenLabs ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const j = await res.json();
  return { audio: Buffer.from(j.audio_base64, 'base64'), ext: 'mp3', alignment: j.alignment || null };
}

function kokoro(text, { voice, speed }, out, kitDir) {
  const bin = path.join(kitDir, 'node_modules/.bin/hyperframes');
  execFileSync(bin, ['tts', text, '-o', out, ...(voice ? ['--voice', voice] : []), ...(speed ? ['--speed', String(speed)] : [])], { stdio: 'pipe' });
  return { file: out, alignment: null };
}

// Words from ElevenLabs character alignment.
function wordsFromAlignment(al, offset) {
  const out = []; let cur = null;
  al.characters.forEach((ch, i) => {
    const s = al.character_start_times_seconds[i], e = al.character_end_times_seconds[i];
    if (/\s/.test(ch)) { if (cur) { out.push(cur); cur = null; } return; }
    if (!cur) cur = { text: '', start: s + offset, end: e + offset };
    cur.text += ch; cur.end = e + offset;
  });
  if (cur) out.push(cur);
  return out;
}
// Even spread by character count (estimated timings).
function wordsEstimated(text, start, dur) {
  const toks = text.split(/\s+/).filter(Boolean);
  const total = toks.reduce((n, t) => n + t.length + 1, 0);
  let t = start; const out = [];
  for (const w of toks) { const d = (dur * (w.length + 1)) / total; out.push({ text: w, start: +t.toFixed(3), end: +(t + d * 0.9).toFixed(3), estimated: true }); t += d; }
  return out;
}

// Generate narration for a built timeline. scenes: [{iid, start, duration, vo, voFile}]
export async function narrate({ voice: cfg = {}, scenes, projectDir, kitDir, sbDir, log = console.log }) {
  const provider = cfg.provider || 'none';
  const lines = scenes.filter((s) => (s.vo && s.vo.trim()) || s.voFile);
  if (provider === 'none' || !lines.length) return { clips: [], words: [], provider: 'none' };
  const av = available(provider);
  if (!av.ok) { log(`  ! narration skipped: ${provider} unavailable — ${av.why}`); return { clips: [], words: [], provider: 'none', skipped: av.why }; }
  const dir = path.join(projectDir, 'assets/voice'); fs.mkdirSync(dir, { recursive: true });
  const clips = []; const words = [];
  for (const s of lines) {
    const lead = s.voOffset ?? 0.15;
    const out = path.join(dir, `${s.iid}.m4a`);
    let alignment = null;
    if (provider === 'file') {
      const src = [path.join(sbDir || kitDir, s.voFile), path.join(kitDir, s.voFile)].find((p) => fs.existsSync(p));
      if (!src) { log(`  ! ${s.iid}: voFile ${s.voFile} not found`); continue; }
      toM4a(src, out);
    } else if (provider === 'kokoro') {
      const tmp = path.join(dir, `${s.iid}.wav`); kokoro(s.vo, cfg, tmp, kitDir); toM4a(tmp, out); fs.rmSync(tmp);
    } else {
      const r = provider === 'openai' ? await openai(s.vo, cfg) : await elevenlabs(s.vo, cfg);
      const tmp = path.join(dir, `${s.iid}.${r.ext}`); fs.writeFileSync(tmp, r.audio); toM4a(tmp, out); fs.rmSync(tmp);
      alignment = r.alignment;
    }
    const dur = probeDur(out);
    if (dur > s.duration - lead + 0.4) log(`  ! ${s.iid}: narration is ${dur.toFixed(2)}s for a ${s.duration}s scene — trim the line or lengthen the scene`);
    clips.push({ id: `vo-${s.iid}`, src: `assets/voice/${s.iid}.m4a`, start: +(s.start + lead).toFixed(3), duration: +dur.toFixed(3) });
    const w = alignment ? wordsFromAlignment(alignment, s.start + lead) : s.vo ? wordsEstimated(s.vo, s.start + lead, dur) : [];
    words.push(...w);
  }
  fs.writeFileSync(path.join(dir, 'words.json'), JSON.stringify(words, null, 1));
  log(`  voice: ${clips.length} lines via ${provider}${words.some((w) => w.estimated) ? ' (caption timings estimated)' : ''}`);
  return { clips, words, provider };
}
