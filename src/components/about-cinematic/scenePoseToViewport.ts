import type { BallPose } from "./basketballKnockMath";
import type { BottlePosition } from "./inkBottlePositionStorage";

/** Share of bounce scroll used only for the gravity drop (rim → bounce path start). */
export const SHOT_TO_BOUNCE_BLEND = 0.32;

function clamp01(t: number) {
  return Math.max(0, Math.min(1, t));
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function easeInQuad(t: number) {
  return t * t;
}

function easeInCubic(t: number) {
  return t * t * t;
}

function resolveSceneEl(sceneEl: HTMLElement | null): HTMLElement | null {
  if (!sceneEl) return null;
  if (sceneEl.classList.contains("basketball-knock-scene")) return sceneEl;
  return sceneEl.querySelector<HTMLElement>(".basketball-knock-scene");
}

/** Map path % to viewport % using a known screen rect (paths drawn in 0–1 of this box). */
export function scenePoseToViewportRect(
  rect: DOMRect | null,
  pose: BallPose,
): BallPose {
  if (!rect || typeof window === "undefined") return pose;
  if (rect.width <= 0 || rect.height <= 0) return pose;

  const xPx = rect.left + (pose.x / 100) * rect.width;
  const yPx = rect.top + (pose.y / 100) * rect.height;

  return {
    ...pose,
    x: (xPx / window.innerWidth) * 100,
    y: (yPx / window.innerHeight) * 100,
  };
}

/** Map path % (relative to .basketball-knock-scene) to viewport % for fixed overlay. */
export function scenePoseToViewport(
  sceneEl: HTMLElement | null,
  pose: BallPose,
): BallPose {
  if (!sceneEl || typeof window === "undefined") return pose;
  const scene = resolveSceneEl(sceneEl);
  return scenePoseToViewportRect(
    (scene ?? sceneEl).getBoundingClientRect(),
    pose,
  );
}

export function easeDropT(t: number): number {
  return easeInCubic(clamp01(t));
}

/** Map bottle placement (journey stage %) into bounce/path scene %. */
export function bottleInPathSpace(
  bottle: BottlePosition,
  pathRect: DOMRect,
  stageEl: HTMLElement,
): BottlePosition {
  const stageRect = stageEl.getBoundingClientRect();
  if (
    pathRect.width <= 0 ||
    pathRect.height <= 0 ||
    stageRect.width <= 0 ||
    stageRect.height <= 0
  ) {
    return bottle;
  }

  const bx = stageRect.left + bottle.x * stageRect.width;
  const by = stageRect.top + bottle.y * stageRect.height;

  return {
    x: Math.max(0.05, Math.min(0.95, (bx - pathRect.left) / pathRect.width)),
    y: Math.max(0.08, Math.min(0.95, (by - pathRect.top) / pathRect.height)),
  };
}

/** Smooth drop after the basket — lerps viewport position between shot and bounce coord boxes. */
export function blendPosesToViewport(
  fromScene: HTMLElement | null,
  toScene: HTMLElement | null,
  fromPose: BallPose,
  toPose: BallPose,
  blend01: number,
): BallPose {
  const t = easeInQuad(clamp01(blend01));
  if (t <= 0) return scenePoseToViewport(fromScene, fromPose);
  if (t >= 1) return scenePoseToViewport(toScene, toPose);

  const a = scenePoseToViewport(fromScene, fromPose);
  const b = scenePoseToViewport(toScene, toPose);

  return {
    x: lerp(a.x, b.x, t),
    y: lerp(a.y, b.y, t),
    rotation: lerp(a.rotation, b.rotation, t),
    scale: 1,
    visible: fromPose.visible && toPose.visible,
  };
}
