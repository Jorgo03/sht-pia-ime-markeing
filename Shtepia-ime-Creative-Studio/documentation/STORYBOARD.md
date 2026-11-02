# Storyboard format

A storyboard is one JSON file that describes a whole film. `node studio.mjs video <file>` turns it into a HyperFrames project, renders it, checks it and exports it. Templates in `templates/campaigns/` are storyboards whose text fields are `{"sq", "en", "it"}` maps; `node studio.mjs new <template> --lang en` writes a resolved copy to `storyboards/`.

```jsonc
{
  "id": "finding-apartment-tirana",        // folder name in projects/ and exports/
  "title": "Gjej apartamentin në Tiranë",
  "language": "sq",                         // sq | en | it — picks scene default copy
  "format": "reel",                         // reel | tiktok | youtube | square | portrait (config/formats.json)
  "palette": "night",                       // night | paper | orange | navy | mono (config/brand.json)
  "targetDuration": 20,                     // QC checks the film against it
  "features": ["map-view"],                 // extra features the film claims (scene features are added automatically)
  "evidence": { "3 prona në Tiranë": "map screenshot cluster reads 3" },  // backs counted claims for QC
  "thumbnailAt": 7.2,                       // optional: the frame exported as thumbnail.jpg

  "voice": { "provider": "none" },          // none | file | openai | elevenlabs | kokoro (+ "voice", "model")
  "audio": {
    "music": { "bed": "warm", "bpm": 100 }, // original bed composed to the cuts; or { "src": "assets/music/licensed.m4a", "volume": 0.5 }
    "sfx": [ { "id": "impact-cinema", "at": 12.4, "volume": 0.6 } ]   // extra cues in film seconds
  },
  "autoSfx": true,                          // add each scene's own sound cues (meta.sfx)

  "scenes": [
    { "scene": "hook-question", "duration": 2.4,
      "vars": { "question": "Po kërkon *apartament në Tiranë?*" } },
    { "scene": "city-three-dive", "duration": 3.2, "in": "zoom-out", "out": "blur",
      "vo": "Çdo lagje e Tiranës, në një vend." },
    { "scene": "tx-orange-wipe" },          // overlay transition: sits centred on the seam before it
    { "scene": "map-app-clusters", "duration": 3.4, "palette": "paper", "sfx": [ { "id": "ui-tap", "at": 0.9 } ] },
    { "scene": "outro-lockup-tagline", "duration": 3.0, "payoff": true }
  ],

  "caption": "…",                           // exported as caption.txt
  "hashtags": ["shtepiaime", "tirana"]
}
```

## Scene fields

| Field | Meaning |
|---|---|
| `scene` | A scene id from the bank (`node studio.mjs scenes`, `documentation/SCENES.md`). |
| `duration` | Seconds this scene gets. Scenes adapt their exits to it; very short slots cut animations short. |
| `vars` | The scene's variables (see its meta.json). Text: `*words*` = accent, `|` = line break. |
| `in` / `out` | Transition: `auto`, `none`, `cut`, `blur`, `whip-left`, `whip-right`, `whip-up`, `zoom-in`, `zoom-out`, `iris`, `slide-up`, `shutter`, `paper`, `flood`, `dip`. |
| `palette` | Palette for this scene only. |
| `start` / `overlap` | Place the scene explicitly, or start it `overlap` seconds before the previous one ends. |
| `vo` / `voFile` / `voOffset` | Narration line for this scene (spoken from its start + 0.15 s). |
| `sfx` | Replace the scene's default sound cues (seconds from the scene start; `id` from `assets/sound/sfx/library.json` — a base id like `whoosh-air` rotates through its takes). |
| `payoff` | The film's big moment: the music bed lands its wide chord and boom here. |

## Footage (talking head)

`"footage": [{ "src": "assets/footage/x.mp4", "start": 0, "in": 0.6, "out": 2.5, "hasAudio": true, "punch": [{ "at": 1.2, "scale": 1.14, "y": -3 }], "rect": { "top": 0, "height": "50%" } }]` — written for you by `node studio.mjs talking-head <file>`. `rect` crops the footage to part of the frame for split screens; `punch` sets instant reframes (seconds in source time).

`"captions": { "words": [ {"text", "start", "end"} ] }` (or a path to such a JSON) drives the `th-captions` scene. The voice studio and the talking-head prep fill it.
