import { readFile, writeFile } from "node:fs/promises";
import { basename } from "node:path";
import { fileURLToPath } from "node:url";

// Publish only the DOM driver and its core chunks, without a CDN or framework.
const root = new URL("../", import.meta.url);
const entry = new URL(import.meta.resolve("morphicons/dom"));
const packageRoot = new URL("../", entry);
const { version } = JSON.parse(await readFile(new URL("package.json", packageRoot)));
const check = process.argv.includes("--check");
const visited = new Set();

async function emit(name, content) {
  const target = new URL(`assets/${name}`, root);
  if (check) {
    if (await readFile(target, "utf8") !== content) {
      throw new Error(`${name} differs from morphicons@${version}; run pnpm build:icons`);
    }
  } else {
    await writeFile(target, content);
  }
  console.log(`${check ? "Verified" : "Generated"} ${name}`);
}

async function copyModule(url) {
  const name = basename(fileURLToPath(url));
  if (visited.has(name)) return;
  visited.add(name);
  const source = await readFile(url, "utf8");
  const imports = [...source.matchAll(/from "(\.\/[\w-]+\.js)"/g)];
  for (const [, relative] of imports) await copyModule(new URL(relative, url));
  const rewritten = source.replace(/from "\.\/([\w-]+\.js)"/g, 'from "./morphicons-$1"');
  await emit(`morphicons-${name}`, `// morphicons@${version}; MIT. See morphicons.LICENSE.txt.\n${rewritten}`);
}

await copyModule(entry);
await emit("morphicons.LICENSE.txt", await readFile(new URL("LICENSE", packageRoot), "utf8"));
