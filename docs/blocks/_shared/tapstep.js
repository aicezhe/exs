/* Next step on a tap (the on-screen arrows are hidden). Arrow keys still go forward and back; the pages handle those.
   A tap is a press that barely moves, on something that is not a control. It clicks the page's own #next button,
   so every page keeps its one step function. No buttons stay on screen for moving: the dots only show the position,
   and past the last (first) step a tap or arrow goes to the next (previous) block. Elements with data-own-tap, buttons, links and inputs keep their own taps. */
(() => {
  'use strict';
  const css = document.createElement('style');
  css.textContent = '#prev, #next, #onward, .prevblock, .back[href^="../0"] { display: none !important; } #dots, #dots * { pointer-events: none !important; }';
  document.head.appendChild(css);
  const OWN = 'button, a, input, select, textarea, label, summary, [role="button"], [tabindex], [data-own-tap], #card, #tip, #params, .ppill';
  const MOVE = 10, MS = 450;
  let d = null;
  addEventListener('pointerdown', e => { d = e.isPrimary ? { x: e.clientX, y: e.clientY, t: performance.now(), el: e.target } : null; }, true);
  addEventListener('pointercancel', () => { d = null; }, true);
  addEventListener('pointerup', e => {
    if (!d) return; const s = d; d = null;
    if (Math.hypot(e.clientX - s.x, e.clientY - s.y) > MOVE || performance.now() - s.t > MS) return;
    if (s.el.closest && s.el.closest(OWN)) return;
    if (document.querySelector('#card.on')) return;   // a card is open: this tap only closes it
    const b = document.getElementById('next');
    if (b && !b.disabled && !b.hidden) b.click(); else edge(1);
  }, true);
  // past the last step: the next block (or the page's onward link); before the first: the previous block
  function edge(dir) {
    if (window.EXS_GO) { window.EXS_GO(dir); return; }
    const o = document.getElementById('onward');
    if (dir > 0 && o && !o.hidden && o.getAttribute('href')) location.href = o.getAttribute('href');
  }
  addEventListener('keydown', e => {
    if (e.metaKey || e.ctrlKey || e.altKey || e.shiftKey || (e.target.tagName === 'INPUT')) return;
    const n = document.getElementById('next'), p = document.getElementById('prev');
    if (e.key === 'ArrowRight' && n && (n.disabled || n.hidden)) edge(1);
    else if (e.key === 'ArrowLeft' && p && p.disabled) edge(-1);
  }, true);
})();
