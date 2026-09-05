import { useEffect, useRef, useState } from "react";
import type { BounceMotion } from "./basketballScrollPhases";

/** Dev server, or any build with `?basketballDebug=1` in the URL. */
export function useBasketballScrollDebug(): boolean {
  const [enabled, setEnabled] = useState(() => {
    if (typeof window === "undefined") return import.meta.env.DEV;
    const q = new URLSearchParams(window.location.search);
    return import.meta.env.DEV || q.has("basketballDebug");
  });

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const on = import.meta.env.DEV || q.has("basketballDebug");
    setEnabled(on);
    if (on) {
      console.info(
        "[basketball] Debug ON — fall until card 19%; arc (B2–5) until 45%. HUD: #basketball-scroll-debug",
      );
    }
  }, []);

  return enabled;
}

export type BasketballDebugSnapshot = {
  shotProgress: number;
  cardReveal: number;
  bounceMotion: BounceMotion;
  ballActive: boolean;
  showBall: boolean;
  hasLockedPath: boolean;
  shotComplete: boolean;
};

export function useBasketballDebugLogger(
  enabled: boolean,
  snapshot: BasketballDebugSnapshot,
): void {
  const lastKeyRef = useRef("");

  useEffect(() => {
    if (!enabled) return;

    const { bounceMotion: m } = snapshot;
    const key = [
      Math.round(snapshot.shotProgress * 100),
      Math.round(snapshot.cardReveal * 100),
      Math.round(m.fallT * 100),
      Math.round(m.arcT * 100),
      snapshot.ballActive,
      snapshot.showBall,
    ].join("|");

    if (key === lastKeyRef.current) return;
    lastKeyRef.current = key;

    console.info("[basketball scroll]", {
      shot: `${Math.round(snapshot.shotProgress * 100)}%`,
      card: `${Math.round(snapshot.cardReveal * 100)}%`,
      fall: snapshot.shotComplete ? `${Math.round(m.fallT * 100)}%` : "—",
      arc: `${Math.round(m.arcT * 100)}%`,
      ballActive: snapshot.ballActive,
      showBall: snapshot.showBall,
      pathLocked: snapshot.hasLockedPath,
    });
  }, [enabled, snapshot]);
}
