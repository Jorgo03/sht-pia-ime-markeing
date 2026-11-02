# Shtëpia.ime Creative Studio

A reusable motion-graphics and automated video production kit for **Shtëpia.ime**, built on [HyperFrames](https://hyperframes.heygen.com) (HTML + GSAP → MP4). One folder holds six creative modes, a bank of 62 original scenes, 12 campaign templates, original sound design, a voice studio, a quality-control engine and an export system.

You can type one sentence into Claude Code and get a planned, approved, rendered, checked and exported video. Or you can drive it yourself from the command line.

```bash
npm run setup                                   # once: checks the machine, generates sound + previews
npm run video -- why-shtepia-ime                # a campaign template → exports/why-shtepia-ime/
npm run video -- app-launch --lang en --formats reel,youtube,square
```

In Claude Code (from the repo root): *"Create a 20-second premium Albanian advertisement about finding an apartment in Tirana. Use 3D mode, orange branding and real Shtëpia.ime screenshots."* The `/shtepia-video` skill drafts the storyboard and stops for your approval. After you approve, it renders, reviews and exports.

---

## What is inside

| | |
|---|---|
| **6 creative modes** (`modes/`) | **Print** (cut paper: pop-up houses, torn reveals, stamps, paper maps) · **3D** (CSS-3D cities and phones with real depth, Three.js city dives and pins) · **UI Motion** (real app screenshots: zoom, lift a region off the glass, spotlight, navigate, type into the real search field) · **Kinetic typography** (fitted posters, RSVP, slot rolls, odometers, split words, 3D extrusion) · **Talking head** (silence cuts, punch-ins, word-by-word captions, lower thirds, split screens, B-roll cards over *real* footage) · **Cinematic** (letterbox, light sweeps, location titles, Ken Burns on untouched photos) |
| **Scene bank** (`scene-bank/`) | 62 scenes in 18 categories, each with an editable config, preview, docs and a working implementation. Catalogue with previews: [`documentation/SCENES.md`](documentation/SCENES.md); overview sheet: `scene-bank/CONTACT-SHEET.jpg`. |
| **12 campaign templates** (`templates/campaigns/`) | Launch · Discover your dream home · How to search · Explore on the map · How to publish · Features & benefits · Why Shtëpia.ime? · App updates · New feature spotlight · Download the app · Brand awareness · Emotional (Welcome home). All copy in Albanian, English and Italian. |
| **Sound design** (`sound-design/`) | 25 original synthesized effects (whooshes, impacts, paper, UI taps, logo reveal, risers, ambiences) with measured hit times, and music beds composed to each film's cuts (5 moods). All original and licence-free. The 19 HyperFrames effects (Pixabay licence) are also included. |
| **Voice studio** (`voice-studio/`) | Albanian, English and Italian narration through OpenAI or ElevenLabs (keys from `.env`), your own recordings, local Kokoro (English only), or no narration. Word timings drive the captions. |
| **Quality control** (`quality-control/`) | 12 checks on the *rendered* file and the live page, a 0–100 score, required gates, and a contact sheet for the by-eye review. |
| **Export** (`render/produce.mjs`) | 9:16 Reels/TikTok, 16:9 YouTube, 1:1 and 4:5 feed. Output: MP4 + thumbnail + caption + hashtags + script/storyboard + QC report + source project. |

### Sample productions (in `exports/`)

| Film | Modes | Length | QC |
|---|---|---|---|
| `app-launch` — *The launch* | 3D + UI motion | 25 s | 91/100 ✅ |
| `explore-map` — *Explore Tirana* | 3D + print maps + UI | 20 s | 87/100 ✅ |
| `brand-awareness` — *Find your home* | Print | 15 s | 95/100 ✅ |
| `why-shtepia-ime` — *Why Shtëpia.ime?* | Kinetic typography | 15 s | 91/100 ✅ |
| `why-shtepia-ime-en` — English, in 9:16, 16:9 and 1:1 | Kinetic typography | 15 s | 91 / 91 / 95 ✅ |
| `th-test` — talking-head pipeline test | Talking head | 11 s | 95/100 ✅ |
| `narration-test` — English voice-over + captions (Kokoro) | Typography + voice | 15 s | 92/100 ✅ |

Each export folder holds the MP4(s), thumbnail, caption, hashtags, script and storyboard, QC report and contact sheet. The `source/` project copies are left out of git; `npm run video -- <id>` regenerates them.

`th-test` checks the talking-head pipeline end to end. Its "recording" is a panning room photo with a locally synthesized English voice (no person). It exercises silence cuts, punch-ins, captions, a lower third and the end card. Replace it with a real recording.

---

## Requirements and installation

- **Node.js ≥ 22**, **FFmpeg** on `PATH`, and Chrome/Chromium (HyperFrames finds or downloads one; `npx hyperframes doctor` checks).
- **Playwright** is used by QC to audit the live page (`npm install` installs it as an optional dependency).
- Optional: OpenAI / ElevenLabs keys for narration, `pip install kokoro-onnx soundfile` for local English TTS, and `npx hyperframes models install parakeet` (or whisper.cpp) for on-device transcription of talking-head footage.

```bash
cd Shtepia-ime-Creative-Studio
npm install
cp .env.example .env        # only if you want OpenAI / ElevenLabs narration
npm run setup               # = node studio.mjs init
```

Renders are deterministic and local. GSAP, Three.js and fonts are vendored, so a render never fetches anything from the network.

## Making a video

1. **Pick or plan.** `npm run templates` lists the campaigns. `node studio.mjs new app-launch --lang it` writes an editable storyboard. `node studio.mjs plan "<one sentence>"` drafts one from a brief (length, language, format, modes, place).
2. **Edit the storyboard** (`storyboards/<id>.json`): scenes, copy, durations, palette, voice, music. Format reference: [`documentation/STORYBOARD.md`](documentation/STORYBOARD.md).
3. **Approve the script and storyboard**, then produce: `npm run video -- storyboards/<id>.json [--formats reel,youtube] [--quality draft]`.
4. **Review** `exports/<id>/QC_<format>.md` and look at `contact_<format>.jpg`, then fix and re-run. A film is final only when QC passes *and* someone has looked at it.

Commands (`node studio.mjs help`):

| Command | Does |
|---|---|
| `init` | Checks the machine, regenerates `brand.css`, the SFX library and the scene previews |
| `scenes [--mode 3d] [--json]` · `templates` · `voices` | List the scene bank, the campaigns, the narration providers |
| `new <template> [--lang] [--format] [--id]` · `plan "<brief>"` | Create a storyboard |
| `video <storyboard\|template> [--formats a,b] [--lang] [--quality]` | Voice → music → build → render → QC → export |
| `build <storyboard>` · `check <project>` · `snapshot <project> --at 1,3` · `render <project>` · `qc <project>` | Single steps (`projects/<id>/` is a normal HyperFrames project: `npx hyperframes preview` opens it in the Studio) |
| `talking-head <recording> [--lang] [--transcript]` | Real footage → silence-cut storyboard with captions |
| `preview-scene <id>` · `previews [--only a,b]` · `docs` | Work on scenes; regenerate previews and `documentation/SCENES.md` |

## Choosing a creative mode

| Goal | Mode | Start with |
|---|---|---|
| Show how the app works | UI motion | `phone-rise`, `search-type-results`, `search-filters-sheet`, `ui-push-nav`, `feature-spotlight` |
| Premium / launch energy | 3D | `city-three-dive`, `phone-3d-spin`, `room-model-3d`, `three-pin-drop` |
| Warm, crafted brand story | Print | `paper-town-popup`, `hook-paper-door`, `paper-torn-reveal`, `paper-key-unlock` |
| Message-first, fast, muted autoplay | Kinetic typography | `type-split-word`, `type-stack-poster`, `type-flash-rsvp`, `hook-city-slot` |
| A person explaining | Talking head | `node studio.mjs talking-head …` + `th-broll-card`, `th-split-screen` |
| Properties and places | Cinematic | `cine-location-title`, `property-kenburns-facts`, `property-shutter-reveal` |

## Adding things

- **New scene:** see [`documentation/SCENE-AUTHORING.md`](documentation/SCENE-AUTHORING.md). Copy the closest scene, give it a new id, run `node studio.mjs previews --only <id>` and look at the result.
- **New app screens:** add PNGs (1290×2796, light and dark) to `assets/screenshots/`, and register them with their UI regions and features in `config/screens.json`. The app repo's `marketing/launch-video/capture/capture.mjs` captures them against demo data.
- **New property photos:** `assets/property-images/`. Use real listings in `config/listings.json` (`demo: false`) once you have cleared rights to them.
- **Licensed music:** put it in `assets/music/` and set `"audio": {"music": {"src": "assets/music/track.m4a"}}`.
- **New features in the app:** update `config/features.json`. It is the accuracy gate: QC fails any film that shows or claims a feature that is not `live`.

## Brand colours and identity

All colours and fonts live in `config/brand.json` (regenerate with `node studio.mjs brand`; every build does it too). Brand rules: [`brand/BRAND.md`](brand/BRAND.md).

- The logo door is always `#FF5F1F` and always the official SVG from `assets/logos/`. It is never redrawn, recoloured or placed on orange.
- The UI accent is `#FF7D1A` (the app's `--fho-orange-1`). Accent-coloured *type* uses `accentText`, which keeps WCAG AA contrast: on the light palette it is the deep `#B84A00`, because the brand orange is only 2.2:1 on cream.
- There are five palettes: `night` (default), `paper` (the app's light theme), `orange` (bold type beats; ground `#E85D00` keeps white type at least 3:1), `navy` and `mono`. Set them per film or per scene.
- Fonts are the app's own: Newsreader, Manrope and JetBrains Mono (SIL OFL), vendored in `assets/fonts/`.

## Quality control

`node studio.mjs qc <project>` (also part of `video`) runs 12 checks. Weights add up to 100, and the ones marked *required* gate "final":

1. **Playable** *(required)*: H.264, yuv420p, correct size and fps, and a full decode with no errors.
2. **Duration** *(required)*: file length against the timeline and the requested length.
3. **Hook** *(required)*: frame 0 has content (it is the thumbnail), and the first 1.5 s move.
4. **Motion**: no stretch of 2.5 s or more without change (the end card may hold).
5. **Transitions**: no blank or flash frames.
6. **Readable** *(required)*: every visible text box is at least 26 px, plus HyperFrames' contrast and reading-time checks.
7. **Safe zone** *(required)*: the text boxes in the live page, sampled every 0.5 s, sit inside the format's safe area and clear of the action rail.
8. **Captions**: synchronised word timings when there is speech.
9. **Audio**: EBU R128 loudness of −20 to −11 LUFS, with true peak at most −0.5 dBTP.
10. **Assets** *(required)*: no missing files, no lint or runtime errors.
11. **Brand** *(required)*: logos byte-identical to the official files, no logo on orange, door colour intact.
12. **Accuracy** *(required)*: only live features; no superlatives, guarantees, unbacked counts, mortgage claims, or AI claims while AI is flagged.

QC measures; it does not judge taste. It writes `qc/contact.jpg` so a person (or Claude) can look at every second of the film. Sound is measured, not listened to.

## Troubleshooting

| Symptom | Fix |
|---|---|
| A scene is blank or frozen | Its script must call `S.scene(id, window.__hyperframes.getVariables())` and `c.done()` last. Run `node studio.mjs check <project>`. |
| Text is mis-sized or 0 px | Scenes must not read DOM layout (it is hidden at build time). Use `S.fit`. |
| Words glued together | Build copy with `S.rich` (real space elements). |
| Paper or grain looks dark | Use the PNG grain tiles, never SVG `feTurbulence`. |
| Render is slow | `--quality draft` while iterating. Set `PRODUCER_HEADLESS_SHELL_PATH` to a chrome-headless-shell (the kit finds `/opt/pw-browsers` automatically). |
| "Chrome not found" | `npx hyperframes browser ensure`. |
| No narration | `node studio.mjs voices`: add a key to `.env`, or use `provider: "file"` with your own recordings. |
| Talking-head captions missing | No on-device speech model: run `npx hyperframes models install parakeet`, or pass `--transcript subs.srt`. |
| QC "not final" | Read `QC_<format>.md`: each line says what failed and where (time, text, box). |

## Honest limitations

- **Albanian narration** needs OpenAI or ElevenLabs (`eleven_v3`); Kokoro has no Albanian voice. Neither provider was exercised in this environment (no keys). The code follows their documented APIs and needs one real test run.
- **Transcription** needs Parakeet or whisper.cpp; neither could be installed here (model downloads blocked). The transcript import path was tested.
- **Screens** cover home, explore, filters, map and two listing details. The listing wizard, messaging, viewings, saved searches and agent dashboard are live but have no screenshots yet, so the kit only covers them with type and print scenes until they are captured.
- **The demo listings and photos are fictional** (AI-generated in the app repo's demo data). Use real, cleared listings for property campaigns.
- **The `@shtepia.ime` handle and the website are placeholders** until confirmed (`config/brand.json → $todo`).
- **Albanian copy** is written for the brand voice, and **English and Italian are translations**. All of it deserves a native speaker's read before paid campaigns.
