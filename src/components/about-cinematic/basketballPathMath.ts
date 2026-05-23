import type { PathPoint } from "./basketballPathStorage";
import type { BallPose } from "./basketballKnockMath";

function clamp01(t: number) {
  return Math.max(0, Math.min(1, t));
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function dist(a: PathPoint, b: PathPoint) {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

/** Rolling spin (deg) per unit traveled along the path sample. */
const ARC_SPIN_DEG_PER_UNIT = 480;

function pathTangentRotationDeg(
  from: PathPoint,
  to: PathPoint,
): number {
  return (Math.atan2(to.y - from.y, to.x - from.x) * 180) / Math.PI + 90;
}

function rotationWithArcSpin(
  tangentDeg: number,
  arcDistance: number,
): number {
  return tangentDeg + arcDistance * ARC_SPIN_DEG_PER_UNIT;
}

/** Drop points closer than `minDist` (normalized space). */
export function simplifyPath(points: PathPoint[], minDist = 0.004): PathPoint[] {
  if (points.length === 0) return [];
  const out: PathPoint[] = [points[0]];
  for (let i = 1; i < points.length; i++) {
    const prev = out[out.length - 1];
    if (dist(prev, points[i]) >= minDist) {
      out.push(points[i]);
    }
  }
  return out;
}

/** Reduce a freehand stroke to smooth-curve anchor points. */
export function reduceToAnchors(
  points: PathPoint[],
  maxAnchors = 8,
): PathPoint[] {
  const simp = simplifyPath(points, 0.01);
  if (simp.length <= 2) return simp;
  if (simp.length <= maxAnchors) return simp;

  const cumulative: number[] = [0];
  for (let i = 1; i < simp.length; i++) {
    cumulative.push(cumulative[i - 1] + dist(simp[i - 1], simp[i]));
  }
  const total = cumulative[cumulative.length - 1];
  if (total < 1e-6) return [simp[0], simp[simp.length - 1]];

  const anchors: PathPoint[] = [];
  for (let k = 0; k < maxAnchors; k++) {
    const target = (k / (maxAnchors - 1)) * total;
    let i = 1;
    while (i < cumulative.length && cumulative[i] < target) i += 1;
    const i0 = Math.max(0, i - 1);
    const span = cumulative[i0 + 1] - cumulative[i0];
    const localT = span > 0 ? (target - cumulative[i0]) / span : 0;
    const a = simp[i0];
    const b = simp[Math.min(simp.length - 1, i0 + 1)];
    anchors.push({ x: lerp(a.x, b.x, localT), y: lerp(a.y, b.y, localT) });
  }
  return anchors;
}

function catmullRom1D(
  p0: number,
  p1: number,
  p2: number,
  p3: number,
  t: number,
): number {
  const t2 = t * t;
  const t3 = t2 * t;
  return (
    0.5 *
    (2 * p1 +
      (-p0 + p2) * t +
      (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 +
      (-p0 + 3 * p1 - 3 * p2 + p3) * t3)
  );
}

function catmullRomPoint(anchors: PathPoint[], segIndex: number, t: number): PathPoint {
  const i = segIndex;
  const p0 = anchors[Math.max(0, i - 1)];
  const p1 = anchors[i];
  const p2 = anchors[Math.min(anchors.length - 1, i + 1)];
  const p3 = anchors[Math.min(anchors.length - 1, i + 2)];
  return {
    x: catmullRom1D(p0.x, p1.x, p2.x, p3.x, t),
    y: catmullRom1D(p0.y, p1.y, p2.y, p3.y, t),
  };
}

type SmoothPathTable = {
  samples: PathPoint[];
  cumulative: number[];
  totalLength: number;
};

export function pathArcLength(anchors: PathPoint[]): number {
  if (anchors.length < 2) return 0;
  return buildSmoothPathTable(anchors).totalLength;
}

function buildSmoothPathTable(
  anchors: PathPoint[],
  samplesPerSegment = 28,
): SmoothPathTable {
  if (anchors.length === 0) {
    return { samples: [], cumulative: [0], totalLength: 0 };
  }
  if (anchors.length === 1) {
    return { samples: [anchors[0]], cumulative: [0], totalLength: 0 };
  }

  const samples: PathPoint[] = [];
  const cumulative: number[] = [0];

  const push = (p: PathPoint) => {
    if (samples.length > 0) {
      const len = dist(samples[samples.length - 1], p);
      if (len < 1e-8) return;
      cumulative.push(cumulative[cumulative.length - 1] + len);
    }
    samples.push(p);
  };

  push(anchors[0]);

  for (let seg = 0; seg < anchors.length - 1; seg++) {
    for (let j = 1; j <= samplesPerSegment; j++) {
      push(catmullRomPoint(anchors, seg, j / samplesPerSegment));
    }
  }

  return {
    samples,
    cumulative,
    totalLength: cumulative[cumulative.length - 1] ?? 0,
  };
}

let tableCache: { key: string; table: SmoothPathTable } | null = null;

type ChainCache = {
  key: string;
  segLengths: number[];
  totalLength: number;
  tables: SmoothPathTable[];
};

let chainCache: ChainCache | null = null;

export function clearPathMathCache(): void {
  tableCache = null;
  chainCache = null;
}

/** Merge segment chains into one anchor list (skips duplicate joints). */
export function flattenSegmentChain(segments: PathPoint[][]): PathPoint[] {
  if (segments.length === 0) return [];
  const out: PathPoint[] = [...segments[0]];
  for (let i = 1; i < segments.length; i++) {
    const seg = segments[i];
    let start = 0;
    if (seg.length > 0 && dist(out[out.length - 1], seg[0]) < 0.008) {
      start = 1;
    }
    out.push(...seg.slice(start));
  }
  return out;
}

function getSmoothTable(anchors: PathPoint[]): SmoothPathTable {
  const key = anchors.map((p) => `${p.x.toFixed(4)},${p.y.toFixed(4)}`).join("|");
  if (tableCache?.key === key) return tableCache.table;
  const table = buildSmoothPathTable(anchors);
  tableCache = { key, table };
  return table;
}

/** Smooth Catmull-Rom path — used for ball motion and display. */
export function ballPoseAlongPath(
  anchors: PathPoint[],
  progress: number,
): BallPose {
  const p = clamp01(progress);

  if (anchors.length === 0) {
    return { x: 8, y: 72, rotation: 0, scale: 1, visible: false };
  }

  if (anchors.length === 1) {
    return {
      x: anchors[0].x * 100,
      y: anchors[0].y * 100,
      rotation: 0,
      scale: 1,
      visible: true,
    };
  }

  const { samples, cumulative, totalLength } = getSmoothTable(anchors);

  if (totalLength < 1e-6 || samples.length < 2) {
    return {
      x: anchors[0].x * 100,
      y: anchors[0].y * 100,
      rotation: 0,
      scale: 1,
      visible: true,
    };
  }

  const target = p * totalLength;
  let i = 1;
  while (i < cumulative.length && cumulative[i] < target) i += 1;
  const i0 = Math.max(0, i - 1);
  const span = cumulative[i0 + 1] - cumulative[i0];
  const localT = span > 0 ? (target - cumulative[i0]) / span : 0;
  const a = samples[i0];
  const b = samples[Math.min(samples.length - 1, i0 + 1)];
  const nx = lerp(a.x, b.x, localT);
  const ny = lerp(a.y, b.y, localT);

  const lookAhead = Math.min(totalLength, target + totalLength * 0.02);
  let j = i0;
  while (j < cumulative.length - 1 && cumulative[j] < lookAhead) j += 1;
  const la = samples[j];
  const lb = samples[Math.min(samples.length - 1, j + 1)];
  const tangent = pathTangentRotationDeg(la, lb);
  const rotation = rotationWithArcSpin(tangent, target);

  return {
    x: nx * 100,
    y: ny * 100,
    rotation,
    scale: 1,
    visible: true,
  };
}

/** SVG cubic path through Catmull-Rom anchors (smooth, not jagged). */
export function pathToSvgD(anchors: PathPoint[]): string {
  if (anchors.length === 0) return "";
  if (anchors.length === 1) {
    return `M ${anchors[0].x * 100} ${anchors[0].y * 100}`;
  }
  if (anchors.length === 2) {
    return `M ${anchors[0].x * 100} ${anchors[0].y * 100} L ${anchors[1].x * 100} ${anchors[1].y * 100}`;
  }

  let d = `M ${anchors[0].x * 100} ${anchors[0].y * 100}`;
  for (let i = 0; i < anchors.length - 1; i++) {
    const p0 = anchors[Math.max(0, i - 1)];
    const p1 = anchors[i];
    const p2 = anchors[i + 1];
    const p3 = anchors[Math.min(anchors.length - 1, i + 2)];

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    d += ` C ${cp1x * 100} ${cp1y * 100}, ${cp2x * 100} ${cp2y * 100}, ${p2.x * 100} ${p2.y * 100}`;
  }
  return d;
}

/** Upgrade stored dense paths from older saves. */
export function normalizeAnchors(points: PathPoint[]): PathPoint[] {
  if (points.length <= 12) return points;
  return reduceToAnchors(points, 8);
}

function getChainCache(segments: PathPoint[][]): ChainCache {
  const key = segments
    .map((s) => s.map((p) => `${p.x.toFixed(3)},${p.y.toFixed(3)}`).join(";"))
    .join("|");
  if (chainCache?.key === key) return chainCache;

  const tables = segments.map((s) => buildSmoothPathTable(s));
  const segLengths = tables.map((t) => t.totalLength);
  chainCache = {
    key,
    segLengths,
    totalLength: segLengths.reduce((a, b) => a + b, 0),
    tables,
  };
  return chainCache;
}

function poseFromTableSample(
  table: SmoothPathTable,
  localT: number,
  globalArcDistance = -1,
): BallPose {
  const { samples, cumulative, totalLength } = table;
  if (totalLength < 1e-6 || samples.length < 2) {
    const p = samples[0] ?? { x: 0.5, y: 0.5 };
    return { x: p.x * 100, y: p.y * 100, rotation: 0, scale: 1, visible: true };
  }

  const target = clamp01(localT) * totalLength;
  let i = 1;
  while (i < cumulative.length && cumulative[i] < target) i += 1;
  const i0 = Math.max(0, i - 1);
  const span = cumulative[i0 + 1] - cumulative[i0];
  const t = span > 0 ? (target - cumulative[i0]) / span : 0;
  const a = samples[i0];
  const b = samples[Math.min(samples.length - 1, i0 + 1)];
  const nx = lerp(a.x, b.x, t);
  const ny = lerp(a.y, b.y, t);

  const lookAhead = Math.min(totalLength, target + totalLength * 0.025);
  let j = i0;
  while (j < cumulative.length - 1 && cumulative[j] < lookAhead) j += 1;
  const la = samples[j];
  const lb = samples[Math.min(samples.length - 1, j + 1)];
  const tangent = pathTangentRotationDeg(la, lb);
  const arcDist = globalArcDistance >= 0 ? globalArcDistance : target;
  const rotation = rotationWithArcSpin(tangent, arcDist);

  return { x: nx * 100, y: ny * 100, rotation, scale: 1, visible: true };
}

/** Ball along chained bounce segments (0–1 across total arc length). */
export function ballPoseAlongSegmentChain(
  segments: PathPoint[][],
  progress: number,
): BallPose {
  if (segments.length === 0) {
    return { x: 50, y: 50, rotation: 0, scale: 1, visible: false };
  }

  const { segLengths, totalLength, tables } = getChainCache(segments);
  if (totalLength < 1e-6) {
    return poseFromTableSample(tables[0], 0);
  }

  const target = clamp01(progress) * totalLength;
  let acc = 0;
  for (let s = 0; s < segments.length; s++) {
    const len = segLengths[s];
    if (acc + len >= target || s === segments.length - 1) {
      const localT = len > 0 ? (target - acc) / len : 0;
      return poseFromTableSample(tables[s], localT, target);
    }
    acc += len;
  }

  return poseFromTableSample(tables[tables.length - 1], 1);
}
