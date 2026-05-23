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
    tagline: "A writing coach that refuses to ghostwrite.",
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
    tagline: "Stratego, reimagined.",
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
    tagline: "No blind automation.",
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
    tagline: "An all-in-one companion for WashU's carnival.",
    role: "Project Lead, Google Developer Group WashU",
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
    tagline: "Class scheduling that actually respects your life.",
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
