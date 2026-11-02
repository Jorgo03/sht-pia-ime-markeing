// 3D STUDIO engine (window.S.d3) — two back-ends:
//  1. CSS 3D (preserve-3d): crisp text, real screenshots on 3D phones, iso
//     cities and buildings. Cheap to render, always sharp.
//  2. Three.js (WebGL, vendored three.min.js): lit materials, shadows, fog,
//     instanced cities. Driven by a GSAP proxy tween so every frame is a pure
//     function of time (the scene's timeline seeks the proxy; we draw in onUpdate).
(function () {
  const S = window.S;
  const D = (S.d3 = {});

  // ---------- CSS 3D ----------
  // A ground plane you can tilt/orbit. Children use ground coordinates (x right,
  // y "south", z up). Returns the plane element.
  D.plane = (parent, { size = 2400, tiltX = 58, rotZ = -40, grid = true, cls = '' } = {}) => {
    const p = document.createElement('div');
    p.className = `s3 d3-plane ${cls}`;
    Object.assign(p.style, { left: '50%', top: '50%', width: size + 'px', height: size + 'px', marginLeft: -size / 2 + 'px', marginTop: -size / 2 + 'px' });
    p.dataset.tiltX = tiltX; p.dataset.rotZ = rotZ;
    // Projected 3D geometry legitimately leaves its box: keep it out of the layout audit.
    p.setAttribute('data-layout-ignore', ''); p.setAttribute('data-layout-allow-overflow', '');
    if (grid) { const g = document.createElement('div'); g.className = 'floor-grid'; p.appendChild(g); }
    parent.appendChild(p);
    gsap.set(p, { rotationX: tiltX, rotationZ: rotZ });
    return p;
  };

  // A box standing on a plane: footprint w×d at (x,y), height h. Faces are
  // shaded from one light so it reads as a solid (top > south > east).
  D.prism = (plane, { x = 0, y = 0, w = 120, d = 120, h = 300, color = 'var(--paper)', cls = '', top = null, windows = true } = {}) => {
    const b = document.createElement('div');
    b.className = `box ${cls}`;
    Object.assign(b.style, { left: x + 'px', top: y + 'px', width: w + 'px', height: d + 'px' });
    const face = (name, css, shade, win) => {
      const f = document.createElement('div');
      f.className = `face f-${name} ${win && windows ? 'bld-win' : ''}`;
      Object.assign(f.style, css, { background: color });
      f.style.boxShadow = `inset 0 0 0 9999px rgba(0,0,0,${shade})`;
      b.appendChild(f); return f;
    };
    face('north', { width: w + 'px', height: h + 'px', top: '0px', transformOrigin: '50% 0%', transform: 'rotateX(90deg)' }, 0.32, true);
    face('west', { width: h + 'px', height: d + 'px', left: '0px', transformOrigin: '0% 50%', transform: 'rotateY(-90deg)' }, 0.26, true);
    face('east', { width: h + 'px', height: d + 'px', left: w + 'px', transformOrigin: '0% 50%', transform: 'rotateY(-90deg)' }, 0.18, true);
    face('south', { width: w + 'px', height: h + 'px', top: d + 'px', transformOrigin: '50% 0%', transform: 'rotateX(90deg)' }, 0.06, true);
    const t = face('top', { width: w + 'px', height: d + 'px', transform: `translateZ(${h}px)` }, 0, false);
    if (top) t.style.background = top;
    b.dataset.h = h;
    plane.appendChild(b);
    return b;
  };

  // A seeded iso city of prisms on a plane. Returns the prism list sorted from
  // the centre out (good order for a "city rises" stagger).
  D.city = (plane, { n = 7, cell = 190, seed = 11, maxH = 520, minH = 90, colors = ['var(--paper)', 'var(--paper-shade)', 'var(--surface)'], accentEvery = 9, size = 2400 } = {}) => {
    const r = S.rng(seed); const out = [];
    const off = size / 2 - (n * cell) / 2;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      if (r() < 0.16) continue; // plazas
      const w = cell * (0.55 + r() * 0.3), d = cell * (0.55 + r() * 0.3);
      const dist = Math.hypot(i - (n - 1) / 2, j - (n - 1) / 2);
      const h = Math.max(minH, maxH * (1 - dist / n) * (0.5 + r() * 0.7));
      const accent = (i * n + j) % accentEvery === 0;
      const b = D.prism(plane, { x: off + i * cell + (cell - w) / 2, y: off + j * cell + (cell - d) / 2, w, d, h, color: accent ? 'var(--accent)' : colors[Math.floor(r() * colors.length)] });
      b.dataset.dist = dist; out.push(b);
    }
    return out.sort((a, b) => a.dataset.dist - b.dataset.dist);
  };
  // Grow prisms up from the ground (scaleZ on the box) with a stagger.
  // (GSAP has no scaleZ, so each prism gets a proxy that writes scale3d.)
  D.rise = (tl, prisms, at, { stagger = 0.03, dur = 0.8 } = {}) => {
    prisms.forEach((b, i) => {
      const p = { k: 0.02 };
      const draw = () => { b.style.transform = p.k >= 0.999 ? 'none' : `scale3d(1, 1, ${Math.max(0.02, p.k)})`; };
      draw();
      tl.fromTo(p, { k: 0.02 }, { k: 1, duration: dur, ease: 'expo.out', onUpdate: draw }, at + i * stagger);
    });
    return at + stagger * (prisms.length - 1) + dur * 0.6;
  };

  // A phone with real thickness: front screen (a real screenshot), back, sides.
  // Returns { el, screen, shots: [img], set(src) }.
  D.phone = (parent, { src, w = 560, h = 1214, depth = 34, radius = 82, body = '#1b1816' } = {}) => {
    const el = document.createElement('div');
    el.className = 's3 d3-phone';
    el.setAttribute('data-layout-allow-overflow', '');
    Object.assign(el.style, { left: '50%', top: '50%', width: w + 'px', height: h + 'px', marginLeft: -w / 2 + 'px', marginTop: -h / 2 + 'px' });
    const layer = (z, bg, extra = {}) => {
      const f = document.createElement('div'); f.className = 'face';
      Object.assign(f.style, { width: w + 'px', height: h + 'px', borderRadius: radius + 'px', background: bg, transform: `translateZ(${z}px)` }, extra);
      el.appendChild(f); return f;
    };
    // stacked slices fake a rounded rim
    for (let i = 0; i <= 6; i++) layer(-depth / 2 + (depth * i) / 6, i === 0 ? '#0c0a09' : `linear-gradient(145deg, #4a4542, ${body} 40%, #2b2725 70%, #0e0c0b)`);
    const glass = layer(depth / 2 + 0.5, '#000', { padding: '16px' });
    const screen = document.createElement('div');
    screen.className = 'd3-screen';
    Object.assign(screen.style, { position: 'relative', width: '100%', height: '100%', borderRadius: radius - 16 + 'px' });
    glass.appendChild(screen);
    const island = document.createElement('div');
    Object.assign(island.style, { position: 'absolute', top: '20px', left: '50%', width: '150px', height: '44px', marginLeft: '-75px', borderRadius: '22px', background: '#000', zIndex: 5 });
    screen.appendChild(island);
    const shots = [];
    const set = (s) => { const img = document.createElement('img'); img.src = S.asset(s); screen.insertBefore(img, island); shots.push(img); return img; };
    if (src) set(src);
    parent.appendChild(el);
    return { el, screen, shots, set };
  };

  // ---------- Three.js ----------
  // A lit stage on a canvas: warm key, cool rim, soft hemisphere, fog.
  // Returns { renderer, scene, camera, render(), add(obj) }.
  D.three = (canvas, { w = S.fmt.W, h = S.fmt.H, bg = null, fov = 35, fog = null } = {}) => {
    const T = window.THREE;
    const renderer = new T.WebGLRenderer({ canvas, antialias: true, alpha: !bg, preserveDrawingBuffer: true });
    renderer.setPixelRatio(1); renderer.setSize(w, h, false);
    renderer.outputColorSpace = T.SRGBColorSpace;
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap;
    const scene = new T.Scene();
    if (bg) scene.background = new T.Color(bg);
    if (fog) scene.fog = new T.Fog(fog.color, fog.near, fog.far);
    const camera = new T.PerspectiveCamera(fov, w / h, 0.1, 400);
    scene.add(new T.HemisphereLight(0xfff1e0, 0x2a1f18, 0.9));
    const key = new T.DirectionalLight(0xffd2a8, 2.2); key.position.set(12, 22, 10); key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048); Object.assign(key.shadow.camera, { left: -30, right: 30, top: 30, bottom: -30, near: 1, far: 80 });
    scene.add(key);
    const rim = new T.DirectionalLight(0x9db8e0, 0.9); rim.position.set(-14, 8, -12); scene.add(rim);
    return { T, renderer, scene, camera, key, rim, render: () => renderer.render(scene, camera), add: (o) => (scene.add(o), o) };
  };
  // An instanced city of rounded-ish blocks. Returns { mesh, count, heights, setGrowth(k) }.
  D.threeCity = (stage, { n = 15, cell = 2.2, seed = 21, maxH = 9, color = 0xf1ede6, accent = 0xff7d1a, accentEvery = 11 } = {}) => {
    const { T, scene } = stage; const r = S.rng(seed);
    const geo = new T.BoxGeometry(1, 1, 1); geo.translate(0, 0.5, 0);
    const mat = new T.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0.0 });
    const count = n * n; const mesh = new T.InstancedMesh(geo, mat, count);
    mesh.castShadow = true; mesh.receiveShadow = true;
    const base = []; const m = new T.Matrix4(); const col = new T.Color();
    let k = 0;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      const x = (i - (n - 1) / 2) * cell, z = (j - (n - 1) / 2) * cell;
      const dist = Math.hypot(i - (n - 1) / 2, j - (n - 1) / 2) / (n / 2);
      const w = cell * (0.5 + r() * 0.3), d = cell * (0.5 + r() * 0.3);
      const h = Math.max(0.4, maxH * Math.pow(Math.max(0, 1 - dist), 1.4) * (0.4 + r() * 0.8));
      base.push({ x, z, w, d, h, dist });
      mesh.setColorAt(k, col.set(k % accentEvery === 0 && dist < 0.8 ? accent : color));
      k++;
    }
    const setGrowth = (g) => {
      base.forEach((b, i) => {
        const local = S.clamp((g * 1.6 - b.dist * 0.6));
        const e = 1 - Math.pow(1 - local, 3);
        m.makeScale(b.w, Math.max(0.001, b.h * e), b.d); m.setPosition(b.x, 0, b.z);
        mesh.setMatrixAt(i, m);
      });
      mesh.instanceMatrix.needsUpdate = true;
    };
    setGrowth(1);
    const ground = new T.Mesh(new T.PlaneGeometry(400, 400), new T.MeshStandardMaterial({ color: 0x1a1512, roughness: 1 }));
    ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
    scene.add(mesh);
    return { mesh, count, base, setGrowth, ground };
  };
  // A map pin (cone + sphere) in the brand orange.
  D.threePin = (stage, { color = 0xff7d1a, scale = 1 } = {}) => {
    const { T } = stage; const g = new T.Group();
    const mat = new T.MeshStandardMaterial({ color, roughness: 0.4, emissive: color, emissiveIntensity: 0.25 });
    const head = new T.Mesh(new T.SphereGeometry(0.7, 32, 16), mat); head.position.y = 2.2;
    const tip = new T.Mesh(new T.ConeGeometry(0.62, 1.6, 32), mat); tip.rotation.x = Math.PI; tip.position.y = 1.05;
    const hole = new T.Mesh(new T.SphereGeometry(0.28, 16, 8), new T.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6 })); hole.position.set(0, 2.2, 0.5);
    [head, tip, hole].forEach((x) => { x.castShadow = true; g.add(x); });
    g.scale.setScalar(scale);
    return g;
  };
  // Drive a draw function from the scene timeline: fn(t) for t in [0, dur].
  D.drive = (c, fn, { dur = c.dur } = {}) => {
    const p = { t: 0 };
    c.tl.fromTo(p, { t: 0 }, { t: dur, duration: dur, ease: 'none', onUpdate: () => fn(p.t) }, 0);
    fn(0);
  };
})();
