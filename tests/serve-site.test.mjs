import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { createSiteServer } from "../scripts/serve-site.mjs";

test("the static server handles parallel assets, directories, HEAD and media ranges", async () => {
  const server = await createSiteServer(".");
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const origin = `http://127.0.0.1:${server.address().port}`;
  try {
    const responses = await Promise.all(Array.from({ length: 24 }, () => fetch(`${origin}/assets/styles.css`)));
    for (const response of responses) {
      assert.equal(response.status, 200);
      assert.match(response.headers.get("content-type"), /text\/css/);
      assert.ok((await response.text()).includes("source-footer"));
    }
    const redirect = await fetch(`${origin}/catalog?q=рыба`, { redirect: "manual" });
    assert.equal(redirect.status, 301);
    assert.equal(redirect.headers.get("location"), "/catalog/?q=%D1%80%D1%8B%D0%B1%D0%B0");
    const head = await fetch(`${origin}/assets/hero-sea.mp4`, { method: "HEAD" });
    assert.equal(head.status, 200);
    assert.equal((await head.arrayBuffer()).byteLength, 0);
    const range = await fetch(`${origin}/assets/hero-sea.mp4`, { headers: { Range: "bytes=0-99" } });
    assert.equal(range.status, 206);
    assert.equal((await range.arrayBuffer()).byteLength, 100);
    assert.match(range.headers.get("content-range"), /^bytes 0-99\//);
    assert.equal((await fetch(`${origin}/assets/hero-sea.mp4`, { headers: { Range: "bytes=999999999-" } })).status, 416);
    assert.equal((await fetch(`${origin}/missing.html`)).status, 404);
    assert.equal((await fetch(`${origin}/%2e%2e%2fpackage.json`)).status, 403);
  } finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
});
