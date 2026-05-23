# Ink splat only (no bottle)

Self-contained splat animation: drop → impact streaks → organic bloom → bio overlay.

## Install

```bash
npm install gsap simplex-noise
```

## Files

| File | Purpose |
|------|---------|
| `InkSplatShowcase.tsx` | Wrapper with replay button |
| `canvas/InkBloomSplatCard.tsx` | **Main splat engine** (canvas + GSAP) |
| `canvas/AboutCanvasCard.tsx` | Bio text overlay |
| `canvas/types.ts` | Props types |
| `canvas/useCardFade.ts` | Bio fade-in |
| `hooks/useReducedMotion.ts` | Accessibility |
| `content.ts` | Bio copy strings |
| `ink-splat.css` | Minimal stage styles |

## Usage

```tsx
import "./ink-splat-export/ink-splat.css";
import InkSplatShowcase from "./ink-splat-export/InkSplatShowcase";

export default function About() {
  return <InkSplatShowcase />;
}
```

`InkBloomSplatCard` auto-plays on mount. Do **not** pass `waitForPour` (that is for the bottle scroll integration).

## In this repo (already wired)

Live source: `src/components/about-cinematic/canvas/InkBloomSplatCard.tsx`
