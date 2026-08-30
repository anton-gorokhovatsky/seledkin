import { readFile, writeFile } from "node:fs/promises";

const templatePath = new URL("./logo-variants/squid.svg", import.meta.url);
const template = await readFile(templatePath, "utf8");
const faviconTemplatePath = new URL("./logo-marks/favicon.svg", import.meta.url);
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

const acceptedLogo = await readFile(
  new URL("../assets/logo-redrawn.svg", import.meta.url),
  "utf8",
);
const acceptedEngravingPaths = [
  ...acceptedLogo.matchAll(/<path\b[^>]*\bfill="#004f91"[^>]*\/>/g),
].map(([path]) => path);
const acceptedFishSource = acceptedEngravingPaths.find((path) =>
  path.includes('d="M 1054.939 0.394'),
);
if (!acceptedFishSource) {
  throw new Error("Accepted fish engraving was not found in logo-redrawn.svg");
}
const acceptedFishPathData =
  acceptedFishSource.match(/\bd="([^"]+)"/)?.[1] ?? "";
const acceptedFishSubpaths = acceptedFishPathData
  .split(/\s+(?=M\s)/)
  .filter((subpath) => {
    const coordinates = [
      ...subpath.matchAll(/-?\d+(?:\.\d+)?/g),
    ].map(([coordinate]) => Number(coordinate));
    const xCoordinates = coordinates.filter((_, index) => index % 2 === 0);
    const yCoordinates = coordinates.filter((_, index) => index % 2 === 1);
    return Math.min(...xCoordinates) <= 800 && Math.min(...yCoordinates) <= 830;
  });
if (acceptedFishSubpaths.length !== 58) {
  throw new Error("Accepted fish crop no longer resolves to 58 exact subpaths");
}
const acceptedFishPath = acceptedFishSource
  .replace(/\bd="[^"]+"/, `d="${acceptedFishSubpaths.join(" ")}"`)
  .replace('fill="#004f91"', 'class="favicon-fish"');
const faviconTemplate = await readFile(faviconTemplatePath, "utf8");
const favicon = faviconTemplate.replace(
  "    <!-- ACCEPTED_FISH_PATH -->",
  acceptedFishPath
    .split("\n")
    .map((line) => (line ? `    ${line}` : ""))
    .join("\n"),
);
await writeFile(new URL("../assets/favicon.svg", import.meta.url), favicon);
