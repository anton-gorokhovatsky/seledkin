import { cpSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { legacyRoutes } from "./legacy-routes.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const destination = resolve(process.argv[2] ?? "_site");
for (const { path } of legacyRoutes) {
  cpSync(resolve(root, path), resolve(destination, path), { recursive: true });
}
