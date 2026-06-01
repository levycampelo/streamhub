"use client";

import { ReactNode, useEffect, useRef } from "react";

type AutoPosterCarouselProps = {
  children: ReactNode;
  className?: string;
  speedPxPerSecond?: number;
  direction?: "forward" | "reverse";
};

export function AutoPosterCarousel({
  children,
  className = "poster-carousel poster-carousel--auto",
  speedPxPerSecond = 36,
  direction = "forward",
}: AutoPosterCarouselProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const pausedRef = useRef(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let animationFrameId = 0;
    let lastTimestamp = 0;

    const tick = (timestamp: number) => {
      if (!lastTimestamp) {
        lastTimestamp = timestamp;
      }

      const deltaSeconds = (timestamp - lastTimestamp) / 1000;
      lastTimestamp = timestamp;

      if (!pausedRef.current) {
        const maxScrollLeft = container.scrollWidth - container.clientWidth;
        if (maxScrollLeft > 0) {
          const delta = speedPxPerSecond * deltaSeconds;
          if (direction === "reverse") {
            const next = container.scrollLeft - delta;
            container.scrollLeft = next <= 0 ? maxScrollLeft : next;
          } else {
            const next = container.scrollLeft + delta;
            container.scrollLeft = next >= maxScrollLeft ? 0 : next;
          }
        }
      }

      animationFrameId = window.requestAnimationFrame(tick);
    };

    animationFrameId = window.requestAnimationFrame(tick);

    const handlePointerEnter = () => {
      pausedRef.current = true;
    };

    const handlePointerLeave = () => {
      pausedRef.current = false;
    };

    container.addEventListener("pointerenter", handlePointerEnter);
    container.addEventListener("pointerleave", handlePointerLeave);

    return () => {
      window.cancelAnimationFrame(animationFrameId);
      container.removeEventListener("pointerenter", handlePointerEnter);
      container.removeEventListener("pointerleave", handlePointerLeave);
    };
  }, [direction, speedPxPerSecond]);

  return (
    <div ref={containerRef} className={className}>
      {children}
    </div>
  );
}
