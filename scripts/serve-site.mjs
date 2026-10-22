import { createServer } from "node:http";
import { createReadStream } from "node:fs";
import { realpath, stat } from "node:fs/promises";
import { resolve, extname, sep, join } from "node:path";
import { pathToFileURL } from "node:url";

const types = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8", ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
  ".webp": "image/webp", ".gif": "image/gif", ".ico": "image/x-icon", ".mp4": "video/mp4",
  ".webm": "video/webm", ".woff": "font/woff", ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8", ".xml": "application/xml; charset=utf-8" };

export const offlineMapPolicy = "default-src 'self' data:; script-src 'self'; connect-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:";

export async function createSiteServer(directory, { liveMaps = false } = {}) {
  const root = await realpath(resolve(directory));
  const inside = path => path === root || path.startsWith(root + sep);
  return createServer(async (request, response) => {
    if (!["GET", "HEAD"].includes(request.method)) { response.writeHead(405, { Allow: "GET, HEAD" }).end(); return; }
    try {
      const url = new URL(request.url, "http://localhost");
      let file = resolve(root, "." + decodeURIComponent(url.pathname));
      if (!inside(file)) { response.writeHead(403).end(); return; }
      file = await realpath(file);
      if (!inside(file)) { response.writeHead(403).end(); return; }
      let info = await stat(file);
      if (info.isDirectory()) {
        if (!url.pathname.endsWith("/")) { response.writeHead(301, { Location: url.pathname + "/" + url.search }).end(); return; }
        file = await realpath(join(file, "index.html"));
        if (!inside(file)) { response.writeHead(403).end(); return; }
        info = await stat(file);
      }
      if (!info.isFile()) { response.writeHead(404).end(); return; }
      const headers = { "Content-Type": types[extname(file)] ?? "application/octet-stream",
        "Cache-Control": "no-cache", "Accept-Ranges": "bytes" };
      // Local previews and every browser context stay off the billable vendor.
      // The real unavailable-map fallback still runs; interaction tests use their
      // existing local fixture. A single live review requires an explicit flag.
      if (!liveMaps && file === resolve(root, "assets/store-map.html")) {
        headers["Content-Security-Policy"] = offlineMapPolicy;
      }
      let start = 0, end = info.size - 1, status = 200;
      if (request.headers.range) {
        const match = /^bytes=(\d*)-(\d*)$/.exec(request.headers.range);
        if (!match || (!match[1] && !match[2])) { response.writeHead(416, { "Content-Range": `bytes */${info.size}` }).end(); return; }
        start = match[1] ? Number(match[1]) : Math.max(0, info.size - Number(match[2]));
        end = match[1] && match[2] ? Math.min(Number(match[2]), end) : end;
        if (!Number.isSafeInteger(start) || start > end || start >= info.size) {
          response.writeHead(416, { "Content-Range": `bytes */${info.size}` }).end(); return;
        }
        status = 206;
        headers["Content-Range"] = `bytes ${start}-${end}/${info.size}`;
      }
      headers["Content-Length"] = String(Math.max(0, end - start + 1));
      response.writeHead(status, headers);
      if (request.method === "HEAD" || !info.size) { response.end(); return; }
      const stream = createReadStream(file, { start, end });
      stream.on("error", () => response.destroy());
      response.on("close", () => stream.destroy());
      stream.pipe(response);
    } catch (error) { response.writeHead(error.code === "ENOENT" || error.code === "ENOTDIR" ? 404 : 400).end(); }
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const argument = (name, fallback) => process.argv.includes(name) ? process.argv[process.argv.indexOf(name) + 1] : fallback;
  const port = Number(argument("--port", "4173"));
  const server = await createSiteServer(argument("--directory", "."), { liveMaps: process.argv.includes("--live-map") });
  server.listen(port, "127.0.0.1", () => process.stdout.write(`Static site: http://127.0.0.1:${port}/\n`));
}
