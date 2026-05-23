import { publicUrl } from "@/lib/publicUrl";
import { createPortal } from "react-dom";
import type { BallPose } from "./basketballKnockMath";

const BALL_SRC = publicUrl("basketball.png", { bustCache: true });

type BasketballBallProps = {
  pose: BallPose;
  /** Scene-local % (matches drawn paths). Use inside .basketball-knock-scene */
  mode: "scene";
};

type BasketballBallViewportProps = {
  pose: BallPose;
  /** Fixed to viewport — use during card-reveal scroll */
  mode: "viewport";
};

type BasketballBallDocumentProps = {
  pose: BallPose;
  /** Absolute document pixels — scrolls with the page. */
  mode: "document";
};

export default function BasketballBall(
  props:
    | BasketballBallProps
    | BasketballBallViewportProps
    | BasketballBallDocumentProps,
) {
  if (!props.pose.visible) return null;

  const { pose, mode } = props;

  if (mode === "scene") {
    return (
      <img
        src={BALL_SRC}
        alt=""
        className="basketball-knock-scene__ball-img"
        draggable={false}
        style={{
          left: `${pose.x}%`,
          top: `${pose.y}%`,
          transform: `translate(-50%, -50%) rotate(${pose.rotation}deg)`,
        }}
        aria-hidden
      />
    );
  }

  if (mode === "document") {
    const documentBall = (
      <img
        src={BALL_SRC}
        alt=""
        className="basketball-document-ball"
        draggable={false}
        style={{
          left: `${pose.x}px`,
          top: `${pose.y}px`,
          transform: `translate(-50%, -50%) rotate(${pose.rotation}deg)`,
        }}
        aria-hidden
      />
    );

    if (typeof document === "undefined") return null;
    return createPortal(documentBall, document.body);
  }

  const fixedBall = (
    <div className="basketball-fixed-ball" aria-hidden>
      <img
        src={BALL_SRC}
        alt=""
        className="basketball-fixed-ball__img"
        draggable={false}
        style={{
          left: `${pose.x}%`,
          top: `${pose.y}%`,
          transform: `translate(-50%, -50%) rotate(${pose.rotation}deg)`,
        }}
      />
    </div>
  );

  if (typeof document === "undefined") return null;
  return createPortal(fixedBall, document.body);
}
