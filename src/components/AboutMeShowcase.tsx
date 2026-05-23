import { useState } from "react";
import { RotateCcw } from "lucide-react";
import { ABOUT_VARIANTS, type AboutMeVariantId } from "@/components/about-me/content";
import { AboutMeVariant } from "@/components/about-me/AboutMeVariants";

export default function AboutMeShowcase() {
  const [selected, setSelected] = useState<AboutMeVariantId>("inferno");
  const [replayKey, setReplayKey] = useState(0);
  const [compareAll, setCompareAll] = useState(false);

  const active = ABOUT_VARIANTS.find((v) => v.id === selected)!;

  const handleSelect = (id: AboutMeVariantId) => {
    setSelected(id);
    setReplayKey((k) => k + 1);
  };

  const handleReplay = () => setReplayKey((k) => k + 1);

  return (
    <div className="mb-14 md:mb-16">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="font-mono text-[11px] uppercase tracking-[0.35em] text-slate-500">
          Preview your About card · pick 01–04
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleReplay}
            className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.04] px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400 transition-colors hover:border-cyan-400/40 hover:text-white"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden />
            Replay animation
          </button>
          <button
            type="button"
            onClick={() => setCompareAll((c) => !c)}
            className="rounded-full border border-white/15 bg-white/[0.04] px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400 transition-colors hover:border-violet-400/40 hover:text-white"
          >
            {compareAll ? "Single preview" : "Compare all 4"}
          </button>
        </div>
      </div>

      <div
        className="mb-6 flex gap-2 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        role="tablist"
        aria-label="About me card styles"
      >
        {ABOUT_VARIANTS.map((variant) => {
          const isActive = selected === variant.id;
          return (
            <button
              key={variant.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => handleSelect(variant.id)}
              className={`shrink-0 rounded-xl border px-4 py-2.5 text-left transition-all duration-300 ${
                isActive
                  ? "border-violet-400/50 bg-violet-500/15 shadow-[0_0_24px_-8px_rgba(139,92,246,0.5)]"
                  : "border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.06]"
              }`}
            >
              <span className="block font-mono text-[10px] font-semibold uppercase tracking-wider text-violet-300">
                {variant.label}
              </span>
              <span className="mt-1 block max-w-[11rem] text-[10px] leading-snug text-slate-500">
                {variant.tagline}
              </span>
            </button>
          );
        })}
      </div>

      {compareAll ? (
        <div className="grid gap-10 lg:grid-cols-2">
          {ABOUT_VARIANTS.map((variant) => (
            <div key={variant.id} className="space-y-2">
              <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-slate-500">
                {variant.label}
              </p>
              <AboutMeVariant variant={variant.id} />
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-center font-mono text-[10px] uppercase tracking-[0.4em] text-violet-400/80">
            {active.label} — {active.tagline}
          </p>
          <AboutMeVariant key={`${selected}-${replayKey}`} variant={selected} />
        </div>
      )}
    </div>
  );
}
