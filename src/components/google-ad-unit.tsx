"use client";

import { useEffect } from "react";

const ADSENSE_CLIENT = "ca-pub-9694036490209505";
const DEFAULT_SLOT = "1077544455";

declare global {
  interface Window {
    adsbygoogle: unknown[];
  }
}

type GoogleAdUnitProps = {
  slot?: string;
  className?: string;
};

export function GoogleAdUnit({ slot, className }: GoogleAdUnitProps) {
  const resolvedSlot = slot?.trim() || DEFAULT_SLOT;

  useEffect(() => {
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      // adsbygoogle not loaded yet
    }
  }, [resolvedSlot]);

  return (
    <div className={className} aria-label="Publicidade">
      <ins
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client={ADSENSE_CLIENT}
        data-ad-slot={resolvedSlot}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  );
}
