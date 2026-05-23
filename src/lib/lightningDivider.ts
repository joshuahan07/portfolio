import {
  ELECTRIC_BORDER_HEX,
  ELECTRIC_CORE_RGB,
  ELECTRIC_RGB,
  electricRgba,
} from "@/lib/electricTheme";
import { getDividerGlobalFrame, subscribeDividerDraw } from "@/lib/lightningDividerSync";

export type LightningDividerConfig = {
  boltGlow: string;
  boltCore: string;
  sparkColor: string;
  particleA: string;
  particleB: string;
  baseline: string;
  particleCount: number;
  boltHold: number;
  boltBuild: number;
  boltGap: number;
  sparkCount: number;
  glowWidth: number;
  coreWidth: number;
  particleSizeMin: number;
  particleSizeRange: number;
};

/** Matches Featured Projects `ElectricBorder` (cyan-400). */
export const ELECTRIC_LIGHTNING_DIVIDER: LightningDividerConfig = {
  boltGlow: ELECTRIC_BORDER_HEX,
  boltCore: electricRgba(ELECTRIC_CORE_RGB, 1),
  sparkColor: ELECTRIC_BORDER_HEX,
  particleA: ELECTRIC_BORDER_HEX,
  particleB: ELECTRIC_BORDER_HEX,
  baseline: electricRgba(ELECTRIC_RGB, 0.22),
  particleCount: 28,
  boltHold: 165,
  boltBuild: 54,
  boltGap: 236,
  sparkCount: 6,
  glowWidth: 9,
  coreWidth: 2.4,
  particleSizeMin: 1.1,
  particleSizeRange: 2.4,
};

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  c: string;
  a: number;
};

type Spark = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
};

export type LightningDividerHandle = {
  stop: () => void;
};

export function runLightningDivider(
  canvas: HTMLCanvasElement,
  config: LightningDividerConfig = ELECTRIC_LIGHTNING_DIVIDER,
  options?: { reducedMotion?: boolean },
): LightningDividerHandle {
  const C = config;
  const maybeCtx = canvas.getContext("2d");
  if (!maybeCtx) return { stop: () => {} };
  const ctx: CanvasRenderingContext2D = maybeCtx;

  const reducedMotion = options?.reducedMotion ?? false;

  let W = 0;
  let H = 0;
  let CY = 0;

  let particles: Particle[] = [];
  let boltPts: [number, number][] = [];
  let boltLife = 0;
  let sparks: Spark[] = [];

  function initParticles() {
    particles = Array.from({ length: C.particleCount }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.5,
      vy: (Math.random() - 0.5) * 0.25,
      r: Math.random() * C.particleSizeRange + C.particleSizeMin,
      c: Math.random() > 0.5 ? C.particleA : C.particleB,
      a: Math.random() * 0.55 + 0.2,
    }));
  }

  function resize() {
    const r = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = r.width || canvas.offsetWidth || 360;
    H = r.height || canvas.offsetHeight || 56;
    canvas.width = Math.max(1, Math.floor(W * dpr));
    canvas.height = Math.max(1, Math.floor(H * dpr));
    canvas.style.width = `${W}px`;
    canvas.style.height = `${H}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    CY = H / 2;
  }

  function spawnBolt() {
    boltPts = [];
    let x = 0;
    let y = CY;
    while (x < W) {
      boltPts.push([x, y]);
      x += Math.random() * 30 + 12;
      y = CY + (Math.random() - 0.5) * 24;
    }
    boltPts.push([W, CY]);

    sparks = Array.from({ length: C.sparkCount }, () => {
      const anchor = boltPts[Math.floor(Math.random() * boltPts.length)];
      return {
        x: anchor[0],
        y: anchor[1],
        vx: (Math.random() - 0.5) * 2.4,
        vy: (Math.random() - 0.5) * 2.4,
        life: 18,
      };
    });

    boltLife = C.boltHold;
  }

  function drawBaseline() {
    ctx.strokeStyle = C.baseline;
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(0, CY);
    ctx.lineTo(W, CY);
    ctx.stroke();
  }

  function drawParticles() {
    for (const p of particles) {
      if (!reducedMotion) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = W;
        if (p.x > W) p.x = 0;
        if (p.y < 0) p.y = H;
        if (p.y > H) p.y = 0;
      }

      ctx.save();
      ctx.globalAlpha = p.a * 0.65;
      ctx.fillStyle = p.c;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  function drawBolt() {
    if (boltLife <= 0) return;

    const alpha = boltLife / C.boltHold;
    const progress = Math.min(1, (C.boltHold - boltLife + 1) / C.boltBuild);
    const endIdx = Math.max(2, Math.floor(progress * boltPts.length));

    ctx.save();
    ctx.globalAlpha = alpha * 0.38;
    ctx.strokeStyle = C.boltGlow;
    ctx.lineWidth = C.glowWidth;
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(boltPts[0][0], boltPts[0][1]);
    for (let i = 1; i < endIdx; i++) ctx.lineTo(boltPts[i][0], boltPts[i][1]);
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = C.boltCore;
    ctx.lineWidth = C.coreWidth;
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(boltPts[0][0], boltPts[0][1]);
    for (let i = 1; i < endIdx; i++) ctx.lineTo(boltPts[i][0], boltPts[i][1]);
    ctx.stroke();
    ctx.restore();

    for (const s of sparks) {
      s.x += s.vx * 0.7;
      s.y += s.vy * 0.7;
      s.life--;
      if (s.life > 0) {
        ctx.save();
        ctx.globalAlpha = (s.life / 18) * alpha * 0.85;
        ctx.fillStyle = C.sparkColor;
        ctx.beginPath();
        ctx.arc(s.x, s.y, 1.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    boltLife--;
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    drawBaseline();
    drawParticles();

    if (!reducedMotion) {
      const frame = getDividerGlobalFrame();
      const strikeNow =
        boltLife <= 0 &&
        (frame === 1 || (frame > 1 && frame % C.boltGap === 0));
      if (strikeNow) spawnBolt();
      drawBolt();
    }
  }

  resize();
  initParticles();

  const onResize = () => {
    resize();
    initParticles();
  };
  window.addEventListener("resize", onResize);

  if (reducedMotion) {
    draw();
    return {
      stop: () => {
        window.removeEventListener("resize", onResize);
      },
    };
  }

  const unsubscribe = subscribeDividerDraw(draw);

  return {
    stop: () => {
      unsubscribe();
      window.removeEventListener("resize", onResize);
    },
  };
}
