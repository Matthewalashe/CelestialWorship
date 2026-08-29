import { useRef, useCallback } from 'react';

interface SwipeHandlers {
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchEnd: (e: React.TouchEvent) => void;
}

interface UseSwipeOptions {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  /** Minimum horizontal distance (px) to trigger a swipe. Default: 50 */
  threshold?: number;
  /** Maximum vertical distance (px) — prevents swipe during scroll. Default: 80 */
  maxVertical?: number;
}

/**
 * Touch swipe detection hook for reader-mode navigation.
 * Returns onTouchStart/onTouchEnd handlers to spread onto a container element.
 *
 * Usage:
 *   const swipe = useSwipe({ onSwipeLeft: goNext, onSwipeRight: goPrev });
 *   <div {...swipe}> ... </div>
 */
export function useSwipe({
  onSwipeLeft,
  onSwipeRight,
  threshold = 50,
  maxVertical = 80,
}: UseSwipeOptions): SwipeHandlers {
  const startX = useRef(0);
  const startY = useRef(0);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    startX.current = touch.clientX;
    startY.current = touch.clientY;
  }, []);

  const onTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      const touch = e.changedTouches[0];
      const dx = touch.clientX - startX.current;
      const dy = Math.abs(touch.clientY - startY.current);

      // Ignore if mostly vertical (user is scrolling)
      if (dy > maxVertical) return;

      if (dx < -threshold && onSwipeLeft) {
        onSwipeLeft();
      } else if (dx > threshold && onSwipeRight) {
        onSwipeRight();
      }
    },
    [onSwipeLeft, onSwipeRight, threshold, maxVertical]
  );

  return { onTouchStart, onTouchEnd };
}
