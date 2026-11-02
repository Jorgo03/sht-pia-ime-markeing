---
name: shtepia-video
description: Make a Shtëpia.ime marketing video with the Creative Studio kit (Shtepia-ime-Creative-Studio/) — from one sentence to an exported, QC-checked MP4. Use for any request to create, edit, translate, re-format or check a Shtëpia.ime ad, reel, TikTok, YouTube or feed video, or to add scenes, templates or assets to the kit.
---

# Shtëpia.ime video production

The kit lives in `Shtepia-ime-Creative-Studio/`. It renders with HyperFrames (HTML + GSAP → MP4). Read `Shtepia-ime-Creative-Studio/README.md` once if you have not. All commands below run from that folder.

## The truth rules (non-negotiable)

1. **Only real features.** Every claim and every feature shown must be `live` in `config/features.json` (or switched on in its `overrides`). Never claim anything in its `neverClaim` list. AI features are *flagged*, not live.
2. **Only real screens.** App UI comes from `assets/screenshots/{light,dark}/*.png` via the UI engine (zoom, lift, spotlight, navigate, type into the real search field). Never draw, mock up or invent an app screen. If a feature has no screenshot (`screens: []` in features.json), show it with type/print scenes, or ask for a capture.
3. **Demo listings are fictional.** `config/listings.json` mirrors the demo data in the screenshots. Fine for showing how the app works; never present them as real offers or real prices.
4. **The logo is never redrawn.** Use the official SVGs in `assets/logos/` (`S.logo()`, `S.lockup()`). Never recolour the door, never put the orange door on orange, never rearrange door and name.
5. **No fake people.** Talking-head mode only cuts and frames real footage the person supplies.
6. **Numbers need a source.** A count on screen ("3 prona në Tiranë") must be readable off a real screen or come from real data; declare it in the storyboard's `evidence` map, or QC fails it.

## Standing instructions from the owner

- **Every new video idea is produced in all 8 app languages**: sq, en, de, it, es, pl, ru, fr. Use `node studio.mjs idea "<brief>"` (or `--template <id>` / `--storyboard <file with {sq,en,…} copy maps>`). Copy in maps that lack a language is translated from `config/locales/<lang>.json` (keyed by the Albanian source); add any new strings there for all 5 extra languages.
- **Deliver the videos here in the chat** — send every `local/library/<id>/<lang>/video.mp4` with `SendUserFile` (display: render), and give each language's caption + hashtags (from `caption.txt`) ready to paste on social media.
- **Videos never go to GitHub.** They live only in the local library (`local/`, git-ignored) and the owner's local app (`npm run app` → http://127.0.0.1:4747): every idea × language, copy caption, download, tick where it was posted. Never commit `exports/`, `local/` or any MP4.
- The owner chooses what to post from the chat / local app; do not post to social media yourself.

## The work loop

1. **Understand the brief** — length, language (sq default; en, it), platform/format (reel default; youtube, square, portrait, tiktok), goal, modes asked for, places, features. Ask only what changes the film; otherwise use the defaults.
2. **Draft** — `node studio.mjs plan "<the person's sentence>"` writes `storyboards/<id>.json` from the closest of the 12 campaign templates (`npm run templates`) and prints its reasoning.
3. **Make it good** — edit that storyboard yourself:
   - **Hook in the first 1.5 s**: scene 1 must show content on frame 0 (it is the thumbnail) — a `hooks/` scene or one tagged `hook`.
   - Choose scenes from `node studio.mjs scenes` (or `documentation/SCENES.md`, which has previews); vary the techniques; 3–5 kinds of transition; one payoff (`"payoff": true`) — the music lands its big hit there.
   - Write the copy in the brand voice (`config/brand.json → voice`): short, warm, confident, serif headline with the payoff words in `*italic accent*`. Reading time: ~0.5 s + 0.3 s per word.
   - Narration only if asked: `"voice": {"provider": "openai"|"elevenlabs"|"file"|"kokoro"}` plus a `"vo"` line per scene (≈ 2.2 words/s; Kokoro is English-only). `node studio.mjs voices` says what is configured.
   - Music: `"audio": {"music": {"bed": "warm"|"night"|"bright"|"cinematic"|"paper", "bpm": 100}}` — composed to the cuts, original, no licence.
4. **STOP for approval.** Show the concept (one line), the hook, the script (on-screen text + VO), and the storyboard as a table (time · scene · what is on screen · sound). Do not render until the person approves — rendering, narration and paid voices are the expensive steps.
5. **Produce** — `node studio.mjs video storyboards/<id>.json [--formats reel,youtube,square]`. This builds the HyperFrames project, renders, runs QC and writes `exports/<id>/`.
6. **Review — QC is not the last word.** Read `exports/<id>/QC_<format>.md`. Then LOOK at `exports/<id>/contact_<format>.jpg` (one frame per second) with the Read tool and judge what QC cannot: does each frame read, does the story follow, is anything ugly, clipped or confusing. Fix P0s (unreadable, wrong, off-brand), then P1s; re-run step 5. A film is final only when QC says PASS **and** you looked.
7. **Deliver** — give the person: the MP4 path(s), the QC score, the caption (`caption.txt`) and hashtags, what you checked by eye and what nobody checked (sound is measured, not heard), and any demo-data or placeholder caveats (e.g. the `@shtepia.ime` handle is unconfirmed — `config/brand.json $todo`).

## Real footage (talking head)

`node studio.mjs talking-head <recording.mp4> --lang sq [--transcript words.json|subs.srt]` → silence-cut jump cuts with punch-ins, word-by-word captions, a lower third and an end card in `storyboards/<id>.json`. Add `th-broll-card` / `th-split-screen` scenes at the sentences that name a feature, then step 4.

## Changing the kit

- New scene: copy the closest one in `scene-bank/<category>/<id>/` (scene.html + meta.json), give it a new id, run `node studio.mjs previews --only <id>` and look at the preview, then `node studio.mjs docs`. Rules: `documentation/SCENE-AUTHORING.md`.
- Brand colours/fonts: `config/brand.json`. Features: `config/features.json`. Screens and UI regions: `config/screens.json`.
- Every scene file must pass `npx hyperframes check` inside a built project; QC runs it for you.
