export type BottlePosition = { x: number; y: number };

const STORAGE_KEY = "portfolio:ink-bottle-position-v1";

export const DEFAULT_BOTTLE_POSITION: BottlePosition = {
  x: 0.49519566127232145,
  y: 0.7929890158884566,
};

export function loadBottlePosition(): BottlePosition {
  if (typeof window === "undefined") return DEFAULT_BOTTLE_POSITION;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_BOTTLE_POSITION;
    const { x, y } = JSON.parse(raw) as { x?: unknown; y?: unknown };
    if (typeof x !== "number" || typeof y !== "number") return DEFAULT_BOTTLE_POSITION;
    return {
      x: Math.max(0.05, Math.min(0.95, x)),
      y: Math.max(0.1, Math.min(0.95, y)),
    };
  } catch {
    return DEFAULT_BOTTLE_POSITION;
  }
}

export function saveBottlePosition(pos: BottlePosition): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(pos));
}

export function clearBottlePosition(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
}
