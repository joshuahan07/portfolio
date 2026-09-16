import { forwardRef, useCallback, useEffect, useRef } from "react";
import { publicUrl } from "@/lib/publicUrl";
import { ensureShotSegment, type PathDocument } from "./basketballPathDocument";

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

  useEffect(() => {
    if (!doc.shot) {
      onDocChange(ensureShotSegment(doc));
    }
  }, [doc, onDocChange]);

  return (
    <div ref={setSceneRef} className="basketball-knock-scene">
      <img
        src={HOOP_SRC}
        alt=""
        className="basketball-knock-scene__hoop-img"
        draggable={false}
        aria-hidden
      />
    </div>
  );
});

export default BasketballKnockScene;
