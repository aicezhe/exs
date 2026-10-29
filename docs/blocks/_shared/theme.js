/* THEME: the colours of theme.css for Canvas code, as strings and as "r,g,b" triples for rgba(...) with transparency.
   Load after theme.css. Canvas code takes every colour from here. */
window.THEME = (() => {
  const cs = getComputedStyle(document.documentElement), v = k => cs.getPropertyValue(k).trim();
  const triple = h => { h = h.replace("#", ""); const n = parseInt(h, 16); return [n >> 16 & 255, n >> 8 & 255, n & 255].join(","); };
  const T = {
    bg: v("--bg"), bgGlow: v("--bg-glow"), ink: v("--ink"), muted: v("--muted"), dim: v("--dim"),
    neon: v("--neon"), link: v("--link"), gray: v("--gray"),
    panel: v("--panel"), panelBorder: v("--panel-border"), codeBg: v("--code-bg"), codeInk: v("--code-ink"), onNeon: v("--on-neon"),
    mono: v("--mono"), head: v("--head"), body: v("--body")
  };
  T.rgb = {};
  ["bg", "bgGlow", "ink", "muted", "dim", "neon", "link", "gray", "codeInk"].forEach(k => { T.rgb[k] = triple(T[k]); });
  T.a = (name, alpha) => `rgba(${T.rgb[name]},${alpha})`;   // THEME.a("neon", .4) -> "rgba(57,255,20,.4)"
  T.fromRgb = (c, alpha) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${alpha})`; // [r,g,b] array + alpha
  return T;
})();
