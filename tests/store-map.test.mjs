import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { styleStoreMap } from "../assets/store-map-style.js";
import { storeLocation, nearestMetroLocation, universityMetroLocation, mapStyles, mapAccessToken } from "../assets/store-map-config.js";

test("map styling retains geographic sources and uses Russian labels in both watches", () => {
  const source = { version: 8, sources: { composite: { url: "mapbox://mapbox.mapbox-streets-v8" } }, layers: [
    { id: "land", type: "background" },
    { id: "building", type: "fill", "source-layer": "building" },
    { id: "poi-label", type: "symbol", layout: { "text-field": ["get", "name_en"] } },
    { id: "road-label-simple", type: "symbol", layout: { "text-field": ["get", "name_en"] } },
  ] };
  const before = structuredClone(source);
  for (const land of ["#f1f0ec", "#132a38"]) {
    const result = styleStoreMap(source, { land, building: "#263f4d", park: "#193a40", water: "#0b202e", label: "#d9e3e5" });
    assert.deepEqual(result.sources, before.sources);
    assert.equal(result.layers[0].paint["background-color"], land);
    assert.deepEqual(result.layers[3].layout["text-field"], ["coalesce", ["get", "name_ru"], ["get", "name"]]);
    assert.deepEqual(result.layers[2].filter, ["match", ["get", "maki"], ["rail-metro", "rail", "rail-light"], true, false]);
  }
  assert.deepEqual(source, before);
});

test("the public map keeps the verified shop and metro locations and visible attribution", () => {
  assert.deepEqual(storeLocation, [37.536554, 55.685849]);
  assert.deepEqual(nearestMetroLocation, [37.5393527, 55.6843472]);
  assert.deepEqual(universityMetroLocation, [37.5351394, 55.6917002]);
  assert.ok(mapAccessToken === "" || mapAccessToken.startsWith("pk."));
  assert.equal(mapStyles.dark, "mapbox://styles/mapbox/dark-v11");
  const js = readFileSync(new URL("../assets/store-map.js", import.meta.url), "utf8");
  assert.match(js, /new window\.mapboxgl\.AttributionControl/);
  assert.match(js, /scrollZoom: false/);
  assert.match(js, /cooperativeGestures: true/);
  assert.match(js, /seledkin:themechange/);
  const parentJs = readFileSync(new URL("../assets/site.js", import.meta.url), "utf8");
  assert.match(parentJs, /event\.origin !== location\.origin \|\| event\.source !== mapFrame\.contentWindow/);
});
