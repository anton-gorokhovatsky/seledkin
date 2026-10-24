import { mapAccessToken, mapStyles, storeLocation, nearestMetroLocation, universityMetroLocation } from "./store-map-config.js";
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
let ready = false;
let userView = false;
const labels = [];

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

function prepareMapControls() {
  map.touchZoomRotate.disableRotation();
  map.getCanvas().tabIndex = 0;
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

function neighborhoodPadding() {
  const shop = labels[0], metro = labels[1];
  const raised = metro.element.offsetWidth - metro.icon.offsetWidth / 2 + 12 > 140;
  root.classList.toggle("map-labels-raised", raised);
  const extents = labels.map(label => {
    const box = label.element.getBoundingClientRect(), icon = label.icon.getBoundingClientRect();
    const left = icon.left + icon.width / 2 - box.left;
    const top = icon.top + icon.height / 2 - box.top;
    label.marker.setOffset([-left, box.height / 2 - top]);
    return { left, top, right: box.width - left, bottom: box.height - top };
  });
  if (!raised) return { top: 44, right: 140, bottom: 60, left: 28 };
  // Large labels face into the space between the shop and the metro exit.
  return {
    top: Math.max(44, Math.ceil(extents[0].top + 12)),
    right: Math.max(28, Math.ceil(extents[1].right + 12)),
    bottom: Math.max(60, Math.ceil(extents[1].bottom + 12)),
    left: Math.max(28, Math.ceil(extents[0].left + 12)),
  };
}

function fitNeighborhood(padding = neighborhoodPadding()) {
  // Start with the shop and the nearest metro exit; leave room for their labels.
  map.fitBounds([
    [storeLocation[0], nearestMetroLocation[1]],
    [nearestMetroLocation[0], storeLocation[1]],
  ], {
    padding,
    maxZoom: 15, duration: 0,
  });
}

async function initialize() {
  const theme = syncTheme();
  if (!window.mapboxgl?.supported()) return showUnavailable();
  try {
    const style = await getStyle(theme);
    map = new window.mapboxgl.Map({
      container, accessToken: mapAccessToken, style, center: storeLocation, zoom: 15,
      minZoom: 12, maxZoom: 19, interactive: true, scrollZoom: false, cooperativeGestures: true,
      dragRotate: false, pitchWithRotate: false, touchPitch: false,
      attributionControl: false, fadeDuration: 0, projection: "mercator",
      locale: {
        "Map.Title": "Карта лавки на улице Строителей",
        "NavigationControl.ZoomIn": "Приблизить карту",
        "NavigationControl.ZoomOut": "Отдалить карту",
        "AttributionControl.ToggleAttribution": "Источники картографических данных",
        "TouchPanBlocker.Message": "Чтобы переместить карту, используйте два пальца",
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
    const portrait = document.createElement("img");
    portrait.src = "apple-touch-icon.png";
    portrait.alt = "";
    portrait.width = 32;
    portrait.height = 32;
    const label = document.createElement("span");
    label.textContent = "Рыбная лавка капитана Селёдкина";
    marker.append(portrait, label);
    // The centre of Losos marks the same verified shop coordinates.
    const shopMarker = new window.mapboxgl.Marker({ element: marker, anchor: "left", offset: [-16, 0] })
      .setLngLat(storeLocation).addTo(map);
    labels.push({ element: marker, icon: portrait, marker: shopMarker });
    for (const [name, exit, location] of [
      ["Вавиловская", 3, nearestMetroLocation],
      ["Университет", 2, universityMetroLocation],
    ]) {
      const metro = document.createElement("div");
      metro.className = "store-map-metro";
      metro.setAttribute("aria-hidden", "true");
      const metroLogo = document.createElement("img");
      metroLogo.src = "moscow-metro.svg";
      metroLogo.alt = "";
      metroLogo.width = 20;
      metroLogo.height = 16;
      const metroLabel = document.createElement("span");
      metroLabel.textContent = name;
      const metroExit = document.createElement("small");
      metroExit.textContent = `выход № ${exit}`;
      metroLabel.append(metroExit);
      metro.append(metroLogo, metroLabel);
      // The centre of the M, rather than the label, marks the entrance.
      const metroMarker = new window.mapboxgl.Marker({ element: metro, anchor: "left", offset: [-10, 0] })
        .setLngLat(location).addTo(map);
      labels.push({ element: metro, icon: metroLogo, marker: metroMarker });
    }
    fitNeighborhood();
    prepareMapControls();
    map.on("load", () => {
      ready = true;
      status.hidden = true;
      root.dataset.mapState = "ready";
      notify("seledkin:map-ready");
      prepareMapControls();
      if (root.dataset.theme !== sourceRoot.dataset.theme) updateTheme();
    });
    map.on("style.load", prepareMapControls);
    map.on("error", () => { if (!ready) showUnavailable(); });
    map.on("movestart", event => {
      if (event.originalEvent && event.originalEvent.type !== "resize") userView = true;
    });
    const observer = new ResizeObserver(() => {
      const padding = neighborhoodPadding();
      map.resize();
      if (!userView) fitNeighborhood(padding);
    });
    observer.observe(container);
    for (const { element } of labels) observer.observe(element);
    window.addEventListener("pagehide", () => observer.disconnect(), { once: true });
    sourceDocument.addEventListener("seledkin:themechange", updateTheme);
  } catch { showUnavailable(); }
}

document.addEventListener("keydown", event => {
  if (event.key !== "Escape") return;
  event.preventDefault();
  notify("seledkin:map-escape");
});

const timeout = setTimeout(() => { if (!ready) showUnavailable(); }, 15000);
window.addEventListener("pagehide", () => { clearTimeout(timeout); map?.remove(); }, { once: true });
if (document.readyState === "complete" || window.mapboxgl) initialize();
else window.addEventListener("load", initialize, { once: true });
