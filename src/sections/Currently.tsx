import { useEffect, useState } from "react";
import { BookOpen, Cpu, Github, Headphones, GraduationCap } from "lucide-react";

const LAST_UPDATED = "2026-04-20T12:00:00Z";
const CLASS_COUNT = 5;

type SpotifyState = {
  isPlaying: boolean;
  title: string;
  artist: string;
  url: string;
  stub?: boolean;
};

type GitHubStatsPayload = {
  username: string;
  commitsThisMonth: number;
  topLanguage: string | null;
  streakDays: number;
  lastUpdated: string;
  error?: string;
};

export default function Currently() {
  const [spotify, setSpotify] = useState<SpotifyState | null>(null);
  const [gh, setGh] = useState<GitHubStatsPayload | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/spotify")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && data) setSpotify(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/github-stats")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && data) setGh(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const commits =
    gh?.error ? "—" : gh != null ? String(gh.commitsThisMonth) : "…";
  const language =
    gh?.error ? "—" : gh != null ? gh.topLanguage ?? "—" : "…";
  const streak =
    gh?.error ? "—" : gh != null ? `${gh.streakDays}d` : "…";

  return (
    <section id="currently" className="relative py-32 px-6">
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-1/2 left-[10%] w-[520px] h-[520px] bg-cyan-600/10 rounded-full blur-[160px]" />
        <div className="absolute top-10 right-[8%] w-[420px] h-[420px] bg-violet-600/10 rounded-full blur-[140px]" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <p className="text-cyan-400 font-semibold tracking-widest uppercase text-sm mb-4">
            Now
          </p>
          <h2 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white mb-4">
            Currently
          </h2>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto">
            A few snapshots of what I&apos;m shipping, studying, listening to —
            plus how actively I&apos;ve been committing.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <GlassCard eyebrow="building">
            <a
              href="https://paralume.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="block"
              data-cursor-hover
            >
              <Cpu className="w-7 h-7 text-violet-300 mb-4" aria-hidden />
              <h3 className="text-xl font-bold text-white">Paralume</h3>
              <p className="mt-2 text-sm text-slate-400 leading-relaxed">
                AI writing coach · real-time TipTap margins
              </p>
              <p className="mt-3 text-xs text-violet-300 font-medium uppercase tracking-wider">
                live site →
              </p>
            </a>
          </GlassCard>

          <GlassCard eyebrow="studying">
            <GraduationCap className="w-7 h-7 text-cyan-300 mb-4" aria-hidden />
            <h3 className="text-xl font-bold text-white">Joint Biz & CS</h3>
            <p className="mt-2 text-sm text-slate-400 leading-relaxed">
              Washington University in St. Louis
            </p>
            <p className="mt-4 inline-flex items-center rounded-xl border border-white/10 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.2em] text-slate-200">
              {CLASS_COUNT} courses
            </p>
          </GlassCard>

          <GlassCard eyebrow="reading">
            <BookOpen className="w-7 h-7 text-emerald-300 mb-4" aria-hidden />
            <h3 className="text-xl font-bold text-white">Reading list</h3>
            <p className="mt-2 text-sm text-slate-400 leading-relaxed">
              Quiet for now · wire Open Library soon
            </p>
          </GlassCard>

          <GlassCard eyebrow="listening">
            <Headphones className="w-7 h-7 text-rose-300 mb-4" aria-hidden />
            {spotify ? (
              <a href={spotify.url} target="_blank" rel="noopener noreferrer" className="block" data-cursor-hover>
                <h3 className="text-xl font-bold text-white">{spotify.title}</h3>
                <p className="mt-2 text-xs uppercase tracking-[0.3em] text-slate-500">
                  {spotify.isPlaying ? "live" : "last saved"}
                </p>
                <p className="mt-3 text-sm text-slate-300">{spotify.artist}</p>
              </a>
            ) : (
              <>
                <h3 className="text-xl font-bold text-white">Fetching…</h3>
                <p className="mt-3 text-sm text-slate-500">Pulling from Spotify stub</p>
              </>
            )}
          </GlassCard>

          <GlassCard eyebrow="shipping">
            {gh ? (
              <a href={`https://github.com/${gh.username}`} target="_blank" rel="noopener noreferrer" className="block" data-cursor-hover>
                <div className="flex items-start justify-between gap-3 mb-5">
                  <div>
                    <Github className="w-7 h-7 text-slate-200 mb-4" aria-hidden />
                    <h3 className="text-xl font-bold text-white">@{gh.username}</h3>
                    <p className="mt-1 text-xs uppercase tracking-[0.3em] text-slate-500">github pulse</p>
                  </div>
                </div>
                <dl className="grid grid-cols-3 gap-4 border border-white/5 rounded-xl p-3 mt-6 bg-black/20">
                  <Stat label="Commits / mo" value={commits} />
                  <Stat label="Lang / wk" value={language} truncate />
                  <Stat label="Streak" value={streak} />
                </dl>
              </a>
            ) : (
              <div className="py-10 text-center">
                <LoaderCopy />
              </div>
            )}
          </GlassCard>
        </div>

        <p className="mt-8 font-mono text-[11px] uppercase tracking-[0.4em] text-slate-500 text-center">
          last refreshed <RelativeStamp iso={LAST_UPDATED} />
        </p>
      </div>
    </section>
  );
}

function GlassCard({
  eyebrow,
  children,
}: {
  eyebrow: string;
  children: React.ReactNode;
}) {
  return (
    <div className="glass rounded-3xl p-6 h-full border border-white/5 hover:bg-white/[0.07] transition-colors duration-300">
      <p className="text-[11px] font-semibold tracking-[0.6em] text-slate-500 uppercase mb-4">
        {eyebrow}
      </p>
      {children}
    </div>
  );
}

function Stat({
  label,
  value,
  truncate,
}: {
  label: string;
  value: string;
  truncate?: boolean;
}) {
  return (
    <div className="space-y-1">
      <dt className="text-[10px] uppercase tracking-widest text-slate-500">{label}</dt>
      <dd
        className={`text-xs font-semibold text-white ${truncate ? "truncate" : ""}`}
        title={truncate ? value : undefined}
      >
        {value}
      </dd>
    </div>
  );
}

function LoaderCopy() {
  return <p className="text-sm text-slate-500">Syncing Github stats…</p>;
}

function RelativeStamp({ iso }: { iso: string }) {
  const [, bump] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => {
      bump((value) => value + 1);
    }, 60_000);
    return () => window.clearInterval(id);
  }, []);

  const label = formatRelative(iso);
  return <span className="text-slate-300">{label}</span>;
}

function formatRelative(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return iso;

  const diff = Date.now() - then;
  const minutes = Math.round(diff / 60_000);
  if (minutes < 1) return "moments ago";
  if (minutes < 60) return `${minutes} min ago`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;

  const months = Math.round(days / 30);
  if (months < 12) return `${months}mo ago`;

  const years = Math.round(months / 12);
  return `${years}y ago`;
}
