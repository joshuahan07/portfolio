import { useEffect, useState } from "react";
import {
  Mail,
  Linkedin,
  Github,
  ExternalLink,
  Star,
  GitFork,
  Code2,
  Loader2,
  AlertCircle,
} from "lucide-react";
import SectionHeader from "@/components/SectionHeader";

interface Repo {
  id: number;
  name: string;
  description: string | null;
  stargazers_count: number;
  forks_count: number;
  language: string | null;
  html_url: string;
  updated_at: string;
}

const GITHUB_USERNAME = import.meta.env.VITE_GITHUB_USERNAME?.trim() || "octocat";

export default function Contact() {
  const [repos, setRepos] = useState<Repo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRepos = async () => {
      try {
        const response = await fetch(
          `https://api.github.com/users/${GITHUB_USERNAME}/repos?sort=updated&per_page=6`,
        );
        if (!response.ok) throw new Error("Failed to fetch repos");
        const data = await response.json();
        setRepos(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };
    fetchRepos();
  }, []);

  return (
    <section id="contact" className="relative px-6 py-16 md:py-24">
      <div className="absolute inset-0 z-0">
        <div className="absolute bottom-0 left-1/2 h-[400px] w-[800px] -translate-x-1/2 rounded-full bg-violet-600/10 blur-[150px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-6xl">
      <SectionHeader
        eyebrow="Let's connect"
        title="Get in touch"
        description="I'm always open to discussing new projects, creative ideas, or opportunities to be part of your vision."
        accent="rose"
      />

      <div className="mb-10 grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-7">
        <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-rose-500/[0.06] to-white/[0.02] p-8 shadow-xl shadow-black/30">
          <h3 className="mb-6 text-2xl font-bold text-white">Contact Info</h3>
          <div className="space-y-4">
            <a
              href="mailto:thejoshuahan@gmail.com"
              className="flex items-center gap-4 rounded-xl border border-transparent bg-white/5 p-4 transition-all hover:-translate-y-0.5 hover:border-rose-500/25 hover:bg-white/10"
            >
              <div className="rounded-lg bg-violet-500/20 p-3 transition-colors group-hover:bg-violet-500/30">
                <Mail className="h-5 w-5 text-violet-400" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Email</p>
                <p className="font-medium text-white">thejoshuahan@gmail.com</p>
              </div>
            </a>
            <a
              href="https://linkedin.com/in/jh-joshua-han"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-4 rounded-xl border border-transparent bg-white/5 p-4 transition-all hover:-translate-y-0.5 hover:border-rose-500/25 hover:bg-white/10"
            >
              <div className="rounded-lg bg-cyan-500/20 p-3">
                <Linkedin className="h-5 w-5 text-cyan-400" />
              </div>
              <div>
                <p className="text-sm text-slate-500">LinkedIn</p>
                <p className="font-medium text-white">linkedin.com/in/jh-joshua-han</p>
              </div>
            </a>
            <a
              href={`https://github.com/${GITHUB_USERNAME}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-4 rounded-xl border border-transparent bg-white/5 p-4 transition-all hover:-translate-y-0.5 hover:border-rose-500/25 hover:bg-white/10"
            >
              <div className="rounded-lg bg-rose-500/20 p-3">
                <Github className="h-5 w-5 text-rose-400" />
              </div>
              <div>
                <p className="text-sm text-slate-500">GitHub</p>
                <p className="font-medium text-white">@{GITHUB_USERNAME}</p>
              </div>
            </a>
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.06] to-white/[0.02] p-8 shadow-xl shadow-black/30">
          <div className="mb-6 flex items-center justify-between">
            <h3 className="text-2xl font-bold text-white">GitHub Activity</h3>
            <a
              href={`https://github.com/${GITHUB_USERNAME}`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg border border-white/10 bg-white/5 p-2 transition-colors hover:border-rose-400/30 hover:bg-white/10"
            >
              <ExternalLink className="h-4 w-4 text-slate-400" />
            </a>
          </div>

          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-rose-400" />
            </div>
          )}

          {error && (
            <div className="flex items-center gap-3 rounded-xl bg-red-500/10 p-4 text-red-400">
              <AlertCircle className="h-5 w-5" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          {!loading && !error && (
            <div className="max-h-[320px] space-y-3 overflow-y-auto pr-2">
              {repos.map((repo) => (
                <a
                  key={repo.id}
                  href={repo.html_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block rounded-xl border border-transparent bg-white/5 p-4 transition-all hover:-translate-y-0.5 hover:border-rose-500/20 hover:bg-white/10"
                >
                  <div className="mb-2 flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <Code2 className="h-4 w-4 text-slate-500" />
                      <span className="font-semibold text-white transition-colors group-hover:text-rose-300">
                        {repo.name}
                      </span>
                    </div>
                    <span className="text-xs text-slate-500">
                      {new Date(repo.updated_at).toLocaleDateString()}
                    </span>
                  </div>
                  {repo.description && (
                    <p className="mb-3 line-clamp-2 text-sm text-slate-400">{repo.description}</p>
                  )}
                  <div className="flex items-center gap-4 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <Star className="h-3 w-3" />
                      {repo.stargazers_count}
                    </span>
                    <span className="flex items-center gap-1">
                      <GitFork className="h-3 w-3" />
                      {repo.forks_count}
                    </span>
                    {repo.language && <span>{repo.language}</span>}
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>
      </div>

      <footer className="border-t border-white/10 pt-8 text-center">
        <p className="text-sm text-slate-500">
          © {new Date().getFullYear()} Joshua Han. Built with React, Tailwind, and Three.js.
        </p>
      </footer>
      </div>
    </section>
  );
}
