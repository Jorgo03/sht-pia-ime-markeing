// PRINT STUDIO engine (window.S.print) — original cut-paper motion graphics.
// Builders return SVG strings or elements made of flat paper shapes; motion
// helpers lift, drop, peel and fold sheets with shadows that follow the lift.
(function () {
  const S = window.S;
  const P = (S.print = {});
  const ns = 'http://www.w3.org/2000/svg';

  // A jittered polygon edge so cuts look hand-made (seeded: same every frame).
  const jag = (r, n, amp) => Array.from({ length: n + 1 }, (_, i) => [i / n, (r() - 0.5) * amp]);

  // Torn edge on one side of an element, via clip-path polygon.
  P.torn = (el, { edge = 'bottom', seed = 3, depth = 2.2, teeth = 28 } = {}) => {
    const r = S.rng(seed); const pts = jag(r, teeth, depth);
    let poly;
    if (edge === 'bottom') poly = ['0% 0%', '100% 0%', ...pts.reverse().map(([t, d]) => `${t * 100}% ${100 - depth - d}%`)];
    else if (edge === 'top') poly = [...pts.map(([t, d]) => `${t * 100}% ${depth + d}%`), '100% 100%', '0% 100%'];
    else if (edge === 'right') poly = ['0% 0%', ...pts.map(([t, d]) => `${100 - depth - d}% ${t * 100}%`), '0% 100%'];
    else poly = [...pts.map(([t, d]) => `${depth + d}% ${t * 100}%`), '100% 100%', '100% 0%'];
    el.style.clipPath = `polygon(${poly.join(',')})`;
    return el;
  };

  // A paper sheet element.
  P.sheet = (parent, { x = 0, y = 0, w = 600, h = 400, cls = '', lift = 10, rot = 0 } = {}) => {
    const d = document.createElement('div');
    d.className = `paper ${cls}`;
    Object.assign(d.style, { left: x + 'px', top: y + 'px', width: w + 'px', height: h + 'px' });
    d.style.setProperty('--lift', lift + 'px');
    if (rot) d.dataset.rot = rot;
    parent.appendChild(d);
    return d;
  };

  // ---------- Original paper illustrations (SVG strings) ----------
  // Colours default to the scene palette through CSS variables.
  const C = { wall: 'var(--paper)', wall2: 'var(--paper-shade)', roof: 'var(--accent)', ink: 'var(--ink)', win: 'var(--ground2)', door: 'var(--accent-deep)' };

  // A pitched-roof house. w×h in viewBox units; seed varies window layout.
  P.house = ({ w = 300, h = 300, seed = 1, wall = C.wall, roof = C.roof, win = C.win, door = C.door, chimney = true } = {}) => {
    const r = S.rng(seed);
    const bodyH = h * 0.58, roofH = h * 0.42, bx = w * 0.08, bw = w * 0.84;
    const j = () => (r() - 0.5) * 3;
    const cols = 2 + Math.floor(r() * 2);
    let wins = '';
    const ww = bw / (cols * 2.2);
    for (let i = 0; i < cols; i++) {
      const x = bx + bw * ((i + 0.5) / cols) - ww / 2;
      if (i === Math.floor(cols / 2) && cols % 2) continue; // door column
      wins += `<rect x="${x + j()}" y="${roofH + bodyH * 0.2 + j()}" width="${ww}" height="${ww * 1.15}" rx="3" fill="${win}"/>`;
    }
    const dw = bw * 0.18;
    return `<svg xmlns="${ns}" viewBox="0 0 ${w} ${h}">
      ${chimney ? `<rect x="${w * 0.66}" y="${roofH * 0.22}" width="${w * 0.08}" height="${roofH * 0.5}" fill="${wall}" />` : ''}
      <polygon points="${w * 0.02 + j()},${roofH + 2} ${w / 2 + j()},${j()} ${w * 0.98 + j()},${roofH + 2}" fill="${roof}"/>
      <rect x="${bx}" y="${roofH}" width="${bw}" height="${bodyH}" fill="${wall}"/>
      <rect x="${bx}" y="${roofH}" width="${bw}" height="${bodyH * 0.08}" fill="rgba(0,0,0,.08)"/>
      ${wins}
      <rect x="${w / 2 - dw / 2}" y="${h - bodyH * 0.52}" width="${dw}" height="${bodyH * 0.52}" rx="${dw / 2}" ry="${dw / 2}" fill="${door}"/>
    </svg>`;
  };

  // A flat-roofed apartment block (Tirana style balconies).
  P.block = ({ w = 260, h = 520, floors = 8, seed = 2, wall = C.wall, win = C.win, accent = C.roof, balconies = true } = {}) => {
    const r = S.rng(seed);
    const pad = w * 0.1, fh = (h - pad * 1.6) / floors;
    let rows = '';
    for (let f = 0; f < floors; f++) {
      const y = pad + f * fh;
      for (let c = 0; c < 3; c++) {
        const x = pad + c * ((w - pad * 2) / 3) + 6;
        const ww = (w - pad * 2) / 3 - 12;
        const lit = r() > 0.72;
        rows += `<rect x="${x}" y="${y + 6}" width="${ww}" height="${fh * 0.62}" rx="2" fill="${lit ? accent : win}" opacity="${lit ? 0.9 : 1}"/>`;
      }
      if (balconies && f % 2 === 1) rows += `<rect x="${pad * 0.5}" y="${y + fh * 0.7}" width="${w - pad}" height="${fh * 0.16}" fill="rgba(0,0,0,.14)"/>`;
    }
    return `<svg xmlns="${ns}" viewBox="0 0 ${w} ${h}">
      <rect x="0" y="0" width="${w}" height="${h}" fill="${wall}"/>
      <rect x="0" y="0" width="${w}" height="${pad * 0.6}" fill="rgba(0,0,0,.1)"/>
      ${rows}
    </svg>`;
  };

  // A rounded tree cut-out.
  P.tree = ({ w = 140, h = 220, leaf = '#5c7a4a', trunk = '#7a5236', seed = 3 } = {}) => {
    const r = S.rng(seed); const cx = w / 2;
    return `<svg xmlns="${ns}" viewBox="0 0 ${w} ${h}">
      <rect x="${cx - 7}" y="${h * 0.55}" width="14" height="${h * 0.45}" rx="6" fill="${trunk}"/>
      <ellipse cx="${cx + (r() - 0.5) * 8}" cy="${h * 0.36}" rx="${w * 0.46}" ry="${h * 0.34}" fill="${leaf}"/>
      <ellipse cx="${cx - w * 0.12}" cy="${h * 0.28}" rx="${w * 0.2}" ry="${h * 0.14}" fill="rgba(255,255,255,.12)"/>
    </svg>`;
  };

  // Layered hills (one path per layer) for landscape backdrops.
  P.hills = ({ w = 1080, h = 600, layers = 3, seed = 5, colors = ['var(--paper-shade)', 'var(--surface)', 'var(--paper)'] } = {}) => {
    const r = S.rng(seed); let out = '';
    for (let L = 0; L < layers; L++) {
      const base = h * (0.35 + L * 0.2); let d = `M0 ${h} L0 ${base}`;
      const n = 5 + L;
      for (let i = 1; i <= n; i++) {
        const x = (w / n) * i, y = base + (r() - 0.5) * h * 0.25;
        d += ` Q${x - w / n / 2} ${y - h * 0.18 * r()} ${x} ${y}`;
      }
      out += `<path class="hill hill-${L}" d="${d} L${w} ${h} Z" fill="${colors[L % colors.length]}"/>`;
    }
    return `<svg xmlns="${ns}" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">${out}</svg>`;
  };

  // The real Albania outline (Natural Earth) as a paper cut-out, with city pins.
  // Needs window.STUDIO_DATA.map (written into assets/kit/data.js by the builder).
  P.albania = ({ fill = 'var(--accent)', neighbours = 'var(--paper-shade)', showNeighbours = true } = {}) => {
    const m = window.STUDIO_DATA && window.STUDIO_DATA.map;
    if (!m) return '<svg/>';
    const paths = Object.entries(m.paths)
      .filter(([id]) => showNeighbours || id === 'albania')
      .map(([id, d]) => `<path class="land ${id === 'albania' ? 'home' : 'neighbour'}" data-id="${id}" d="${d}" fill="${id === 'albania' ? fill : neighbours}" stroke="rgba(0,0,0,.08)" stroke-width="2"/>`).join('');
    return `<svg xmlns="${ns}" viewBox="0 0 ${m.width} ${m.height}">${paths}</svg>`;
  };
  P.city = (key) => (window.STUDIO_DATA && window.STUDIO_DATA.map.cities[key]) || null;

  // A cut-out location pin (the app's orange marker shape).
  P.pin = ({ size = 90, fill = 'var(--accent)' } = {}) => `<svg xmlns="${ns}" viewBox="0 0 60 80" width="${size}" height="${size * 4 / 3}">
    <path d="M30 2C15 2 4 13 4 27c0 19 26 49 26 49s26-30 26-49C56 13 45 2 30 2z" fill="${fill}"/>
    <circle cx="30" cy="27" r="10" fill="var(--paper)"/></svg>`;

  // A key cut-out (welcome home).
  P.key = ({ w = 300, fill = 'var(--accent)' } = {}) => `<svg xmlns="${ns}" viewBox="0 0 300 110" width="${w}">
    <circle cx="55" cy="55" r="48" fill="${fill}"/><circle cx="55" cy="55" r="18" fill="var(--paper)"/>
    <rect x="95" y="44" width="200" height="22" rx="6" fill="${fill}"/>
    <rect x="230" y="62" width="18" height="34" rx="4" fill="${fill}"/><rect x="262" y="62" width="18" height="26" rx="4" fill="${fill}"/></svg>`;

  // Put an SVG string into a positioned .cut wrapper.
  P.cut = (parent, svg, { x = 0, y = 0, w = 300, h = 300, lift = 8, cls = '' } = {}) => {
    const d = document.createElement('div');
    d.className = `cut ${cls}`;
    Object.assign(d.style, { left: x + 'px', top: y + 'px', width: w + 'px', height: h + 'px' });
    d.style.setProperty('--lift', lift + 'px');
    d.innerHTML = svg;
    parent.appendChild(d);
    return d;
  };

  // ---------- Paper motion ----------
  // Drop a sheet onto the table: falls from above, overshoots softly, its shadow
  // shrinks as it lands (lift 40 -> rest).
  P.drop = (tl, els, at, { stagger = 0.08, dur = 0.8, rest = 10, from = -120 } = {}) => {
    const list = Array.isArray(els) ? els : [els];
    list.forEach((el, i) => {
      const rot = +(el.dataset.rot || 0);
      tl.fromTo(el, { y: from, rotation: rot - 6, opacity: 0, '--lift': '46px' },
        { y: 0, rotation: rot, opacity: 1, '--lift': rest + 'px', duration: dur, ease: 'back.out(1.3)' }, at + i * stagger);
    });
    return at + stagger * (list.length - 1) + dur * 0.7;
  };
  // Pop-up: a cut-out stands up from the page like a pop-up book (hinged at its base).
  P.popUp = (tl, els, at, { stagger = 0.1, dur = 0.7 } = {}) => {
    const list = Array.isArray(els) ? els : [els];
    tl.fromTo(list, { rotationX: -88, transformOrigin: '50% 100%', transformPerspective: 900, '--lift': '0px' },
      { rotationX: 0, '--lift': '10px', duration: dur, ease: 'back.out(1.5)', stagger }, at);
    return at + stagger * (list.length - 1) + dur * 0.7;
  };
  // Slide a sheet in from an edge (like being pushed across the table).
  P.slide = (tl, el, at, { from = 'left', dist = 1200, dur = 0.9, rot = 3 } = {}) => {
    const v = { left: { x: -dist }, right: { x: dist }, top: { y: -dist }, bottom: { y: dist } }[from];
    tl.fromTo(el, { ...v, rotation: rot, '--lift': '30px' }, { x: 0, y: 0, rotation: +(el.dataset.rot || 0), '--lift': '10px', duration: dur, ease: 'expo.out' }, at);
    return at + dur * 0.7;
  };
  // Peel a sheet off (exit): lifts at one corner and flies away.
  P.peel = (tl, el, at, { dur = 0.5, dir = 1 } = {}) => {
    tl.to(el, { rotation: 14 * dir, x: 700 * dir, y: -260, '--lift': '60px', opacity: 0, duration: dur, ease: 'power3.in' }, at);
    return at + dur;
  };
  // Fold open: a sheet unfolds from a crease (rotationY around its left edge).
  P.unfold = (tl, el, at, { dur = 0.8, axis = 'Y' } = {}) => {
    tl.fromTo(el, { [`rotation${axis}`]: -100, transformOrigin: axis === 'Y' ? '0% 50%' : '50% 0%', transformPerspective: 1400 },
      { [`rotation${axis}`]: 0, duration: dur, ease: 'power3.out' }, at);
    return at + dur * 0.8;
  };
  // Stamp: lands hard with a tiny shake (0 ms impact frame).
  P.stamp = (tl, el, at, { rot = -8 } = {}) => {
    tl.fromTo(el, { scale: 2.2, opacity: 0, rotation: rot - 10 }, { scale: 1, opacity: 1, rotation: rot, duration: 0.22, ease: 'power4.in' }, at);
    tl.fromTo(el, { x: -4 }, { x: 0, duration: 0.18, ease: 'elastic.out(1, 0.3)' }, at + 0.22);
    return at + 0.4;
  };
  // Gentle idle float for paper layers while the camera holds (finite).
  P.sway = (tl, els, at, dur, { amp = 6, seed = 1 } = {}) => {
    const r = S.rng(seed);
    (Array.isArray(els) ? els : [els]).forEach((el) => {
      tl.to(el, { y: `+=${(r() - 0.5) * amp * 2}`, rotation: `+=${(r() - 0.5) * 1.6}`, duration: dur, ease: 'sine.inOut' }, at);
    });
    return at + dur;
  };
})();
