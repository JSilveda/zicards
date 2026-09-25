// One-time icon generation: SVG -> PNGs for PWA manifest + favicons.
// Run: node scripts/generate-icons.mjs
import sharp from "sharp";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const dir = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "icons");

async function render(svgFile, outFile, size) {
  const svg = readFileSync(join(dir, svgFile));
  await sharp(svg, { density: 300 }).resize(size, size).png().toFile(join(dir, outFile));
  console.log(`wrote ${outFile} (${size}x${size})`);
}

await render("icon.svg", "icon-192.png", 192);
await render("icon.svg", "icon-512.png", 512);
await render("icon.svg", "apple-touch-icon.png", 180);
await render("maskable.svg", "maskable-512.png", 512);
console.log("done");
