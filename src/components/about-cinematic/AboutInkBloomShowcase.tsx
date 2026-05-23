import { lazy, Suspense, useCallback, useState } from "react";
import AboutAnimationStage from "./AboutAnimationStage";

const InkBloomCanvasCard = lazy(() => import("./canvas/InkBloomCanvasCard"));

function StageFallback() {
  return (
    <div className="flex min-h-[min(580px,82vh)] items-center justify-center bg-white">
      <span className="sr-only">Loading…</span>
    </div>
  );
}

export default function AboutInkBloomShowcase() {
  const [playKey, setPlayKey] = useState(0);
  const [replayVisible, setReplayVisible] = useState(false);

  const replay = useCallback(() => {
    setReplayVisible(false);
    setPlayKey((k) => k + 1);
  }, []);

  return (
    <AboutAnimationStage
      label="Option B — Ink drop"
      replayVisible={replayVisible}
      onReplay={replay}
    >
      <Suspense fallback={<StageFallback />}>
        <InkBloomCanvasCard
          key={playKey}
          playKey={playKey}
          onReady={() => setReplayVisible(true)}
        />
      </Suspense>
    </AboutAnimationStage>
  );
}
