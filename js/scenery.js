(() => {
  const STORAGE_BIOME_KEY = "magic-scenery-biome";
  const STORAGE_TYPE_KEY = "magic-scenery-type";
  const STORAGE_SKY_KEY = "magic-scenery-sky";
  const STORAGE_MOTION_KEY = "magic-scenery-motion";
  const LEGACY_MOTION_KEY = "magic-hub-palm-motion";
  const TILE_VIEW_WIDTH = 240;
  const TILE_VIEW_HEIGHT = 120;
  const TILE_ASPECT = TILE_VIEW_WIDTH / TILE_VIEW_HEIGHT;
  const BIOME_TILE_SCALE = 1 / 3;
  const SKY_TILE_SCALE = 0.22;
  const VIEWPORT_BAND_RATIO = 0.55;
  const SKY_BAND_RATIO = 0.22;
  const MAX_TILE_COUNT = 40;
  const DEBOUNCE_MS = 100;

  const BIOME_IDS = ["palms", "bamboo", "grass", "evergreen", "cherry", "autumn", "desert", "none"];
  const SKY_IDS = ["none", "stars", "clouds", "moon", "sunset"];

  const sceneryEl = document.getElementById("app-scenery");
  const rootEl = document.documentElement;

  const PALM_PATHS =
    '<path fill="currentColor" d="M38 54 C36 78 37 100 39 118 L43 118 C45 100 46 78 44 54 Z"/>' +
    '<path fill="currentColor" d="M41 50 C18 44 6 32 2 16 C20 34 34 46 41 50 Z"/>' +
    '<path fill="currentColor" d="M41 50 C64 42 76 28 78 10 C60 28 48 44 41 50 Z"/>' +
    '<path fill="currentColor" d="M41 50 C28 28 26 8 30 0 C34 18 38 38 41 50 Z"/>' +
    '<path fill="currentColor" d="M41 50 C54 28 58 8 54 0 C50 18 44 38 41 50 Z"/>' +
    '<path fill="currentColor" d="M41 50 C12 52 0 62 0 74 C14 58 30 52 41 50 Z"/>' +
    '<path fill="currentColor" d="M41 50 C70 52 80 64 80 76 C66 58 52 52 41 50 Z"/>';

  const BAMBOO_PATHS =
    '<path fill="currentColor" d="M13 118 L23 118 L22 44 L12 44 Z"/>' +
    '<path fill="currentColor" d="M10 60 H26 V64 H10 Z"/>' +
    '<path fill="currentColor" d="M10 80 H26 V84 H10 Z"/>' +
    '<path fill="currentColor" d="M10 100 H26 V104 H10 Z"/>' +
    '<path fill="currentColor" d="M22 50 C28 44 34 36 36 26 C30 34 24 42 20 48 Z"/>' +
    '<path fill="currentColor" d="M31 118 L41 118 L40 28 L30 28 Z"/>' +
    '<path fill="currentColor" d="M28 44 H44 V48 H28 Z"/>' +
    '<path fill="currentColor" d="M28 64 H44 V68 H28 Z"/>' +
    '<path fill="currentColor" d="M28 84 H44 V88 H28 Z"/>' +
    '<path fill="currentColor" d="M28 104 H44 V108 H28 Z"/>' +
    '<path fill="currentColor" d="M40 34 C46 28 52 20 54 10 C48 18 42 26 38 32 Z"/>' +
    '<path fill="currentColor" d="M40 22 C48 16 56 8 58 0 C52 8 44 16 38 22 Z"/>' +
    '<path fill="currentColor" d="M51 118 L61 118 L60 50 L50 50 Z"/>' +
    '<path fill="currentColor" d="M48 68 H64 V72 H48 Z"/>' +
    '<path fill="currentColor" d="M48 88 H64 V92 H48 Z"/>' +
    '<path fill="currentColor" d="M58 58 C64 52 70 44 72 34 C66 42 60 50 56 56 Z"/>';

  const GRASS_TUFT =
    '<path fill="currentColor" d="M2 14 C3 9 4 5 5 2 C6 6 7 10 8 14 Z"/>' +
    '<path fill="currentColor" d="M9 14 C10 8 11 4 13 0 C14 5 15 9 16 14 Z"/>';

  const GRASS_TUFT_TALL =
    '<path fill="currentColor" d="M2 22 C4 14 5 8 7 2 C8 8 10 14 12 22 Z"/>' +
    '<path fill="currentColor" d="M13 22 C15 12 17 6 20 0 C21 7 23 14 25 22 Z"/>' +
    '<path fill="currentColor" d="M26 22 C27 16 28 10 29 6 C30 10 31 16 32 22 Z"/>';

  const TILE_GRASS =
    `<g class="app-scenery-grass" transform="translate(34, 106)">${GRASS_TUFT}</g>` +
    `<g class="app-scenery-grass" transform="translate(118, 108) scale(0.85)" opacity="0.85">${GRASS_TUFT}</g>` +
    `<g class="app-scenery-grass" transform="translate(200, 106) scale(-1, 1)">${GRASS_TUFT}</g>`;

  const EVERGREEN_PATHS =
    '<path fill="currentColor" d="M36 118 L42 118 L42 94 L36 94 Z"/>' +
    '<path fill="currentColor" d="M18 98 L60 98 L39 54 Z"/>' +
    '<path fill="currentColor" d="M22 74 L56 74 L39 36 Z"/>' +
    '<path fill="currentColor" d="M26 52 L52 52 L39 18 Z"/>';

  const CHERRY_PATHS =
    '<path fill="currentColor" d="M36 118 L40 118 L39 72 L37 72 Z"/>' +
    '<path fill="currentColor" d="M38 68 C26 66 14 54 10 36 C22 50 32 60 38 64 Z"/>' +
    '<path fill="currentColor" d="M38 68 C50 64 62 50 66 32 C54 46 44 58 38 62 Z"/>' +
    '<circle fill="currentColor" cx="10" cy="32" r="5"/>' +
    '<circle fill="currentColor" cx="20" cy="24" r="4"/>' +
    '<circle fill="currentColor" cx="30" cy="30" r="4.5"/>' +
    '<circle fill="currentColor" cx="66" cy="28" r="5"/>' +
    '<circle fill="currentColor" cx="56" cy="22" r="4"/>' +
    '<circle fill="currentColor" cx="46" cy="28" r="4.5"/>';

  const AUTUMN_PATHS =
    '<path fill="currentColor" d="M37 118 L41 118 L40 78 L38 78 Z"/>' +
    '<path fill="currentColor" d="M39 76 C16 74 2 58 0 36 C14 56 26 66 39 70 Z"/>' +
    '<path fill="currentColor" d="M39 76 C62 72 76 54 78 32 C64 52 52 64 39 68 Z"/>' +
    '<ellipse fill="currentColor" cx="28" cy="116" rx="3" ry="1.5" opacity="0.8"/>' +
    '<ellipse fill="currentColor" cx="48" cy="117" rx="2.5" ry="1.5" opacity="0.7"/>' +
    '<ellipse fill="currentColor" cx="58" cy="115" rx="3" ry="1.5" opacity="0.75"/>';

  const DESERT_PATHS =
    '<path fill="currentColor" d="M34 118 L44 118 L43 52 L35 52 Z"/>' +
    '<path fill="currentColor" d="M44 68 L60 68 L60 58 L52 58 L52 42 L44 42 L44 58 L50 58 L50 68 Z"/>' +
    '<path fill="currentColor" d="M10 118 C10 98 6 86 4 86 C2 86 0 98 0 118 Z"/>' +
    '<path fill="currentColor" d="M18 118 C18 104 15 94 13 94 C11 94 9 104 9 118 Z"/>' +
    '<path fill="currentColor" d="M66 118 C66 100 62 88 60 88 C58 88 56 100 56 118 Z"/>';

  const SKY_STARS_TILE =
    '<circle fill="currentColor" cx="18" cy="16" r="1.2"/>' +
    '<circle fill="currentColor" cx="42" cy="28" r="0.9"/>' +
    '<circle fill="currentColor" cx="68" cy="14" r="1.1"/>' +
    '<circle fill="currentColor" cx="96" cy="32" r="0.8"/>' +
    '<circle fill="currentColor" cx="124" cy="18" r="1"/>' +
    '<circle fill="currentColor" cx="152" cy="26" r="1.2"/>' +
    '<circle fill="currentColor" cx="178" cy="12" r="0.9"/>' +
    '<circle fill="currentColor" cx="206" cy="30" r="1.1"/>' +
    '<circle fill="currentColor" cx="228" cy="20" r="0.8"/>';

  const SKY_CLOUDS_TILE =
    '<path fill="currentColor" d="M8 42 C8 32 18 26 30 28 C32 18 46 14 58 20 C70 16 84 24 82 36 C90 36 98 42 96 50 C94 58 82 60 70 58 L18 58 C10 58 6 50 8 42 Z"/>' +
    '<path fill="currentColor" opacity="0.75" d="M120 36 C120 28 128 24 138 26 C140 18 154 16 164 22 C174 18 186 26 184 36 C192 36 198 42 196 48 C194 54 184 56 174 54 L126 54 C118 54 114 48 120 36 Z"/>' +
    '<path fill="currentColor" opacity="0.6" d="M188 44 C188 36 196 32 206 34 C208 26 220 24 228 30 C234 28 240 34 238 42 C242 44 244 48 242 52 C240 56 232 58 224 56 L192 56 C186 56 184 50 188 44 Z"/>';

  const SKY_MOON_TILE =
    '<path fill="currentColor" d="M120 24 A20 20 0 1 1 120 68 A15 15 0 1 0 120 24 Z"/>' +
    '<circle fill="currentColor" cx="48" cy="20" r="1"/>' +
    '<circle fill="currentColor" cx="72" cy="34" r="0.8"/>' +
    '<circle fill="currentColor" cx="168" cy="18" r="1.1"/>' +
    '<circle fill="currentColor" cx="192" cy="32" r="0.9"/>' +
    '<circle fill="currentColor" cx="210" cy="22" r="0.8"/>';

  const SKY_SUNSET_TILE =
    '<path fill="currentColor" opacity="0.5" d="M0 52 C40 48 80 54 120 50 C160 46 200 52 240 48 L240 60 L0 60 Z"/>' +
    '<path fill="currentColor" opacity="0.35" d="M20 44 C60 40 100 46 140 42 C180 38 210 44 240 40 L240 52 L20 52 Z"/>';

  function composeThreeTree(paths, includeGrass = true) {
    return (
      `<g transform="translate(4, 0)">${paths}</g>` +
      `<g transform="translate(92, 18) scale(0.62)" opacity="0.85">${paths}</g>` +
      `<g transform="translate(236, 0) scale(-1, 1)">${paths}</g>` +
      (includeGrass ? TILE_GRASS : "")
    );
  }

  const PALM_TILE = composeThreeTree(PALM_PATHS);
  const BAMBOO_TILE = composeThreeTree(BAMBOO_PATHS);
  const EVERGREEN_TILE = composeThreeTree(EVERGREEN_PATHS);
  const CHERRY_TILE = composeThreeTree(CHERRY_PATHS);
  const AUTUMN_TILE = composeThreeTree(AUTUMN_PATHS);
  const DESERT_TILE = composeThreeTree(DESERT_PATHS, false);

  const GRASS_TILE =
    `<g transform="translate(34, 100)">${GRASS_TUFT_TALL}</g>` +
    `<g transform="translate(118, 96) scale(0.75)" opacity="0.9">${GRASS_TUFT_TALL}</g>` +
    `<g transform="translate(200, 100) scale(-1, 1)">${GRASS_TUFT_TALL}</g>`;

  const biomeStrips = {
    palms: sceneryEl?.querySelector(".app-scenery-strip--palms"),
    bamboo: sceneryEl?.querySelector(".app-scenery-strip--bamboo"),
    grass: sceneryEl?.querySelector(".app-scenery-strip--grass"),
    evergreen: sceneryEl?.querySelector(".app-scenery-strip--evergreen"),
    cherry: sceneryEl?.querySelector(".app-scenery-strip--cherry"),
    autumn: sceneryEl?.querySelector(".app-scenery-strip--autumn"),
    desert: sceneryEl?.querySelector(".app-scenery-strip--desert"),
  };

  const skyStrips = {
    stars: sceneryEl?.querySelector(".app-scenery-strip--sky-stars"),
    clouds: sceneryEl?.querySelector(".app-scenery-strip--sky-clouds"),
    moon: sceneryEl?.querySelector(".app-scenery-strip--sky-moon"),
    sunset: sceneryEl?.querySelector(".app-scenery-strip--sky-sunset"),
  };

  const BIOME_TILES = {
    palms: PALM_TILE,
    bamboo: BAMBOO_TILE,
    grass: GRASS_TILE,
    evergreen: EVERGREEN_TILE,
    cherry: CHERRY_TILE,
    autumn: AUTUMN_TILE,
    desert: DESERT_TILE,
  };

  const SKY_TILES = {
    stars: SKY_STARS_TILE,
    clouds: SKY_CLOUDS_TILE,
    moon: SKY_MOON_TILE,
    sunset: SKY_SUNSET_TILE,
  };

  let layoutQueued = false;
  let debounceTimer = null;
  let sceneryInitialized = false;
  let lastBiomeLayout = null;
  let lastSkyLayout = null;

  function readMotion() {
    const legacy = window.StorageSanitize?.getString?.(LEGACY_MOTION_KEY, ["static", "sway"], null);
    if (legacy != null && !localStorage.getItem(STORAGE_MOTION_KEY)) {
      try {
        localStorage.setItem(STORAGE_MOTION_KEY, legacy);
      } catch {
        /* storage unavailable */
      }
    }
    return (
      window.StorageSanitize?.getString?.(STORAGE_MOTION_KEY, ["static", "sway"], "static") ?? "static"
    );
  }

  function getSceneryMotion() {
    return readMotion() === "sway" ? "sway" : "static";
  }

  function migrateBiomeStorage() {
    try {
      if (localStorage.getItem(STORAGE_BIOME_KEY)) return;
      const legacy = window.StorageSanitize?.getString?.(
        STORAGE_TYPE_KEY,
        ["palms", "bamboo", "grass", "evergreen", "cherry", "autumn", "desert"],
        null
      );
      if (legacy) localStorage.setItem(STORAGE_BIOME_KEY, legacy);
    } catch {
      /* storage unavailable */
    }
  }

  function normalizeBiome(value) {
    if (value === "none" || BIOME_IDS.includes(value)) return value;
    return "palms";
  }

  function normalizeSky(value) {
    if (value === "none" || SKY_IDS.includes(value)) return value;
    return "none";
  }

  function getSceneryBiome() {
    migrateBiomeStorage();
    const raw =
      window.StorageSanitize?.getString?.(STORAGE_BIOME_KEY, BIOME_IDS, "palms") ?? "palms";
    return normalizeBiome(raw);
  }

  function getScenerySky() {
    const raw = window.StorageSanitize?.getString?.(STORAGE_SKY_KEY, SKY_IDS, "none") ?? "none";
    return normalizeSky(raw);
  }

  function getSceneryType() {
    const biome = getSceneryBiome();
    return biome === "none" ? "palms" : biome;
  }

  function applySceneryBiome(value) {
    const biome = normalizeBiome(value);
    rootEl.dataset.sceneryBiome = biome;
    delete rootEl.dataset.scenery;
    try {
      localStorage.setItem(STORAGE_BIOME_KEY, biome);
    } catch {
      /* storage unavailable */
    }
    lastBiomeLayout = null;
    queueLayout();
  }

  function applyScenerySky(value) {
    const sky = normalizeSky(value);
    rootEl.dataset.scenerySky = sky;
    try {
      localStorage.setItem(STORAGE_SKY_KEY, sky);
    } catch {
      /* storage unavailable */
    }
    lastSkyLayout = null;
    queueLayout();
  }

  function applySceneryType(type) {
    applySceneryBiome(type === "none" ? "none" : normalizeBiome(type));
  }

  function applySceneryMotion(mode) {
    const value = mode === "sway" ? "sway" : "static";
    rootEl.dataset.sceneryMotion = value;
    try {
      localStorage.setItem(STORAGE_MOTION_KEY, value);
    } catch {
      /* storage unavailable */
    }
  }

  function buildTile(tileMarkup, index, layer) {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("class", layer === "sky" ? "app-scenery-tile app-scenery-tile--sky" : "app-scenery-tile");
    svg.setAttribute("viewBox", `0 0 ${TILE_VIEW_WIDTH} ${TILE_VIEW_HEIGHT}`);
    svg.setAttribute("aria-hidden", "true");
    svg.style.setProperty("--unit-index", String(index));
    svg.innerHTML = tileMarkup;
    return svg;
  }

  function clearStrip(strip) {
    if (strip) strip.innerHTML = "";
  }

  function clearAllBiomeStrips() {
    Object.values(biomeStrips).forEach(clearStrip);
  }

  function clearAllSkyStrips() {
    Object.values(skyStrips).forEach(clearStrip);
  }

  function fillStrip(strip, tileMarkup, tileWidth, tileHeight, count, layer) {
    if (!strip || count < 1 || tileWidth < 1 || tileHeight < 1 || !Number.isFinite(count)) return;
    strip.innerHTML = "";
    const fragment = document.createDocumentFragment();
    for (let i = 0; i < count; i += 1) {
      fragment.appendChild(buildTile(tileMarkup, i, layer));
    }
    strip.appendChild(fragment);
    strip.style.setProperty("--scenery-unit-width", `${tileWidth}px`);
    strip.style.setProperty("--scenery-tile-height", `${tileHeight}px`);
  }

  function tileCount(tileWidth) {
    const count = Math.min(MAX_TILE_COUNT, Math.max(3, Math.ceil(window.innerWidth / tileWidth) + 2));
    if (!Number.isFinite(count) || count < 1 || count > MAX_TILE_COUNT) return 0;
    return count;
  }

  function layoutBiomeStripe() {
    const biome = getSceneryBiome();
    if (biome === "none") {
      clearAllBiomeStrips();
      lastBiomeLayout = "none";
      return;
    }

    const bandHeight = Math.max(200, window.innerHeight * VIEWPORT_BAND_RATIO);
    const tileHeight = Math.max(1, bandHeight * BIOME_TILE_SCALE);
    const tileWidth = Math.max(1, tileHeight * TILE_ASPECT);
    const count = tileCount(tileWidth);
    if (!count) return;

    const layoutKey = `${tileWidth}|${tileHeight}|${count}|${biome}|${window.innerWidth}|${window.innerHeight}`;
    if (lastBiomeLayout === layoutKey) return;
    lastBiomeLayout = layoutKey;

    clearAllBiomeStrips();
    const strip = biomeStrips[biome];
    const tile = BIOME_TILES[biome];
    if (strip && tile) fillStrip(strip, tile, tileWidth, tileHeight, count, "biome");
  }

  function layoutSkyBand() {
    const sky = getScenerySky();
    if (sky === "none") {
      clearAllSkyStrips();
      lastSkyLayout = "none";
      return;
    }

    const bandHeight = Math.max(120, window.innerHeight * SKY_BAND_RATIO);
    const tileHeight = Math.max(1, bandHeight * SKY_TILE_SCALE);
    const tileWidth = Math.max(1, tileHeight * TILE_ASPECT);
    const count = tileCount(tileWidth);
    if (!count) return;

    const layoutKey = `${tileWidth}|${tileHeight}|${count}|${sky}|${window.innerWidth}|${window.innerHeight}`;
    if (lastSkyLayout === layoutKey) return;
    lastSkyLayout = layoutKey;

    clearAllSkyStrips();
    const strip = skyStrips[sky];
    const tile = SKY_TILES[sky];
    if (strip && tile) fillStrip(strip, tile, tileWidth, tileHeight, count, "sky");
  }

  function layoutScenery() {
    if (!sceneryEl) return;

    try {
      if (sceneryEl.hidden) return;
      layoutSkyBand();
      layoutBiomeStripe();
    } catch (err) {
      console.warn("Scenery layout failed:", err);
    }
  }

  function runLayout() {
    layoutQueued = false;
    layoutScenery();
  }

  function queueLayout() {
    if (layoutQueued) return;
    layoutQueued = true;
    requestAnimationFrame(runLayout);
  }

  function debouncedQueueLayout() {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      debounceTimer = null;
      queueLayout();
    }, DEBOUNCE_MS);
  }

  function hideScenery() {
    if (sceneryEl) sceneryEl.hidden = true;
    lastBiomeLayout = null;
    lastSkyLayout = null;
  }

  function showScenery() {
    if (sceneryEl) sceneryEl.hidden = false;
    lastBiomeLayout = null;
    lastSkyLayout = null;
    queueLayout();
  }

  function initScenery() {
    applySceneryBiome(getSceneryBiome());
    applyScenerySky(getScenerySky());
    applySceneryMotion(getSceneryMotion());
    showScenery();

    if (sceneryInitialized) return;
    sceneryInitialized = true;

    window.addEventListener("resize", debouncedQueueLayout);
    window.addEventListener("orientationchange", debouncedQueueLayout);
  }

  function relayout() {
    lastBiomeLayout = null;
    lastSkyLayout = null;
    queueLayout();
  }

  window.Scenery = {
    getSceneryBiome,
    applySceneryBiome,
    getScenerySky,
    applyScenerySky,
    getSceneryType,
    applySceneryType,
    getSceneryMotion,
    applySceneryMotion,
    initScenery,
    relayout,
    hideScenery,
    showScenery,
  };
})();
