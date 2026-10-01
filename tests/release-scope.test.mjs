import { test } from "node:test";
import assert from "node:assert/strict";
import { classifyRelease, readReleaseChanges } from "../scripts/release-scope.mjs";

const before = '<footer><a class="credit" href="https://example.com/">Дизайн и разработка</a></footer>';
const after = before.replace("https://example.com/", "https://gorokhovatsky.tech/?point=ks-fish");
const page = (path = "index.html", content = after) => ({ path, before, after: content });

test("a shared link destination uses the short gate even when generated on every page", () => {
  assert.equal(classifyRelease([
    page(), page("catalog/index.html"), page("journal/698/index.html"),
    page("templates/footer.html"), { path: "tests/site.test.mjs" },
  ]), "links");
});

test("visible text, semantics, layout and resource links still require browsers", () => {
  for (const content of [after.replace("Дизайн", "Автор"), after.replace("credit", "other"),
    after.replace("<a ", '<a target="_blank" '), after + "<p>Ещё текст</p>",
    after.replace("https://gorokhovatsky.tech/?point=ks-fish", "javascript:alert(1)")]) {
    assert.equal(classifyRelease([page("index.html", content)]), "full");
  }
  assert.equal(classifyRelease([{ path: "index.html", before: '<link href="a.css">', after: '<link href="b.css">' }]), "full");
  assert.equal(classifyRelease([{ path: "index.html", before: `<script>const link = '${before}'</script>`, after: `<script>const link = '${after}'</script>` }]), "full");
});

test("runtime, media, routing, added pages and unknown files retain the full gate", () => {
  for (const path of ["assets/styles.css", "assets/site.js", "assets/fish.webp", "CNAME", "sitemap.xml", "unknown.txt"]) {
    assert.equal(classifyRelease([page(), { path }]), "full", path);
  }
  for (const change of [{ path: "journal/new/index.html", after }, { path: "about/index.html", before }]) {
    assert.equal(classifyRelease([change]), "full");
  }
});

test("tooling and documentation do not republish an unchanged site", () => {
  assert.equal(classifyRelease(["AGENTS.md", "ACCESSIBILITY.md", "README.md", ".github/workflows/pages.yml",
    "scripts/release-scope.mjs", "tests/release-scope.test.mjs"].map(path => ({ path }))), "none");
});

test("missing or unavailable comparison bases cannot skip the full gate", () => {
  for (const base of [undefined, "", "0".repeat(40), "f".repeat(40)]) {
    assert.equal(classifyRelease(readReleaseChanges(base)), "full");
  }
});
