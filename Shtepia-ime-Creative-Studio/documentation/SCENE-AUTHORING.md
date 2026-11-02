# Writing a scene

A scene is a folder in `scene-bank/<category>/<id>/` with:

- `scene.html` — a HyperFrames sub-composition (everything inside `<template>`),
- `meta.json` — name, mode, technique, default duration, variables, sound cues, features shown,
- `preview.png` — written by `node studio.mjs previews --only <id>`.

Start by copying the closest existing scene. The id must be unique and distinctive (the builder renames it per use, e.g. `s03-<id>`).

## The skeleton

```html
<template>
  <style>
    #root { position: absolute; inset: 0; overflow: hidden; }   /* #root is scoped to this scene */
    #root .stage { background: var(--ground); }
  </style>
  <div id="root" data-composition-id="my-scene" data-width="1080" data-height="1920" data-composition-variables='[]'>
    <div class="stage layer">
      <div class="cap"><div class="headline t"></div></div>
    </div>
  </div>
  <script>
  (function () {
    const c = S.scene('my-scene', window.__hyperframes.getVariables());   // ← must be called HERE
    const { tl, v, $ } = c;
    S.ready(() => {                       // fonts (and listed images) loaded
      S.rich($('.t'), v.title);           // "*accent*" and "|" supported
      S.a.wordsBlur(tl, S.words($('.t')), 0.1);
      S.tx.out(c, $('.stage'), 'blur');   // honours the storyboard's `out`
      c.done();                           // register the timeline LAST
    });
  })();
  </script>
</template>
```

`data-composition-variables` stays `'[]'`: the builder fills it from `meta.json → vars` (plus `duration`, `start`, `in`, `out`, `palette`), resolving `{sq,en,it}` defaults to the film's language.

## Rules learned the hard way

- **Call `window.__hyperframes.getVariables()` in the scene's own script** and pass it to `S.scene`. HyperFrames scopes that call to the file it is written in; called from shared code it returns the root's variables.
- **Never read layout** (`offsetTop`, `clientWidth`, `getBoundingClientRect`): scene scripts run while the scene is hidden, so it all reads 0. Size from `S.fmt` (`W`, `H`, `safe`) and measure text with `S.fit` / `S.measure` (canvas).
- **Everything is a function of time.** No `Date.now()`, no `Math.random()` (use `S.rng(seed)`), no `repeat: -1`, no `tl.call` for state (renders seek out of order — use a proxy tween with `onUpdate`). GSAP has no `scaleZ` or `className` tweening.
- **Spaces between animated words are elements** (`S.rich` makes `.sp` spans); HyperFrames normalises whitespace text nodes between inline-blocks.
- **Never use SVG `feTurbulence` textures** — they render as dark noise in headless capture. Use the PNG grain tiles in `assets/illustrations/`.
- **Text inside the caption box**: `.cap` (or left/right `var(--cap-x)`) keeps copy clear of the platform's action rail. Vertical content must fit between `--safe-top` and `--safe-bottom`.
- **Type colour on the accent**: use `var(--accent-text)` for accent-coloured type (it keeps AA contrast on light palettes), `var(--accent)` for fills.
- **Real UI only**: `S.ui.*` crops, lifts and zooms real screenshot pixels using regions from `config/screens.json`. Add a region there (screenshot pixels, measured on the light theme) instead of drawing UI.
- **WebGL scenes** load `<script src="assets/kit/three.min.js"></script>` inside the template and draw from `S.d3.drive(c, t => …)`.
- **Frame 0 of a film is its thumbnail**: a scene meant to open a film must show content on its first frame.

## Check it

```bash
node studio.mjs previews --only my-scene     # builds, snapshots, writes preview.png — look at it
node studio.mjs preview-scene my-scene       # one-scene project → npx hyperframes preview (Studio)
node studio.mjs docs                         # refresh documentation/SCENES.md
```
