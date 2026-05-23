/** Matches Featured Projects `ElectricBorder` (Tailwind cyan-400). */
export const ELECTRIC_BORDER_HEX = "#22d3ee";

export const ELECTRIC_RGB = { r: 34, g: 211, b: 238 } as const;
export const ELECTRIC_CORE_RGB = { r: 207, g: 250, b: 254 } as const;
export const ELECTRIC_GLOW_RGB = { r: 103, g: 232, b: 249 } as const;
export const ELECTRIC_DEEP_RGB = { r: 6, g: 182, b: 212 } as const;

export function electricRgba(
  c: { readonly r: number; readonly g: number; readonly b: number },
  a: number,
): string {
  return `rgba(${c.r},${c.g},${c.b},${a})`;
}

export const ELECTRIC_FLASH_GRADIENT =
  "radial-gradient(circle at 50% 40%, rgba(207,250,254,1), rgba(34,211,238,0.82) 45%, rgba(6,182,212,0.38) 100%)";
