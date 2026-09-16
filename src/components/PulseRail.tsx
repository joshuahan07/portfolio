import type { CSSProperties } from "react";

type PulseRailProps = {
  className?: string;
  /** Width of the traveling light packet, in px. */
  packetWidth?: number;
  /** Seconds for one full pass across the rail. */
  durationS?: number;
  /** Seconds before the first pass starts. */
  delayS?: number;
  reverse?: boolean;
};

/** A hairline rail with a traveling glowing packet — see the
 *  `.pulse-rail` rules in site-core.css. */
export default function PulseRail({
  className = "",
  packetWidth = 130,
  durationS = 5.5,
  delayS = 0,
  reverse = false,
}: PulseRailProps) {
  const style = {
    "--pr-packet": `${packetWidth}px`,
    "--pr-duration": `${durationS}s`,
    "--pr-delay": `${delayS}s`,
  } as CSSProperties;

  return (
    <div
      className={`pulse-rail ${reverse ? "pulse-rail--reverse" : ""} ${className}`}
      style={style}
      aria-hidden
    >
      <div className="pulse-rail__packet" />
    </div>
  );
}
