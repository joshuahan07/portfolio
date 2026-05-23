const highlights = [
  "Los Angeles → St. Louis",
  "Joint Business & CS @ WashU",
  "Founder & builder",
  "Hackathons & side projects",
] as const;

export default function AboutMeCard() {
  return (
    <article
      className="about-me-card group relative mb-14 overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.09] to-white/[0.02] p-6 shadow-xl shadow-black/30 transition-all duration-300 hover:-translate-y-1 hover:border-violet-400/25 hover:shadow-[0_20px_60px_-24px_rgba(167,139,250,0.35)] sm:p-8 md:mb-16"
      data-cursor-hover
    >
      <div
        className="pointer-events-none absolute inset-0 bg-violet-500/10 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        aria-hidden
      />

      <div className="relative flex flex-col gap-6 sm:flex-row sm:items-start sm:gap-8">
        <div
          className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-white/15 bg-gradient-to-br from-violet-500/30 via-fuchsia-500/20 to-cyan-500/25 text-xl font-bold tracking-tight text-white shadow-[0_0_40px_-12px_rgba(139,92,246,0.65)] sm:h-[4.5rem] sm:w-[4.5rem] sm:text-2xl"
          aria-hidden
        >
          JH
        </div>

        <div className="min-w-0 flex-1 space-y-4">
          <p className="text-base leading-relaxed text-slate-300 md:text-lg">
            I&apos;m Joshua Han — a developer and founder from Los Angeles, now in St. Louis
            studying joint Business &amp; Computer Science at WashU. I ship products end to end:
            from{" "}
            <span className="font-medium text-white">OnTrack</span> (conflict-free class scheduling)
            and <span className="font-medium text-white">Paralume</span> (real-time AI writing
            coach) to hackathon demos and client builds.
          </p>
          <p className="text-sm leading-relaxed text-slate-400 md:text-base">
            I care about demo-ready UX, fast iteration, and teams that move. Outside of code,
            you&apos;ll find me pitching at competitions, rating spots on Beli, or prototyping the
            next thing worth showing on a screen.
          </p>

          <ul className="flex flex-wrap gap-2 pt-1">
            {highlights.map((tag) => (
              <li key={tag}>
                <span className="inline-block rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400 transition-colors group-hover:border-violet-400/20 group-hover:text-slate-300">
                  {tag}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </article>
  );
}
