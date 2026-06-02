"use client";

import { useEffect } from "react";

declare let adsbygoogle: unknown[];

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
  useEffect(() => {
    try {
      (adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      // adsbygoogle not loaded yet
    }
  }, []);

  return (
    <div className={className} aria-label="Publicidade">
      <ins
        className="adsbygoogle"
        style={{ display: "inline-block", width: 728, height: 90 }}
        data-ad-client={ADSENSE_CLIENT}
        data-ad-slot={slot || DEFAULT_SLOT}
      />
    </div>
  );
}
