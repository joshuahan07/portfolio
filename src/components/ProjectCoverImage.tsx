import { useMemo, useState } from "react";
import { projectCoverCandidates, PUBLIC_ASSET_VERSION } from "@/lib/publicUrl";

const COVER_CACHE_BUST_SLUGS = new Set(["paralume", "great-rivers-demo"]);

type Props = {
  slug: string;
  cover: string;
  title: string;
  /** Pin crop so the image top meets the frame top (`object-top`). Ignored when `objectPositionClass` is set. */
  alignTop?: boolean;
  /** Tailwind `object-*` position (after `object-cover`). Overrides `alignTop`/default center when set. */
  objectPositionClass?: string;
};

/** Tries `/public/projects/…` URLs in sequence (declared cover, then png/jpg/svg by slug). */
export default function ProjectCoverImage({
  slug,
  cover,
  title,
  alignTop,
  objectPositionClass,
}: Props) {
  const candidates = useMemo(
    () => projectCoverCandidates(slug, cover),
    [slug, cover],
  );
  const [index, setIndex] = useState(0);

  if (index >= candidates.length) {
    return (
      <div className="flex h-full min-h-[12rem] w-full flex-col items-center justify-center gap-2 bg-black/40 px-4 text-center text-xs text-slate-500">
        <span>No preview loaded.</span>
        <span className="font-mono text-[11px] text-slate-400">
          public/projects/<span className="text-violet-300">{slug}</span>
          .png · .webp · .jpg · .svg
        </span>
      </div>
    );
  }

  const rawSrc = candidates[index];
  const src =
    COVER_CACHE_BUST_SLUGS.has(slug) && index === 0
      ? `${rawSrc}${rawSrc.includes("?") ? "&" : "?"}v=${PUBLIC_ASSET_VERSION}`
      : rawSrc;

  const position =
    objectPositionClass ?? (alignTop ? "object-top" : "object-center");

  const fitClass = "object-cover";

  return (
    <img
      src={src}
      alt={`${title} cover preview`}
      width={1600}
      height={1000}
      loading="eager"
      decoding="async"
      onError={() => setIndex((i) => i + 1)}
      className={`h-full w-full bg-black/80 transition-transform duration-700 group-hover:scale-[1.03] ${fitClass} ${position}`}
    />
  );
}
