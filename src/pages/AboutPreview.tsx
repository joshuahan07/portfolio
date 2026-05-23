import { Link } from "react-router";
import AboutInkSplatShowcase from "@/components/about-cinematic/AboutInkSplatShowcase";

export default function AboutPreview() {
  return (
    <div className="relative min-h-screen bg-[#0a0a0f] px-6 py-16">
      <div className="pointer-events-none absolute inset-0 opacity-30">
        <div className="absolute left-1/2 top-1/3 h-[400px] w-[400px] -translate-x-1/2 rounded-full bg-violet-600/20 blur-[100px]" />
      </div>
      <div className="relative z-10 mx-auto max-w-4xl">
        <Link
          to="/"
          className="mb-8 inline-flex font-mono text-[10px] uppercase tracking-[0.25em] text-slate-500 transition-colors hover:text-violet-300"
        >
          ← Back to portfolio
        </Link>
        <h1 className="mb-10 text-center text-2xl font-semibold tracking-tight text-white">
          About
        </h1>
        <AboutInkSplatShowcase />
      </div>
    </div>
  );
}
