import type { CSSProperties } from "react";

type SignalLockProps = {
  text: string;
  className?: string;
  /** Delay before the shear-in starts, in ms. */
  delayMs?: number;
};

/**
 * A signal resolving out of noise: sheared, clipped bands of the line settle
 * into the clean text underneath. Pass typography (size/weight/color) via
 * `className` — this component sets none of its own.
 */
export default function SignalLock({ text, className = "", delayMs = 900 }: SignalLockProps) {
  const style = { "--sl-delay": `${delayMs}ms` } as CSSProperties;

  return (
    <p className={`signal-lock ${className}`} style={style}>
      <span className="signal-lock__stack">
        <span className="signal-lock__layer" aria-hidden="true">{text}</span>
        <span className="signal-lock__layer" aria-hidden="true">{text}</span>
        <span className="signal-lock__layer" aria-hidden="true">{text}</span>
        <span className="signal-lock__layer" aria-hidden="true">{text}</span>
        <span className="signal-lock__base">{text}</span>
      </span>
    </p>
  );
}
