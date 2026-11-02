// Brief -> draft storyboard, and template localisation.
//
// planFromBrief() is deliberately rule-based and transparent: it reads the
// sentence for length, language, format, palette and mode words, picks the
// closest campaign template and retimes it. It is the starting point, not
// the creative: in Claude Code the /shtepia-video skill takes this draft and
// rewrites the hook, copy and scene choices with the person, and nothing is
// rendered until they approve the script and storyboard.
import fs from 'node:fs';
import path from 'node:path';
import { KIT, registry } from './build.mjs';

export const LANGS = ['sq', 'en', 'de', 'it', 'es', 'pl', 'ru', 'fr']; // the app's 8 locales
const MAP_KEYS = ['sq', 'en', 'it', 'de', 'es', 'pl', 'ru', 'fr'];
const tables = {};
// Translations for languages a copy map does not carry: config/locales/<lang>.json, keyed by the Albanian source.
export function translate(map, lang) {
  if (map[lang] != null) return map[lang];
  if (!(lang in tables)) { try { tables[lang] = JSON.parse(fs.readFileSync(path.join(KIT, 'config/locales', `${lang}.json`), 'utf8')).strings; } catch { tables[lang] = {}; } }
  return tables[lang][map.sq] ?? map.en ?? map.sq;
}
const isLangMap = (o) => o && typeof o === 'object' && !Array.isArray(o) && 'sq' in o && Object.keys(o).every((k) => MAP_KEYS.includes(k));

// Replace every {sq,en,it} map with the chosen language (fallback sq).
export function localize(node, lang) {
  if (Array.isArray(node)) return node.map((x) => localize(x, lang));
  if (isLangMap(node)) return translate(node, lang);
  if (node && typeof node === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(node)) out[k] = localize(v, lang);
    if ('template' in node) out.language = lang;
    return out;
  }
  return node;
}

const TEMPLATE_WORDS = {
  'app-launch': ['launch', 'lansim', 'lancio', 'official', 'zyrtar', 'introduc', 'prezant', 'new app'],
  'discover-dream-home': ['dream', 'ëndrr', 'endrr', 'sogn', 'discover', 'zbulo', 'scopri', 'luxury', 'premium'],
  'how-to-search': ['how to search', 'search', 'kërk', 'kerk', 'cerca', 'filter', 'filtr', 'tutorial', 'how'],
  'explore-map': ['map', 'hartë', 'harte', 'mappa', 'tirana', 'tiranë', 'explore', 'eksplor', 'esplor', 'city', 'qytet'],
  'how-to-publish': ['publish', 'publik', 'pubblic', 'sell', 'shit', 'vend', 'list your', 'agent'],
  'features-benefits': ['feature', 'veçori', 'funzion', 'benefit', 'përfitim', 'vantagg'],
  'why-shtepia-ime': ['why', 'pse', 'perché', 'perche', 'reasons', 'arsye'],
  'app-updates': ['update', 'përditës', 'aggiorn', "what's new", 'changelog'],
  'new-feature-spotlight': ['new feature', 'veçori e re', 'nuova funzione', 'spotlight'],
  'download-app': ['download', 'shkarko', 'scarica', 'install', 'cta'],
  'brand-awareness': ['brand', 'awareness', 'find your home', 'gjej shtëpi', 'paper', 'print'],
  'emotional-home': ['emotional', 'emocion', 'emozion', 'family', 'familj', 'famiglia', 'welcome home', 'story', 'histori'],
};
// Words that ASK for a mode (weight 2.5) vs words that only hint at one (1).
const MODE_WORDS = {
  '3d': ['3d', 'three-d', 'tre dimension'],
  print: ['print', 'paper', 'letër', 'leter', 'carta', 'cut-paper', 'cutout'],
  'ui-motion': ['screen', 'ui', 'app demo', 'screenshot', 'ekran', 'schermat'],
  'kinetic-typography': ['typograph', 'tipografi', 'kinetic', 'type-only'],
  'talking-head': ['talking head', 'presenter', 'interview', 'speaker', 'footage', 'recorded'],
  cinematic: ['cinematic', 'kinematograf', 'cinematograf'],
};
const MODE_HINTS = { cinematic: ['premium', 'luxury', 'luks', 'lusso', 'film'], 'kinetic-typography': ['text', 'words'] };
// The scene that best represents a mode when a requested mode is missing.
const REPRESENTATIVE = { '3d': ['city-three-dive', 'city-iso-rise', 'phone-3d-spin'], print: ['paper-town-popup', 'paper-cards-stack'], 'ui-motion': ['phone-rise', 'search-type-results'], 'kinetic-typography': ['type-mask-lines', 'type-stack-poster'], cinematic: ['cine-location-title', 'property-kenburns-facts'] };
// Places a brief may name → map city keys used by place-aware scenes.
const PLACES = { tirane: ['tiran'], durres: ['durrës', 'durres', 'durazzo'], vlore: ['vlor', 'valona'], shkoder: ['shkod', 'scutari'], sarande: ['sarand', 'saranda'], gjirokaster: ['gjirokast', 'argirocastro'], dhermi: ['dhërmi', 'dhermi'], korce: ['korç', 'korc'], elbasan: ['elbasan'], berat: ['berat'] };

const slug = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export function planFromBrief(brief, { raw = false } = {}) {
  const b = brief.toLowerCase();
  const why = [];
  // Length
  const m = b.match(/(\d{1,3})\s*[- ]?\s*(s\b|sec|second|sekond|secondi)/);
  const dur = m ? Math.min(90, Math.max(6, +m[1])) : 20;
  why.push(m ? `length: ${dur} s (from "${m[0]}")` : 'length: 20 s (default)');
  // Language
  const lang = /\balbanian|shqip|\bsq\b/.test(b) ? 'sq' : /\bitalian|italiano/.test(b) ? 'it' : /\benglish|anglisht/.test(b) ? 'en' : /\bgerman|deutsch/.test(b) ? 'de' : /\bspanish|español/.test(b) ? 'es' : /\bpolish|polski/.test(b) ? 'pl' : /\brussian|русск/.test(b) ? 'ru' : /\bfrench|français/.test(b) ? 'fr' : 'sq';
  why.push(`language: ${lang}${/albanian|shqip|italian|english|anglisht|italiano/.test(b) ? '' : ' (default)'}`);
  // Format
  const format = /youtube|16:9|landscape|horizontal/.test(b) ? 'youtube' : /square|1:1|feed post/.test(b) ? 'square' : /4:5|portrait feed/.test(b) ? 'portrait' : /tiktok/.test(b) ? 'tiktok' : 'reel';
  why.push(`format: ${format}`);
  // Palette
  const palette = /orange (branding|background|ground)|bold orange/.test(b) ? 'night' : /light|paper|cream|white/.test(b) ? 'paper' : /navy|bank/.test(b) ? 'navy' : 'night';
  // Modes requested
  const modes = Object.entries(MODE_WORDS).filter(([, ws]) => ws.some((w) => b.includes(w))).map(([k]) => k);
  const hints = Object.entries(MODE_HINTS).filter(([k, ws]) => !modes.includes(k) && ws.some((w) => b.includes(w))).map(([k]) => k);
  if (modes.length) why.push(`modes asked for: ${modes.join(', ')}`);
  if (hints.length) why.push(`mode hints: ${hints.join(', ')}`);
  const place = Object.entries(PLACES).find(([, ws]) => ws.some((w) => b.includes(w)));
  if (place) why.push(`place: ${place[0]}`);
  // Template
  const tdir = path.join(KIT, 'templates/campaigns');
  const templates = fs.readdirSync(tdir).filter((f) => f.endsWith('.json')).map((f) => JSON.parse(fs.readFileSync(path.join(tdir, f), 'utf8')));
  const score = (t) => (TEMPLATE_WORDS[t.id] || []).reduce((n, w) => n + (b.includes(w) ? 2 : 0), 0) + t.modes.filter((x) => modes.includes(x)).length * 2.5 + t.modes.filter((x) => hints.includes(x)).length - Math.abs(t.targetDuration - dur) / 10;
  const ranked = templates.map((t) => [score(t), t]).sort((a, c) => c[0] - a[0]);
  const tpl = ranked[0][1];
  why.push(`closest template: ${tpl.id} (${tpl.modes.join(' + ')}); runners-up: ${ranked.slice(1, 3).map(([, t]) => t.id).join(', ')}`);
  // raw: keep the {sq,en,…} copy maps so the same plan can be produced in every language.
  let sb = raw ? JSON.parse(JSON.stringify(tpl)) : localize(JSON.parse(JSON.stringify(tpl)), lang);
  // Mode preference: swap a scene for a same-category one in the requested mode.
  const reg = registry();
  if (modes.length) {
    sb.scenes = sb.scenes.map((s) => {
      const meta = reg[s.scene];
      if (!meta || modes.includes(meta.mode) || meta.overlay) return s;
      const used = new Set(sb.scenes.map((y) => y.scene));
      const alt = Object.values(reg).find((x) => x.category === meta.category && modes.includes(x.mode) && x.id !== meta.id && !used.has(x.id));
      if (alt) { why.push(`swapped ${s.scene} → ${alt.id} (${alt.mode})`); return { scene: alt.id, duration: s.duration }; }
      return s;
    });
  }
  // Every mode the brief ASKS for gets at least one scene.
  for (const m of modes) {
    if (m === 'talking-head') { why.push('talking head needs real footage: run `node studio.mjs talking-head <video>`'); continue; }
    if (sb.scenes.some((x) => reg[x.scene] && reg[x.scene].mode === m)) continue;
    const pick = (REPRESENTATIVE[m] || []).find((id) => reg[id] && !sb.scenes.some((x) => x.scene === id));
    if (!pick) continue;
    const at = Math.min(1, sb.scenes.length - 1);
    why.push(`added ${pick} (${m}) in place of ${sb.scenes[at].scene}`);
    sb.scenes[at] = { scene: pick, duration: Math.max(reg[pick].duration, sb.scenes[at].duration) };
  }
  // The named place flows into place-aware scenes.
  if (place) {
    const [key] = place; const city = key; const name = { tirane: { sq: 'Tiranë', en: 'Tirana', it: 'Tirana' } }[key];
    for (const x of sb.scenes) {
      if (x.scene === 'cine-location-title') x.vars = { ...(x.vars || {}), city };
      if (x.scene === 'three-pin-drop' && name) x.vars = { ...(x.vars || {}), place: raw ? { sq: `*${name.sq}*`, en: `*${name.en}*`, it: `*${name.it}*` } : `*${name[lang]}*` };
      if (x.scene === 'map-route-line') x.vars = { ...(x.vars || {}), to: city };
    }
  }
  // Retime to the requested length (proportional, each scene ≥ 1.8 s, overlays fixed).
  const main = sb.scenes.filter((s) => !reg[s.scene].overlay);
  const total = main.reduce((n, s) => n + s.duration, 0);
  let k = dur / total;
  if (dur < total * 0.7) {
    // Much shorter: drop middle scenes (never the first or the last two).
    while (sb.scenes.length > 4 && sb.scenes.filter((s) => !reg[s.scene].overlay).reduce((n, s) => n + s.duration, 0) * 0.85 > dur) {
      const i = Math.floor(sb.scenes.length / 2); why.push(`dropped ${sb.scenes[i].scene} to fit ${dur} s`); sb.scenes.splice(i, 1);
    }
    k = dur / sb.scenes.filter((s) => !reg[s.scene].overlay).reduce((n, s) => n + s.duration, 0);
  }
  sb.scenes = sb.scenes.map((s) => (reg[s.scene].overlay ? s : { ...s, duration: Math.max(1.8, +(s.duration * k).toFixed(1)) }));
  const got = sb.scenes.filter((s) => !reg[s.scene].overlay).reduce((n, s) => n + s.duration, 0);
  const last = [...sb.scenes].reverse().find((s) => !reg[s.scene].overlay);
  last.duration = +(last.duration + (dur - got)).toFixed(1);
  const topic = brief.split(/[.:;]/)[0].replace(/^\s*(please\s+)?(create|make|build|produce|krijo|bëj|bej|crea|fai)\s+(an?|një|un[oa]?)?\s*/i, '').replace(/\d+\s*[- ]?\s*(s|sec(ond)?s?|sekonda?|secondi)\b[- ]?/i, '');
  const STOP = new Set(['a', 'an', 'the', 'about', 'of', 'for', 'in', 'on', 'with', 'and', 'premium', 'albanian', 'english', 'italian', 'advertisement', 'advert', 'ad', 'video', 'reel', 'film', 'clip', 'nje', 'per', 'me', 'ne']);
  sb.id = slug(topic).split('-').filter((w) => w && !STOP.has(w)).join('-').slice(0, 40).replace(/-$/, '') || 'video';
  sb.title = brief;
  sb.brief = brief;
  sb.targetDuration = dur;
  sb.format = format;
  sb.palette = palette;
  sb.status = 'DRAFT — approve the script and storyboard before rendering';
  delete sb.template;
  return { sb, reasoning: why };
}
