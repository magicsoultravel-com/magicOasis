#!/usr/bin/env node
/**
 * Re-download CC0 ambience layers from BigSoundBank.
 * Usage: node scripts/fetch-ambience.mjs
 */
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "audio", "ambience");
const BASE = "https://bigsoundbank.com/UPLOAD";

const LAYERS = [
  { id: "birds", num: "0097" },
  { id: "water", num: "0823" },
  { id: "wind", num: "0904" },
  { id: "forest", num: "2749" },
];

async function download(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} → ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

await mkdir(OUT, { recursive: true });

for (const layer of LAYERS) {
  for (const ext of ["ogg", "mp3"]) {
    const url = `${BASE}/${ext}/${layer.num}.${ext}`;
    const dest = join(OUT, `${layer.id}.${ext}`);
    process.stdout.write(`Fetching ${layer.id}.${ext}… `);
    const data = await download(url);
    await writeFile(dest, data);
    console.log(`${(data.length / 1024 / 1024).toFixed(1)} MB`);
  }
}

console.log("Done. See audio/ambience/SOURCES.md for license info.");
