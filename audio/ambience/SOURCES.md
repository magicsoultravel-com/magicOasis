# Ambience audio sources

All tracks are **CC0** (public domain). No attribution required.

Downloaded from [BigSoundBank](https://bigsoundbank.com) (`/UPLOAD/ogg/` and `/UPLOAD/mp3/`).

| File | Source | Duration |
|------|--------|----------|
| `birds/dawn.*` | [Birds Waking #4 s1906](https://bigsoundbank.com/birds-waking-4-s1906.html) | 6:18 |
| `water/stream.*` | [Small Stream s0823](https://bigsoundbank.com/small-stream-s0823.html) | 1:36 |
| `water/fountain.*` | [Fountain of a Japanese Temple s0913](https://bigsoundbank.com/fountain-of-a-japanese-temple-s0913.html) | 1:02 |
| `water/beach.*` | [Small waves and beach #1 s1446](https://bigsoundbank.com/small-waves-and-beach-1-s1446.html) | 4:10 |
| `water/calm-coast.*` | [Sea Waves s0698](https://bigsoundbank.com/sea-waves-s0698.html) | 2:46 |
| `water/ocean.*` | [Sea Waves s0698](https://bigsoundbank.com/sea-waves-s0698.html) | 2:46 |
| `water/storm.*` | [Rain and Thunder #2 s0740](https://bigsoundbank.com/rain-and-storm-2-s0740.html) | 2:37 |
| `wind/light.*` | [Wind in the Trees s0904](https://bigsoundbank.com/forest-wind-in-the-trees-s0904.html) | 3:38 |
| `wind/moderate.*` | [Wind in shrub s0900](https://bigsoundbank.com/wind-in-shrub-s0900.html) | 3:00 |
| `wind/strong.*` | [Strong wind and trees #1 s1450](https://bigsoundbank.com/strong-wind-and-trees-1-s1450.html) | 1:58 |
| `wind/gusts.*` | [Strong Wind in a Village s0625](https://bigsoundbank.com/strong-wind-in-a-village-s0625.html) | 1:30 |
| `forest/trees.*` | [Wind in a Tree s0903](https://bigsoundbank.com/wind-in-a-tree-s0903.html) | 1:55 |

Refresh assets:

```bash
node scripts/fetch-ambience.mjs
```

Or with curl (PowerShell example):

```powershell
$base = "https://bigsoundbank.com/UPLOAD"
curl.exe -sL "$base/ogg/1906.ogg" -o audio/ambience/birds/dawn.ogg
```

Serve via a local HTTP server — opening `index.html` directly (`file://`) will block audio loading.
