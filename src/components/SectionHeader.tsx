type SectionHeaderProps = {
  eyebrow: string;
  title: string;
  description?: string;
  align?: "center" | "left";
  accent?: "violet" | "cyan" | "rose" | "emerald";
};

const accentLine: Record<NonNullable<SectionHeaderProps["accent"]>, string> = {
  violet: "via-violet-500/80",
  cyan: "via-cyan-500/80",
  rose: "via-rose-500/80",
  emerald: "via-emerald-500/80",
};

const accentText: Record<NonNullable<SectionHeaderProps["accent"]>, string> = {
  violet: "text-violet-400",
  cyan: "text-cyan-400",
  rose: "text-rose-400",
  emerald: "text-emerald-400",
};

export default function SectionHeader({
  eyebrow,
  title,
  description,
  align = "center",
  accent = "violet",
}: SectionHeaderProps) {
  const centered = align === "center";

  return (
    <header className={`mb-10 md:mb-12 ${centered ? "text-center" : "text-left"}`}>
      <p
        className={`mb-3 font-mono text-[11px] font-semibold uppercase tracking-[0.4em] ${accentText[accent]}`}
      >
        {eyebrow}
      </p>
      <h2
        className={`bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-4xl font-bold tracking-tight text-transparent sm:text-5xl md:text-[3.25rem] ${
          centered ? "mx-auto" : ""
        }`}
      >
        {title}
      </h2>
      {description ? (
        <p
          className={`mt-4 max-w-2xl text-base leading-relaxed text-slate-400 md:text-lg ${
            centered ? "mx-auto" : ""
          }`}
        >
          {description}
        </p>
      ) : null}
      <div
        className={`mt-6 h-px w-24 bg-gradient-to-r from-transparent ${accentLine[accent]} to-transparent ${
          centered ? "mx-auto" : ""
        }`}
        aria-hidden
      />
    </header>
  );
}
