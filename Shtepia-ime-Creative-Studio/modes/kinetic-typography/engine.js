// KINETIC TYPOGRAPHY engine (window.S.type). Builds on components/animations.js.
// All copy stays editable: every function takes text from scene variables and
// lays it out at run time (fit-to-width, stacks, counters).
(function () {
  const S = window.S;
  const K = (S.type = {});

  // A stack of lines, each fitted to the same width (poster headline).
  // lines: ["FIND", "YOUR", "*HOME*"]. Returns the line elements.
  K.stack = (parent, lines, { width = 900, cls = 'display', max = 420, min = 60, gap = 0, height = null } = {}) => {
    const out = [];
    // The stack must also fit the safe HEIGHT (line-height ≈ 0.9 em).
    if (height) max = Math.min(max, Math.floor(height / lines.length / 0.92));
    for (const text of lines) {
      const mask = document.createElement('div'); mask.className = 'line-mask';
      const line = document.createElement('div'); line.className = `line ${cls}`;
      S.rich(line, text);
      mask.appendChild(line); parent.appendChild(mask);
      S.fit(line, { maxWidth: width, max, min });
      if (gap) mask.style.marginBottom = gap + 'px';
      out.push(line);
    }
    return out;
  };

  // A big number with a label: counts up, then the label lands.
  K.stat = (parent, { value = 8, prefix = '', suffix = '', label = '', size = 300 } = {}) => {
    const wrap = document.createElement('div'); wrap.className = 'k-stat';
    const n = document.createElement('div'); n.className = 'display k-num'; n.style.fontSize = size + 'px';
    const l = document.createElement('div'); l.className = 'kicker k-label'; l.textContent = label;
    wrap.append(n, l); parent.appendChild(wrap);
    return { wrap, num: n, label: l, run: (tl, at, dur = 1.4) => S.a.count(tl, n, 0, value, at, { dur, format: (x) => prefix + S.int(x) + suffix }) };
  };

  // Words of a sentence fill the frame one at a time, each fitted (RSVP).
  K.flash = (tl, parent, words, at, { each = 0.32, width = 920, cls = 'display' } = {}) => {
    words.forEach((w, i) => {
      const el = document.createElement('div'); el.className = `${cls} k-flash`;
      Object.assign(el.style, { position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', textAlign: 'center' });
      S.rich(el, w); parent.appendChild(el); S.fit(el, { maxWidth: width, max: 380, min: 80 });
      const t = at + i * each;
      tl.fromTo(el, { opacity: 0, scale: 1.25 }, { opacity: 1, scale: 1, duration: each * 0.45, ease: 'expo.out' }, t);
      if (i < words.length - 1) tl.to(el, { opacity: 0, duration: 0.01 }, t + each - 0.01);
    });
    return at + words.length * each;
  };

  // A horizontal ticker (linear on purpose: constant speed is the point).
  K.marquee = (tl, el, at, dur, { speed = 220 } = {}) => {
    tl.fromTo(el, { x: 0 }, { x: -speed * dur, duration: dur, ease: 'none' }, at);
    return at + dur;
  };
})();
