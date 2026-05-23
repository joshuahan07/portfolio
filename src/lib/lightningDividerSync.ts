/** One shared clock so every project divider bolt fires on the same frame. */
let globalFrame = 0;
let rafId = 0;
const listeners = new Set<() => void>();

function tick() {
  globalFrame++;
  for (const draw of listeners) draw();
  rafId = requestAnimationFrame(tick);
}

function ensureLoop() {
  if (rafId === 0) rafId = requestAnimationFrame(tick);
}

export function getDividerGlobalFrame() {
  return globalFrame;
}

export function subscribeDividerDraw(draw: () => void): () => void {
  listeners.add(draw);
  ensureLoop();
  return () => {
    listeners.delete(draw);
    if (listeners.size === 0 && rafId !== 0) {
      cancelAnimationFrame(rafId);
      rafId = 0;
      globalFrame = 0;
    }
  };
}
