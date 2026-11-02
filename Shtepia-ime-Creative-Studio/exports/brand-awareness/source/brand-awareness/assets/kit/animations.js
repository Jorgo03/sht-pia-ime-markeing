// Shtëpia.ime Creative Studio — animation library (window.S.a).
// Every function places tweens on a timeline at an absolute time and returns
// the time its main motion ends, so scenes can chain: `t = S.a.x(tl, el, t)`.
// Eases follow the kit's motion rules: arrivals land on long tails (expo/power4
// .out), exits are ~45% shorter and accelerate (power3.in), opacity never bounces.
(function () {
  const S = window.S;
  const a = (S.a = {});
  const arr = (x) => (Array.isArray(x) ? x : x && x.length !== undefined && !(x instanceof Element) ? Array.from(x) : [x]);

  // ---------- Text entrances (vary these within one film) ----------

  // Words sharpen out of a blur, no translate (the house default for titles).
  a.wordsBlur = (tl, words, at, { stagger = 0.07, dur = 0.16, blur = 8 } = {}) => {
    words = arr(words);
    tl.fromTo(words, { opacity: 0, filter: `blur(${blur}px)` },
      { opacity: 1, filter: 'blur(0px)', duration: dur, ease: 'power2.out', stagger }, at);
    return at + stagger * (words.length - 1) + dur;
  };
  // Words rise out of a soft blur (editorial captions).
  a.wordsRise = (tl, words, at, { stagger = 0.08, dur = 0.8, y = 46, blur = 12 } = {}) => {
    words = arr(words);
    tl.fromTo(words, { opacity: 0, y, filter: `blur(${blur}px)` },
      { opacity: 1, y: 0, filter: 'blur(0px)', duration: dur, ease: 'expo.out', stagger }, at);
    return at + stagger * (words.length - 1) + dur * 0.6;
  };
  // Words turn from faint to ink one by one (reading-pace emphasis).
  a.wordsInk = (tl, words, at, { stagger = 0.09, from = 0.18 } = {}) => {
    words = arr(words);
    tl.fromTo(words, { opacity: from }, { opacity: 1, duration: 0.12, ease: 'none', stagger }, at);
    return at + stagger * words.length;
  };
  // Letters cascade in, one frame apart, with a slight blur (names, brand).
  a.charsIn = (tl, chars, at, { stagger = 0.034, dur = 0.5, y = 0.35 } = {}) => {
    chars = arr(chars);
    tl.fromTo(chars, { opacity: 0, yPercent: y * 100, filter: 'blur(6px)' },
      { opacity: 1, yPercent: 0, filter: 'blur(0px)', duration: dur, ease: 'power4.out', stagger }, at);
    return at + stagger * (chars.length - 1) + dur * 0.7;
  };
  // Letters drop from above with a spring (playful, print mode).
  a.charsDrop = (tl, chars, at, { stagger = 0.04, dur = 0.7 } = {}) => {
    chars = arr(chars);
    tl.fromTo(chars, { yPercent: -120, rotation: (i) => (i % 2 ? 8 : -8), opacity: 0 },
      { yPercent: 0, rotation: 0, opacity: 1, duration: dur, ease: 'back.out(1.6)', stagger }, at);
    return at + stagger * (chars.length - 1) + dur * 0.6;
  };
  // Lines rise out of masks (requires S.lines()).
  a.linesRise = (tl, lines, at, { stagger = 0.12, dur = 0.9 } = {}) => {
    lines = arr(lines);
    tl.fromTo(lines, { yPercent: 110 }, { yPercent: 0, duration: dur, ease: 'expo.out', stagger }, at);
    return at + stagger * (lines.length - 1) + dur * 0.6;
  };
  // Whole block blurs in (quiet lines).
  a.blurIn = (tl, el, at, { dur = 0.2, blur = 8 } = {}) => {
    tl.fromTo(el, { opacity: 0, filter: `blur(${blur}px)` }, { opacity: 1, filter: 'blur(0px)', duration: dur, ease: 'power2.out' }, at);
    return at + dur;
  };
  // Fade + rise (use sparingly: the generated-looking default).
  a.rise = (tl, el, at, { dur = 0.7, y = 40, stagger = 0 } = {}) => {
    tl.fromTo(el, { opacity: 0, y }, { opacity: 1, y: 0, duration: dur, ease: 'expo.out', stagger }, at);
    return at + dur * 0.6 + stagger * (arr(el).length - 1);
  };
  // Scale slam: a hero word lands big and settles (one per film).
  a.slam = (tl, el, at, { from = 2.4, dur = 0.55 } = {}) => {
    tl.fromTo(el, { scale: from, opacity: 0, filter: 'blur(14px)' },
      { scale: 1, opacity: 1, filter: 'blur(0px)', duration: dur, ease: 'expo.out' }, at);
    return at + dur * 0.5;
  };
  // Pop: chips, badges, numbers landing.
  a.pop = (tl, el, at, { dur = 0.5, stagger = 0.06, from = 0.6 } = {}) => {
    tl.fromTo(el, { scale: from, opacity: 0 }, { scale: 1, opacity: 1, duration: dur, ease: 'back.out(1.8)', stagger }, at);
    return at + dur * 0.5 + stagger * (arr(el).length - 1);
  };
  // Mask wipe reveal with clip-path (direction: left|right|up|down).
  a.wipe = (tl, el, at, { dir = 'left', dur = 0.7, ease = 'expo.inOut' } = {}) => {
    const from = { left: 'inset(0 100% 0 0)', right: 'inset(0 0 0 100%)', up: 'inset(100% 0 0 0)', down: 'inset(0 0 100% 0)' }[dir];
    tl.fromTo(el, { clipPath: from }, { clipPath: 'inset(0 0% 0 0)', duration: dur, ease }, at);
    return at + dur;
  };
  // Circular iris reveal from a point (in % of the element).
  a.iris = (tl, el, at, { x = 50, y = 50, dur = 0.6, ease = 'power3.inOut' } = {}) => {
    tl.fromTo(el, { clipPath: `circle(0% at ${x}% ${y}%)` }, { clipPath: `circle(150% at ${x}% ${y}%)`, duration: dur, ease }, at);
    return at + dur;
  };
  // Split typography: two halves of a word slide apart to reveal / together to close.
  a.splitTogether = (tl, top, bottom, at, { dist = 160, dur = 0.8 } = {}) => {
    tl.fromTo(top, { yPercent: -dist / 2, opacity: 0 }, { yPercent: 0, opacity: 1, duration: dur, ease: 'expo.out' }, at);
    tl.fromTo(bottom, { yPercent: dist / 2, opacity: 0 }, { yPercent: 0, opacity: 1, duration: dur, ease: 'expo.out' }, at);
    return at + dur * 0.6;
  };
  // Typewriter: characters appear one by one (the element must hold the text).
  a.typeOn = (tl, el, text, at, { cps = 22, caret = null } = {}) => {
    const n = [...text].length; const proxy = { i: 0 };
    tl.fromTo(proxy, { i: 0 }, {
      i: n, duration: n / cps, ease: 'none',
      onUpdate: () => { el.textContent = [...text].slice(0, Math.round(proxy.i)).join(''); },
    }, at);
    if (caret) tl.fromTo(caret, { opacity: 1 }, { opacity: 0, duration: 0.01 }, at + n / cps + 0.6);
    return at + n / cps;
  };
  // Slot roll: one word rolls through options and lands on the last.
  a.slot = (tl, el, options, at, { each = 0.11 } = {}) => {
    // A proxy tween (not tl.call) so the shown word is a pure function of time,
    // whatever order the renderer seeks frames in.
    const p = { i: 0 }; const n = options.length;
    el.textContent = options[0];
    tl.fromTo(p, { i: 0 }, {
      i: n - 1, duration: (n - 1) * each, ease: 'none',
      onUpdate: () => {
        const k = Math.min(n - 1, Math.floor(p.i + 1e-6));
        el.textContent = options[k];
        const f = p.i - k; // 0..1 within one roll: drop in from above
        el.style.transform = `translateY(${k === n - 1 ? 0 : (-40 + 40 * Math.min(1, f * 3))}%)`;
        el.style.opacity = k === n - 1 ? 1 : 0.4 + 0.6 * Math.min(1, f * 3);
      },
    }, at);
    return at + (n - 1) * each;
  };
  // Highlighter band behind words (wraps across lines).
  a.highlight = (tl, el, at, { dur = 0.5, color = 'var(--accent)' } = {}) => {
    el.style.backgroundImage = `linear-gradient(${color}, ${color})`;
    el.style.backgroundRepeat = 'no-repeat';
    el.style.backgroundPosition = '0 88%';
    el.style.boxDecorationBreak = 'clone'; el.style.webkitBoxDecorationBreak = 'clone';
    tl.fromTo(el, { backgroundSize: '0% 34%' }, { backgroundSize: '100% 34%', duration: dur, ease: 'power3.inOut' }, at);
    return at + dur;
  };

  // ---------- Numbers ----------
  // Count up into an element; `format(n)` renders each frame.
  a.count = (tl, el, from, to, at, { dur = 1.4, ease = 'power3.out', format = (n) => S.int(n) } = {}) => {
    const p = { n: from };
    el.textContent = format(from);
    tl.fromTo(p, { n: from }, { n: to, duration: dur, ease, onUpdate: () => { el.textContent = format(p.n); } }, at);
    return at + dur;
  };
  // Price counter in the app's format, e.g. "€ 640,000".
  a.price = (tl, el, to, at, opts = {}) =>
    a.count(tl, el, opts.from ?? Math.round(to * 0.62), to, at, { ...opts, format: (n) => S.price(Math.round(n / (opts.step || 1000)) * (opts.step || 1000), opts) });

  // ---------- Shapes and lines ----------
  // Draw an SVG path or line on (pathLength="100" recommended on the element).
  a.draw = (tl, paths, at, { dur = 1, ease = 'power2.inOut', stagger = 0 } = {}) => {
    paths = arr(paths);
    for (const p of paths) {
      let L = 100;
      if (!p.getAttribute('pathLength')) { try { L = p.getTotalLength() || 100; } catch { L = 100; } }
      p.style.strokeDasharray = `${L} ${L * 1.2}`;
      p.dataset.len = L;
    }
    tl.fromTo(paths, { strokeDashoffset: (i, t) => +t.dataset.len * 1.1 }, { strokeDashoffset: 0, duration: dur, ease, stagger }, at);
    return at + dur + stagger * (paths.length - 1);
  };
  // A rule (horizontal line) grows from the left.
  a.rule = (tl, el, at, { dur = 0.6 } = {}) => {
    tl.fromTo(el, { scaleX: 0, transformOrigin: '0% 50%' }, { scaleX: 1, duration: dur, ease: 'expo.out' }, at);
    return at + dur;
  };

  // ---------- Exits ----------
  a.out = (tl, el, at, { dur = 0.22, blur = 8, y = 0 } = {}) => {
    tl.to(el, { opacity: 0, y: y ? -y : '+=0', filter: `blur(${blur}px)`, duration: dur, ease: 'power3.in' }, at);
    return at + dur;
  };
  a.wordsOut = (tl, words, at, { stagger = 0.03, dur = 0.2 } = {}) => {
    tl.to(arr(words), { opacity: 0, filter: 'blur(8px)', duration: dur, ease: 'power3.in', stagger }, at);
    return at + dur + stagger * (arr(words).length - 1);
  };

  // Guard: an empty or missing target is a no-op (returns the start time), so
  // copy without, say, an accent word never hands GSAP an empty selection.
  for (const k of Object.keys(a)) {
    const f = a[k];
    a[k] = (tl, target, ...rest) => {
      const list = arr(target).filter(Boolean);
      if (!list.length) return rest.find((x) => typeof x === 'number') ?? 0;
      return f(tl, target, ...rest);
    };
  }
})();
