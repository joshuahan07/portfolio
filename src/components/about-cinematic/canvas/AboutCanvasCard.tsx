import type { CSSProperties } from "react";
import { ABOUT_COPY } from "../content";

export type CanvasCardVariant = "ink";

type AboutCanvasCardProps = {
  variant: CanvasCardVariant;
  visible: boolean;
  opacity: number;
  /** Centered white copy over frozen ink video (no card chrome) */
  overlay?: boolean;
};

const VARIANT_STYLES: Record<
  CanvasCardVariant,
  {
    shell: CSSProperties;
    overlay?: CSSProperties;
    accent: CSSProperties;
    title: CSSProperties;
    p: [string, string, string];
  }
> = {
  ink: {
    shell: {
      background: "rgba(8, 8, 8, 0.88)",
      border: "1px solid rgba(255,255,255,0.07)",
      boxShadow: "0 0 80px rgba(0,0,0,0.7), 0 40px 80px rgba(0,0,0,0.5)",
      backdropFilter: "blur(20px)",
    },
    overlay: {
      background: "linear-gradient(135deg, rgba(255,255,255,0.025) 0%, transparent 100%)",
    },
    accent: { width: 40, height: 1, background: "rgba(255,255,255,0.25)" },
    title: {
      fontFamily: "Georgia, serif",
      fontSize: "clamp(1.5rem, 4vw, 2rem)",
      fontWeight: 700,
      color: "#f0ede8",
      marginBottom: "0.5rem",
      letterSpacing: "-0.02em",
    },
    p: [
      "rgba(240,237,232,0.82)",
      "rgba(240,237,232,0.72)",
      "rgba(240,237,232,0.62)",
    ],
  },
};

const OVERLAY_TEXT_SHADOW =
  "0 2px 24px rgba(0,0,0,0.85), 0 1px 4px rgba(0,0,0,0.9)";

export default function AboutCanvasCard({
  variant,
  visible,
  opacity,
  overlay = false,
}: AboutCanvasCardProps) {
  if (!visible) return null;

  const s = VARIANT_STYLES[variant];
  const bodies = [ABOUT_COPY.school, ABOUT_COPY.build, ABOUT_COPY.life];

  if (overlay) {
    return (
      <div
        className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center px-5 sm:px-8"
        style={{
          opacity,
          visibility: opacity > 0 ? "visible" : "hidden",
        }}
      >
        <div className="max-w-lg text-center">
          <h1
            style={{
              fontFamily: "Georgia, serif",
              fontSize: "clamp(1.5rem, 4vw, 2rem)",
              fontWeight: 700,
              color: "#ffffff",
              marginBottom: "0.5rem",
              letterSpacing: "-0.02em",
              textShadow: OVERLAY_TEXT_SHADOW,
            }}
          >
            {ABOUT_COPY.greeting}
          </h1>
          <div
            style={{
              width: 40,
              height: 1,
              margin: "0 auto 1.5rem",
              background: "rgba(255,255,255,0.5)",
            }}
          />
          {bodies.map((text, i) => (
            <p
              key={i}
              style={{
                color: "#ffffff",
                lineHeight: 1.75,
                marginBottom: i < 2 ? "1rem" : 0,
                fontSize: "0.95rem",
                textShadow: OVERLAY_TEXT_SHADOW,
              }}
            >
              {text}
            </p>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative z-10 mx-auto w-full max-w-lg px-4 sm:px-6"
      style={{
        opacity,
        transform: `translateY(${(1 - opacity) * 22}px)`,
      }}
    >
      <div className="relative overflow-hidden rounded-2xl p-7 sm:p-8" style={s.shell}>
        {s.overlay && (
          <div className="absolute inset-0 rounded-2xl" style={s.overlay} aria-hidden />
        )}
        <h1 style={s.title}>{ABOUT_COPY.greeting}</h1>
        <div style={{ ...s.accent, marginBottom: "1.5rem" }} />
        {bodies.map((text, i) => (
          <p
            key={i}
            style={{
              color: s.p[i],
              lineHeight: 1.75,
              marginBottom: i < 2 ? "1rem" : 0,
              fontSize: "0.95rem",
            }}
          >
            {text}
          </p>
        ))}
      </div>
    </div>
  );
}
