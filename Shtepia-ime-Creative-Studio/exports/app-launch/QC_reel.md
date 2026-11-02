# QC — app-launch (reel)

**Score 82/100 — NOT FINAL (required checks failed: safe)**

| | Check | Weight | Result |
|---|---|---|---|
| ✅ | The exported video plays *(required)* | 12 | h264 1080x1920 30 fps, aac audio; full decode clean |
| ✅ | Duration matches the storyboard *(required)* | 6 | file 25.00 s, timeline 25 s, requested 25 s |
| ✅ | First 1.5 s are engaging (content on frame 0, motion, change) *(required)* | 10 | frame 0 carries content (σ=14.5), 40% of the first 1.5 s moves, opens on a hook scene |
| ✅ | No long stretch without meaningful movement | 9 | something moves in every 2.5 s window (the end card may hold) |
| ✅ | Transitions are smooth (no blank or flash frames) | 7 | no blank or flash frames between scenes |
| ⚠️ | Text is readable on a phone (size floor, contrast) *(required)* | 10 | 5 lines too small or on screen too briefly (text_below_floor, line_unread) |
| ❌ | Text and product inside the platform safe zone *(required)* | 9 | 4 text boxes outside the reel safe zone, e.g. "shtëpinë" at t=0.25s (53,994,483,1121) |
| ✅ | Subtitles synchronised with the voice | 6 | no speech in the film: nothing to caption |
| ✅ | Audio balanced (loudness, peaks, presence) | 7 | -17.6 LUFS integrated, true peak -2.3 dBFS (measured, not listened to) |
| ✅ | No missing assets or runtime errors *(required)* | 8 | every referenced file present, hyperframes check: no lint/runtime errors |
| ✅ | Official branding used correctly *(required)* | 8 | 20 logo files, byte-identical to the official set; no logo on orange |
| ⚠️ | Only real, live app features are shown or claimed *(required)* | 8 | 3 claim(s) backed by declared evidence: "3 prona në Tiranë" ← map screenshot (config/screens.json map.clusterTirana) shows a cluster of 3; "3 homes in Tirana" ← map screenshot cluster reads 3; "3 immobili a Tirana" ← map screenshot cluster reads 3; uses the DEMO listings (fictional): fine for app demos, not for property offers |

## Still to do by eye

These numbers are measurements. Before publishing, open `qc/contact.jpg` (one frame per second) and the video itself, and judge what QC cannot: story, taste, whether every frame reads as intended. Sound was measured, not heard.
