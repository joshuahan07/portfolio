import { useCallback, useEffect, useRef } from "react";
import gsap from "gsap";
import { createNoise2D } from "simplex-noise";
import AboutCanvasCard from "./AboutCanvasCard";
import type { CanvasConceptProps } from "./types";
import { useCardFade } from "./useCardFade";
import { useReducedMotion } from "../hooks/useReducedMotion";

type SplatStreak = {
  angle: number;
  length: number;
  width: number;
  opacity: number;
  life: number;
  maxLife: number;
  tipRadius: number;
};

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

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

export default function InkBloomSplatCard({
  playKey = 0,
  onReady,
  pourTrigger = 0,
  waitForPour = false,
  pourOrigin = null,
}: CanvasConceptProps) {
  const pourOriginRef = useRef(pourOrigin);
  pourOriginRef.current = pourOrigin;
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reduced = useReducedMotion();
  const { cardOpacity, revealInstant, reset } = useCardFade(onReady);

  const sizeRef = useRef({ w: 0, h: 0 });
  const dprRef = useRef(Math.min(window.devicePixelRatio, 2));
  const centerRef = useRef({ x: 0, y: 0 });
  const maxRadiusRef = useRef(0);
  const noiseRef = useRef(createNoise2D(() => Math.random()));
  const mouseRef = useRef({ x: -1000, y: -1000 });
  const timeRef = useRef(0);
  const isMobileRef = useRef(false);
  const animFrameRef = useRef(0);
  const masterTlRef = useRef<gsap.core.Timeline | null>(null);

  const dropletRef = useRef({ x: 0, y: -60, scaleX: 1, scaleY: 1, opacity: 1 });
  const rippleRef = useRef({ radius: 0, opacity: 0 });
  const explosionRef = useRef({ progress: 0 });
  const phaseRef = useRef(0);

  const particlesRef = useRef<Particle[]>([]);
  const splatStreaksRef = useRef<SplatStreak[]>([]);
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
    maxRadiusRef.current = Math.sqrt(cx * cx + cy * cy) * 1.3;

    const vertexCount = isMobileRef.current ? 120 : 300;
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
    const count = isMobileRef.current ? 20 : 60;
    const tendrils: Tendril[] = [];

    for (let i = 0; i < count; i++) {
      const baseAngle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.3;
      const length = maxR * (0.3 + Math.random() * 0.7);
      const segments = Math.floor(length / 3);
      const maxWidth = 2.5 + Math.random() * 3;
      const points: { x: number; y: number }[] = [];
      let px = cx;
      let py = cy;
      let angle = baseAngle;

      for (let s = 0; s < segments; s++) {
        const progress = s / segments;
        angle += noise2D(px * 0.015, py * 0.015 + i * 0.5) * 0.6;
        px += Math.cos(angle) * 3;
        py += Math.sin(angle) * 3;
        const targetAngle = baseAngle + noise2D(progress * 3, i * 0.2) * 0.5;
        angle += (targetAngle - angle) * 0.08;
        points.push({ x: px, y: py });
      }

      tendrils.push({ points, baseAngle, maxWidth, opacity: 0.85 + Math.random() * 0.15 });
    }

    tendrilsRef.current = tendrils;

    const secCount = isMobileRef.current ? 40 : 120;
    const secondary: SecondaryTendril[] = [];
    for (let i = 0; i < secCount; i++) {
      const parentIdx = Math.floor(Math.random() * tendrils.length);
      const parent = tendrils[parentIdx];
      if (!parent || parent.points.length < 5) continue;

      const spawnPointIdx = Math.floor(parent.points.length * (0.3 + Math.random() * 0.5));
      const spawnPoint = parent.points[spawnPointIdx];
      if (!spawnPoint) continue;

      const branchAngle = parent.baseAngle + (Math.random() - 0.5) * 2;
      const length = (parent.points.length - spawnPointIdx) * 3 * (0.15 + Math.random() * 0.25);
      const segments = Math.floor(length / 2);
      const points: { x: number; y: number }[] = [];
      let px = spawnPoint.x;
      let py = spawnPoint.y;
      let angle = branchAngle;

      for (let s = 0; s < segments; s++) {
        angle += noise2D(px * 0.04, py * 0.04 + i * 0.3) * 0.9;
        px += Math.cos(angle) * 2;
        py += Math.sin(angle) * 2;
        points.push({ x: px, y: py });
      }

      secondary.push({
        points,
        parentIndex: parentIdx,
        maxWidth: 0.8 + Math.random() * 1.2,
        opacity: 0.6 + Math.random() * 0.3,
      });
    }

    secondaryTendrilsRef.current = secondary;
  }, []);

  const generateSplatStreaks = useCallback(() => {
    const count = isMobileRef.current ? 10 : 22;
    const streaks: SplatStreak[] = [];

    for (let i = 0; i < count; i++) {
      const baseAngle = (i / count) * Math.PI * 2;
      const angle = baseAngle + (Math.random() - 0.5) * 0.6;
      streaks.push({
        angle,
        length: 18 + Math.random() * 55,
        width: 1.2 + Math.random() * 3.5,
        opacity: 0.7 + Math.random() * 0.3,
        life: 0,
        maxLife: 0.25 + Math.random() * 0.25,
        tipRadius: 1 + Math.random() * 3,
      });
    }

    splatStreaksRef.current = streaks;
  }, []);

  const generateParticles = useCallback(() => {
    const { x: cx, y: cy } = centerRef.current;
    const count = isMobileRef.current ? 12 : 40;
    particlesRef.current = Array.from({ length: count }, () => {
      const angle = Math.random() * Math.PI * 2;
      const speed = 60 + Math.random() * 200;
      return {
        x: cx,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: 1 + Math.random() * 3,
        opacity: 0.6 + Math.random() * 0.4,
        life: 0,
        maxLife: 0.8 + Math.random() * 1.2,
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
    const ripple = rippleRef.current;
    const explosion = explosionRef.current;
    const mouse = mouseRef.current;
    const time = timeRef.current;

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, w, h);

    if (phaseRef.current === 0 && droplet.opacity > 0) {
      ctx.save();
      ctx.translate(droplet.x, droplet.y);
      ctx.scale(droplet.scaleX, droplet.scaleY);

      const trailLen = 28 * droplet.scaleY;
      const trailGrad = ctx.createLinearGradient(0, -trailLen, 0, -8);
      trailGrad.addColorStop(0, "rgba(10, 10, 10, 0)");
      trailGrad.addColorStop(1, `rgba(10, 10, 10, ${droplet.opacity * 0.55})`);
      ctx.beginPath();
      ctx.moveTo(-2.5, -8);
      ctx.quadraticCurveTo(-3.5, -trailLen * 0.5, 0, -trailLen);
      ctx.quadraticCurveTo(3.5, -trailLen * 0.5, 2.5, -8);
      ctx.fillStyle = trailGrad;
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(0, -16);
      ctx.bezierCurveTo(5, -10, 10, -2, 10, 6);
      ctx.bezierCurveTo(10, 15, -10, 15, -10, 6);
      ctx.bezierCurveTo(-10, -2, -5, -10, 0, -16);
      ctx.closePath();
      ctx.fillStyle = `rgba(10, 10, 10, ${droplet.opacity})`;
      ctx.fill();

      ctx.beginPath();
      ctx.ellipse(-2.5, -4, 2.2, 4.5, -0.25, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(70, 70, 70, ${droplet.opacity * 0.35})`;
      ctx.fill();

      ctx.restore();
    }

    if (phaseRef.current >= 1 && ripple.opacity > 0.01) {
      ctx.beginPath();
      ctx.arc(cx, cy, ripple.radius, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(10, 10, 10, ${ripple.opacity * 0.25})`;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      if (ripple.radius > 20) {
        ctx.beginPath();
        ctx.arc(cx, cy, ripple.radius * 0.65, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(10, 10, 10, ${ripple.opacity * 0.12})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }

    if (phaseRef.current >= 1 && splatStreaksRef.current.length > 0) {
      ctx.save();
      const dt = 0.016;
      for (const streak of splatStreaksRef.current) {
        if (streak.life >= streak.maxLife) continue;
        streak.life += dt;
        const t = Math.min(1, streak.life / streak.maxLife);
        const currentLength = streak.length * Math.min(1, t * 2.2);
        const alpha = streak.opacity * (1 - t * t);
        if (alpha < 0.01) continue;

        const ex = cx + Math.cos(streak.angle) * currentLength;
        const ey = cy + Math.sin(streak.angle) * currentLength;

        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(ex, ey);
        ctx.strokeStyle = `rgba(10, 10, 10, ${alpha})`;
        ctx.lineWidth = streak.width * (1 - t * 0.6);
        ctx.lineCap = "round";
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(ex, ey, streak.tipRadius * (1 - t * 0.5), 0, Math.PI * 2);
        ctx.fillStyle = `rgba(10, 10, 10, ${alpha * 0.85})`;
        ctx.fill();
      }
      ctx.restore();
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
        const n4 = Math.abs(noise2D(vertex.angle * 8, time * 0.06 + 10)) * 0.06;

        let finalRadius = baseR * (1.08 + n1 + n2 + n3 + n4);

        if (phaseRef.current >= 4) {
          const vx = cx + Math.cos(vertex.angle) * finalRadius;
          const vy = cy + Math.sin(vertex.angle) * finalRadius;
          const dx = vx - mouse.x;
          const dy = vy - mouse.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 150 && dist > 0) {
            const force = (1 - dist / 150) * 0.15;
            vertexOffsetsRef.current[i].x += (dx / dist) * force * 8;
            vertexOffsetsRef.current[i].y += (dy / dist) * force * 8;
          }
          vertexOffsetsRef.current[i].x *= 0.94;
          vertexOffsetsRef.current[i].y *= 0.94;
          finalRadius +=
            vertexOffsetsRef.current[i].x * Math.cos(vertex.angle) +
            vertexOffsetsRef.current[i].y * Math.sin(vertex.angle);
        }

        vertex.radius = Math.max(0, finalRadius);
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

      if (progress > 0.4) {
        ctx.beginPath();
        ctx.arc(cx, cy, progress * maxR * 0.55, 0, Math.PI * 2);
        ctx.fillStyle = "#0A0A0A";
        ctx.fill();
      }

      if (progress > 0.05) {
        const tendrilAlpha = Math.min(1, (progress - 0.05) * 1.5);
        ctx.save();
        for (const tendril of tendrilsRef.current) {
          const points = tendril.points;
          const visible = Math.floor(points.length * Math.min(1, (progress - 0.05) * 1.3));
          for (let p = 1; p < visible; p++) {
            const seg = p / points.length;
            let alpha = tendril.opacity * tendrilAlpha * (1 - seg * 0.5);
            if (phaseRef.current >= 4) alpha += Math.sin(time * 0.5 + p * 0.1) * 0.04;
            alpha = Math.max(0, Math.min(1, alpha));
            ctx.beginPath();
            ctx.moveTo(points[p - 1].x, points[p - 1].y);
            ctx.lineTo(points[p].x, points[p].y);
            ctx.strokeStyle = `rgba(10, 10, 10, ${alpha})`;
            ctx.lineWidth = Math.max(0.3, (1 - seg) * tendril.maxWidth * 1.5);
            ctx.lineCap = "round";
            ctx.stroke();
          }
        }
        ctx.restore();
      }

      if (progress < 0.6) {
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
            ctx.fillStyle = `rgba(10, 10, 10, ${lifeRatio * p.opacity})`;
            ctx.fill();
          }
        }
      }
    }
  }, []);

  const setupTimeline = useCallback(() => {
    masterTlRef.current?.kill();

    const droplet = dropletRef.current;
    const ripple = rippleRef.current;
    const explosion = explosionRef.current;
    const { w, h } = sizeRef.current;
    const { x: cx, y: cy } = centerRef.current;
    const origin = waitForPour ? pourOriginRef.current : null;
    const fromBottle = Boolean(origin && origin.x >= 0 && origin.y >= 0);
    const fallDur = fromBottle ? 1.1 : 2.5;
    const impact = fallDur;

    let impactX = cx;
    let impactY = cy;
    let startX = cx;
    let startY = -Math.max(56, h * 0.14);

    if (fromBottle && origin) {
      startX = origin.x * w;
      startY = clamp(origin.y * h, 2, h * 0.42);
      impactX = startX;
      impactY = clamp(startY + h * 0.34, h * 0.4, h * 0.56);
      centerRef.current = { x: impactX, y: impactY };
      maxRadiusRef.current =
        Math.sqrt((w - impactX) ** 2 + impactY ** 2) * 1.15;
      droplet.x = startX;
      droplet.y = startY;
    } else {
      droplet.x = startX;
      droplet.y = startY;
    }
    droplet.scaleX = 1;
    droplet.scaleY = 1;
    droplet.opacity = 1;
    ripple.radius = 0;
    ripple.opacity = 0;
    explosion.progress = 0;
    phaseRef.current = 0;
    particlesRef.current = [];
    splatStreaksRef.current = [];
    generateTendrils();

    const tl = gsap.timeline();
    masterTlRef.current = tl;

    const fallTargetY = fromBottle ? impactY : cy;
    const fallTargetX = fromBottle ? impactX : cx;

    tl.to(droplet, {
      x: fallTargetX,
      y: fallTargetY,
      duration: fallDur,
      ease: "power2.in",
      onStart: () => {
        phaseRef.current = 0;
      },
      onUpdate() {
        const p = this.progress();
        if (!fromBottle) {
          droplet.x = cx + Math.sin(p * Math.PI * 6) * (1 - p) * 4;
        } else {
          droplet.x = impactX;
        }
        const stretch = 1 + p * 0.5;
        droplet.scaleX = 1 / stretch;
        droplet.scaleY = stretch;
      },
    }, 0);

    tl.to(droplet, {
      scaleX: 3.5,
      scaleY: 0.18,
      duration: 0.09,
      ease: "power4.out",
      onStart: () => {
        phaseRef.current = 1;
        ripple.radius = 0;
        ripple.opacity = 0.55;
      },
    }, impact);

    tl.to(droplet, {
      scaleX: 2,
      scaleY: 0.45,
      duration: 0.12,
      ease: "elastic.out(1, 0.5)",
    }, impact + 0.09);

    tl.to(droplet, {
      scaleX: 2.8,
      scaleY: 0.22,
      duration: 0.09,
      ease: "power2.in",
    }, impact + 0.21);

    tl.to(droplet, {
      scaleX: 0,
      scaleY: 0,
      opacity: 0,
      duration: 0.07,
      ease: "power3.in",
    }, impact + 0.3);

    tl.to(ripple, {
      radius: 100,
      opacity: 0,
      duration: 0.7,
      ease: "power2.out",
    }, impact);

    tl.call(() => {
      generateParticles();
      generateSplatStreaks();
    }, [], impact);

    tl.to(explosion, {
      progress: 1,
      duration: 3.5,
      ease: "power1.out",
      onStart: () => {
        phaseRef.current = 2;
      },
      onComplete: () => {
        phaseRef.current = 4;
      },
    }, impact);

    tl.call(() => revealInstant(), [], impact + 2.5);

    return tl;
  }, [waitForPour, generateTendrils, generateParticles, generateSplatStreaks, revealInstant]);

  const resetIdle = useCallback(() => {
    reset();
    resizeCanvas();
    masterTlRef.current?.kill();
    dropletRef.current.opacity = 0;
    rippleRef.current.opacity = 0;
    rippleRef.current.radius = 0;
    explosionRef.current.progress = 0;
    splatStreaksRef.current = [];
    particlesRef.current = [];
    phaseRef.current = 0;
    generateTendrils();
    render();
  }, [reset, resizeCanvas, generateTendrils, render]);

  const runSequence = useCallback(() => {
    reset();
    resizeCanvas();

    if (reduced) {
      explosionRef.current.progress = 1;
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
    isMobileRef.current = window.innerWidth < 768 || "ontouchstart" in window;

    const container = containerRef.current;
    if (!container) return;

    const onMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      mouseRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };
    const onLeave = () => {
      mouseRef.current = { x: -1000, y: -1000 };
    };

    container.addEventListener("mousemove", onMove);
    container.addEventListener("mouseleave", onLeave);

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
      container.removeEventListener("mousemove", onMove);
      container.removeEventListener("mouseleave", onLeave);
      ro.disconnect();
      cancelAnimationFrame(animFrameRef.current);
      masterTlRef.current?.kill();
    };
  }, [resizeCanvas, render]);

  useEffect(() => {
    if (waitForPour) {
      if (pourTrigger === 0) {
        resetIdle();
        return;
      }
      runSequence();
      return;
    }
    runSequence();
  }, [playKey, pourTrigger, waitForPour, resetIdle, runSequence]);

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
