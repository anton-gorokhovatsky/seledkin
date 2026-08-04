"use client";

import { useEffect, useState } from "react";

const videoId = "AsD5u6k6dKI";
const videoSrc =
  `https://www.youtube-nocookie.com/embed/${videoId}` +
  `?autoplay=1&mute=1&controls=0&loop=1&playlist=${videoId}` +
  "&playsinline=1&rel=0&disablekb=1&fs=0&iv_load_policy=3";

export function HeroVideo() {
  const [canPlay, setCanPlay] = useState(false);

  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 761px)");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    function syncPlayback() {
      setCanPlay(desktop.matches && !reducedMotion.matches);
    }

    syncPlayback();
    desktop.addEventListener("change", syncPlayback);
    reducedMotion.addEventListener("change", syncPlayback);

    return () => {
      desktop.removeEventListener("change", syncPlayback);
      reducedMotion.removeEventListener("change", syncPlayback);
    };
  }, []);

  if (!canPlay) return null;

  return (
    <iframe
      className="tilda-hero__video"
      src={videoSrc}
      title="Фоновое видео с морем"
      aria-hidden="true"
      tabIndex={-1}
      allow="autoplay; encrypted-media"
      referrerPolicy="strict-origin-when-cross-origin"
    />
  );
}
