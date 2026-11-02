// CINEMATIC STUDIO engine (window.S.cine) — premium property storytelling.
// Photographs are shown as supplied: no warping, no fake parallax cut-outs,
// no colour filters on the photo itself. Motion comes from the camera (a
// wrapper), light passing over the frame (an overlay), and type.
(function () {
  const S = window.S;
  const C = (S.cine = {});

  // A full-bleed photo inside a camera wrapper. Returns { cam, img }.
  C.plate = (parent, src, { fit = 'cover', pos = '50% 50%' } = {}) => {
    const cam = document.createElement('div'); cam.className = 'layer cine-cam';
    const img = document.createElement('img'); img.className = 'photo'; img.src = S.asset(src);
    img.style.objectFit = fit; img.style.objectPosition = pos;
    cam.appendChild(img); parent.appendChild(cam);
    return { cam, img };
  };

  // Letterbox bars close in to ~2.39:1 (or open). Uses two bar elements.
  C.letterbox = (tl, parent, at, { ratio = 2.39, dur = 0.8, open = false } = {}) => {
    const W = S.fmt.W, H = S.fmt.H;
    const bar = Math.max(0, (H - W / ratio) / 2) * (S.fmt.portrait ? 0.32 : 1);
    const mk = (top) => {
      const b = document.createElement('div');
      Object.assign(b.style, { position: 'absolute', left: 0, right: 0, height: bar + 'px', background: '#000', zIndex: 30, [top ? 'top' : 'bottom']: 0 });
      parent.appendChild(b); return b;
    };
    const t = mk(true), b = mk(false);
    const from = open ? 1 : 0, to = open ? 0 : 1;
    tl.fromTo(t, { scaleY: from, transformOrigin: '50% 0%' }, { scaleY: to, duration: dur, ease: 'power3.inOut' }, at);
    tl.fromTo(b, { scaleY: from, transformOrigin: '50% 100%' }, { scaleY: to, duration: dur, ease: 'power3.inOut' }, at);
    return [t, b];
  };

  // Warm light sweeping across the frame (an overlay, screen blend).
  C.lightSweep = (tl, parent, at, { dur = 1.8, color = 'rgba(255,170,90,.35)', angle = 110 } = {}) => {
    const l = document.createElement('div');
    Object.assign(l.style, { position: 'absolute', inset: '-30%', zIndex: 20, pointerEvents: 'none', mixBlendMode: 'screen',
      background: `linear-gradient(${angle}deg, transparent 35%, ${color} 50%, transparent 65%)` });
    parent.appendChild(l);
    tl.fromTo(l, { xPercent: -50, opacity: 1 }, { xPercent: 50, opacity: 1, duration: dur, ease: 'power2.inOut' }, at);
    return l;
  };

  // A soft gradient that lets type sit over a photo (bottom or top).
  C.scrim = (parent, { side = 'bottom', strength = 0.75, size = 55 } = {}) => {
    const s = document.createElement('div');
    Object.assign(s.style, { position: 'absolute', inset: 0, zIndex: 5, pointerEvents: 'none',
      background: `linear-gradient(${side === 'bottom' ? 'to top' : 'to bottom'}, rgba(0,0,0,${strength}) 0%, rgba(0,0,0,0) ${size}%)` });
    parent.appendChild(s); return s;
  };

  // Location title: mono coordinates + serif place name, letter by letter.
  C.location = (parent, { place = 'Tiranë', region = 'Shqipëri', lat = 41.3275, lon = 19.8187 } = {}) => {
    const el = document.createElement('div'); el.className = 'cine-loc';
    el.innerHTML = `<div class="kicker cine-coord"></div><div class="headline xl cine-place"></div><div class="kicker cine-region"></div>`;
    const dms = (v, p, n) => `${Math.abs(v).toFixed(4)}° ${v >= 0 ? p : n}`;
    el.querySelector('.cine-coord').textContent = `${dms(lat, 'N', 'S')}  ·  ${dms(lon, 'E', 'W')}`;
    S.rich(el.querySelector('.cine-place'), place);
    el.querySelector('.cine-region').textContent = region;
    parent.appendChild(el);
    return { el, place: el.querySelector('.cine-place'), coord: el.querySelector('.cine-coord'), region: el.querySelector('.cine-region') };
  };

  // Film grain overlay (static noise tile stepped by a seeded offset: finite,
  // deterministic). Light by default; sits above graphics, below type.
  C.grain = (tl, parent, dur, { opacity = 0.07, fps = 12, seed = 3 } = {}) => {
    const g = document.createElement('div');
    Object.assign(g.style, { position: 'absolute', inset: '-10%', zIndex: 25, pointerEvents: 'none', opacity, mixBlendMode: 'overlay',
      backgroundImage: 'url("assets/illustrations/film-grain.png")' });
    parent.appendChild(g);
    const r = S.rng(seed); const n = Math.floor(dur * fps);
    for (let i = 0; i < n; i++) tl.set(g, { x: Math.floor(r() * 120) - 60, y: Math.floor(r() * 120) - 60 }, i / fps);
    return g;
  };
})();
