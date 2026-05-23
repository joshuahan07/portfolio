import { useEffect, useRef } from "react";

const CORE_RGB = "207,250,254";
const GLOW_RGB = "34,211,238";
const DEEP_RGB = "6,182,212";

function rnd(a: number, b: number) {
  return a + Math.random() * (b - a);
}

function rndInt(a: number, b: number) {
  return Math.floor(rnd(a, b));
}

interface Pt {
  x: number;
  y: number;
}

interface Debris {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  t: number;
  life: number;
  rr: number;
  g: number;
  bb: number;
  spin: number;
  rot: number;
  shape: { px: number; py: number }[];
}

interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  t: number;
  life: number;
}

type BallPhase = "idle" | "ignite" | "grow" | "debris" | "done";

const PHASE = {
  ignite: 0.06,
  grow: 0.78,
  debris: 0.34,
} as const;

/** Show UI once the initial burst has cleared (not at shatter spawn). */
const DEBRIS_REVEAL_AT = 0.65;

/** Slow start, accelerates toward the end. */
function easeInPow(t: number, power = 2.2) {
  return Math.pow(Math.max(0, Math.min(1, t)), power);
}

/** Interior detail catches up once the shell nears screen edges. */
function detailProgress(shellFill: number) {
  if (shellFill < 0.58) return shellFill * shellFill * 0.85;
  const tail = (shellFill - 0.58) / 0.42;
  return 0.29 + tail * tail * 1.35;
}

export type ElectricBallProps = {
  active: boolean;
  /** Fires the frame the full-screen shatter spawns (debris phase starts). */
  onShatter?: () => void;
  /** Fires near the end of debris — after the burst, before canvas teardown. */
  onShatterSettled?: () => void;
  onComplete?: () => void;
  /** Orb center in viewport pixels (matches GIF). */
  centerX: number;
  centerY: number;
  /** Ball radius at start — half of orb diameter. */
  baseRadius?: number;
};

function jitterPath(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  segs: number,
  spread: number,
): Pt[] {
  const pts: Pt[] = [{ x: x1, y: y1 }];
  for (let i = 1; i < segs; i++) {
    const t = i / segs;
    pts.push({
      x: x1 + (x2 - x1) * t + rnd(-spread, spread),
      y: y1 + (y2 - y1) * t + rnd(-spread * 0.35, spread * 0.35),
    });
  }
  pts.push({ x: x2, y: y2 });
  return pts;
}

function drawBolt(
  ctx: CanvasRenderingContext2D,
  pts: Pt[],
  alpha: number,
  cw: number,
  gw: number,
  coreRGB: string,
  glowRGB: string,
) {
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  const trace = () => {
    ctx.beginPath();
    pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  };

  trace();
  ctx.strokeStyle = `rgba(${glowRGB},${alpha * 0.35})`;
  ctx.lineWidth = gw * 3;
  ctx.stroke();
  trace();
  ctx.strokeStyle = `rgba(${glowRGB},${alpha * 0.6})`;
  ctx.lineWidth = gw;
  ctx.stroke();
  trace();
  ctx.strokeStyle = `rgba(${coreRGB},${alpha})`;
  ctx.lineWidth = cw;
  ctx.stroke();
  ctx.restore();
}

function branchOff(
  ctx: CanvasRenderingContext2D,
  pts: Pt[],
  depth: number,
  alpha: number,
  coreRGB: string,
  glowRGB: string,
) {
  if (depth <= 0) return;
  for (let i = 2; i < pts.length - 1; i++) {
    if (Math.random() < 0.45) {
      const bx = pts[i].x + rnd(-55, 55);
      const by = pts[i].y + rnd(10, 55);
      const b = jitterPath(pts[i].x, pts[i].y, bx, by, 4, 14);
      drawBolt(ctx, b, alpha * 0.55, 0.8, 3, coreRGB, glowRGB);
      branchOff(ctx, b, depth - 1, alpha * 0.45, coreRGB, glowRGB);
    }
  }
}

function surfaceArc(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  alpha: number,
  coreRGB: string,
  glowRGB: string,
) {
  const a1 = rnd(0, Math.PI * 2);
  const a2 = a1 + rnd(0.4, 1.8) * (Math.random() < 0.5 ? 1 : -1);
  const segs = 12;
  const pts: Pt[] = [];
  for (let i = 0; i <= segs; i++) {
    const ang = a1 + ((a2 - a1) * i) / segs;
    const wobble = rnd(-r * 0.18, r * 0.18);
    pts.push({
      x: cx + Math.cos(ang) * (r + wobble),
      y: cy + Math.sin(ang) * (r + wobble),
    });
  }
  drawBolt(ctx, pts, alpha, 1.2, 5, coreRGB, glowRGB);
}

function escapingBolt(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  reach: number,
  alpha: number,
  coreRGB: string,
  glowRGB: string,
) {
  const ang = rnd(0, Math.PI * 2);
  const sx = cx + Math.cos(ang) * r;
  const sy = cy + Math.sin(ang) * r;
  const ex = cx + Math.cos(ang + rnd(-0.4, 0.4)) * (r + reach);
  const ey = cy + Math.sin(ang + rnd(-0.4, 0.4)) * (r + reach);
  const pts = jitterPath(sx, sy, ex, ey, 10, reach * 0.28);
  drawBolt(ctx, pts, alpha, 1.5, 6, coreRGB, glowRGB);
  branchOff(ctx, pts, 2, alpha * 0.7, coreRGB, glowRGB);
}

function internalWeb(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  count: number,
  alpha: number,
  coreRGB: string,
  glowRGB: string,
  spreadMul = 0.18,
) {
  for (let i = 0; i < count; i++) {
    const a1 = rnd(0, Math.PI * 2);
    const a2 = rnd(0, Math.PI * 2);
    const r1 = rnd(r * 0.35, r * 0.98);
    const r2 = rnd(r * 0.35, r * 0.98);
    const sx = cx + Math.cos(a1) * r1;
    const sy = cy + Math.sin(a1) * r1;
    const ex = cx + Math.cos(a2) * r2;
    const ey = cy + Math.sin(a2) * r2;
    const pts = jitterPath(sx, sy, ex, ey, 8, r * spreadMul);
    drawBolt(ctx, pts, alpha * rnd(0.45, 1), 0.9, 3, coreRGB, glowRGB);
  }
}

function ambientGlow(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  intensity: number,
) {
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 2.2);
  g.addColorStop(0, `rgba(${GLOW_RGB},${0.22 * intensity})`);
  g.addColorStop(0.4, `rgba(${DEEP_RGB},${0.12 * intensity})`);
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 2.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export default function ElectricBall({
  active,
  onShatter,
  onShatterSettled,
  onComplete,
  centerX,
  centerY,
  baseRadius = 100,
}: ElectricBallProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const onShatterRef = useRef(onShatter);
  const onShatterSettledRef = useRef(onShatterSettled);
  const onCompleteRef = useRef(onComplete);
  const completedRef = useRef(false);
  const shatterFiredRef = useRef(false);
  const shatterSettledFiredRef = useRef(false);

  useEffect(() => {
    onShatterRef.current = onShatter;
    onShatterSettledRef.current = onShatterSettled;
    onCompleteRef.current = onComplete;
  }, [onShatter, onShatterSettled, onComplete]);

  useEffect(() => {
    if (!active) return;

    const cv = canvasRef.current;
    if (!cv) return;

    const maybeCtx = cv.getContext("2d");
    if (!maybeCtx) return;
    const drawCtx: CanvasRenderingContext2D = maybeCtx;

    completedRef.current = false;
    shatterFiredRef.current = false;
    shatterSettledFiredRef.current = false;

    const fit = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = window.innerWidth;
      const h = window.innerHeight;
      cv.width = Math.max(1, Math.floor(w * dpr));
      cv.height = Math.max(1, Math.floor(h * dpr));
      cv.style.width = `${w}px`;
      cv.style.height = `${h}px`;
      drawCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const CX = centerX > 0 ? centerX : w / 2;
      const CY = centerY > 0 ? centerY : h / 2;
      const pageR = Math.hypot(w / 2, h / 2) * 1.06;
      return { W: w, H: h, CX, CY, pageR };
    };

    let { W, H, CX, CY, pageR } = fit();

    const S = {
      phase: "idle" as BallPhase,
      phaseT: 0,
      globalT: 0,
      curR: baseRadius,
      baseR: baseRadius,
      pageR,
      shakeAmt: 0,
      debris: [] as Debris[],
      sparks: [] as Spark[],
      last: 0,
      raf: 0,
    };

    function fireShatter() {
      if (shatterFiredRef.current) return;
      shatterFiredRef.current = true;
      onShatterRef.current?.();
    }

    function explode(cx: number, cy: number, pageRadius: number) {
      fireShatter();
      S.debris = [];
      S.sparks = [];
      for (let i = 0; i < 64; i++) {
        const a = rnd(0, Math.PI * 2);
        const spawnR = rnd(0, pageRadius * 0.92);
        const spd = rnd(280, 1100);
        S.debris.push({
          x: cx + Math.cos(a) * spawnR,
          y: cy + Math.sin(a) * spawnR,
          vx: Math.cos(a) * spd,
          vy: Math.sin(a) * spd - rnd(60, 220),
          size: rnd(8, 28),
          t: 0,
          life: rnd(0.65, 1.35),
          rr: rndInt(160, 220),
          g: rndInt(220, 255),
          bb: 255,
          spin: rnd(-500, 500),
          rot: rnd(0, 360),
          shape: Array.from({ length: Math.floor(rnd(3, 7)) }, () => ({
            px: rnd(-1, 1),
            py: rnd(-1, 1),
          })),
        });
      }
      for (let i = 0; i < 140; i++) {
        const a = rnd(0, Math.PI * 2);
        const spawnR = rnd(0, pageRadius * 0.75);
        const spd = rnd(450, 1600);
        S.sparks.push({
          x: cx + Math.cos(a) * spawnR,
          y: cy + Math.sin(a) * spawnR,
          vx: Math.cos(a) * spd,
          vy: Math.sin(a) * spd,
          t: 0,
          life: rnd(0.2, 0.65),
        });
      }
    }

    function drawDebris(dt: number) {
      drawCtx.save();
      drawCtx.globalCompositeOperation = "lighter";
      S.debris.forEach((d) => {
        d.t += dt;
        if (d.t > d.life) return;
        const prog = d.t / d.life;
        const x = d.x + d.vx * d.t;
        const y = d.y + d.vy * d.t + 260 * d.t * d.t;
        drawCtx.save();
        drawCtx.translate(x, y);
        drawCtx.rotate(((d.rot + d.spin * d.t) * Math.PI) / 180);
        drawCtx.globalAlpha = (1 - prog) * 0.9;
        drawCtx.beginPath();
        d.shape.forEach((p, i) =>
          i === 0
            ? drawCtx.moveTo(p.px * d.size, p.py * d.size)
            : drawCtx.lineTo(p.px * d.size, p.py * d.size),
        );
        drawCtx.closePath();
        drawCtx.fillStyle = `rgba(${d.rr},${d.g},${d.bb},1)`;
        drawCtx.fill();
        drawCtx.beginPath();
        drawCtx.arc(0, 0, d.size * 1.6, 0, Math.PI * 2);
        drawCtx.fillStyle = `rgba(${d.rr},${d.g},${d.bb},0.12)`;
        drawCtx.fill();
        drawCtx.restore();
      });
      S.sparks.forEach((s) => {
        s.t += dt;
        if (s.t > s.life) return;
        const prog = s.t / s.life;
        const x = s.x + s.vx * s.t;
        const y = s.y + s.vy * s.t + 180 * s.t * s.t;
        drawCtx.beginPath();
        drawCtx.moveTo(x - s.vx * 0.025, y - s.vy * 0.025);
        drawCtx.lineTo(x, y);
        drawCtx.strokeStyle = `rgba(${CORE_RGB},${1 - prog})`;
        drawCtx.lineWidth = 1.5;
        drawCtx.stroke();
      });
      drawCtx.restore();
    }

    function finishDone() {
      if (completedRef.current) return;
      completedRef.current = true;
      onCompleteRef.current?.();
    }

    function frame(ts: number) {
      if (!S.last) S.last = ts;
      const dt = Math.min((ts - S.last) / 1000, 0.05);
      S.last = ts;
      S.globalT += dt;
      S.phaseT += dt;

      drawCtx.clearRect(0, 0, W, H);

      const ox = S.shakeAmt > 0 ? rnd(-S.shakeAmt, S.shakeAmt) : 0;
      const oy = S.shakeAmt > 0 ? rnd(-S.shakeAmt, S.shakeAmt) : 0;
      const cx = CX + ox;
      const cy = CY + oy;
      const r = S.curR;

      if (S.phase === "ignite") {
        S.shakeAmt = 2;
        ambientGlow(drawCtx, cx, cy, r, 1.1);
        internalWeb(drawCtx, cx, cy, r, 6, 0.85, CORE_RGB, GLOW_RGB);
        for (let i = 0; i < 5; i++) surfaceArc(drawCtx, cx, cy, r, rnd(0.7, 1), CORE_RGB, GLOW_RGB);
        if (S.phaseT > PHASE.ignite) {
          S.phase = "grow";
          S.phaseT = 0;
          S.shakeAmt = 4;
        }
      } else if (S.phase === "grow") {
        const prog = Math.min(S.phaseT / PHASE.grow, 1);
        const shellEase = easeInPow(prog, 2.2);
        S.curR = S.baseR + shellEase * (S.pageR - S.baseR);
        const shellFill = (S.curR - S.baseR) / Math.max(1, S.pageR - S.baseR);
        const detail = detailProgress(shellFill);

        S.shakeAmt = 3 + shellEase * 5;
        ambientGlow(drawCtx, cx, cy, S.curR, 0.85 + shellEase * 0.55);

        const webSpread = 0.1 + detail * 0.42;
        internalWeb(
          drawCtx,
          cx,
          cy,
          S.curR,
          4 + Math.floor(detail * 16),
          0.55 + detail * 0.4,
          CORE_RGB,
          GLOW_RGB,
          webSpread,
        );

        const rimCount = 4 + Math.floor(detail * 14);
        for (let i = 0; i < rimCount; i++) {
          const arcR = S.curR * rnd(0.62 + detail * 0.38, 0.98);
          surfaceArc(drawCtx, cx, cy, arcR, rnd(0.55, 1), CORE_RGB, GLOW_RGB);
        }

        const boltCount = Math.floor(detail * 18);
        const boltReach = 12 + detail * S.pageR * 1.05;
        for (let i = 0; i < boltCount; i++) {
          escapingBolt(
            drawCtx,
            cx,
            cy,
            S.curR * rnd(0.5 + detail * 0.45, 0.98),
            boltReach * rnd(0.75, 1),
            rnd(0.5, 0.95),
            CORE_RGB,
            GLOW_RGB,
          );
        }

        if (prog >= 1) {
          S.shakeAmt = 0;
          S.curR = S.pageR;
          explode(CX, CY, S.pageR);
          S.phase = "debris";
          S.phaseT = 0;
        }
      } else if (S.phase === "debris") {
        drawDebris(dt);
        if (
          S.phaseT >= PHASE.debris * DEBRIS_REVEAL_AT &&
          !shatterSettledFiredRef.current
        ) {
          shatterSettledFiredRef.current = true;
          onShatterSettledRef.current?.();
        }
        if (S.phaseT >= PHASE.debris) {
          S.phase = "done";
          finishDone();
          return;
        }
      } else if (S.phase === "done") {
        return;
      }

      S.raf = requestAnimationFrame(frame);
    }

    function start() {
      ({ W, H, CX, CY, pageR } = fit());
      S.pageR = pageR;
      S.phase = "ignite";
      S.phaseT = 0;
      S.globalT = 0;
      S.last = 0;
      S.curR = S.baseR;
      S.shakeAmt = 0;
      S.debris = [];
      S.sparks = [];
      if (S.raf) cancelAnimationFrame(S.raf);
      S.raf = requestAnimationFrame(frame);
    }

    const onResize = () => {
      ({ W, H, CX, CY, pageR } = fit());
      S.pageR = pageR;
    };

    start();
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(S.raf);
      S.phase = "idle";
    };
  }, [active, baseRadius, centerX, centerY]);

  if (!active) return null;

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-[185] block h-full w-full"
      aria-hidden
    />
  );
}
