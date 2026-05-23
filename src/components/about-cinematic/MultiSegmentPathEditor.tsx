import { useCallback, useRef, useState, type RefObject } from "react";
import type { PathDocument, PathSegment } from "./basketballPathDocument";
import { pathToSvgD, reduceToAnchors } from "./basketballPathMath";
import type { PathPoint } from "./basketballPathStorage";

type MultiSegmentPathEditorProps = {
  sceneRef: RefObject<HTMLDivElement | null>;
  doc: PathDocument;
  activeId: string | null;
  isDrawing: boolean;
  isAdjusting: boolean;
  draftPoints: PathPoint[];
  onSelectSegment: (id: string) => void;
  onStartDraw: () => void;
  onStartAdjust: () => void;
  onLock: () => void;
  onAddBounce: () => void;
  onDeleteActive: () => void;
  onClearAll: () => void;
  onDraftReset: () => void;
  onDraftAppend: (point: PathPoint) => void;
  onAnchorsChange: (id: string, anchors: PathPoint[]) => void;
};

function clientToNormalized(
  clientX: number,
  clientY: number,
  rect: DOMRect,
): PathPoint {
  return {
    x: Math.max(0, Math.min(1, (clientX - rect.left) / rect.width)),
    y: Math.max(0, Math.min(1, (clientY - rect.top) / rect.height)),
  };
}

function getActiveSegment(
  doc: PathDocument,
  activeId: string | null,
): PathSegment | null {
  if (!activeId) return doc.shot;
  if (doc.shot?.id === activeId) return doc.shot;
  return doc.bounces.find((b) => b.id === activeId) ?? doc.shot;
}

export default function MultiSegmentPathEditor({
  sceneRef,
  doc,
  activeId,
  isDrawing,
  isAdjusting,
  draftPoints,
  onSelectSegment,
  onStartDraw,
  onStartAdjust,
  onLock,
  onAddBounce,
  onDeleteActive,
  onClearAll,
  onDraftReset,
  onDraftAppend,
  onAnchorsChange,
}: MultiSegmentPathEditorProps) {
  const drawingRef = useRef(false);
  const dragAnchorRef = useRef<number | null>(null);
  const [liveAnchors, setLiveAnchors] = useState<PathPoint[] | null>(null);

  const active = getActiveSegment(doc, activeId);
  const lockedAnchors = active?.locked ? active.anchors : null;
  const anchors = liveAnchors ?? lockedAnchors;

  const segments: PathSegment[] = [];
  if (doc.shot) segments.push(doc.shot);
  segments.push(...doc.bounces);

  const appendPoint = useCallback(
    (clientX: number, clientY: number) => {
      const el = sceneRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      if (rect.width < 1 || rect.height < 1) return;
      onDraftAppend(clientToNormalized(clientX, clientY, rect));
    },
    [onDraftAppend, sceneRef],
  );

  const onOverlayPointerDown = (e: React.PointerEvent) => {
    if (!isDrawing) return;
    e.preventDefault();
    drawingRef.current = true;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    onDraftReset();
    appendPoint(e.clientX, e.clientY);
  };

  const onOverlayPointerMove = (e: React.PointerEvent) => {
    if (!isDrawing || !drawingRef.current) return;
    appendPoint(e.clientX, e.clientY);
  };

  const onOverlayPointerUp = () => {
    drawingRef.current = false;
  };

  const moveAnchor = useCallback(
    (index: number, clientX: number, clientY: number) => {
      const el = sceneRef.current;
      if (!el || !anchors || !active) return;
      const rect = el.getBoundingClientRect();
      const pt = clientToNormalized(clientX, clientY, rect);
      const next = anchors.map((p, i) => (i === index ? pt : p));
      setLiveAnchors(next);
      onAnchorsChange(active.id, next);
    },
    [active, anchors, onAnchorsChange, sceneRef],
  );

  const onHandlePointerDown = (index: number) => (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragAnchorRef.current = index;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setLiveAnchors(anchors ?? null);
  };

  const onHandlePointerMove = (e: React.PointerEvent) => {
    const index = dragAnchorRef.current;
    if (index === null) return;
    moveAnchor(index, e.clientX, e.clientY);
  };

  const onHandlePointerUp = () => {
    dragAnchorRef.current = null;
    setLiveAnchors(null);
  };

  const previewAnchors = isDrawing
    ? draftPoints.length >= 2
      ? reduceToAnchors(draftPoints, 6)
      : null
    : null;

  return (
    <>
      <div className="basketball-path-editor__toolbar basketball-path-editor__toolbar--multi">
        <div className="basketball-path-editor__segment-tabs">
          {segments.map((seg) => (
            <button
              key={seg.id}
              type="button"
              className={`basketball-path-editor__tab ${active?.id === seg.id ? "is-active" : ""} ${seg.locked ? "is-locked" : ""}`}
              onClick={() => onSelectSegment(seg.id)}
            >
              {seg.label}
            </button>
          ))}
          <button
            type="button"
            className="basketball-path-editor__tab basketball-path-editor__tab--add"
            onClick={onAddBounce}
            title="Add bounce segment"
          >
            + Bounce
          </button>
        </div>

        <div className="basketball-path-editor__actions">
          <button
            type="button"
            className={`basketball-path-editor__btn ${isDrawing ? "is-active" : ""}`}
            onClick={onStartDraw}
            disabled={!active}
          >
            Drag
          </button>
          <button
            type="button"
            className="basketball-path-editor__btn basketball-path-editor__btn--lock"
            onClick={onLock}
            disabled={!active || (isDrawing ? draftPoints.length < 2 : !lockedAnchors)}
          >
            Lock
          </button>
          <button
            type="button"
            className={`basketball-path-editor__btn ${isAdjusting ? "is-active" : ""}`}
            onClick={onStartAdjust}
            disabled={!active?.locked}
          >
            Adjust
          </button>
          <button
            type="button"
            className="basketball-path-editor__btn basketball-path-editor__btn--ghost"
            onClick={onDeleteActive}
            disabled={!active || active.id === doc.shot?.id}
          >
            Del
          </button>
          <button
            type="button"
            className="basketball-path-editor__btn basketball-path-editor__btn--ghost"
            onClick={onClearAll}
          >
            Clear all
          </button>
        </div>

        <span className="basketball-path-editor__status">
          {isAdjusting
            ? `Adjusting ${active?.label ?? "segment"} — drag dots`
            : isDrawing
              ? `Drawing ${active?.label ?? "segment"}…`
              : "Shot → scroll in hoop → scroll reveals card → bounces hit ink"}
        </span>
      </div>

      {isDrawing ? (
        <div
          className="basketball-path-editor__overlay"
          onPointerDown={onOverlayPointerDown}
          onPointerMove={onOverlayPointerMove}
          onPointerUp={onOverlayPointerUp}
          onPointerCancel={onOverlayPointerUp}
        />
      ) : null}

      <svg
        className="basketball-path-editor__path"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden
      >
        {segments.map((seg) => {
          if (seg.anchors.length < 2) return null;
          const isActive = seg.id === active?.id;
          const d = pathToSvgD(seg.anchors);
          return (
            <path
              key={seg.id}
              d={d}
              className={
                isActive
                  ? "basketball-path-editor__stroke basketball-path-editor__stroke--active"
                  : seg.locked
                    ? "basketball-path-editor__stroke basketball-path-editor__stroke--locked"
                    : "basketball-path-editor__stroke basketball-path-editor__stroke--idle"
              }
            />
          );
        })}
        {previewAnchors && previewAnchors.length >= 2 ? (
          <path
            d={pathToSvgD(previewAnchors)}
            className="basketball-path-editor__stroke basketball-path-editor__stroke--draft"
          />
        ) : null}
      </svg>

      {isAdjusting && anchors && active
        ? anchors.map((pt, index) => (
            <button
              key={`${active.id}-${index}`}
              type="button"
              className="basketball-path-editor__handle"
              style={{ left: `${pt.x * 100}%`, top: `${pt.y * 100}%` }}
              aria-label={`${active.label} point ${index + 1}`}
              onPointerDown={onHandlePointerDown(index)}
              onPointerMove={onHandlePointerMove}
              onPointerUp={onHandlePointerUp}
              onPointerCancel={onHandlePointerUp}
            />
          ))
        : null}
    </>
  );
}
