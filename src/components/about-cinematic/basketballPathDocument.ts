import type { PathPoint } from "./basketballPathStorage";
import { PRODUCTION_PATH_DOCUMENT } from "./basketballDefaultPathDocument";
import {
  flattenSegmentChain,
  normalizeAnchors,
  reduceToAnchors,
  simplifyPath,
} from "./basketballPathMath";

export type PathSegment = {
  id: string;
  label: string;
  anchors: PathPoint[];
  locked: boolean;
};

export type PathDocument = {
  version: 2;
  shot: PathSegment | null;
  bounces: PathSegment[];
};

const STORAGE_KEY = "portfolio:basketball-path-document-v2";
const LEGACY_KEY = "portfolio:basketball-scroll-path-v1";

function newId() {
  return `seg-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function createEmptyDocument(): PathDocument {
  return { version: 2, shot: null, bounces: [] };
}

export function ensureShotSegment(doc: PathDocument): PathDocument {
  if (doc.shot) return doc;
  return {
    ...doc,
    shot: {
      id: newId(),
      label: "Shot",
      anchors: [
        { x: 0.12, y: 0.72 },
        { x: 0.38, y: 0.28 },
      ],
      locked: false,
    },
  };
}

function parsePoint(p: unknown): PathPoint | null {
  if (typeof p !== "object" || p === null) return null;
  const { x, y } = p as { x?: unknown; y?: unknown };
  if (typeof x !== "number" || typeof y !== "number") return null;
  return { x: Math.max(0, Math.min(1, x)), y: Math.max(0, Math.min(1, y)) };
}

function parseSegment(raw: unknown, fallbackLabel: string): PathSegment | null {
  if (typeof raw !== "object" || raw === null) return null;
  const o = raw as Record<string, unknown>;
  const anchorsRaw = o.anchors;
  if (!Array.isArray(anchorsRaw)) return null;
  const anchors = anchorsRaw
    .map(parsePoint)
    .filter((p): p is PathPoint => p !== null);
  if (anchors.length < 2) return null;
  return {
    id: typeof o.id === "string" ? o.id : newId(),
    label: typeof o.label === "string" ? o.label : fallbackLabel,
    anchors: normalizeAnchors(anchors),
    locked: o.locked === true || o.locked === "true",
  };
}

function migrateLegacy(): PathDocument | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(LEGACY_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed) || parsed.length < 2) return null;
    const anchors = parsed
      .map(parsePoint)
      .filter((p): p is PathPoint => p !== null);
    if (anchors.length < 2) return null;
    return {
      version: 2,
      shot: {
        id: newId(),
        label: "Shot",
        anchors: normalizeAnchors(anchors),
        locked: true,
      },
      bounces: [],
    };
  } catch {
    return null;
  }
}

function hasPlayablePath(doc: PathDocument): boolean {
  return getFullAnimationPath(doc).length >= 2;
}

function withProductionDefaults(doc: PathDocument): PathDocument {
  if (hasPlayablePath(doc)) return doc;
  return PRODUCTION_PATH_DOCUMENT;
}

export function loadPathDocument(): PathDocument {
  if (typeof window === "undefined") return PRODUCTION_PATH_DOCUMENT;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const legacy = migrateLegacy();
      return withProductionDefaults(legacy ?? createEmptyDocument());
    }
    const parsed = JSON.parse(raw) as unknown;
    if (typeof parsed !== "object" || parsed === null) {
      return PRODUCTION_PATH_DOCUMENT;
    }
    const o = parsed as Record<string, unknown>;
    const shot = o.shot ? parseSegment(o.shot, "Shot") : null;
    const bouncesRaw = Array.isArray(o.bounces) ? o.bounces : [];
    const bounces = bouncesRaw
      .map((b, i) => parseSegment(b, `Bounce ${i + 1}`))
      .filter((s): s is PathSegment => s !== null);
    return withProductionDefaults({ version: 2, shot, bounces });
  } catch {
    const legacy = migrateLegacy();
    return withProductionDefaults(legacy ?? createEmptyDocument());
  }
}

export function savePathDocument(doc: PathDocument): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(doc));
}

export function clearPathDocument(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
  window.localStorage.removeItem(LEGACY_KEY);
}

export function anchorsFromStroke(
  points: PathPoint[],
  maxAnchors = 6,
): PathPoint[] {
  return reduceToAnchors(simplifyPath(points, 0.008), maxAnchors);
}

export function lastAnchorOf(doc: PathDocument): PathPoint | null {
  const bounce = doc.bounces[doc.bounces.length - 1];
  if (bounce?.anchors.length) return bounce.anchors[bounce.anchors.length - 1];
  if (doc.shot?.anchors.length) return doc.shot.anchors[doc.shot.anchors.length - 1];
  return null;
}

export function addBounceSegment(doc: PathDocument): PathDocument {
  const start = lastAnchorOf(doc) ?? { x: 0.45, y: 0.35 };
  const n = doc.bounces.length + 1;
  return {
    ...doc,
    bounces: [
      ...doc.bounces,
      {
        id: newId(),
        label: `Bounce ${n}`,
        anchors: [
          { ...start },
          { x: start.x, y: Math.min(0.95, start.y + 0.12) },
        ],
        locked: false,
      },
    ],
  };
}

export function getLockedBounceAnchors(doc: PathDocument): PathPoint[][] {
  return doc.bounces.filter((s) => s.locked && s.anchors.length >= 2).map((s) => s.anchors);
}

/** Bounce 1 = fall; Bounces 2+ = arc bounces (labels in path editor). */
export function splitLockedBounceSegments(doc: PathDocument): {
  fall: PathPoint[] | null;
  arcs: PathPoint[][];
} {
  const locked = getLockedBounceAnchors(doc);
  if (locked.length === 0) {
    return { fall: null, arcs: [] };
  }
  if (locked.length === 1) {
    return { fall: locked[0], arcs: [] };
  }
  return { fall: locked[0], arcs: locked.slice(1) };
}

/** Shot + locked bounces as one connected anchor list (what the ball should follow). */
export function getFullAnimationPath(doc: PathDocument): PathPoint[] {
  const segments: PathPoint[][] = [];
  if (doc.shot?.locked && doc.shot.anchors.length >= 2) {
    segments.push(doc.shot.anchors);
  }
  segments.push(...getLockedBounceAnchors(doc));
  return flattenSegmentChain(segments);
}

export function allSegmentsForPreview(doc: PathDocument): PathSegment[] {
  const out: PathSegment[] = [];
  if (doc.shot?.anchors.length) out.push(doc.shot);
  out.push(...doc.bounces.filter((b) => b.anchors.length >= 2));
  return out;
}
