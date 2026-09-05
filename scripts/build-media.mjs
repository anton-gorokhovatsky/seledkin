import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
const root = fileURLToPath(new URL("../", import.meta.url));
const path = name => resolve(root, "assets", name);
const hash = name => createHash("sha256").update(readFileSync(path(name))).digest("hex");
const manifestName = "media-variants.json";
if (process.argv.includes("--check")) {
  const manifest = JSON.parse(readFileSync(path(manifestName), "utf8"));
  for (const item of manifest) {
    if (!existsSync(path(item.file)) || hash(item.file) !== item.sha256 || hash(item.source) !== item.sourceSha256) {
      throw new Error(`Media variant has changed: ${item.file}`);
    }
  }
  console.log(`Проверены медиаварианты: ${manifest.length}; исходники сохранены.`);
  process.exit(0);
}
function run(command, args) {
  const result = spawnSync(command, args, { encoding: "utf8" });
  if (result.status !== 0) throw new Error(result.stderr || result.error?.message);
  return result.stdout;
}
function probe(file) {
  return JSON.parse(run("ffprobe", ["-v", "error", "-show_entries", "stream=width,height,nb_frames,r_frame_rate", "-show_entries", "format=duration", "-of", "json", path(file)]));
}
const manifest = [];
const python = process.env.MEDIA_PYTHON || "python3";
function imageVariant(source, file, width, quality = 82) {
  run(python, ["-c", `from PIL import Image, ImageOps
import sys
im = Image.open(sys.argv[1])
profile = im.info.get("icc_profile", b"")
im = ImageOps.exif_transpose(im)
width = int(sys.argv[3])
if width: im = im.resize((width, round(im.height * width / im.width)), Image.Resampling.LANCZOS)
im.save(sys.argv[2], format="WEBP", quality=int(sys.argv[4]), method=6, icc_profile=profile)`, path(source), path(file), String(width), String(quality)]);
}
function record(file, source, extra = {}) {
  manifest.push({ file, source, sourceSha256: hash(source), sha256: hash(file), bytes: readFileSync(path(file)).length, ...extra });
}
const photos = ["about-main.jpg", "about-small-2.jpg", "caviar-slab.jpg", "delivery-basket.jpg", "flounder.jpg", "gallery-small-2.jpg", "journal-680.jpg", "journal-681.jpg", "journal-682.jpg", "journal-683.jpg", "journal-684.jpg", "oleg-gugunava.jpg", "salmon-cat.jpg"];
for (const source of photos) {
  const info = probe(source).streams[0];
  const widths = [...new Set([Math.min(480, info.width), Math.min(960, info.width)])];
  if (source.startsWith("journal-")) widths.push(32);
  for (const width of widths) {
    const file = source.replace(/\.jpg$/, `-${width}.webp`);
    imageVariant(source, file, width, width === 32 ? 65 : 82);
    const dimensions = probe(file).streams[0];
    record(file, source, { width: dimensions.width, height: dimensions.height });
  }
  console.log(`Фотография: ${source}`);
}
for (const source of ["hero-sea.mp4", "hero-sea-night.mp4"]) {
  const file = source.replace(".mp4", "-web.mp4");
  run("ffmpeg", ["-v", "error", "-y", "-i", path(source), "-map", "0:v:0", "-an", "-c:v", "libx264", "-preset", "slow", "-crf", "30", "-pix_fmt", "yuv420p", "-movflags", "+faststart", path(file)]);
  const before = probe(source), after = probe(file);
  if (JSON.stringify(before) !== JSON.stringify(after)) throw new Error(`Video geometry or timing changed: ${file}`);
  record(file, source, after.streams[0]);
  console.log(`Море: ${source}`);
}
imageVariant("hero-sea-night-poster.jpg", "hero-sea-night-poster.webp", 0);
record("hero-sea-night-poster.webp", "hero-sea-night-poster.jpg");
writeFileSync(path(manifestName), JSON.stringify(manifest, null, 2) + "\n");
