import SectionHeader from "@/components/SectionHeader";
import OrbProjectReveal from "@/components/OrbProjectReveal";
import ProjectsGallery from "@/components/ProjectsGallery";
import PulseRail from "@/components/PulseRail";

export default function Projects() {
  return (
    <section id="projects" className="relative px-6 py-16 md:py-24">
      <div className="pointer-events-none absolute inset-x-0 top-0" aria-hidden>
        <PulseRail packetWidth={200} durationS={5} />
      </div>
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/4 top-0 h-80 w-80 rounded-full bg-violet-600/15 blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 h-80 w-80 rounded-full bg-cyan-600/12 blur-[120px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-6xl">
        <SectionHeader
          eyebrow="Portfolio"
          title="Featured projects"
          description="Products I've shipped and created"
          accent="cyan"
          showDivider={false}
        />

        <OrbProjectReveal>
          <ProjectsGallery className="mt-10" />
        </OrbProjectReveal>
      </div>
    </section>
  );
}
