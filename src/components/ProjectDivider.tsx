import { useEffect, useRef } from "react";
import { runLightningDivider, ELECTRIC_LIGHTNING_DIVIDER } from "@/lib/lightningDivider";

export default function ProjectDivider() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const reducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const handle = runLightningDivider(canvas, ELECTRIC_LIGHTNING_DIVIDER, {
      reducedMotion,
    });

    return () => handle.stop();
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="divider-combo block h-14 w-full cursor-default sm:h-[3.5rem]"
      aria-hidden
    />
  );
}
