import { publicUrl } from "@/lib/publicUrl";

type InkBottleProps = {
  /** 0 = upright, 1 = full 180° rotation in place (center axis) */
  flipProgress: number;
  dropping: boolean;
};

const BOTTLE_SRC = publicUrl("about-cinematic/ink-bottle.png", { bustCache: true });

export default function InkBottle({ flipProgress, dropping }: InkBottleProps) {
  const rotateDeg = flipProgress * 180;

  return (
    <img
      src={BOTTLE_SRC}
      alt=""
      className="ink-bottle-photo"
      draggable={false}
      style={{
        transform: `rotate(${rotateDeg}deg)`,
        transformOrigin: "center center",
        opacity: dropping ? 0.88 : 1,
        transition: dropping ? "opacity 0.25s ease" : undefined,
      }}
      aria-hidden
    />
  );
}
