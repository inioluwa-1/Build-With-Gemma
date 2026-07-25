/**
 * Render the app icons from the stamp mark.
 *
 *   npm run icons
 *
 * The mark is the product in miniature: a bordered, angled seal on paper. Uses
 * sharp, which is already present as a Next dependency.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "icons");

const PAPER = "#FAF7F0";
const GREEN = "#0B6E3F";

/** `inset` leaves the safe area a maskable icon needs (design.md §4). */
function mark(size: number, inset: number, background: string): string {
  const scale = size / 512;
  const pad = size * inset;
  const box = size - pad * 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="${background}"/>
  <g transform="rotate(-3 ${size / 2} ${size / 2})">
    <rect x="${pad}" y="${pad + box * 0.18}" width="${box}" height="${box * 0.64}"
          fill="none" stroke="${GREEN}" stroke-width="${24 * scale}"/>
    <path d="M ${pad + box * 0.22} ${size / 2} l ${box * 0.16} ${box * 0.16} l ${box * 0.4} ${-box * 0.36}"
          fill="none" stroke="${GREEN}" stroke-width="${36 * scale}"
          stroke-linecap="square" stroke-linejoin="miter"/>
  </g>
</svg>`;
}

async function main(): Promise<void> {
  mkdirSync(OUT, { recursive: true });

  const targets = [
    { file: "icon-192.png", size: 192, inset: 0.08, background: PAPER },
    { file: "icon-512.png", size: 512, inset: 0.08, background: PAPER },
    // Maskable icons get cropped to a platform-defined shape, so the mark sits
    // well inside the safe area and the background bleeds to the edge.
    { file: "icon-maskable-512.png", size: 512, inset: 0.22, background: PAPER },
    { file: "apple-touch-icon.png", size: 180, inset: 0.1, background: PAPER },
  ];

  for (const { file, size, inset, background } of targets) {
    const png = await sharp(Buffer.from(mark(size, inset, background))).png().toBuffer();
    writeFileSync(join(OUT, file), png);
    console.log(`wrote public/icons/${file}`);
  }

  writeFileSync(join(OUT, "icon.svg"), mark(512, 0.08, PAPER), "utf8");
  console.log("wrote public/icons/icon.svg");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
