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

    // The needle keeps sweeping continuously (10% faster than the previous
    // pace). Once it sweeps through a station's lock zone, that word holds
    // at full lock — no glyph noise — for HOLD_MS even as the needle moves
    // on, instead of decaying the instant the needle drifts away.
    const period = (sweepSeconds * 1000) / 1.012;
    const HOLD_MS = 1200;
    // How close counts as "passed over": wide enough that at least a few
    // animation frames land inside it as the needle sweeps through (an
    // exact-instant threshold like 0.999 could get skipped between frames
    // and never arm the hold at all).
    const LOCK_ZONE = 0.85;
    const holdUntil = new Array(stations.length).fill(0);
    // How long the word takes to ease from fully-lit back down into the
    // noise once the hold ends, instead of snapping instantly.
    const RELEASE_FADE_MS = 450;

    // The glyph scramble only re-rolls every FLICKER_MS instead of every
    // frame, so it reads as a deliberate decode instead of a fast blur.
    const FLICKER_MS = 90;
    const lastFlicker = new Array(stations.length).fill(0);
    const cachedTxt = stations.map((s) => s.word.toUpperCase());

    let w = 0;
    const h = height;
    let raf = 0;
    let mouseX = -9999;
    let over = false;
    // The sweep's phase is timed from whenever this component first draws,
    // not from absolute page-load time — otherwise the needle would appear
    // wherever the sine curve happened to land when the strip faded in,
    // instead of always starting at the left edge and sweeping rightward.
    let startT = 0;

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

      if (!startT) startT = now;
      const elapsed = now - startT;
      const phase = (elapsed % period) / period;
      // shifted so phase 0 sits at the leftmost point of the sweep — the
      // needle starts at the start and sweeps rightward first.
      const needle = over
        ? Math.max(0.03, Math.min(0.97, mouseX / w))
        : reduced
        ? 0.5
        : 0.5 + 0.47 * Math.sin(phase * Math.PI * 2 - Math.PI / 2);
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
      stations.forEach((st, idx) => {
        const rawLock = reduced ? 1 : Math.max(0, 1 - Math.abs(st.p - needle) / 0.085);
        const inZone = rawLock >= LOCK_ZONE;
        if (inZone) holdUntil[idx] = now + HOLD_MS;

        let lock: number;
        if (inZone || now < holdUntil[idx]) {
          lock = 1;
        } else {
          // ease the release out instead of snapping straight to rawLock —
          // it fades from fully-lit back down into the noise.
          const sinceRelease = now - holdUntil[idx];
          const fadeT = Math.min(1, sinceRelease / RELEASE_FADE_MS);
          lock = 1 + (rawLock - 1) * fadeT;
        }

        const x = st.p * w;
        const upper = st.word.toUpperCase();
        if (reduced) {
          cachedTxt[idx] = upper;
        } else if (now - lastFlicker[idx] > FLICKER_MS) {
          lastFlicker[idx] = now;
          cachedTxt[idx] = [...upper]
            .map((c, i) => (i / upper.length < lock ? c : GLYPHS[(Math.random() * GLYPHS.length) | 0]))
            .join("");
        }
        const txt = cachedTxt[idx];

        ctx.globalAlpha = 0.18 + lock * 0.82;
        ctx.fillStyle = lock > 0.8 ? COL.core : COL.rim;
        ctx.fillText(txt, x, labelY);

        // the station's own mark on the ruler, growing as it locks
        ctx.globalAlpha = 0.25 + lock * 0.75;
        ctx.fillStyle = lock > 0.8 ? "#fff" : "rgba(34,211,238,.6)";
        const markH = 3 + lock * 9;
        ctx.fillRect(x - 1, rulerY - markH, 2, markH);
      });

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
