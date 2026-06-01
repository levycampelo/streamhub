"use client";

import { ReactNode, useEffect, useRef } from "react";

type AutoPosterCarouselProps = {
  children: ReactNode;
  className?: string;
  speedPxPerSecond?: number;
};

export function AutoPosterCarousel({
  children,
  className = "poster-carousel poster-carousel--auto",
  speedPxPerSecond = 36,
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
          const next = container.scrollLeft + speedPxPerSecond * deltaSeconds;
          container.scrollLeft = next >= maxScrollLeft ? 0 : next;
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
  }, [speedPxPerSecond]);

  return (
    <div ref={containerRef} className={className}>
      {children}
    </div>
  );
}
