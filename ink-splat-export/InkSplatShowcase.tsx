import { lazy, Suspense, useCallback, useState } from "react";

const InkBloomSplatCard = lazy(() => import("./canvas/InkBloomSplatCard"));

function StageFallback() {
  return (
    <div className="flex min-h-[min(580px,82vh)] items-center justify-center bg-white">
      <span className="sr-only">Loading…</span>
    </div>
  );
}

/**
 * Ink splat only — auto-plays drop → splat → bio. No bottle / scroll pour.
 */
export default function InkSplatShowcase() {
  const [playKey, setPlayKey] = useState(0);
  const [replayVisible, setReplayVisible] = useState(false);

  const replay = useCallback(() => {
    setReplayVisible(false);
    setPlayKey((k) => k + 1);
  }, []);

  return (
    <div className="ink-splat-showcase mx-auto max-w-4xl">
      <div className="relative min-h-[min(580px,82vh)] overflow-hidden bg-white">
        <Suspense fallback={<StageFallback />}>
          <InkBloomSplatCard
            key={playKey}
            playKey={playKey}
            onReady={() => setReplayVisible(true)}
          />
        </Suspense>

        <div
          className="absolute right-4 top-4 z-50 sm:right-6 sm:top-6"
          style={{
            opacity: replayVisible ? 1 : 0,
            transition: "opacity 0.4s ease",
            pointerEvents: replayVisible ? "auto" : "none",
          }}
        >
          <button
            type="button"
            onClick={replay}
            className="rounded-full border border-black/10 bg-white/90 px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-black/70 shadow-sm backdrop-blur hover:bg-white"
            aria-label="Replay animation"
          >
            Replay
          </button>
        </div>
      </div>
    </div>
  );
}
