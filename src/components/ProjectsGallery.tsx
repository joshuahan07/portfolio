import { Fragment } from "react";
import ProjectDivider from "@/components/ProjectDivider";
import { ArrowUpRight, ExternalLink, Sparkles } from "lucide-react";
import ElectricBorder from "@/components/ElectricBorder";
import { ELECTRIC_BORDER_HEX } from "@/lib/electricTheme";
import { projects, type Project } from "@/data/portfolio-projects";
import ProjectCoverImage from "@/components/ProjectCoverImage";

type CardProject = {
  slug: string;
  title: string;
  description: string;
  cover: string;
  tags: string[];
  link?: string;
  featured?: boolean;
};

function cardFromProject(p: Project, featured = false): CardProject {
  const link = p.liveUrl?.trim();
  return {
    slug: p.slug,
    title: p.title,
    description: `${p.tagline} · ${p.role}`,
    cover: p.cover,
    tags: p.stack.slice(0, 4),
    featured,
    ...(link ? { link } : {}),
  };
}

const cardProjects = projects.map((p, i) => cardFromProject(p, i === 0));

function ProjectCard({ project }: { project: CardProject }) {
  const hasLive = Boolean(project.link);

  const shell = (
    <div className="project-card group relative flex h-full flex-col overflow-hidden rounded-3xl border bg-gradient-to-br from-white/[0.08] to-white/[0.02] backdrop-blur-md lg:flex-row">
      <div className="project-card-glow" aria-hidden />
      <div className="relative h-52 overflow-hidden bg-black/60 sm:h-56 lg:min-h-[280px] lg:h-auto lg:w-[48%]">
        <ProjectCoverImage
          key={`${project.slug}-${project.cover}`}
          slug={project.slug}
          cover={project.cover}
          title={project.title}
          alignTop={project.slug === "great-rivers-demo"}
          objectPositionClass={
            project.slug === "ontrack"
              ? "object-[center_26%]"
              : project.slug === "paralume"
                ? "object-[center_58%]"
                : undefined
          }
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
        {project.featured ? (
          <span className="absolute right-4 top-4 inline-flex items-center gap-1.5 rounded-full border border-cyan-400/40 bg-cyan-500/15 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-cyan-100">
            <Sparkles className="h-3 w-3" aria-hidden />
            Featured
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col p-6 sm:p-7 lg:justify-center">
        <div className="mb-3 flex items-start justify-between gap-3">
          <h3 className="text-xl font-bold leading-snug text-white transition-colors group-hover:text-cyan-100 sm:text-2xl">
            {project.title}
          </h3>
          {hasLive ? (
            <ArrowUpRight className="h-5 w-5 shrink-0 text-slate-500 transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-cyan-300" />
          ) : null}
        </div>
        <p className="mb-5 flex-1 text-sm leading-relaxed text-slate-400">{project.description}</p>
        <div className="flex flex-wrap gap-2">
          {project.tags.map((tag) => (
            <span
              key={`${project.slug}-${tag}`}
              className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-medium text-slate-300"
            >
              {tag}
            </span>
          ))}
        </div>
        <div className="mt-5 border-t border-white/[0.06] pt-4">
          {hasLive ? (
            <span className="inline-flex items-center gap-2 text-sm font-medium text-cyan-300">
              <ExternalLink className="h-4 w-4" />
              View live project
            </span>
          ) : (
            <span className="text-sm font-medium text-slate-500">Coming soon</span>
          )}
        </div>
      </div>
    </div>
  );

  if (hasLive) {
    return (
      <a
        href={project.link}
        target="_blank"
        rel="noopener noreferrer"
        className="block h-full"
        data-cursor-hover
      >
        {shell}
      </a>
    );
  }

  return shell;
}

type ProjectsGalleryProps = { className?: string };

export default function ProjectsGallery({ className = "" }: ProjectsGalleryProps) {
  return (
    <div className={className}>
      <ElectricBorder
        color={ELECTRIC_BORDER_HEX}
        borderRadius={28}
        speed={1}
        chaos={0.12}
        solidGlow={false}
        style={{ borderRadius: 28 }}
      >
        <div className="flex flex-col p-5 sm:p-7 md:p-8">
          {cardProjects.map((project, i) => (
            <Fragment key={project.slug}>
              {i > 0 ? <ProjectDivider /> : null}
              <ProjectCard project={project} />
            </Fragment>
          ))}
        </div>
      </ElectricBorder>
    </div>
  );
}
