import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { editorialReleaseIds, catalogDataChanges } from "../scripts/editorial-release.mjs";
import { checkEditorialRelease } from "../scripts/check-editorial-release.mjs";
import { classifyRelease, selectReleaseChecks, shouldPublish } from "../scripts/release-scope.mjs";

const region = (name, text) => `<!-- shared:${name}:start -->${text}<!-- shared:${name}:end -->`;
const publication = () => [
  { path: "content/journal.json", before: '[{"id":702}]', after: '[{"id":703,"catalogProductIds":["smoked-vendace"],"heroOrderName":"ряпушку"},{"id":702}]' },
  { path: "content/journal/703.html", after: "<p>Ряпушка</p>" },
  { path: "journal/703/index.html", after: "<h1>Ряпушка</h1>" },
  { path: "index.html", before: ["journal-hero", "journal-hero-products", "journal-preview", "mobile-hero"].map(name => region(name, "old")).join(""),
    after: ["journal-hero", "journal-hero-products", "journal-preview", "mobile-hero"].map(name => region(name, "new")).join("") },
];

test("a post including its order block selects only its publication ID", () => {
  assert.equal(classifyRelease(publication()), "editorial");
  assert.deepEqual(editorialReleaseIds(publication()), ["703"]);
  assert.deepEqual(editorialReleaseIds([{ path: "content/journal.json", before: '[{"id":702,"title":"Old"}]', after: '[{"title":"Old","id":702},{"id":703}]' }]), ["703"]);
  assert.deepEqual(selectReleaseChecks(publication(), "editorial"), { scope: "editorial", grep: "" });
});

test("a recipe publication selects its own page and generated recipe previews", () => {
  const changes = publication();
  changes.push({ path: "content/recipes.json", before: '{"recipes":[],"editorial":[]}', after: '{"recipes":[{"id":703,"products":[]}],"editorial":[]}' },
    { path: "recipes/703/index.html", after: "<h1>Рецепт</h1>" },
    { path: "recipes/index.html", before: "old generated list", after: "new generated list" });
  changes.find(change => change.path === "index.html").before += region("recipe-home", "old");
  changes.find(change => change.path === "index.html").after += region("recipe-home", "new");
  assert.equal(classifyRelease(changes), "editorial");
  assert.deepEqual(editorialReleaseIds(changes), ["703"]);
});

test("mixed changes, unselected pages, removed records and active content keep normal checks", () => {
  for (const path of ["assets/styles.css", "assets/site.js", "assets/store-map.js", "scripts/site-content.mjs", "templates/journal-page.html", "content/site.json"]) {
    assert.notEqual(classifyRelease([...publication(), { path, before: "old", after: "new" }]), "editorial");
  }
  assert.equal(classifyRelease([...publication(), { path: "journal/99999/index.html", after: "<script>unexpected()</script>" }]), "full");
  const removed = publication();
  removed[0].after = '[{"id":703}]';
  assert.notEqual(classifyRelease(removed), "editorial");
  const reordered = publication();
  reordered[0].before = '[{"id":703},{"id":702},{"id":700}]';
  reordered[0].after = '[{"id":703,"alt":"changed"},{"id":700},{"id":702}]';
  assert.notEqual(classifyRelease(reordered), "editorial");
  for (const payload of ['<script>run()</script>', '<p onclick="run()">Text</p>', '<a href="javascript:run()">Link</a>',
    '<link rel="stylesheet" href="https://example.com/style.css">', '<meta http-equiv="refresh" content="0">',
    '<p style="position:fixed;inset:0">Text</p>', '<template>Hidden author text</template>']) {
    const changes = publication(); changes[1].after += payload;
    assert.notEqual(classifyRelease(changes), "editorial");
  }
});

test("catalog eligibility permits literal product data, never code changes or removals", () => {
  const before = 'export const inventory = [\n  item("fish", "kg", "Рыба", "100 ₽/кг", null),\n];\n';
  const after = before.replace('100 ₽/кг', '200 ₽/кг');
  assert.deepEqual(catalogDataChanges(before, after), ["fish"]);
  assert.equal(catalogDataChanges(before, after + "run();"), null);
  assert.equal(catalogDataChanges(before, after.replace('"200 ₽/кг"', "getPrice()")), null);
  assert.equal(catalogDataChanges(before, 'export const inventory = [];\n'), null);
  const first = '  item("fish", "kg", "Рыба", "100 ₽/кг", null),\n';
  const second = '  item("other", "kg", "Другая рыба", "100 ₽/кг", null),\n';
  const two = `export const inventory = [\n${first}${second}];\n`;
  assert.equal(catalogDataChanges(two, two.replace(first + second, second + first)), null);
  const groups = `export const inventory = [\n {slug: "one", items:[\n${first}]},\n {\n slug: "two", items:[\n${second}]}];\n`;
  assert.equal(catalogDataChanges(groups, groups.replace(first, "").replace(second, first + second)), null);
});

test("current news and recipe sources retain the author text and exact selling products", () => {
  assert.deepEqual(checkEditorialRelease(["703"]).products, ["smoked-vendace"]);
  assert.ok(checkEditorialRelease(["701"]).products.length);
  assert.throws(() => checkEditorialRelease(["99999"]), /Unknown publication/);
  assert.throws(() => checkEditorialRelease([]), /No publication IDs/);
});

test("a product changed beside a post must actually belong to that post", () => {
  const before = 'export const inventory = [\n  item("unrelated-fish", "kg", "Другая рыба", "100 ₽/кг", null),\n];\n';
  assert.throws(() => checkEditorialRelease(["703"], [{ path: "assets/catalog-data.js", before, after: before.replace('100 ₽/кг', '200 ₽/кг') }]), /Unrelated catalog change/);
});

test("rehearsal has a separate no-publication scope and cannot downgrade unknown changes", () => {
  assert.deepEqual(selectReleaseChecks([{ path: "scripts/editorial-release.mjs" }], "editorial"), { scope: "editorial-check", grep: "" });
  assert.deepEqual(selectReleaseChecks(null, "editorial"), { scope: "full", grep: "" });
  assert.equal(selectReleaseChecks([{ path: "assets/styles.css", before: ":root{color:red}", after: ":root{color:blue}" }], "editorial").scope, "full");
  for (const scope of ["editorial", "editorial-check", "full", "scoped", "none"]) assert.equal(shouldPublish(scope, "editorial"), false);
  assert.equal(shouldPublish("editorial", "auto"), true);
  assert.equal(shouldPublish("none", "auto"), false);
  const workflow = readFileSync(new URL("../.github/workflows/pages.yml", import.meta.url), "utf8");
  assert.ok(workflow.includes("needs.build.outputs.publish_required == 'true'"));
  assert.ok(workflow.includes("--config=playwright.editorial.config.mjs"));
  assert.ok(!workflow.includes("--grep @journal"));
});
