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
