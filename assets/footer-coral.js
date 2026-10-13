import { seaMotionState } from "./sea-motion.js";

// Accepted native Coral artwork, confined to the home footer. The existing
// sea control also pauses this background; no additional interface is needed.
const footer = document.querySelector(".source-footer");
const contrast = matchMedia("(prefers-contrast: more), (forced-colors: active)");

if (footer) {
  const layer = document.createElement("div");
  layer.className = "footer-coral-layer";
  layer.setAttribute("aria-hidden", "true");
  const field = document.createElement("div");
  field.className = "footer-coral-field";
  const video = document.createElement("video");
  video.className = "footer-coral-video";
  // Keep a rendered, silent source for WebKit's canvas-video playback policy.
  // CSS makes the one-pixel decoder surface transparent and non-interactive.
  video.setAttribute("aria-hidden", "true");
  video.muted = true;
  video.defaultMuted = true;
  video.loop = true;
  video.playsInline = true;
  video.preload = "none";
  video.tabIndex = -1;
  const canvas = document.createElement("canvas");
  canvas.className = "footer-coral-art";
  canvas.width = 1200;
  canvas.height = 2132;
  const upper = document.createElement("canvas");
  upper.className = "footer-coral-art footer-coral-art--upper";
  upper.width = 600;
  upper.height = 1066;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  const upperContext = upper.getContext("2d");

  if (context && upperContext) {
    field.append(video, canvas, upper);
    layer.append(field);
    footer.prepend(layer);
    let visible = false, paintFrame = 0, lastVideoFrame = -1;
    let posterStarted = false, posterReady = false, failed = false;
    const poster = new Image();
    const posterURL = new URL("./footer-coral-poster.webp", import.meta.url).href;
    const videoURL = new URL("./footer-coral.mp4", import.meta.url).href;

    function paintUpper() {
      upperContext.clearRect(0, 0, upper.width, upper.height);
      upperContext.drawImage(canvas, 0, 0, upper.width, upper.height);
    }
    function paintPoster() {
      if (!posterReady) return;
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.drawImage(poster, 0, 0);
      paintUpper();
      lastVideoFrame = -1;
      footer.dataset.coral = "";
    }
    function paintVideo() {
      if (video.readyState < 2) return;
      const frame = Math.floor(video.currentTime * 12);
      if (lastVideoFrame === frame) return;
      lastVideoFrame = frame;
      context.drawImage(video, 0, 0);
      const framePixels = context.getImageData(0, 0, canvas.width, canvas.height);
      const pixels = framePixels.data;
      // Native ink colours survive; only the black export matte is removed.
      for (let i = 0; i < pixels.length; i += 4) {
        const level = Math.max(pixels[i], pixels[i + 1], pixels[i + 2]);
        pixels[i + 3] = Math.round(Math.min(1, Math.max(0, (level - 20) / 44)) * 255);
      }
      context.putImageData(framePixels, 0, 0);
      paintUpper();
      footer.dataset.coral = "";
    }
    function stopPaint() {
      cancelAnimationFrame(paintFrame);
      paintFrame = 0;
    }
    function render() {
      paintFrame = 0;
      paintVideo();
      if (!video.paused && visible && !document.hidden) paintFrame = requestAnimationFrame(render);
    }
    function sync() {
      const motion = seaMotionState();
      const allowed = visible && motion.allowed && !motion.menuOpen && !contrast.matches && !failed;
      if (!allowed) {
        video.pause();
        stopPaint();
        if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
          video.removeAttribute("src");
          video.load();
          paintPoster();
        }
        return;
      }
      if (!video.hasAttribute("src")) video.src = videoURL;
      video.play().then(() => {
        if (!paintFrame && visible && seaMotionState().allowed && !seaMotionState().menuOpen) {
          paintFrame = requestAnimationFrame(render);
        }
      }).catch(() => {});
    }
    function approach() {
      if (posterStarted || contrast.matches) return;
      posterStarted = true;
      poster.src = posterURL;
      poster.decode().then(() => {
        posterReady = true;
        if (video.paused || video.readyState < 2) paintPoster();
      }).catch(() => {}); // The original footer artwork remains as fallback.
    }
    video.addEventListener("error", () => {
      failed = true;
      stopPaint();
      paintPoster();
    });
    document.addEventListener("seledkin:seamotionchange", sync);
    document.addEventListener("visibilitychange", sync);
    contrast.addEventListener("change", () => { if (visible) approach(); sync(); });
    if ("IntersectionObserver" in window) {
      const near = new IntersectionObserver(([entry]) => {
        if (entry.isIntersecting) { approach(); near.disconnect(); }
      }, { rootMargin: "400px" });
      near.observe(layer);
      new IntersectionObserver(([entry]) => {
        visible = entry.isIntersecting;
        if (visible) approach();
        sync();
      }).observe(layer);
    } else {
      visible = true;
      approach();
      sync();
    }
  }
}
