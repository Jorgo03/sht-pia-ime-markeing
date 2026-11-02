# Brand rules for video

Source of truth: `config/brand.json` (colours, fonts, palettes, voice) and `assets/logos/logo-guide.md` (the official logo guide, copied from the app repo).

## Logo — "Dera" (the door)

- Use only the official files in `assets/logos/`: the symbol (orange, white, black), horizontal and stacked lockups (dark and light versions), wordmark, and app icons.
- The door is `#FF5F1F`, always. No recolouring, gradients, outlines, shadows on the door, stretching, rotating, or rearranging the door and the name.
- Never put the orange door on orange or on busy mid-tone photos. Use the white or black symbol there.
- The knob is a hole: it shows what is behind it. Two scenes build on this idea, `logo-knob-pullback` and `outro-into-the-door`. Both scale the official file and never redraw it.
- Clear space: at least the width of the door frame's post (about 1/7 of the door's width) on every side.
- QC compares every logo file in a built film byte-for-byte with the official set.

## Colour

| Token | Night (default) | Paper (light) | Use |
|---|---|---|---|
| ground | `#0b0806` | `#f1ede6` | backgrounds |
| ink | `#f0ece6` | `#1a1714` | type |
| accent | `#FF7D1A` | `#FF7D1A` | fills, buttons, pins, highlights |
| accentText | `#FF7D1A` | `#B84A00` | accent-coloured type (AA contrast) |
| door | `#FF5F1F` | `#FF5F1F` | the logo only |

There are also `orange`, `navy` and `mono` palettes. Buttons use `accent-2` (`#E85D00`), which keeps white bold type at least 3:1.

## Type

The app's own editorial voice: **Newsreader** serif headlines with the payoff words in *italic accent*, **Manrope** for display, UI and captions, and **JetBrains Mono** uppercase kickers, like catalogue plate numbers.

## Voice

Warm, confident and editorial, in short sentences. No hype ("revolutionary", "the best", "#1"). Lead with what the person gets: a home, a choice, clarity. The tagline used across the films is *"Shtëpia jote. Zgjedhja jote."*
