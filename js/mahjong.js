const Mahjong = (() => {
  const TILE_W = 2;
  const TILE_H = 2;

  const TURTLE_RAW = `0,7,0;
2,0,0;2,6,0;2,8,0;2,14,0;
4,0,0;4,4,0;4,6,0;4,8,0;4,10,0;4,14,0;
6,0,0;6,2,0;6,4,0;6,6,0;6,8,0;6,10,0;6,12,0;6,14,0;
8,0,0;8,2,0;8,4,0;8,6,0;8,8,0;8,10,0;8,12,0;8,14,0;
8,2,1;8,4,1;8,6,1;8,8,1;8,10,1;8,12,1;
10,0,0;10,2,0;10,4,0;10,6,0;10,8,0;10,10,0;10,12,0;10,14,0;
10,2,1;10,4,1;10,6,1;10,8,1;10,10,1;10,12,1;
10,4,2;10,6,2;10,8,2;10,10,2;
12,0,0;12,2,0;12,4,0;12,6,0;12,8,0;12,10,0;12,12,0;12,14,0;
12,2,1;12,4,1;12,6,1;12,8,1;12,10,1;12,12,1;
12,4,2;12,6,2;12,8,2;12,10,2;
12,6,3;12,8,3;
13,7,4;
14,0,0;14,2,0;14,4,0;14,6,0;14,8,0;14,10,0;14,12,0;14,14,0;
14,2,1;14,4,1;14,6,1;14,8,1;14,10,1;14,12,1;
14,4,2;14,6,2;14,8,2;14,10,2;
14,6,3;14,8,3;
16,0,0;16,2,0;16,4,0;16,6,0;16,8,0;16,10,0;16,12,0;16,14,0;
16,2,1;16,4,1;16,6,1;16,8,1;16,10,1;16,12,1;
16,4,2;16,6,2;16,8,2;16,10,2;
18,0,0;18,2,0;18,4,0;18,6,0;18,8,0;18,10,0;18,12,0;18,14,0;
18,2,1;18,4,1;18,6,1;18,8,1;18,10,1;18,12,1;
20,0,0;20,2,0;20,4,0;20,6,0;20,8,0;20,10,0;20,12,0;20,14,0;
22,0,0;22,4,0;22,6,0;22,8,0;22,10,0;22,14,0;
24,0,0;24,6,0;24,8,0;24,14,0;
26,7,0;
28,7,0`;

  const LAYOUT = TURTLE_RAW.split(";")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => {
      const [x, y, z] = s.split(",").map(Number);
      return { x, y, z };
    });

  const CHAR_NUMS = ["", "一", "二", "三", "四", "五", "六", "七", "八", "九"];
  const WIND_LABELS = ["", "東", "南", "西", "北"];
  const DRAGON_LABELS = ["", "中", "發", "白"];
  const FLOWER_LABELS = ["", "梅", "蘭", "菊", "竹"];
  const SEASON_LABELS = ["", "春", "夏", "秋", "冬"];

  function tileLabel(kind, rank) {
    switch (kind) {
      case "dots":
        return String(rank);
      case "bamboo":
        return String(rank);
      case "chars":
        return `${CHAR_NUMS[rank]}萬`;
      case "wind":
        return WIND_LABELS[rank];
      case "dragon":
        return DRAGON_LABELS[rank];
      case "flower":
        return FLOWER_LABELS[rank];
      case "season":
        return SEASON_LABELS[rank];
      default:
        return "?";
    }
  }

  function tileKey(def) {
    if (def.kind === "flower") return "flower";
    if (def.kind === "season") return "season";
    return `${def.kind}:${def.rank}`;
  }

  function mulberry32(seed) {
    let t = seed >>> 0;
    return () => {
      t += 0x6d2b79f5;
      let r = Math.imul(t ^ (t >>> 15), 1 | t);
      r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
      return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
  }

  function shuffle(arr, rand) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function overlaps(a, b) {
    return a.x < b.x + TILE_W && a.x + TILE_W > b.x && a.y < b.y + TILE_H && a.y + TILE_H > b.y;
  }

  function isFree(tile, tiles) {
    if (tile.removed) return false;

    for (const other of tiles) {
      if (other.removed || other.z <= tile.z) continue;
      if (overlaps(other, tile)) return false;
    }

    let leftBlocked = false;
    let rightBlocked = false;

    for (const other of tiles) {
      if (other.removed || other.z !== tile.z || other.id === tile.id) continue;
      if (other.y < tile.y + TILE_H && other.y + TILE_H > tile.y) {
        if (other.x + TILE_W === tile.x) leftBlocked = true;
        if (other.x === tile.x + TILE_W) rightBlocked = true;
      }
    }

    return !leftBlocked || !rightBlocked;
  }

  function canMatch(a, b) {
    if (!a || !b || a.id === b.id) return false;
    if (a.removed || b.removed) return false;
    if (a.kind === "flower" && b.kind === "flower") return true;
    if (a.kind === "season" && b.kind === "season") return true;
    return tileKey(a) === tileKey(b);
  }

  function buildDeck() {
    const deck = [];

    for (const kind of ["dots", "bamboo", "chars"]) {
      for (let rank = 1; rank <= 9; rank++) {
        for (let i = 0; i < 4; i++) {
          deck.push({ kind, rank, label: tileLabel(kind, rank), key: tileKey({ kind, rank }) });
        }
      }
    }

    for (let rank = 1; rank <= 4; rank++) {
      for (let i = 0; i < 4; i++) {
        deck.push({ kind: "wind", rank, label: tileLabel("wind", rank), key: tileKey({ kind: "wind", rank }) });
      }
    }

    for (let rank = 1; rank <= 3; rank++) {
      for (let i = 0; i < 4; i++) {
        deck.push({
          kind: "dragon",
          rank,
          label: tileLabel("dragon", rank),
          key: tileKey({ kind: "dragon", rank }),
        });
      }
    }

    for (let rank = 1; rank <= 4; rank++) {
      deck.push({ kind: "flower", rank, label: tileLabel("flower", rank), key: "flower" });
    }

    for (let rank = 1; rank <= 4; rank++) {
      deck.push({ kind: "season", rank, label: tileLabel("season", rank), key: "season" });
    }

    return deck;
  }

  function buildPairQueue(rand) {
    const buckets = new Map();
    for (const tile of buildDeck()) {
      if (!buckets.has(tile.key)) buckets.set(tile.key, []);
      buckets.get(tile.key).push(tile);
    }
    const pairs = [];
    for (const group of buckets.values()) {
      for (let i = 0; i < group.length; i += 2) {
        pairs.push([group[i], group[i + 1]]);
      }
    }
    return shuffle(pairs, rand);
  }

  function isSlotFree(slotId, placed, pos) {
    const temp = { id: slotId, x: pos.x, y: pos.y, z: pos.z, removed: false };
    return isFree(temp, placed);
  }

  function makeTile(slotId, def) {
    const pos = LAYOUT[slotId];
    return {
      id: slotId,
      kind: def.kind,
      rank: def.rank,
      label: def.label,
      key: def.key,
      z: pos.z,
      x: pos.x,
      y: pos.y,
      removed: false,
    };
  }

  /** Fast greedy reverse-deal; succeeds often without backtracking. */
  function dealGreedy(seed) {
    const rand = mulberry32(seed);
    const pairs = buildPairQueue(rand);
    const unplaced = new Set(LAYOUT.map((_, i) => i));
    const placed = [];
    const byId = new Map();

    for (const [tileA, tileB] of pairs) {
      const freeSlots = [...unplaced].filter((id) => isSlotFree(id, placed, LAYOUT[id]));
      if (freeSlots.length < 2) return null;

      shuffle(freeSlots, rand);
      const s1 = freeSlots[0];
      const s2 = freeSlots[1];
      const t1 = makeTile(s1, tileA);
      const t2 = makeTile(s2, tileB);

      placed.push(t1, t2);
      byId.set(s1, t1);
      byId.set(s2, t2);
      unplaced.delete(s1);
      unplaced.delete(s2);
    }

    if (unplaced.size !== 0) return null;
    return LAYOUT.map((_, i) => byId.get(i));
  }

  /** Reverse-deal with backtracking — guaranteed solvable when it succeeds. */
  function dealSolvable(seed, nodeBudget = 15000) {
    const rand = mulberry32(seed);
    const pairs = buildPairQueue(rand);
    const unplaced = new Set(LAYOUT.map((_, i) => i));
    const placed = [];
    const byId = new Map();
    let nodes = 0;

    function backtrack(pairIdx) {
      if (pairIdx >= pairs.length) return unplaced.size === 0;
      if (++nodes > nodeBudget) return false;

      const [tileA, tileB] = pairs[pairIdx];
      const freeSlots = [...unplaced].filter((id) => isSlotFree(id, placed, LAYOUT[id]));
      if (freeSlots.length < 2) return false;

      shuffle(freeSlots, rand);

      for (let i = 0; i < freeSlots.length; i++) {
        for (let j = i + 1; j < freeSlots.length; j++) {
          const s1 = freeSlots[i];
          const s2 = freeSlots[j];
          const t1 = makeTile(s1, tileA);
          const t2 = makeTile(s2, tileB);

          placed.push(t1, t2);
          byId.set(s1, t1);
          byId.set(s2, t2);
          unplaced.delete(s1);
          unplaced.delete(s2);

          if (backtrack(pairIdx + 1)) return true;

          placed.pop();
          placed.pop();
          byId.delete(s1);
          byId.delete(s2);
          unplaced.add(s1);
          unplaced.add(s2);
        }
      }
      return false;
    }

    if (!backtrack(0)) return null;
    return LAYOUT.map((_, i) => byId.get(i));
  }

  function dealShuffled(seed) {
    const rand = mulberry32(seed);
    const deck = shuffle(buildDeck(), rand);
    return LAYOUT.map((pos, i) => ({
      id: i,
      kind: deck[i].kind,
      rank: deck[i].rank,
      label: deck[i].label,
      key: deck[i].key,
      z: pos.z,
      x: pos.x,
      y: pos.y,
      removed: false,
    }));
  }

  function tick() {
    return new Promise((resolve) => setTimeout(resolve, 0));
  }

  async function generateAsync(seed = Date.now(), onProgress) {
    const report = (p, label) => {
      if (typeof onProgress === "function") onProgress(Math.min(1, Math.max(0, p)), label);
    };

    report(0.04, "Preparing deck…");
    await tick();

    const count = LAYOUT.length;
    const fallbackSeed = (seed ^ 0x9e3779b9) >>> 0;

    try {
      if (count % 2 !== 0 || buildDeck().length !== count) {
        report(1, "Done");
        return {
          tiles: dealShuffled(fallbackSeed),
          seed: fallbackSeed,
          layout: LAYOUT,
          solvable: false,
        };
      }

      for (let attempt = 0; attempt < 100; attempt++) {
        if (attempt % 3 === 0) {
          report(0.1 + (attempt / 100) * 0.7, "Dealing tiles…");
          await tick();
        }
        const trySeed = (seed + attempt * 7919) >>> 0;
        const tiles = dealGreedy(trySeed);
        if (tiles) {
          report(1, "Ready");
          return { tiles, seed: trySeed, layout: LAYOUT, solvable: true };
        }
      }

      for (let attempt = 0; attempt < 12; attempt++) {
        report(0.82 + attempt * 0.012, "Finding solvable layout…");
        await tick();
        const trySeed = (seed + attempt * 99991) >>> 0;
        const tiles = dealSolvable(trySeed, 25000);
        if (tiles) {
          report(1, "Ready");
          return { tiles, seed: trySeed, layout: LAYOUT, solvable: true };
        }
      }

      report(0.92, "Verifying shuffle…");
      await tick();
      const verified = tryVerifiedShuffle(fallbackSeed, 24);
      report(1, "Ready");
      return {
        tiles: verified.tiles,
        seed: verified.seed,
        layout: LAYOUT,
        solvable: verified.solvable,
      };
    } catch (err) {
      console.warn("Mahjong deal failed, using shuffled fallback", err);
    }

    report(0.94, "Finishing…");
    await tick();
    const verified = tryVerifiedShuffle(fallbackSeed, 24);
    report(1, "Ready");
    return {
      tiles: verified.tiles,
      seed: verified.seed,
      layout: LAYOUT,
      solvable: verified.solvable,
    };
  }

  function generate(seed = Date.now()) {
    const count = LAYOUT.length;
    const fallbackSeed = (seed ^ 0x9e3779b9) >>> 0;

    try {
      if (count % 2 !== 0 || buildDeck().length !== count) {
        return {
          tiles: dealShuffled(fallbackSeed),
          seed: fallbackSeed,
          layout: LAYOUT,
          solvable: false,
        };
      }

      for (let attempt = 0; attempt < 100; attempt++) {
        const trySeed = (seed + attempt * 7919) >>> 0;
        const tiles = dealGreedy(trySeed);
        if (tiles) {
          return { tiles, seed: trySeed, layout: LAYOUT, solvable: true };
        }
      }

      for (let attempt = 0; attempt < 12; attempt++) {
        const trySeed = (seed + attempt * 99991) >>> 0;
        const tiles = dealSolvable(trySeed, 25000);
        if (tiles) {
          return { tiles, seed: trySeed, layout: LAYOUT, solvable: true };
        }
      }

      const verified = tryVerifiedShuffle(fallbackSeed, 24);
      return {
        tiles: verified.tiles,
        seed: verified.seed,
        layout: LAYOUT,
        solvable: verified.solvable,
      };
    } catch (err) {
      console.warn("Mahjong deal failed, using shuffled fallback", err);
    }

    const verified = tryVerifiedShuffle(fallbackSeed, 24);
    return {
      tiles: verified.tiles,
      seed: verified.seed,
      layout: LAYOUT,
      solvable: verified.solvable,
    };
  }

  function remaining(tiles) {
    return tiles.filter((t) => !t.removed).length;
  }

  function isWon(tiles) {
    return remaining(tiles) === 0;
  }

  function freeTiles(tiles) {
    return tiles.filter((t) => isFree(t, tiles));
  }

  const DEFAULT_SOLVE_BUDGET = 100000;

  function tilesMask(tiles) {
    let mask = 0n;
    for (const t of tiles) {
      if (!t.removed) mask |= 1n << BigInt(t.id);
    }
    return mask;
  }

  function hasAvailableMove(tiles) {
    const free = freeTiles(tiles);
    for (let i = 0; i < free.length; i++) {
      for (let j = i + 1; j < free.length; j++) {
        if (canMatch(free[i], free[j])) return true;
      }
    }
    return false;
  }

  function isSolvable(tiles, options = {}) {
    const nodeBudget = options.nodeBudget ?? DEFAULT_SOLVE_BUDGET;
    const memo = new Map();
    let nodes = 0;

    function solve() {
      if (isWon(tiles)) return true;

      const mask = tilesMask(tiles);
      if (memo.has(mask)) return memo.get(mask);
      if (++nodes > nodeBudget) return null;

      const free = freeTiles(tiles);

      for (let i = 0; i < free.length; i++) {
        for (let j = i + 1; j < free.length; j++) {
          if (!canMatch(free[i], free[j])) continue;
          free[i].removed = true;
          free[j].removed = true;
          const result = solve();
          free[i].removed = false;
          free[j].removed = false;
          if (result === null) return null;
          if (result) {
            memo.set(mask, true);
            return true;
          }
        }
      }

      memo.set(mask, false);
      return false;
    }

    return solve();
  }

  async function isSolvableAsync(tiles, options = {}) {
    const nodeBudget = options.nodeBudget ?? DEFAULT_SOLVE_BUDGET;
    const yieldEvery = options.yieldEvery ?? 400;
    const memo = new Map();
    let nodes = 0;

    async function solve() {
      if (isWon(tiles)) return true;

      const mask = tilesMask(tiles);
      if (memo.has(mask)) return memo.get(mask);
      if (++nodes > nodeBudget) return null;
      if (nodes % yieldEvery === 0) await tick();

      const free = freeTiles(tiles);

      for (let i = 0; i < free.length; i++) {
        for (let j = i + 1; j < free.length; j++) {
          if (!canMatch(free[i], free[j])) continue;
          free[i].removed = true;
          free[j].removed = true;
          const result = await solve();
          free[i].removed = false;
          free[j].removed = false;
          if (result === null) return null;
          if (result) {
            memo.set(mask, true);
            return true;
          }
        }
      }

      memo.set(mask, false);
      return false;
    }

    return solve();
  }

  function findWinningMove(tiles, options = {}) {
    const free = freeTiles(tiles);
    for (let i = 0; i < free.length; i++) {
      for (let j = i + 1; j < free.length; j++) {
        if (!canMatch(free[i], free[j])) continue;
        free[i].removed = true;
        free[j].removed = true;
        const result = isSolvable(tiles, options);
        free[i].removed = false;
        free[j].removed = false;
        if (result === true) return [free[i].id, free[j].id];
      }
    }
    return null;
  }

  function findAnyMove(tiles) {
    const free = freeTiles(tiles);
    for (let i = 0; i < free.length; i++) {
      for (let j = i + 1; j < free.length; j++) {
        if (canMatch(free[i], free[j])) return [free[i].id, free[j].id];
      }
    }
    return null;
  }

  function tryVerifiedShuffle(baseSeed, maxAttempts = 24) {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const trySeed = (baseSeed + attempt * 31337) >>> 0;
      const tiles = dealShuffled(trySeed);
      const ok = isSolvable(tiles, { nodeBudget: 200000 });
      if (ok === true) return { tiles, seed: trySeed, solvable: true };
    }
    const lastSeed = (baseSeed + (maxAttempts - 1) * 31337) >>> 0;
    return { tiles: dealShuffled(lastSeed), seed: lastSeed, solvable: false };
  }

  function bounds(tiles) {
    const active = tiles.filter((t) => !t.removed);
    if (!active.length) {
      return { minX: 0, minY: 0, maxX: TILE_W, maxY: TILE_H, maxZ: 0 };
    }
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    let maxZ = 0;
    for (const t of active) {
      minX = Math.min(minX, t.x);
      minY = Math.min(minY, t.y);
      maxX = Math.max(maxX, t.x + TILE_W);
      maxY = Math.max(maxY, t.y + TILE_H);
      maxZ = Math.max(maxZ, t.z);
    }
    return { minX, minY, maxX, maxY, maxZ };
  }

  return {
    TILE_W,
    TILE_H,
    LAYOUT,
    TILE_COUNT: LAYOUT.length,
    generate,
    generateAsync,
    isFree,
    canMatch,
    remaining,
    isWon,
    freeTiles,
    hasAvailableMove,
    isSolvable,
    isSolvableAsync,
    findWinningMove,
    findAnyMove,
    bounds,
    tileLabel,
  };
})();
