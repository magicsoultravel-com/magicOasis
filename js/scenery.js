(() => {
  const STORAGE_TYPE_KEY = "magic-scenery-type";
  const STORAGE_MOTION_KEY = "magic-scenery-motion";
  const LEGACY_MOTION_KEY = "magic-hub-palm-motion";

  const appEl = document.querySelector(".app");

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
    if (appEl) appEl.dataset.scenery = value;
    localStorage.setItem(STORAGE_TYPE_KEY, value);
  }

  function applySceneryMotion(mode) {
    const value = mode === "sway" ? "sway" : "static";
    if (appEl) appEl.dataset.sceneryMotion = value;
    localStorage.setItem(STORAGE_MOTION_KEY, value);
  }

  function initScenery() {
    applySceneryType(getSceneryType());
    applySceneryMotion(getSceneryMotion());
  }

  window.Scenery = {
    getSceneryType,
    applySceneryType,
    getSceneryMotion,
    applySceneryMotion,
    initScenery,
  };
})();
