import { readFileSync } from "node:fs";
import { catalog } from "../assets/catalog-data.js";

export const legacyRoutes = JSON.parse(readFileSync(new URL("../content/legacy-routes.json", import.meta.url), "utf8"));
const names = new Set();
for (const route of legacyRoutes) {
  const target = new URL(route.target, "https://ks.fish/");
  if (!/^[a-z]+(?:-[a-z]+)*$/.test(route.path) || names.has(route.path)
    || target.origin !== "https://ks.fish" || target.pathname !== "/catalog/"
    || (target.searchParams.has("category") && !catalog.some(item => item.slug === target.searchParams.get("category")))) {
    throw new Error(`Invalid legacy route: ${route.path}`);
  }
  names.add(route.path);
}

export function renderLegacyRoute({ target, label }) {
  const href = `../${target}`;
  return `<!doctype html>
<html lang="ru">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="robots" content="noindex" />
    <title>${label} — Рыбная лавка капитана Селедкина</title>
    <link rel="canonical" href="https://ks.fish/${target.replaceAll("&", "&amp;")}" />
    <meta http-equiv="refresh" content="0; url=${href.replaceAll("&", "&amp;")}" />
    <script>
      // Pages has no server redirect rules. Preserve query and service markers
      // in the browser, and let the meta refresh work without JavaScript.
      const destination = new URL(${JSON.stringify(href)}, location.href);
      new URL(location.href).searchParams.forEach((value, key) => {
        if (!destination.searchParams.has(key)) destination.searchParams.set(key, value);
      });
      location.replace(destination.href);
    </script>
    <link rel="stylesheet" href="../assets/styles.css" />
  </head>
  <body class="not-found-page">
    <main class="not-found-source">
      <h1>${label}</h1>
      <p>Этот раздел теперь в каталоге лавки.</p>
      <a class="source-button source-button--outline" href="${href.replaceAll("&", "&amp;")}"><span class="source-button__label">Открыть каталог</span></a>
    </main>
  </body>
</html>
`;
}
