import { clamp } from "./inkBottleMath";

/** Pour starts from the nozzle end (bottom of bbox when fully inverted). */
export function getBottleNozzleScreenPoint(bottleWrapEl: HTMLElement): {
  x: number;
  y: number;
} {
  const img = bottleWrapEl.querySelector("img");
  const rect = (img ?? bottleWrapEl).getBoundingClientRect();

  return {
    x: rect.left + rect.width * 0.5,
    y: rect.bottom - rect.height * 0.04,
  };
}

export function mouthOriginInCard(
  bottleWrapEl: HTMLElement,
  cardEl: HTMLElement,
): { x: number; y: number } {
  const mouth = getBottleNozzleScreenPoint(bottleWrapEl);
  const cr = cardEl.getBoundingClientRect();

  return {
    x: clamp((mouth.x - cr.left) / Math.max(1, cr.width), 0.05, 0.95),
    y: clamp((mouth.y - cr.top) / Math.max(1, cr.height), 0, 0.1),
  };
}
