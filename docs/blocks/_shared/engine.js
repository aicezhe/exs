(() => {
// Which scenes this page plays (set by the page before this script): first and last scene index, and where "onward" leads.
const PAGE = Object.assign({ first: 0, last: 5 }, window.EXS_PAGE || {});
const BASE = document.currentScript.src.replace(/[^/]*$/, ""); // this folder, for the images
/* ---------- the word "telegram", recorded: tools/word_data.js (made by tools/make_tones.py) ---------- */
// When each sound happens in the 1-second recording, in seconds: start and end. Adjust by hand.
const TIMES = { t: [0.18, 0.25], a: [0.52, 0.66], m: [0.67, 0.80] };
const WORD_SLOW = 10;  // the 1 s word plays over 10 s on screen
const SLOWDOWN = 100;  // tone frequencies are shown 100 times lower: 200 Hz looks like 2 waves a second
/* ---------- 1. colour tokens, from THEME (theme.js) ---------- */
// roles: raw sound = gray (cyan, acc), processing = link green (proc), selected / answers = neon (sig)
let C = {};
function readTheme() {
  C = { bg: THEME.bg, surface: THEME.bgGlow, ink: THEME.ink, muted: THEME.muted, line: THEME.dim, acc: THEME.gray,
    sig: THEME.neon, cyan: THEME.gray, proc: THEME.link, lo: THEME.bgGlow, mid: THEME.neon, hi: THEME.ink };
  C.loRGB = hex(C.lo); C.midRGB = hex(C.mid); C.hiRGB = hex(C.hi);
}
function hex(h) { h = h.replace("#", ""); if (h.length === 3) h = h.split("").map(c => c + c).join(""); const n = parseInt(h, 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
function alpha(col, a) { return THEME.fromRgb(hex(col), a); }

/* ---------- text ---------- */
const TXT = {
  en: {
    title: "From voice to numbers",
    steps: [
      "Each sound is its own pressure wave",
      "The microphone turns pressure into a signal",
      "16,000 samples per second",
      "One second of sound is 16,000 numbers",
      "Cutting the second into frames",
      "Each frame → 13 MFCC numbers"
    ],
    L: { air:"air particles", inplace:"oscillates in place", pressure:"pressure", comp:"compression", rare:"rarefaction",
      info: { t:"t · plosive — the air is blocked, then released sharply", a:"a · vowel — vocal folds vibrate, mouth wide open", m:"m · nasal — mouth closed, sound goes through the nose" },
      cmp: { t:["burst", "plosive"], a:["repeating pattern", "vowel"], m:["soft hum", "nasal"] },
      say: { t:"T — a plosive: one short burst of air", a:"A — a vowel: the vocal folds repeat one pattern", m:"M — a nasal: a soft hum through the nose", pause:"pause", all:"three sounds — three different pressure waves", tap:"click the graph: t, a or m", play:"play" },
      simp2:"Slowed down; sizes are illustrative", acou:"acoustic · air pressure", elec:"electrical · voltage",
      sound:"sound →", plate:"backplate", form:"pressure → electrical signal",
      mic:"membrane", volt:"voltage", cont:"continuous signal", samp:"samples",
      sampN:"sample #", stime:"time:", sval:"value:", bit16:"(16-bit)", pick:"click a point", hover:"hover over the graph", nSamp:"samples", parts:"what the wave is made of",
      ms:"ms", sec:"s", onems:"1 ms = 16 samples", oneSec:"1 second = 16,000 numbers", frame:"frame", hann:"Hann window",
      raw:"raw", win:"windowed", mel:"32 mel bands", mf:"13 MFCC", mat:"99 × 13 matrix", frameCap:"One 20 ms frame: 320 numbers", low:"low", high:"high" }
  }
};
const lang = "en";

/* ---------- 2. signal: 1 s at 16 kHz — the recorded word, or a synthetic one if tools/word_data.js is missing ---------- */
// The recorded samples feed scenes 3–6 (samples, the whole second, frames, MFCC); scenes 1–2 use the same word's tones.
const REC = window.EXS_WORD && window.EXS_WORD.samples ? window.EXS_WORD : null;
const SR = 16000, N = 16000, HOP = 160, WIN = 320, NFFT = 512, NFR = 1 + Math.floor((N - WIN) / HOP); // 1 + (16000 − 320) // 160 = 99, as librosa with center=False
let seed = 12345;
const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const x = new Float32Array(N);
if (REC) { // base64 → int16 little-endian → -1..1, as the board stores them
  const b = atob(REC.samples);
  for (let n = 0; n < N; n++) { const v = b.charCodeAt(2 * n) | b.charCodeAt(2 * n + 1) << 8; x[n] = (v > 32767 ? v - 65536 : v) / 32768; }
}
else (function synth() { // synthetic word: vowel "e", vowel "a", fricative
  const g = (t, c, w) => Math.exp(-Math.pow((t - c) / w, 2));
  const F_E = [[480, 1], [1850, .7], [2600, .35]], F_A = [[760, 1], [1220, .8], [2500, .3]];
  const gain = (f, F) => F.reduce((s, [c, a]) => s + a * Math.exp(-Math.pow((f - c) / 140, 2)), 0) + 0.08;
  const fric = Array.from({ length: 40 }, () => [3500 + rnd() * 4000, rnd() * 6.283]);
  let ph = 0;
  for (let n = 0; n < N; n++) {
    const t = n / SR, f0 = 195 - 45 * t;
    ph += 2 * Math.PI * f0 / SR;
    const e1 = g(t, .30, .09), e2 = g(t, .58, .10), e3 = g(t, .80, .045);
    let v = 0;
    for (let h = 1; h <= 20; h++) {
      const f = h * f0; if (f > 4200) break;
      v += (e1 * gain(f, F_E) + e2 * gain(f, F_A)) * Math.sin(h * ph) / Math.sqrt(h);
    }
    let s = 0; for (const [f, p] of fric) s += Math.sin(2 * Math.PI * f * t + p);
    x[n] = v + e3 * s * 0.09 + (rnd() - .5) * 0.006;
  }
  let m = 0; for (let n = 0; n < N; n++) m = Math.max(m, Math.abs(x[n]));
  for (let n = 0; n < N; n++) x[n] *= 0.86 / m;
})();

/* ---------- 3. features: Hann window -> |FFT|^2 -> 32 mel bands -> dB -> DCT-II -> 13 MFCC ---------- */
const NMEL = 32, NMFCC = 13, NB = NFFT / 2 + 1;
const hann = new Float32Array(WIN).map((_, n) => 0.5 - 0.5 * Math.cos(2 * Math.PI * n / WIN));
const OFF = 0; // frame i starts at sample i · HOP (center=False); the 320 samples are zero-padded to the 512-point FFT
const melOf = f => 2595 * Math.log10(1 + f / 700), hzOf = m => 700 * (Math.pow(10, m / 2595) - 1);
const pts = Array.from({ length: NMEL + 2 }, (_, i) => hzOf(melOf(0) + (melOf(SR / 2) - melOf(0)) * i / (NMEL + 1)));
const fb = Array.from({ length: NMEL }, (_, b) => {
  const w = new Float32Array(NB), [lo, c, hi] = [pts[b], pts[b + 1], pts[b + 2]];
  for (let k = 0; k < NB; k++) { const f = k * SR / NFFT; w[k] = f > lo && f < hi ? (f <= c ? (f - lo) / (c - lo) : (hi - f) / (hi - c)) : 0; }
  return w;
});
const cosT = new Float32Array(NFFT), sinT = new Float32Array(NFFT);
for (let i = 0; i < NFFT; i++) { cosT[i] = Math.cos(2 * Math.PI * i / NFFT); sinT[i] = Math.sin(2 * Math.PI * i / NFFT); }
const MEL = [], MFCC = [];
for (let i = 0; i < NFR; i++) {
  const st = i * HOP + OFF, fr = new Float32Array(WIN);
  for (let n = 0; n < WIN; n++) fr[n] = x[st + n] * hann[n];
  const pw = new Float32Array(NB);
  for (let k = 0; k < NB; k++) {
    let re = 0, im = 0;
    for (let n = 0; n < WIN; n++) { const j = (k * n) % NFFT; re += fr[n] * cosT[j]; im -= fr[n] * sinT[j]; }
    pw[k] = re * re + im * im;
  }
  const mel = new Float32Array(NMEL);
  for (let b = 0; b < NMEL; b++) { let s = 0; for (let k = 0; k < NB; k++) s += fb[b][k] * pw[k]; mel[b] = 10 * Math.log10(s + 1e-10); }
  const c = new Float32Array(NMFCC);
  for (let m = 0; m < NMFCC; m++) {
    let s = 0; for (let b = 0; b < NMEL; b++) s += mel[b] * Math.cos(Math.PI * m * (b + .5) / NMEL);
    c[m] = s * Math.sqrt((m ? 2 : 1) / NMEL);
  }
  MEL.push(mel); MFCC.push(c);
}
let melMin = Infinity, melMax = -Infinity;
MEL.forEach(r => r.forEach(v => { melMin = Math.min(melMin, v); melMax = Math.max(melMax, v); }));
melMin = Math.max(melMin, melMax - 70);
const cMin = new Float32Array(NMFCC).fill(Infinity), cMax = new Float32Array(NMFCC).fill(-Infinity);
MFCC.forEach(r => r.forEach((v, m) => { cMin[m] = Math.min(cMin[m], v); cMax[m] = Math.max(cMax[m], v); }));
// min/max envelope cache for the 1-second overview
const envCache = new Map();
function envelope(px) {
  if (envCache.has(px)) return envCache.get(px);
  const lo = new Float32Array(px), hi = new Float32Array(px);
  for (let p = 0; p < px; p++) {
    const a = Math.floor(p * N / px), b = Math.floor((p + 1) * N / px); let mn = 0, mx = 0;
    for (let n = a; n < b; n++) { mn = Math.min(mn, x[n]); mx = Math.max(mx, x[n]); }
    lo[p] = mn; hi[p] = mx;
  }
  const r = { lo, hi }; envCache.set(px, r); return r;
}

/* ---------- 4. drawing helpers: canvas, text, line, arrow, glow, colour ramp ---------- */
// W x H is the scene area, between the step title on top (TOP px) and the bottom band (BAND px) with the buttons, footnote and progress line
const cv = document.getElementById("cv"), g = cv.getContext("2d");
let W = 0, H = 0, VH = 0, BAND = 0, TOP = 0, FS = 13;
function resize() {
  const w = cv.clientWidth, h = cv.clientHeight, d = window.devicePixelRatio || 1;
  cv.width = Math.round(w * d); cv.height = Math.round(h * d);
  g.setTransform(d, 0, 0, d, 0, 0);
  FS = Math.max(11, Math.min(15, w / 72)); BAND = Math.round(FS * 4.2);
  TOP = Math.round(Math.max(FS * 3, 40)); // room for the scene title row
  W = w; VH = h; H = Math.max(120, h - BAND - TOP);
}
// mono = numbers (JetBrains Mono), disp = key headings (Space Grotesk), default = labels (system font)
const font = (s, w, mono, disp) => disp ? `700 ${s}px ${THEME.head}`
  : `${mono && w > 400 ? 700 : w || 400} ${s}px ${mono ? THEME.mono : THEME.body}`;
function text(s, X, Y, o = {}) {
  g.font = font(o.size || FS, o.w, o.mono, o.disp); g.fillStyle = o.c || C.muted; g.textAlign = o.a || "left"; g.textBaseline = o.b || "alphabetic"; o.max ? g.fillText(s, X, Y, o.max) : g.fillText(s, X, Y);
}
function line(x1, y1, x2, y2, c, w = 1, dash) { g.beginPath(); g.setLineDash(dash || []); g.strokeStyle = c; g.lineWidth = w; g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke(); g.setLineDash([]); }
function rrect(X, Y, w, h, r) { g.beginPath(); g.moveTo(X + r, Y); g.arcTo(X + w, Y, X + w, Y + h, r); g.arcTo(X + w, Y + h, X, Y + h, r); g.arcTo(X, Y + h, X, Y, r); g.arcTo(X, Y, X + w, Y, r); g.closePath(); }
function arrow(x1, y1, x2, y2, c) {
  line(x1, y1, x2, y2, c, 1.6); const a = Math.atan2(y2 - y1, x2 - x1), s = 7;
  g.beginPath(); g.moveTo(x2, y2); g.lineTo(x2 - s * Math.cos(a - .45), y2 - s * Math.sin(a - .45)); g.lineTo(x2 - s * Math.cos(a + .45), y2 - s * Math.sin(a + .45)); g.closePath(); g.fillStyle = c; g.fill();
}
function glow(col, blur, draw) { g.shadowColor = col; g.shadowBlur = blur; draw(); g.shadowBlur = 0; g.shadowColor = "transparent"; }
function ramp(t) {
  t = Math.max(0, Math.min(1, t));
  const [a, b, k] = t < .5 ? [C.loRGB, C.midRGB, t * 2] : [C.midRGB, C.hiRGB, (t - .5) * 2];
  return THEME.fromRgb(a.map((v, i) => Math.round(v + (b[i] - v) * k)), 1);
}
const ease = t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const fmt = (v, d = 3) => (v < 0 ? "−" : " ") + Math.abs(v).toFixed(d);

// axis box with +1 / 0 / −1
function axes(X0, X1, Y0, Y1, labels = true) {
  const yc = (Y0 + Y1) / 2;
  [[Y0, "+1"], [yc, "0"], [Y1, "−1"]].forEach(([y, l]) => { line(X0, y, X1, y, C.line, 1, y === yc ? [] : [4, 5]); if (labels) text(l, X0 - 8, y, { a: "right", b: "middle", mono: true }); });
}
function overview(X0, X1, Y0, Y1) {
  const w = Math.max(1, Math.round(X1 - X0)), e = envelope(w), yc = (Y0 + Y1) / 2, A = (Y1 - Y0) / 2;
  g.fillStyle = alpha(C.cyan, .85);
  for (let p = 0; p < w; p++) { const a = yc - e.hi[p] * A, b = yc - e.lo[p] * A; g.fillRect(X0 + p, a, 1, Math.max(1, b - a)); }
}
function frameBox(X0, X1, Y0, Y1, i, prev) {
  const sx = s => X0 + (X1 - X0) * s / N, a = i * HOP + OFF;
  if (prev && i > 0) { const b = (i - 1) * HOP + OFF; g.setLineDash([4, 4]); g.strokeStyle = C.muted; g.lineWidth = 1.2; g.strokeRect(sx(b), Y0 - 4, Math.max(2, sx(b + WIN) - sx(b)), Y1 - Y0 + 8); g.setLineDash([]); }
  const w = Math.max(3, sx(a + WIN) - sx(a));
  g.fillStyle = alpha(C.sig, .22); g.fillRect(sx(a), Y0 - 4, w, Y1 - Y0 + 8);
  glow(C.sig, 14, () => { g.strokeStyle = C.sig; g.lineWidth = 1.6; g.strokeRect(sx(a), Y0 - 4, w, Y1 - Y0 + 8); });
  return [sx(a), sx(a) + w];
}

/* ---------- 5. scenes ---------- */
// Grabbing the playheads: each frame a scene registers the line (or frame box) that marks "now" on its graph:
// the hit rectangle (scene coordinates), the line's x, and how an x on that graph maps to the scene's time.
let SCRUBS = [], scrub = null; // scrub: the line being dragged
function addScrub(x0, x1, y0, y1, hx, toTime) { SCRUBS.push({ x0, x1, y0, y1, hx, toTime }); }
const easeInv = u => u < .5 ? Math.sqrt(u / 2) : 1 - Math.sqrt((1 - u) / 2); // the inverse of ease()
// scenes 5 and 6: the time at which frame box covers the samples under x on the overview (fr = the scene's sweep factor)
const frameTime = (X, X0, X1, fr, d) => { const i = clamp(Math.round(((X - X0) / (X1 - X0) * N - OFF - WIN / 2) / HOP), 0, NFR - 1); return (i + .5) / NFR / fr * d; };
const DUR = [0, 15, 8, 7, 9, 11]; // scene 1 is set from its timeline (below)

const KEYS = ["t", "a", "m"];

// pressure trace over [ta, tb] mapped to [X0, X1]
function trace(fn, ta, tb, X0, X1, yc, amp) {
  g.beginPath();
  for (let X = X0; X <= X1; X += 1.5) { const Y = yc - fn(ta + (tb - ta) * (X - X0) / (X1 - X0)) * amp; X === X0 ? g.moveTo(X, Y) : g.lineTo(X, Y); }
  glow(C.cyan, 11, () => { g.strokeStyle = C.acc; g.lineWidth = 2; g.stroke(); });
}

/* ---------- scene 1: "telegram" — the face, the air and the pressure ---------- */
// Timelines, as [sound ("" = silence), length, lit letter ("*" = all three)].
// Scene 1: each letter is lit first, then its sound plays three times; then the whole word, t · a · m in a row, next to
// the three waves side by side. The scene loops while the presenter talks.
const SEQ1 = [["", .6, ""]];
for (const [k, d, gap] of [["t", 1, .3], ["a", 1.2, .5], ["m", 1.2, .5]]) { SEQ1.push(["", .8, k]); for (let r = 0; r < 3; r++) SEQ1.push([k, d, k], ["", gap, k]); }
SEQ1.push(["", .4, "*"], ["t", 1, "*"], ["", .3, "*"], ["a", 1.2, "*"], ["", .3, "*"], ["m", 1.2, "*"], ["", .8, "*"]);
// Without tones_stft.json (it did not load) the scenes keep these synthetic timelines and formulas.
// Scene 2: t, a and m for 4 s each; a long "t" repeats its burst every T_BURST
const SEQ2 = [["", .6], ["t", 4], ["", .4], ["a", 4], ["", .4], ["m", 4], ["", .4]];
const T_BURST = 4 / 3;
// segments { k, s, d, prev, lit }: the sound, its start, its length, the sound before it and the lit letter
function timeline(seq) {
  const SEG = []; let s = 0, prev = "";
  for (const [k, d, lit = k] of seq) { SEG.push({ k, s, d, prev, lit }); s += d; if (k) prev = k; }
  return { SEG, END: s, at: t => { for (let i = SEG.length - 1; i >= 0; i--) if (t >= SEG[i].s) return SEG[i]; return SEG[0]; } };
}
let TL1, TL2, SEG1, SEQ1_END, ALL1; // set by setTimelines()
const segAt = t => TL1.at(t);
const zone1 = k => { const z = SEG1.filter(sg => sg.lit === k); return [z[0].s, z[z.length - 1].s + z[z.length - 1].d]; }; // a letter's stretch
// With the recording: a short lead-in, then the word itself, slowed down; t, a and m are its stretches from TIMES
const LEAD = .6, CMP1 = 4.5; // CMP1: how long scene 1 shows the three waves side by side at the end
function wordSeq() {
  const out = [["", LEAD, ""]]; let at = 0;
  for (const k of KEYS) { const [a, b] = TIMES[k]; if (a > at) out.push(["", (a - at) * WORD_SLOW, ""]); out.push([k, (b - a) * WORD_SLOW, k]); at = b; }
  out.push(["", (1 - at) * WORD_SLOW + .4, ""]);
  return out;
}
const segFace = s => (s.k === "t" ? "t" : s.k === "a" ? "a" : "m"); // the face frame of a segment: a pause is the closed mouth

// Each sound's parameters, shared by scenes 1 and 2: amplitude A, angular frequency w (slowed down, illustrative) and its
// waveform mix [t, a, m]. The wave number is k = w / v, so it follows w.
const SOUNDS = { t: { A: 1.5, w: 2 * Math.PI * 7, mix: [1, 0, 0] }, a: { A: .8, w: 2 * Math.PI * 2.4, mix: [0, 1, 0] }, m: { A: .5, w: 2 * Math.PI * 1.1, mix: [0, 0, 1] } };
const TRANS = .4; // A, w (and so k) and the waveform mix move to a new sound's values over this long (ease-in-out)

// A small value-noise table: the "noisy" part of the burst.
const VN = new Float32Array(256);
{ let s = 99; for (let i = 0; i < 256; i++) { s = (s * 16807) % 2147483647; VN[i] = s / 2147483647 * 2 - 1; } }
function vnoise(x) { const i = Math.floor(x), f = x - i, a = VN[i & 255], b = VN[(i + 1) & 255], u = f * f * (3 - 2 * f); return a + (b - a) * u; }

// The recorded word: up to 5 tones per STFT frame (Hann window of win samples, hop samples apart).
// signal(tReal) = Σ over the frames j covering tReal of w(tReal − tj) · Σ a·cos(2π·f·k·(tReal − tj) + phase),
// w = the Hann window; two frames overlap at any moment and their windows add up to 1. k = 1 is the real sound with the
// measured phases. On screen k = SCREEN_K (frequencies / SLOWDOWN while time runs WORD_SLOW times slower), and each tone's
// phase is carried on from the matching tone of the frame before, so the slowed-down wave stays smooth.
let WORD = null, NORM = 1; // WORD: { sr, win, hop, frames: [[f, a, phase, screen phase], ...] }; NORM: the screen peak → 1
const SCREEN_K = WORD_SLOW / SLOWDOWN;
function signal(tReal, k = 1) {
  if (!WORD || !(tReal >= 0 && tReal < 1)) return 0;
  const { sr, win, hop, frames } = WORD, W0 = win / sr, H0 = hop / sr;
  let v = 0;
  for (let j = Math.max(0, Math.floor((tReal - W0) / H0) + 1), j1 = Math.min(frames.length - 1, Math.floor(tReal / H0)); j <= j1; j++) {
    const x = tReal - j * H0; if (x >= W0) continue;
    const w = .5 - .5 * Math.cos(2 * Math.PI * x / W0);
    for (const [f, a, p, ps] of frames[j]) v += w * a * Math.cos(2 * Math.PI * f * k * x + (k === 1 ? p : ps));
  }
  return v;
}
const wordScreen = t => NORM * signal(t / WORD_SLOW, SCREEN_K); // t: screen seconds from the word's start
function useTones(d) {
  const H0 = d.hop / d.sr; let prev = [];
  const frames = d.frames.map(fr => {
    const cur = fr.map(([f, a, p]) => {
      let best = null; // the tone of the frame before closest in frequency (within 12 %): this tone continues it
      for (const q of prev) if (Math.abs(q[0] - f) < f * .12 && (!best || Math.abs(q[0] - f) < Math.abs(best[0] - f))) best = q;
      return [f, a, p, best ? best[3] + Math.PI * (best[0] + f) * SCREEN_K * H0 : p];
    });
    prev = cur; return cur;
  });
  WORD = { sr: d.sr, win: d.win, hop: d.hop, frames };
  let m = 0; for (let i = 0; i < 4000; i++) m = Math.max(m, Math.abs(signal(i / 4000, SCREEN_K)));
  NORM = m ? 1 / m : 1;
  setTimelines();
  if (step < 2) { local = 0; man = { k: "", t: .3 }; } // start the word from the beginning
}

// The source signal at the mouth, sampled at SR1 for a whole timeline, built once per scene: the travelling wave in the air,
// the arcs and the pressure trace all read this one table, so they always agree. Also the source point (frame coordinates).
const SR1 = 240, N1 = Math.ceil(30 * SR1);
const MOUTH = { t: [451, 443], a: [446, 457], m: [457, 428] };
function buildSource(tl, sig) { // sig: the recorded word for scene time t (null: the synthetic formulas)
  const SRC = new Float32Array(N1), SX = new Float32Array(N1), SY = new Float32Array(N1);
  let ph = 0, A = 0, w = SOUNDS.t.w, m0 = 0, m1 = 0, m2 = 0, px = MOUTH.m[0], py = MOUTH.m[1];
  let seg = null, from = null;
  for (let i = 0; i < N1; i++) {
    const t = i / SR1, s = tl.at(t);
    if (s !== seg) { seg = s; from = { A, w, m0, m1, m2, px, py }; }
    const tt = t - s.s, f = ease(clamp(tt / TRANS, 0, 1)), q = s.k ? SOUNDS[s.k] : null;
    // targets: a pause keeps the frequency and the waveform, its amplitude goes to 0
    const tw = q ? q.w : from.w, tm = q ? q.mix : [from.m0, from.m1, from.m2];
    const fm = s.k === "t" ? 1 : f; // a burst takes its shape at once, so the first one is as sharp as the rest
    w = from.w + (tw - from.w) * fm;
    m0 = from.m0 + (tm[0] - from.m0) * fm; m1 = from.m1 + (tm[1] - from.m1) * fm; m2 = from.m2 + (tm[2] - from.m2) * fm;
    if (s.k === "t") { const tb = tt % T_BURST; A = (1 - Math.exp(-tb / .03)) * Math.exp(-tb * 7) * SOUNDS.t.A; } // each burst: a fast rise, then exp(-t·7)
    else A = from.A + ((q ? q.A : 0) - from.A) * f;
    if (t >= tl.END) A *= Math.max(0, 1 - (t - tl.END) / .4);
    // the source: the mouth for every sound, so all the arcs look alike; it glides between the frames' mouth points
    const sp = s.k ? MOUTH[s.k] : [from.px, from.py];
    px = from.px + (sp[0] - from.px) * f; py = from.py + (sp[1] - from.py) * f;
    ph += w / SR1;
    const shT = (.5 * Math.sin(ph) + .3 * Math.sin(1.63 * ph + 1.1) + .25 * Math.sin(2.41 * ph + 2.3) + .35 * vnoise(ph * 1.9)) / 1.1; // noisy
    const shA = (Math.sin(ph) + .45 * Math.sin(2 * ph + .5) + .25 * Math.sin(3 * ph + 1.1)) / 1.45; // 2nd and 3rd harmonics
    const shM = Math.sin(ph); // almost a pure sine
    SRC[i] = sig ? sig(t) : A * (m0 * shT + m1 * shA + m2 * shM);
    SX[i] = px; SY[i] = py;
  }
  return { s: SRC, x: SX, y: SY };
}
let S1, S2;
function tab(a, t) { const f = t * SR1; if (f <= 0) return a[0]; if (f >= N1 - 1) return a[N1 - 1]; const i = f | 0, k = f - i; return a[i] * (1 - k) + a[i + 1] * k; }
const src1 = t => (t < 0 ? 0 : tab(S1.s, t)), src2 = t => (t < 0 ? 0 : tab(S2.s, t));
// both scenes' timelines and source tables: the recorded word if it has loaded, the synthetic sounds otherwise
function setTimelines() {
  TL1 = timeline(WORD ? [...wordSeq(), ["", CMP1, "*"]] : SEQ1); TL2 = timeline(WORD ? wordSeq() : SEQ2);
  SEG1 = TL1.SEG; SEQ1_END = TL1.END; ALL1 = SEG1.find(sg => sg.lit === "*").s; DUR[0] = SEQ1_END;
  if (WORD) DUR[1] = TL2.END + 1.5; // room for the wave to reach the membrane
  const sig = WORD ? t => wordScreen(t - LEAD) : null;
  S1 = buildSource(TL1, sig); S2 = buildSource(TL2, sig);
}
setTimelines();
// the tones come with data/word_data.js (applied once the player is set up, at the end of the file); without it data/tones_stft.js is the fallback

// "what the wave is made of": the current frame's tones as thin lines over the summed wave (toReal: graph time → word time)
let showTones = false;
const TONE_COL = () => [C.sig, C.proc, C.cyan, C.ink, alpha(C.sig, .55)];
function drawTones(map, te, toReal, yc, amp, x0, x1, top) {
  if (!WORD || !showTones) return;
  const tr = toReal(te); if (!(tr >= 0 && tr < 1)) return;
  const H0 = WORD.hop / WORD.sr, j = clamp(Math.floor(tr / H0), 0, WORD.frames.length - 1), tj = j * H0, cols = TONE_COL();
  const xe = map(te), xs = Math.max(x0, xe - (x1 - x0) * .18); // the last stretch of the trace
  WORD.frames[j].forEach(([f, a, , ps], i) => {
    g.beginPath();
    for (let X = xs; X <= xe; X += 1.5) {
      const tau = te - (xe - X) / (xe - map(te - 1)) * 1, Y = yc - NORM * a * Math.cos(2 * Math.PI * f * SCREEN_K * (toReal(tau) - tj) + ps) * amp;
      X === xs ? g.moveTo(X, Y) : g.lineTo(X, Y);
    }
    g.strokeStyle = cols[i]; g.lineWidth = 1.2; g.stroke();
    text(Math.round(f) + " Hz", x1 - 4, top + FS * (1.1 + i * 1.15), { a: "right", mono: true, size: FS * .8, c: cols[i] }); // the legend
  });
}

// Neon profile frames, drawn additively; 535 × 640 each.
// The frames are artwork drawn in pink (assets/*_pink.png). Temporary recolour to the neon green: hue-rotate (a canvas filter) on an off-screen copy made once;
// where canvas filters are missing (older Safari) the copy is a plain neon silhouette of the same alpha.
const FACE = {}; // FACE[k] = { el: the recoloured canvas, ok }
function neonFace(img) {
  const c = document.createElement("canvas"); c.width = img.naturalWidth; c.height = img.naturalHeight;
  const x = c.getContext("2d");
  if ("filter" in x) { x.filter = "hue-rotate(141deg) saturate(1.3)"; x.drawImage(img, 0, 0); x.filter = "none"; }
  else { x.drawImage(img, 0, 0); x.globalCompositeOperation = "source-in"; x.fillStyle = THEME.neon; x.fillRect(0, 0, c.width, c.height); }
  return c;
}
if (PAGE.first === 0) ["m", "t", "a"].forEach(k => {
  const i = new Image(), f = FACE[k] = { el: null, ok: false };
  i.onload = () => { f.el = neonFace(i); f.ok = true; };
  i.src = BASE + "assets/face_" + k + "_pink.png"; // the pink artwork
});

/* ---- the air: Poisson-disc points, each with its own phase, size and slow wander ---- */
const PMAX = 2000;
const P = { n: 0, x0: new Float32Array(PMAX), y0: new Float32Array(PMAX), ph: new Float32Array(PMAX), sz: new Float32Array(PMAX),
  n1: new Float32Array(PMAX), n2: new Float32Array(PMAX), n3: new Float32Array(PMAX), n4: new Float32Array(PMAX),
  x: new Float32Array(PMAX), y: new Float32Array(PMAX), d: new Float32Array(PMAX), dens: new Float32Array(PMAX), lv: new Uint8Array(PMAX) };
const ACTIVE = new Int32Array(PMAX);
const PKEY = new Float64Array(4).fill(-1); let PR = 10, PHI = 0, PMEM = new Int32Array(0), PMEMN = 0;
let GRID = new Int32Array(0);
// density grid (refreshed at most 20 times a second)
let DCS = 20, DGW = 1, DGH = 1, DCNT = new Float32Array(1), DSM = new Float32Array(1), dAt = -1;
let prs = 1;
function prand() { prs = (prs * 16807) % 2147483647; return prs / 2147483647; }

// Bridson's Poisson-disc sampling in [x0, x0+w] × [y0, y0+h] with a minimum distance r; returns the count.
function poisson(x0, y0, w, h, r) {
  const cs = r / Math.SQRT2, gw = Math.ceil(w / cs), gh = Math.ceil(h / cs);
  if (GRID.length < gw * gh) GRID = new Int32Array(gw * gh);
  GRID.fill(-1, 0, gw * gh);
  let n = 0, na = 0;
  const add = (px, py) => { P.x0[n] = px; P.y0[n] = py; GRID[((py - y0) / cs | 0) * gw + ((px - x0) / cs | 0)] = n; ACTIVE[na++] = n; n++; };
  add(x0 + prand() * w, y0 + prand() * h);
  while (na > 0 && n < PMAX) {
    const ai = (prand() * na) | 0, i = ACTIVE[ai];
    let found = false;
    for (let k = 0; k < 24 && !found; k++) {
      const a = prand() * 6.2832, d = r * (1 + prand()), px = P.x0[i] + Math.cos(a) * d, py = P.y0[i] + Math.sin(a) * d;
      if (px < x0 || px >= x0 + w || py < y0 || py >= y0 + h) continue;
      const gx = (px - x0) / cs | 0, gy = (py - y0) / cs | 0;
      let ok = true;
      for (let yy = Math.max(0, gy - 2); yy <= Math.min(gh - 1, gy + 2) && ok; yy++) for (let xx = Math.max(0, gx - 2); xx <= Math.min(gw - 1, gx + 2); xx++) {
        const j = GRID[yy * gw + xx];
        if (j >= 0) { const ddx = P.x0[j] - px, ddy = P.y0[j] - py; if (ddx * ddx + ddy * ddy < r * r) { ok = false; break; } }
      }
      if (ok) { add(px, py); found = true; }
    }
    if (!found) ACTIVE[ai] = ACTIVE[--na];
  }
  return n;
}
// The particles for a field rectangle: 600–900 points (the minimum distance adjusted until the count fits), made once per size.
function makeParticles(sx, ex, y0, y1) {
  const a = Math.round(sx), b = Math.round(ex), c = Math.round(y0), d = Math.round(y1);
  if (PKEY[0] === a && PKEY[1] === b && PKEY[2] === c && PKEY[3] === d) return; // generated once, again only after a resize
  PKEY[0] = a; PKEY[1] = b; PKEY[2] = c; PKEY[3] = d;
  const w = ex - sx, h = y1 - y0, target = 760;
  let r = Math.sqrt(w * h / (target * 1.45)), n = 0;
  for (let it = 0; it < 6; it++) {
    prs = 7;
    n = poisson(sx, y0, w, h, r);
    if (n >= 600 && n <= 900) break;
    r *= Math.sqrt(n / target);
  }
  P.n = Math.min(n, 900); PR = r;
  for (let i = 0; i < P.n; i++) {
    P.ph[i] = (prand() - .5) * .06; // a small time offset: each point's own phase
    P.sz[i] = 1 + prand() * 1.5; // 1–2.5 px
    P.n1[i] = prand() * 6.2832; P.n2[i] = prand() * 6.2832; P.n3[i] = prand() * 6.2832; P.n4[i] = prand() * 6.2832;
    P.dens[i] = 1;
  }
  // the highlighted point: about a third of the way across, in the middle
  let best = 1e9; const hx = sx + w * .32, hy = (y0 + y1) / 2;
  for (let i = 0; i < P.n; i++) { const d = (P.x0[i] - hx) ** 2 + (P.y0[i] - hy) ** 2; if (d < best) { best = d; PHI = i; } }
  // the points in the window next to the membrane (the right edge): their mean displacement is the pressure trace
  if (PMEM.length < P.n) PMEM = new Int32Array(P.n);
  PMEMN = 0; for (let i = 0; i < P.n; i++) if (P.x0[i] > ex - r * 1.6) PMEM[PMEMN++] = i;
  // the density grid
  DCS = r * 2.4; DGW = Math.max(1, Math.ceil(w / DCS) + 2); DGH = Math.max(1, Math.ceil(h / DCS) + 2);
  DCNT = new Float32Array(DGW * DGH); DSM = new Float32Array(DGW * DGH); dAt = -1;
}
// Local density: count the points per cell, smooth over 3 × 3, each point's value relative to the mean.
function density(sx, y0) {
  DCNT.fill(0);
  for (let i = 0; i < P.n; i++) {
    const cx = clamp(((P.x[i] - sx) / DCS | 0) + 1, 0, DGW - 1), cy = clamp(((P.y[i] - y0) / DCS | 0) + 1, 0, DGH - 1);
    DCNT[cy * DGW + cx]++;
  }
  let sum = 0, cells = 0;
  for (let y = 1; y < DGH - 1; y++) for (let x = 1; x < DGW - 1; x++) {
    let s = 0; for (let yy = -1; yy <= 1; yy++) for (let xx = -1; xx <= 1; xx++) s += DCNT[(y + yy) * DGW + x + xx] * (xx || yy ? .7 : 1);
    DSM[y * DGW + x] = s; sum += s; cells++;
  }
  const mean = sum / Math.max(1, cells) || 1;
  for (let i = 0; i < P.n; i++) {
    const cx = clamp(((P.x[i] - sx) / DCS | 0) + 1, 1, DGW - 2), cy = clamp(((P.y[i] - y0) / DCS | 0) + 1, 1, DGH - 2);
    const r = DSM[cy * DGW + cx] / mean;
    P.dens[i] = r; P.lv[i] = clamp(Math.round((r - .55) / .22), 0, 4); // 5 levels of brightness and size
  }
}
// The air, shared by scenes 1 and 2: x = x0 + noise_x(t) + the wave's displacement at the point's distance from the source,
// y = y0 + noise_y(t). plane: the wave comes straight from the left (distance = x − ox) instead of from the point (ox, oy).
function airStep(src, t, ox, oy, v, amp, sx, y0, plane) {
  const nowW = wall;
  for (let i = 0; i < P.n; i++) {
    const r = plane ? P.x0[i] - ox : Math.hypot(P.x0[i] - ox, P.y0[i] - oy);
    const nx = 1.3 * Math.sin(nowW * .73 + P.n1[i]) + .9 * Math.sin(nowW * 1.37 + P.n2[i]) + .4 * Math.sin(nowW * 2.9 + P.n3[i]);
    const ny = 1.2 * Math.sin(nowW * .61 + P.n3[i]) + .8 * Math.sin(nowW * 1.53 + P.n4[i]) + .4 * Math.sin(nowW * 3.1 + P.n1[i]);
    const d = amp * src(t - r / v + P.ph[i]);
    P.d[i] = d + nx; P.x[i] = P.x0[i] + nx + d; P.y[i] = P.y0[i] + ny;
  }
  if (nowW - dAt >= .05 || dAt < 0) { density(sx, y0); dAt = nowW; } // at most 20 times a second
}
// one path per brightness level: brighter and larger where the points crowd; skip = a point drawn separately (-1: none)
function airDraw(skip) {
  for (let lv = 0; lv < 5; lv++) {
    g.beginPath();
    for (let i = 0; i < P.n; i++) {
      if (P.lv[i] !== lv || i === skip) continue;
      const rr = P.sz[i] * LV_SIZE[lv];
      g.moveTo(P.x[i] + rr, P.y[i]); g.arc(P.x[i], P.y[i], rr, 0, 6.2832);
    }
    g.fillStyle = alpha(C.ink, LV_ALPHA[lv]); g.fill();
  }
}
// the mean displacement of the points in the narrow band just before the membrane, in units of amp
function membraneMean(amp) { let s = 0; for (let j = 0; j < PMEMN; j++) s += P.d[PMEM[j]]; return PMEMN ? s / PMEMN / amp : 0; }
// The pressure at the membrane, sampled 60 times a second of scene time: [time, value] in a ring (34 s).
const PRN = 2048, PRT = new Float32Array(PRN), PRV = new Float32Array(PRN);
let prHead = 0, prCount = 0, prLast = -1;
function recordPressure(t, v) {
  if (t < prLast) { prCount = 0; prHead = 0; } // the scene started again
  if (prCount && t - prLast < 1 / 60) return; // 60 samples a second of scene time, whatever the frame rate
  prLast = t; PRT[prHead] = t; PRV[prHead] = v; prHead = (prHead + 1) % PRN; prCount = Math.min(PRN, prCount + 1);
}
const LV_ALPHA = [.22, .36, .55, .78, 1], LV_SIZE = [.7, .85, 1, 1.18, 1.35];
let COL1 = null; // the sounds' colours (t neon, a white, m green), made once from the theme
const SND_COL = () => COL1 || (COL1 = { t: C.sig, a: C.ink, m: C.proc });

// the word TELEGRAM: the lit letter white with a glow and a short bar under it, the others dimmed; one short line under it
const WORD1 = ["T", "E", "L", "E", "G", "R", "A", "M"];
function wordRow1(lit, caption) {
  const size = FS * 2.2, y = FS * 2.8;
  g.font = font(size, 400, false, true);
  // each letter at its own width with the same gap between all of them (no fixed cells), the whole word centred
  const ws = WORD1.map(ch => g.measureText(ch).width), gap = size * .14, total = ws.reduce((s, w) => s + w, 0) + gap * (WORD1.length - 1);
  let X = W / 2 - total / 2;
  WORD1.forEach((ch, k) => {
    const key = k === 0 ? "t" : k === 6 ? "a" : k === 7 ? "m" : "", on = key && (lit === "*" || lit === key), cx = X + ws[k] / 2;
    if (on) glow(C.ink, 22, () => { text(ch, cx, y, { a: "center", disp: true, size, c: C.ink }); g.fillStyle = C.ink; g.fillRect(cx - ws[k] * .35, y + size * .22, ws[k] * .7, 3); });
    else text(ch, cx, y, { a: "center", disp: true, size, c: alpha(C.ink, .4) });
    X += ws[k] + gap;
  });
  text(caption, W / 2, y + FS * 2.1, { a: "center", c: C.muted, size: FS * 1.05, max: W - 2 * Math.max(16, W * .04) });
}

function sceneAir(p) {
  const L = TXT[lang].L, pad = Math.max(16, W * .04), t = manual ? man.t : p * DUR[0], seg = segAt(t), col = SND_COL();
  const comparing = t >= ALL1;
  // layout: the word on top, the face at the left (whole, not stretched), the air to its right, the pressure under it
  const notesTop = H - FS * .8, top = FS * 6;
  // the face leaves room under the air for a readable pressure graph (about 15 % of the height)
  const fh = Math.max(80, Math.min(notesTop - FS * 1.9 - top, W * .3 * 640 / 535, (notesTop - top - FS * 3.8 - H * .15) / .9)), s = fh / 640, fw = 535 * s, fx = pad, fy = top;
  const gap = Math.max(28, W * .03), sx = fx + fw + gap, ex = W - pad - 16;
  const cy = fy + 443 * s, bandH = Math.min(H * .27, fh * .42), y0 = cy - bandH / 2, y1 = cy + bandH / 2;
  makeParticles(sx, ex, y0, y1);

  // the word and its one-line caption
  wordRow1(seg.lit, seg.lit === "*" ? L.say.all : seg.lit ? L.say[seg.lit] : manual ? L.say.tap : "");

  // the face: this segment's frame, cross-faded from the previous one over 0.18 s, drawn with "lighter"
  const cur = segFace(seg), prevSeg = SEG1[Math.max(0, SEG1.indexOf(seg) - 1)], prev = seg === SEG1[0] ? cur : segFace(prevSeg);
  const fade = clamp((t - seg.s) / .18, 0, 1);
  g.save(); g.globalCompositeOperation = "lighter";
  if (prev !== cur && fade < 1 && FACE[prev].ok) { g.globalAlpha = 1 - fade; g.drawImage(FACE[prev].el, fx, fy, fw, fh); }
  if (FACE[cur].ok) { g.globalAlpha = prev !== cur ? fade : 1; g.drawImage(FACE[cur].el, fx, fy, fw, fh); }
  g.restore();

  // the wave: from the source point (mouth or nose), the same signal everywhere, delayed by distance / v
  const ox = fx + tab(S1.x, t) * s, oy = fy + tab(S1.y, t) * s, v = (ex - ox) / 1.5, amp = Math.min(PR * 1.05, 14);
  // arcs: the wavefronts between the source and the first particles, where the pressure is high
  const reach = Math.hypot(sx - ox, (y0 + y1) / 2 - oy) + PR * 1.5, dir = Math.atan2((y0 + y1) / 2 - oy, sx - ox), arcCol = C.ink; // white arcs for every sound
  g.save(); g.lineCap = "round"; g.strokeStyle = arcCol; g.shadowColor = arcCol; g.shadowBlur = 10;
  for (let r = 10, last = -1; r <= reach; r += 2) {
    const a = src1(t - r / v), b = src1(t - (r + 2) / v);
    if (a > .05 && a >= last && a >= b) { // a crest
      g.globalAlpha = clamp(.25 + a * 1.6, 0, 1) * (1 - .35 * r / reach); g.lineWidth = 1.5 + 1.8 * clamp(a, 0, 1);
      g.beginPath(); g.arc(ox, oy, r, dir - .55, dir + .55); g.stroke();
    }
    last = a;
  }
  g.restore();

  // particles: the shared air, the wave spreading from the source point
  airStep(src1, t, ox, oy, v, amp, sx, y0, false);
  airDraw(PHI);
  // one point marked: it only oscillates in place
  const hx0 = P.x0[PHI], hy0 = P.y0[PHI], br = amp + 3;
  line(hx0 - br, hy0 - 12, hx0 + br, hy0 - 12, C.sig, 1.5); line(hx0 - br, hy0 - 16, hx0 - br, hy0 - 8, C.sig, 1.5); line(hx0 + br, hy0 - 16, hx0 + br, hy0 - 8, C.sig, 1.5);
  glow(C.sig, 14, () => { g.beginPath(); g.arc(P.x[PHI], P.y[PHI], 4.5, 0, 7); g.fillStyle = C.sig; g.fill(); });
  // labels above the air, never on it: "air particles" at the left, "oscillates in place" over the marked point, the membrane at the right
  const ly = y0 - FS * .9;
  text(L.air, sx, ly);
  g.font = font(FS, 400); const aw = g.measureText(L.air).width;
  g.font = font(FS, 600); const iw = g.measureText(L.inplace).width;
  text(L.inplace, Math.max(hx0, sx + aw + 18 + iw / 2), ly, { a: "center", c: C.sig, w: 600 });
  line(Math.max(hx0, sx + aw + 18 + iw / 2), ly + 4, hx0, hy0 - 17, alpha(C.sig, .5), 1, [2, 3]);

  // the membrane at the right edge: it bends with the pressure of the points next to it
  let pm = membraneMean(amp);
  pm += .04 * vnoise(wall * 3.3); // a little noise, as a real sensor
  if (playing || prCount === 0) recordPressure(t, pm);
  const mx = ex + 10;
  g.beginPath(); g.moveTo(mx, y0); g.quadraticCurveTo(mx + clamp(pm, -1.2, 1.2) * 9, cy, mx, y1);
  glow(C.sig, 10, () => { g.strokeStyle = C.sig; g.lineWidth = 2.5; g.stroke(); });
  text(L.mic, mx, ly, { a: "right", c: C.sig });

  // the pressure: t · a · m spans the width and draws left to right at a steady pace, in step with the face
  // and the word; each sound has a fixed zone with its letter over the middle
  const room = notesTop - y1 - FS * 2.6, SA = clamp(room / 2 - 4, 16, H * .1), Yc = y1 + FS * 1.2 + SA + 4;
  const delay = 0;
  // the comparison fades in with the whole word and out just before the loop starts again
  const cmp = ease(clamp((t - ALL1) / .8, 0, 1)) * clamp((SEQ1_END - t) / .6, 0, 1);
  if (t < ALL1) {
    g.globalAlpha = 1 - ease(clamp((t - ALL1 + .8) / .8, 0, 1));
    const zone = zone1;
    const ta = WORD ? LEAD : zone("t")[0], span = WORD ? WORD_SLOW : zone("m")[1] - ta; // the whole word, or t … m
    const map = tau => sx + (ex - sx) * (tau - ta) / span, te = clamp(t, ta, ta + span);
    addScrub(sx, ex, Yc - SA - 4, Yc + SA + 4, map(te), X => ta + (X - sx) / (ex - sx) * span);
    for (const k of KEYS) {
      const [s0, s1] = zone(k), on = seg.lit === k;
      g.fillStyle = alpha(col[k], on ? .1 : .04); g.fillRect(map(s0), Yc - SA - 4, map(s1) - map(s0), SA * 2 + 8);
      line(map(s0), Yc - SA - 4, map(s0), Yc + SA + 4, C.line, 1, [3, 4]); line(map(s1), Yc - SA - 4, map(s1), Yc + SA + 4, C.line, 1, [3, 4]);
      // the sound's name inside the segment, top left; the sounding one in its colour, glowing
      g.font = `700 14px ${THEME.head}`; g.textAlign = "left"; g.textBaseline = "top";
      if (on) glow(col[k], 10, () => { g.fillStyle = col[k]; g.fillText(k, map(s0) + 8, Yc - SA - 4 + 8); });
      else { g.fillStyle = SEG_LABEL; g.fillText(k, map(s0) + 8, Yc - SA - 4 + 8); }
      g.textBaseline = "alphabetic";
      if (g.globalAlpha > .5) segRect(k, map(s0), TOP + Yc - SA - 4, map(s1) - map(s0), SA * 2 + 8); // its button for clicks and the keyboard
    }
    line(sx, Yc, ex, Yc, C.line, 1);
    const g0 = manual ? (man.k ? zone1(man.k)[0] : te) : ta; // where the trace starts
    if (te > g0) trace(src1, g0, te, map(g0), map(te), Yc, SA);
    drawTones(map, te, tau => (tau - LEAD) / WORD_SLOW, Yc, SA, sx, ex, Yc - SA);
    if (t >= ta && te > g0) glow(C.sig, 8, () => { g.beginPath(); g.arc(map(te), Yc - clamp(src1(te - delay), -1.3, 1.3) * SA, 4, 0, 7); g.fillStyle = C.sig; g.fill(); });
    text(L.pressure, sx, Yc + SA + FS * 1.4);
    g.globalAlpha = 1;
  }
  // at the end: the three sounds side by side (the same source signal)
  if (cmp > 0) {
    g.globalAlpha = cmp;
    const gp = 16, pw = (ex - sx - 2 * gp) / 3, ptop = y1 + FS * 2.2, ph = Yc + SA + 4 - ptop; // room for the titles above the panels
    // drawn from scene 2's steady 4 s sounds (the same SOUNDS): one burst, 2.2 s of a and of m
    // recorded word: its t, a and m stretches, each scaled to its own peak to compare shapes; synthetic: scene 2's steady sounds
    const wins = WORD ? KEYS.map(k => zone1(k)) : KEYS.map(k => TL2.SEG.find(sg => sg.k === k)).map(sg => sg.k === "t" ? [sg.s, sg.s + 1.3] : [sg.s + .6, sg.s + 2.8]);
    wins.forEach(([a, b], j) => {
      const X = sx + j * (pw + gp);
      rrect(X, ptop, pw, ph, 10); g.fillStyle = C.surface; g.fill(); g.strokeStyle = C.line; g.lineWidth = 1; g.stroke();
      let pk = 1; if (WORD) { pk = 0; for (let q = a; q <= b; q += .01) pk = Math.max(pk, Math.abs(src1(q))); pk = pk || 1; }
      trace(WORD ? q => src1(q) / pk : src2, a, b, X + 10, X + pw - 10, ptop + ph / 2, ph * .4);
      text(KEYS[j], X, ptop - 8, { disp: true, size: FS * 1.4, c: col[KEYS[j]] });
      g.font = font(FS * 1.4, 400, false, true); const kw = g.measureText(KEYS[j] + " ").width;
      text("· " + L.cmp[KEYS[j]][0], X + kw, ptop - 8, { c: C.ink, w: 600, max: pw - kw });
    });
    g.globalAlpha = 1;
  }
  // which sound is on screen, for a test or a screen reader's log (only when it changes)
  const now = comparing ? "all" : seg.k || "pause";
  if (cv.dataset.sound !== now) cv.dataset.sound = now;
}

/* ---------- scene 2: the microphone — the same air, the membrane follows it, the voltage follows the membrane ---------- */
// the membrane's displacement, one point per frame: [scene time, value] in a ring
const VRN = 4096, VRT = new Float32Array(VRN), VRV = new Float32Array(VRN);
let vrHead = 0, vrCount = 0, vrLast = -1;
function recordVolt(t, v) {
  if (t < vrLast) { vrHead = 0; vrCount = 0; } // the scene started again
  vrLast = t; VRT[vrHead] = t; VRV[vrHead] = v; vrHead = (vrHead + 1) % VRN; vrCount = Math.min(VRN, vrCount + 1);
}

function sceneMic(p) {
  const L = TXT[lang].L, pad = Math.max(16, W * .04), t = p * DUR[1], col = SND_COL();
  // one horizontal axis for all three parts: the air at the left, the microphone in the middle, the graph at the right
  const yc = H * .45, bandH = Math.min(H * .3, W * .2), y0 = yc - bandH / 2, y1 = yc + bandH / 2;
  const Xm = W * .4, gap0 = Math.max(12, W * .014), Xp = Xm + gap0, sx = pad, ex = Xm - Math.max(10, W * .01);
  const hx0 = Xm - W * .022, hx1 = Xp + W * .03, hy0 = y0 - H * .06, hy1 = y1 + H * .06; // the microphone's frame
  // two domains: acoustic (air and membrane) at the left, electrical (from the gap on) at the right; the gap is the boundary
  const XB = (Xm + Xp) / 2, zt = hy0 - FS * 2.6, zb = hy1 + FS * 1.2, XE = W - pad;
  g.fillStyle = alpha(C.ink, .025); g.fillRect(sx - 8, zt, XB - sx + 8, zb - zt);
  g.fillStyle = alpha(C.sig, .04); g.fillRect(XB, zt, XE - XB, zb - zt);
  line(XB, zt - FS * 1.6, XB, zb, alpha(C.ink, .45), 1, [4, 4]);
  line(sx - 8, zt, XB - 6, zt, alpha(C.ink, .45), 1.5); line(XB + 6, zt, XE, zt, C.sig, 1.5);
  text(L.acou, sx - 8, zt - FS * .6, { c: C.muted, w: 600, size: FS * .9 });
  text(L.elec, XB + 10, zt - FS * .6, { c: C.sig, w: 600, size: FS * .9 });
  makeParticles(sx, ex, y0, y1);

  // the air: the same points and motion as scene 1, a plane wave coming in from the left at the same speed
  const v = W * .42, amp = Math.min(PR * 1.05, 14), delay = (ex - sx) / v; // delay: how long the wave takes to reach the membrane
  airStep(src2, t, sx, yc, v, amp, sx, y0, true);
  airDraw(-1);
  text(L.sound, sx, hy0 - 10, { c: C.ink, w: 600 });

  // the membrane: its bend = the mean displacement of the points just before it × a coefficient (+ = toward the backplate)
  const pm = membraneMean(amp), K_MEM = gap0 * .55, bend = clamp(pm, -1.3, 1.3) * K_MEM;
  g.strokeStyle = alpha(C.ink, .7); g.lineWidth = 1.5; g.beginPath(); // the frame, open at the left where the sound comes in
  g.moveTo(hx0, y0 - 6); g.lineTo(hx0, hy0); g.lineTo(hx1, hy0); g.lineTo(hx1, hy1); g.lineTo(hx0, hy1); g.lineTo(hx0, y1 + 6); g.stroke();
  // the gap between membrane and backplate: a little brighter as they come closer
  const close = clamp(bend / K_MEM, 0, 1);
  g.beginPath(); g.moveTo(Xm, y0); g.quadraticCurveTo(Xm + 2 * bend, yc, Xm, y1); g.lineTo(Xp, y1); g.lineTo(Xp, y0); g.closePath();
  g.fillStyle = alpha(C.sig, .05 + .3 * close); g.fill();
  const n = 10, sh = (y1 - y0) / n; // the backplate, with holes
  g.fillStyle = C.ink; for (let i = 0; i < n; i++) g.fillRect(Xp, y0 + i * sh, 6, sh * .62);
  g.beginPath(); g.moveTo(Xm, y0); g.quadraticCurveTo(Xm + 2 * bend, yc, Xm, y1);
  glow(C.sig, 12, () => { g.strokeStyle = C.sig; g.lineWidth = 3; g.stroke(); });
  const gy = hy1 + 12; // the gap's size: a thin dimension line, no text
  line(Xm, gy, Xp, gy, C.muted, 1); line(Xm, gy - 4, Xm, gy + 4, C.muted, 1); line(Xp, gy - 4, Xp, gy + 4, C.muted, 1);
  text(L.mic, Xm - 4, hy0 - 10, { a: "right", c: C.sig, w: 600 });
  text(L.plate, Xp + 4, hy0 - 10, { c: C.ink, w: 600 });

  // voltage: one point per frame = the membrane's displacement (plus a very small noise), drawn left to right
  const X0 = W * .56, X1 = W - pad, A2 = bandH * .55, ta = (WORD ? LEAD : TL2.SEG[1].s) + delay, tb = (WORD ? LEAD + WORD_SLOW : TL2.END) + delay;
  const map = tau => X0 + (X1 - X0) * (tau - ta) / (tb - ta);
  addScrub(X0, X1, yc - A2 - 6, yc + A2 + 6, map(clamp(t, ta, tb)), X => ta + (X - X0) / (X1 - X0) * (tb - ta));
  if (Math.abs(t - vrLast) > .25) { vrHead = 0; vrCount = 0; vrLast = -1; } // a jump (seeking): start the graph again
  if (vrCount === 0 && t > .05) for (let tau = 0; tau < t; tau += 1 / 60) recordVolt(tau, src2(tau - delay)); // after a jump or opened paused: fill in up to now
  if (playing && t > vrLast) recordVolt(t, pm + .015 * vnoise(wall * 5.1));
  arrow(hx1 + 6, yc, X0 - 10, yc, C.sig); // the wire: electrical
  line(X0, yc, X1, yc, C.line, 1); line(X0, yc - A2 - 6, X0, yc + A2 + 6, C.line, 1);
  text(L.volt, X0, hy0 - 10, { c: C.ink, w: 600 });
  // one zone per sound, as in scene 1: a light tint, dashed borders, the letter over the middle (lit while it reaches the membrane)
  const here = TL2.at(t - delay).k;
  for (const sg of TL2.SEG) if (sg.k) {
    const s0 = map(sg.s + delay), s1 = map(sg.s + delay + sg.d), on = sg.k === here;
    g.fillStyle = alpha(col[sg.k], on ? .1 : .04); g.fillRect(s0, yc - A2 - 4, s1 - s0, A2 * 2 + 8);
    line(s0, yc - A2 - 4, s0, yc + A2 + 4, C.line, 1, [3, 4]); line(s1, yc - A2 - 4, s1, yc + A2 + 4, C.line, 1, [3, 4]);
    (on ? f => glow(C.ink, 10, f) : f => f())(() => text(sg.k, (s0 + s1) / 2, yc - A2 - 10, { a: "center", disp: true, size: FS * 1.4, c: on ? C.ink : C.muted }));
  }
  // the trace: one white line, as in scene 1
  let started = false, lx = 0, ly = 0;
  g.beginPath();
  for (let j = 0; j < vrCount; j++) {
    const at = (vrHead - vrCount + j + VRN) % VRN, tau = VRT[at];
    if (tau < ta || tau > tb) continue;
    lx = map(tau); ly = yc - clamp(VRV[at], -1.3, 1.3) * A2;
    started ? g.lineTo(lx, ly) : g.moveTo(lx, ly); started = true;
  }
  if (started) {
    glow(C.cyan, 11, () => { g.strokeStyle = C.acc; g.lineWidth = 2; g.stroke(); });
    glow(C.sig, 8, () => { g.beginPath(); g.arc(lx, ly, 4, 0, 7); g.fillStyle = C.sig; g.fill(); });
  }
  drawTones(map, clamp(t, ta, tb), tau => (tau - delay - LEAD) / WORD_SLOW, yc, A2, X0, X1, yc - A2);

  text(L.form, W / 2, hy1 + FS * 3.4, { a: "center", c: C.ink, w: 600 });
  const now = here || "pause";
  if (cv.dataset.sound !== now) cv.dataset.sound = now;
}

function sceneSamples(p, T) {
  const L = TXT[lang].L, pad = W * .04;
  const start = REC ? 8640 : 4960, K = 160; // 10 ms inside a vowel: the "a" of the recording (0.54 s), or the synthetic "e"
  const X0 = pad + W * .05, X1 = W - pad, Y0 = H * .14, Y1 = H * .72, yc = (Y0 + Y1) / 2, A = (Y1 - Y0) / 2;
  axes(X0, X1, Y0, Y1);
  const sxp = k => X0 + (X1 - X0) * k / (K - 1), syp = v => yc - v * A;
  g.beginPath(); for (let k = 0; k < K; k++) { const X = sxp(k), Y = syp(x[start + k]); k ? g.lineTo(X, Y) : g.moveTo(X, Y); }
  g.strokeStyle = alpha(C.muted, .55); g.lineWidth = 1.5; g.stroke();
  const kk = Math.min(K - 1, Math.floor(ease(clamp(p * 1.15, 0, 1)) * (K - 1)));
  if (sel !== null && (playing || sel > kk)) sel = null; // the selection lives only while paused, on a drawn sample
  SAMP = { X0, X1, Y0, Y1, K, kk }; // for clicks
  g.globalAlpha = sel === null ? 1 : .4; // with a selection the other samples dim to 40 %
  for (let k = 0; k <= kk; k++) line(sxp(k), yc, sxp(k), syp(x[start + k]), alpha(C.sig, .55), 1);
  glow(C.sig, 8, () => {
    g.fillStyle = C.sig; g.beginPath();
    for (let k = 0; k <= kk; k++) { const X = sxp(k), Y = syp(x[start + k]); g.moveTo(X + 2.6, Y); g.arc(X, Y, 2.6, 0, 7); }
    g.fill();
  });
  const Xc = sxp(kk), Yc = syp(x[start + kk]);
  addScrub(X0, X1, Y0 - 6, Y1 + 6, Xc, X => easeInv(clamp((Math.round((X - X0) / (X1 - X0) * (K - 1)) + .5) / (K - 1), 0, 1)) / 1.15 * DUR[2]);
  line(Xc, Y0 - 6, Xc, Y1 + 6, C.sig, 1.2, [3, 4]);
  g.beginPath(); g.arc(Xc, Yc, 5.5, 0, 7); g.strokeStyle = C.sig; g.lineWidth = 2; g.stroke();
  g.globalAlpha = 1;
  if (sel !== null) { // the selected sample: a thicker stem, a larger white point with a neon ring, and its card
    const sx = sxp(sel), v = x[start + sel], sy = syp(v);
    glow(C.sig, 10, () => line(sx, yc, sx, sy, C.sig, 3));
    g.beginPath(); g.arc(sx, sy, 6.5, 0, 7); g.fillStyle = C.ink; g.fill(); g.strokeStyle = C.sig; g.lineWidth = 2.5; g.stroke();
    sampleCard(L, sel, v, sx, sy);
  }
  // time axis: 0..10 ms
  const ty = Y1 + FS * 2;
  for (let ms = 0; ms <= 10; ms += 2) { const X = X0 + (X1 - X0) * ms / 10 * (K / (K - 1)); if (X <= X1 + 1) text(ms + " " + L.ms, X, ty, { a: "center", mono: true }); }
  text(L.cont, X1, Y0 - 12, { a: "right" }); text("● " + L.samp, X1 - 4, Y0 - 12 - FS * 1.5, { a: "right", c: C.sig, w: 600 });
  if (!playing && sel === null) text(L.pick, (X0 + X1) / 2, Y1 + FS * 5.4, { a: "center", c: C.muted }); // the hint, only while paused
}
// Scene 3's sample view (paused only): sel = the selected sample in the 10 ms window (from 0), SAMP = the graph's geometry.
let sel = null, SAMP = null;
// the card: sample number, its time (1 sample = 0.0625 ms) and its value both as a fraction of ±1 and as the board's 16-bit integer
// avoid (optional): a circle {cx, cy, r} the card must not cover — the scene 4 loupe
function sampleCard(L, n, v, px, py, avoid) {
  const pad = 10, lh = FS * 1.55, mono = font(FS, 400, true), int16 = clamp(Math.round(v * 32768), -32768, 32767);
  const rows = [
    [[L.sampN + n, C.ink, font(FS, 600)]],
    [[L.stime + " ", C.muted, mono], [(n / 16).toFixed(3), C.sig, mono], [" " + L.ms, C.muted, mono]],
    [[L.sval + " ", C.muted, mono], [(v < 0 ? "−" : "+") + Math.abs(v).toFixed(3), C.sig, mono], ["  =  ", C.muted, mono], [String(int16), C.sig, mono], [" " + L.bit16, C.muted, mono]]
  ];
  const width = r => r.reduce((s, [t, , f]) => { g.font = f; return s + g.measureText(t).width; }, 0);
  const w = Math.max(...rows.map(width)) + pad * 2, h = rows.length * lh + pad * 1.4;
  let X, Y;
  const fits = (a, b) => a >= 8 && a + w <= W - 8 && b >= 4 && b + h <= H - 4;
  if (avoid) { // beside the loupe: right, left, above or below it, the first that fits in the window
    const { cx, cy, r } = avoid, gap = 12;
    const spots = [[cx + r + gap, cy - h / 2], [cx - r - gap - w, cy - h / 2], [cx - w / 2, cy - r - gap - h], [cx - w / 2, cy + r + gap]];
    const spot = spots.find(([a, b]) => fits(a, b));
    if (spot) [X, Y] = spot; else { X = 16; Y = H - h - 8; }
  }
  else if (W < 640) { X = 16; Y = H - h - 8; } // narrow screens: fixed at the bottom
  else {
    X = px + 16; Y = py - h - 16; // above and to the right of the point; flipped where it would leave the window
    if (X + w > W - 8) X = px - 16 - w;
    if (Y < 4) Y = py + 16;
    X = clamp(X, 8, W - w - 8); Y = clamp(Y, 4, H - h - 4);
  }
  rrect(X, Y, w, h, 8); g.fillStyle = C.surface; g.fill(); g.strokeStyle = C.line; g.lineWidth = 1; g.stroke();
  rows.forEach((r, i) => { let cx = X + pad; for (const [t, c, f] of r) { g.font = f; g.fillStyle = c; g.textAlign = "left"; g.textBaseline = "alphabetic"; g.fillText(t, cx, Y + pad + FS + i * lh); cx += g.measureText(t).width; } });
}
// the sample under a pointer: nearest by x (within half a step), only over the graph; null elsewhere
function sampleAt(e) {
  if (!SAMP) return null;
  const r = cv.getBoundingClientRect(), X = e.clientX - r.left, Y = e.clientY - r.top - TOP, step1 = (SAMP.X1 - SAMP.X0) / (SAMP.K - 1);
  if (Y < SAMP.Y0 - 12 || Y > SAMP.Y1 + 12 || X < SAMP.X0 - step1 / 2 || X > SAMP.X1 + step1 / 2) return null;
  const k = Math.round((X - SAMP.X0) / step1);
  return k >= 0 && k <= SAMP.kk ? k : null;
}

function sceneSecond(p, T) {
  const L = TXT[lang].L, pad = W * .04;
  const X0 = pad + W * .05, X1 = W - pad, Y0 = H * .12, Y1 = H * .58;
  axes(X0, X1, Y0, Y1); overview(X0, X1, Y0, Y1);
  for (let s = 0; s <= 4; s++) { const X = X0 + (X1 - X0) * s / 4; line(X, Y1, X, Y1 + 5, C.muted, 1); text((s / 4).toFixed(2) + " " + L.sec, X, Y1 + FS * 1.8, { a: s === 0 ? "left" : s === 4 ? "right" : "center", mono: true }); }
  const n = Math.min(N - 1, Math.floor(ease(clamp(p * 1.1, 0, 1)) * (N - 1)));
  const Xc = X0 + (X1 - X0) * n / (N - 1);
  SEC = { X0, X1, Y0, Y1, Xc }; // for the pointer: the loupe
  addScrub(X0, X1, Y0 - 6, Y1 + 6, Xc, X => clamp(easeInv(clamp((X - X0) / (X1 - X0), 0, 1)) / 1.1, 0, 1) * DUR[3]);
  glow(C.sig, 8, () => line(Xc, Y0 - 6, Xc, Y1 + 6, C.sig, scrub ? 2.5 : 1.5));
  // number tape in the bottom-right corner, level with the play / pause button and ending just before it;
  // as many cells (odd, up to 5) as fit between it and the "1 second" caption in the bottom-left corner
  g.font = font(FS, 600); const capW = g.measureText(L.oneSec).width;
  const ty = VH - INSET - BTN / 2 - TOP, cell = Math.max(52, W / 11), tx1 = W - INSET - 40 - 16;
  let cnt = clamp(Math.floor((tx1 - (INSET + capW + 24)) / cell), 1, 5); if (cnt % 2 === 0) cnt--;
  const mid = Math.floor(cnt / 2), tx0 = tx1 - cnt * cell;
  line(Xc, Y1 + 6, tx0 + mid * cell + cell / 2, ty - FS * 1.3, alpha(C.sig, .6), 1, [3, 4]);
  for (let i = 0; i < cnt; i++) {
    const k = n - mid + i; if (k < 0 || k >= N) continue;
    const X = tx0 + i * cell, on = i === mid;
    rrect(X + 2, ty - FS * 1.3, cell - 4, FS * 2.4, 6);
    g.fillStyle = on ? alpha(C.sig, .16) : C.surface; g.fill();
    g.strokeStyle = on ? C.sig : C.line; g.lineWidth = on ? 1.5 : 1; g.stroke();
    text(fmt(x[k]).trim(), X + cell / 2, ty + 1, { a: "center", b: "middle", mono: true, c: on ? C.ink : C.muted, size: FS * .9, w: on ? 600 : 400 });
  }
  // the loupe (paused only): fades in over the graph and out in 0.2 s when the pointer leaves it
  const dt = Math.min(.1, wall - LP.lw); LP.lw = wall;
  LP.a = playing ? 0 : clamp(LP.a + (LP.over ? 1 : -1) * dt / .2, 0, 1);
  if (LP.a > 0) loupe(L, X0, X1, Y0, Y1);
  else if (!playing) text(L.hover, (X0 + X1) / 2, Y1 + FS * 3.6, { a: "center", c: C.muted });
}
// Scene 4's loupe: LP = pointer position (scene coordinates), whether it is over the graph, the fade, the window (samples)
const LP = { x: 0, y: 0, over: false, a: 0, lw: 0, span: 32 };
let SEC = null;
function loupe(L, X0, X1, Y0, Y1) {
  const R = (W < 640 ? 180 : 220) / 2, c = clamp(Math.round((LP.x - X0) / (X1 - X0) * (N - 1)), 0, N - 1); // c: the sample under the crosshair
  const half = LP.span / 2, a0 = c - half, a1 = c + half;
  // on the big graph: a thin light frame around the part shown in the loupe
  g.globalAlpha = LP.a;
  const fx0 = X0 + (X1 - X0) * a0 / (N - 1), fx1 = X0 + (X1 - X0) * a1 / (N - 1);
  g.strokeStyle = alpha(C.ink, .7); g.lineWidth = 1; g.strokeRect(fx0 - 1, Y0 - 4, Math.max(2, fx1 - fx0 + 2), Y1 - Y0 + 8);
  // the circle next to the pointer, kept inside the scene
  let cx = LP.x + R + 18, cy = LP.y - R - 18;
  if (cx + R > W - 8) cx = LP.x - R - 18;
  if (cy - R < 4) cy = LP.y + R + 18;
  cx = clamp(cx, R + 8, W - R - 8); cy = clamp(cy, R + 4, H - R - 4);
  g.save(); g.beginPath(); g.arc(cx, cy, R, 0, 7); g.fillStyle = C.bg; g.fill(); g.clip();
  const ix0 = cx - R * .82, ix1 = cx + R * .82, A = R * .62, sx = k => ix0 + (ix1 - ix0) * (k - a0) / (a1 - a0), sy = v => cy - v * A;
  line(cx - R, cy, cx + R, cy, C.line, 1); // zero
  const k0 = Math.max(0, Math.ceil(a0 - 1)), k1 = Math.min(N - 1, Math.floor(a1 + 1)), dr = clamp(R * 2.2 / LP.span, 1.6, 4);
  g.beginPath(); for (let k = k0; k <= k1; k++) { const X = sx(k), Y = sy(x[k]); k === k0 ? g.moveTo(X, Y) : g.lineTo(X, Y); }
  g.strokeStyle = alpha(C.muted, .55); g.lineWidth = 1; g.stroke(); // thin line between the samples
  for (let k = k0; k <= k1; k++) line(sx(k), cy, sx(k), sy(x[k]), alpha(C.sig, .55), 1); // stems to zero, as on slide 3
  glow(C.sig, 6, () => { g.fillStyle = C.sig; g.beginPath(); for (let k = k0; k <= k1; k++) { const X = sx(k), Y = sy(x[k]); g.moveTo(X + dr, Y); g.arc(X, Y, dr, 0, 7); } g.fill(); });
  line(cx, cy - R, cx, cy + R, alpha(C.ink, .5), 1); // the crosshair, with the nearest sample on it
  g.beginPath(); g.arc(sx(c), sy(x[c]), dr + 3, 0, 7); g.fillStyle = C.ink; g.fill(); g.strokeStyle = C.sig; g.lineWidth = 2; g.stroke();
  const ns = Math.round(LP.span), ms = ns / 16; // the window, in whole samples
  text(ns + " " + L.nSamp + " · " + (+ms.toFixed(2)) + " " + L.ms, cx, cy + R * .74, { a: "center", c: C.muted, size: FS * .8 }); // high enough to fit inside the circle
  g.restore();
  g.beginPath(); g.arc(cx, cy, R, 0, 7); glow(C.sig, 12, () => { g.strokeStyle = C.sig; g.lineWidth = 1.5; g.stroke(); });
  sampleCard(L, c, x[c], cx, cy, { cx, cy, r: R + 4 }); // the card beside the loupe (never over it), as on slide 3
  g.globalAlpha = 1;
}

function sceneFrames(p, T) {
  const L = TXT[lang].L, pad = W * .04;
  const X0 = pad + W * .05, X1 = W - pad, Y0 = H * .09, Y1 = H * .38;
  axes(X0, X1, Y0, Y1, false); overview(X0, X1, Y0, Y1);
  const i = Math.min(NFR - 1, Math.floor(clamp(p * 1.08, 0, 1) * NFR));
  const [fa, fb2] = frameBox(X0, X1, Y0, Y1, i, true);
  addScrub(X0, X1, Y0 - 6, Y1 + 6, (fa + fb2) / 2, X => frameTime(X, X0, X1, 1.08, DUR[4]));
  // zoom panel
  const Z0 = H * .52, Z1 = H * .88, zc = (Z0 + Z1) / 2, ZA = (Z1 - Z0) / 2;
  g.beginPath(); g.moveTo(fa, Y1 + 4); g.lineTo(X0, Z0 - 10); g.moveTo(fb2, Y1 + 4); g.lineTo(X1, Z0 - 10); g.strokeStyle = alpha(C.sig, .45); g.lineWidth = 1; g.setLineDash([3, 4]); g.stroke(); g.setLineDash([]);
  axes(X0, X1, Z0, Z1, false);
  const st = i * HOP + OFF, zx = k => X0 + (X1 - X0) * k / (WIN - 1);
  let peak = 0; for (let k = 0; k < WIN; k++) peak = Math.max(peak, Math.abs(x[st + k]));
  const sc = .9 / Math.max(.05, peak);
  g.beginPath(); for (let k = 0; k < WIN; k++) { const Y = zc - x[st + k] * sc * ZA; k ? g.lineTo(zx(k), Y) : g.moveTo(zx(k), Y); }
  g.strokeStyle = alpha(C.cyan, .6); g.lineWidth = 1.2; g.stroke();
  g.beginPath(); for (let k = 0; k < WIN; k++) { const Y = zc - x[st + k] * hann[k] * sc * ZA; k ? g.lineTo(zx(k), Y) : g.moveTo(zx(k), Y); }
  glow(C.proc, 11, () => { g.strokeStyle = C.proc; g.lineWidth = 2; g.stroke(); });
  g.beginPath(); for (let k = 0; k < WIN; k++) { const Y = Z1 - hann[k] * (Z1 - Z0); k ? g.lineTo(zx(k), Y) : g.moveTo(zx(k), Y); }
  g.strokeStyle = C.sig; g.lineWidth = 1.2; g.setLineDash([5, 4]); g.stroke(); g.setLineDash([]);
  const capA = clamp(1 - (p - .22) / .1, 0, 1); // the opening caption: it stays for the first part of the scene, then fades
  if (capA > 0) {
    g.font = font(FS * 1.15, 600); const cw = g.measureText(L.frameCap).width + 24, cy = (Y1 + Z0) / 2;
    g.globalAlpha = capA; rrect(W / 2 - cw / 2, cy - FS * 1.1, cw, FS * 2.2, 8); g.fillStyle = C.bg; g.fill(); g.strokeStyle = C.line; g.lineWidth = 1; g.stroke();
    text(L.frameCap, W / 2, cy, { a: "center", b: "middle", c: C.ink, w: 600, size: FS * 1.15 }); g.globalAlpha = 1;
  }
  text("— " + L.raw, X0 + 4, Z0 - 14, { c: C.cyan });
  text("— " + L.win, X0 + 4 + W * .16, Z0 - 14, { c: C.proc, w: 600 });
  text("- - " + L.hann, X0 + 4 + W * .34, Z0 - 14, { c: C.sig, w: 600 });
  text(L.frame + " " + (i + 1) + " / " + NFR, X1, Z0 - 14, { a: "right", c: C.ink, w: 600, mono: true });
}

function sceneMFCC(p, T) {
  const L = TXT[lang].L, pad = W * .04;
  const X0 = pad, X1 = W - pad, Y0 = H * .07, Y1 = H * .22;
  overview(X0, X1, Y0, Y1);
  const i = Math.min(NFR - 1, Math.floor(clamp(p * 1.06, 0, 1) * NFR));
  const [fa6, fb6] = frameBox(X0, X1, Y0, Y1, i, false);
  addScrub(X0, X1, Y0 - 6, Y1 + 6, (fa6 + fb6) / 2, X => frameTime(X, X0, X1, 1.06, DUR[5]));
  const P0 = H * .36, P1 = H * .86, narrow = W < 640;
  // mel bars
  const mA = X0, mB = X0 + (X1 - X0) * (narrow ? .38 : .34), bw = (mB - mA) / NMEL;
  line(mA, P1, mB, P1, C.line, 1);
  for (let b = 0; b < NMEL; b++) {
    const v = clamp((MEL[i][b] - melMin) / (melMax - melMin), 0, 1), h = v * (P1 - P0);
    g.fillStyle = alpha(C.proc, .35 + .6 * v); g.fillRect(mA + b * bw + 1, P1 - h, Math.max(1, bw - 2), h);
  }
  text(L.mel, mA, P0 - 12, { c: C.ink, w: 600 });
  text(L.low, mA, P1 + FS * 1.6); text(L.high, mB, P1 + FS * 1.6, { a: "right" });
  // 13 vector
  const vA = mB + (X1 - X0) * .06, vw = Math.max(18, (X1 - X0) * .04), ch = (P1 - P0) / NMFCC;
  arrow(mB + 6, (P0 + P1) / 2, vA - 8, (P0 + P1) / 2, C.muted);
  for (let m = 0; m < NMFCC; m++) {
    const t = (MFCC[i][m] - cMin[m]) / (cMax[m] - cMin[m] || 1);
    g.fillStyle = ramp(t); g.fillRect(vA, P0 + m * ch, vw, ch - 1);
  }
  glow(C.sig, 14, () => { g.strokeStyle = C.sig; g.lineWidth = 1.6; g.strokeRect(vA - .5, P0 - .5, vw + 1, P1 - P0 + 1); });
  text(L.mf, vA + vw / 2, P0 - 12, { a: "center", c: C.ink, w: 600 });
  // matrix
  const hA = vA + vw + (X1 - X0) * .06, hB = X1, cw = (hB - hA) / NFR;
  addScrub(hA, hB, P0, P1, hA + (i + .5) * cw, X => (clamp(Math.floor((X - hA) / cw), 0, NFR - 1) + .5) / NFR / 1.06 * DUR[5]);
  arrow(vA + vw + 6, (P0 + P1) / 2, hA - 8, (P0 + P1) / 2, C.muted);
  g.fillStyle = C.surface; g.fillRect(hA, P0, hB - hA, P1 - P0);
  for (let j = 0; j <= i; j++) for (let m = 0; m < NMFCC; m++) {
    const t = (MFCC[j][m] - cMin[m]) / (cMax[m] - cMin[m] || 1);
    g.fillStyle = ramp(t); g.fillRect(hA + j * cw, P0 + m * ch, cw + .6, ch - 1);
  }
  glow(C.sig, 14, () => { g.strokeStyle = C.sig; g.lineWidth = 1.6; g.strokeRect(hA + i * cw - .5, P0 - .5, Math.max(2, cw) + 1, P1 - P0 + 1); });
  text(L.mat, hA, P0 - 12, { c: C.ink, w: 600 });
  text(L.frame + " →", hB, P1 + FS * 1.6, { a: "right" });
}

const SCENES = [sceneAir, sceneMic, sceneSamples, sceneSecond, sceneFrames, sceneMFCC];

/* ---------- 6. player loop and keyboard ---------- */
const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
let step = 0, local = 0, playing = !reduce, speed = 1, last = performance.now(), clock = 0;
let wall = 0; // real time, running even while paused: the air's small random wander never stops
step = PAGE.first;
if (reduce) local = DUR[step] * .9;

function go(i) { if (i < PAGE.first || i > PAGE.last) return; sel = null; step = i; local = !playing && reduce ? DUR[step] * .9 : 0; syncNav(); }

// on-screen buttons: previous / play-pause / next
// bottom right: the mode switch on page 1, play / pause on the other pages (Space works everywhere)
const playBtn = document.getElementById("play");
const PICON = {
  pause: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5v14M15 5v14"/></svg>',
  play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5l11 7-11 7z"/></svg>'
};
function syncPlay() { playBtn.innerHTML = PICON[playing ? "pause" : "play"]; const l = playing ? "Pause" : "Play"; playBtn.setAttribute("aria-label", l); playBtn.title = l; }
const tonesBtn = document.getElementById("tones");
tonesBtn.addEventListener("click", () => { showTones = !showTones; tonesBtn.setAttribute("aria-pressed", String(showTones)); });
function togglePlay() { playing = !playing; if (playing && local >= DUR[step]) local = 0; syncPlay(); }
playBtn.addEventListener("click", togglePlay);
syncPlay();
document.getElementById("prev").addEventListener("click", () => go(step - 1));
document.getElementById("next").addEventListener("click", () => go(step + 1));

// scene 1 modes: auto plays the timeline in a loop; manual waits for a click on T, A or M and plays that letter's stretch once
let manual = false, man = { k: "", t: .3 }; // man.t: scene 1 time in manual mode (.3 = the silent lead-in)
try { manual = localStorage.getItem("exs-v2n-mode") === "manual"; } catch (e) {}
const modeBtn = document.getElementById("mode");
const ICON = {
  auto: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 11a8 8 0 0 0-14.3-4.9L4 8M4 3v5h5M4 13a8 8 0 0 0 14.3 4.9L20 16M20 21v-5h-5"/></svg>',
  manual: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3l13 7-5.5 1.8L11 17.5z"/><path d="M13.5 11.8L18 20"/></svg>'
};
function syncMode() {
  const l = manual ? "Manual: click T, A or M" : "Auto";
  modeBtn.innerHTML = ICON[manual ? "manual" : "auto"]; modeBtn.setAttribute("aria-label", l); modeBtn.title = l;
  modeBtn.setAttribute("aria-pressed", String(manual));
}
modeBtn.addEventListener("click", () => {
  manual = !manual; man = { k: "", t: .3 }; local = 0;
  try { localStorage.setItem("exs-v2n-mode", manual ? "manual" : "auto"); } catch (e) {}
  syncMode();
});
syncMode();
function playLetter(k) { if (step === 0 && manual) man = { k, t: zone1(k)[0] }; }
// a graph segment: manual mode plays its sound; auto mode jumps the loop to it
function playSeg(k) { if (step !== 0) return; if (manual) man = { k, t: zone1(k)[0] }; else local = zone1(k)[0]; }
const SEG_LABEL = THEME.muted; // segment names at rest
let segOn = false; // set by scene 1 each frame while its graph can be clicked
const SEGBTN = {};
KEYS.forEach(k => {
  const b = document.createElement("button");
  b.type = "button"; b.className = "seg"; b.hidden = true;
  b.addEventListener("pointerdown", e => { e.preventDefault(); if (!startScrub(e)) playSeg(k); });
  b.addEventListener("pointermove", e => { b.style.cursor = scrub || scrubAt(e) ? "ew-resize" : ""; });
  b.addEventListener("click", e => { if (e.detail === 0) playSeg(k); }); // Enter / Space on the focused button
  document.body.appendChild(b); SEGBTN[k] = b;
});
function segRect(k, x, y, w, h) {
  const r = cv.getBoundingClientRect(); x += r.left; y += r.top; // the canvas sits under the page header
  const b = SEGBTN[k], v = `${Math.round(x)}px,${Math.round(y)}px,${Math.round(w)}px,${Math.round(h)}px`;
  if (b.dataset.r !== v) { b.dataset.r = v; Object.assign(b.style, { left: Math.round(x) + "px", top: Math.round(y) + "px", width: Math.round(w) + "px", height: Math.round(h) + "px" }); }
  b.setAttribute("aria-label", TXT[lang].L.say.play + " " + k);
  segOn = true;
}
// the progress line at the bottom: click or drag on it to move through the current page's time
const SEEK_H = 14; let seeking = false, barHover = false; // SEEK_H: its hit area, taller than the 3 px line
const onBar = e => e.clientY - cv.getBoundingClientRect().top >= VH - SEEK_H;
function seekTo(e) {
  const f = clamp((e.clientX - cv.getBoundingClientRect().left) / W, 0, 1), t = Math.min(f * DUR[step], DUR[step] - .001);
  if (step === 0 && manual) man = { k: segAt(t).lit, t }; // manual mode: play on from there to the end of that letter's part
  else local = t;
}
cv.addEventListener("pointerdown", e => { if (!onBar(e)) return; seeking = true; cv.setPointerCapture(e.pointerId); seekTo(e); });
// grabbing a playhead (before the scenes' own clicks, which skip while one is held)
function scrubAt(e) {
  const r = cv.getBoundingClientRect(), X = e.clientX - r.left, Y = e.clientY - r.top - TOP;
  return SCRUBS.find(s => X >= s.x0 - 14 && X <= s.x1 + 14 && Y >= s.y0 && Y <= s.y1 && Math.abs(X - s.hx) < 14) || null;
}
function scrubTo(e) {
  const t = clamp(scrub.toTime(clamp(e.clientX - cv.getBoundingClientRect().left, scrub.x0, scrub.x1)), 0, DUR[step] - .001);
  if (step === 0 && manual) man = { k: segAt(t).lit, t }; else local = t;
}
function startScrub(e) { const s = !onBar(e) && scrubAt(e); if (!s) return false; scrub = s; scrubTo(e); e.preventDefault(); return true; }
cv.addEventListener("pointerdown", startScrub);
window.addEventListener("pointermove", e => { if (scrub) scrubTo(e); });
window.addEventListener("pointerup", () => { scrub = null; }); window.addEventListener("pointercancel", () => { scrub = null; });
cv.addEventListener("pointerdown", e => { if (step === 2 && !playing && !onBar(e) && !scrub) sel = sampleAt(e); }); // scene 3, paused: pick a sample (empty space clears)
// scene 4, paused: the loupe follows the pointer over the graph; the neon line can be dragged; wheel or pinch zooms
const PTRS = new Map(); let pinch0 = 0, span0 = 32;
const secPos = e => { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top - TOP]; };
const overSec = (X, Y) => SEC && X >= SEC.X0 - 4 && X <= SEC.X1 + 4 && Y >= SEC.Y0 - 10 && Y <= SEC.Y1 + 10;
cv.addEventListener("pointerdown", e => {
  if (step !== 3 || playing || onBar(e)) return;
  const [X, Y] = secPos(e); PTRS.set(e.pointerId, [e.clientX, e.clientY]);
  if (PTRS.size === 2) { const [p, q] = [...PTRS.values()]; pinch0 = Math.hypot(p[0] - q[0], p[1] - q[1]); span0 = LP.span; scrub = null; return; }
  LP.x = X; LP.y = Y; LP.over = overSec(X, Y);
});
cv.addEventListener("pointermove", e => {
  if (step !== 3 || playing) { LP.over = false; return; }
  const [X, Y] = secPos(e);
  if (PTRS.has(e.pointerId)) PTRS.set(e.pointerId, [e.clientX, e.clientY]);
  if (PTRS.size === 2 && pinch0) { const [p, q] = [...PTRS.values()]; LP.span = clamp(span0 * pinch0 / Math.max(1, Math.hypot(p[0] - q[0], p[1] - q[1])), 8, 128); return; }
  LP.x = X; LP.y = Y; LP.over = overSec(X, Y) || !!scrub;
});
const endPtr = e => { PTRS.delete(e.pointerId); if (PTRS.size < 2) pinch0 = 0; if (e.pointerType !== "mouse") LP.over = false; };
cv.addEventListener("pointerup", endPtr); cv.addEventListener("pointercancel", endPtr);
cv.addEventListener("pointerleave", () => { LP.over = false; });
cv.addEventListener("wheel", e => { if (step === 3 && !playing && LP.over) { e.preventDefault(); LP.span = clamp(LP.span * Math.exp(e.deltaY * .002), 8, 128); } }, { passive: false });
cv.addEventListener("pointermove", e => { if (seeking) seekTo(e); });
cv.addEventListener("pointerup", () => { seeking = false; });
cv.addEventListener("pointercancel", () => { seeking = false; });
cv.addEventListener("mousemove", e => {
  barHover = onBar(e);
  const [sx4, sy4] = secPos(e), over4 = step === 3 && !playing && overSec(sx4, sy4);
  cv.style.cursor = scrub || scrubAt(e) ? "ew-resize" : barHover || seeking || (step === 2 && !playing && sampleAt(e) !== null) ? "pointer"
    : over4 ? "crosshair" : "";
});
cv.addEventListener("mouseleave", () => { barHover = false; });

// page navigation: dots, ← → (above), swipe on touch screens, and the way on after the last scene
const dotsBox = document.getElementById("dots"), prevBtn = document.getElementById("prev"), nextBtn = document.getElementById("next"), onward = document.getElementById("onward");
const dotBtns = [];
for (let i = PAGE.first; i <= PAGE.last; i++) {
  const b = document.createElement("button"); b.type = "button"; b.className = "dot";
  b.setAttribute("aria-label", "Scene " + (i - PAGE.first + 1) + " of " + (PAGE.last - PAGE.first + 1) + ": " + TXT[lang].steps[i]); b.title = TXT[lang].steps[i];
  b.addEventListener("click", () => go(i)); dotsBox.appendChild(b); dotBtns.push(b);
}
onward.textContent = PAGE.onwardLabel; onward.href = PAGE.onwardHref;
function syncNav() {
  dotBtns.forEach((b, k) => b.setAttribute("aria-current", String(PAGE.first + k === step)));
  prevBtn.disabled = step === PAGE.first; nextBtn.disabled = step === PAGE.last; onward.hidden = step !== PAGE.last;
}


document.addEventListener("keydown", e => {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  if (e.target.closest && e.target.closest("button") && (e.key === " " || e.key === "Enter")) return;
  if (e.key === " ") { e.preventDefault(); togglePlay(); }
  else if (step === 2 && !playing && sel !== null && (e.key === "ArrowRight" || e.key === "ArrowLeft")) { // move the selection: 1, or 10 with Shift
    e.preventDefault(); sel = clamp(sel + (e.key === "ArrowRight" ? 1 : -1) * (e.shiftKey ? 10 : 1), 0, SAMP.kk);
  }
  else if (e.key === "Escape") sel = null;
  else if (e.key === "ArrowRight") go(step + 1);
  else if (e.key === "ArrowLeft") go(step - 1);
  else if (/^[1-9]$/.test(e.key)) go(PAGE.first + +e.key - 1);
  else if (/^[tam]$/i.test(e.key)) playLetter(e.key.toLowerCase());
});

// Same on every page: the step title centred on top (number in neon, title in white) between the ← and → buttons (HTML);
// at the bottom a small footnote at the left, the mode switch at the right (HTML) and the progress line at the very bottom.
const FOOT = [true, true, false, false, false, false]; // pages with the "slowed down" footnote
const INSET = 16, BTN = 36; // corner inset and button height, as in style.css: the title and the footnote line up with the buttons
function drawTitle() {
  const pad = INSET, num = "0" + (step - PAGE.first + 1) + " · ", size = FS * 1.25, y = TOP / 2, title = TXT[lang].steps[step];
  g.font = font(size, 600); const nw = g.measureText(num).width, tw = Math.min(g.measureText(title).width, W - 2 * pad - nw);
  const X = W / 2 - (nw + tw) / 2;
  text(num, X, y, { b: "middle", c: C.sig, w: 600, size });
  text(title, X + nw, y, { b: "middle", c: C.ink, w: 600, size, max: tw });
}
function drawBand(p) {
  const y = VH - INSET - BTN / 2;
  if (FOOT[step]) text(TXT[lang].L.simp2, INSET, y, { b: "middle", c: C.muted, size: FS * .85, max: W - 2 * INSET - (tonesBtn.hidden ? 56 : 104) }); // clear of the buttons on the right
  if (step === 3) text(TXT[lang].L.oneSec, INSET, y, { b: "middle", c: C.ink, w: 600 }); // scene 4: its caption in the bottom-left corner
  if (step === 2 && SAMP) { // scene 3: the 1 ms bracket in the bottom-left corner, at the graph's scale (16 samples wide)
    const b0 = INSET, b1 = INSET + (SAMP.X1 - SAMP.X0) * 16 / (SAMP.K - 1);
    line(b0, y, b1, y, C.ink, 1.5); line(b0, y - 4, b0, y + 4, C.ink, 1.5); line(b1, y - 4, b1, y + 4, C.ink, 1.5);
    text(TXT[lang].L.onems, b1 + 10, y, { b: "middle", c: C.ink, w: 600 });
  }
  const bh = barHover || seeking ? 6 : 3; // thicker, with a handle, while it can be dragged
  g.fillStyle = C.line; g.fillRect(0, VH - bh, W, bh);
  glow(C.sig, 8, () => { g.fillStyle = C.sig; g.fillRect(0, VH - bh, W * p, bh); if (bh > 3) { g.beginPath(); g.arc(W * p, VH - bh / 2, 7, 0, 7); g.fill(); } });
}

function frame(now) {
  const dt = Math.min(.1, (now - last) / 1000); last = now;
  wall += dt;
  if (scrub) {} // a playhead is being dragged: time follows the pointer only
  else if (playing && step === 0 && manual) { clock += dt * speed; if (man.k) man.t = Math.min(man.t + dt * speed, zone1(man.k)[1] - .01); } // holds at the end, silent
  else if (playing) { local += dt * speed; clock += dt * speed; if (local >= DUR[step]) { if (step === 0) local -= DUR[0]; else if (step < PAGE.last) go(step + 1); else { local = DUR[step]; playing = false; syncPlay(); } } } // scene 1 loops until → is pressed; the last scene holds at its end
  const tonesOn = !!WORD && step < 2; // the tones button: scenes 1 and 2, with the recorded word
  if (tonesBtn.hidden === tonesOn) tonesBtn.hidden = !tonesOn;
  if (tonesBtn.title !== TXT[lang].L.parts) { tonesBtn.title = TXT[lang].L.parts; tonesBtn.setAttribute("aria-label", TXT[lang].L.parts); }
  if (modeBtn.hidden !== (step !== 0)) { modeBtn.hidden = step !== 0; playBtn.hidden = step === 0; } // mode switch on page 1, play / pause elsewhere
  const p = clamp((step === 0 && manual ? man.t : local) / DUR[step], 0, 1);
  g.clearRect(0, 0, W, VH); // transparent: the page gradient shows through
  drawTitle();
  segOn = false; SCRUBS = [];
  g.save(); g.translate(0, TOP); SCENES[step](p, clock); g.restore(); // every scene draws in its own W x H area under the title
  for (const k of KEYS) if (SEGBTN[k].hidden === segOn) SEGBTN[k].hidden = !segOn;
  drawBand(p);
  requestAnimationFrame(frame);
}

readTheme(); resize(); syncNav();
if (REC) useTones(REC.tones); else if (window.TONES) useTones(window.TONES); // the recorded word for scenes 1 and 2
window.addEventListener("resize", resize);
if (window.ResizeObserver) new ResizeObserver(resize).observe(cv); // the page header can change height
requestAnimationFrame(t => { last = t; frame(t); });
})();
