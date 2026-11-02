# Shtëpia.ime marketing

Marketing videos for Shtëpia.ime (the app lives in `Jorgo03/sht-pia-ime`; this repo never changes it).

- `Shtepia-ime-Creative-Studio/` — the video production kit (HyperFrames). Start with its `README.md`.
- To make, edit or check a video, use the `/shtepia-video` skill (`.claude/skills/shtepia-video/SKILL.md`): it holds the truth rules (real features, real screens, official logo, no fake people) and the approve-before-render loop.
- Commands run from `Shtepia-ime-Creative-Studio/`: `npm run setup` once, then `npm run video -- <template-id | storyboards/x.json>`.

## Owner's standing rule
Every new video idea → produce it in all 8 languages (`node studio.mjs idea "<brief>"`), send all the MP4s here in chat with their captions, keep them only in the local library / local app (`npm run app`). Videos are never committed or pushed.
