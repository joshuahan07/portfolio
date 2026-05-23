/** Scroll progress 0–1 for the hero → ink knock sequence. */

export type BallPose = {
  x: number;
  y: number;
  rotation: number;
  scale: number;
  visible: boolean;
};

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function clamp01(t: number) {
  return Math.max(0, Math.min(1, t));
}

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

/** Ball position in % of the pinned stage (0–100). */
export function ballPoseForProgress(progress: number): BallPose {
  const p = clamp01(progress);

  if (p < 0.38) {
    const t = easeOutCubic(p / 0.38);
    const x = lerp(10, 74, t);
    const y = lerp(72, 30, t) - Math.sin(t * Math.PI) * 18;
    return {
      x,
      y,
      rotation: lerp(-40, 220, t),
      scale: 1,
      visible: true,
    };
  }

  if (p < 0.44) {
    return { x: 74, y: 30, rotation: 220, scale: 0.92, visible: true };
  }

  if (p < 0.9) {
    const t = easeOutCubic((p - 0.44) / 0.46);
    const x = lerp(74, 50, t);
    const y = lerp(30, 76, t);
    return {
      x,
      y,
      rotation: lerp(220, 420, t),
      scale: lerp(0.92, 1, t),
      visible: true,
    };
  }

  return { x: 50, y: 76, rotation: 420, scale: 1, visible: p < 0.98 };
}

export function hoopGlowForProgress(progress: number): number {
  if (progress < 0.34 || progress > 0.5) return 0;
  return Math.sin(((progress - 0.34) / 0.16) * Math.PI);
}

export function shouldFireKnock(progress: number): boolean {
  return progress >= 0.9;
}
