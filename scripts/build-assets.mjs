import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { resolve, relative } from "node:path";
import { pathToFileURL } from "node:url";

// Version the finished publication, including module dependencies and the map
// document. One content hash keeps a release coherent without manual URL edits.
export function versionAssets(files) {
  const assets = new Set([...files.keys()].filter(path => /\.(?:js|css)$/.test(path) || path === "assets/store-map.html"));
  const references = /(["'`])([^"'`\s<>]+\.(?:js|css|html)(?:\?[^"'`\s<>]*)?(?:#[^"'`\s<>]*)?)\1/g;
  function rewrite(source, path, version) {
    return source.replace(references, (match, quote, value) => {
      if (/^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(value) || value.includes("${")) return match;
      const url = new URL(value.replaceAll("&amp;", "&"), `https://publication.invalid/${path}`);
      if (!assets.has(decodeURIComponent(url.pathname.slice(1)))) return match;
      url.searchParams.delete("v");
      if (version) url.searchParams.set("v", version);
      let query = url.searchParams.toString();
      if (path.endsWith(".html")) query = query.replaceAll("&", "&amp;");
      return `${quote}${value.split(/[?#]/)[0]}${query ? `?${query}` : ""}${url.hash}${quote}`;
    });
  }
  const hash = createHash("sha256").update(readFileSync(new URL(import.meta.url))).update("\0");
  for (const path of [...assets].sort()) hash.update(`${path}\0${rewrite(files.get(path), path)}\0`);
  const version = hash.digest("hex").slice(0, 16);
  return { version, files: new Map([...files].map(([path, source]) => [path, rewrite(source, path, version)])) };
}

export function buildAssets(destination) {
  const root = resolve(destination), files = new Map();
  function read(directory) {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = resolve(directory, entry.name);
      if (entry.isDirectory()) read(path);
      else if (/\.(?:html|js|css)$/.test(entry.name)) files.set(relative(root, path), readFileSync(path, "utf8"));
    }
  }
  read(root);
  const result = versionAssets(files);
  for (const [path, source] of result.files) if (source !== files.get(path)) writeFileSync(resolve(root, path), source);
  return result.version;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  if (!process.argv[2]) throw new Error("Pass the assembled publication directory");
  process.stdout.write(`Publication assets: ${buildAssets(process.argv[2])}\n`);
}
