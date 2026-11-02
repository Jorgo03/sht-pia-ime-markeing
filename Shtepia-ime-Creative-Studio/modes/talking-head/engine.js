// TALKING HEAD STUDIO engine (window.S.th) — graphics over REAL recorded video.
// The footage itself lives in the project root (HyperFrames only decodes media
// that sits directly in the host root); the builder places it from
// storyboard.footage and modes/talking-head/prepare.mjs (silence cuts,
// transcript). This file draws the graphics layer: word-by-word captions with
// keyword highlights, lower thirds, split-screen frames, B-roll cards.
// It never generates a person.
(function () {
  const S = window.S;
  const TH = (S.th = {});

  // Words: [{text, start, end}] in film seconds (from transcript.json). Group
  // them (break on pauses >= 0.15 s, punctuation, or `max` words), and show one
  // group at a time; the active word lights up; keywords get the accent.
  TH.captions = (c, parent, words, { max = 3, offset = 0, keywords = [], y = null, size = 74 } = {}) => {
    const kw = new Set(keywords.map((k) => k.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '')));
    const groups = []; let g = [];
    words.forEach((w, i) => {
      g.push(w);
      const next = words[i + 1];
      const gap = next ? next.start - w.end : 1;
      if (g.length >= max || gap >= 0.15 || /[.!?,;:]$/.test(w.text) || !next) { groups.push(g); g = []; }
    });
    const box = document.createElement('div'); box.className = 'th-captions';
    const top = y ?? (S.fmt.portrait ? S.fmt.safe.bottom - 300 : S.fmt.H - 220);
    Object.assign(box.style, { position: 'absolute', left: 0, right: 0, top: top + 'px', textAlign: 'center' });
    parent.appendChild(box);
    for (const grp of groups) {
      const el = document.createElement('div'); el.className = 'th-group';
      Object.assign(el.style, { position: 'absolute', left: '60px', right: '60px', top: 0, textAlign: 'center', opacity: 0 });
      const spans = grp.map((w) => {
        const s = document.createElement('span'); s.className = 'w th-word'; s.textContent = w.text;
        if (kw.has(w.text.toLowerCase().replace(/[^\p{L}\p{N}]/gu, ''))) s.classList.add('th-key');
        el.appendChild(s);
        const sp = document.createElement('span'); sp.className = 'sp'; sp.textContent = ' '; el.appendChild(sp);
        return s;
      });
      box.appendChild(el);
      const t0 = Math.max(0.05, grp[0].start - offset - 0.05), t1 = grp[grp.length - 1].end - offset + 0.08;
      c.tl.fromTo(el, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.12, ease: 'power2.out' }, t0);
      grp.forEach((w, i) => {
        c.tl.fromTo(spans[i], { scale: 1 }, { scale: spans[i].classList.contains('th-key') ? 1.06 : 1.0, duration: 0.08, ease: 'power2.out' }, w.start - offset);
        // (GSAP 3 has no className tweening: set the 'on' look directly.)
        c.tl.set(spans[i], { opacity: 1, color: spans[i].classList.contains('th-key') ? 'var(--accent)' : '#fff' }, w.start - offset);
      });
      c.tl.to(el, { opacity: 0, duration: 0.1, ease: 'power2.in' }, t1);
      c.tl.set(el, { opacity: 0, visibility: 'hidden' }, t1 + 0.1);
    }
    el_style(size);
    return groups.length;
  };
  let styled = false;
  function el_style(size) {
    if (styled) return; styled = true;
    const st = document.createElement('style');
    st.textContent = `.th-group{font-family:var(--font-sans),sans-serif;font-weight:800;font-size:${size}px;line-height:1.08;color:#fff;letter-spacing:-.02em;
      text-shadow:0 4px 18px rgba(0,0,0,.55),0 2px 4px rgba(0,0,0,.6);}
      .th-word{opacity:.72;margin:0 .06em}`;
    document.head.appendChild(st);
  }

  // A lower third: name + role, sliding in on a paper bar.
  TH.lowerThird = (c, parent, { name, role, at = 0.4, hold = 3 } = {}) => {
    const el = document.createElement('div'); el.className = 'th-lower';
    el.innerHTML = `<div class="th-bar"></div><div class="th-name serif"></div><div class="th-role kicker"></div>`;
    el.querySelector('.th-name').textContent = name; el.querySelector('.th-role').textContent = role;
    const s = S.fmt.safe;
    Object.assign(el.style, { position: 'absolute', left: s.left + 'px', top: (S.fmt.portrait ? s.bottom - 520 : S.fmt.H - 330) + 'px' });
    parent.appendChild(el);
    const st = document.createElement('style');
    st.textContent = `.th-lower{padding:26px 40px 26px 46px;background:rgba(11,8,6,.78);border-radius:18px;backdrop-filter:blur(12px)}
      .th-bar{position:absolute;left:0;top:18px;bottom:18px;width:8px;border-radius:4px;background:var(--accent)}
      .th-name{font-size:58px;color:#fff;line-height:1.05}.th-role{margin-top:8px;font-size:24px;color:rgba(255,255,255,.7)}`;
    document.head.appendChild(st);
    c.tl.fromTo(el, { clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0% 0 0)', duration: 0.6, ease: 'expo.out' }, at);
    c.tl.fromTo(el.querySelectorAll('.th-name,.th-role'), { opacity: 0, x: -20 }, { opacity: 1, x: 0, duration: 0.5, ease: 'expo.out', stagger: 0.08 }, at + 0.15);
    c.tl.to(el, { clipPath: 'inset(0 0 0 100%)', duration: 0.35, ease: 'power3.in' }, at + hold);
    return el;
  };

  // A rounded B-roll / screenshot card that pops beside or above the speaker.
  TH.card = (c, parent, src, { at = 0, hold = 2.5, w = 560, h = 760, x = null, y = null, rot = -3 } = {}) => {
    const el = document.createElement('div'); el.className = 'th-card';
    const img = document.createElement('img'); img.src = S.asset(src);
    Object.assign(img.style, { width: '100%', height: '100%', objectFit: 'cover', display: 'block' });
    el.appendChild(img);
    Object.assign(el.style, {
      position: 'absolute', width: w + 'px', height: h + 'px', borderRadius: '34px', overflow: 'hidden',
      left: (x ?? (S.fmt.W - w) / 2) + 'px', top: (y ?? S.fmt.safe.top + 40) + 'px',
      boxShadow: '0 40px 90px rgba(0,0,0,.5)', border: '6px solid rgba(255,255,255,.9)',
    });
    parent.appendChild(el);
    c.tl.fromTo(el, { scale: 0.6, opacity: 0, rotation: rot - 8 }, { scale: 1, opacity: 1, rotation: rot, duration: 0.6, ease: 'back.out(1.6)' }, at);
    c.tl.to(el, { scale: 0.8, opacity: 0, duration: 0.25, ease: 'power3.in' }, at + hold);
    return el;
  };
})();
