import type { CSSProperties } from "react";

type SignalLockProps = {
  text: string;
  className?: string;
  /** Delay before the shear-in starts, in ms. */
  delayMs?: number;
  style?: CSSProperties;
};

/**
 * A signal resolving out of noise: sheared, clipped bands of the line settle
 * into the clean text underneath. Pass typography (size/weight/color) via
 * `className`/`style` — this component sets none of its own.
 */
export default function SignalLock({ text, className = "", delayMs = 900, style: styleProp }: SignalLockProps) {
  const style = { ...styleProp, "--sl-delay": `${delayMs}ms` } as CSSProperties;

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
