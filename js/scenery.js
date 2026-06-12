(() => {
  const STORAGE_TYPE_KEY = "magic-scenery-type";
  const STORAGE_MOTION_KEY = "magic-scenery-motion";
  const LEGACY_MOTION_KEY = "magic-hub-palm-motion";
  const UNIT_ASPECT = 80 / 120;

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

  let layoutQueued = false;

  function getSceneryMotion() {
    let saved = localStorage.getItem(STORAGE_MOTION_KEY);
    if (saved == null) {
      const legacy = localStorage.getItem(LEGACY_MOTION_KEY);
      if (legacy != null) {
        saved = legacy;
        localStorage.setItem(STORAGE_MOTION_KEY, legacy);
      }
    }
    return saved === "sway" ? "sway" : "static";
  }

  function getSceneryType() {
    const saved = localStorage.getItem(STORAGE_TYPE_KEY);
    return saved === "bamboo" ? "bamboo" : "palms";
  }

  function applySceneryType(type) {
    const value = type === "bamboo" ? "bamboo" : "palms";
    rootEl.dataset.scenery = value;
    localStorage.setItem(STORAGE_TYPE_KEY, value);
  }

  function applySceneryMotion(mode) {
    const value = mode === "sway" ? "sway" : "static";
    rootEl.dataset.sceneryMotion = value;
    localStorage.setItem(STORAGE_MOTION_KEY, value);
  }

  function getContentRect() {
    const app = document.querySelector(".app");
    if (!app) return null;

    let main = null;
    if (app.dataset.view === "hub") {
      main = document.querySelector("#hub-panel .hub-main");
    } else {
      const panels = app.querySelectorAll('[id$="-panel"]');
      for (const panel of panels) {
        if (panel.hidden) continue;
        main = panel.querySelector(".main");
        if (main) break;
      }
    }

    if (!main) main = app.querySelector(".main");
    return main?.getBoundingClientRect() ?? null;
  }

  function buildUnit(paths, index) {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("class", "app-scenery-unit");
    svg.setAttribute("viewBox", "0 0 80 120");
    svg.setAttribute("aria-hidden", "true");
    svg.style.setProperty("--unit-index", String(index));
    svg.innerHTML = paths;
    return svg;
  }

  function fillStrip(strip, paths, unitWidth, count) {
    if (!strip) return;
    strip.innerHTML = "";
    const fragment = document.createDocumentFragment();
    for (let i = 0; i < count; i += 1) {
      fragment.appendChild(buildUnit(paths, i));
    }
    strip.appendChild(fragment);
    strip.style.setProperty("--scenery-unit-width", `${unitWidth}px`);
  }

  function layoutScenery() {
    if (!sceneryEl) return;

    const rect = getContentRect();
    const height = rect?.height ?? Math.max(320, window.innerHeight * 0.55);
    const top = rect?.top ?? (window.innerHeight - height) / 2;
    const unitWidth = height * UNIT_ASPECT;
    const count = Math.max(3, Math.ceil(window.innerWidth / unitWidth) + 2);

    sceneryEl.style.top = `${top}px`;
    sceneryEl.style.height = `${height}px`;

    fillStrip(palmStrip, PALM_PATHS, unitWidth, count);
    fillStrip(bambooStrip, BAMBOO_PATHS, unitWidth, count);
  }

  function queueLayout() {
    if (layoutQueued) return;
    layoutQueued = true;
    requestAnimationFrame(() => {
      layoutQueued = false;
      layoutScenery();
    });
  }

  function initScenery() {
    applySceneryType(getSceneryType());
    applySceneryMotion(getSceneryMotion());
    layoutScenery();

    window.addEventListener("resize", queueLayout);
    window.addEventListener("orientationchange", queueLayout);

    const app = document.querySelector(".app");
    if (app && typeof ResizeObserver !== "undefined") {
      const observer = new ResizeObserver(queueLayout);
      observer.observe(app);
      app.querySelectorAll(".main, #hub-panel").forEach((el) => observer.observe(el));
    }
  }

  window.Scenery = {
    getSceneryType,
    applySceneryType,
    getSceneryMotion,
    applySceneryMotion,
    initScenery,
    relayout: queueLayout,
  };
})();
