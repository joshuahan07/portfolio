import { useCallback, useState } from "react";

export function useCardFade(onReady?: () => void) {
  const [cardVisible, setCardVisible] = useState(false);
  const [cardOpacity, setCardOpacity] = useState(0);

  const reset = useCallback(() => {
    setCardVisible(false);
    setCardOpacity(0);
  }, []);

  const reveal = useCallback(
    (step = 0.02) => {
      setCardVisible(true);
      let op = 0;
      const fadeIn = window.setInterval(() => {
        op += step;
        const next = Math.min(1, op);
        setCardOpacity(next);
        if (next >= 1) {
          window.clearInterval(fadeIn);
          onReady?.();
        }
      }, 16);
    },
    [onReady],
  );

  const revealInstant = useCallback(() => {
    setCardVisible(true);
    setCardOpacity(1);
    onReady?.();
  }, [onReady]);

  return { cardVisible, cardOpacity, reveal, revealInstant, reset };
}
