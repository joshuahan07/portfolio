import { useEffect, useRef, type RefObject } from "react";

/**
 * Beam-strike intro ported from electric-name-intro.html, with the letter
 * outline engine replaced by the "traveling kinks" technique from
 * name-fluid (3).html: the letter's own crookedness is baked in once and
 * never moves, and a few small packets of extra jaggedness travel around
 * the perimeter — anywhere a packet isn't, the outline sits exactly on the
 * baked glyph. Unlike either reference, the whole name spawns at once right
 * after the beam impact/explosion instead of being typed out letter by
 * letter.
 */

type Point = { x: number; y: number };

type OutlineNode = {
  x: number;
  y: number;
  nx: number;
  ny: number;
  /** Normalized arc-length position along the loop, 0-1. */
  u: number;
  d1: number;
  d2: number;
};

/** A short, traveling packet of extra jaggedness that owns a stretch of the
 *  contour and carries its own fixed profile of kinks. */
type KinkPacket = {
  u: number;
  dir: number;
  speed: number;
  width: number;
  amp: number;
  prof: Float32Array;
  rand: () => number;
};

type Geo = { nodes: OutlineNode[]; per: number; packs: KinkPacket[] };

type Crawl = { loop: number; u: number; speed: number; span: number };

type Letter = {
  ch: string;
  loops: Point[][];
  geo: Geo[];
  disp: Point[][] | null;
  dispF: Point[][] | null;
  dispS: Point[][] | null;
  crawl: Crawl[];
  cx: number;
  cy: number;
  h: number;
  phase: number;
  revealAt: number;
  shown: boolean;
};

type Ring = { born: number; life: number; maxR: number; w: number; a: number; seed: number };
type Arc = { pts: Point[]; born: number; life: number; w: number };
type AmbientBolt = { pts: Point[]; born: number; life: number; w: number; a: number };

const COL = { core: "#fdfcfc", rim: "#b4effe", hot: "#07c6fc", mid: "#008bcc", deep: "#03557c" };

const CFG = {
  fontStack: '900 {SIZE}px "Arial Black", "Helvetica Neue", Impact, sans-serif',
  fontVw: 0.105,
  fontMax: 128,
  fontMin: 40,
  tracking: 0.06,

  traceStep: 3,
  // finer than a plain outline needs — the traveling kink packets want
  // enough nodes to carry the moving detail.
  nodeSpacing: 0.055,

  // the letter's own crookedness: applied once, at build time, and then
  // never touched. this is what makes each glyph look hand-cut, and it
  // never moves.
  bake: 0.017,

  // on top of that, a few packets of extra jaggedness that travel around
  // the outline. outside a packet the displacement is exactly zero, so the
  // letter is perfectly still everywhere the packets are not.
  kinks: 3,
  kinkWidth: 0.14,
  kinkAmp: 0.03,
  kinkSpeed: 0.075,
  kinkDetail: 9,
  fringeAmp: 1.8,
  fringeLag: 0.05,
  smooth: 0.5,

  crawlSpeed: 0.00028,
  crawlSpan: 0.26,
  sheen: 0.3,
  ringFlat: 0.2,

  stepMs: 66,
  chargeMs: 320,
  descendMs: 175,
  holdMs: 360,
  collapseMs: 700,
  flashMs: 290,
  ringMs: 820,
  shakeMs: 420,
  shakeAmp: 12,
  typeDelay: 140,
  glowScale: 0.26,
  ambient: true,
};

type ElectricNameIntroProps = {
  text?: string;
  /** Element the name should be centered on (falls back to viewport center). */
  anchorRef?: RefObject<HTMLElement | null>;
  /** Fired once, right after the beam impact + explosion, when the name spawns. */
  onRevealed?: () => void;
};

export default function ElectricNameIntro({
  text = "JOSHUA HAN",
  anchorRef,
  onRevealed,
}: ElectricNameIntroProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const flashRef = useRef<HTMLDivElement>(null);
  const onRevealedRef = useRef(onRevealed);
  onRevealedRef.current = onRevealed;

  useEffect(() => {
    const host = hostRef.current;
    const cv = canvasRef.current;
    const flash = flashRef.current;
    if (!host || !cv || !flash) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;

    const gA = document.createElement("canvas");
    const ga = gA.getContext("2d") as CanvasRenderingContext2D;
    const gB = document.createElement("canvas");
    const gb = gB.getContext("2d") as CanvasRenderingContext2D;
    const trace = document.createElement("canvas");
    const tc = trace.getContext("2d", { willReadFrequently: true }) as CanvasRenderingContext2D;
    if (!ga || !gb || !tc) return;
    const canFilter = typeof ga.filter === "string";

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let W = 0, H = 0, dpr = 1, gw = 0, gh = 0, fs = 90, lw = 3;
    const impact = { x: 0, y: 0 };
    let beamW = 130;
    let letters: Letter[] = [];
    let quality = 1, slowFrames = 0;
    const shake = { x: 0, y: 0 };

    function marchingSquares(sample: (x: number, y: number) => number, cols: number, rows: number): Point[][] {
      const segs: [Point, Point][] = [];
      const P = (x: number, y: number): Point => ({ x, y });
      for (let y = 0; y < rows - 1; y++) {
        for (let x = 0; x < cols - 1; x++) {
          const tl = sample(x, y), tr = sample(x + 1, y), br = sample(x + 1, y + 1), bl = sample(x, y + 1);
          const code = (tl ? 8 : 0) | (tr ? 4 : 0) | (br ? 2 : 0) | (bl ? 1 : 0);
          if (code === 0 || code === 15) continue;
          const T = P(x + 0.5, y), R = P(x + 1, y + 0.5), B = P(x + 0.5, y + 1), L = P(x, y + 0.5);
          switch (code) {
            case 1: segs.push([L, B]); break;
            case 2: segs.push([B, R]); break;
            case 3: segs.push([L, R]); break;
            case 4: segs.push([T, R]); break;
            case 5: segs.push([T, R]); segs.push([L, B]); break;
            case 6: segs.push([T, B]); break;
            case 7: segs.push([T, L]); break;
            case 8: segs.push([T, L]); break;
            case 9: segs.push([T, B]); break;
            case 10: segs.push([T, L]); segs.push([B, R]); break;
            case 11: segs.push([T, R]); break;
            case 12: segs.push([L, R]); break;
            case 13: segs.push([B, R]); break;
            case 14: segs.push([L, B]); break;
          }
        }
      }

      const key = (p: Point) => (p.x * 2 | 0) + "," + (p.y * 2 | 0);
      const map = new Map<string, number[]>();
      segs.forEach((s, i) => {
        for (const p of s) {
          const k = key(p);
          if (!map.has(k)) map.set(k, []);
          map.get(k)!.push(i);
        }
      });

      const used = new Array(segs.length).fill(false);
      const loops: Point[][] = [];
      for (let i = 0; i < segs.length; i++) {
        if (used[i]) continue;
        used[i] = true;
        const pts = [segs[i][0], segs[i][1]];
        let cur = segs[i][1];
        for (let guard = 0; guard < 20000; guard++) {
          const list = map.get(key(cur));
          if (!list) break;
          let next = -1;
          for (const j of list) if (!used[j]) { next = j; break; }
          if (next < 0) break;
          used[next] = true;
          const s = segs[next];
          const p = key(s[0]) === key(cur) ? s[1] : s[0];
          pts.push(p);
          cur = p;
          if (key(cur) === key(pts[0])) break;
        }
        if (pts.length > 6) loops.push(pts);
      }
      return loops;
    }

    function resample(pts: Point[], spacing: number): Point[] | null {
      const out = [pts[0]];
      let acc = 0;
      for (let i = 1; i < pts.length; i++) {
        const a = out[out.length - 1], b = pts[i];
        const d = Math.hypot(b.x - a.x, b.y - a.y);
        acc += d;
        if (acc >= spacing) { out.push(b); acc = 0; }
      }
      if (out.length > 3) return out;
      return null;
    }

    function traceGlyph(ch: string, originX: number, baselineY: number, font: string): { loops: Point[][]; width: number } {
      tc!.font = font;
      const m = tc!.measureText(ch);
      const wpx = Math.ceil(m.width);
      if (!wpx) return { loops: [], width: m.width };

      const pad = Math.ceil(fs * 0.3);
      trace.width = wpx + pad * 2;
      trace.height = Math.ceil(fs * 1.7);
      const base = Math.round(fs * 1.25);

      tc!.clearRect(0, 0, trace.width, trace.height);
      tc!.font = font;
      tc!.textBaseline = "alphabetic";
      tc!.fillStyle = "#fff";
      tc!.fillText(ch, pad, base);

      const img = tc!.getImageData(0, 0, trace.width, trace.height).data;
      const st = CFG.traceStep;
      const cols = Math.floor(trace.width / st), rows = Math.floor(trace.height / st);
      const sample = (x: number, y: number) => {
        const px = x * st, py = y * st;
        if (px < 0 || py < 0 || px >= trace.width || py >= trace.height) return 0;
        return img[(py * trace.width + px) * 4 + 3] > 128 ? 1 : 0;
      };

      const raw = marchingSquares(sample, cols, rows);
      const spacing = Math.max(5, fs * CFG.nodeSpacing);
      const loops: Point[][] = [];
      for (const loop of raw) {
        const scaled = loop.map((p) => ({
          x: originX - pad + p.x * st,
          y: baselineY - base + p.y * st,
        }));
        const r = resample(scaled, spacing);
        if (r) loops.push(r);
      }
      return { loops, width: m.width };
    }

    function rng(seed: number) {
      let s = seed | 0;
      return () => {
        s = (s + 0x6d2b79f5) | 0;
        let t = Math.imul(s ^ (s >>> 15), 1 | s);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    }

    /** Linear interpolation inside a table, clamped at the ends — linear
     *  rather than smooth on purpose: the corners between control points are
     *  exactly what read as kinks in the outline. */
    function sampleClamp(arr: Float32Array, x: number): number {
      const n = arr.length;
      if (x <= 0) return arr[0];
      if (x >= n - 1) return arr[n - 1];
      const i = Math.floor(x), f = x - i;
      return arr[i] + (arr[i + 1] - arr[i]) * f;
    }

    function prepLetter(L: Letter, seed: number) {
      const r = rng(seed);

      L.geo = L.loops.map((loop) => {
        const n = loop.length;
        const cum: number[] = new Array(n);
        let per = 0;
        for (let i = 0; i < n; i++) {
          cum[i] = per;
          const a = loop[i], b = loop[(i + 1) % n];
          per += Math.hypot(b.x - a.x, b.y - a.y);
        }
        per = per || 1;

        const nodes: OutlineNode[] = new Array(n);
        for (let i = 0; i < n; i++) {
          const p = loop[i], a = loop[(i - 1 + n) % n], b = loop[(i + 1) % n];
          const dx = b.x - a.x, dy = b.y - a.y;
          const len = Math.hypot(dx, dy) || 1;
          const nx = -dy / len, ny = dx / len;
          // permanent crookedness, baked into the node's resting position
          const bake = ((r() - 0.5) * 2 + Math.sin(i * 1.7 + seed * 0.11) * 0.5) * fs * CFG.bake;
          nodes[i] = { x: p.x + nx * bake, y: p.y + ny * bake, nx, ny, u: cum[i] / per, d1: 0, d2: 0 };
        }

        // traveling packets of extra jaggedness. each owns a short stretch
        // of the contour and carries its own fixed profile of kinks.
        const packs: KinkPacket[] = Array.from({ length: CFG.kinks }, (_, k) => {
          const prof = new Float32Array(CFG.kinkDetail);
          for (let i = 0; i < CFG.kinkDetail; i++) prof[i] = r() * 2 - 1;
          prof[0] = prof[CFG.kinkDetail - 1] = 0; // fade to nothing at both ends
          return {
            u: (k / CFG.kinks + r() * 0.2) % 1,
            dir: r() < 0.7 ? 1 : -1,
            speed: CFG.kinkSpeed * (0.7 + r() * 0.6),
            width: CFG.kinkWidth * (0.7 + r() * 0.6),
            amp: fs * CFG.kinkAmp * (0.7 + r() * 0.6),
            prof, rand: r,
          };
        });

        return { nodes, per, packs };
      });

      L.disp = L.geo.map((g) => g.nodes.map((nd) => ({ x: nd.x, y: nd.y })));
      L.dispF = L.geo.map((g) => g.nodes.map((nd) => ({ x: nd.x, y: nd.y })));
      L.dispS = L.geo.map((g) => g.nodes.map((nd) => ({ x: nd.x, y: nd.y })));

      L.crawl = L.loops.map((_, k) => ({
        loop: k, u: 0,
        speed: CFG.crawlSpeed * (k === 0 ? 1 : 1.4),
        span: CFG.crawlSpan * (k === 0 ? 1 : 0.75),
      }));
    }

    function buildName() {
      fs = Math.max(CFG.fontMin, Math.min(W * CFG.fontVw, CFG.fontMax));
      lw = Math.max(2, fs * 0.032);
      const font = CFG.fontStack.replace("{SIZE}", String(fs));
      const track = fs * CFG.tracking;

      tc!.font = font;
      const chars = [...text];
      const widths = chars.map((ch) => tc!.measureText(ch).width);
      const total = widths.reduce((a, b) => a + b, 0) + track * (chars.length - 1);

      let baselineY = H * 0.5 + fs * 0.36;
      const anchor = anchorRef?.current;
      if (anchor) {
        const hostRect = host!.getBoundingClientRect();
        const aRect = anchor.getBoundingClientRect();
        baselineY = aRect.top - hostRect.top + aRect.height * 0.5 + fs * 0.36;
      }
      let x = (W - total) / 2;

      letters = [];
      chars.forEach((ch, i) => {
        const w = widths[i];
        if (ch.trim()) {
          const { loops } = traceGlyph(ch, x, baselineY, font);
          let minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9;
          for (const Lp of loops) for (const p of Lp) {
            if (p.x < minX) minX = p.x; if (p.x > maxX) maxX = p.x;
            if (p.y < minY) minY = p.y; if (p.y > maxY) maxY = p.y;
          }
          letters.push({
            ch, loops, geo: [], disp: null, dispF: null, dispS: null, crawl: [],
            cx: (minX + maxX) / 2, cy: (minY + maxY) / 2,
            h: maxY - minY, phase: Math.random() * 6.283, revealAt: Infinity, shown: false,
          });
        } else {
          letters.push({
            ch, loops: [], geo: [], disp: null, dispF: null, dispS: null, crawl: [],
            cx: x + w / 2, cy: baselineY - fs * 0.35, h: fs * 0.7,
            phase: 0, revealAt: Infinity, shown: false,
          });
        }
        x += w + track;
      });

      letters.forEach((L, i) => {
        if (!L.loops.length) return;
        prepLetter(L, i * 7919 + 11);
        L.crawl.forEach((c, k) => { c.u = ((1 - i / letters.length) + k * 0.31) % 1; });
      });

      impact.x = W / 2;
      impact.y = baselineY - fs * 0.36;
    }

    /** The letter's shape is fixed. Packets of jaggedness travel around it,
     *  and anywhere a packet is not, the outline sits exactly on the baked
     *  glyph. */
    function updateOutline(L: Letter, dt: number) {
      const off = lw * CFG.sheen;
      const sm = 1 - Math.pow(1 - CFG.smooth, dt / 16.67);
      const D = CFG.kinkDetail;

      for (let li = 0; li < L.geo.length; li++) {
        const g = L.geo[li];
        const a = L.disp![li], bf = L.dispF![li], sh = L.dispS![li];

        // advance the packets. laps per ms = px per ms / perimeter
        for (const pk of g.packs) {
          const prev = pk.u;
          pk.u = (pk.u + (pk.dir * pk.speed * dt) / g.per + 1) % 1;
          // when one completes a lap, it picks up a new set of kinks
          if ((pk.dir > 0 && pk.u < prev) || (pk.dir < 0 && pk.u > prev)) {
            for (let i = 1; i < D - 1; i++) pk.prof[i] = pk.rand() * 2 - 1;
          }
        }

        for (let i = 0; i < g.nodes.length; i++) {
          const nd = g.nodes[i];
          let t1 = 0, t2 = 0;

          for (const pk of g.packs) {
            // signed distance from the packet centre, wrapped to the short way round
            let d = nd.u - pk.u;
            if (d > 0.5) d -= 1;
            if (d < -0.5) d += 1;

            const q = d / pk.width; // -1..1 inside the packet
            if (q > -1 && q < 1) {
              const env = Math.cos((q * Math.PI) / 2); // zero at both edges
              const v = sampleClamp(pk.prof, ((q + 1) / 2) * (D - 1)) * env * env;
              t1 += v * pk.amp;
            }

            // the halo runs the same packet a little behind and deeper
            let df = nd.u - (pk.u - pk.dir * CFG.fringeLag);
            if (df > 0.5) df -= 1;
            if (df < -0.5) df += 1;
            const qf = df / pk.width;
            if (qf > -1 && qf < 1) {
              const envF = Math.cos((qf * Math.PI) / 2);
              t2 += sampleClamp(pk.prof, ((qf + 1) / 2) * (D - 1)) * envF * envF * pk.amp * CFG.fringeAmp;
            }
          }

          nd.d1 += (t1 - nd.d1) * sm;
          nd.d2 += (t2 - nd.d2) * sm;

          a[i].x = nd.x + nd.nx * nd.d1; a[i].y = nd.y + nd.ny * nd.d1;
          bf[i].x = nd.x + nd.nx * nd.d2; bf[i].y = nd.y + nd.ny * nd.d2;
          sh[i].x = nd.x + nd.nx * (nd.d1 - off); sh[i].y = nd.y + nd.ny * (nd.d1 - off);
        }
      }
      for (const c of L.crawl) c.u = (c.u + c.speed * dt + 1) % 1;
    }

    function pulse(c: CanvasRenderingContext2D, loop: Point[], u: number, span: number, width: number, color: string, alpha: number) {
      const n = loop.length;
      const count = Math.max(5, Math.round(span * n));
      const start = Math.floor(u * n);
      const pts: Point[] = new Array(count);
      for (let i = 0; i < count; i++) pts[i] = loop[(start + i) % n];
      c.globalAlpha = alpha;
      taper(c, pts, width);
      c.fillStyle = color;
      c.fill();
      c.globalAlpha = 1;
    }

    function strokeLoops(c: CanvasRenderingContext2D, loops: Point[][] | null, width: number, color: string, alpha: number) {
      if (!loops) return;
      c.globalAlpha = alpha;
      c.strokeStyle = color;
      c.lineWidth = width;
      c.beginPath();
      for (const L of loops) {
        c.moveTo(L[0].x, L[0].y);
        for (let i = 1; i < L.length; i++) c.lineTo(L[i].x, L[i].y);
        c.closePath();
      }
      c.stroke();
      c.globalAlpha = 1;
    }

    /** Solid fill for a letter's traced interior (evenodd so holes in
     *  letters like "o"/"a" stay open), drawn under the glowing outline. */
    function fillLoops(c: CanvasRenderingContext2D, loops: Point[][] | null, color: string) {
      if (!loops || !loops.length) return;
      c.beginPath();
      for (const L of loops) {
        c.moveTo(L[0].x, L[0].y);
        for (let i = 1; i < L.length; i++) c.lineTo(L[i].x, L[i].y);
        c.closePath();
      }
      c.fillStyle = color;
      c.fill("evenodd");
    }

    function jagged(x1: number, y1: number, x2: number, y2: number, disp: number, floorPx: number, rand: () => number): Point[] {
      const pts: Point[] = [{ x: x1, y: y1 }];
      (function rec(ax: number, ay: number, bx: number, by: number, d: number) {
        if (d < floorPx) { pts.push({ x: bx, y: by }); return; }
        const mx = (ax + bx) / 2 + (rand() - 0.5) * d;
        const my = (ay + by) / 2 + (rand() - 0.5) * d * 0.55;
        rec(ax, ay, mx, my, d / 2); rec(mx, my, bx, by, d / 2);
      })(x1, y1, x2, y2, disp);
      return pts;
    }

    function taper(c: CanvasRenderingContext2D, pts: Point[], maxW: number, upTo?: number) {
      const n = upTo || pts.length; if (n < 2) return;
      const L: Point[] = [], R: Point[] = [];
      for (let i = 0; i < n; i++) {
        const p = pts[i], a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
        let dx = b.x - a.x, dy = b.y - a.y;
        const len = Math.hypot(dx, dy) || 1; dx /= len; dy /= len;
        const u = i / (n - 1);
        const w = (maxW * (0.2 + 0.8 * Math.sin(Math.PI * Math.pow(u, 0.7)))) / 2;
        L.push({ x: p.x - dy * w, y: p.y + dx * w });
        R.push({ x: p.x + dy * w, y: p.y - dx * w });
      }
      c.beginPath();
      c.moveTo(L[0].x, L[0].y);
      for (let i = 1; i < L.length; i++) c.lineTo(L[i].x, L[i].y);
      for (let i = R.length - 1; i >= 0; i--) c.lineTo(R[i].x, R[i].y);
      c.closePath();
    }

    const rings: Ring[] = [], arcs: Arc[] = [], ambient: AmbientBolt[] = [];
    const letterArcs: Arc[] = [], inner: Arc[] = [];
    let nextAmb = 0, nextLetterArc = 0, nextInner = 0;

    const settled = () => letters.filter((L) => L.loops.length && L.shown);

    function addRing(now: number, delay: number, maxR: number, w: number, a: number) {
      rings.push({ born: now + delay, life: CFG.ringMs, maxR, w, a, seed: (Math.random() * 1e6) | 0 });
    }

    function ringPath(c: CanvasRenderingContext2D, r: number, step: number, seed: number) {
      const N = 56, rand = rng(step * 131 + seed);
      c.beginPath();
      for (let i = 0; i <= N; i++) {
        const ang = (i / N) * Math.PI * 2;
        const spike = i % 7 === 0 ? 0.1 + rand() * 0.18 : 0;
        const jag = 1 + (rand() - 0.5) * 0.12 + Math.sin(ang * 6 + seed) * 0.05 + spike;
        const x = impact.x + Math.cos(ang) * r * jag;
        const y = impact.y + Math.sin(ang) * r * CFG.ringFlat * jag;
        i ? c.lineTo(x, y) : c.moveTo(x, y);
      }
      c.closePath();
    }

    function addAmbient(now: number, big: boolean) {
      const r = rng((now | 0) * 31 + ambient.length * 7);
      const side = r() < 0.5 ? -1 : 1;
      const x1 = impact.x + side * (W * (0.22 + r() * 0.36));
      ambient.push({
        pts: jagged(x1, -30, x1 + (r() - 0.5) * 260, impact.y - r() * H * 0.3, big ? 140 : 95, 7, r),
        born: now, life: big ? 300 : 210, w: big ? 9 : 5, a: big ? 0.4 : 0.22,
      });
    }

    function addLetterArc(now: number) {
      const live = settled();
      if (live.length < 2) return;
      const i = Math.floor(Math.random() * (live.length - 1));
      const a = live[i], b = live[Math.min(live.length - 1, i + 1 + Math.floor(Math.random() * 2))];
      const top = Math.random() < 0.5;
      letterArcs.push({
        pts: jagged(
          a.cx, a.cy + (top ? -a.h * 0.4 : a.h * 0.4),
          b.cx, b.cy + (top ? -b.h * 0.35 : b.h * 0.35),
          a.h * 0.3, 4, rng((Math.random() * 1e6) | 0),
        ),
        born: now, life: 120 + Math.random() * 160,
        w: 2.2 + Math.random() * 3,
      });
    }

    function addInner(now: number) {
      const live = settled();
      if (!live.length) return;
      const L = live[Math.floor(Math.random() * live.length)];
      const loop = L.disp![Math.floor(Math.random() * L.disp!.length)];
      const a = loop[Math.floor(Math.random() * loop.length)];
      const b = loop[Math.floor(Math.random() * loop.length)];
      if (Math.hypot(b.x - a.x, b.y - a.y) < L.h * 0.25) return;
      inner.push({
        pts: jagged(a.x, a.y, b.x, b.y, L.h * 0.14, 3, rng((Math.random() * 1e6) | 0)),
        born: now, life: 90 + Math.random() * 140, w: 1.6 + Math.random() * 2,
      });
    }

    function beamEdges(headY: number, width: number, step: number) {
      const r = rng(step * 977 + 13), top = -40;
      const segs = Math.max(5, Math.floor((headY - top) / 44));
      const L: Point[] = [], R: Point[] = [];
      for (let i = 0; i <= segs; i++) {
        const u = i / segs, y = top + (headY - top) * u;
        const swell = width * (0.84 + 0.3 * Math.sin(u * 2.4) - u * 0.1);
        L.push({ x: impact.x - swell / 2 + (r() - 0.5) * width * 0.3, y });
        R.push({ x: impact.x + swell / 2 + (r() - 0.5) * width * 0.3, y });
      }
      return { L, R, r, top };
    }

    function columnPath(c: CanvasRenderingContext2D, L: Point[], R: Point[]) {
      c.beginPath();
      c.moveTo(L[0].x, L[0].y);
      for (let i = 1; i < L.length; i++) c.lineTo(L[i].x, L[i].y);
      for (let i = R.length - 1; i >= 0; i--) c.lineTo(R[i].x, R[i].y);
      c.closePath();
    }

    function size() {
      const rect = host!.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      W = rect.width; H = rect.height;
      cv!.width = Math.floor(W * dpr); cv!.height = Math.floor(H * dpr);
      cv!.style.width = W + "px"; cv!.style.height = H + "px";
      gw = Math.max(1, Math.floor(W * CFG.glowScale));
      gh = Math.max(1, Math.floor(H * CFG.glowScale));
      gA.width = gB.width = gw; gA.height = gB.height = gh;
      beamW = Math.max(80, Math.min(W * 0.14, 200));
      buildName();
    }

    let t0 = 0, last = 0, raf = 0, struck = false, typed = false;
    const T = {
      impact: CFG.chargeMs + CFG.descendMs,
      beamEnd: CFG.chargeMs + CFG.descendMs + CFG.holdMs + CFG.collapseMs,
    };

    type Beam = ReturnType<typeof beamEdges> & { alpha: number; width: number };

    function frame(now: number) {
      const t = now - t0;
      const dt = Math.min(48, now - last);
      last = now;
      if (dt > 26) { if (++slowFrames > 12) quality = 0; } else if (slowFrames > 0) slowFrames--;

      const step = Math.floor(now / CFG.stepMs);

      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx!.clearRect(0, 0, W, H);
      ctx!.translate(shake.x, shake.y);

      ga.setTransform(CFG.glowScale, 0, 0, CFG.glowScale, 0, 0);
      ga.clearRect(0, 0, W, H);
      ga.translate(shake.x, shake.y);
      ga.globalCompositeOperation = "source-over";
      ga.lineCap = ga.lineJoin = "round";

      const sweepX = ((now * 0.00016) % 1) * (W * 1.5) - W * 0.25;

      for (let i = 0; i < letters.length; i++) {
        const L = letters[i];
        if (!L.loops.length || now < L.revealAt) continue;
        L.shown = true;
        updateOutline(L, dt);
        const flare = Math.max(0, 1 - (now - L.revealAt) / 300);
        const flick = 0.85 + 0.15 * Math.sin(now * 0.0022 + L.phase);
        const sweep = 1 + 0.5 * Math.exp(-Math.pow((L.cx - sweepX) / (W * 0.16), 2));
        const a = Math.min(1.8, flick * sweep * (1 + flare * 1.5)) * 0.85;

        strokeLoops(ga, L.disp, lw * 3.4, COL.mid, 0.3 * a);
        strokeLoops(ga, L.dispF, lw * 0.9, COL.hot, 0.24 * a);
        strokeLoops(ga, L.disp, lw * 1.4, COL.rim, 0.46 * a);

        ga.globalCompositeOperation = "lighter";
        for (const c of L.crawl) {
          const loop = L.disp![c.loop];
          pulse(ga, loop, c.u, c.span, lw * 3.2, COL.mid, 0.5 * a);
          pulse(ga, loop, c.u, c.span * 0.8, lw * 1.8, COL.rim, 0.7 * a);
          pulse(ga, loop, c.u + c.span * 0.18, c.span * 0.4, lw * 1.1, COL.core, 0.85 * a);
        }
        ga.globalCompositeOperation = "source-over";
      }

      for (const set of [letterArcs, inner]) {
        for (let i = set.length - 1; i >= 0; i--) {
          const a = set[i];
          const k = (now - a.born) / a.life;
          if (k >= 1) { set.splice(i, 1); continue; }
          ga.globalAlpha = Math.pow(1 - k, 0.8) * (step % 2 === 0 ? 1 : 0.5);
          taper(ga, a.pts, a.w * 3.2); ga.fillStyle = COL.hot; ga.fill();
          taper(ga, a.pts, a.w * 1.2); ga.fillStyle = COL.rim; ga.fill();
          ga.globalAlpha = 1;
        }
      }

      for (let i = arcs.length - 1; i >= 0; i--) {
        const a = arcs[i];
        const k = (now - a.born) / a.life;
        if (k >= 1) { arcs.splice(i, 1); continue; }
        const reveal = Math.max(2, Math.floor(Math.min(1, k * 2.6) * a.pts.length));
        ga.globalAlpha = Math.pow(1 - k, 1.3) * (step % 2 === 0 ? 1 : 0.55);
        taper(ga, a.pts, a.w * 3.2, reveal); ga.fillStyle = COL.mid; ga.fill();
        taper(ga, a.pts, a.w * 1.2, reveal); ga.fillStyle = COL.rim; ga.fill();
        ga.globalAlpha = 1;
      }

      for (let i = rings.length - 1; i >= 0; i--) {
        const R = rings[i];
        if (now < R.born) continue;
        const k = (now - R.born) / R.life;
        if (k >= 1) { rings.splice(i, 1); continue; }
        const r = (1 - Math.pow(1 - k, 2.6)) * R.maxR;
        const on = step % 2 === 0 ? 1 : 0.62;
        const a = R.a * Math.pow(1 - k, 1.15) * on;
        ga.globalAlpha = a * 0.85; ga.strokeStyle = COL.mid;
        ga.lineWidth = Math.max(3, R.w * 2.6 * (1 - k));
        ringPath(ga, r, step, R.seed); ga.stroke();
        ga.globalAlpha = a; ga.strokeStyle = COL.rim;
        ga.lineWidth = Math.max(2, R.w * (1 - k * 0.7));
        ringPath(ga, r * 0.995, step, R.seed); ga.stroke();
        ga.globalAlpha = 1;
      }

      for (let i = ambient.length - 1; i >= 0; i--) {
        const b = ambient[i];
        const k = (now - b.born) / b.life;
        if (k >= 1) { ambient.splice(i, 1); continue; }
        ga.globalAlpha = b.a * (1 - k) * (step % 2 === 0 ? 1 : 0.4);
        taper(ga, b.pts, b.w * 3.2); ga.fillStyle = COL.mid; ga.fill();
        taper(ga, b.pts, b.w * 1.2); ga.fillStyle = COL.hot; ga.fill();
        ga.globalAlpha = 1;
      }

      let beam: Beam | null = null;
      if (t >= CFG.chargeMs && t < T.beamEnd) {
        const since = t - CFG.chargeMs;
        let headY: number, alpha: number, width: number;
        if (since < CFG.descendMs) {
          const p = Math.pow(since / CFG.descendMs, 0.78);
          headY = -40 + (impact.y + 40) * p;
          alpha = 1; width = beamW * (0.7 + 0.3 * p);
        } else {
          const after = since - CFG.descendMs;
          headY = impact.y;
          if (after < CFG.holdMs) {
            alpha = step % 3 === 0 ? 0.74 : 1;
            width = beamW * (0.92 + Math.sin(after * 0.05) * 0.12);
          } else {
            const k = (after - CFG.holdMs) / CFG.collapseMs;
            alpha = Math.pow(1 - k, 1.7) * (step % 2 === 0 ? 0.82 : 1);
            width = beamW * (1 - k * 0.72);
          }
        }
        const edges = beamEdges(headY, width, step);
        beam = { ...edges, alpha, width };

        ga.globalAlpha = alpha * 0.85;
        columnPath(ga, beam.L, beam.R); ga.fillStyle = COL.mid; ga.fill();
        ga.globalAlpha = alpha;
        for (let i = 0; i < 3; i++) {
          const sx = impact.x + (beam.r() - 0.5) * width * 0.7;
          const pts = jagged(sx, beam.top, impact.x + (beam.r() - 0.5) * width * 0.35, headY, width * 0.55, 7, beam.r);
          taper(ga, pts, 7 + beam.r() * 7); ga.fillStyle = COL.rim; ga.fill();
        }
        if (headY < impact.y - 4) {
          const hr = width * 1.3;
          const hg = ga.createRadialGradient(impact.x, headY, 0, impact.x, headY, hr);
          hg.addColorStop(0, "rgba(253,252,252,.95)");
          hg.addColorStop(1, "rgba(7,198,252,0)");
          ga.fillStyle = hg;
          ga.beginPath(); ga.arc(impact.x, headY, hr, 0, 6.2832); ga.fill();
        }
        ga.globalAlpha = 1;
      }

      if (struck) {
        const lvl = Math.max(0, 1 - (t - T.impact) / 1800) * 0.85;
        if (lvl > 0.01) {
          const r = beamW * 1.6;
          const g = ga.createRadialGradient(impact.x, impact.y, 0, impact.x, impact.y, r);
          g.addColorStop(0, `rgba(253,252,252,${0.7 * lvl})`);
          g.addColorStop(0.35, `rgba(7,198,252,${0.35 * lvl})`);
          g.addColorStop(1, "rgba(3,85,124,0)");
          ga.fillStyle = g;
          ga.beginPath(); ga.arc(impact.x, impact.y, r, 0, 6.2832); ga.fill();
        }
      }

      gb.setTransform(1, 0, 0, 1, 0, 0);
      gb.clearRect(0, 0, gw, gh);
      gb.filter = canFilter ? "blur(4px)" : "none";
      gb.drawImage(gA, 0, 0);
      gb.filter = "none";

      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx!.globalCompositeOperation = "lighter";
      ctx!.globalAlpha = 0.95;
      ctx!.drawImage(gB, 0, 0, W, H);
      if (quality) {
        ctx!.globalAlpha = 0.42;
        ctx!.drawImage(gB, -W * 0.035, -H * 0.035, W * 1.07, H * 1.07);
      }
      ctx!.globalAlpha = 1;
      ctx!.translate(shake.x, shake.y);

      ctx!.lineCap = ctx!.lineJoin = "round";

      const LETTER_DIM = 0.82;

      for (let i = 0; i < letters.length; i++) {
        const L = letters[i];
        if (!L.loops.length || !L.shown) continue;
        const flare = Math.max(0, 1 - (now - L.revealAt) / 300);
        const flick = 0.85 + 0.15 * Math.sin(now * 0.0022 + L.phase);
        const sweep = 1 + 0.4 * Math.exp(-Math.pow((L.cx - sweepX) / (W * 0.16), 2));

        // Solid dark fill for the letter's traced interior — drawn with
        // normal (non-additive) blending so it actually darkens the bloom
        // underneath, then hand back to additive for the glowing edge.
        ctx!.globalCompositeOperation = "source-over";
        fillLoops(ctx!, L.disp, "#161d24");
        ctx!.globalCompositeOperation = "lighter";

        strokeLoops(ctx!, L.dispF, Math.max(0.7, lw * 0.22), COL.hot, 0.26 * flick * LETTER_DIM);
        strokeLoops(ctx!, L.disp, Math.max(1, lw * 0.5), COL.mid, 0.4 * flick * LETTER_DIM);
        strokeLoops(ctx!, L.disp, Math.max(1, lw * 0.36), COL.core, Math.min(1, (0.4 * flick * sweep + flare) * LETTER_DIM));
        strokeLoops(ctx!, L.dispS, Math.max(0.8, lw * 0.2), COL.rim, 0.3 * flick * LETTER_DIM);
        for (const c of L.crawl) {
          const loop = L.disp![c.loop];
          pulse(ctx!, loop, c.u, c.span * 0.9, lw * 1.1, COL.rim, 0.6 * LETTER_DIM);
          pulse(ctx!, loop, c.u + c.span * 0.18, c.span * 0.4, lw * 0.62, COL.core, 0.95 * LETTER_DIM);
        }
      }

      if (beam) {
        const g = ctx!.createLinearGradient(impact.x - beam.width * 0.5, 0, impact.x + beam.width * 0.5, 0);
        g.addColorStop(0, "rgba(7,198,252,0)");
        g.addColorStop(0.32, "rgba(7,198,252,.55)");
        g.addColorStop(0.5, "rgba(253,252,252,.98)");
        g.addColorStop(0.68, "rgba(7,198,252,.55)");
        g.addColorStop(1, "rgba(7,198,252,0)");
        ctx!.globalAlpha = beam.alpha;
        columnPath(ctx!, beam.L, beam.R); ctx!.fillStyle = g; ctx!.fill();
        ctx!.globalAlpha = 1;
      }

      for (const R of rings) {
        if (now < R.born) continue;
        const k = (now - R.born) / R.life;
        ctx!.globalAlpha = R.a * Math.pow(1 - k, 1.6) * (step % 2 === 0 ? 1 : 0.62);
        ctx!.strokeStyle = COL.core;
        ctx!.lineWidth = Math.max(1, R.w * 0.45 * (1 - k));
        ringPath(ctx!, (1 - Math.pow(1 - k, 2.6)) * R.maxR, step, R.seed);
        ctx!.stroke();
      }
      for (const a of arcs) {
        const k = (now - a.born) / a.life;
        const reveal = Math.max(2, Math.floor(Math.min(1, k * 2.6) * a.pts.length));
        ctx!.globalAlpha = Math.pow(1 - k, 1.6) * (step % 2 === 0 ? 1 : 0.6);
        taper(ctx!, a.pts, a.w * 0.5, reveal); ctx!.fillStyle = COL.core; ctx!.fill();
      }
      for (const set of [letterArcs, inner]) {
        for (const a of set) {
          const k = (now - a.born) / a.life;
          ctx!.globalAlpha = Math.pow(1 - k, 0.9) * (step % 2 === 0 ? 1 : 0.55);
          taper(ctx!, a.pts, a.w * 0.5); ctx!.fillStyle = COL.core; ctx!.fill();
        }
      }
      ctx!.globalAlpha = 1;
      ctx!.globalCompositeOperation = "source-over";

      if (t < CFG.chargeMs && now > nextAmb) {
        addAmbient(now, false); nextAmb = now + 95 + Math.random() * 120;
      }

      if (!struck && t >= T.impact) {
        struck = true;
        addRing(now, 0, Math.max(W * 0.78, 540), 16, 1);
        addRing(now, 90, Math.max(W * 0.55, 400), 11, 0.7);
        addAmbient(now, true);
      }

      if (struck) {
        const since = t - T.impact;

        if (since < CFG.flashMs) {
          const k = since / CFG.flashMs;
          const v = k < 0.1 ? k / 0.1 : Math.pow(1 - (k - 0.1) / 0.9, 2.4);
          flash!.style.opacity = String(Math.max(0, v));
        } else if (flash!.style.opacity !== "0") flash!.style.opacity = "0";

        if (since < CFG.shakeMs) {
          const k = since / CFG.shakeMs;
          const amp = CFG.shakeAmp * Math.pow(1 - k, 2.4);
          shake.x = Math.sin(since * 0.085) * amp;
          shake.y = Math.cos(since * 0.12) * amp * 0.5;
        } else { shake.x = shake.y = 0; }

        // The whole name spawns together right after impact, instead of
        // being typed out letter by letter.
        if (!typed && since >= CFG.typeDelay) {
          typed = true;
          letters.forEach((L) => { L.revealAt = now; });
          onRevealedRef.current?.();
        }
      }

      if (CFG.ambient && t > T.impact && now > nextAmb) {
        addAmbient(now, Math.random() < 0.16);
        nextAmb = now + 900 + Math.random() * 2400;
      }
      if (typed && now > nextLetterArc) {
        addLetterArc(now); nextLetterArc = now + 450 + Math.random() * 1500;
      }
      if (typed && now > nextInner) {
        addInner(now); nextInner = now + 180 + Math.random() * 700;
      }

      raf = requestAnimationFrame(frame);
    }

    function run() {
      cancelAnimationFrame(raf);
      rings.length = arcs.length = ambient.length = letterArcs.length = inner.length = 0;
      letters.forEach((L) => { L.revealAt = Infinity; L.shown = false; });
      flash!.style.opacity = "0";
      shake.x = shake.y = 0;
      struck = typed = false; quality = 1; slowFrames = 0;

      flash!.style.background =
        `radial-gradient(circle at ${impact.x}px ${impact.y}px,` +
        `rgba(255,255,255,1) 0%, rgba(180,239,254,.95) 9%,` +
        `rgba(7,198,252,.5) 26%, rgba(0,139,204,.14) 48%, transparent 68%)`;

      if (reduced) {
        letters.forEach((L) => { L.revealAt = 0; });
        struck = typed = true;
      }

      t0 = last = performance.now();
      nextAmb = 0;
      nextLetterArc = performance.now() + 1800;
      nextInner = performance.now() + 900;
      raf = requestAnimationFrame(frame);
    }

    let resizeT: ReturnType<typeof setTimeout>;
    const onResize = () => {
      clearTimeout(resizeT);
      resizeT = setTimeout(() => {
        const wasDone = typed;
        size();
        if (wasDone) letters.forEach((L) => { L.revealAt = 0; });
      }, 180);
    };
    window.addEventListener("resize", onResize);
    const onVisibility = () => { if (!document.hidden) last = performance.now(); };
    document.addEventListener("visibilitychange", onVisibility);

    size();
    const bootTimer = requestAnimationFrame(() => setTimeout(run, 80));

    return () => {
      cancelAnimationFrame(raf);
      cancelAnimationFrame(bootTimer);
      clearTimeout(resizeT);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [text, anchorRef]);

  return (
    <div ref={hostRef} className="pointer-events-none absolute inset-0 z-[6] overflow-hidden">
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
      <div
        ref={flashRef}
        className="pointer-events-none absolute inset-0"
        style={{ opacity: 0, mixBlendMode: "screen" }}
        aria-hidden
      />
    </div>
  );
}
