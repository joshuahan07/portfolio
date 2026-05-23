export type NormalizedPoint = {
  x: number;
  y: number;
};

export type CanvasConceptProps = {
  playKey?: number;
  onReady?: () => void;
  /** When > 0, starts the pour sequence (used with scroll-triggered bottle) */
  pourTrigger?: number;
  /** Wait for pourTrigger instead of auto-playing on mount */
  waitForPour?: boolean;
  /** Bottle mouth position relative to the card (0–1), used for scroll-pour */
  pourOrigin?: NormalizedPoint | null;
};
