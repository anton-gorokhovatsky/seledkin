"use client";

import { useEffect, useRef } from "react";

type HeroVideoProps = {
  poster: string;
  src: string;
};

export function HeroVideo({ poster, src }: HeroVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    function syncPlayback() {
      const video = videoRef.current;
      if (!video) return;

      if (reducedMotion.matches) {
        video.pause();
        video.currentTime = 0;
        return;
      }

      void video.play().catch(() => {
        // The poster remains a complete fallback if autoplay is unavailable.
      });
    }

    syncPlayback();
    reducedMotion.addEventListener("change", syncPlayback);

    return () => reducedMotion.removeEventListener("change", syncPlayback);
  }, []);

  return (
    <video
      ref={videoRef}
      className="hero__video"
      poster={poster}
      muted
      loop
      playsInline
      preload="metadata"
      aria-hidden="true"
      tabIndex={-1}
    >
      <source src={src} type="video/mp4" />
    </video>
  );
}
