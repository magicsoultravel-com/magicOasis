#!/usr/bin/env node
/**
 * Download CC0 ambience variants from BigSoundBank.
 * Usage: node scripts/fetch-ambience.mjs
 */
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "audio", "ambience");
const BASE = "https://bigsoundbank.com/UPLOAD";

const TRACKS = [
  { category: "birds", file: "dawn", num: "1906" },
  { category: "water", file: "stream", num: "0823" },
  { category: "water", file: "fountain", num: "0913" },
  { category: "water", file: "beach", num: "1446" },
  { category: "water", file: "calm-coast", num: "0698" },
  { category: "water", file: "ocean", num: "0698" },
  { category: "water", file: "storm", num: "0740" },
  { category: "wind", file: "light", num: "0904" },
  { category: "wind", file: "moderate", num: "0900" },
  { category: "wind", file: "strong", num: "1450" },
  { category: "wind", file: "gusts", num: "0625" },
  { category: "forest", file: "trees", num: "0903" },
];

async function download(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} → ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

await mkdir(OUT, { recursive: true });

for (const track of TRACKS) {
  const dir = join(OUT, track.category);
  await mkdir(dir, { recursive: true });
  for (const ext of ["ogg", "mp3"]) {
    const url = `${BASE}/${ext}/${track.num}.${ext}`;
    const dest = join(dir, `${track.file}.${ext}`);
    process.stdout.write(`${track.category}/${track.file}.${ext}… `);
    try {
      const data = await download(url);
      await writeFile(dest, data);
      console.log(`${(data.length / 1024 / 1024).toFixed(1)} MB`);
    } catch (err) {
      console.log(`SKIP (${err.message})`);
    }
  }
}

console.log("Done. See audio/ambience/SOURCES.md");
