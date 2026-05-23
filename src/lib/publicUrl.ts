/** Bump when replacing files under `/public` so browsers pick up new raster assets. */
export const PUBLIC_ASSET_VERSION = "12";

/** URL for a file under `/public`. Works whether `vite.config` uses `base: '/'` or a subpath. */
export function publicUrl(
  pathFromPublicFolder: string,
  options?: { bustCache?: boolean },
): string {
  const cleaned = pathFromPublicFolder.replace(/^\/+/, "");
  const raw = import.meta.env.BASE_URL;

  const base =
    !raw || raw === "/" || raw === "./"
      ? `/${cleaned}`
      : `${raw.endsWith("/") ? raw : `${raw}/`}${cleaned}`;

  if (!options?.bustCache) return base;
  const sep = base.includes("?") ? "&" : "?";
  return `${base}${sep}v=${PUBLIC_ASSET_VERSION}`;
}

const RASTER_EXT = ["webp", "png", "jpg", "jpeg"] as const;

function isRasterPath(path: string): boolean {
  const lower = path.toLowerCase();
  return RASTER_EXT.some((ext) => lower.endsWith(`.${ext}`));
}

/** Slugs that match a differently named asset (e.g. great-rivers.jpg vs great-rivers-demo slug). */
const SLUG_FILENAME_ALTERNATES: Record<string, string[]> = {
  "great-rivers-demo": ["great-rivers-demo", "great-rivers", "grc"],
};

/**
 * Cover URL fallbacks for featured project cards.
 * Declared raster covers win first; slug-based discovery is for extra filenames only.
 * Keep company logos in `public/logos/` — not `public/projects/`.
 */
export function projectCoverCandidates(
  slug: string,
  declaredCover: string,
): string[] {
  const seen = new Set<string>();
  const out: string[] = [];

  const add = (path: string) => {
    const url = publicUrl(path.replace(/^\/+/, ""));
    if (!seen.has(url)) {
      seen.add(url);
      out.push(url);
    }
  };

  const declared = declaredCover.replace(/^\/+/, "");
  const baseNames = SLUG_FILENAME_ALTERNATES[slug] ?? [slug];

  if (isRasterPath(declared)) {
    add(declared);
  }

  for (const name of baseNames) {
    for (const ext of RASTER_EXT) {
      add(`projects/${name}.${ext}`);
    }
  }

  if (!isRasterPath(declared)) {
    add(declared);
  }

  for (const name of baseNames) {
    add(`projects/${name}.svg`);
  }

  return out;
}
