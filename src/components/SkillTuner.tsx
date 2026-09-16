import { useEffect, useRef } from "react";

type Props = {
  /** Stations, left to right. Six or seven reads best; more than eight gets crowded. */
  items?: readonly string[];
  /** Strip height in px. 96 is the compact default; below ~80 the labels start to crowd the ruler. */
  height?: number;
  /** Seconds for one full sweep across the band and back. */
  sweepSeconds?: number;
  className?: string;
};

const COL = {
  core: "#fdfcfc",
  rim: "#b4effe",
  hot: "#07c6fc",
};

const GLYPHS = "ABCDEFGHJKLMNPQRSTUVWXYZ#%*/\\<>";

/**
 * Tuner strip.
 *
 * A needle sweeps a frequency band. Each skill is a station at a fixed point on
 * that band, and its characters resolve out of random glyphs as the needle closes
 * in, fully locked at the centre. Static intensity is derived from the distance to
 * the nearest station, so the noise drops away as you tune in. Hovering hands the
 * dial to the cursor.
 *
 * Same mechanic family as the signal-lock subtitle above it: a signal resolving out
 * of noise, stated twice.
 */
export default function SkillTuner({
  items = ["Product", "Design", "Agents", "Research", "Shipping", "Founding"],
  height = 96,
  sweepSeconds = 11,
  className = "",
}: Props) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const stations = items.map((word, i) => ({
      word,
      p: 0.08 + (i / Math.max(1, items.length - 1)) * 0.84,
    }));

    // The needle steps station to station, freezing on each one (fully
    // locked, no glyph noise) for HOLD_MS before it moves on and the next
    // word starts decoding. It ping-pongs back and forth across the band
    // rather than snapping from the last station back to the first.
    const HOLD_MS = 1500;
    const travelMs = Math.max(300, (sweepSeconds * 1000) / Math.max(1, stations.length - 1));
    const pingpong: number[] = [];
    for (let i = 0; i < stations.length; i++) pingpong.push(i);
    for (let i = stations.length - 2; i > 0; i--) pingpong.push(i);
    if (pingpong.length < 2) pingpong.push(0);

    let w = 0;
    const h = height;
    let raf = 0;
    let mouseX = -9999;
    let over = false;

    const resize = () => {
      const rect = cv.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = rect.width;
      cv.width = Math.max(1, Math.floor(w * dpr));
      cv.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const onMove = (e: PointerEvent) => {
      const rect = cv.getBoundingClientRect();
      mouseX = e.clientX - rect.left;
      over = true;
    };
    const onLeave = () => {
      over = false;
      mouseX = -9999;
    };

    // compact vertical rhythm: labels sit just above a short ruler
    const rulerY = h - 11;
    const labelY = h * 0.46;

    const draw = (now: number) => {
      ctx.clearRect(0, 0, w, h);

      const segDur = HOLD_MS + travelMs;
      const cycle = pingpong.length * segDur;
      const t = now % cycle;
      const segIdx = Math.floor(t / segDur);
      const segT = t - segIdx * segDur;
      const curP = stations[pingpong[segIdx]].p;
      const nextP = stations[pingpong[(segIdx + 1) % pingpong.length]].p;
      let autoNeedle = curP;
      if (segT >= HOLD_MS) {
        const travelT = Math.min(1, (segT - HOLD_MS) / travelMs);
        const eased = travelT < 0.5 ? 2 * travelT * travelT : 1 - Math.pow(-2 * travelT + 2, 2) / 2;
        autoNeedle = curP + (nextP - curP) * eased;
      }

      const needle = over
        ? Math.max(0.03, Math.min(0.97, mouseX / w))
        : reduced
        ? 0.5
        : autoNeedle;
      const nx = needle * w;

      // ruler
      ctx.strokeStyle = "rgba(34,211,238,.28)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 0; i <= 60; i++) {
        const x = (i / 60) * w;
        const tall = i % 5 === 0 ? 7 : 4;
        ctx.moveTo(x, rulerY);
        ctx.lineTo(x, rulerY - tall);
      }
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, rulerY);
      ctx.lineTo(w, rulerY);
      ctx.strokeStyle = "rgba(34,211,238,.45)";
      ctx.stroke();

      // static, loudest between stations
      let nearest = 1;
      for (const st of stations) nearest = Math.min(nearest, Math.abs(st.p - needle));
      if (!reduced) {
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        ctx.strokeStyle = "rgba(34,211,238,.5)";
        ctx.lineWidth = 1;
        ctx.globalAlpha = Math.min(1, nearest / 0.1) * 0.34;
        ctx.beginPath();
        for (let i = 0; i < 46; i++) {
          const x = Math.random() * w;
          const y = labelY + (Math.random() - 0.5) * 18;
          ctx.moveTo(x, y);
          ctx.lineTo(x, y + (Math.random() - 0.5) * 7);
        }
        ctx.stroke();
        ctx.restore();
      }

      // stations resolve as the needle closes in
      ctx.font = '600 12px ui-monospace, Menlo, Consolas, monospace';
      ctx.textAlign = "center";
      for (const st of stations) {
        const lock = reduced ? 1 : Math.max(0, 1 - Math.abs(st.p - needle) / 0.085);
        const x = st.p * w;
        const upper = st.word.toUpperCase();
        const txt = reduced
          ? upper
          : [...upper]
              .map((c, i) =>
                i / upper.length < lock ? c : GLYPHS[(Math.random() * GLYPHS.length) | 0]
              )
              .join("");

        ctx.globalAlpha = 0.18 + lock * 0.82;
        ctx.fillStyle = lock > 0.8 ? COL.core : COL.rim;
        ctx.fillText(txt, x, labelY);

        // the station's own mark on the ruler, growing as it locks
        ctx.globalAlpha = 0.25 + lock * 0.75;
        ctx.fillStyle = lock > 0.8 ? "#fff" : "rgba(34,211,238,.6)";
        const markH = 3 + lock * 9;
        ctx.fillRect(x - 1, rulerY - markH, 2, markH);
      }

      // needle — a green radar-style sweep line
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      const g = ctx.createLinearGradient(nx - 26, 0, nx + 26, 0);
      g.addColorStop(0, "rgba(57,255,106,0)");
      g.addColorStop(0.5, "rgba(140,255,170,.32)");
      g.addColorStop(1, "rgba(57,255,106,0)");
      ctx.fillStyle = g;
      ctx.fillRect(nx - 26, 0, 52, h);
      ctx.strokeStyle = "#39ff6a";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(nx, 5);
      ctx.lineTo(nx, rulerY - 1);
      ctx.stroke();
      ctx.restore();
      ctx.globalAlpha = 1;
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(cv);
    cv.addEventListener("pointermove", onMove);
    cv.addEventListener("pointerleave", onLeave);

    if (reduced) {
      draw(0);
    } else {
      const loop = (now: number) => {
        draw(now);
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
    }

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      cv.removeEventListener("pointermove", onMove);
      cv.removeEventListener("pointerleave", onLeave);
    };
  }, [items, height, sweepSeconds]);

  return (
    <canvas
      ref={ref}
      className={`block w-full ${className}`}
      style={{ height }}
      role="img"
      aria-label={`Skills: ${items.join(", ")}`}
    />
  );
}
