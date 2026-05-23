import { useEffect, useRef } from "react";
import { useIsMobile } from "../hooks/useReducedMotion";

export type ParticlePreset = {
  count: number;
  mobileCount: number;
  colors: string[];
  speed: number;
  size: [number, number];
  gravity?: number;
  drift?: number;
  alpha?: number;
  blend?: GlobalCompositeOperation;
};

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
};

type ParticleCanvasProps = {
  preset: ParticlePreset;
  active?: boolean;
  burst?: number;
  className?: string;
};

export default function ParticleCanvas({
  preset,
  active = true,
  burst = 0,
  className = "",
}: ParticleCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mobile = useIsMobile();
  const burstRef = useRef(burst);

  useEffect(() => {
    burstRef.current = burst;
  }, [burst]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !active) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio, 2);
    let w = 0;
    let h = 0;
    let raf = 0;
    const particles: Particle[] = [];
    const count = mobile ? preset.mobileCount : preset.count;

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      w = parent.clientWidth;
      h = parent.clientHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const spawn = (n = 1, at?: { x: number; y: number }, speedMul = 1) => {
      for (let i = 0; i < n; i++) {
        const color = preset.colors[Math.floor(Math.random() * preset.colors.length)];
        particles.push({
          x: at?.x ?? Math.random() * w,
          y: at?.y ?? Math.random() * h,
          vx: (Math.random() - 0.5) * preset.speed * speedMul,
          vy: (Math.random() - 0.8) * preset.speed * speedMul,
          life: 0,
          maxLife: 60 + Math.random() * 80,
          size: preset.size[0] + Math.random() * (preset.size[1] - preset.size[0]),
          color,
        });
      }
    };

    for (let i = 0; i < count; i++) spawn();

    const tick = () => {
      if (burstRef.current > 0) {
        spawn(Math.floor(burstRef.current * (mobile ? 8 : 20)), { x: w / 2, y: h * 0.75 }, 2.5);
        burstRef.current = 0;
      }

      ctx.clearRect(0, 0, w, h);
      if (preset.blend) ctx.globalCompositeOperation = preset.blend;

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life++;
        p.x += p.vx + (preset.drift ?? 0) * 0.02;
        p.y += p.vy + (preset.gravity ?? 0);
        const t = p.life / p.maxLife;
        const alpha = (preset.alpha ?? 1) * (1 - t);

        ctx.beginPath();
        ctx.fillStyle = p.color;
        ctx.globalAlpha = alpha;
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();

        if (p.life >= p.maxLife || p.y < -20 || p.y > h + 20) {
          particles.splice(i, 1);
          if (particles.length < count) spawn();
        }
      }

      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
      raf = requestAnimationFrame(tick);
    };

    resize();
    window.addEventListener("resize", resize);
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [active, mobile, preset]);

  return (
    <canvas
      ref={canvasRef}
      className={`pointer-events-none absolute inset-0 h-full w-full ${className}`}
      aria-hidden
    />
  );
}
