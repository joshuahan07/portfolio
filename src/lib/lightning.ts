import {
  ELECTRIC_CORE_RGB,
  ELECTRIC_GLOW_RGB,
  ELECTRIC_RGB,
  electricRgba,
} from "@/lib/electricTheme";

export interface Point {
  x: number;
  y: number;
}

export interface LightningOptions {
  segments?: number;
  spread?: number;
  alpha?: number;
  coreWidth?: number;
  glowWidth?: number;
  coreColor?: string;
  glowColor?: string;
  branchDepth?: number;
  branchChance?: number;
}

export interface StrikeOptions extends LightningOptions {
  frames?: number;
  impactRadius?: number;
  lingerFrames?: number;
  onComplete?: () => void;
  /** Fires once when the first bolt nearly reaches the target. */
  onReachTarget?: () => void;
  /** Delay each origin’s bolt slightly (0–1 progress step). */
  staggerStep?: number;
}

export type LightningOrigin = { x: number; y: number };

function strikePositionsAlongSpan(span: number, center: number): number[] {
  const edge = Math.max(32, span * 0.04);
  const centerJitter = rnd(-22, 22);

  return [
    edge,
    span * 0.18,
    span * 0.34,
    center + centerJitter,
    span * 0.66,
    span * 0.82,
    span - edge,
  ];
}

/** Spread strike origins along the top of the viewport. */
export function buildTopLightningOrigins(
  viewportW: number,
  orbCenterX?: number,
): LightningOrigin[] {
  const topY = 8;
  const cx = orbCenterX ?? viewportW / 2;

  return strikePositionsAlongSpan(viewportW, cx).map((x, i) => ({
    x,
    y: topY + (i % 2) * 2,
  }));
}

/** Origins around the viewport perimeter (top, bottom, left, right). */
export function buildStrikeOrigins(
  viewportW: number,
  viewportH: number,
  orbCenterX?: number,
  orbCenterY?: number,
): LightningOrigin[] {
  const inset = 8;
  const topY = inset;
  const bottomY = viewportH - inset;
  const leftX = inset;
  const rightX = viewportW - inset;
  const cx = orbCenterX ?? viewportW / 2;
  const cy = orbCenterY ?? viewportH / 2;

  const xs = strikePositionsAlongSpan(viewportW, cx);
  const ys = strikePositionsAlongSpan(viewportH, cy);

  const top = xs.map((x, i) => ({ x, y: topY + (i % 2) * 2 }));
  const bottom = xs.map((x, i) => ({ x, y: bottomY - (i % 2) * 2 }));
  const left = ys.map((y, i) => ({ x: leftX + (i % 2) * 2, y }));
  const right = ys.map((y, i) => ({ x: rightX - (i % 2) * 2, y }));

  return [...top, ...bottom, ...left, ...right];
}

function rnd(a: number, b: number): number {
  return a + Math.random() * (b - a);
}

export function makeLightningPath(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  segments = 18,
  spread = 60,
): Point[] {
  const pts: Point[] = [{ x: x1, y: y1 }];
  for (let i = 1; i < segments; i++) {
    const t = i / segments;
    pts.push({
      x: x1 + (x2 - x1) * t + rnd(-spread * 0.52, spread * 0.52),
      y: y1 + (y2 - y1) * t + rnd(-spread * 0.22, spread * 0.22),
    });
  }
  pts.push({ x: x2, y: y2 });
  return pts;
}

export function drawLightningBolt(
  ctx: CanvasRenderingContext2D,
  pts: Point[],
  opts: LightningOptions = {},
): void {
  const {
    alpha = 1,
    coreWidth = 0.88,
    glowWidth = 2.35,
    coreColor = electricRgba(ELECTRIC_CORE_RGB, alpha),
    glowColor = electricRgba(ELECTRIC_RGB, alpha * 0.8),
  } = opts;

  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  const trace = () => {
    ctx.beginPath();
    pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  };

  trace();
  ctx.strokeStyle = glowColor;
  ctx.lineWidth = glowWidth * 1;
  ctx.stroke();

  trace();
  ctx.strokeStyle = electricRgba(ELECTRIC_GLOW_RGB, alpha * 0.75);
  ctx.lineWidth = glowWidth * 0.42;
  ctx.stroke();

  trace();
  ctx.strokeStyle = coreColor;
  ctx.lineWidth = coreWidth;
  ctx.stroke();

  ctx.restore();
}

export function addBranches(
  ctx: CanvasRenderingContext2D,
  pts: Point[],
  opts: LightningOptions = {},
): void {
  const { branchDepth = 1, branchChance = 0.14, alpha = 1 } = opts;
  if (branchDepth <= 0) return;

  for (let i = 2; i < pts.length - 1; i++) {
    if (Math.random() < branchChance) {
      const bx = pts[i].x + rnd(-28, 28);
      const by = pts[i].y + rnd(10, 36);
      const branch = makeLightningPath(pts[i].x, pts[i].y, bx, by, 4, 8);

      drawLightningBolt(ctx, branch, {
        alpha: alpha * 0.8,
        coreWidth: 0.7,
        glowWidth: 1.85,
        coreColor: electricRgba(ELECTRIC_CORE_RGB, alpha * 0.9),
        glowColor: electricRgba(ELECTRIC_RGB, alpha * 0.7),
      });

      addBranches(ctx, branch, {
        ...opts,
        branchDepth: branchDepth - 1,
        alpha: alpha * 0.5,
      });
    }
  }
}

function slicePath(pts: Point[], progress: number): Point[] {
  const t = Math.max(0, Math.min(1, progress));
  if (pts.length < 2 || t <= 0) return pts.slice(0, 2);
  if (t >= 1) return pts;

  const end = Math.max(2, Math.ceil(pts.length * t));
  return pts.slice(0, end);
}

function drawBoltToward(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  tx: number,
  ty: number,
  boltProgress: number,
  segments: number,
  spread: number,
  intensity: number,
  boltOpts: LightningOptions,
): void {
  if (boltProgress <= 0) return;

  const boltLength = Math.hypot(tx - sx, ty - sy);
  const spreadScaled = Math.max(spread * 0.68, boltLength * 0.046);
  const mainFull = makeLightningPath(sx, sy, tx, ty - 20, segments, spreadScaled);
  const main = slicePath(mainFull, boltProgress);

  drawLightningBolt(ctx, main, {
    alpha: intensity,
    coreWidth: 0.9,
    glowWidth: 2.3,
    coreColor: electricRgba(ELECTRIC_CORE_RGB, intensity),
    glowColor: electricRgba(ELECTRIC_RGB, intensity * 0.85),
    ...boltOpts,
  });

  if (boltProgress > 0.58) {
    addBranches(ctx, main, {
      branchDepth: 1,
      branchChance: 0.14,
      alpha: 0.82 * intensity,
      ...boltOpts,
    });
  }

  if (boltProgress > 0.48) {
    const twinFull = makeLightningPath(
      sx + rnd(-12, 12),
      sy,
      tx + rnd(-6, 6),
      ty - 15,
      Math.floor(segments * 0.8),
      spreadScaled * 0.52,
    );
    const twin = slicePath(twinFull, Math.min(1, (boltProgress - 0.48) / 0.52));
    drawLightningBolt(ctx, twin, {
      alpha: 0.52 * intensity,
      coreWidth: 0.68,
      glowWidth: 1.65,
      coreColor: electricRgba(ELECTRIC_CORE_RGB, 0.95 * intensity),
      glowColor: electricRgba(ELECTRIC_RGB, 0.75 * intensity),
    });
  }
}

export function animateLightningStrike(
  canvas: HTMLCanvasElement,
  tx: number,
  ty: number,
  origins: LightningOrigin[],
  opts: StrikeOptions = {},
): () => void {
  const {
    frames = 28,
    impactRadius = 90,
    lingerFrames = 4,
    onComplete,
    onReachTarget,
    segments = 32,
    spread = 60,
    staggerStep = 0.055,
    ...boltOpts
  } = opts;

  const strikes =
    origins.length > 0 ? origins : [{ x: tx, y: 8 }];

  const maybeCtx = canvas.getContext("2d");
  if (!maybeCtx) return () => {};
  const drawCtx: CanvasRenderingContext2D = maybeCtx;

  let raf = 0;
  let cancelled = false;
  let frame = 0;
  let reachFired = false;

  function boltProgressForOrigin(globalProgress: number, index: number): number {
    const delay = index * staggerStep;
    const span = 1 - delay;
    if (span <= 0) return globalProgress;
    return Math.min(1, Math.max(0, (globalProgress - delay) / span));
  }

  function boltFrame() {
    if (cancelled) return;
    drawCtx.clearRect(0, 0, canvas.width, canvas.height);

    const progress = (frame + 1) / frames;

    const intensityBase = Math.min(0.88, 0.5 + 2.8 / Math.sqrt(strikes.length));

    let maxBoltProgress = 0;

    strikes.forEach((origin, i) => {
      const boltProgress = boltProgressForOrigin(progress, i);
      maxBoltProgress = Math.max(maxBoltProgress, boltProgress);
      const intensity =
        intensityBase + (i === Math.floor(strikes.length / 2) ? 0.12 : 0.06);
      drawBoltToward(
        drawCtx,
        origin.x,
        origin.y,
        tx,
        ty,
        boltProgress,
        segments,
        spread,
        intensity,
        boltOpts,
      );
    });

    if (!reachFired && maxBoltProgress >= 0.88) {
      reachFired = true;
      onReachTarget?.();
    }

    frame++;
    if (frame < frames) {
      raf = requestAnimationFrame(boltFrame);
    } else {
      drawCtx.clearRect(0, 0, canvas.width, canvas.height);
      lingerSparks(0);
    }
  }

  function lingerSparks(lf: number) {
    if (cancelled) return;
    drawCtx.clearRect(0, 0, canvas.width, canvas.height);
    if (lf < lingerFrames) {
      const mini = makeLightningPath(
        tx + rnd(-16, 16),
        ty - rnd(12, 32),
        tx + rnd(-12, 12),
        ty + rnd(12, 32),
        5,
        9,
      );
      drawLightningBolt(drawCtx, mini, {
        alpha: rnd(0.5, 0.85),
        coreWidth: 0.68,
        glowWidth: 1.85,
        coreColor: electricRgba(ELECTRIC_CORE_RGB, 0.9),
        glowColor: electricRgba(ELECTRIC_RGB, 0.72),
      });
      raf = requestAnimationFrame(() => lingerSparks(lf + 1));
    } else {
      drawCtx.clearRect(0, 0, canvas.width, canvas.height);
      onComplete?.();
    }
  }

  raf = requestAnimationFrame(boltFrame);
  return () => {
    cancelled = true;
    cancelAnimationFrame(raf);
  };
}

export function fitCanvas(canvas: HTMLCanvasElement): void {
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.max(1, Math.floor(rect.width * dpr));
  canvas.height = Math.max(1, Math.floor(rect.height * dpr));
  const ctx = canvas.getContext("2d");
  if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
