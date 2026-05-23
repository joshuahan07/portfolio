import { forwardRef, useCallback, useEffect, useRef, useState } from "react";
import { publicUrl } from "@/lib/publicUrl";
import MultiSegmentPathEditor from "./MultiSegmentPathEditor";
import {
  addBounceSegment,
  anchorsFromStroke,
  createEmptyDocument,
  ensureShotSegment,
  type PathDocument,
  type PathSegment,
} from "./basketballPathDocument";
import type { PathPoint } from "./basketballPathStorage";

const HOOP_SRC = publicUrl("hoop.png", { bustCache: true });
type BasketballKnockSceneProps = {
  doc: PathDocument;
  onDocChange: (doc: PathDocument) => void;
};

const BasketballKnockScene = forwardRef<HTMLDivElement, BasketballKnockSceneProps>(
function BasketballKnockScene({ doc, onDocChange }, forwardedRef) {
  const sceneRef = useRef<HTMLDivElement>(null);

  const setSceneRef = useCallback(
    (el: HTMLDivElement | null) => {
      sceneRef.current = el;
      if (typeof forwardedRef === "function") forwardedRef(el);
      else if (forwardedRef) forwardedRef.current = el;
    },
    [forwardedRef],
  );
  const [activeId, setActiveId] = useState<string | null>(() => doc.shot?.id ?? null);
  const [draftPoints, setDraftPoints] = useState<PathPoint[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isAdjusting, setIsAdjusting] = useState(false);

  const showEditor = import.meta.env.DEV;

  const persist = useCallback(
    (next: PathDocument) => {
      onDocChange(next);
    },
    [onDocChange],
  );

  const getActive = useCallback((): PathSegment | null => {
    if (!activeId) return doc.shot;
    if (doc.shot?.id === activeId) return doc.shot;
    return doc.bounces.find((b) => b.id === activeId) ?? doc.shot;
  }, [activeId, doc]);

  const handleStartDraw = useCallback(() => {
    setIsDrawing(true);
    setIsAdjusting(false);
    setDraftPoints([]);
  }, []);

  const handleStartAdjust = useCallback(() => {
    if (!getActive()?.locked) return;
    setIsAdjusting((v) => !v);
    setIsDrawing(false);
  }, [getActive]);

  const handleLock = useCallback(() => {
    const active = getActive();
    if (!active) return;

    const source =
      isDrawing && draftPoints.length >= 2 ? draftPoints : active.anchors;
    const maxAnchors = active.label === "Shot" ? 8 : 6;
    let anchors = anchorsFromStroke(source, maxAnchors);
    if (anchors.length < 2) return;

    if (doc.shot?.id !== active.id) {
      const idx = doc.bounces.findIndex((b) => b.id === active.id);
      const prevEnd =
        idx > 0
          ? doc.bounces[idx - 1]?.anchors.at(-1)
          : doc.shot?.anchors.at(-1);
      if (prevEnd) {
        anchors = [{ ...prevEnd }, ...anchors.slice(1)];
      }
    }

    const updated: PathSegment = { ...active, anchors, locked: true };
    const next: PathDocument =
      doc.shot?.id === active.id
        ? { ...doc, shot: updated }
        : {
            ...doc,
            bounces: doc.bounces.map((b) => (b.id === active.id ? updated : b)),
          };

    persist(next);
    setDraftPoints([]);
    setIsDrawing(false);
    setIsAdjusting(true);
  }, [doc, draftPoints, getActive, isDrawing, persist]);

  const handleAddBounce = useCallback(() => {
    const next = addBounceSegment(doc);
    persist(next);
    const added = next.bounces[next.bounces.length - 1];
    if (added) setActiveId(added.id);
    setIsDrawing(false);
    setIsAdjusting(false);
  }, [doc, persist]);

  const handleDeleteActive = useCallback(() => {
    const active = getActive();
    if (!active || active.id === doc.shot?.id) return;
    persist({
      ...doc,
      bounces: doc.bounces.filter((b) => b.id !== active.id),
    });
    setActiveId(doc.shot?.id ?? null);
    setIsAdjusting(false);
  }, [doc, getActive, persist]);

  const handleClearAll = useCallback(() => {
    const empty = ensureShotSegment(createEmptyDocument());
    persist(empty);
    setActiveId(empty.shot?.id ?? null);
    setDraftPoints([]);
    setIsDrawing(false);
    setIsAdjusting(false);
  }, [persist]);

  const handleAnchorsChange = useCallback(
    (id: string, anchors: PathPoint[]) => {
      if (doc.shot?.id === id) {
        persist({ ...doc, shot: doc.shot ? { ...doc.shot, anchors } : null });
      } else {
        persist({
          ...doc,
          bounces: doc.bounces.map((b) => (b.id === id ? { ...b, anchors } : b)),
        });
      }
    },
    [doc, persist],
  );

  useEffect(() => {
    if (!doc.shot) {
      const seeded = ensureShotSegment(doc);
      persist(seeded);
      setActiveId(seeded.shot?.id ?? null);
    }
  }, [doc, persist]);

  useEffect(() => {
    if (!showEditor) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsDrawing(false);
        setIsAdjusting(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showEditor]);

  return (
    <div ref={setSceneRef} className="basketball-knock-scene">
      <img
        src={HOOP_SRC}
        alt=""
        className="basketball-knock-scene__hoop-img"
        draggable={false}
        aria-hidden
      />

      {showEditor ? (
        <MultiSegmentPathEditor
          sceneRef={sceneRef}
          doc={doc}
          activeId={activeId}
          isDrawing={isDrawing}
          isAdjusting={isAdjusting}
          draftPoints={draftPoints}
          onSelectSegment={setActiveId}
          onStartDraw={handleStartDraw}
          onStartAdjust={handleStartAdjust}
          onLock={handleLock}
          onAddBounce={handleAddBounce}
          onDeleteActive={handleDeleteActive}
          onClearAll={handleClearAll}
          onDraftReset={() => setDraftPoints([])}
          onDraftAppend={(pt) => {
            setDraftPoints((prev) => {
              if (prev.length > 0) {
                const last = prev[prev.length - 1];
                const dx = pt.x - last.x;
                const dy = pt.y - last.y;
                if (dx * dx + dy * dy < 0.000025) return prev;
              }
              return [...prev, pt];
            });
          }}
          onAnchorsChange={handleAnchorsChange}
        />
      ) : null}
    </div>
  );
});

export default BasketballKnockScene;
