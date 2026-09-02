import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { MapPin } from "lucide-react";
import AboutInkSplatShowcase from "@/components/about-cinematic/AboutInkSplatShowcase";
import SectionHeader from "@/components/SectionHeader";
import { publicUrl } from "@/lib/publicUrl";
gsap.registerPlugin(ScrollTrigger);

type EducationEntry = {
  title: string;
  subtitle: string;
  meta: string;
  color: string;
  logo: string;
  logoAlt: string;
};

type ExperienceEntry = {
  org: string;
  role: string;
  dates: string;
  location: string;
  logo: string;
  logoAlt: string;
  /** `contain` keeps tall/wide marks (e.g. Paralume pencil) from being cropped. */
  logoFit?: "cover" | "contain";
};

const education: EducationEntry[] = [
  {
    title: "Washington University in St. Louis",
    subtitle:
      "Joint Business & Computer Science Program (B.S.) · GPA: 3.84",
    meta: "Aug 2025 - May 2029",
    color: "bg-violet-500",
    logo: "logos/washu.png",
    logoAlt: "Washington University in St. Louis",
  },
  {
    title: "North Hollywood High School",
    subtitle:
      "Valedictorian · School rank: 1/374 · Weighted GPA: 4.7/4.0",
    meta: "Aug 2021 - June 2025",
    color: "bg-cyan-500",
    logo: "logos/north-hollywood-hs.png",
    logoAlt: "North Hollywood High School Huskies",
  },
];

const experiences: ExperienceEntry[] = [
  {
    org: "McGraw Hill",
    role: "Product Operations Intern",
    dates: "May - August 2026",
    location: "Remote",
    logo: "logos/mcgraw-hill.png",
    logoAlt: "McGraw Hill",
  },
  {
    org: "Paralume AI",
    role: "Co-Founder & COO",
    dates: "January 2026 - Present",
    location: "St. Louis, MO",
    logo: "logos/paralume.png",
    logoAlt: "Paralume",
    logoFit: "contain",
  },
  {
    org: "Great Rivers Environmental Law Center",
    role: "Consultant",
    dates: "January - May 2026",
    location: "St. Louis, MO",
    logo: "logos/great-rivers.png",
    logoAlt: "Great Rivers Environmental Law Center",
  },
  {
    org: "Google Developer Group in WashU",
    role: "Project Management Lead",
    dates: "January - August 2026",
    location: "St. Louis, MO",
    logo: "logos/gdg.png",
    logoAlt: "Google Developer Groups",
  },
  {
    org: "OnTrack",
    role: "Founder & Builder",
    dates: "August - December 2025",
    location: "St. Louis, MO",
    logo: "logos/ontrack.png",
    logoAlt: "OnTrack",
  },
  {
    org: "City of West Hollywood",
    role: "Recreation Leader",
    dates: "May - June 2025",
    location: "West Hollywood, CA",
    logo: "logos/west-hollywood.png",
    logoAlt: "City of West Hollywood",
  },
  {
    org: "Kumon",
    role: "Teaching Assistant",
    dates: "January - May 2025",
    location: "Studio City, CA",
    logo: "logos/kumon.png",
    logoAlt: "Kumon",
  },
];

export default function About() {
  const sectionRef = useRef<HTMLElement>(null);
  const lineRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const section = sectionRef.current;
    const line = lineRef.current;
    if (!section || !line) return;

    const aboutCard = section.querySelector(".about-me-card");
    const track = section.querySelector('[data-about="experience-track"]');
    if (!track) return;

    const reduceMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduceMotion) {
      if (aboutCard) gsap.set(aboutCard, { opacity: 1, y: 0 });
      gsap.set(line, { scaleY: 1 });
      itemRefs.current.forEach((item) => item && gsap.set(item, { opacity: 1, x: 0 }));
      return;
    }

    const ctx = gsap.context(() => {
      if (aboutCard) {
        gsap.fromTo(
          aboutCard,
          { opacity: 0, y: 28 },
          {
            opacity: 1,
            y: 0,
            duration: 0.85,
            ease: "power3.out",
            scrollTrigger: {
              trigger: aboutCard,
              start: "top 88%",
              toggleActions: "play none none reverse",
            },
          },
        );
      }

      gsap.fromTo(
        line,
        { scaleY: 0 },
        {
          scaleY: 1,
          ease: "none",
          scrollTrigger: {
            trigger: track,
            start: "top 62%",
            end: "bottom 72%",
            scrub: 1,
          },
        },
      );

      itemRefs.current.forEach((item, i) => {
        if (!item) return;
        gsap.fromTo(
          item,
          { opacity: 0, x: i % 2 === 0 ? -40 : 40 },
          {
            opacity: 1,
            x: 0,
            duration: 0.75,
            ease: "power3.out",
            scrollTrigger: {
              trigger: item,
              start: "top 88%",
              toggleActions: "play none none reverse",
            },
          },
        );
      });
    }, section);

    return () => ctx.revert();
  }, []);

  return (
    <section id="about" ref={sectionRef} className="relative px-6 pb-20 pt-2 md:pb-24 md:pt-4">
      <div className="pointer-events-none absolute inset-0 opacity-40">
        <div className="absolute left-1/2 top-[40%] h-[480px] w-[480px] -translate-x-1/2 rounded-full bg-violet-600/25 blur-[120px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-5xl">
      <div className="mb-10 md:mb-14">
        <AboutInkSplatShowcase />
      </div>

      <SectionHeader
        eyebrow="Profile"
        title="About me"
        description="Developer · founder · student — building products end to end."
      />

      <h3 className="mb-4 text-center font-mono text-[11px] font-semibold uppercase tracking-[0.4em] text-slate-500">
        Education
      </h3>
      <div className="mb-14 grid gap-5 sm:grid-cols-2 md:mb-16">
        {education.map((edu) => {
          return (
            <div
              key={edu.title}
              className="education-card group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.09] to-white/[0.02] p-6 shadow-xl shadow-black/30 transition-all duration-300 hover:-translate-y-1 hover:border-violet-400/25 hover:shadow-[0_20px_60px_-24px_rgba(167,139,250,0.35)]"
            >
              <div
                className={`absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100 ${edu.color}/10`}
                aria-hidden
              />
              <span className="education-logo relative mb-5">
                <img
                  src={publicUrl(edu.logo, { bustCache: true })}
                  alt={edu.logoAlt}
                  loading="lazy"
                  decoding="async"
                />
              </span>
              <h4 className="relative text-lg font-bold tracking-tight text-white">{edu.title}</h4>
              <p className="relative mt-2 text-sm leading-relaxed text-slate-400">{edu.subtitle}</p>
              <p className="relative mt-4 font-mono text-[11px] tracking-wide text-violet-300/90">
                {edu.meta}
              </p>
            </div>
          );
        })}
      </div>

      <div className="mb-10 flex flex-col items-center gap-2">
        <h3 className="font-mono text-[11px] font-semibold uppercase tracking-[0.4em] text-slate-500">
          Experience
        </h3>
        <div className="h-px w-24 bg-gradient-to-r from-transparent via-violet-500 to-transparent opacity-70" />
      </div>

      <div className="relative pb-4" data-about="experience-track">
        <div
          ref={lineRef}
          className="absolute bottom-0 left-6 top-0 hidden origin-top overflow-hidden sm:left-1/2 sm:block sm:-translate-x-1/2"
        >
          <div className="h-full w-px bg-gradient-to-b from-violet-400 via-cyan-400 to-rose-500 shadow-[0_0_20px_rgba(139,92,246,0.45)]" />
        </div>

        <div className="space-y-11 sm:space-y-14">
          {experiences.map((job, i) => {
            const isLeft = i % 2 === 0;

            return (
              <div
                key={`${job.org}-${job.role}`}
                ref={(el) => {
                  itemRefs.current[i] = el;
                }}
                className={`relative flex items-stretch gap-6 sm:gap-0 ${isLeft ? "sm:flex-row" : "sm:flex-row-reverse"}`}
              >
                <div
                  className={`flex flex-1 sm:max-w-[calc(50%-2rem)] sm:px-8 ${isLeft ? "sm:ml-0 sm:mr-auto sm:pr-14" : "sm:mr-0 sm:ml-auto sm:pl-14"}`}
                >
                  <article className="group/card relative w-full overflow-hidden rounded-3xl border border-white/12 bg-black/35 shadow-2xl shadow-black/40 ring-1 ring-white/5 backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:border-violet-400/35 hover:shadow-[0_24px_80px_-20px_rgba(124,58,237,0.22)]">
                    <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-violet-500 via-cyan-400 to-transparent opacity-90" />

                    <div className="p-6 pt-8 sm:p-8">
                      <div
                        className={`mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between ${isLeft ? "sm:flex-row-reverse" : ""}`}
                      >
                        <span
                          className={`experience-logo shrink-0${job.logoFit === "contain" ? " experience-logo--contain" : ""}`}
                        >
                          <img
                            src={publicUrl(job.logo, { bustCache: true })}
                            alt={job.logoAlt}
                            loading="lazy"
                            decoding="async"
                          />
                        </span>
                        <div
                          className={`flex shrink-0 flex-col gap-2 font-mono text-[11px] uppercase tracking-[0.12em] text-slate-500 sm:text-right ${isLeft ? "sm:items-start sm:text-left" : "sm:items-end"}`}
                        >
                          <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-emerald-200/95">
                            {job.dates}
                          </span>
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-black/40 px-3 py-1 text-[10px] normal-case tracking-normal text-slate-300">
                            <MapPin className="h-3.5 w-3.5 text-violet-400" aria-hidden />
                            {job.location}
                          </span>
                        </div>
                      </div>

                      <h4 className="text-xl font-bold leading-tight tracking-tight text-white sm:text-[1.35rem]">
                        {job.org}
                      </h4>
                      <p className="mt-3 inline-flex rounded-lg bg-violet-500/15 px-3 py-1 text-sm font-medium text-violet-100 ring-1 ring-violet-400/25">
                        {job.role}
                      </p>
                    </div>
                  </article>
                </div>

                <div className="absolute left-6 top-10 z-10 hidden sm:left-1/2 sm:flex sm:-translate-x-1/2">
                  <span className="flex h-[18px] w-[18px] items-center justify-center rounded-full border-2 border-white/70 bg-[hsl(240_18%_6%)] shadow-[0_0_22px_rgba(139,92,246,0.75)] ring-4 ring-black/70">
                    <span className="h-2.5 w-2.5 rounded-full bg-gradient-to-br from-violet-400 to-fuchsia-500" />
                  </span>
                </div>

                <div className="hidden flex-1 sm:block" />
              </div>
            );
          })}
        </div>
      </div>

      </div>
    </section>
  );
}
