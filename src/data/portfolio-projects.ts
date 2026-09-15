export type Decision = {
  decision: string;
  reasoning: string;
};

export type Project = {
  slug: string;
  number: string;
  title: string;
  tagline: string;
  role: string;
  year: string;
  stack: string[];
  liveUrl: string;
  cover: string;
  problem: string[];
  built: string[];
  decisions: Decision[];
  outcome: string;
};

export const projects: Project[] = [
  {
    slug: "paralume",
    number: "01",
    title: "Paralume",
    tagline: "An AI writing coach that guides you on what to write sentence by sentence.",
    role: "Co-founder, builder",
    year: "Nov 2025 – present",
    stack: ["Next.js", "TipTap", "Gemini API", "Supabase", "PostHog"],
    liveUrl: "https://paralume.ai",
    cover: "/projects/paralume.png",
    problem: [],
    built: [],
    decisions: [],
    outcome: "",
  },
  {
    slug: "outrank",
    number: "02",
    title: "Outrank",
    tagline: "Stratego, reimagined (with different themes).",
    role: "Built for fun",
    year: "2025",
    stack: ["Next.js", "Socket.IO", "Custom game engine"],
    liveUrl: "https://outrank-two.vercel.app/",
    cover: "/projects/outrank.svg",
    problem: [],
    built: [],
    decisions: [],
    outcome: "",
  },
  {
    slug: "great-rivers-demo",
    number: "03",
    title: "Great Rivers Demo",
    tagline: "",
    role: "Client demo for Great Rivers Environmental Law Center",
    year: "2025",
    stack: ["React (single-file demo)"],
    liveUrl: "https://grc-demo.vercel.app/",
    cover: "/projects/great-rivers.jpg",
    problem: [],
    built: [],
    decisions: [],
    outcome: "",
  },
  {
    slug: "thurtene",
    number: "04",
    title: "ThurtenE Carnival App",
    tagline: "Website for the ThurtenE Carnival event day.",
    role: "GDG X ThurtenE",
    year: "2025",
    stack: ["Vite", "React", "Tailwind v4", "shadcn/ui", "Supabase"],
    liveUrl: "https://thurten-e.vercel.app/",
    cover: "/projects/thurtene.svg",
    problem: [],
    built: [],
    decisions: [],
    outcome: "",
  },
  {
    slug: "ontrack",
    number: "05",
    title: "OnTrack",
    tagline: "A painless way to draft all your schedules for registration.",
    role: "Solo founder",
    year: "2024",
    stack: ["Next.js 14", "TypeScript", "Supabase"],
    liveUrl: "https://ontrack-flame.vercel.app/",
    cover: "/projects/ontrack.svg",
    problem: [],
    built: [],
    decisions: [],
    outcome: "",
  },
];
