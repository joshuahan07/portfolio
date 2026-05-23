import { Github, Linkedin, Mail } from "lucide-react";
import SectionHeader from "@/components/SectionHeader";

const GITHUB_USERNAME =
  import.meta.env.VITE_GITHUB_USERNAME?.trim() || "joshuahan07";

const links = [
  {
    icon: Mail,
    label: "Email",
    value: "thejoshuahan@gmail.com",
    href: "mailto:thejoshuahan@gmail.com",
    accent: "text-violet-400",
    hover: "hover:border-violet-400/30",
  },
  {
    icon: Linkedin,
    label: "LinkedIn",
    value: "linkedin.com/in/jh-joshua-han",
    href: "https://linkedin.com/in/jh-joshua-han",
    accent: "text-cyan-400",
    hover: "hover:border-cyan-400/30",
  },
  {
    icon: Github,
    label: "GitHub",
    value: `github.com/${GITHUB_USERNAME}`,
    href: `https://github.com/${GITHUB_USERNAME}`,
    accent: "text-rose-400",
    hover: "hover:border-rose-400/30",
  },
] as const;

export default function Connect() {
  return (
    <section id="connect" className="relative px-6 py-16 md:py-24">
      <div className="pointer-events-none absolute inset-0 z-0">
        <div className="absolute bottom-10 left-[20%] h-72 w-72 rounded-full bg-violet-600/15 blur-[100px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-5xl">
        <SectionHeader
          eyebrow="Contact"
          title="Connect"
          description="Open to internships, collaborations, and conversations about building products!"
          accent="violet"
        />

        <div className="grid gap-4 sm:grid-cols-3">
          {links.map((item) => {
            const Icon = item.icon;
            return (
              <a
                key={item.label}
                href={item.href}
                target={item.href.startsWith("http") ? "_blank" : undefined}
                rel={item.href.startsWith("http") ? "noopener noreferrer" : undefined}
                className={`group flex flex-col items-center rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.07] to-white/[0.02] p-6 text-center shadow-lg shadow-black/30 transition-all duration-300 hover:-translate-y-1 hover:bg-white/[0.07] ${item.hover}`}
                data-cursor-hover
              >
                <Icon
                  className={`mb-4 h-8 w-8 transition-transform duration-300 group-hover:scale-110 ${item.accent}`}
                  aria-hidden
                />
                <p className="text-[10px] font-semibold uppercase tracking-[0.4em] text-slate-500">
                  {item.label}
                </p>
                <p className="mt-2 break-words text-sm font-medium text-white">{item.value}</p>
              </a>
            );
          })}
        </div>

        <footer className="mt-12 border-t border-white/10 pt-8 text-center">
          <p className="text-sm text-slate-500">
            © {new Date().getFullYear()} Joshua Han. Built with React, Tailwind, and Three.js.
          </p>
        </footer>
      </div>
    </section>
  );
}
