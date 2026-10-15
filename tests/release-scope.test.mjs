import { test } from "node:test";
import assert from "node:assert/strict";
import { classifyRelease, readReleaseChanges, scopedBrowserTags, selectReleaseChecks } from "../scripts/release-scope.mjs";

test("manual editorial selection runs recipe and journal journeys without weakening automatic scope", () => {
  const changes = [{ path: "recipes/701/index.html", after: "<h1>Рецепт</h1>" }];
  assert.deepEqual(selectReleaseChecks(changes, "editorial"), { scope: "scoped", grep: "@recipes|@journal" });
  assert.deepEqual(selectReleaseChecks(changes), { scope: "full", grep: "" });
  assert.deepEqual(selectReleaseChecks(changes, "full"), { scope: "full", grep: "" });
  assert.deepEqual(selectReleaseChecks(null), { scope: "full", grep: "" });
});

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

const menuPage = routes => `<main>Same content</main><nav aria-label="Меню сайта">${routes.map(([href, label], i) =>
  `<a href="${href}"${href === "catalog/" ? ' aria-current="page"' : ""}><span aria-hidden="true">0${i + 1}</span><span>${label}</span></a>`).join("")}</nav>
<nav class="site-navigation-fallback source-shell" id="site-navigation-fallback" aria-label="Разделы сайта" tabindex="-1" data-menu-fallback>${routes.map(([href, label]) =>
  `<a href="${href}"${href === "catalog/" ? ' aria-current="page"' : ""}>${label}</a>`).join("")}</nav><footer>Same contacts</footer>`;
const menuRoutes = [["catalog/", "Продукты и цены"], ["#assortment", "Что продаём"], ["#contacts", "Контакты"]];
const retainedMenuRoutes = menuRoutes.filter(([href]) => href !== "#assortment");

test("changing menu items selects navigation while generated page content stays unchanged", () => {
  for (const routes of [retainedMenuRoutes, [...menuRoutes].reverse(), [...menuRoutes, ["recipes/", "Рецепты"]],
    menuRoutes.map(([href, label]) => [href, label === "Контакты" ? "Адрес лавки" : label])]) {
    const changes = ["index.html", "catalog/index.html", "about/index.html", "journal/700/index.html"]
      .map(path => ({ path, before: menuPage(menuRoutes), after: menuPage(routes) }));
    assert.equal(classifyRelease(changes), "scoped");
    assert.deepEqual(scopedBrowserTags(changes), ["@navigation"]);
  }
});

test("navigation selection cannot hide changed behaviour, layout or content outside its links", () => {
  const before = menuPage(menuRoutes), after = menuPage(retainedMenuRoutes);
  for (const changed of [after.replace("Same content", "New content"), after.replace("Same contacts", "New contacts"),
    after.replace('href="catalog/"', 'href="catalog/" onclick="newBehaviour()"'),
    after.replace('href="catalog/"', 'href="javascript:newBehaviour()"'),
    after.replace('aria-label="Меню сайта"', 'aria-label="Другое меню"'), after + "<script>newBehaviour()</script>",
    after.replace('<span>Контакты</span>', '<strong>Контакты</strong>')]) {
    assert.equal(classifyRelease([{ path: "index.html", before, after: changed }]), "full");
  }
  for (const change of [{ path: "assets/site.js", before: "old();", after: "new();" },
    { path: "assets/styles.css", before: ".site-menu{gap:1rem}", after: ".site-menu{gap:2rem}" }]) {
    assert.equal(classifyRelease([{ path: "index.html", before, after }, change]), "full");
  }
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

test("the footer credit has a bounded gate without covering other footer or shared styles", () => {
  const css = selector => ({ path: "assets/styles.css", before: `${selector}{gap:1rem}`,
    after: `${selector}{gap:2rem}` });
  const changes = [css(".source-footer__base > small"),
    { path: "assets/author-signature.js", before: "old();", after: "new();" }];
  changes[0].after += "@media(max-width:40rem){.source-footer__credit::part(credit){flex-direction:row}}";
  assert.equal(classifyRelease(changes), "scoped");
  assert.deepEqual(scopedBrowserTags(changes), ["@signature"]);
  for (const selector of [".source-footer", ".source-footer::before", ":root",
    ".source-footer__base, .site-menu"]) {
    assert.equal(classifyRelease([css(selector)]), "full", selector);
  }
});

test("footer layout selects its scenarios while preserving content, destinations and the rest of the page", () => {
  const before = '<main>Same page</main>' + region('footer', '<footer><p>Subscribe here</p><a href="https://example.com/">Channel</a><script src="footer.js"></script></footer>');
  const after = before.replace('<p>Subscribe here</p><a href="https://example.com/">Channel</a>', '<div><a href="https://example.com/">Channel</a><p>Subscribe here</p></div>');
  const html = changed => ({path:'about/index.html', before, after:changed});
  assert.deepEqual(scopedBrowserTags([html(after)]), ['@footer', '@signature']);
  assert.deepEqual(scopedBrowserTags([{path:'assets/styles.css', before:'.source-footer__postscript{gap:1rem}', after:'.source-footer__postscript{gap:2rem}'}]), ['@footer']);
  for (const changed of [after.replace('Same page','Changed page'), after.replace('Subscribe','Buy'),
    after.replace('example.com','changed.com'), after.replace('footer.js','new.js'), after.replace('<div>', '<div onclick="run()">')]) {
    assert.equal(classifyRelease([html(changed)]), 'full');
  }
});

test("removing the optional footer return link keeps a bounded footer gate", () => {
  const link = '<a href="#">В\u00a0начало</a>';
  const before = '<main>Same page</main>' + region('footer', `<footer><p>Copyright</p><a href="https://example.com/">Author</a>${link}<script src="footer.js"></script></footer>`);
  const after = before.replace(link, '');
  const html = changed => ({ path: 'about/index.html', before, after: changed });
  assert.deepEqual(selectReleaseChecks([html(after)]), { scope: 'scoped', grep: '@footer|@signature' });
  for (const changed of [after.replace('Same page', 'Changed page'), after.replace('Copyright', 'New copy'),
    after.replace('example.com', 'changed.com'), after.replace('footer.js', 'new.js'),
    after.replace('<p>', '<p onclick="run()">')]) {
    assert.equal(classifyRelease([html(changed)]), 'full');
  }
  assert.equal(classifyRelease([{ path: 'about/index.html', before: after, after: before }]), 'full');
});

test("component changes select customer scenarios, including responsive CSS", () => {
  const changes = [
    { path: "assets/styles.css", before: ':root{--ink:black}.catalog-order{gap:1rem}',
      after: ':root{--ink:black}.catalog-order{gap:2rem}@container contacts (max-width:38rem){.contacts-source__card{display:block}}' },
    { path: "assets/order-list.js", after: "setupOrderList()" },
    { path: "assets/order-message.js", after: "setupProductTelegramOrders()" },
    { path: "assets/mobile-hero.js", after: "setupMobileHero()" },
    { path: "assets/analytics.js", after: "reachGoal()" },
    { path: "about/index.html", before: '<script src="../assets/site.js?v=old"></script>', after: '<script src="../assets/site.js?v=new"></script>' },
    { path: "journal/377/index.html", before: '<header>header</header><main>original</main><footer>footer</footer>', after: '<header>header</header><main>original plus historical context</main><footer>footer</footer>' },
  ];
  assert.equal(classifyRelease(changes), "scoped");
  assert.deepEqual(scopedBrowserTags(changes), ["@afisha", "@analytics", "@catalog", "@contacts", "@journal"]);
});

test("recipe pages, dedicated styles and filtering select recipe journeys", () => {
  const original = '<header>shared</header><main><h1>Recipes</h1></main><footer>shared</footer>';
  const changes = [
    { path: "recipes/index.html", before: original, after: original.replace('Recipes', 'Compact recipe introduction') },
    { path: "assets/recipes-directory.js", before: "oldFilter()", after: "filter()" },
    { path: "assets/recipes-editorial.css", before: '.recipes-intro{gap:2rem}', after: '.recipes-intro{gap:1rem}@media(width<=46rem){.recipe-jump{gap:0}}' },
    { path: "assets/recipes-directory.css", before: '.recipe-chooser{margin:2rem}', after: '.recipe-chooser{margin:1rem}' },
  ];
  assert.equal(classifyRelease(changes), "scoped");
  assert.deepEqual(scopedBrowserTags(changes), ["@recipes"]);
  for (const changed of [original.replace('shared', 'new menu'), original + '<script>newBehavior()</script>']) {
    assert.equal(classifyRelease([{ path: 'recipes/index.html', before: original, after: changed }]), "full");
  }
  assert.equal(classifyRelease([{ path: 'assets/recipes-editorial.css', before: '.recipes-intro{gap:2rem}', after: ':root{--ink:red}.recipes-intro{gap:1rem}' }]), "full");
});

test("menu end spacing selects navigation without hiding overflow or other layout changes", () => {
  const before = '@media (width > 61.1875rem){.site-menu__service-inner{min-height:0;padding-top:0;overflow-y:auto;}}';
  const after = before.replace('padding-top:0;', 'padding-top:0;padding-bottom:0;')
    .replace('{.site-menu__service-inner', '{.site-menu__routes{padding-bottom:0;}.site-menu__service-inner');
  const changes = [{ path: "assets/styles.css", before, after }];
  assert.equal(classifyRelease(changes), "scoped");
  assert.deepEqual(scopedBrowserTags(changes), ["@navigation"]);
  for (const changed of [after.replace('overflow-y:auto', 'overflow-y:hidden'),
    after.replace('min-height:0', 'min-height:100%'), after + ':root{--ink:red}',
    after.replace('.site-menu__routes{padding-bottom:0;', '.site-menu__routes{font-size:1rem;padding-bottom:0;')]) {
    assert.equal(classifyRelease([{ path: "assets/styles.css", before, after: changed }]), "full");
  }
});

test("delivery price styles select their reflow scenario without admitting other components", () => {
  const before = '.delivery-waybill__price{font-size:8rem}.delivery-waybill__price span{font-size:.48em}';
  const after = before.replace('8rem', 'min(8rem,32cqi)');
  const changes = [{ path: "assets/styles.css", before, after }];
  assert.equal(classifyRelease(changes), "scoped");
  assert.deepEqual(scopedBrowserTags(changes), ["@delivery"]);
  for (const extra of [':root{--serif:serif}', '.delivery-waybill{display:block}', '.source-button{display:none}']) {
    assert.equal(classifyRelease([{ path: "assets/styles.css", before, after: after + extra }]), "full");
  }
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

test("automatic publication versions do not turn a catalog change into a full-site pass", () => {
  assert.deepEqual(scopedBrowserTags([
    { path: "assets/catalog-data.js", before: "old catalog", after: "catalog with permanent IDs" },
    { path: "assets/theme.js", before: 'import "./store-time.js?v=old";', after: 'import "./store-time.js";' },
    { path: "assets/site.js", before: 'const map = "assets/store-map.html?v=old";', after: 'const map = "assets/store-map.html";' },
    { path: "about/index.html", before: '<link href="../assets/styles.css?v=old">', after: '<link href="../assets/styles.css">' },
  ]), ["@afisha", "@catalog", "@recipes"]);
  assert.equal(classifyRelease([{ path: "assets/theme.js", before: 'import "./store-time.js?v=old"; oldLogic();', after: 'import "./store-time.js"; newLogic();' }]), "full");
  assert.equal(classifyRelease([{ path: "assets/theme.js", before: 'import "https://external.example/module.js?v=old";', after: 'import "https://external.example/module.js?v=new";' }]), "full");
});

test("exact catalog links and gallery destinations select the catalog journey without hiding other changes", () => {
  const original = '<main><a href="../../catalog/?q=икра">Цена</a><img data-href="../../catalog/?q=икра"></main>';
  const exact = original.replaceAll("../../catalog/?q=икра", "../../catalog/?product=caviar-001#product-caviar-001");
  assert.deepEqual(scopedBrowserTags([{ path: "journal/700/index.html", before: original, after: exact }]), ["@catalog"]);
  const home = '<a href="catalog/?q=икра">Цена</a><img data-href="catalog/?q=икра">';
  const exactHome = home.replaceAll("catalog/?q=икра", "catalog/?product=caviar-001#product-caviar-001");
  assert.deepEqual(scopedBrowserTags([{ path: "index.html", before: home, after: exactHome }]), ["@catalog"]);
  for (const changed of [exactHome.replace("Цена", "Другая цена"), exactHome.replace("#product-caviar-001", "#other"), exactHome.replaceAll("catalog/?", "journal/?")]) {
    assert.equal(classifyRelease([{ path: "index.html", before: home, after: changed }]), "full");
  }
});
