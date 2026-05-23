import SectionHeader from "@/components/SectionHeader";

const technical = [
  "Full-Stack Dev",
  "Prototyping",
  "JavaScript",
  "HTML/CSS",
  "Web Development",
  "AI",
  "AI APIs",
  "Prompt Engineering",
  "Designing",
];

const tools = [
  "Excel",
  "Sheets",
  "Canva",
  "PowerPoint",
  "Figma",
  "Google Slides",
  "Teams",
  "Docs",
];

export default function Skills() {
  return (
    <section id="skills" className="relative overflow-hidden px-6 py-16 md:py-24">
      <div className="pointer-events-none absolute inset-0 z-0">
        <div className="absolute right-0 top-0 h-[500px] w-[500px] rounded-full bg-violet-600/10 blur-[150px]" />
        <div className="absolute bottom-0 left-0 h-[500px] w-[500px] rounded-full bg-cyan-600/10 blur-[150px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-4xl">
        <SectionHeader
          eyebrow="Expertise"
          title="Skills & tools"
          description="Technical breadth and tooling I use to ship products."
          accent="emerald"
        />

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="glass rounded-2xl border border-white/10 p-7 transition-all duration-300 hover:-translate-y-1 hover:border-violet-400/25 hover:bg-white/[0.05]">
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 text-lg font-bold text-white">
              T
            </div>
            <h3 className="mb-4 text-xl font-bold text-white">Technical</h3>
            <div className="flex flex-wrap gap-2">
              {technical.map((skill) => (
                <span
                  key={skill}
                  className="cursor-default rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm font-medium text-slate-300 transition-colors hover:border-violet-500/50 hover:bg-white/10 hover:text-white"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>

          <div className="glass rounded-2xl border border-white/10 p-7 transition-all duration-300 hover:-translate-y-1 hover:border-cyan-400/25 hover:bg-white/[0.05]">
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 text-lg font-bold text-white">
              ∗
            </div>
            <h3 className="mb-4 text-xl font-bold text-white">Tools</h3>
            <div className="flex flex-wrap gap-2">
              {tools.map((skill) => (
                <span
                  key={skill}
                  className="cursor-default rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm font-medium text-slate-300 transition-colors hover:border-cyan-500/50 hover:bg-white/10 hover:text-white"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
