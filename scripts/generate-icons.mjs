/**
 * Generates the Nma's Kitchen PWA icons as real PNG files.
 *
 * A tiny PNG encoder keeps this dependency-free: the app icons are brand
 * assets, so they are produced here rather than hand-drawn as SVG.
 *
 * Run with:  node scripts/generate-icons.mjs
 */
import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(here, "../public/icons");

/* ----------------------------------------------------------- PNG encoder */

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buffer) {
  let crc = -1;
  for (const byte of buffer) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ -1) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const typeBuffer = Buffer.from(type, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);
  return Buffer.concat([length, typeBuffer, data, crc]);
}

/** @param {Buffer} rgba */
function encodePng(size, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  // One filter byte (0 = none) followed by the row's RGBA bytes.
  const stride = size * 4;
  const raw = Buffer.alloc((stride + 1) * size);
  for (let y = 0; y < size; y += 1) {
    raw[y * (stride + 1)] = 0;
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

/* --------------------------------------------------------------- drawing */

function blend(target, index, [r, g, b], alpha) {
  const a = Math.max(0, Math.min(1, alpha));
  if (a <= 0) return;
  target[index] = Math.round(target[index] * (1 - a) + r * a);
  target[index + 1] = Math.round(target[index + 1] * (1 - a) + g * a);
  target[index + 2] = Math.round(target[index + 2] * (1 - a) + b * a);
  target[index + 3] = Math.round(target[index + 3] * (1 - a) + 255 * a);
}

/**
 * The brand mark: a fresh-green rounded square with a white plate, a green
 * inner ring and three steam dots. `bleed` renders a full-bleed square for the
 * maskable variant, which Android crops with its own safe zone.
 */
function drawIcon(size, { bleed = false } = {}) {
  const px = Buffer.alloc(size * size * 4, 0);
  const center = size / 2;
  const radius = size * (bleed ? 0.5 : 0.235);
  const plateRadius = size * 0.3;
  const ringRadius = size * 0.2;

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const index = (y * size + x) * 4;
      const dx = x - center;
      const dy = y - center;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Rounded-square background with a vertical brand gradient.
      let inside = true;
      if (!bleed) {
        const half = size / 2 - size * 0.055;
        const qx = Math.max(Math.abs(dx) - (half - radius), 0);
        const qy = Math.max(Math.abs(dy) - (half - radius), 0);
        inside = Math.sqrt(qx * qx + qy * qy) <= radius;
      }
      if (!inside) continue;

      const t = y / size;
      const r = Math.round(18 + t * 6);
      const g = Math.round(150 - t * 28);
      const b = Math.round(92 - t * 16);
      blend(px, index, [r, g, b], 1);

      // Plate.
      if (dist <= plateRadius) {
        const edge = plateRadius - dist;
        blend(px, index, [255, 255, 255], Math.min(1, edge / (size * 0.012)));
        // Inner green ring, so the mark reads as a plated meal.
        const ring = Math.abs(dist - ringRadius);
        if (ring < size * 0.022) {
          blend(px, index, [14, 122, 72], Math.min(1, (size * 0.022 - ring) / (size * 0.012)));
        }
      }

      // Three steam dots above the plate.
      for (let dot = 0; dot < 3; dot += 1) {
        const dotX = center + (dot - 1) * size * 0.085;
        const dotY = center - plateRadius - size * 0.11;
        const dotR = size * 0.028;
        const d = Math.sqrt((x - dotX) ** 2 + (y - dotY) ** 2);
        if (d <= dotR) {
          blend(px, index, [255, 255, 255], Math.min(1, (dotR - d) / (size * 0.01)));
        }
      }
    }
  }

  return encodePng(size, px);
}

/* ------------------------------------------------------------------ main */

mkdirSync(outDir, { recursive: true });

const outputs = [
  ["icon-192.png", 192, {}],
  ["icon-512.png", 512, {}],
  ["icon-maskable-512.png", 512, { bleed: true }],
  ["apple-touch-icon.png", 180, {}],
];

for (const [name, size, options] of outputs) {
  writeFileSync(resolve(outDir, name), drawIcon(size, options));
  console.log(`wrote public/icons/${name} (${size}×${size})`);
}
