// Shtëpia.ime Creative Studio — core runtime (window.S).
// Loaded once by every built project (after GSAP). Deterministic only:
// HyperFrames seeks frames out of order, so nothing here reads a clock or an
// unseeded random source. Every visible value is a function of timeline time.
(function () {
  const S = (window.S = window.S || {});
  const html = document.documentElement;
  const css = (name, fallback) => {
    const v = getComputedStyle(html).getPropertyValue(name).trim();
    return v || fallback;
  };

  // ---------- Format ----------
  const num = (v, d) => (v === '' || v == null || Number.isNaN(parseFloat(v)) ? d : parseFloat(v));
  S.fmt = {
    get W() { return num(html.dataset.w, 1080); },
    get H() { return num(html.dataset.h, 1920); },
    get name() { return html.dataset.format || 'reel'; },
    get orient() { return html.dataset.orient || 'portrait'; },
    get portrait() { return this.H > this.W * 1.3; },
    get landscape() { return this.W > this.H * 1.2; },
    get safe() {
      return {
        top: num(css('--safe-top'), 168), bottom: num(css('--safe-bottom'), 1330),
        left: num(css('--safe-left'), 60), right: num(css('--safe-right'), 900),
      };
    },
  };

  // ---------- Small maths ----------
  S.clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  S.lerp = (a, b, t) => a + (b - a) * t;
  S.map = (x, a, b, c, d) => c + (d - c) * S.clamp((x - a) / (b - a));
  // mulberry32: seeded PRNG.
  S.rng = (seed = 1) => {
    let a = typeof seed === 'string' ? [...seed].reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 7) : seed | 0;
    return () => {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };
  // Closed-form damped spring from 0 to 1 (any frame renders on its own).
  S.spring = (t, { damping = 0.75, freq = 2.2 } = {}) => {
    if (t <= 0) return 0;
    const w = 2 * Math.PI * freq;
    if (damping >= 1) return 1 - (1 + w * t) * Math.exp(-w * t);
    const wd = w * Math.sqrt(1 - damping * damping);
    return 1 - Math.exp(-damping * w * t) * (Math.cos(wd * t) + (damping * w / wd) * Math.sin(wd * t));
  };

  // ---------- Formatting ----------
  // Prices exactly as the app prints them: "€ 640,000", "€ 850/muaj".
  S.price = (n, { currency = '€', suffix = '', sep = ',' } = {}) => {
    const s = Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, sep);
    return `${currency} ${s}${suffix}`;
  };
  S.int = (n, sep = ',') => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, sep);

  // ---------- Text ----------
  // Rich copy: "*words*" become the accent <em>; "|" or "\n" is a line break.
  // Returns the element; words are wrapped in .w spans so they can animate.
  S.rich = (el, text, { words = true } = {}) => {
    el.textContent = '';
    const lines = String(text ?? '').split(/\s*(?:\||\n)\s*/);
    lines.forEach((line, li) => {
      if (li) el.appendChild(document.createElement('br'));
      const parts = line.split(/(\*[^*]+\*)/).filter(Boolean);
      for (const part of parts) {
        const accent = part.startsWith('*') && part.endsWith('*');
        const raw = accent ? part.slice(1, -1) : part;
        const host = accent ? document.createElement('em') : el;
        if (accent) el.appendChild(host);
        const tokens = raw.split(/(\s+)/);
        for (const tok of tokens) {
          if (!tok) continue;
          // Spaces are real elements: HyperFrames normalises whitespace text
          // nodes between inline-blocks, which can glue words together.
          if (/^\s+$/.test(tok)) { const sp = document.createElement('span'); sp.className = 'sp'; sp.textContent = ' '; host.appendChild(sp); continue; }
          if (!words) { host.appendChild(document.createTextNode(tok)); continue; }
          const w = document.createElement('span');
          w.className = 'w';
          w.textContent = tok;
          host.appendChild(w);
        }
      }
    });
    return el;
  };
  S.words = (el) => Array.from(el.querySelectorAll('.w'));
  // Split each word into chars (keeps words unbreakable).
  S.chars = (el) => {
    const out = [];
    for (const w of S.words(el)) {
      const t = w.textContent; w.textContent = '';
      for (const c of t) {
        const s = document.createElement('span');
        s.className = 'ch'; s.textContent = c; w.appendChild(s); out.push(s);
      }
    }
    return out;
  };
  // NOTE: scene scripts run while their scene is still hidden, so nothing here
  // may read DOM layout (offsetTop, clientWidth, getBoundingClientRect).
  // Sizes come from S.fmt and text is measured on a canvas.

  // Lines for mask reveals: copy is split on explicit breaks ("|" or "\n"),
  // which the writer controls, never on measured wrapping.
  S.lineRich = (el, text) => {
    el.textContent = '';
    const out = [];
    for (const part of String(text ?? '').split(/\s*(?:\||\n)\s*/)) {
      const mask = document.createElement('span'); mask.className = 'line-mask';
      const line = document.createElement('span'); line.className = 'line';
      S.rich(line, part);
      mask.appendChild(line); el.appendChild(mask); out.push(line);
    }
    return out;
  };
  // Width of a string in px for a CSS font shorthand (canvas, layout-free).
  const ctx2d = document.createElement('canvas').getContext('2d');
  S.measure = (text, font) => { ctx2d.font = font; return ctx2d.measureText(text).width; };
  // Largest font size (px) at which the element's text fits maxWidth on one
  // line. Reads the element's font family/weight from its computed style.
  S.fit = (el, { maxWidth = S.fmt.W - 160, max = 400, min = 24, family = null, weight = null, style = null } = {}) => {
    const cs = getComputedStyle(el);
    const fam = family || cs.fontFamily || 'sans-serif';
    const wt = weight || cs.fontWeight || '700';
    const st = style || 'normal';
    const ls = parseFloat(cs.letterSpacing) || 0; // px at the current size; approximate by em below
    const lsEm = /em/.test(el.style.letterSpacing) ? parseFloat(el.style.letterSpacing) : (ls ? ls / (parseFloat(cs.fontSize) || 100) : 0);
    const tt = cs.textTransform;
    const text = tt === 'uppercase' ? el.textContent.toUpperCase() : tt === 'lowercase' ? el.textContent.toLowerCase() : el.textContent;
    const width = (size) => S.measure(text, `${st} ${wt} ${size}px ${fam}`) + lsEm * size * [...text].length;
    let lo = min, hi = max;
    for (let i = 0; i < 18; i++) { const mid = (lo + hi) / 2; if (width(mid) <= maxWidth) lo = mid; else hi = mid; }
    const size = Math.floor(lo);
    el.style.fontSize = size + 'px';
    el.style.whiteSpace = 'nowrap';
    return size;
  };

  // ---------- Variables ----------
  // `given` must come from the SCENE's own script: HyperFrames scopes
  // window.__hyperframes.getVariables() to the file that calls it, so a call
  // made here (in core.js) would see the root's variables, not the scene's.
  S.vars = (defaults = {}, given = {}) => {
    given = given || {};
    const out = { ...defaults };
    for (const [k, v] of Object.entries(given)) if (v !== undefined && v !== null && v !== '') out[k] = v;
    for (const [k, d] of Object.entries(defaults)) {
      if (typeof d === 'number') out[k] = num(out[k], d);
      if (typeof d === 'boolean') out[k] = out[k] === true || out[k] === 'true';
    }
    return out;
  };

  // ---------- Scene context ----------
  // const c = S.scene('scene-id', window.__hyperframes.getVariables());
  //   c.el      the scene root;  c.$('.x') / c.$$('.x') scoped queries
  //   c.v       merged variables (defaults < host values < CLI)
  //   c.tl      the scene's paused timeline;  c.dur its slot length
  //   c.done()  registers the timeline (call last)
  S.scene = (id, given = {}, defaults = {}) => {
    // The host div and the scene root share the composition id: take the
    // innermost match (the scene root, which carries the declared variables).
    const all = document.querySelectorAll('[data-composition-id="' + id + '"]');
    const el = Array.from(all).find((x) => x.hasAttribute('data-composition-variables')) || all[all.length - 1];
    const $ = (sel) => el.querySelector(sel);
    const $$ = (sel) => Array.from(el.querySelectorAll(sel));
    // Defaults come from the root's declared variables (written by the builder
    // from meta.json), then the scene's own fallbacks.
    const declared = {};
    try {
      for (const d of JSON.parse(el.getAttribute('data-composition-variables') || '[]')) {
        let val = d.default;
        if (d.type === 'number') val = num(val, 0);
        if (d.type === 'boolean') val = val === true || val === 'true';
        declared[d.id] = val;
      }
    } catch { /* no declarations */ }
    const v = S.vars({ duration: 3, in: 'auto', out: 'auto', ...defaults, ...declared }, given);
    // JSON-typed variables (lists of cards, stats…) arrive as strings.
    for (const [k, x] of Object.entries(v)) if (typeof x === 'string' && /^\s*[[{]/.test(x)) { try { v[k] = JSON.parse(x); } catch { /* plain text */ } }
    const tl = gsap.timeline({ paused: true });
    const ctx = {
      id, el, $, $$, v, tl,
      get dur() { return v.duration; },
      // When exits start: the last ~0.35 s of the slot (or `out: none`).
      get outAt() { return Math.max(0.2, v.duration - (v.outLen || 0.4)); },
      // Apply a palette to this scene only (night/paper/orange/navy/mono).
      palette(name) { if (name) el.setAttribute('data-palette', name); },
      done() {
        window.__timelines = window.__timelines || {};
        window.__timelines[id] = tl;
        return tl;
      },
    };
    if (v.palette) ctx.palette(v.palette);
    return ctx;
  };

  // Build after fonts (and listed images) are ready, so text measures right.
  // The scene must call c.done() at the END of fn (HyperFrames waits for it).
  S.ready = (fn, images = []) => {
    const imgs = images.map((src) => new Promise((res) => { const i = new Image(); i.onload = i.onerror = res; i.src = S.asset(src); }));
    return Promise.all([document.fonts.ready, ...imgs]).then(fn);
  };

  // Resolve a kit image path. Keeps paths relative ("assets/...") as the
  // render contract requires; the builder copies every referenced file.
  S.asset = (p) => String(p || '').replace(/^\/+/, '');
  // Demo listing data that matches the screenshots (config/listings.json).
  S.listing = (key) => (window.STUDIO_DATA && window.STUDIO_DATA.listings && window.STUDIO_DATA.listings[key]) || null;
  S.screen = (id, theme = 'light') => `assets/screenshots/${theme}/${id}.png`;
  S.logo = (key = 'symbol') => ({
    symbol: 'assets/logos/symbol-orange.svg', white: 'assets/logos/symbol-white.svg', black: 'assets/logos/symbol-black.svg',
    lockupDark: 'assets/logos/lockup-horizontal-dark.svg', lockupLight: 'assets/logos/lockup-horizontal-light.svg',
    stackedDark: 'assets/logos/lockup-stacked-dark.svg', stackedLight: 'assets/logos/lockup-stacked-light.svg',
    appIconLight: 'assets/logos/app-icon-light.svg', appIconDark: 'assets/logos/app-icon-dark.svg',
  }[key] || key);
  // Lockup that reads on the scene's ground: dark grounds take the white name.
  S.lockup = (ground = 'dark', stacked = false) =>
    S.logo((stacked ? 'stacked' : 'lockup') + (ground === 'light' ? 'Light' : 'Dark'));
})();
