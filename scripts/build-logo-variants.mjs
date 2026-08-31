import { readFile, writeFile } from "node:fs/promises";

const templatePath = new URL("./logo-variants/squid.svg", import.meta.url);
const template = await readFile(templatePath, "utf8");
const variants = [
  {
    source: new URL("../assets/logo-redrawn.svg", import.meta.url),
    output: new URL("../assets/logo-catch-squid.svg", import.meta.url),
    ink: "#004f91",
    paper: "#fff",
  },
  {
    source: new URL("../assets/logo-redrawn-night.svg", import.meta.url),
    output: new URL("../assets/logo-catch-squid-night.svg", import.meta.url),
    ink: "#b8c2c8",
    paper: "#0e202b",
  },
];

for (const variant of variants) {
  const source = await readFile(variant.source, "utf8");
  const sourceBody = source
    .replace(/^<svg\b[^>]*>/, "")
    .replace(/<\/svg>\s*$/, "")
    .replace(/<title\b[^>]*>[\s\S]*?<\/title>\s*/, "")
    .replace(/<desc\b[^>]*>[\s\S]*?<\/desc>\s*/, "");
  const coloredTemplate = template
    .replaceAll("#004f91", variant.ink)
    .replaceAll("#fff", variant.paper);
  const selfContained = coloredTemplate
    .replace(
      "<defs>",
      `<defs>
    <g id="accepted-logo-source">
${sourceBody
  .split("\n")
  .map((line) => (line ? `      ${line}` : ""))
  .join("\n")}
    </g>`,
    )
    .replace(
      /<image href="\.\.\/\.\.\/assets\/logo-redrawn\.svg" width="3600" height="1784"\/>/g,
      '<use href="#accepted-logo-source"/>',
    );
  await writeFile(variant.output, selfContained);
}
