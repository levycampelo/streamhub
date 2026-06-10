"use client";

import { useEffect } from "react";

const ADSENSE_CLIENT = "ca-pub-9694036490209505";

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
  const resolvedSlot = slot?.trim();

  useEffect(() => {
    if (!resolvedSlot) {
      return;
    }

    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      // adsbygoogle not loaded yet
    }
  }, [resolvedSlot]);

  if (!resolvedSlot) {
    return null;
  }

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
