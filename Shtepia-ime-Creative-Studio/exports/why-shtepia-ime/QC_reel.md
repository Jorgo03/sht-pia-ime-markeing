# QC — why-shtepia-ime (reel)

**Score 91/100 — PASSED: ready to export**

| | Check | Weight | Result |
|---|---|---|---|
| ✅ | The exported video plays *(required)* | 12 | h264 1080x1920 30 fps, aac audio; full decode clean |
| ✅ | Duration matches the storyboard *(required)* | 6 | file 15.00 s, timeline 15 s, requested 15 s |
| ✅ | First 1.5 s are engaging (content on frame 0, motion, change) *(required)* | 10 | frame 0 carries content (σ=26.3), 33% of the first 1.5 s moves, opens on a hook scene |
| ⚠️ | No long stretch without meaningful movement | 9 | still stretches ≥2.5 s at 5.7–8.3 s |
| ✅ | Transitions are smooth (no blank or flash frames) | 7 | no blank or flash frames between scenes |
| ⚠️ | Text is readable on a phone (size floor, contrast) *(required)* | 10 | 1 contrast findings; 8 lines too small or on screen too briefly (line_unread) |
| ✅ | Text and product inside the platform safe zone *(required)* | 9 | 134 text boxes across 30 samples, all inside the safe zone |
| ✅ | Subtitles synchronised with the voice | 6 | no speech in the film: nothing to caption |
| ✅ | Audio balanced (loudness, peaks, presence) | 7 | -17.2 LUFS integrated, true peak -2.1 dBFS (measured, not listened to) |
| ✅ | No missing assets or runtime errors *(required)* | 8 | every referenced file present, hyperframes check: no lint/runtime errors |
| ✅ | Official branding used correctly *(required)* | 8 | 20 logo files, byte-identical to the official set; no logo on orange |
| ✅ | Only real, live app features are shown or claimed *(required)* | 8 | 3 features shown, all live; no unbacked claims in the copy |

## Still to do by eye

These numbers are measurements. Before publishing, open `qc/contact.jpg` (one frame per second) and the video itself, and judge what QC cannot: story, taste, whether every frame reads as intended. Sound was measured, not heard.
