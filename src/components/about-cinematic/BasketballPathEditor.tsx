import { useCallback, useRef, useState, type RefObject } from "react";
import type { PathPoint } from "./basketballPathStorage";
import { pathToSvgD, reduceToAnchors } from "./basketballPathMath";

type BasketballPathEditorProps = {
  sceneRef: RefObject<HTMLDivElement | null>;
  isDrawing: boolean;
  isAdjusting: boolean;
  draftPoints: PathPoint[];
  lockedAnchors: PathPoint[] | null;
  onStartDraw: () => void;
  onStartAdjust: () => void;
  onLock: () => void;
  onClear: () => void;
  onDraftReset: () => void;
  onDraftAppend: (point: PathPoint) => void;
  onAnchorsChange: (anchors: PathPoint[]) => void;
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

export default function BasketballPathEditor({
  sceneRef,
  isDrawing,
  isAdjusting,
  draftPoints,
  lockedAnchors,
  onStartDraw,
  onStartAdjust,
  onLock,
  onClear,
  onDraftReset,
  onDraftAppend,
  onAnchorsChange,
}: BasketballPathEditorProps) {
  const drawingRef = useRef(false);
  const dragAnchorRef = useRef<number | null>(null);
  const [liveAnchors, setLiveAnchors] = useState<PathPoint[] | null>(null);

  const anchors = liveAnchors ?? lockedAnchors;

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
      if (!el || !anchors) return;
      const rect = el.getBoundingClientRect();
      const pt = clientToNormalized(clientX, clientY, rect);
      const next = anchors.map((p, i) => (i === index ? pt : p));
      setLiveAnchors(next);
      onAnchorsChange(next);
    },
    [anchors, onAnchorsChange, sceneRef],
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

  const curveAnchors = isDrawing
    ? draftPoints.length >= 2
      ? reduceToAnchors(draftPoints, 7)
      : null
    : anchors;

  const pathD =
    curveAnchors && curveAnchors.length >= 2 ? pathToSvgD(curveAnchors) : "";

  return (
    <>
      <div className="basketball-path-editor__toolbar">
        <button
          type="button"
          className={`basketball-path-editor__btn ${isDrawing ? "is-active" : ""}`}
          onClick={onStartDraw}
        >
          Drag
        </button>
        <button
          type="button"
          className="basketball-path-editor__btn basketball-path-editor__btn--lock"
          onClick={onLock}
          disabled={isDrawing ? draftPoints.length < 2 : !lockedAnchors}
        >
          Lock
        </button>
        <button
          type="button"
          className={`basketball-path-editor__btn ${isAdjusting ? "is-active" : ""}`}
          onClick={onStartAdjust}
          disabled={!lockedAnchors}
        >
          Adjust
        </button>
        <button
          type="button"
          className="basketball-path-editor__btn basketball-path-editor__btn--ghost"
          onClick={onClear}
        >
          Clear
        </button>
        <span className="basketball-path-editor__status">
          {isAdjusting
            ? "Drag the dots to bend the curve"
            : lockedAnchors
              ? "Scroll to preview · Adjust to tweak curve"
              : isDrawing
                ? "Sketch the shot arc…"
                : "Drag → Lock → Adjust handles"}
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

      {pathD ? (
        <svg
          className="basketball-path-editor__path"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden
        >
          <path
            d={pathD}
            className={
              isDrawing
                ? "basketball-path-editor__stroke basketball-path-editor__stroke--draft"
                : "basketball-path-editor__stroke basketball-path-editor__stroke--locked"
            }
          />
        </svg>
      ) : null}

      {isAdjusting && anchors
        ? anchors.map((pt, index) => (
            <button
              key={index}
              type="button"
              className="basketball-path-editor__handle"
              style={{ left: `${pt.x * 100}%`, top: `${pt.y * 100}%` }}
              aria-label={`Curve point ${index + 1}`}
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
