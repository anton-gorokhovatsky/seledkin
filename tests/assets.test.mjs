import { test } from "node:test";
import assert from "node:assert/strict";
import { versionAssets } from "../scripts/build-assets.mjs";

const publication = () => new Map([
  ["index.html", '<link href="assets/styles.css"><script src="assets/site.js"></script><iframe src="assets/store-map.html"></iframe>'],
  ["catalog/index.html", '<script src="../assets/order-list.js"></script><link href="../assets/styles.css">'],
  ["assets/styles.css", "body { color: navy; }"],
  ["assets/site.js", 'import "./order-list.js"; const map = "./store-map.html";'],
  ["assets/order-list.js", 'import { catalog } from "./catalog-data.js";'],
  ["assets/catalog-data.js", 'export const catalog = [{id: "roe", price: "6000 ₽"}];'],
  ["assets/store-map.html", '<script src="https://api.mapbox.com/mapbox-gl.js?v=external"></script><script src="./map.js"></script>'],
  ["assets/map.js", 'import "./catalog-data.js";'],
]);

test("publication versions include nested module dependencies and the map, preserve external URLs and are repeatable", () => {
  const result = versionAssets(publication());
  for (const path of ["index.html", "catalog/index.html", "assets/site.js", "assets/order-list.js", "assets/store-map.html", "assets/map.js"]) {
    assert.ok(result.files.get(path).includes(`?v=${result.version}`), path);
  }
  assert.ok(result.files.get("assets/order-list.js").includes(`catalog-data.js?v=${result.version}`));
  assert.ok(result.files.get("assets/store-map.html").includes('https://api.mapbox.com/mapbox-gl.js?v=external'));
  assert.deepEqual(versionAssets(result.files), result);
});

test("a price update invalidates the publication's module graph and entry URLs", () => {
  const files = publication(), before = versionAssets(files);
  files.set("assets/catalog-data.js", files.get("assets/catalog-data.js").replace("6000", "7000"));
  const after = versionAssets(files);
  assert.notEqual(before.version, after.version);
  for (const path of ["index.html", "catalog/index.html", "assets/site.js", "assets/order-list.js"]) {
    assert.notEqual(before.files.get(path), after.files.get(path), path);
  }
});
