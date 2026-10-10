import { cpSync, mkdirSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { buildAssets } from "./build-assets.mjs";

// One finished directory is both the browser test target and the Pages artifact.
const source = fileURLToPath(new URL("../", import.meta.url));
const destination = fileURLToPath(new URL("../_site/", import.meta.url));
rmSync(destination, { recursive: true, force: true });
mkdirSync(destination, { recursive: true });
for (const path of ["index.html", "404.html", "robots.txt", "sitemap.xml", "CNAME", ".nojekyll",
  "yandex_a89bf574e33f8d22.html", "assets", "catalog", "journal", "about", "recipes"]) {
  cpSync(`${source}${path}`, `${destination}${path}`, { recursive: true });
}
execFileSync(process.execPath, [fileURLToPath(new URL("./package-legacy.mjs", import.meta.url)), destination]);
process.stdout.write(`Publication assets: ${buildAssets(destination)}\n`);
