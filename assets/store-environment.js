import { storeStatus } from "./store-time.js?v=sea-hours-1";
import { seaLight } from "./sea-light.js?v=sea-hours-1";

const root = document.documentElement;
const statuses = [...document.querySelectorAll("[data-store-status]")];
let timer;

function update() {
  window.clearTimeout(timer);
  if (document.hidden) return;
  const now = new Date();
  const status = storeStatus(now);
  for (const node of statuses) {
    if (status && node.textContent !== status.label) node.textContent = status.label;
  }
  const light = seaLight(now);
  if (light) {
    root.dataset.seaLight = light.phase;
    root.style.setProperty("--sea-silver", light.silver);
    root.style.setProperty("--sea-warmth", light.warmth);
    root.style.setProperty("--sea-light-position", `${light.position}%`);
  }
  // One refresh per minute; opening and closing boundaries are handled precisely.
  // No live region: unchanged hours must not repeatedly interrupt screen readers.
  const nextMinute = 60_000 - now.getSeconds() * 1000 - now.getMilliseconds();
  timer = window.setTimeout(update, Math.min(nextMinute, status?.nextChange ?? nextMinute) + 50);
}

document.addEventListener("visibilitychange", update);
update();
