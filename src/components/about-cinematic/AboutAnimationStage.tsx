import type { ReactNode } from "react";

type AboutAnimationStageProps = {
  label: string;
  replayVisible: boolean;
  onReplay: () => void;
  children: ReactNode;
  /** Video ink uses dark stage; canvas drop uses white paper */
  theme?: "dark" | "light";
};

export default function AboutAnimationStage({
  label,
  replayVisible,
  onReplay,
  children,
  theme = "light",
}: AboutAnimationStageProps) {
  const isDark = theme === "dark";

  return (
    <div className="about-animation-stage">
      <p className="mb-3 text-center font-mono text-[10px] uppercase tracking-[0.28em] text-slate-500">
        {label}
      </p>
      <div className="cin-showcase about-me-card mx-auto max-w-4xl">
        <div className="cin-showcase__stage-wrap overflow-hidden">
          <div
            className={`relative min-h-[min(580px,82vh)] w-full ${isDark ? "bg-black" : "bg-white"}`}
          >
            {children}

            <div
              className="absolute right-4 top-4 z-20 sm:right-6 sm:top-6"
              style={{
                opacity: replayVisible ? 1 : 0,
                transition: "opacity 0.4s ease",
                pointerEvents: replayVisible ? "auto" : "none",
              }}
            >
              <button
                type="button"
                onClick={onReplay}
                className={
                  isDark
                    ? "cin-showcase__replay"
                    : "cin-showcase__replay cin-showcase__replay--on-light"
                }
                aria-label="Replay animation"
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
                  <path
                    d="M10 6A4 4 0 1 1 6 2V0L9 3L6 6V4A2 2 0 1 0 8 6"
                    stroke="currentColor"
                    strokeWidth="1.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                Replay
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
