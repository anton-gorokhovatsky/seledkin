import { test } from "node:test";
import assert from "node:assert/strict";
import { publishedBase } from "../scripts/published-base.mjs";

test("a failed deployment cannot replace the last successfully published base", async () => {
  const sha = "a".repeat(40);
  const responses = [
    [{ id: 2, sha: "b".repeat(40) }, { id: 1, sha }],
    [{ state: "failure" }], [{ state: "success" }],
  ];
  assert.equal(await publishedBase("owner/repo", async () => responses.shift()), sha);
});

test("an unavailable or unsuccessful deployment lookup keeps the conservative unknown base", async () => {
  assert.equal(await publishedBase("owner/repo", async () => { throw new Error("Unavailable"); }), "");
  assert.equal(await publishedBase("owner/repo", async () => []), "");
});
