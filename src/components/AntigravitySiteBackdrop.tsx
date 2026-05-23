import { lazy, Suspense, useEffect, useRef, useState } from "react";
import type { AntigravityProps } from "./Antigravity";

const Antigravity = lazy(() => import("./Antigravity"));

const TICKER_ANCHOR_ID = "hero-skill-ticker";

const antigravityProps: AntigravityProps = {
  count: 300,
  magnetRadius: 6,
  ringRadius: 7,
  waveSpeed: 0.4,
  waveAmplitude: 1,
  particleSize: 1.5,
  lerpSpeed: 0.05,
  mouseLerpSpeed: 0.15,
  color: "#3d6fd4",
  colorIdle: "#2a4f9e",
  colorActive: "#7ec8ff",
  minOpacity: 0,
  maxOpacity: 0.88,
  idleHoldMs: 480,
  fadeInLerp: 0.09,
  fadeOutLerp: 0.028,
  layerBands: 14,
  autoAnimate: false,
  particleVariance: 1,
  fieldStrength: 10,
};

export default function AntigravitySiteBackdrop() {
  const [clipTop, setClipTop] = useState(0);
  const clipTopRef = useRef(0);
  const rafRef = useRef(0);

  useEffect(() => {
    const measure = () => {
      const ticker = document.getElementById(TICKER_ANCHOR_ID);
      if (!ticker) return;

      const bottom = ticker.getBoundingClientRect().bottom;
      const next = bottom <= 0 ? 0 : Math.round(bottom);

      if (Math.abs(next - clipTopRef.current) < 2) return;
      clipTopRef.current = next;
      setClipTop(next);
    };

    const scheduleMeasure = () => {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(measure);
    };

    measure();
    window.addEventListener("scroll", scheduleMeasure, { passive: true });
    window.addEventListener("resize", scheduleMeasure);

    const ticker = document.getElementById(TICKER_ANCHOR_ID);
    const observer = ticker ? new ResizeObserver(scheduleMeasure) : null;
    if (ticker && observer) observer.observe(ticker);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("scroll", scheduleMeasure);
      window.removeEventListener("resize", scheduleMeasure);
      observer?.disconnect();
    };
  }, []);

  return (
    <div
      className="pointer-events-none fixed inset-0 z-[1] overflow-hidden transition-[clip-path] duration-300 ease-out"
      style={{ clipPath: `inset(${clipTop}px 0 0 0)` }}
      aria-hidden
    >
      <div
        className="absolute inset-0 bg-gradient-to-b from-[#0a0a0f]/98 via-[#0a0a0f]/88 to-[#0a0a0f]/75"
        aria-hidden
      />
      <div
        className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-[#0a0a0f] to-transparent"
        style={{ opacity: clipTop > 0 ? 1 : 0 }}
        aria-hidden
      />
      <div className="absolute inset-0 h-full w-full">
        <Suspense fallback={null}>
          <Antigravity {...antigravityProps} />
        </Suspense>
      </div>
    </div>
  );
}

export { TICKER_ANCHOR_ID };
