"use client";

import { MouseEvent, ReactNode, useMemo } from "react";

type DeepLinkAnchorProps = {
  appUrl: string | null;
  webUrl: string | null;
  title?: string;
  className?: string;
  children: ReactNode;
};

function isMobileDevice(): boolean {
  if (typeof navigator === "undefined") {
    return false;
  }

  return /android|iphone|ipad|ipod/i.test(navigator.userAgent);
}

export function DeepLinkAnchor({ appUrl, webUrl, title, className, children }: DeepLinkAnchorProps) {
  const mobile = useMemo(() => isMobileDevice(), []);

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    if (!appUrl || !webUrl) {
      return;
    }

    if (!mobile) {
      return;
    }

    event.preventDefault();

    const startedAt = Date.now();
    let hidden = false;

    const onVisibilityChange = () => {
      hidden = document.visibilityState === "hidden";
    };

    document.addEventListener("visibilitychange", onVisibilityChange, { once: true });
    window.location.href = appUrl;

    window.setTimeout(() => {
      if (!hidden && Date.now() - startedAt >= 1100) {
        window.location.href = webUrl;
      }
    }, 1200);
  }

  if (!webUrl && !appUrl) {
    return <div className={className}>{children}</div>;
  }

  return (
    <a
      href={webUrl ?? appUrl ?? "#"}
      onClick={handleClick}
      className={className}
      title={title}
      rel="noreferrer noopener"
    >
      {children}
    </a>
  );
}
