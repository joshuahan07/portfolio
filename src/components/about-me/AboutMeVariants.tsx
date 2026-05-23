import { type ComponentType, type ReactNode } from "react";
import {
  ABOUT_BUILD,
  ABOUT_GREETING,
  ABOUT_LIFE,
  ABOUT_SCHOOL,
  type AboutMeVariantId,
} from "./content";

type VariantProps = { className?: string };

function Shell({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <article
      className={`about-me-card about-fx relative min-h-[540px] overflow-hidden rounded-2xl border border-white/10 ${className}`}
      data-cursor-hover
    >
      {children}
    </article>
  );
}

function BioCopy({
  className = "",
  light = false,
}: {
  className?: string;
  light?: boolean;
}) {
  const base = light ? "text-white" : "";
  return (
    <div className={`about-fx-bio space-y-3 text-sm leading-relaxed sm:text-base ${base} ${className}`}>
      <p className="font-semibold">{ABOUT_GREETING}</p>
      <p className={light ? "text-white/90" : "opacity-90"}>{ABOUT_SCHOOL}</p>
      <p className={light ? "text-white/80" : "opacity-80"}>{ABOUT_BUILD}</p>
      <p className={light ? "text-white/70 italic" : "opacity-70 italic"}>{ABOUT_LIFE}</p>
    </div>
  );
}

/** 01 — Phoenix + magma ooze (no volcano) */
export function AboutMeInferno({ className }: VariantProps) {
  return (
    <Shell className={`about-fx-inferno ${className}`}>
      <div className="about-fx-inferno-bg pointer-events-none absolute inset-0" aria-hidden />
      <div className="about-fx-ember-field pointer-events-none absolute inset-0" aria-hidden />
      <div className="about-fx-lava-ooze pointer-events-none absolute bottom-0 left-0 right-0 h-[38%]" aria-hidden>
        <span className="about-fx-lava-stream about-fx-lava-stream--1" />
        <span className="about-fx-lava-stream about-fx-lava-stream--2" />
        <span className="about-fx-lava-stream about-fx-lava-stream--3" />
      </div>
      <div className="about-fx-flame-wall pointer-events-none absolute bottom-0 left-0 right-0 h-[52%]" aria-hidden />
      <svg
        className="about-fx-phoenix pointer-events-none absolute bottom-[18%] left-1/2 w-[min(280px,70%)] -translate-x-1/2"
        viewBox="0 0 200 160"
        aria-hidden
      >
        <defs>
          <linearGradient id="phoenixGrad" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#ff6b00" />
            <stop offset="50%" stopColor="#ffd700" />
            <stop offset="100%" stopColor="#fff8e7" />
          </linearGradient>
        </defs>
        <path
          fill="url(#phoenixGrad)"
          d="M100 145 C70 120 40 100 25 75 C45 95 55 70 50 50 C65 75 75 55 100 35 C125 55 135 75 150 50 C145 70 155 95 175 75 C160 100 130 120 100 145 Z"
          opacity="0.9"
        />
        <path
          fill="none"
          stroke="#ffd700"
          strokeWidth="1.5"
          d="M100 145 L100 40 M55 95 L100 70 L145 95"
          opacity="0.5"
        />
      </svg>
      <div className="relative z-10 flex min-h-[540px] flex-col justify-end px-6 pb-10 pt-16 sm:px-10">
        <BioCopy className="max-w-lg text-orange-50 drop-shadow-[0_2px_12px_rgba(0,0,0,0.8)]" />
      </div>
    </Shell>
  );
}

/** 02 — Crushing waves */
export function AboutMeTide({ className }: VariantProps) {
  return (
    <Shell className={`about-fx-tide ${className}`}>
      <div className="about-fx-tide-sky pointer-events-none absolute inset-0" aria-hidden />
      <div className="about-fx-spray about-fx-spray--1 pointer-events-none absolute" aria-hidden />
      <div className="about-fx-spray about-fx-spray--2 pointer-events-none absolute" aria-hidden />
      <div className="about-fx-spray about-fx-spray--3 pointer-events-none absolute" aria-hidden />
      <svg
        className="about-fx-wave about-fx-wave--back pointer-events-none absolute bottom-0 left-0 w-[220%] max-w-none"
        viewBox="0 0 1440 320"
        preserveAspectRatio="none"
        aria-hidden
      >
        <path
          fill="rgba(14, 116, 144, 0.55)"
          d="M0,160 C240,280 480,40 720,160 C960,280 1200,60 1440,180 L1440,320 L0,320 Z"
        />
      </svg>
      <svg
        className="about-fx-wave about-fx-wave--mid pointer-events-none absolute bottom-0 left-0 w-[220%] max-w-none"
        viewBox="0 0 1440 320"
        preserveAspectRatio="none"
        aria-hidden
      >
        <path
          fill="rgba(6, 182, 212, 0.45)"
          d="M0,200 C300,80 500,260 720,140 C940,20 1150,240 1440,120 L1440,320 L0,320 Z"
        />
      </svg>
      <svg
        className="about-fx-wave about-fx-wave--front pointer-events-none absolute bottom-0 left-0 w-[220%] max-w-none"
        viewBox="0 0 1440 320"
        preserveAspectRatio="none"
        aria-hidden
      >
        <path
          fill="rgba(224, 242, 254, 0.92)"
          d="M0,220 C180,120 420,300 720,200 C1020,100 1260,280 1440,190 L1440,320 L0,320 Z"
        />
      </svg>
      <div className="about-fx-tide-foam pointer-events-none absolute bottom-0 left-0 right-0 h-8" aria-hidden />
      <div className="relative z-20 mx-6 mb-8 mt-10 rounded-2xl border border-cyan-400/25 bg-slate-950/75 p-6 shadow-[0_0_60px_-12px_rgba(34,211,238,0.5)] backdrop-blur-md sm:mx-10 sm:p-8">
        <BioCopy className="text-cyan-50" />
      </div>
    </Shell>
  );
}

/** 03 — Ink drop → splatter → flood → white text */
export function AboutMeInk({ className }: VariantProps) {
  const splats = Array.from({ length: 12 }, (_, i) => ({
    rot: (i * 30) % 360,
    x: 50 + Math.cos((i * Math.PI) / 6) * (28 + (i % 3) * 8),
    y: 72 + Math.sin((i * Math.PI) / 6) * (18 + (i % 2) * 10),
    delay: 1.15 + i * 0.04,
    scale: 0.4 + (i % 4) * 0.15,
  }));

  return (
    <Shell className={`about-fx-ink ${className}`}>
      <div className="about-fx-ink-stage pointer-events-none absolute inset-0 bg-[#f4f1ea]" aria-hidden />
      <div className="about-fx-ink-drop pointer-events-none absolute left-1/2 top-0 z-30 h-5 w-3 -translate-x-1/2 rounded-full bg-[#0a0a0a]" aria-hidden />
      {splats.map((s, i) => (
        <span
          key={i}
          className="about-fx-ink-splat pointer-events-none absolute z-20 rounded-full bg-[#0a0a0a]"
          style={{
            left: `${s.x}%`,
            top: `${s.y}%`,
            width: `${40 + (i % 3) * 24}px`,
            height: `${30 + (i % 4) * 18}px`,
            ["--splat-rot" as string]: `${s.rot}deg`,
            ["--splat-scale" as string]: s.scale,
            animationDelay: `${s.delay}s`,
          }}
          aria-hidden
        />
      ))}
      <div className="about-fx-ink-flood pointer-events-none absolute inset-0 z-10 bg-[#0a0a0a]" aria-hidden />
      <div className="about-fx-ink-drip pointer-events-none absolute inset-x-0 top-0 z-[15] h-full origin-top bg-[#0a0a0a]" aria-hidden />
      <div className="about-fx-ink-content relative z-20 flex min-h-[540px] items-center px-6 py-12 sm:px-10">
        <BioCopy light className="max-w-lg" />
      </div>
    </Shell>
  );
}

/** 04 — Smoke ball drop → burst → waft */
export function AboutMeSmoke({ className }: VariantProps) {
  return (
    <Shell className={`about-fx-smoke ${className}`}>
      <div className="about-fx-smoke-bg pointer-events-none absolute inset-0 bg-[#0c0c10]" aria-hidden />
      <div className="about-fx-smoke-ball pointer-events-none absolute left-1/2 top-0 z-30 h-14 w-14 -translate-x-1/2 rounded-full" aria-hidden />
      <div className="about-fx-smoke-burst pointer-events-none absolute bottom-[42%] left-1/2 z-20 h-4 w-4 -translate-x-1/2" aria-hidden />
      <div className="about-fx-smoke-cloud about-fx-smoke-cloud--1 pointer-events-none absolute" aria-hidden />
      <div className="about-fx-smoke-cloud about-fx-smoke-cloud--2 pointer-events-none absolute" aria-hidden />
      <div className="about-fx-smoke-cloud about-fx-smoke-cloud--3 pointer-events-none absolute" aria-hidden />
      <div className="about-fx-smoke-cloud about-fx-smoke-cloud--4 pointer-events-none absolute" aria-hidden />
      <div className="about-fx-smoke-cloud about-fx-smoke-cloud--5 pointer-events-none absolute" aria-hidden />
      <div className="about-fx-smoke-veil pointer-events-none absolute inset-0 z-[12] bg-[#0c0c10]/40" aria-hidden />
      <div className="about-fx-smoke-content relative z-20 flex min-h-[540px] items-center px-6 py-12 sm:px-10">
        <BioCopy className="max-w-lg text-slate-200" />
      </div>
    </Shell>
  );
}

const VARIANT_MAP: Record<AboutMeVariantId, ComponentType<VariantProps>> = {
  inferno: AboutMeInferno,
  tide: AboutMeTide,
  ink: AboutMeInk,
  smoke: AboutMeSmoke,
};

export function AboutMeVariant({
  variant,
  className,
}: {
  variant: AboutMeVariantId;
  className?: string;
}) {
  const Component = VARIANT_MAP[variant];
  return <Component className={className} />;
}
