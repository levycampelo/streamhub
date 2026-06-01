"use client";

import { ReactNode, useEffect, useRef } from "react";

type AutoPosterCarouselProps = {
  children: ReactNode;
  className?: string;
  stepPx?: number;
  intervalMs?: number;
};

export function AutoPosterCarousel({
  children,
  className = "poster-carousel",
  stepPx = 1,
  intervalMs = 28,
}: AutoPosterCarouselProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const pausedRef = useRef(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) return;

    const intervalId = window.setInterval(() => {
      if (pausedRef.current) return;

      const maxScrollLeft = container.scrollWidth - container.clientWidth;
      if (maxScrollLeft <= 0) return;

      if (container.scrollLeft >= maxScrollLeft - 1) {
        container.scrollLeft = 0;
        return;
      }

      container.scrollLeft += stepPx;
    }, intervalMs);

    const handlePointerEnter = () => {
      pausedRef.current = true;
    };

    const handlePointerLeave = () => {
      pausedRef.current = false;
    };

    container.addEventListener("pointerenter", handlePointerEnter);
    container.addEventListener("pointerleave", handlePointerLeave);

    return () => {
      window.clearInterval(intervalId);
      container.removeEventListener("pointerenter", handlePointerEnter);
      container.removeEventListener("pointerleave", handlePointerLeave);
    };
  }, [intervalMs, stepPx]);

  return (
    <div ref={containerRef} className={className}>
      {children}
    </div>
  );
}
