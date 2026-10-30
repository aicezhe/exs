# EXS project context

## 7. Style and technical rules

Block pages share `docs/blocks/_shared/`: `theme.css` (tokens, local fonts), `theme.js` (`THEME` for Canvas), `fonts/` (Space Grotesk 600/700, JetBrains Mono 400/700, SIL OFL), plus `engine.js` and `style.css` for the animation blocks.

Palette: `--bg #040604`, `--ink #e9f2e9`, `--muted #7e8b7f`, `--dim #4d594e` (never for small text), `--neon #39ff14`, `--link #22c55e`, `--gray #a3ada4`.

Colour roles:
- gray: raw sound, inputs, settings;
- green (`--link`): links and processing;
- neon: labels, answers, the selected or active item;
- text on a neon fill is always `--on-neon`.

Canvas code takes colours only from `THEME`; no hex or rgba outside `theme.css`.

Rule: no external libraries and no network; shared files only from `_shared/`.

Block navigation: `_shared/blocks.js` is the one list of blocks (`window.EXS_BLOCKS`: n, title, sub, href, ready, chip). The home page draws its cards from it, and `_shared/swipe.js` finds the neighbouring ready blocks in it. Every block page has `<body data-block="N">` and loads `blocks.js` and `swipe.js` (defer) at the end of the body; a new block needs its entry in `blocks.js` and these two lines. Gestures: a two-finger trackpad swipe (horizontal wheel, summed to 90 px, 800 ms lock for inertia) or two fingers on a touch screen (at least 70 px sideways, under 700 ms, not a pinch). Fingers moving left go to the next block, right to the previous one. The page slides 40 px and fades; at the first or last ready block it bounces and shows a toast. A hint toast appears on the first visit (localStorage). Links end with `index.html`, so it also works from `file://`.
