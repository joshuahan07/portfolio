import PhosphorScope from "./shared/PhosphorScope";
import { ABOUT_COPY } from "./content";

const COMIC_SANS = '"Comic Sans MS", "Comic Sans", cursive';
const NEON_TEXT_GLOW = "0 0 18px rgba(103,232,249,0.5), 0 0 4px rgba(224,247,255,0.6)";

export default function AboutPhosphorCard() {
  const bodies = [ABOUT_COPY.school, ABOUT_COPY.build, ABOUT_COPY.life];
  const bodyColors = [
    "rgba(214,241,255,0.88)",
    "rgba(214,241,255,0.74)",
    "rgba(214,241,255,0.6)",
  ];

  return (
    <div className="relative flex min-h-[min(580px,82vh)] w-full items-center justify-center px-4 py-10 sm:px-6">
      <PhosphorScope
        startOnView
        loop
        loopDelayMs={5000}
        className="about-phosphor-card w-full max-w-lg overflow-hidden rounded-2xl border border-cyan-300/40 bg-gradient-to-b from-[#061420] to-[#020609] p-7 sm:p-8"
      >
        <div style={{ display: "block", width: "fit-content", margin: "0 auto 1.5rem", textAlign: "center" }}>
          <h1
            style={{
              fontFamily: COMIC_SANS,
              fontSize: "clamp(2.25rem, 6vw, 3.5rem)",
              fontWeight: 700,
              color: "#eaf9ff",
              marginBottom: "0.5rem",
              letterSpacing: "-0.02em",
              textShadow: NEON_TEXT_GLOW,
            }}
          >
            {ABOUT_COPY.greeting}
          </h1>
          <div
            style={{
              width: "100%",
              height: 2,
              background: "rgba(103,232,249,0.9)",
              boxShadow: "0 0 8px rgba(103,232,249,0.8)",
            }}
          />
        </div>
        {bodies.map((text, i) => (
          <p
            key={i}
            style={{
              fontFamily: COMIC_SANS,
              color: bodyColors[i],
              lineHeight: 1.75,
              marginBottom: i < bodies.length - 1 ? "1rem" : 0,
              fontSize: "0.95rem",
            }}
          >
            {text}
          </p>
        ))}
      </PhosphorScope>
    </div>
  );
}
