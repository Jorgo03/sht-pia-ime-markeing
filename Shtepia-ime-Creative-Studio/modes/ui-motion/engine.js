// UI MOTION STUDIO engine (window.S.ui) — demonstrates the real app.
// Everything shown is a real screenshot (config/screens.json). The engine may:
// frame it in a phone, move a camera over it, lift a measured region off it as
// a floating card (real pixels), spotlight a region, navigate between real
// screens, and type into the real search field. It never draws app UI.
(function () {
  const S = window.S;
  const U = (S.ui = {});
  const SRC_W = 1290, SRC_H = 2796;

  // Text field interiors (screenshot px) where typed queries may appear, with
  // the field's sampled fill so the placeholder is covered cleanly.
  U.fields = {
    home: { rect: [180, 470, 830, 100], fill: { light: '#f1e8dc', dark: '#1d1a15' }, size: 42 },
    explore: { rect: [180, 395, 860, 90], fill: { light: '#f1e9de', dark: '#1d1915' }, size: 42 },
    map: { rect: [180, 395, 860, 90], fill: { light: '#f1e9de', dark: '#1d1915' }, size: 42 },
  };

  U.region = (screen, name) => {
    const s = window.STUDIO_DATA && window.STUDIO_DATA.screens.screens[screen];
    const r = s && s.regions[name];
    if (!r) throw new Error(`ui: no region "${name}" on screen "${screen}" (see config/screens.json)`);
    return r;
  };

  // Build a phone. w = rendered screen width (height follows the screenshot).
  // Returns { cam, el, screen, k, w, h, shots:{id:img}, show(id), theme }.
  U.phone = (parent, { screen = 'home', theme = 'light', w = 600, frame = 'dark', x = 0, y = 0, glare = true } = {}) => {
    const k = w / SRC_W; const h = SRC_H * k; const bezel = Math.round(w * 0.03); const r = Math.round(w * 0.153);
    const cam = document.createElement('div'); cam.className = 'ui-cam';
    const el = document.createElement('div');
    el.className = `ui-phone ${frame === 'light' ? 'light-frame' : ''}`;
    const W = w + bezel * 2, H = h + bezel * 2;
    Object.assign(el.style, { width: W + 'px', height: H + 'px', marginLeft: -W / 2 + x + 'px', marginTop: -H / 2 + y + 'px' });
    el.style.setProperty('--ui-r', r + 'px'); el.style.setProperty('--ui-bezel', bezel + 'px');
    const body = document.createElement('div'); body.className = 'ui-body';
    const scr = document.createElement('div'); scr.className = 'ui-screen';
    body.appendChild(scr); el.appendChild(body);
    const island = document.createElement('div'); island.className = 'ui-island'; scr.appendChild(island);
    let gl = null;
    if (glare) { gl = document.createElement('div'); gl.className = 'ui-glare'; gl.setAttribute('data-layout-ignore', ''); scr.appendChild(gl); }
    cam.appendChild(el); parent.appendChild(cam);
    const p = { cam, el, screen: scr, k, w, h, bezel, W, H, theme, shots: {}, glare: gl, current: screen };
    p.add = (id, th = theme) => {
      if (p.shots[id]) return p.shots[id];
      const img = document.createElement('img'); img.className = 'ui-shot'; img.src = S.screen(id, th); img.dataset.screen = id;
      scr.insertBefore(img, island); p.shots[id] = img; return img;
    };
    p.add(screen);
    return p;
  };

  // Point (screenshot px) -> offset from the phone's centre in stage px.
  const offset = (p, sx, sy) => [p.bezel + sx * p.k - p.W / 2, p.bezel + sy * p.k - p.H / 2];

  // Camera: bring a region's centre to the frame centre at `scale`.
  U.zoomTo = (tl, p, region, at, { screen = p.current, scale = 1.8, dur = 0.9, ease = 'power3.inOut', dy = 0 } = {}) => {
    const [rx, ry, rw, rh] = typeof region === 'string' ? U.region(screen, region) : region;
    const [ox, oy] = offset(p, rx + rw / 2, ry + rh / 2);
    tl.to(p.cam, { x: -ox * scale, y: -oy * scale + dy, scale, duration: dur, ease }, at);
    return at + dur;
  };
  U.zoomOut = (tl, p, at, { dur = 0.8, ease = 'power3.inOut', scale = 1 } = {}) => {
    tl.to(p.cam, { x: 0, y: 0, scale, duration: dur, ease }, at);
    return at + dur;
  };

  // Lift a region off the screen as a card made of the screenshot's own pixels.
  // Returns the card (positioned exactly over the region, inside the phone).
  U.lift = (p, region, { screen = p.current, radius = 22, pad = 0 } = {}) => {
    const [rx, ry, rw, rh] = typeof region === 'string' ? U.region(screen, region) : region;
    const card = document.createElement('div'); card.className = 'ui-lift';
    const k = p.k;
    Object.assign(card.style, {
      left: p.bezel + (rx - pad) * k + 'px', top: p.bezel + (ry - pad) * k + 'px',
      width: (rw + pad * 2) * k + 'px', height: (rh + pad * 2) * k + 'px', borderRadius: radius + 'px',
      backgroundImage: `url("${S.screen(screen, p.theme)}")`,
      backgroundSize: `${SRC_W * k}px ${SRC_H * k}px`,
      backgroundPosition: `${-(rx - pad) * k}px ${-(ry - pad) * k}px`,
    });
    p.el.appendChild(card);
    return card;
  };
  // Animate a lifted card out towards the viewer and to a stage position.
  U.float = (tl, card, at, { scale = 1.35, x = 0, y = -60, rot = -3, dur = 0.8, z = 120 } = {}) => {
    tl.fromTo(card, { scale: 1, x: 0, y: 0, z: 0, rotation: 0, boxShadow: '0 0 0 rgba(0,0,0,0)' },
      { scale, x, y, z, rotation: rot, boxShadow: '0 50px 90px rgba(0,0,0,.45)', duration: dur, ease: 'expo.out' }, at);
    return at + dur * 0.6;
  };
  // A press on a region: the real pixels depress and release (no click rings).
  U.press = (tl, p, region, at, { screen = p.current } = {}) => {
    const card = U.lift(p, region, { screen, radius: 18 });
    tl.fromTo(card, { opacity: 0, scale: 1 }, { opacity: 1, scale: 0.95, duration: 0.09, ease: 'power2.out' }, at);
    tl.to(card, { scale: 1, duration: 0.22, ease: 'back.out(2)' }, at + 0.09);
    tl.to(card, { opacity: 0, duration: 0.15 }, at + 0.4);
    return at + 0.31;
  };
  // Spotlight: dim everything but a region; returns the spot element.
  U.spot = (tl, p, region, at, { screen = p.current, dur = 0.4, pad = 10 } = {}) => {
    const [rx, ry, rw, rh] = typeof region === 'string' ? U.region(screen, region) : region;
    const s = document.createElement('div'); s.className = 'ui-spot';
    Object.assign(s.style, { left: p.bezel + (rx - pad) * p.k + 'px', top: p.bezel + (ry - pad) * p.k + 'px', width: (rw + pad * 2) * p.k + 'px', height: (rh + pad * 2) * p.k + 'px' });
    p.el.appendChild(s);
    tl.fromTo(s, { opacity: 0 }, { opacity: 1, duration: dur, ease: 'power2.out' }, at);
    return s;
  };
  // A callout chip pinned next to a region (feature name from features.json).
  U.callout = (p, region, text, { screen = p.current, side = 'top', gap = 26 } = {}) => {
    const [rx, ry, rw, rh] = typeof region === 'string' ? U.region(screen, region) : region;
    const c = document.createElement('div'); c.className = 'ui-callout'; c.textContent = text;
    const cx = p.bezel + (rx + rw / 2) * p.k, top = p.bezel + ry * p.k, bottom = p.bezel + (ry + rh) * p.k;
    Object.assign(c.style, { left: cx + 'px', top: (side === 'top' ? top - gap : bottom + gap) + 'px', transform: `translate(-50%, ${side === 'top' ? '-100%' : '0'})` });
    p.el.appendChild(c);
    return c;
  };

  // Navigate to another real screen. kind: push (iOS forward), fade, rise (sheet).
  U.go = (tl, p, id, at, { kind = 'push', dur = 0.55 } = {}) => {
    const from = p.shots[p.current]; const to = p.add(id);
    const sw = p.w;
    // Each navigation stacks the arriving screen on top from its own start time.
    p.z = (p.z || 2) + 1;
    tl.set(to, { zIndex: kind === 'back' ? 1 : p.z }, Math.max(0, at - 0.001));
    if (kind === 'back') tl.set(from, { zIndex: p.z }, Math.max(0, at - 0.001));
    if (kind === 'push') {
      tl.fromTo(to, { x: sw, opacity: 1 }, { x: 0, duration: dur, ease: 'power3.inOut' }, at);
      tl.fromTo(from, { x: 0 }, { x: -sw * 0.3, duration: dur, ease: 'power3.inOut' }, at);
    } else if (kind === 'back') {
      tl.fromTo(to, { x: -sw * 0.3, opacity: 1 }, { x: 0, duration: dur, ease: 'power3.inOut' }, at);
      tl.fromTo(from, { x: 0 }, { x: sw, duration: dur, ease: 'power3.inOut' }, at);
    } else if (kind === 'rise') {
      tl.fromTo(to, { yPercent: 100, opacity: 1 }, { yPercent: 0, duration: dur, ease: 'expo.out' }, at);
    } else if (kind === 'scroll') {
      tl.fromTo(to, { yPercent: 22, opacity: 0 }, { yPercent: 0, opacity: 1, duration: dur, ease: 'power2.out' }, at);
      tl.fromTo(from, { yPercent: 0 }, { yPercent: -22, duration: dur, ease: 'power2.out' }, at);
    } else {
      tl.fromTo(to, { opacity: 0, scale: 1.03 }, { opacity: 1, scale: 1, duration: dur, ease: 'power2.out' }, at);
    }
    p.current = id;
    return at + dur;
  };

  // Type into the real search field of a screen.
  U.type = (tl, p, text, at, { screen = p.current, cps = 16 } = {}) => {
    const f = U.fields[screen];
    if (!f) throw new Error(`ui.type: no text field mapped on "${screen}"`);
    const [x, y, w, h] = f.rect;
    const box = document.createElement('div'); box.className = 'ui-typed';
    Object.assign(box.style, {
      left: p.bezel + x * p.k + 'px', top: p.bezel + y * p.k + 'px', width: w * p.k + 'px', height: h * p.k + 'px',
      background: f.fill[p.theme] || f.fill.light, fontSize: f.size * p.k + 'px',
      color: p.theme === 'dark' ? '#f0ece6' : '#1a1714',
    });
    const span = document.createElement('span'); const caret = document.createElement('span'); caret.className = 'ui-caret';
    box.append(span, caret); p.el.appendChild(box);
    tl.fromTo(box, { opacity: 0 }, { opacity: 1, duration: 0.08 }, at);
    return S.a.typeOn(tl, span, text, at + 0.1, { cps });
  };

  // The phone enters: rises from below with a slight 3D tilt that settles.
  U.enter = (tl, p, at, { dur = 1.1, from = 'bottom' } = {}) => {
    const v = from === 'bottom' ? { y: 900, rotationX: 24 } : from === 'right' ? { x: 900, rotationY: -30 } : { scale: 0.6, rotationY: 30 };
    tl.fromTo(p.el, { ...v, opacity: 1 }, { x: 0, y: 0, rotationX: 0, rotationY: 0, scale: 1, duration: dur, ease: 'expo.out' }, at);
    return at + dur * 0.6;
  };
  U.glare = (tl, p, at, dur = 1.3) => {
    if (p.glare) tl.fromTo(p.glare, { xPercent: -60 }, { xPercent: 60, duration: dur, ease: 'power2.inOut' }, at);
    return at + dur;
  };
})();
