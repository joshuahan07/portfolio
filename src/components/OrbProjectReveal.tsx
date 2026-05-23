import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp } from "lucide-react";
import { animateLightningStrike, buildStrikeOrigins, fitCanvas } from "@/lib/lightning";
import { publicUrl } from "@/lib/publicUrl";
import ElectricBall from "@/components/ElectricBall";

const ORB_GIF = publicUrl("4dcf762a7ee18d694296e1d9c1e4adf0.gif");

type Phase = "idle" | "striking" | "exploding" | "revealed";

type OrbProjectRevealProps = {
  children: ReactNode;
};

const ARROWS = [
  { Icon: ArrowDown, className: "orb-arrow-top", label: "top" },
  { Icon: ArrowUp, className: "orb-arrow-bottom", label: "bottom" },
  { Icon: ArrowRight, className: "orb-arrow-left", label: "left" },
  { Icon: ArrowLeft, className: "orb-arrow-right", label: "right" },
] as const;

export default function OrbProjectReveal({ children }: OrbProjectRevealProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const orbRef = useRef<HTMLButtonElement>(null);
  const stopBolt = useRef<(() => void) | null>(null);

  const [phase, setPhase] = useState<Phase>("idle");
  const [showGallery, setShowGallery] = useState(false);
  const [fullscreenBolt, setFullscreenBolt] = useState(false);
  const [ballCenter, setBallCenter] = useState({ x: 0, y: 0 });
  const [orbHidden, setOrbHidden] = useState(false);
  const impactHandledRef = useRef(false);

  useEffect(() => {
    try {
      sessionStorage.removeItem("portfolio-projects-revealed");
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => fitCanvas(canvas);
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [fullscreenBolt]);

  const getOrbCenterInViewport = useCallback(() => {
    const orb = orbRef.current;
    if (!orb) return { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    const or = orb.getBoundingClientRect();
    return {
      x: or.left + or.width / 2,
      y: or.top + or.height / 2,
    };
  }, []);

  const showGalleryNow = useCallback(() => {
    setShowGallery(true);
  }, []);

  const finishReveal = useCallback(() => {
    setPhase("revealed");
  }, []);

  const handleStrike = useCallback(() => {
    if (phase !== "idle") return;

    const reduceMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduceMotion) {
      finishReveal();
      return;
    }

    impactHandledRef.current = false;
    setOrbHidden(false);
    setPhase("striking");
    setFullscreenBolt(true);

    const runStrike = () => {
      const canvas = canvasRef.current;
      if (!canvas) {
        setFullscreenBolt(false);
        finishReveal();
        return;
      }

      fitCanvas(canvas);

      const { x: cx, y: cy } = getOrbCenterInViewport();
      setBallCenter({ x: cx, y: cy });

      const origins = buildStrikeOrigins(
        window.innerWidth,
        window.innerHeight,
        cx,
        cy,
      );
      const boltLength = Math.max(
        cy - 8,
        window.innerHeight - 8 - cy,
        cx - 8,
        window.innerWidth - 8 - cx,
      );
      const segmentCount = Math.min(52, Math.floor(28 + boltLength / 28));
      const spreadAmount = Math.min(64, 28 + boltLength * 0.038);
      const frameCount = Math.min(30, Math.floor(18 + boltLength / 55));
      const pageImpact = Math.hypot(window.innerWidth, window.innerHeight) * 0.5;

      const triggerBall = () => {
        if (impactHandledRef.current) return;
        impactHandledRef.current = true;
        setOrbHidden(true);
        setPhase("exploding");
      };

      stopBolt.current = animateLightningStrike(canvas, cx, cy, origins, {
        impactRadius: Math.max(100, pageImpact * 0.2),
        frames: frameCount,
        segments: segmentCount,
        spread: spreadAmount,
        staggerStep: 0.016,
        lingerFrames: 2,
        onReachTarget: triggerBall,
        onComplete() {
          setFullscreenBolt(false);
          if (!impactHandledRef.current) triggerBall();
        },
      });
    };

    requestAnimationFrame(() => requestAnimationFrame(runStrike));
  }, [phase, getOrbCenterInViewport, finishReveal]);

  useEffect(() => {
    return () => stopBolt.current?.();
  }, []);

  const showOrbButton = phase === "idle" || (phase === "striking" && !orbHidden);
  const showArrows = showOrbButton;
  const isStriking = phase === "striking";

  return (
    <div ref={stageRef} className="relative w-full">
      <canvas
        ref={canvasRef}
        className={
          fullscreenBolt
            ? "pointer-events-none fixed inset-0 z-[200] h-screen w-screen"
            : "pointer-events-none absolute inset-0 z-30 h-full w-full"
        }
        aria-hidden
      />

      {phase !== "revealed" && !showGallery ? (
        <div
          className={`relative z-10 flex min-h-[min(52vh,440px)] flex-col items-center justify-center py-10 transition-opacity duration-500 ${
            phase === "striking" || phase === "exploding" ? "pointer-events-none" : ""
          }`}
        >
          <div className="relative flex h-[280px] w-[280px] items-center justify-center sm:h-[300px] sm:w-[300px]">
            {showArrows
              ? ARROWS.map(({ Icon, className: arrowClass }) => (
                  <div
                    key={arrowClass}
                    className={`pointer-events-none absolute flex flex-col items-center gap-1 text-cyan-300/90 ${arrowClass}`}
                  >
                    <Icon
                      className="h-7 w-7 drop-shadow-[0_0_8px_rgba(34,211,238,0.7)]"
                      strokeWidth={2.5}
                    />
                  </div>
                ))
              : null}

            {showOrbButton ? (
              <button
                ref={orbRef}
                type="button"
                onClick={handleStrike}
                disabled={phase !== "idle"}
                className={`orb-gif-btn relative z-10 shrink-0 rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-400 ${
                  isStriking ? "orb-gif-btn--striking" : ""
                }`}
                style={{
                  width: 200,
                  height: 200,
                  cursor: phase === "idle" ? "pointer" : "default",
                }}
                aria-label="Click to reveal my projects"
              >
                <img
                  src={ORB_GIF}
                  alt=""
                  className="pointer-events-none h-full w-full rounded-full object-cover"
                  draggable={false}
                />
              </button>
            ) : null}

          </div>

          {showArrows ? (
            <p className="orb-cta-pulse mt-14 max-w-xs text-center font-mono text-xs font-medium uppercase tracking-[0.35em] text-cyan-200/90 sm:mt-16">
              Click to see my work
            </p>
          ) : null}
        </div>
      ) : null}

      {phase === "exploding" ? (
        <ElectricBall
          active
          centerX={ballCenter.x}
          centerY={ballCenter.y}
          baseRadius={100}
          onShatter={showGalleryNow}
          onComplete={finishReveal}
        />
      ) : null}

      {showGallery ? (
        <div className="projects-gallery-reveal relative z-[190]">
          {children}
        </div>
      ) : null}
    </div>
  );
}
