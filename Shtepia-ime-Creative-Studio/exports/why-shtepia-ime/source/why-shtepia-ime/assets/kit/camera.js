// Shtëpia.ime Creative Studio — camera moves (window.S.cam) and scene
// transitions (window.S.tx). Camera moves tween a WRAPPER inside the scene
// (`.cam`), never a timed media element. Transitions run on a scene's `.stage`
// so the host clip itself is never transformed.
(function () {
  const S = window.S;
  const cam = (S.cam = {});

  // Slow push in (Ken Burns): 1.0 -> to, optional drift in % of the frame.
  cam.push = (tl, el, at, dur, { from = 1, to = 1.08, x = 0, y = 0, ease = 'none' } = {}) => {
    tl.fromTo(el, { scale: from, xPercent: 0, yPercent: 0 }, { scale: to, xPercent: x, yPercent: y, duration: dur, ease }, at);
    return at + dur;
  };
  // Pull back to reveal.
  cam.pull = (tl, el, at, dur, opts = {}) => cam.push(tl, el, at, dur, { from: 1.25, to: 1, ease: 'power3.out', ...opts });
  // Pan across (percent of the element's own size).
  cam.pan = (tl, el, at, dur, { fromX = 0, toX = -10, fromY = 0, toY = 0, ease = 'power1.inOut', scale = 1.15 } = {}) => {
    tl.fromTo(el, { xPercent: fromX, yPercent: fromY, scale }, { xPercent: toX, yPercent: toY, scale, duration: dur, ease }, at);
    return at + dur;
  };
  // Punch-in: an instant reframe (hard cut inside a shot) — 0 ms on purpose.
  cam.punch = (tl, el, at, { scale = 1.18, x = 0, y = 0 } = {}) => {
    tl.set(el, { scale, xPercent: x, yPercent: y }, at);
    return at;
  };
  cam.reset = (tl, el, at) => { tl.set(el, { scale: 1, xPercent: 0, yPercent: 0 }, at); return at; };
  // Zoom the camera onto a point of the element (fractions 0..1), e.g. a UI region.
  cam.focus = (tl, el, at, { fx = 0.5, fy = 0.5, scale = 2, dur = 0.9, ease = 'power3.inOut' } = {}) => {
    tl.to(el, { transformOrigin: '50% 50%', scale, xPercent: (0.5 - fx) * 100 * scale, yPercent: (0.5 - fy) * 100 * scale, duration: dur, ease }, at);
    return at + dur;
  };
  // Orbit a preserve-3d stage around Y (degrees), slow and linear.
  cam.orbit = (tl, el, at, dur, { from = -12, to = 12, tilt = 8, ease = 'none' } = {}) => {
    tl.fromTo(el, { rotationY: from, rotationX: tilt }, { rotationY: to, rotationX: tilt, duration: dur, ease }, at);
    return at + dur;
  };
  // Dolly-in through depth layers: nearer layers move more (parallax).
  cam.parallax = (tl, layers, at, dur, { dist = 120, scale = 0.06, ease = 'power1.inOut', axis = 'y' } = {}) => {
    layers.forEach((L, i) => {
      const depth = (i + 1) / layers.length;
      tl.fromTo(L, { [axis]: dist * depth, scale: 1 }, { [axis]: -dist * depth, scale: 1 + scale * depth, duration: dur, ease }, at);
    });
    return at + dur;
  };
  // Seeded handheld shake with a finite number of keys (no repeat:-1).
  cam.shake = (tl, el, at, dur, { amp = 6, hz = 8, seed = 7 } = {}) => {
    const r = S.rng(seed); const n = Math.max(1, Math.round(dur * hz)); const step = dur / n;
    for (let i = 0; i < n; i++) tl.to(el, { x: (r() - 0.5) * 2 * amp, y: (r() - 0.5) * 2 * amp, duration: step, ease: 'sine.inOut' }, at + i * step);
    tl.to(el, { x: 0, y: 0, duration: step, ease: 'sine.out' }, at + dur);
    return at + dur;
  };

  // ---------- Transitions ----------
  // Each scene calls S.tx.in(c, stage) and S.tx.out(c, stage). `kind` comes
  // from the scene's `in` / `out` variables (set in the storyboard); 'auto'
  // uses the scene's own default. A transition is caused by something on
  // screen: pick the one that matches the cut (see documentation/MOTION.md).
  const tx = (S.tx = {});
  tx.kinds = ['none', 'cut', 'blur', 'whip-left', 'whip-right', 'whip-up', 'zoom-in', 'zoom-out', 'iris', 'flood', 'dip', 'slide-up', 'paper', 'shutter'];

  tx.in = (c, el, kind, at = 0) => {
    kind = !c.v.in || c.v.in === 'auto' ? kind || 'blur' : c.v.in;
    const t = at;
    switch (kind) {
      case 'none': case 'cut': return t;
      case 'blur': c.tl.fromTo(el, { opacity: 0, filter: 'blur(10px)' }, { opacity: 1, filter: 'blur(0px)', duration: 0.2, ease: 'power2.out' }, t); return t + 0.2;
      case 'whip-left': c.tl.fromTo(el, { xPercent: 40, filter: 'blur(18px)', opacity: 0.2 }, { xPercent: 0, filter: 'blur(0px)', opacity: 1, duration: 0.32, ease: 'power3.out' }, t); return t + 0.32;
      case 'whip-right': c.tl.fromTo(el, { xPercent: -40, filter: 'blur(18px)', opacity: 0.2 }, { xPercent: 0, filter: 'blur(0px)', opacity: 1, duration: 0.32, ease: 'power3.out' }, t); return t + 0.32;
      case 'whip-up': c.tl.fromTo(el, { yPercent: 30, filter: 'blur(18px)', opacity: 0.2 }, { yPercent: 0, filter: 'blur(0px)', opacity: 1, duration: 0.32, ease: 'power3.out' }, t); return t + 0.32;
      case 'zoom-in': c.tl.fromTo(el, { scale: 0.82, opacity: 0, filter: 'blur(12px)' }, { scale: 1, opacity: 1, filter: 'blur(0px)', duration: 0.45, ease: 'expo.out' }, t); return t + 0.45;
      case 'zoom-out': c.tl.fromTo(el, { scale: 1.3, opacity: 0, filter: 'blur(12px)' }, { scale: 1, opacity: 1, filter: 'blur(0px)', duration: 0.5, ease: 'expo.out' }, t); return t + 0.5;
      case 'iris': c.tl.fromTo(el, { clipPath: 'circle(0% at 50% 50%)' }, { clipPath: 'circle(150% at 50% 50%)', duration: 0.5, ease: 'power3.in' }, t); return t + 0.5;
      case 'slide-up': c.tl.fromTo(el, { yPercent: 100 }, { yPercent: 0, duration: 0.6, ease: 'expo.out' }, t); return t + 0.6;
      case 'shutter': c.tl.fromTo(el, { clipPath: 'inset(50% 0 50% 0)' }, { clipPath: 'inset(0% 0 0% 0)', duration: 0.5, ease: 'expo.inOut' }, t); return t + 0.5;
      case 'paper': c.tl.fromTo(el, { yPercent: 105, rotation: 4 }, { yPercent: 0, rotation: 0, duration: 0.7, ease: 'back.out(1.1)' }, t); return t + 0.7;
      case 'flood': case 'dip': c.tl.fromTo(el, { opacity: 0 }, { opacity: 1, duration: 0.1, ease: 'none' }, t); return t + 0.1;
      default: return t;
    }
  };

  tx.out = (c, el, kind) => {
    kind = !c.v.out || c.v.out === 'auto' ? kind || 'blur' : c.v.out;
    const end = c.dur;
    const at = (d) => Math.max(0, end - d - 0.001);
    switch (kind) {
      case 'none': case 'cut': return end;
      case 'blur': c.tl.to(el, { opacity: 0, filter: 'blur(10px)', duration: 0.18, ease: 'power3.in' }, at(0.18)); return at(0.18);
      case 'whip-left': c.tl.to(el, { xPercent: -40, filter: 'blur(18px)', opacity: 0.2, duration: 0.24, ease: 'power3.in' }, at(0.24)); return at(0.24);
      case 'whip-right': c.tl.to(el, { xPercent: 40, filter: 'blur(18px)', opacity: 0.2, duration: 0.24, ease: 'power3.in' }, at(0.24)); return at(0.24);
      case 'whip-up': c.tl.to(el, { yPercent: -30, filter: 'blur(18px)', opacity: 0.2, duration: 0.24, ease: 'power3.in' }, at(0.24)); return at(0.24);
      case 'zoom-in': c.tl.to(el, { scale: 1.6, opacity: 0, filter: 'blur(14px)', duration: 0.3, ease: 'power3.in' }, at(0.3)); return at(0.3);
      case 'zoom-out': c.tl.to(el, { scale: 0.7, opacity: 0, filter: 'blur(10px)', duration: 0.3, ease: 'power3.in' }, at(0.3)); return at(0.3);
      case 'iris': c.tl.to(el, { clipPath: 'circle(0% at 50% 50%)', duration: 0.35, ease: 'power3.in' }, at(0.35)); return at(0.35);
      case 'slide-up': c.tl.to(el, { yPercent: -100, duration: 0.4, ease: 'power3.in' }, at(0.4)); return at(0.4);
      case 'shutter': c.tl.to(el, { clipPath: 'inset(50% 0 50% 0)', duration: 0.35, ease: 'expo.in' }, at(0.35)); return at(0.35);
      case 'paper': c.tl.to(el, { yPercent: -105, rotation: -4, duration: 0.45, ease: 'power3.in' }, at(0.45)); return at(0.45);
      case 'dip': c.tl.to(el, { opacity: 0.6, duration: 0.1, ease: 'none' }, at(0.1)); return at(0.1);
      case 'flood': return end;
      default: return end;
    }
  };
})();
