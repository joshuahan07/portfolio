import type { BottlePosition } from "./inkBottlePositionStorage";
import type { BallPose } from "./basketballKnockMath";
import type { PathPoint } from "./basketballPathStorage";
import type { PathDocument } from "./basketballPathDocument";
import { splitLockedBounceSegments } from "./basketballPathDocument";
import {
  easeDropT,
  scenePoseToViewportRect,
} from "./scenePoseToViewport";
import {
  ballPoseAlongPath,
  ballPoseAlongSegmentChain,
} from "./basketballPathMath";

function clamp01(t: number) {
  return Math.max(0, Math.min(1, t));
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

export const SHOT_DONE = 0.98;

/** Card % where Bounces 2–5 begin (Bounce 1 fall ends here). */
export const CARD_BOUNCE_START = 0.19;
export const CARD_INK_HIT = 0.45;

export const FLIP_SCROLL_START = 0.38;
export const FLIP_SCROLL_END = CARD_INK_HIT;

const INK_ROLL_START = 0.78;
/** Lerp shot rim → fall path over this portion of fallT (no snap at 8%). */
const SHOT_FALL_SEAM = 1;

export type BounceMotion = {
  fallT: number;
  /** Keeps rotation alive if the fall position reaches the end before Bounce 2 visibly moves. */
  fallSpinT: number;
  arcT: number;
};

export function flipProgressFromCard(cardRevealProgress: number): number {
  const p = clamp01(cardRevealProgress);
  if (p < FLIP_SCROLL_START) return 0;
  return clamp01((p - FLIP_SCROLL_START) / (FLIP_SCROLL_END - FLIP_SCROLL_START));
}

export function shouldPourFromCard(cardRevealProgress: number): boolean {
  return cardRevealProgress >= FLIP_SCROLL_END - 0.01;
}

/**
 * Fall (Bounce 1): shot 100% -> card 19%.
 * Arc (Bounces 2-5): card 19% -> 45%.
 */
export function computeBounceMotion(
  shotProgress: number,
  cardRevealProgress: number,
  postShotScroll = 0,
  arcStartCardProgress: number | null = null,
): BounceMotion {
  const shotP = clamp01(shotProgress);
  if (shotP < SHOT_DONE) {
    return { fallT: 0, fallSpinT: 0, arcT: 0 };
  }

  const cardP = clamp01(cardRevealProgress);
  const journeyP = clamp01(postShotScroll);
  const arcStartP =
    arcStartCardProgress == null
      ? CARD_BOUNCE_START
      : clamp01(Math.min(CARD_BOUNCE_START, arcStartCardProgress));

  if (cardP < arcStartP) {
    const cardFall = cardP > 0.004 ? clamp01(cardP / arcStartP) : 0;
    const fallT = clamp01(Math.max(cardFall, journeyP));
    return {
      fallT,
      fallSpinT: fallT + cardFall * 0.75,
      arcT: 0,
    };
  }

  if (cardP >= CARD_INK_HIT) {
    return { fallT: 1, fallSpinT: 1, arcT: 1 };
  }

  const span = CARD_INK_HIT - arcStartP;
  const arcT = span > 0 ? clamp01((cardP - arcStartP) / span) : 0;
  return { fallT: 1, fallSpinT: 1, arcT };
}

export function bounceProgressFromCard(
  shotProgress: number,
  cardRevealProgress: number,
  postShotScroll = 0,
): number {
  const { fallT, arcT } = computeBounceMotion(
    shotProgress,
    cardRevealProgress,
    postShotScroll,
  );
  if (arcT > 0) return 0.5 + arcT * 0.5;
  return fallT * 0.5;
}

export function shouldHideBallAfterInk(
  _cardRevealProgress: number,
  motion: BounceMotion,
  hasBottle: boolean,
): boolean {
  if (!hasBottle) return false;
  return clamp01(motion.arcT) >= 0.98;
}

function applyFallSpin(pose: BallPose, fallT: number): BallPose {
  const t = Math.max(0, fallT);
  const dropSpin = t * 1440;
  const wobble = Math.sin(t * Math.PI * 9) * 18;
  return {
    ...pose,
    rotation: pose.rotation + dropSpin + wobble,
  };
}

function applyArcSpin(pose: BallPose, arcT: number): BallPose {
  const t = clamp01(arcT);
  const spinDeg = 0.55 * 360 * t;
  const wobble = Math.sin(t * Math.PI * 6.5) * 11;
  return {
    ...pose,
    rotation: pose.rotation + spinDeg + wobble,
  };
}

/** Smooth shot rim → current point on fall path (whole fall, not just first 8%). */
function poseOnFallSegment(
  shotAnchors: PathPoint[] | null,
  fallSegment: PathPoint[],
  fallT: number,
  shotComplete: boolean,
): BallPose {
  const along = ballPoseAlongPath(fallSegment, clamp01(fallT));

  if (!shotComplete || !shotAnchors || fallT <= 0) {
    return along;
  }

  const shotEnd = ballPoseAlongPath(shotAnchors, 1);
  const seam = easeDropT(clamp01(fallT / SHOT_FALL_SEAM));

  return {
    x: lerp(shotEnd.x, along.x, seam),
    y: lerp(shotEnd.y, along.y, seam),
    rotation: lerp(shotEnd.rotation, along.rotation, seam),
    scale: 1,
    visible: true,
  };
}

function blendFallIntoArc(
  fallEnd: BallPose,
  arcPose: BallPose,
  arcT: number,
): BallPose {
  const seam = easeDropT(clamp01(arcT / 0.12));
  return {
    x: lerp(fallEnd.x, arcPose.x, seam),
    y: lerp(fallEnd.y, arcPose.y, seam),
    rotation: lerp(fallEnd.rotation, arcPose.rotation, seam),
    scale: 1,
    visible: true,
  };
}

export function computeBallPose(
  doc: PathDocument,
  shotProgress: number,
  motion: BounceMotion,
  bottle: BottlePosition | null,
  cardRevealProgress = 0,
): BallPose {
  const shotAnchors =
    doc.shot?.locked && doc.shot.anchors.length >= 2 ? doc.shot.anchors : null;
  const { fall: fallSegment, arcs: arcSegments } = splitLockedBounceSegments(doc);
  const hasPath =
    shotAnchors != null || fallSegment != null || arcSegments.length > 0;

  if (!hasPath) {
    return { x: 50, y: 50, rotation: 0, scale: 1, visible: false };
  }

  const shotP = clamp01(shotProgress);
  const { fallT, fallSpinT, arcT } = motion;
  const cardP = clamp01(cardRevealProgress);
  const shotComplete = shotP >= SHOT_DONE;

  let pose: BallPose;

  if (!shotComplete && shotAnchors) {
    pose = ballPoseAlongPath(shotAnchors, Math.min(shotP / SHOT_DONE, 1));
  } else if (arcT > 0 && arcSegments.length > 0) {
    const arcPose = ballPoseAlongSegmentChain(arcSegments, clamp01(arcT));
    if (fallSegment && arcT < 0.12) {
      const fallEnd = ballPoseAlongPath(fallSegment, 1);
      pose = blendFallIntoArc(fallEnd, arcPose, arcT);
    } else {
      pose = arcPose;
    }
  } else if (fallSegment) {
    pose = poseOnFallSegment(
      shotAnchors,
      fallSegment,
      fallT,
      shotComplete,
    );
  } else if (shotAnchors) {
    pose = ballPoseAlongPath(shotAnchors, 1);
  } else if (arcSegments.length > 0) {
    pose = ballPoseAlongSegmentChain(arcSegments, 0);
  } else {
    pose = { x: 50, y: 50, rotation: 0, scale: 1, visible: false };
  }

  const inkPhase = arcT > 0 || (fallT >= 1 && arcSegments.length === 0);
  const rollDriver = arcSegments.length > 0 ? arcT : fallT;

  if (bottle && inkPhase && rollDriver >= INK_ROLL_START) {
    const rollT = easeOutCubic(
      clamp01((rollDriver - INK_ROLL_START) / (1 - INK_ROLL_START)),
    );
    const hitInk = rollT >= 0.92;

    const rolled = {
      x: lerp(pose.x, bottle.x * 100, rollT),
      y: lerp(pose.y, bottle.y * 100, rollT),
      rotation: pose.rotation + rollT * 90,
      scale: hitInk ? 0.35 : 1,
      visible: !hitInk,
    };
    return arcT > 0 ? applyArcSpin(rolled, arcT) : applyFallSpin(rolled, fallSpinT);
  }

  if (arcT > 0) {
    pose = applyArcSpin(pose, arcT);
  } else if (shotComplete && fallT > 0) {
    pose = applyFallSpin(pose, fallSpinT);
  }

  if (bottle && shouldHideBallAfterInk(cardP, motion, true)) {
    return { ...pose, visible: false, scale: 0 };
  }

  return pose;
}

type ViewportBallPoseInput = {
  doc: PathDocument;
  shotProgress: number;
  motion: BounceMotion;
  cardRevealProgress: number;
  coordRect: DOMRect | null;
  liveKnockSceneEl: HTMLElement | null;
  bottle: BottlePosition | null;
};

export function resolveViewportBallPose(input: ViewportBallPoseInput): BallPose {
  const {
    doc,
    shotProgress,
    motion,
    cardRevealProgress,
    coordRect,
    liveKnockSceneEl,
    bottle,
  } = input;

  const pose = computeBallPose(
    doc,
    shotProgress,
    motion,
    bottle,
    cardRevealProgress,
  );

  const shotComplete = clamp01(shotProgress) >= SHOT_DONE;

  if (shotComplete && coordRect) {
    return scenePoseToViewportRect(coordRect, pose);
  }

  if (liveKnockSceneEl) {
    const scene = liveKnockSceneEl.classList.contains("basketball-knock-scene")
      ? liveKnockSceneEl
      : liveKnockSceneEl.querySelector<HTMLElement>(".basketball-knock-scene");
    return scenePoseToViewportRect(
      (scene ?? liveKnockSceneEl).getBoundingClientRect(),
      pose,
    );
  }

  return pose;
}
