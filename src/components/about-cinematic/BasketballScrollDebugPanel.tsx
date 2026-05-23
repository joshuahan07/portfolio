import type { BasketballDebugSnapshot } from "./useBasketballScrollDebug";

type Props = {
  snapshot: BasketballDebugSnapshot;
};

export default function BasketballScrollDebugPanel({ snapshot }: Props) {
  const shotPct = Math.round(snapshot.shotProgress * 100);
  const cardPct = Math.round(snapshot.cardReveal * 100);
  const fallPct = snapshot.shotComplete
    ? Math.round(snapshot.bounceMotion.fallT * 100)
    : 0;
  const arcPct = Math.round(snapshot.bounceMotion.arcT * 100);

  return (
    <div
      id="basketball-scroll-debug"
      className="basketball-scroll-debug"
      role="status"
      aria-live="polite"
    >
      <p className="basketball-scroll-debug__title">Basketball scroll debug</p>
      <dl className="basketball-scroll-debug__grid">
        <div>
          <dt>Shot</dt>
          <dd>{shotPct}%</dd>
        </div>
        <div>
          <dt>Card shown</dt>
          <dd>{cardPct}%</dd>
        </div>
        <div>
          <dt>Fall (B1)</dt>
          <dd>{fallPct}%</dd>
        </div>
        <div>
          <dt>Arc (B2–5)</dt>
          <dd>{arcPct}%</dd>
        </div>
        <div>
          <dt>Ball visible</dt>
          <dd>{snapshot.showBall ? "yes" : "no"}</dd>
        </div>
        <div>
          <dt>Path locked</dt>
          <dd>{snapshot.hasLockedPath ? "yes" : "no"}</dd>
        </div>
      </dl>
      <p className="basketball-scroll-debug__hint">
        Shot 100% → fall until card 19%. Bounces 2–5 from 19% → 45% ink.
      </p>
    </div>
  );
}
