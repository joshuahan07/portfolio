import type { CSSProperties } from "react";

const TERMS = [
  "Shipping",
  "Founding",
  "Building",
  "Hacking",
  "Designing",
  "Prototyping",
  "Iterating",
] as const;

/** Enough copies so the track always overflows the viewport — prevents blank gaps on loop. */
const MARQUEE_COPIES = 4;

function SkillSegment({ copyIndex }: { copyIndex: number }) {
  return (
    <div className="flex shrink-0 items-center" aria-hidden={copyIndex > 0}>
      {TERMS.map((word) => (
        <span
          key={`${copyIndex}-${word}`}
          className="inline-flex shrink-0 items-center whitespace-nowrap"
        >
          <span className="px-8 sm:px-10">{word}</span>
          <span className="select-none text-emerald-400/90" aria-hidden>
            ◆
          </span>
        </span>
      ))}
    </div>
  );
}

export default function RollingSkillTicker() {
  const marqueeStyle = {
    "--marquee-copies": MARQUEE_COPIES,
  } as CSSProperties;

  return (
    <div className="relative w-full shrink-0 overflow-hidden bg-[#08080f]/95 py-4">
      {/* Bright top / bottom dividers */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 z-20 h-px bg-gradient-to-r from-transparent via-cyan-400/90 to-transparent shadow-[0_0_14px_rgba(34,211,238,0.55)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-x-0 top-0 z-20 h-[2px] bg-gradient-to-r from-transparent via-violet-400/50 to-transparent"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-px bg-gradient-to-r from-transparent via-cyan-400/90 to-transparent shadow-[0_0_14px_rgba(34,211,238,0.55)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-[2px] bg-gradient-to-r from-transparent via-violet-400/50 to-transparent"
        aria-hidden
      />

      <div
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.14) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.14) 1px, transparent 1px)",
          backgroundSize: "20px 20px",
        }}
        aria-hidden
      />

      {/* Side fades — words read as entering from the edges */}
      <div
        className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-[#08080f] to-transparent sm:w-24"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-[#08080f] to-transparent sm:w-24"
        aria-hidden
      />

      <div
        className="skill-marquee-track flex w-max will-change-transform"
        style={marqueeStyle}
      >
        {Array.from({ length: MARQUEE_COPIES }, (_, i) => (
          <SkillSegment key={i} copyIndex={i} />
        ))}
      </div>
    </div>
  );
}
