import { useCallback, useRef, type RefObject } from "react";
import InkBottle from "./InkBottle";
import type { BottlePosition } from "./inkBottlePositionStorage";

type InkBottlePlacementProps = {
  stageRef: RefObject<HTMLDivElement | null>;
  bottleWrapRef: RefObject<HTMLDivElement | null>;
  visible: boolean;
  position: BottlePosition;
  isLocked: boolean;
  isMoving: boolean;
  flipProgress: number;
  dropping: boolean;
  knocked: boolean;
  showEditor: boolean;
  onStartMove: () => void;
  onLock: () => void;
  onReset: () => void;
  onPositionChange: (pos: BottlePosition) => void;
};

function clientToNormalized(
  clientX: number,
  clientY: number,
  rect: DOMRect,
): BottlePosition {
  return {
    x: Math.max(0.05, Math.min(0.95, (clientX - rect.left) / rect.width)),
    y: Math.max(0.08, Math.min(0.95, (clientY - rect.top) / rect.height)),
  };
}

export default function InkBottlePlacement({
  stageRef,
  bottleWrapRef,
  visible,
  position,
  isLocked,
  isMoving,
  flipProgress,
  dropping,
  knocked,
  showEditor,
  onStartMove,
  onLock,
  onReset,
  onPositionChange,
}: InkBottlePlacementProps) {
  const draggingRef = useRef(false);

  const bottleDriftX = flipProgress * -6;

  const onBottlePointerDown = (e: React.PointerEvent) => {
    if (!isMoving) return;
    e.preventDefault();
    draggingRef.current = true;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onBottlePointerMove = (e: React.PointerEvent) => {
    if (!isMoving || !draggingRef.current) return;
    const stage = stageRef.current;
    if (!stage) return;
    onPositionChange(
      clientToNormalized(e.clientX, e.clientY, stage.getBoundingClientRect()),
    );
  };

  const onBottlePointerUp = () => {
    draggingRef.current = false;
  };

  const handleLock = useCallback(() => {
    onLock();
  }, [onLock]);

  return (
    <>
      {showEditor ? (
        <div className="ink-bottle-editor__toolbar">
          <button
            type="button"
            className={`basketball-path-editor__btn ${isMoving ? "is-active" : ""}`}
            onClick={onStartMove}
          >
            Move ink
          </button>
          <button
            type="button"
            className="basketball-path-editor__btn basketball-path-editor__btn--lock"
            onClick={handleLock}
          >
            Lock ink
          </button>
          <button
            type="button"
            className="basketball-path-editor__btn basketball-path-editor__btn--ghost"
            onClick={onReset}
          >
            Reset
          </button>
          <span className="ink-bottle-editor__status">
            {isMoving
              ? "Drag the bottle into place"
              : isLocked
                ? "Ink position locked"
                : "Move ink → Lock ink"}
          </span>
        </div>
      ) : null}

      <div
        className={`ink-bottle-slot ink-bottle-slot--placed ${isMoving ? "is-moving" : ""} ${knocked ? "is-knocked" : ""} ${visible ? "is-visible" : ""}`}
        style={{
          left: `${position.x * 100}%`,
          top: `${position.y * 100}%`,
        }}
        aria-hidden
      >
        <div
          ref={bottleWrapRef}
          className="ink-bottle-pedestal__inner ink-bottle-pedestal__inner--placed"
          style={{
            transform: `translate(-50%, -50%) translateX(${bottleDriftX}px)`,
          }}
          onPointerDown={onBottlePointerDown}
          onPointerMove={onBottlePointerMove}
          onPointerUp={onBottlePointerUp}
          onPointerCancel={onBottlePointerUp}
        >
          <InkBottle flipProgress={flipProgress} dropping={dropping} />
        </div>
      </div>
    </>
  );
}
