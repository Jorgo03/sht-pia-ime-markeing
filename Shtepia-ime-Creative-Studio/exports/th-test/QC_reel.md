# QC — th-test (reel)

**Score 95/100 — PASSED: ready to export**

| | Check | Weight | Result |
|---|---|---|---|
| ✅ | The exported video plays *(required)* | 12 | h264 1080x1920 30 fps, aac audio; full decode clean |
| ✅ | Duration matches the storyboard *(required)* | 6 | file 11.43 s, timeline 11.41 s, requested 11.4 s |
| ✅ | First 1.5 s are engaging (content on frame 0, motion, change) *(required)* | 10 | frame 0 carries content (σ=41.2), 100% of the first 1.5 s moves |
| ✅ | No long stretch without meaningful movement | 9 | something moves in every 2.5 s window (the end card may hold) |
| ✅ | Transitions are smooth (no blank or flash frames) | 7 | no blank or flash frames between scenes |
| ⚠️ | Text is readable on a phone (size floor, contrast) *(required)* | 10 | 3 lines too small or on screen too briefly (text_below_floor, line_unread) |
| ✅ | Text and product inside the platform safe zone *(required)* | 9 | 83 text boxes across 23 samples, all inside the safe zone |
| ✅ | Subtitles synchronised with the voice | 6 | 25 words timed from the transcript |
| ✅ | Audio balanced (loudness, peaks, presence) | 7 | -17.8 LUFS integrated, true peak -2.5 dBFS (measured, not listened to) |
| ✅ | No missing assets or runtime errors *(required)* | 8 | every referenced file present, hyperframes check: no lint/runtime errors |
| ✅ | Official branding used correctly *(required)* | 8 | 20 logo files, byte-identical to the official set; no logo on orange |
| ✅ | Only real, live app features are shown or claimed *(required)* | 8 | 0 features shown, all live; no unbacked claims in the copy |

## Still to do by eye

These numbers are measurements. Before publishing, open `qc/contact.jpg` (one frame per second) and the video itself, and judge what QC cannot: story, taste, whether every frame reads as intended. Sound was measured, not heard.
