(() => {
  const STORAGE_TYPE_KEY = "magic-scenery-type";
  const STORAGE_MOTION_KEY = "magic-scenery-motion";
  const LEGACY_MOTION_KEY = "magic-hub-palm-motion";
  const TILE_VIEW_WIDTH = 240;
  const TILE_VIEW_HEIGHT = 120;
  const TILE_ASPECT = TILE_VIEW_WIDTH / TILE_VIEW_HEIGHT;
  const TILE_SIZE_SCALE = 1 / 3;
  const VIEWPORT_BAND_RATIO = 0.55;
  const MAX_TILE_COUNT = 40;
  const DEBOUNCE_MS = 100;

  const sceneryEl = document.getElementById("app-scenery");
  const palmStrip = sceneryEl?.querySelector(".app-scenery-strip--palms");
  const bambooStrip = sceneryEl?.querySelector(".app-scenery-strip--bamboo");
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
    '<path fill="currentColor" d="M17 118 L21 118 L20 48 L16 48 Z"/>' +
    '<path fill="currentColor" d="M14 62 H24 V64 H14 Z"/>' +
    '<path fill="currentColor" d="M14 82 H24 V84 H14 Z"/>' +
    '<path fill="currentColor" d="M14 100 H24 V102 H14 Z"/>' +
    '<path fill="currentColor" d="M21 54 C26 50 30 44 32 36 C28 42 24 48 21 52 Z"/>' +
    '<path fill="currentColor" d="M35 118 L39 118 L38 32 L34 32 Z"/>' +
    '<path fill="currentColor" d="M32 48 H42 V50 H32 Z"/>' +
    '<path fill="currentColor" d="M32 68 H42 V70 H32 Z"/>' +
    '<path fill="currentColor" d="M32 88 H42 V90 H32 Z"/>' +
    '<path fill="currentColor" d="M32 108 H42 V110 H32 Z"/>' +
    '<path fill="currentColor" d="M39 38 C44 34 48 28 50 20 C46 26 42 32 39 36 Z"/>' +
    '<path fill="currentColor" d="M39 28 C46 24 52 18 54 10 C50 16 44 22 39 26 Z"/>' +
    '<path fill="currentColor" d="M55 118 L59 118 L58 55 L54 55 Z"/>' +
    '<path fill="currentColor" d="M52 72 H62 V74 H52 Z"/>' +
    '<path fill="currentColor" d="M52 92 H62 V94 H52 Z"/>' +
    '<path fill="currentColor" d="M58 62 C63 58 66 52 68 46 C64 50 60 56 58 60 Z"/>';

  const PALM_TILE =
    `<g transform="translate(4, 0)">${PALM_PATHS}</g>` +
    `<g transform="translate(92, 18) scale(0.62)" opacity="0.85">${PALM_PATHS}</g>` +
    `<g transform="translate(236, 0) scale(-1, 1)">${PALM_PATHS}</g>`;

  const BAMBOO_TILE =
    `<g transform="translate(0, 0)">${BAMBOO_PATHS}</g>` +
    `<g transform="translate(88, 14) scale(0.65)" opacity="0.88">${BAMBOO_PATHS}</g>` +
    `<g transform="translate(160, 0) scale(-1, 1)">${BAMBOO_PATHS}</g>`;

  let layoutQueued = false;
  let debounceTimer = null;
  let sceneryInitialized = false;
  let lastLayout = null;

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

  function getSceneryType() {
    return (
      window.StorageSanitize?.getString?.(STORAGE_TYPE_KEY, ["palms", "bamboo"], "palms") ?? "palms"
    );
  }

  function applySceneryType(type) {
    const value = type === "bamboo" ? "bamboo" : "palms";
    rootEl.dataset.scenery = value;
    try {
      localStorage.setItem(STORAGE_TYPE_KEY, value);
    } catch {
      /* storage unavailable */
    }
    lastLayout = null;
    queueLayout();
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

  function buildTile(tileMarkup, index) {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("class", "app-scenery-tile");
    svg.setAttribute("viewBox", `0 0 ${TILE_VIEW_WIDTH} ${TILE_VIEW_HEIGHT}`);
    svg.setAttribute("aria-hidden", "true");
    svg.style.setProperty("--unit-index", String(index));
    svg.innerHTML = tileMarkup;
    return svg;
  }

  function clearStrip(strip) {
    if (strip) strip.innerHTML = "";
  }

  function fillStrip(strip, tileMarkup, tileWidth, tileHeight, count) {
    if (!strip || count < 1 || tileWidth < 1 || tileHeight < 1 || !Number.isFinite(count)) return;
    strip.innerHTML = "";
    const fragment = document.createDocumentFragment();
    for (let i = 0; i < count; i += 1) {
      fragment.appendChild(buildTile(tileMarkup, i));
    }
    strip.appendChild(fragment);
    strip.style.setProperty("--scenery-unit-width", `${tileWidth}px`);
    strip.style.setProperty("--scenery-tile-height", `${tileHeight}px`);
  }

  function layoutScenery() {
    if (!sceneryEl) return;

    try {
      if (sceneryEl.hidden) return;

      const bandHeight = Math.max(200, window.innerHeight * VIEWPORT_BAND_RATIO);
      const tileHeight = Math.max(1, bandHeight * TILE_SIZE_SCALE);
      const tileWidth = Math.max(1, tileHeight * TILE_ASPECT);
      let count = Math.min(
        MAX_TILE_COUNT,
        Math.max(3, Math.ceil(window.innerWidth / tileWidth) + 2)
      );

      if (!Number.isFinite(count) || count < 1 || count > MAX_TILE_COUNT) {
        console.warn("Scenery layout aborted: invalid tile count", count);
        return;
      }

      const type = getSceneryType();
      const layoutKey = `${tileWidth}|${tileHeight}|${count}|${type}|${window.innerWidth}|${window.innerHeight}`;
      if (lastLayout === layoutKey) {
        return;
      }
      lastLayout = layoutKey;

      if (type === "bamboo") {
        clearStrip(palmStrip);
        fillStrip(bambooStrip, BAMBOO_TILE, tileWidth, tileHeight, count);
      } else {
        clearStrip(bambooStrip);
        fillStrip(palmStrip, PALM_TILE, tileWidth, tileHeight, count);
      }
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
    lastLayout = null;
  }

  function showScenery() {
    if (sceneryEl) sceneryEl.hidden = false;
    lastLayout = null;
    queueLayout();
  }

  function initScenery() {
    applySceneryType(getSceneryType());
    applySceneryMotion(getSceneryMotion());
    showScenery();

    if (sceneryInitialized) return;
    sceneryInitialized = true;

    window.addEventListener("resize", debouncedQueueLayout);
    window.addEventListener("orientationchange", debouncedQueueLayout);
  }

  function relayout() {
    lastLayout = null;
    queueLayout();
  }

  window.Scenery = {
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
