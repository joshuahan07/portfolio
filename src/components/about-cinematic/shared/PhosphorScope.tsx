import { useEffect, useRef, type ReactNode } from "react";

type Props = {
  /** The card's contents. Every direct child is treated as one line to reveal. */
  children: ReactNode;
  /** Path points consumed per frame. Higher is faster. */
  speed?: number;
  /** Fraction of the trail erased each frame. Higher fades sooner. */
  decay?: number;
  /** Wait until the card scrolls into view before running. */
  startOnView?: boolean;
  /** Replay the whole trace again this many ms after each pass finishes. */
  loop?: boolean;
  loopDelayMs?: number;
  /** Classes for the panel itself: border, radius, background, padding. */
  className?: string;
};

const PAD = 30; // canvas overhang, so the beam's glow isn't clipped
const TAU = Math.PI * 2;

type P = { x: number; y: number; m: { bi: number; f: number } | null };

/**
 * Phosphor scope.
 *
 * A single beam traces the panel's outline, then runs left to right beneath each
 * line. Text is uncovered directly under the beam rather than after it, so the
 * words appear to be written by it. The trail persists and decays because the
 * canvas is erased a little each frame instead of cleared, which is the same way
 * a real phosphor screen behaves.
 */
export default function PhosphorScope({
  children,
  speed = 10,
  decay = 0.075,
  startOnView = true,
  loop = false,
  loopDelayMs = 5000,
  className = "",
}: Props) {
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const inner = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const wrapEl = wrap.current;
    const cv = canvas.current;
    const innerEl = inner.current;
    if (!wrapEl || !cv || !innerEl) return;

    const blocks = Array.from(innerEl.children) as HTMLElement[];
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduced) {
      cv.style.display = "none";
      return;
    }

    let raf = 0;
    let replayTimeout = 0;
    let cancelled = false;

    const start = () => {
      const wr = wrapEl.getBoundingClientRect();
      const W = wr.width + PAD * 2;
      const H = wr.height + PAD * 2;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);

      cv.width = Math.max(1, Math.floor(W * dpr));
      cv.height = Math.max(1, Math.floor(H * dpr));
      cv.style.width = `${W}px`;
      cv.style.height = `${H}px`;
      const c = cv.getContext("2d");
      if (!c) return;
      c.setTransform(dpr, 0, 0, dpr, 0, 0);

      // panel box in canvas space
      const box = { x: PAD, y: PAD, w: wr.width, h: wr.height };
      const radius = parseFloat(getComputedStyle(wrapEl).borderRadius) || 14;

      // ---- build the path: outline first, then one pass per line ----
      const step = 6;
      const path: P[] = [];
      const seg = (x1: number, y1: number, x2: number, y2: number) => {
        const d = Math.hypot(x2 - x1, y2 - y1);
        const n = Math.max(1, Math.round(d / step));
        for (let i = 0; i < n; i++)
          path.push({ x: x1 + ((x2 - x1) * i) / n, y: y1 + ((y2 - y1) * i) / n, m: null });
      };
      const arc = (cx: number, cy: number, a0: number, a1: number) => {
        const n = Math.max(3, Math.round((Math.abs(a1 - a0) * radius) / step));
        for (let i = 0; i < n; i++) {
          const a = a0 + ((a1 - a0) * i) / n;
          path.push({ x: cx + Math.cos(a) * radius, y: cy + Math.sin(a) * radius, m: null });
        }
      };
      const { x, y, w, h } = box;
      seg(x + radius, y, x + w - radius, y);       arc(x + w - radius, y + radius, -Math.PI / 2, 0);
      seg(x + w, y + radius, x + w, y + h - radius); arc(x + w - radius, y + h - radius, 0, Math.PI / 2);
      seg(x + w - radius, y + h, x + radius, y + h); arc(x + radius, y + h - radius, Math.PI / 2, Math.PI);
      seg(x, y + h - radius, x, y + radius);       arc(x + radius, y + radius, Math.PI, Math.PI * 1.5);
      const frameLen = path.length;

      const rects = blocks.map((el) => {
        const r = el.getBoundingClientRect();
        return { x: r.left - wr.left + PAD, y: r.top - wr.top + PAD, w: r.width, h: r.height };
      });

      rects.forEach((b, bi) => {
        const ly = b.y + b.h * 0.62;
        const lead = Math.max(2, Math.round((b.x - box.x) / step));
        for (let i = 0; i < lead; i++)
          path.push({ x: box.x + ((b.x - box.x) * i) / lead, y: ly, m: null });
        const n = Math.max(6, Math.round(b.w / step));
        for (let i = 0; i <= n; i++)
          path.push({ x: b.x + (b.w * i) / n, y: ly, m: { bi, f: i / n } });
        const tail = Math.max(2, Math.round((box.x + box.w - (b.x + b.w)) / step));
        for (let i = 0; i < tail; i++)
          path.push({ x: b.x + b.w + ((box.x + box.w - (b.x + b.w)) * i) / tail, y: ly, m: null });
      });

      // ---- panel starts bare, lines start hidden ----
      wrapEl.style.transition = "none";
      wrapEl.style.borderColor = "transparent";
      wrapEl.style.background = "transparent";
      blocks.forEach((el) => {
        el.style.transition = "none";
        el.style.clipPath = "inset(0 100% 0 0)";
      });

      let i = 0;
      let framed = false;
      let idle = 0;
      c.clearRect(0, 0, W, H);

      const frame = () => {
        if (cancelled) return;

        // decay by erasing, so the card underneath is never dimmed
        c.globalCompositeOperation = "destination-out";
        c.fillStyle = `rgba(0,0,0,${decay})`;
        c.fillRect(0, 0, W, H);
        c.globalCompositeOperation = "lighter";

        for (let k = 0; k < speed && i < path.length; k++, i++) {
          const p = path[i];
          const q = path[Math.max(0, i - 1)];

          c.strokeStyle = "rgba(170,255,225,.9)";
          c.lineWidth = 1.6;
          c.lineCap = "round";
          c.beginPath();
          c.moveTo(q.x, q.y);
          c.lineTo(p.x, p.y);
          c.stroke();

          const g = c.createRadialGradient(p.x, p.y, 0, p.x, p.y, 12);
          g.addColorStop(0, "rgba(225,255,245,.9)");
          g.addColorStop(1, "rgba(34,211,238,0)");
          c.fillStyle = g;
          c.beginPath();
          c.arc(p.x, p.y, 12, 0, TAU);
          c.fill();

          if (p.m) {
            blocks[p.m.bi].style.clipPath = `inset(0 ${((1 - p.m.f) * 100).toFixed(2)}% 0 0)`;
          }
          if (!framed && i > frameLen) {
            framed = true;
            wrapEl.style.transition = "border-color .5s ease, background .5s ease";
            wrapEl.style.borderColor = "";
            wrapEl.style.background = "";
          }
        }

        c.globalCompositeOperation = "source-over";

        // keep going a moment after the pass so the phosphor can fade out
        if (i >= path.length) {
          idle++;
          if (idle > 90) {
            if (loop) {
              replayTimeout = window.setTimeout(() => {
                if (!cancelled) start();
              }, loopDelayMs);
            }
            return;
          }
        }
        raf = requestAnimationFrame(frame);
      };

      raf = requestAnimationFrame(frame);
    };

    let io: IntersectionObserver | null = null;
    if (startOnView) {
      io = new IntersectionObserver(
        (entries) => {
          if (entries.some((e) => e.isIntersecting)) {
            io?.disconnect();
            start();
          }
        },
        { threshold: 0.4 }
      );
      io.observe(wrapEl);
    } else {
      start();
    }

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      window.clearTimeout(replayTimeout);
      io?.disconnect();
      blocks.forEach((el) => {
        el.style.clipPath = "";
        el.style.transition = "";
      });
      wrapEl.style.cssText = "";
    };
  }, [speed, decay, startOnView, loop, loopDelayMs]);

  return (
    <div ref={wrap} className={`relative ${className}`}>
      <canvas
        ref={canvas}
        aria-hidden
        style={{
          position: "absolute",
          top: -PAD,
          left: -PAD,
          zIndex: 5,
          pointerEvents: "none",
        }}
      />
      <div ref={inner} className="relative z-0">
        {children}
      </div>
    </div>
  );
}
