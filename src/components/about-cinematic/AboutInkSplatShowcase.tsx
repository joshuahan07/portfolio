import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import gsap from "gsap";
import BasketballKnockScene from "./BasketballKnockScene";
import BasketballBall from "./BasketballBall";
import { getFullAnimationPath } from "./basketballPathDocument";
import { resolveViewportBallPose } from "./basketballScrollPhases";
import InkBottlePlacement from "./InkBottlePlacement";
import {
  SHOT_DONE,
  CARD_BOUNCE_START,
  computeBounceMotion,
  computeBallPose,
  shouldHideBallAfterInk,
  flipProgressFromCard,
  shouldPourFromFlip,
} from "./basketballScrollPhases";
import {
  ensureShotSegment,
  loadPathDocument,
  savePathDocument,
  type PathDocument,
} from "./basketballPathDocument";
import { clearPathMathCache } from "./basketballPathMath";
import {
  DEFAULT_BOTTLE_POSITION,
  loadBottlePosition,
  saveBottlePosition,
  type BottlePosition,
} from "./inkBottlePositionStorage";
import { mouthOriginInCard } from "./inkBottleGeometry";
import type { NormalizedPoint } from "./canvas/types";
import BasketballScrollDebugPanel from "./BasketballScrollDebugPanel";
import {
  useBasketballScrollDebug,
  useBasketballDebugLogger,
} from "./useBasketballScrollDebug";

gsap.registerPlugin(ScrollTrigger);

const InkBloomSplatCard = lazy(() => import("./canvas/InkBloomSplatCard"));

function StageFallback() {
  return (
    <div className="flex min-h-[min(580px,82vh)] items-center justify-center bg-white">
      <span className="sr-only">Loading…</span>
    </div>
  );
}

function normalizePostShotScroll(rawProgress: number, startProgress: number | null) {
  if (startProgress == null) return 0;
  if (rawProgress <= startProgress) return 0;

  const remaining = 1 - startProgress;
  if (remaining <= 0.001) return 1;

  return Math.max(0, Math.min(1, (rawProgress - startProgress) / remaining));
}

export default function AboutInkSplatShowcase() {
  const masterRef = useRef<HTMLDivElement>(null);
  const shotBridgeRef = useRef<HTMLDivElement>(null);
  const shotStageRef = useRef<HTMLDivElement>(null);
  const knockSceneRef = useRef<HTMLDivElement>(null);
  const journeyRef = useRef<HTMLDivElement>(null);
  const journeyStageRef = useRef<HTMLDivElement>(null);
  const bounceSceneRef = useRef<HTMLDivElement>(null);
  const revealZoneRef = useRef<HTMLDivElement>(null);
  const bottleWrapRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const [pathDoc, setPathDoc] = useState<PathDocument>(() =>
    ensureShotSegment(loadPathDocument()),
  );
  const [playKey, setPlayKey] = useState(0);
  const [shotProgress, setShotProgress] = useState(0);
  const [cardReveal, setCardReveal] = useState(0);
  const [postShotScrollRaw, setPostShotScrollRaw] = useState(0);
  const [arcStartCardReveal, setArcStartCardReveal] = useState<number | null>(
    null,
  );
  const [knocked, setKnocked] = useState(false);
  const [flipProgress, setFlipProgress] = useState(0);
  const [dropping, setDropping] = useState(false);
  const [pourTrigger, setPourTrigger] = useState(0);
  const [pourOrigin, setPourOrigin] = useState<NormalizedPoint | null>(null);
  const [replayVisible, setReplayVisible] = useState(false);
  const [scrollHint, setScrollHint] = useState(true);

  const [bottlePosition, setBottlePosition] = useState<BottlePosition>(() =>
    loadBottlePosition(),
  );
  const [bottleLocked, setBottleLocked] = useState(() => {
    if (typeof window === "undefined") return false;
    if (window.localStorage.getItem("portfolio:ink-bottle-position-v1") != null) {
      return true;
    }
    // Use the shipped default ink placement on the live site.
    return !import.meta.env.DEV;
  });
  const [isMovingBottle, setIsMovingBottle] = useState(false);
  const [ballActive, setBallActive] = useState(false);

  const knockedRef = useRef(false);
  const bloomFiredRef = useRef(false);
  const postShotScrollRawRef = useRef(0);
  const postShotStartRef = useRef<number | null>(null);
  /** Screen box for path coords — captured at the rim (paths are drawn in the shot scene). */
  const frozenCoordRectRef = useRef<DOMRect | null>(null);
  const frozenKnockDocumentRectRef = useRef<{
    left: number;
    top: number;
    width: number;
    height: number;
  } | null>(null);

  const showEditor = import.meta.env.DEV;
  const scrollDebug = useBasketballScrollDebug();

  const shotComplete = shotProgress >= SHOT_DONE;
  const postShotScroll = normalizePostShotScroll(
    postShotScrollRaw,
    postShotStartRef.current,
  );
  const bounceMotion = computeBounceMotion(
    shotProgress,
    cardReveal,
    postShotScroll,
    arcStartCardReveal,
  );
  const showInkBottle = shotComplete && cardReveal >= CARD_BOUNCE_START - 0.05;

  const ballPose = computeBallPose(
    pathDoc,
    shotProgress,
    bounceMotion,
    bottleLocked && showInkBottle ? bottlePosition : null,
    cardReveal,
  );

  const hasLockedPath = getFullAnimationPath(pathDoc).length >= 2;
  const ballMoving =
    shotProgress > 0.008 ||
    (shotComplete &&
      (postShotScroll > 0.008 ||
        bounceMotion.fallT > 0.008 ||
        bounceMotion.arcT > 0.008));
  const ballHitInk =
    bottleLocked && shouldHideBallAfterInk(cardReveal, bounceMotion, true);
  const showBall =
    ballActive &&
    hasLockedPath &&
    ballMoving &&
    ballPose.visible &&
    !ballHitInk;

  const debugSnapshot = {
    shotProgress,
    cardReveal,
    bounceMotion,
    ballActive,
    showBall,
    hasLockedPath,
    shotComplete,
    bottleLocked,
  };

  useBasketballDebugLogger(scrollDebug, debugSnapshot);

  useEffect(() => {
    if (!shotComplete) {
      setArcStartCardReveal(null);
      return;
    }

    if (
      arcStartCardReveal == null &&
      bounceMotion.fallT >= 0.995 &&
      cardReveal < CARD_BOUNCE_START
    ) {
      setArcStartCardReveal(cardReveal);
    }
  }, [arcStartCardReveal, bounceMotion.fallT, cardReveal, shotComplete]);

  useLayoutEffect(() => {
    const knock = knockSceneRef.current;
    if (!knock) return;

    if (shotProgress >= SHOT_DONE) {
      if (!frozenCoordRectRef.current) {
        const rect = knock.getBoundingClientRect();
        frozenCoordRectRef.current = rect;
        frozenKnockDocumentRectRef.current = {
          left: rect.left + window.scrollX,
          top: rect.top + window.scrollY,
          width: rect.width,
          height: rect.height,
        };
      }
    } else if (shotProgress < 0.35) {
      frozenCoordRectRef.current = null;
      frozenKnockDocumentRectRef.current = null;
    }
  }, [shotProgress, cardReveal]);

  const viewportBallPose = resolveViewportBallPose({
    doc: pathDoc,
    shotProgress,
    motion: bounceMotion,
    cardRevealProgress: cardReveal,
    coordRect: shotComplete ? frozenCoordRectRef.current : null,
    liveKnockSceneEl: knockSceneRef.current,
    bottle: bottleLocked && showInkBottle ? bottlePosition : null,
  });
  const documentBallPose =
    bounceMotion.arcT > 0 && frozenKnockDocumentRectRef.current
      ? {
          ...ballPose,
          x:
            frozenKnockDocumentRectRef.current.left +
            (ballPose.x / 100) * frozenKnockDocumentRectRef.current.width,
          y:
            frozenKnockDocumentRectRef.current.top +
            (ballPose.y / 100) * frozenKnockDocumentRectRef.current.height,
        }
      : null;

  const scrollFlip = flipProgressFromCard(cardReveal);

  const handleDocChange = useCallback((doc: PathDocument) => {
    clearPathMathCache();
    setPathDoc(doc);
    savePathDocument(doc);
  }, []);

  useEffect(() => {
    clearPathMathCache();
    setPathDoc(ensureShotSegment(loadPathDocument()));
  }, []);

  const triggerPour = useCallback(() => {
    if (bloomFiredRef.current) return;
    const bottleEl = bottleWrapRef.current;
    const cardEl = cardRef.current;
    if (!bottleEl || !cardEl) return;

    bloomFiredRef.current = true;
    setScrollHint(false);
    setPourOrigin(mouthOriginInCard(bottleEl, cardEl));
    setPourTrigger((t) => t + 1);
  }, []);

  const handleInkReady = useCallback(() => {
    setReplayVisible(true);
  }, []);

  useEffect(() => {
    if (scrollFlip <= 0) {
      setKnocked(false);
      return;
    }
    if (!knockedRef.current) {
      knockedRef.current = true;
      setKnocked(true);
    }
    setFlipProgress(scrollFlip);

    if (shouldPourFromFlip(scrollFlip)) {
      setDropping(true);
      triggerPour();
    }
  }, [scrollFlip, triggerPour]);

  useEffect(() => {
    const master = masterRef.current;
    const bridge = shotBridgeRef.current;
    const shotStage = shotStageRef.current;
    const journeyStage = journeyStageRef.current;
    const revealZone = revealZoneRef.current;
    if (!master || !bridge || !shotStage) return;

    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        id: "basketball-zone",
        trigger: master,
        start: "top bottom",
        end: "bottom top",
        onEnter: () => setBallActive(true),
        onLeaveBack: () => {
          setBallActive(false);
          setShotProgress(0);
          setCardReveal(0);
          setArcStartCardReveal(null);
          frozenKnockDocumentRectRef.current = null;
          setPostShotScrollRaw(0);
          postShotScrollRawRef.current = 0;
          postShotStartRef.current = null;
          frozenCoordRectRef.current = null;
          knockedRef.current = false;
          bloomFiredRef.current = false;
          setKnocked(false);
          setFlipProgress(0);
          setDropping(false);
        },
      });

      /* Phase 1 — page scrolls to hoop; phase 2 — pin: only ball moves into basket */
      ScrollTrigger.create({
        id: "basketball-shot",
        trigger: bridge,
        start: "top top",
        end: "+=75%",
        pin: shotStage,
        pinSpacing: true,
        scrub: 0.55,
        invalidateOnRefresh: true,
        anticipatePin: 1,
        onUpdate: (self) => {
          setShotProgress(self.progress);
          if (self.progress < SHOT_DONE) {
            postShotStartRef.current = null;
          }
          if (
            self.progress >= SHOT_DONE &&
            postShotStartRef.current == null
          ) {
            postShotStartRef.current = postShotScrollRawRef.current;
          }
          if (
            self.progress >= SHOT_DONE &&
            knockSceneRef.current &&
            !frozenCoordRectRef.current
          ) {
            const rect = knockSceneRef.current.getBoundingClientRect();
            frozenCoordRectRef.current = rect;
            frozenKnockDocumentRectRef.current = {
              left: rect.left + window.scrollX,
              top: rect.top + window.scrollY,
              width: rect.width,
              height: rect.height,
            };
          }
        },
      });

      /* Post-shot fall (Bounce 1) runs until the card reaches the bounce-start area. */
      if (journeyStage && revealZone) {
        ScrollTrigger.create({
          id: "basketball-post-shot-fall",
          trigger: journeyStage,
          start: "top bottom",
          endTrigger: revealZone,
          end: "top 66%",
          scrub: 0.55,
          invalidateOnRefresh: true,
          onUpdate: (self) => {
            postShotScrollRawRef.current = self.progress;
            setPostShotScrollRaw(self.progress);
            if (shotProgress >= SHOT_DONE && postShotStartRef.current == null) {
              postShotStartRef.current = self.progress;
            }
          },
        });
      }

      if (journeyStage) {
        ScrollTrigger.create({
          id: "basketball-bounce",
          trigger: journeyStage,
          start: "top top",
          end: "+=58%",
          pin: journeyStage,
          pinSpacing: true,
          scrub: 0.55,
          invalidateOnRefresh: true,
          anticipatePin: 1,
        });
      }

      /* Card visibility: fall Bounce 1 ends at 34%; Bounces 2–5 + ink by 45% */
      if (revealZone) {
        ScrollTrigger.create({
          id: "basketball-card-reveal",
          trigger: revealZone,
          start: "top bottom",
          end: "bottom top",
          scrub: 0.55,
          invalidateOnRefresh: true,
          onUpdate: (self) => setCardReveal(self.progress),
        });
      }
    });

    const refresh = () => ScrollTrigger.refresh();
    const t1 = requestAnimationFrame(refresh);
    const t2 = window.setTimeout(refresh, 400);
    window.addEventListener("load", refresh);

    return () => {
      cancelAnimationFrame(t1);
      window.clearTimeout(t2);
      ctx.revert();
      window.removeEventListener("load", refresh);
    };
  }, [pathDoc.shot?.locked, pathDoc.bounces.length]);

  const handleBottlePositionChange = useCallback(
    (pos: BottlePosition) => {
      setBottlePosition(pos);
      if (bottleLocked) saveBottlePosition(pos);
    },
    [bottleLocked],
  );

  const handleStartMoveBottle = useCallback(() => {
    setIsMovingBottle((v) => !v);
  }, []);

  const handleLockBottle = useCallback(() => {
    saveBottlePosition(bottlePosition);
    setBottleLocked(true);
    setIsMovingBottle(false);
  }, [bottlePosition]);

  const handleResetBottle = useCallback(() => {
    setBottlePosition(DEFAULT_BOTTLE_POSITION);
    setBottleLocked(false);
    setIsMovingBottle(false);
  }, []);

  const replay = useCallback(() => {
    setReplayVisible(false);
    knockedRef.current = false;
    bloomFiredRef.current = false;
    setKnocked(false);
    setShotProgress(0);
    setCardReveal(0);
    setArcStartCardReveal(null);
    frozenKnockDocumentRectRef.current = null;
    setPostShotScrollRaw(0);
    postShotScrollRawRef.current = 0;
    postShotStartRef.current = null;
    frozenCoordRectRef.current = null;
    setDropping(false);
    setFlipProgress(0);
    setPourOrigin(null);
    setPourTrigger(0);
    setScrollHint(true);

    requestAnimationFrame(() => {
      setPlayKey((k) => k + 1);
      ScrollTrigger.refresh();
    });
  }, []);

  return (
    <div
      ref={masterRef}
      className="ink-splat-scroll-zone"
      data-basketball-zone
      data-shot-pct={Math.round(shotProgress * 100)}
      data-card-pct={Math.round(cardReveal * 100)}
      data-fall-pct={Math.round(bounceMotion.fallT * 100)}
      data-arc-pct={Math.round(bounceMotion.arcT * 100)}
      data-ball-visible={showBall ? "1" : "0"}
    >
      {scrollDebug ? (
        <BasketballScrollDebugPanel snapshot={debugSnapshot} />
      ) : null}

      {scrollHint && ballActive && pourTrigger === 0 && (
        <p className="ink-splat-scroll-hint mb-2 text-center font-mono text-[10px] tracking-[0.2em] text-slate-500">
          {showEditor
            ? "Lock Shot + Bounces · scroll sinks the shot (page holds), then journey scrolls ink + card"
            : "Scroll — sink the shot, bounce to the ink, spill your story"}
        </p>
      )}

      {showEditor ? (
        <div className="mx-auto mb-2 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            className="font-mono text-[9px] tracking-wider text-violet-400/80 underline-offset-2 hover:text-violet-300 hover:underline"
            onClick={() => {
              const payload = JSON.stringify(pathDoc, null, 2);
              void navigator.clipboard?.writeText(payload);
              console.info("[basketball paths]", pathDoc);
            }}
          >
            Copy path JSON
          </button>
          <span className="font-mono text-[9px] text-slate-500">
            Card {Math.round(cardReveal * 100)}% · fall{" "}
            {shotComplete ? Math.round(bounceMotion.fallT * 100) : 0}% · arc{" "}
            {Math.round(bounceMotion.arcT * 100)}%
          </span>
        </div>
      ) : null}

      {/* Shot: hoop only — pinned while ball travels the shot path */}
      <div ref={shotBridgeRef} className="ink-story-bridge ink-story-bridge--shot">
        <div
          ref={shotStageRef}
          className="ink-story-bridge__pin ink-story-bridge__pin--shot-only"
        >
          <BasketballKnockScene
            ref={knockSceneRef}
            doc={pathDoc}
            onDocChange={handleDocChange}
          />
        </div>
      </div>

      {/* Journey: scroll reveals bottle, bounces, then white card */}
      <div ref={journeyRef} className="ink-story-journey">
        <div ref={journeyStageRef} className="ink-story-journey__stage">
          <div className="ink-story-bridge__pin ink-story-bridge__pin--with-bottle">
            <div
              ref={bounceSceneRef}
              className="basketball-knock-scene basketball-knock-scene--bounce-coords"
              aria-hidden
            />

            {(showInkBottle || showEditor) && (
              <InkBottlePlacement
                stageRef={journeyStageRef}
                bottleWrapRef={bottleWrapRef}
                visible={showInkBottle || showEditor}
                position={bottlePosition}
                isLocked={bottleLocked}
                isMoving={isMovingBottle}
                flipProgress={flipProgress}
                dropping={dropping}
                knocked={knocked}
                showEditor={showEditor}
                onStartMove={handleStartMoveBottle}
                onLock={handleLockBottle}
                onReset={handleResetBottle}
                onPositionChange={handleBottlePositionChange}
              />
            )}
          </div>
        </div>

        <div ref={revealZoneRef} className="ink-splat-pour-block mx-auto max-w-4xl">
          <div className="cin-showcase about-me-card">
            <div className="cin-showcase__stage-wrap cin-showcase__stage-wrap--pour">
              <div
                ref={cardRef}
                className="relative min-h-[min(580px,82vh)] w-full bg-white"
              >
                <Suspense fallback={<StageFallback />}>
                  <InkBloomSplatCard
                    key={playKey}
                    playKey={playKey}
                    waitForPour
                    pourTrigger={pourTrigger}
                    pourOrigin={pourOrigin}
                    onReady={handleInkReady}
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
                    className="cin-showcase__replay cin-showcase__replay--on-light"
                    aria-label="Replay animation"
                  >
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
                      <path
                        d="M10 6A4 4 0 1 1 6 2V0L9 3L6 6V4A2 2 0 1 0 8 6"
                        stroke="currentColor"
                        strokeWidth="1.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    Replay
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showBall ? (
        documentBallPose ? (
          <BasketballBall pose={documentBallPose} mode="document" />
        ) : (
          <BasketballBall pose={viewportBallPose} mode="viewport" />
        )
      ) : null}

      <div className="ink-splat-scroll-runway ink-splat-scroll-runway--short" aria-hidden />
    </div>
  );
}
