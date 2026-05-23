/** Detached teardrop — animated with GSAP from bottle to bloom card */
export default function FallingInkDrop() {
  return (
    <svg viewBox="0 0 18 26" width="18" height="26" overflow="visible" aria-hidden>
      <defs>
        <radialGradient id="ink-fd-grad" cx="35%" cy="30%" r="65%">
          <stop offset="0%" stopColor="#2a2a3a" />
          <stop offset="100%" stopColor="#0a0a0a" />
        </radialGradient>
      </defs>
      <path
        d="M 9 0 C 13 5 17 11 17 16 C 17 22 13 26 9 26 C 5 26 1 22 1 16 C 1 11 5 5 9 0 Z"
        fill="url(#ink-fd-grad)"
      />
      <ellipse cx="6.5" cy="10" rx="2" ry="4" fill="rgba(70,70,90,0.4)" />
    </svg>
  );
}
