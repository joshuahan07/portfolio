/** Normalized 0–1 coordinates within the basketball scene. */
export type PathPoint = { x: number; y: number };

const STORAGE_KEY = "portfolio:basketball-scroll-path-v1";

export function loadBasketballPath(): PathPoint[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed) || parsed.length < 2) return null;
    const points = parsed
      .map((p) => {
        if (typeof p !== "object" || p === null) return null;
        const { x, y } = p as { x?: unknown; y?: unknown };
        if (typeof x !== "number" || typeof y !== "number") return null;
        return {
          x: Math.max(0, Math.min(1, x)),
          y: Math.max(0, Math.min(1, y)),
        };
      })
      .filter((p): p is PathPoint => p !== null);
    return points.length >= 2 ? points : null;
  } catch {
    return null;
  }
}

export function saveBasketballPath(points: PathPoint[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(points));
}

export function clearBasketballPath(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
}
