import { mapAccessToken, mapStyles, storeLocation, nearestMetroLocation } from "./store-map-config.js";
import { styleStoreMap } from "./store-map-style.js";

const root = document.documentElement;
const container = document.querySelector("#store-map");
const status = document.querySelector("[data-map-status]");
const embedded = window.parent !== window;
const sourceDocument = embedded ? window.parent.document : document;
const sourceRoot = sourceDocument.documentElement;
const styleCache = new Map();
let map;
let revision = 0;
let interactive = false;
let ready = false;

function notify(type) {
  if (embedded) window.parent.postMessage({ type }, location.origin);
}

function showUnavailable() {
  status.hidden = false;
  status.textContent = "Карта недоступна. Откройте маршрут кнопкой «Открыть в Яндекс Картах» над картой.";
  root.dataset.mapState = "unavailable";
  notify("seledkin:map-unavailable");
}

function colors() {
  const css = getComputedStyle(root);
  const token = name => css.getPropertyValue(name).trim();
  return {
    land: token("--map-fallback"), building: token("--map-building"),
    park: token("--map-park"), water: token("--map-water"), label: token("--map-label"),
  };
}

function syncTheme() {
  const theme = sourceRoot.dataset.theme === "dark" ? "dark" : "light";
  root.dataset.theme = theme;
  return theme;
}

async function getStyle(theme) {
  if (!styleCache.has(theme)) {
    const path = mapStyles[theme].replace("mapbox://styles/", "");
    const response = await fetch(`https://api.mapbox.com/styles/v1/${path}?access_token=${mapAccessToken}`);
    if (!response.ok) throw new Error("Map style unavailable");
    styleCache.set(theme, await response.json());
  }
  return styleStoreMap(styleCache.get(theme), colors());
}

function setInteractive(enabled) {
  interactive = enabled;
  if (!map) return;
  for (const handler of [map.dragPan, map.doubleClickZoom, map.boxZoom, map.keyboard, map.touchZoomRotate]) {
    handler[enabled ? "enable" : "disable"]();
  }
  map.touchZoomRotate.disableRotation();
  map.getCanvas().tabIndex = enabled ? 0 : -1;
  for (const control of container.querySelectorAll("button, a")) {
    control.tabIndex = enabled ? 0 : -1;
  }
  if (!enabled) fitNeighborhood();
}

async function updateTheme() {
  const current = ++revision;
  const theme = syncTheme();
  try {
    const style = await getStyle(theme);
    if (current !== revision || !map) return;
    map.setStyle(style, { diff: false });
  } catch { if (current === revision) showUnavailable(); }
}

function fitNeighborhood() {
  // Keep the shop and the nearest metro in view, including on a narrow screen.
  map.fitBounds([[37.5355, 55.68355], [37.5417, 55.68615]], {
    padding: { top: 78, right: 64, bottom: 60, left: 36 },
    maxZoom: 16.25, duration: 0,
  });
}

async function initialize() {
  const theme = syncTheme();
  if (!window.mapboxgl?.supported()) return showUnavailable();
  try {
    const style = await getStyle(theme);
    map = new window.mapboxgl.Map({
      container, accessToken: mapAccessToken, style, center: storeLocation, zoom: 15.5,
      minZoom: 12, maxZoom: 19, interactive: true, scrollZoom: false,
      dragRotate: false, pitchWithRotate: false, touchPitch: false,
      attributionControl: false, fadeDuration: 0, projection: "mercator",
      locale: {
        "Map.Title": "Карта лавки на улице Строителей",
        "NavigationControl.ZoomIn": "Приблизить карту",
        "NavigationControl.ZoomOut": "Отдалить карту",
        "AttributionControl.ToggleAttribution": "Источники картографических данных",
      },
    });
    map.addControl(new window.mapboxgl.NavigationControl({ showCompass: false }), "top-right");
    map.addControl(new window.mapboxgl.AttributionControl({ compact: true }), "bottom-right");
    // Visible symbols remain readable in both themes without filtered bitmap icons.
    container.querySelector(".mapboxgl-ctrl-zoom-in").textContent = "+";
    container.querySelector(".mapboxgl-ctrl-zoom-out").textContent = "−";
    container.querySelector(".mapboxgl-ctrl-attrib-button").textContent = "i";
    const marker = document.createElement("div");
    marker.className = "store-map-marker";
    marker.setAttribute("aria-hidden", "true");
    const label = document.createElement("span");
    label.textContent = "Рыбная лавка";
    marker.append(label);
    // Anchor the centre of the shop's ring to its actual coordinates.
    new window.mapboxgl.Marker({ element: marker, anchor: "left", offset: [-6, 0] })
      .setLngLat(storeLocation).addTo(map);
    const metro = document.createElement("div");
    metro.className = "store-map-metro";
    metro.setAttribute("aria-hidden", "true");
    const metroLogo = document.createElement("img");
    metroLogo.src = "moscow-metro.svg";
    metroLogo.alt = "";
    metroLogo.width = 20;
    metroLogo.height = 16;
    metro.append(metroLogo, "Вавиловская");
    new window.mapboxgl.Marker({ element: metro, anchor: "top", offset: [0, 8] })
      .setLngLat(nearestMetroLocation).addTo(map);
    fitNeighborhood();
    setInteractive(interactive);
    map.on("load", () => {
      ready = true;
      status.hidden = true;
      root.dataset.mapState = "ready";
      notify("seledkin:map-ready");
      setInteractive(interactive);
      if (root.dataset.theme !== sourceRoot.dataset.theme) updateTheme();
    });
    map.on("style.load", () => setInteractive(interactive));
    map.on("error", () => { if (!ready) showUnavailable(); });
    new ResizeObserver(() => { map.resize(); if (!interactive) fitNeighborhood(); }).observe(container);
    sourceDocument.addEventListener("seledkin:themechange", updateTheme);
  } catch { showUnavailable(); }
}

window.addEventListener("message", event => {
  if (event.origin !== location.origin || event.source !== window.parent) return;
  if (event.data?.type === "seledkin:map-interaction") setInteractive(event.data.enabled === true);
});

document.addEventListener("keydown", event => {
  if (event.key !== "Escape" || !interactive) return;
  event.preventDefault();
  notify("seledkin:map-escape");
});

const timeout = setTimeout(() => { if (!ready) showUnavailable(); }, 15000);
window.addEventListener("pagehide", () => { clearTimeout(timeout); map?.remove(); }, { once: true });
if (document.readyState === "complete" || window.mapboxgl) initialize();
else window.addEventListener("load", initialize, { once: true });
