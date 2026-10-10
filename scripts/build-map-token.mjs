import { existsSync, readFileSync, writeFileSync } from "node:fs";

const output = new URL("../assets/store-map-token.js", import.meta.url);
const token = process.env.MAPBOX_PUBLIC_TOKEN;
if (token !== undefined && token !== "") {
  if (!/^pk\.[A-Za-z0-9_.-]+$/.test(token)) {
    throw new Error("MAPBOX_PUBLIC_TOKEN must be a public browser token beginning with pk.");
  }
  writeFileSync(output, `export const mapAccessToken = ${JSON.stringify(token)};\n`);
} else if (!existsSync(output)) {
  writeFileSync(output, 'export const mapAccessToken = "";\n');
}
if (process.argv.includes("--require-token") && !readFileSync(output, "utf8").includes('"pk.')) {
  throw new Error("Set MAPBOX_PUBLIC_TOKEN in GitHub Actions secrets before publishing.");
}
