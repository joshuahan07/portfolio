import { useState } from "react";
import { Award, Medal, Sparkles, Trophy } from "lucide-react";

export type AwardEntry = {
  headline: string;
  detail: string;
  date: string;
};

const meta = [
  {
    icon: Trophy,
    label: "Venture",
    bar: "from-amber-400 via-orange-500 to-transparent",
    dot: "from-amber-400 to-orange-500",
    pill: "border-amber-500/30 bg-amber-500/10 text-amber-100/95",
    role: "bg-amber-500/15 text-amber-100 ring-amber-400/25",
    hover: "hover:border-amber-400/35 hover:shadow-[0_24px_80px_-20px_rgba(245,158,11,0.2)]",
    focus: "ring-amber-400/40",
  },
  {
    icon: Sparkles,
    label: "Pitch",
    bar: "from-violet-500 via-fuchsia-500 to-transparent",
    dot: "from-violet-400 to-fuchsia-500",
    pill: "border-violet-500/30 bg-violet-500/10 text-violet-100/95",
    role: "bg-violet-500/15 text-violet-100 ring-violet-400/25",
    hover: "hover:border-violet-400/35 hover:shadow-[0_24px_80px_-20px_rgba(124,58,237,0.22)]",
    focus: "ring-violet-400/40",
  },
  {
    icon: Medal,
    label: "DECA",
    bar: "from-cyan-400 via-sky-500 to-transparent",
    dot: "from-cyan-400 to-sky-500",
    pill: "border-cyan-500/30 bg-cyan-500/10 text-cyan-100/95",
    role: "bg-cyan-500/15 text-cyan-100 ring-cyan-400/25",
    hover: "hover:border-cyan-400/35 hover:shadow-[0_24px_80px_-20px_rgba(34,211,238,0.18)]",
    focus: "ring-cyan-400/40",
  },
  {
    icon: Award,
    label: "Cyber",
    bar: "from-rose-400 via-pink-500 to-transparent",
    dot: "from-rose-400 to-pink-500",
    pill: "border-rose-500/30 bg-rose-500/10 text-rose-100/95",
    role: "bg-rose-500/15 text-rose-100 ring-rose-400/25",
    hover: "hover:border-rose-400/35 hover:shadow-[0_24px_80px_-20px_rgba(244,63,94,0.18)]",
    focus: "ring-rose-400/40",
  },
] as const;

export default function AwardsRecognition({ items }: { items: AwardEntry[] }) {
  const [focused, setFocused] = useState<number | null>(null);

  if (!items.length) return null;

  const toggleFocus = (index: number) => {
    setFocused((prev) => (prev === index ? null : index));
  };

  return (
    <div className="relative mt-16 md:mt-20" data-about="awards">
      <div className="mb-10 flex flex-col items-center gap-2 md:mb-12">
        <h3 className="font-mono text-[11px] font-semibold uppercase tracking-[0.4em] text-slate-500">
          Awards &amp; recognition
        </h3>
        <div className="h-px w-24 bg-gradient-to-r from-transparent via-amber-500/80 to-violet-500/80 opacity-80" />
        <p className="mt-3 max-w-lg text-center text-sm text-slate-500">
          Tap a card to highlight — all honors stay visible.
        </p>
      </div>

      {/* Timeline spine — desktop */}
      <div className="relative mx-auto hidden max-w-5xl sm:block">
        <div
          aria-hidden
          className="absolute left-[12.5%] right-[12.5%] top-[18px] h-px bg-gradient-to-r from-amber-500/50 via-violet-500/60 to-rose-500/50 shadow-[0_0_16px_rgba(139,92,246,0.35)]"
        />
        <div className="grid grid-cols-4">
          {items.map((_, i) => {
            const m = meta[i] ?? meta[0];
            return (
              <div key={`node-${i}`} className="flex justify-center">
                <span
                  className={`relative z-10 flex h-[18px] w-[18px] items-center justify-center rounded-full border-2 border-white/70 bg-[hsl(240_18%_6%)] shadow-[0_0_18px_rgba(139,92,246,0.5)] ring-4 ring-black/70 transition-transform duration-300 ${
                    focused === i ? "scale-125" : ""
                  }`}
                >
                  <span className={`h-2.5 w-2.5 rounded-full bg-gradient-to-br ${m.dot}`} />
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <ul className="relative mx-auto mt-8 grid max-w-5xl list-none gap-5 sm:mt-10 sm:grid-cols-2 lg:gap-6">
        {items.map((item, i) => {
          const m = meta[i] ?? meta[0];
          const Icon = m.icon;
          const isFocused = focused === i;
          const dimmed = focused !== null && !isFocused;

          return (
            <li key={item.headline}>
              <article
                role="button"
                tabIndex={0}
                onClick={() => toggleFocus(i)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    toggleFocus(i);
                  }
                }}
                className={`award-card group relative w-full cursor-pointer overflow-hidden rounded-3xl border border-white/12 bg-black/35 text-left shadow-2xl shadow-black/40 ring-1 ring-white/5 backdrop-blur-md transition-all duration-300 ${m.hover} ${
                  dimmed ? "scale-[0.98] opacity-55" : "opacity-100"
                } ${isFocused ? `-translate-y-1 ring-2 ${m.focus}` : "hover:-translate-y-1"}`}
              >
                <div
                  className={`absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r ${m.bar} opacity-90 transition-opacity duration-300 group-hover:opacity-100`}
                />

                <div className="p-6 pt-8 sm:p-7">
                  <div className="mb-5 flex items-start justify-between gap-3">
                    <span className="inline-flex rounded-2xl border border-white/15 bg-white/5 p-2.5 shadow-inner">
                      <Icon className="h-5 w-5 text-white/90" strokeWidth={1.75} aria-hidden />
                    </span>
                    <span
                      className={`shrink-0 rounded-full border px-3 py-1 font-mono text-[10px] uppercase tracking-[0.12em] ${m.pill}`}
                    >
                      <time dateTime={item.date}>{item.date}</time>
                    </span>
                  </div>

                  <span className={`inline-flex rounded-lg px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.14em] ring-1 ${m.role}`}>
                    {m.label}
                  </span>

                  <h4 className="mt-4 text-lg font-bold leading-snug tracking-tight text-white sm:text-xl">
                    {item.headline}
                  </h4>

                  <p
                    className={`mt-3 text-sm leading-relaxed text-slate-300 transition-[max-height,opacity] duration-300 ${
                      isFocused ? "opacity-100" : "opacity-80"
                    }`}
                  >
                    {item.detail}
                  </p>

                  <div className="mt-5 flex items-center justify-between border-t border-white/[0.06] pt-4">
                    <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500">
                      Honor {String(i + 1).padStart(2, "0")}
                    </span>
                    <span
                      className={`text-[10px] font-medium uppercase tracking-wider transition-colors ${
                        isFocused ? "text-white" : "text-slate-600 group-hover:text-slate-400"
                      }`}
                    >
                      {isFocused ? "Selected" : "Tap to focus"}
                    </span>
                  </div>
                </div>
              </article>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
