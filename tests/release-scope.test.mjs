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

const region = (name, text) => `<!-- shared:${name}:start -->${text}<!-- shared:${name}:end -->`;
const journalUpdate = () => [
  { path: "content/journal/700.html", after: "<p>Новая авторская запись</p>" },
  { path: "content/journal.json", before: "[]", after: '[{"id":700}]' },
  { path: "journal/700/index.html", after: "<h1>Новая запись</h1>" },
  { path: "assets/journal-700.jpg" },
  { path: "assets/journal-700-480.webp" },
  { path: "assets/media-variants.json", before: '[{"file":"hero.mp4"}]', after: '[{"file":"hero.mp4"},{"file":"journal-700-480.webp"}]' },
  ...Object.entries({ "index.html": ["journal-hero", "journal-preview"], "catalog/index.html": ["journal-search"], "journal/index.html": ["journal-archive"] })
    .map(([path, names]) => ({ path, before: `<main>${names.map(name => region(name, "old")).join("")}</main>`, after: `<main>${names.map(name => region(name, "new")).join("")}</main>` })),
  { path: "sitemap.xml", before: '<urlset><url><loc>https://ks.fish/</loc></url></urlset>', after: '<urlset><url><loc>https://ks.fish/</loc></url><url><loc>https://ks.fish/journal/700/</loc></url></urlset>' },
];

test("a journal publication and its generated previews use the focused browser suite", () => {
  assert.equal(classifyRelease(journalUpdate()), "journal");
  assert.equal(classifyRelease([...journalUpdate(), { path: "tests/fixtures/journal-november-2026.json" }, { path: "README.md" }]), "journal");
});

test("journal updates cannot hide changes to layout, templates, runtime or other media", () => {
  for (const path of ["assets/styles.css", "assets/site.js", "templates/journal-story.html", "scripts/site-content.mjs", "content/site.json", "assets/hero.mp4", ".github/workflows/pages.yml"]) {
    assert.equal(classifyRelease([...journalUpdate(), { path }]), "full", path);
  }
  for (const path of ["index.html", "catalog/index.html", "journal/index.html", "sitemap.xml", "assets/media-variants.json"]) {
    const changes = journalUpdate();
    const change = changes.find(item => item.path === path);
    change.after = path.endsWith(".json") ? '[{"file":"hero.mp4","changed":true}]' : change.after + "<!-- changed outside journal -->";
    assert.equal(classifyRelease(changes), "full", path);
  }
  const scripted = journalUpdate();
  scripted[0].after += "<script>newBehavior()</script>";
  assert.equal(classifyRelease(scripted), "full");
  const deleted = journalUpdate();
  deleted.find(item => item.path === "journal/700/index.html").after = null;
  assert.equal(classifyRelease(deleted), "full");
});

test("missing or unavailable comparison bases cannot skip the full gate", () => {
  for (const base of [undefined, "", "0".repeat(40), "f".repeat(40)]) {
    assert.equal(classifyRelease(readReleaseChanges(base)), "full");
  }
});
