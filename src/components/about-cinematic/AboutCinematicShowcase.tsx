import { lazy, Suspense, useCallback, useState } from "react";
import AboutAnimationStage from "./AboutAnimationStage";

const InkBloomCard = lazy(() => import("./canvas/InkBloomCard"));

function StageFallback() {
  return (
    <div className="flex min-h-[min(580px,82vh)] items-center justify-center bg-black">
      <span className="sr-only">Loading…</span>
    </div>
  );
}

export default function AboutCinematicShowcase() {
  const [playKey, setPlayKey] = useState(0);
  const [replayVisible, setReplayVisible] = useState(false);

  const replay = useCallback(() => {
    setReplayVisible(false);
    setPlayKey((k) => k + 1);
  }, []);

  return (
    <AboutAnimationStage
      label="Option A — Video"
      theme="dark"
      replayVisible={replayVisible}
      onReplay={replay}
    >
      <Suspense fallback={<StageFallback />}>
        <InkBloomCard
          key={playKey}
          playKey={playKey}
          onReady={() => setReplayVisible(true)}
        />
      </Suspense>
    </AboutAnimationStage>
  );
}
