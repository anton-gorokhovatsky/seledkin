const heroVideo = document.querySelector("[data-hero-video]");
const menuVideo = document.querySelector("[data-menu-sea-video]");
const menu = document.querySelector("[data-menu]");
const toggles = [...document.querySelectorAll("[data-sea-toggle]")];
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
const mobileAfisha = document.querySelector(".afisha") ? matchMedia("(max-width: 61.1875rem)") : null;
const connection = navigator.connection;
// Explicit consent is scoped to this page. A new visit honours the current data preference again.
let requestedPlayback = false;
const conserveData = () => Boolean(connection?.saveData)
  || ["slow-2g", "2g"].includes(connection?.effectiveType);
let wasConserving = conserveData();
const dataBlocked = () => conserveData() && !requestedPlayback;
let paused = false;
try { paused = localStorage.getItem("seledkin-sea-paused") === "true"; } catch {}
let heroVisible = false;
let readyToPlay = false;

function updateControls() {
  for (const button of toggles) {
    button.hidden = reducedMotion.matches;
    const stopped = paused || dataBlocked();
    button.textContent = stopped ? "Включить море" : "Остановить море";
    button.setAttribute("aria-label", stopped ? "Включить движение моря" : "Остановить движение моря");
  }
}

function selectSource(video) {
  const source = video.querySelector("[data-theme-video-source]");
  const nextSource = document.documentElement.dataset.theme === "dark"
    ? source?.dataset.srcDark : source?.dataset.srcLight;
  if (source && nextSource && source.getAttribute("src") !== nextSource) {
    source.setAttribute("src", nextSource);
    video.classList.remove("is-ready");
    video.load();
  }
}

function sync(video, visible) {
  if (!(video instanceof HTMLVideoElement)) return;
  if (dataBlocked()) {
    video.pause();
    const source = video.querySelector("[data-theme-video-source]");
    if (source?.hasAttribute("src")) {
      source.removeAttribute("src");
      video.load();
    }
    video.classList.remove("is-ready");
    return;
  }
  if (paused || reducedMotion.matches || document.hidden || !visible) {
    video.pause();
    if (reducedMotion.matches) {
      if (video.readyState > 0) video.currentTime = 0;
      video.classList.remove("is-ready");
    }
    return;
  }
  selectSource(video);
  video.play().catch(() => {});
}

export function syncHeroVideo() {
  sync(heroVideo, readyToPlay && heroVisible && !mobileAfisha?.matches && (!menu || menu.hidden));
}
export function syncMenuSeaVideo() {
  sync(menuVideo, Boolean(menu && !menu.hidden));
  syncHeroVideo();
}
function syncAll() {
  updateControls();
  syncHeroVideo();
  syncMenuSeaVideo();
}

for (const button of toggles) button.addEventListener("click", () => {
  if (reducedMotion.matches) return;
  if (dataBlocked()) {
    requestedPlayback = true;
    paused = false;
  } else paused = !paused;
  try { localStorage.setItem("seledkin-sea-paused", String(paused)); } catch {}
  syncAll();
});
for (const video of [heroVideo, menuVideo]) {
  video?.addEventListener("loadeddata", () => {
    if (!dataBlocked() && !reducedMotion.matches) video.classList.add("is-ready");
  });
}
if (heroVideo instanceof HTMLVideoElement) {
  const section = heroVideo.closest(".source-hero");
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(([entry]) => {
      heroVisible = entry.isIntersecting;
      syncHeroVideo();
    }).observe(section);
  } else {
    heroVisible = true;
  }
  // First deliver the poster and visible shop/product imagery; then start the sea.
  const poster = new Image();
  poster.fetchPriority = "high";
  poster.src = document.documentElement.dataset.theme === "dark"
    ? heroVideo.dataset.posterDark : heroVideo.dataset.posterLight;
  const criticalImages = [poster, ...document.querySelectorAll('.source-hero img[fetchpriority="high"]')];
  Promise.allSettled(criticalImages.map(image => image.decode())).then(() => {
    requestAnimationFrame(() => requestAnimationFrame(() => {
      readyToPlay = true;
      syncHeroVideo();
    }));
  });
}
reducedMotion.addEventListener("change", syncAll);
mobileAfisha?.addEventListener("change", syncAll);
document.addEventListener("visibilitychange", syncAll);
document.addEventListener("seledkin:themechange", () => {
  // Keep already loaded paused media in the selected watch, without loading dormant media.
  if (!dataBlocked() && !reducedMotion.matches) {
    for (const video of [heroVideo, menuVideo]) {
      if (video?.querySelector("[data-theme-video-source]")?.hasAttribute("src")) selectSource(video);
    }
  }
  syncAll();
});
connection?.addEventListener?.("change", () => {
  const nextConserving = conserveData();
  if (nextConserving && !wasConserving) requestedPlayback = false;
  wasConserving = nextConserving;
  syncAll();
});
window.addEventListener("storage", event => {
  if (event.key === "seledkin-sea-paused") {
    paused = event.newValue === "true";
    syncAll();
  }
});
syncAll();
