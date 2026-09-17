import {
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
import AboutPhosphorCard from "./AboutPhosphorCard";
import { getFullAnimationPath } from "./basketballPathDocument";
import { resolveViewportBallPose } from "./basketballScrollPhases";
import {
  SHOT_DONE,
  CARD_BOUNCE_START,
  computeBounceMotion,
  computeBallPose,
} from "./basketballScrollPhases";
import {
  ensureShotSegment,
  loadPathDocument,
  savePathDocument,
  type PathDocument,
} from "./basketballPathDocument";
import { clearPathMathCache } from "./basketballPathMath";
import {
  useBasketballScrollDebug,
  useBasketballDebugLogger,
} from "./useBasketballScrollDebug";

gsap.registerPlugin(ScrollTrigger);

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

  const [pathDoc, setPathDoc] = useState<PathDocument>(() =>
    ensureShotSegment(loadPathDocument()),
  );
  const [shotProgress, setShotProgress] = useState(0);
  const [cardReveal, setCardReveal] = useState(0);
  const [postShotScrollRaw, setPostShotScrollRaw] = useState(0);
  const [arcStartCardReveal, setArcStartCardReveal] = useState<number | null>(
    null,
  );
  const [ballActive, setBallActive] = useState(false);

  const postShotScrollRawRef = useRef(0);
  const postShotStartRef = useRef<number | null>(null);
  /** Screen box for the shot path — captured at the rim. */
  const frozenCoordRectRef = useRef<DOMRect | null>(null);
  /** Bounce paths render in the journey coord box — freeze when fall/arc starts. */
  const frozenBounceCoordRectRef = useRef<DOMRect | null>(null);
  const frozenBounceDocumentRectRef = useRef<{
    left: number;
    top: number;
    width: number;
    height: number;
  } | null>(null);

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
  const ballPose = computeBallPose(
    pathDoc,
    shotProgress,
    bounceMotion,
    null,
    cardReveal,
  );

  const hasLockedPath = getFullAnimationPath(pathDoc).length >= 2;
  const ballMoving =
    shotProgress > 0.008 ||
    (shotComplete &&
      (postShotScroll > 0.008 ||
        bounceMotion.fallT > 0.008 ||
        bounceMotion.arcT > 0.008));
  const showBall =
    ballActive &&
    hasLockedPath &&
    ballMoving &&
    ballPose.visible;

  const debugSnapshot = {
    shotProgress,
    cardReveal,
    bounceMotion,
    ballActive,
    showBall,
    hasLockedPath,
    shotComplete,
  };

  useBasketballDebugLogger(scrollDebug, debugSnapshot);

  useEffect(() => {
    if (!shotComplete) {
      setArcStartCardReveal(null);
      frozenBounceCoordRectRef.current = null;
      frozenBounceDocumentRectRef.current = null;
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
        frozenCoordRectRef.current = knock.getBoundingClientRect();
      }
    } else if (shotProgress < 0.35) {
      frozenCoordRectRef.current = null;
    }
  }, [shotProgress, cardReveal]);

  useLayoutEffect(() => {
    if (bounceMotion.arcT <= 0) {
      frozenBounceCoordRectRef.current = null;
      frozenBounceDocumentRectRef.current = null;
      return;
    }
    if (!frozenBounceDocumentRectRef.current) {
      const scene = bounceSceneRef.current;
      if (scene) {
        const rect = scene.getBoundingClientRect();
        frozenBounceCoordRectRef.current = rect;
        frozenBounceDocumentRectRef.current = {
          left: rect.left + window.scrollX,
          top: rect.top + window.scrollY,
          width: rect.width,
          height: rect.height,
        };
      }
    }
  }, [bounceMotion.arcT]);

  const useDocumentBall =
    shotComplete &&
    bounceMotion.arcT > 0 &&
    frozenBounceDocumentRectRef.current != null;

  const viewportBallPose = resolveViewportBallPose({
    doc: pathDoc,
    shotProgress,
    motion: bounceMotion,
    cardRevealProgress: cardReveal,
    coordRect:
      bounceMotion.arcT > 0
        ? frozenBounceCoordRectRef.current ?? frozenCoordRectRef.current
        : frozenCoordRectRef.current,
    liveKnockSceneEl: knockSceneRef.current,
    bottle: null,
  });
  const documentBallPose =
    useDocumentBall && frozenBounceDocumentRectRef.current
      ? {
          ...ballPose,
          x:
            frozenBounceDocumentRectRef.current.left +
            (ballPose.x / 100) * frozenBounceDocumentRectRef.current.width,
          y:
            frozenBounceDocumentRectRef.current.top +
            (ballPose.y / 100) * frozenBounceDocumentRectRef.current.height,
        }
      : null;

  const handleDocChange = useCallback((doc: PathDocument) => {
    clearPathMathCache();
    setPathDoc(doc);
    savePathDocument(doc);
  }, []);

  useEffect(() => {
    clearPathMathCache();
    setPathDoc(ensureShotSegment(loadPathDocument()));
  }, []);

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
          frozenBounceCoordRectRef.current = null;
          frozenBounceDocumentRectRef.current = null;
          setPostShotScrollRaw(0);
          postShotScrollRawRef.current = 0;
          postShotStartRef.current = null;
          frozenCoordRectRef.current = null;
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

      /* Card visibility: fall Bounce 1 ends at 34%; Bounces 2–5 + ink by 45%.
         Progress 0.5 is exactly when the card is centered in the viewport
         (true regardless of card height for a "top bottom" -> "bottom top" trigger). */
      if (revealZone) {
        ScrollTrigger.create({
          id: "basketball-card-reveal",
          trigger: revealZone,
          start: "top bottom",
          end: "bottom top",
          scrub: 0.55,
          invalidateOnRefresh: true,
          onUpdate: (self) => {
            setCardReveal(self.progress);
          },
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
          </div>
        </div>

        <div ref={revealZoneRef} className="ink-splat-pour-block mx-auto max-w-4xl">
          <div className="cin-showcase about-me-card">
            <div className="cin-showcase__stage-wrap cin-showcase__stage-wrap--pour">
              <AboutPhosphorCard />
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
