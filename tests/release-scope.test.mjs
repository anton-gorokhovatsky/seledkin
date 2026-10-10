import { test } from "node:test";
import assert from "node:assert/strict";
import { classifyRelease, readReleaseChanges, scopedBrowserTags } from "../scripts/release-scope.mjs";

const before = '<footer><a class="credit" href="https://example.com/">Дизайн и разработка</a></footer>';
const after = before.replace("https://example.com/", "https://gorokhovatsky.tech/?point=ks-fish");
const page = (path = "index.html", content = after) => ({ path, before, after: content });

test("soft hyphens and nonbreaking spaces in copy use the focused typographic gate", () => {
  const original = '<main><h3 id="meal">Ужин с морепродуктами</h3></main>';
  assert.equal(classifyRelease([{ path: "recipes/index.html", before: original,
    after: original.replace("с морепродуктами", "с\u00a0морепро\u00adдуктами") },
    { path: "content/recipes.json" }, { path: "tests/browser/recipes.spec.mjs" }]), "typography");
});

test("the typographic gate cannot hide changes to words, attributes, code or CSS", () => {
  const original = '<h3 class="meal">Ужин с морепродуктами</h3><script>const label = "a b";</script><style>.a { color: red; }</style>';
  for (const changed of [original.replace("Ужин", "Обед"), original.replace('class="meal"', 'class="mea\u00adl"'),
    original.replace('"a b"', '"a\u00a0b"'), original.replace("color: red", "color:\u00a0red"), original + "<p>Текст</p>"]) {
    assert.equal(classifyRelease([{ path: "recipes/index.html", before: original, after: changed }]), "full");
  }
  assert.equal(classifyRelease([{ path: "recipes/index.html", before: original, after: original.replace("морепро", "морепро\u00ad") },
    { path: "assets/recipes-editorial.css" }]), "full");
});

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

test("component changes select customer scenarios, including responsive CSS", () => {
  const changes = [
    { path: "assets/styles.css", before: ':root{--ink:black}.catalog-order{gap:1rem}',
      after: ':root{--ink:black}.catalog-order{gap:2rem}@container contacts (max-width:38rem){.contacts-source__card{display:block}}' },
    { path: "assets/order-list.js", after: "setupOrderList()" },
    { path: "assets/mobile-hero.js", after: "setupMobileHero()" },
    { path: "assets/analytics.js", after: "reachGoal()" },
    { path: "about/index.html", before: '<script src="../assets/site.js?v=old"></script>', after: '<script src="../assets/site.js?v=new"></script>' },
    { path: "journal/377/index.html", before: '<header>header</header><main>original</main><footer>footer</footer>', after: '<header>header</header><main>original plus historical context</main><footer>footer</footer>' },
  ];
  assert.equal(classifyRelease(changes), "scoped");
  assert.deepEqual(scopedBrowserTags(changes), ["@afisha", "@analytics", "@catalog", "@contacts", "@journal"]);
});

test("shared tokens, mixed selectors, moved rules and unknown modules retain the full gate", () => {
  for (const [before, after] of [
    [':root{--ink:black}', ':root{--ink:blue}'],
    ['.catalog-order, .source-button{color:blue}', '.catalog-order, .source-button{color:red}'],
    ['.catalog-order{color:blue}.catalog-product{color:red}', '.catalog-product{color:red}.catalog-order{color:blue}'],
  ]) assert.equal(classifyRelease([{ path:"assets/styles.css", before, after }]), "full");
  assert.equal(classifyRelease([{ path:"assets/new-runtime.js", after:"newBehavior()" }]), "full");
  assert.equal(classifyRelease([{ path:"catalog/index.html", before:'<main>catalog</main><footer>old</footer>', after:'<main>catalog</main><footer>new</footer>' }]), "full");
});
