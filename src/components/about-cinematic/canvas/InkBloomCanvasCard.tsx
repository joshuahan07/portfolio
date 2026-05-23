import { useCallback, useEffect, useRef } from "react";
import gsap from "gsap";
import { createNoise2D } from "simplex-noise";
import AboutCanvasCard from "./AboutCanvasCard";
import type { CanvasConceptProps } from "./types";
import { useCardFade } from "./useCardFade";
import { useReducedMotion } from "../hooks/useReducedMotion";

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  opacity: number;
  life: number;
  maxLife: number;
};

type Tendril = {
  points: { x: number; y: number }[];
  baseAngle: number;
  maxWidth: number;
  opacity: number;
};

type SecondaryTendril = {
  points: { x: number; y: number }[];
  parentIndex: number;
  maxWidth: number;
  opacity: number;
};

const SPLATTER_RAYS = 12;

/** Pendant ink drop — deep black, meniscus cap, sharp tip (no watery gray fill) */
function drawInkDrop(
  ctx: CanvasRenderingContext2D,
  opacity: number,
  scaleX: number,
  scaleY: number,
) {
  const w = 7.5 * scaleX;
  const h = 19 * scaleY;

  const body = ctx.createRadialGradient(0, -h * 0.12, h * 0.08, 0, h * 0.05, h * 0.55);
  body.addColorStop(0, `rgba(0, 0, 0, ${opacity})`);
  body.addColorStop(0.55, `rgba(0, 0, 0, ${opacity})`);
  body.addColorStop(1, `rgba(0, 0, 0, ${opacity * 0.92})`);

  ctx.beginPath();
  ctx.moveTo(0, h * 0.54);
  ctx.bezierCurveTo(w * 0.72, h * 0.28, w * 0.58, -h * 0.3, 0, -h * 0.5);
  ctx.bezierCurveTo(-w * 0.58, -h * 0.3, -w * 0.72, h * 0.28, 0, h * 0.54);
  ctx.closePath();
  ctx.fillStyle = body;
  ctx.fill();

  // Surface-tension meniscus (slightly wider cap)
  ctx.beginPath();
  ctx.ellipse(0, -h * 0.44, w * 0.5, h * 0.09, 0, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(0, 0, 0, ${opacity})`;
  ctx.fill();

  // Fine tail filament into the tip
  ctx.beginPath();
  ctx.moveTo(0, h * 0.38);
  ctx.quadraticCurveTo(w * 0.08, h * 0.48, 0, h * 0.54);
  ctx.lineWidth = 1.1;
  ctx.strokeStyle = `rgba(0, 0, 0, ${opacity * 0.85})`;
  ctx.stroke();
}

/** Thin crown splatter spikes only — no central pool */
function drawImpactSplatter(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  progress: number,
) {
  if (progress <= 0.02) return;

  for (let i = 0; i < SPLATTER_RAYS; i++) {
    const angle = (i / SPLATTER_RAYS) * Math.PI * 2 + progress * 0.2;
    const wobble = Math.sin(i * 1.7 + progress * 4) * 0.12;
    const len = 4 + progress * (32 + Math.sin(i * 2.3) * 8);
    const tipX = cx + Math.cos(angle + wobble) * len;
    const tipY = cy + Math.sin(angle + wobble) * len;
    const tipR = 0.8 + progress * 2.2;

    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineWidth = 0.9 + progress * 1.6;
    ctx.lineCap = "round";
    ctx.strokeStyle = `rgba(0, 0, 0, ${0.7 * progress})`;
    ctx.lineTo(tipX, tipY);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(tipX, tipY, tipR, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(0, 0, 0, ${0.85 * progress})`;
    ctx.fill();
  }
}

export default function InkBloomCanvasCard({ playKey = 0, onReady }: CanvasConceptProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reduced = useReducedMotion();
  const { cardOpacity, revealInstant, reset } = useCardFade(onReady);

  const sizeRef = useRef({ w: 0, h: 0 });
  const dprRef = useRef(Math.min(window.devicePixelRatio, 2));
  const centerRef = useRef({ x: 0, y: 0 });
  const maxRadiusRef = useRef(0);
  const noiseRef = useRef(createNoise2D(() => Math.random()));
  const timeRef = useRef(0);
  const isMobileRef = useRef(false);
  const animFrameRef = useRef(0);
  const masterTlRef = useRef<gsap.core.Timeline | null>(null);

  const dropletRef = useRef({ x: 0, y: -60, scaleX: 1, scaleY: 1, opacity: 1 });
  const splatterRef = useRef({ progress: 0 });
  const explosionRef = useRef({ progress: 0 });
  const phaseRef = useRef(0);

  const particlesRef = useRef<Particle[]>([]);
  const tendrilsRef = useRef<Tendril[]>([]);
  const secondaryTendrilsRef = useRef<SecondaryTendril[]>([]);
  const inkBoundaryRef = useRef<{ angle: number; radius: number }[]>([]);
  const vertexOffsetsRef = useRef<{ x: number; y: number }[]>([]);

  const resizeCanvas = useCallback(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const rect = container.getBoundingClientRect();
    const w = Math.max(1, rect.width);
    const h = Math.max(1, rect.height);
    const dpr = dprRef.current;

    sizeRef.current = { w, h };
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;

    const ctx = canvas.getContext("2d");
    ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);

    const cx = w / 2;
    const cy = h * 0.48;
    centerRef.current = { x: cx, y: cy };
    maxRadiusRef.current = Math.sqrt(cx * cx + cy * cy) * 1.35;

    const vertexCount = isMobileRef.current ? 100 : 280;
    inkBoundaryRef.current = Array.from({ length: vertexCount }, (_, i) => ({
      angle: (i / vertexCount) * Math.PI * 2,
      radius: 0,
    }));
    if (vertexOffsetsRef.current.length !== vertexCount) {
      vertexOffsetsRef.current = inkBoundaryRef.current.map(() => ({ x: 0, y: 0 }));
    }
  }, []);

  const generateTendrils = useCallback(() => {
    const { x: cx, y: cy } = centerRef.current;
    const maxR = maxRadiusRef.current;
    const noise2D = noiseRef.current;
    const count = isMobileRef.current ? 18 : 52;
    const tendrils: Tendril[] = [];

    for (let i = 0; i < count; i++) {
      const baseAngle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.35;
      const length = maxR * (0.28 + Math.random() * 0.65);
      const segments = Math.floor(length / 3);
      const maxWidth = 2.2 + Math.random() * 2.8;
      const points: { x: number; y: number }[] = [];
      let px = cx;
      let py = cy;
      let angle = baseAngle;

      for (let s = 0; s < segments; s++) {
        const progress = s / segments;
        angle += noise2D(px * 0.015, py * 0.015 + i * 0.5) * 0.55;
        px += Math.cos(angle) * 3;
        py += Math.sin(angle) * 3;
        const targetAngle = baseAngle + noise2D(progress * 3, i * 0.2) * 0.45;
        angle += (targetAngle - angle) * 0.1;
        points.push({ x: px, y: py });
      }

      tendrils.push({ points, baseAngle, maxWidth, opacity: 0.82 + Math.random() * 0.18 });
    }

    tendrilsRef.current = tendrils;

    const secCount = isMobileRef.current ? 30 : 90;
    const secondary: SecondaryTendril[] = [];
    for (let i = 0; i < secCount; i++) {
      const parentIdx = Math.floor(Math.random() * tendrils.length);
      const parent = tendrils[parentIdx];
      if (!parent || parent.points.length < 5) continue;

      const spawnIdx = Math.floor(parent.points.length * (0.25 + Math.random() * 0.45));
      const spawn = parent.points[spawnIdx];
      if (!spawn) continue;

      const branchAngle = parent.baseAngle + (Math.random() - 0.5) * 1.8;
      const length = (parent.points.length - spawnIdx) * 2.5 * (0.18 + Math.random() * 0.22);
      const segments = Math.max(3, Math.floor(length / 2));
      const points: { x: number; y: number }[] = [];
      let px = spawn.x;
      let py = spawn.y;
      let angle = branchAngle;

      for (let s = 0; s < segments; s++) {
        angle += noise2D(px * 0.04, py * 0.04 + i * 0.3) * 0.85;
        px += Math.cos(angle) * 2;
        py += Math.sin(angle) * 2;
        points.push({ x: px, y: py });
      }

      secondary.push({
        points,
        parentIndex: parentIdx,
        maxWidth: 0.7 + Math.random() * 1.1,
        opacity: 0.55 + Math.random() * 0.3,
      });
    }

    secondaryTendrilsRef.current = secondary;
  }, []);

  const generateParticles = useCallback(() => {
    const { x: cx, y: cy } = centerRef.current;
    const count = isMobileRef.current ? 14 : 36;
    particlesRef.current = Array.from({ length: count }, () => {
      const angle = Math.random() * Math.PI * 2;
      const speed = 40 + Math.random() * 160;
      return {
        x: cx,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: 1 + Math.random() * 2.5,
        opacity: 0.55 + Math.random() * 0.45,
        life: 0,
        maxLife: 0.7 + Math.random() * 1,
      };
    });
  }, []);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { w, h } = sizeRef.current;
    const { x: cx, y: cy } = centerRef.current;
    const maxR = maxRadiusRef.current;
    const noise2D = noiseRef.current;
    const droplet = dropletRef.current;
    const splatter = splatterRef.current;
    const explosion = explosionRef.current;
    const time = timeRef.current;

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, w, h);

    if (phaseRef.current === 0 && droplet.opacity > 0) {
      ctx.save();
      ctx.translate(droplet.x, droplet.y);
      ctx.scale(droplet.scaleX, droplet.scaleY);
      drawInkDrop(ctx, droplet.opacity, 1, 1);
      ctx.restore();
    }

    if (phaseRef.current >= 1 && splatter.progress > 0) {
      drawImpactSplatter(ctx, cx, cy, splatter.progress);
    }

    if (phaseRef.current >= 2 && explosion.progress > 0) {
      const progress = explosion.progress;
      const vertexCount = inkBoundaryRef.current.length;

      for (let i = 0; i < vertexCount; i++) {
        const vertex = inkBoundaryRef.current[i];
        const baseR = progress * maxR;
        const n1 = Math.abs(noise2D(vertex.angle * 2.5, time * 0.08)) * 0.3;
        const n2 = Math.abs(noise2D(vertex.angle * 0.8, time * 0.04)) * 0.18;
        const n3 = Math.abs(noise2D(vertex.angle * 5, time * 0.12)) * 0.1;
        vertex.radius = Math.max(0, baseR * (1.06 + n1 + n2 + n3));
      }

      ctx.save();
      ctx.beginPath();
      const verts = inkBoundaryRef.current;
      const first = verts[0];
      let prevX = cx + Math.cos(first.angle) * first.radius;
      let prevY = cy + Math.sin(first.angle) * first.radius;
      ctx.moveTo(prevX, prevY);

      for (let i = 1; i <= vertexCount; i++) {
        const v = verts[i % vertexCount];
        const px = cx + Math.cos(v.angle) * v.radius;
        const py = cy + Math.sin(v.angle) * v.radius;
        const cpx = (prevX + px) / 2;
        const cpy = (prevY + py) / 2;
        ctx.quadraticCurveTo(prevX, prevY, cpx, cpy);
        prevX = px;
        prevY = py;
      }

      ctx.closePath();
      ctx.fillStyle = "#0A0A0A";
      ctx.fill();
      ctx.restore();

      if (progress > 0.04) {
        const tendrilAlpha = Math.min(1, (progress - 0.04) * 1.4);
        ctx.save();
        for (const tendril of tendrilsRef.current) {
          const points = tendril.points;
          const visible = Math.floor(points.length * Math.min(1, (progress - 0.04) * 1.2));
          for (let p = 1; p < visible; p++) {
            const seg = p / points.length;
            ctx.beginPath();
            ctx.moveTo(points[p - 1].x, points[p - 1].y);
            ctx.lineTo(points[p].x, points[p].y);
            ctx.strokeStyle = `rgba(8, 8, 8, ${tendril.opacity * tendrilAlpha * (1 - seg * 0.45)})`;
            ctx.lineWidth = Math.max(0.3, (1 - seg) * tendril.maxWidth * 1.4);
            ctx.lineCap = "round";
            ctx.stroke();
          }
        }
        ctx.restore();
      }

      if (progress < 0.55) {
        for (const p of particlesRef.current) {
          if (p.life >= p.maxLife) continue;
          p.x += p.vx * 0.016;
          p.y += p.vy * 0.016;
          p.vx *= 0.96;
          p.vy *= 0.96;
          p.life += 0.016;
          const lifeRatio = 1 - p.life / p.maxLife;
          if (lifeRatio > 0.01) {
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius * lifeRatio, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(8, 8, 8, ${lifeRatio * p.opacity})`;
            ctx.fill();
          }
        }
      }
    }
  }, []);

  const setupTimeline = useCallback(() => {
    masterTlRef.current?.kill();

    const droplet = dropletRef.current;
    const splatter = splatterRef.current;
    const explosion = explosionRef.current;
    const { x: cx, y: cy } = centerRef.current;

    droplet.x = cx;
    droplet.y = -Math.max(48, sizeRef.current.h * 0.12);
    droplet.scaleX = 1;
    droplet.scaleY = 1;
    droplet.opacity = 1;
    splatter.progress = 0;
    explosion.progress = 0;
    phaseRef.current = 0;
    particlesRef.current = [];
    generateTendrils();

    const tl = gsap.timeline();
    masterTlRef.current = tl;

    tl.to(droplet, {
      y: cy,
      duration: 2.6,
      ease: "power2.in",
      onStart: () => {
        phaseRef.current = 0;
      },
      onUpdate() {
        const p = this.progress();
        droplet.x = cx + Math.sin(p * Math.PI * 5) * (1 - p) * 3;
        const stretch = 1 + p * 0.55;
        droplet.scaleX = 1 / stretch;
        droplet.scaleY = stretch;
      },
    }, 0);

    tl.to(droplet, {
      scaleX: 1.35,
      scaleY: 0.55,
      duration: 0.06,
      ease: "power3.out",
      onStart: () => {
        phaseRef.current = 1;
        splatter.progress = 0.05;
      },
    }, 2.6);

    tl.to(splatter, {
      progress: 1,
      duration: 0.28,
      ease: "power2.out",
    }, 2.6);

    tl.to(droplet, {
      scaleX: 0,
      scaleY: 0,
      opacity: 0,
      duration: 0.06,
      ease: "power3.in",
    }, 2.66);

    tl.call(() => generateParticles(), [], 2.62);

    tl.to(explosion, {
      progress: 1,
      duration: 3.8,
      ease: "power1.out",
      onStart: () => {
        phaseRef.current = 2;
        splatter.progress = 0;
      },
      onComplete: () => {
        phaseRef.current = 4;
      },
    }, 2.68);

    tl.call(() => revealInstant(), [], 5.2);

    return tl;
  }, [generateTendrils, generateParticles, revealInstant]);

  const runSequence = useCallback(() => {
    reset();
    resizeCanvas();

    if (reduced) {
      explosionRef.current.progress = 1;
      splatterRef.current.progress = 1;
      phaseRef.current = 4;
      dropletRef.current.opacity = 0;
      generateTendrils();
      render();
      revealInstant();
      return;
    }

    setupTimeline();
  }, [reduced, reset, resizeCanvas, setupTimeline, generateTendrils, render, revealInstant]);

  useEffect(() => {
    isMobileRef.current =
      window.innerWidth < 768 || "ontouchstart" in window;

    const container = containerRef.current;
    if (!container) return;

    const ro = new ResizeObserver(() => resizeCanvas());
    ro.observe(container);
    resizeCanvas();

    const loop = () => {
      timeRef.current += 0.016;
      render();
      animFrameRef.current = requestAnimationFrame(loop);
    };
    animFrameRef.current = requestAnimationFrame(loop);

    return () => {
      ro.disconnect();
      cancelAnimationFrame(animFrameRef.current);
      masterTlRef.current?.kill();
    };
  }, [resizeCanvas, render]);

  useEffect(() => {
    runSequence();
  }, [playKey, runSequence]);

  return (
    <div ref={containerRef} className="cin-ink-canvas-stage absolute inset-0 overflow-hidden bg-white">
      <canvas ref={canvasRef} className="absolute inset-0 block h-full w-full" aria-hidden />
      <div
        className="pointer-events-none absolute inset-0 z-[2]"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 42%, rgba(0,0,0,0.12) 100%)",
          mixBlendMode: "multiply",
        }}
        aria-hidden
      />
      <AboutCanvasCard variant="ink" visible opacity={cardOpacity} overlay />
    </div>
  );
}
