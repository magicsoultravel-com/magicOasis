(() => {
  const GAME_CATALOG = [
    { id: "sudoku", label: "Sudoku", available: true },
    { id: "mahjong", label: "Mahjong", available: true },
    { id: null, label: "Coming soon", available: false },
    { id: null, label: "Coming soon", available: false },
    { id: null, label: "Coming soon", available: false },
    { id: null, label: "Coming soon", available: false },
    { id: null, label: "Coming soon", available: false },
    { id: null, label: "Coming soon", available: false },
    { id: null, label: "Coming soon", available: false },
  ];

  const STORAGE_KEY = "magic-active-game";

  const hubPanel = document.getElementById("hub-panel");
  const hubGrid = document.getElementById("hub-grid");
  const appEl = document.querySelector(".app");

  const ICONS = {
    sudoku: `<svg width="48" height="48" viewBox="0 0 48 48" aria-hidden="true"><rect x="6" y="6" width="36" height="36" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M18 6v36M30 6v36M6 18h36M6 30h36" stroke="currentColor" stroke-width="1.5"/><circle cx="12" cy="12" r="2" fill="currentColor"/><circle cx="24" cy="24" r="2" fill="currentColor"/><circle cx="36" cy="36" r="2" fill="currentColor"/></svg>`,
    mahjong: `<svg width="48" height="48" viewBox="0 0 48 48" aria-hidden="true"><rect x="10" y="8" width="28" height="34" rx="3" fill="none" stroke="currentColor" stroke-width="2"/><rect x="14" y="12" width="28" height="34" rx="3" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.5"/><circle cx="20" cy="20" r="3" fill="currentColor"/><circle cx="32" cy="32" r="3" fill="currentColor"/></svg>`,
    soon: `<svg width="48" height="48" viewBox="0 0 48 48" aria-hidden="true"><rect x="10" y="10" width="28" height="28" rx="3" fill="none" stroke="currentColor" stroke-width="1.5" stroke-dasharray="4 3"/><path d="M24 20v8M20 24h8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`,
  };

  let hubVisible = false;

  function shouldShowHubOnLoad() {
    return !localStorage.getItem(STORAGE_KEY);
  }

  function buildGrid() {
    if (!hubGrid) return;
    hubGrid.innerHTML = "";

    GAME_CATALOG.forEach((game) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "hub-tile";
      btn.setAttribute("role", "listitem");

      if (game.available && game.id) {
        btn.dataset.game = game.id;
        btn.setAttribute("aria-label", game.label);
        btn.innerHTML = `${ICONS[game.id] || ICONS.soon}<span class="hub-tile-label">${game.label}</span>`;
        btn.addEventListener("click", () => enterGame(game.id));
      } else {
        btn.classList.add("hub-tile--soon");
        btn.disabled = true;
        btn.setAttribute("aria-disabled", "true");
        btn.setAttribute("aria-label", "Coming soon");
        btn.innerHTML = `${ICONS.soon}<span class="hub-tile-label">${game.label}</span>`;
      }

      hubGrid.appendChild(btn);
    });
  }

  function showHub() {
    if (!hubPanel || !appEl) return;

    if (window.Games?.active === "sudoku" && typeof window.SudokuApp?.saveGame === "function") {
      window.SudokuApp.saveGame();
    }
    if (window.Games?.active === "mahjong" && typeof window.MahjongApp?.saveGame === "function") {
      window.MahjongApp.saveGame();
    }

    window.SudokuApp?.closeMenu?.();

    hubVisible = true;
    document.title = "Magic Oasis";
    appEl.hidden = true;
    hubPanel.hidden = false;
    requestAnimationFrame(() => {
      hubPanel.classList.add("is-visible");
    });
  }

  function hideHub() {
    if (!hubPanel || !appEl) return;
    hubVisible = false;
    hubPanel.classList.remove("is-visible");
    hubPanel.hidden = true;
    appEl.hidden = false;
  }

  function enterGame(gameId) {
    if (!gameId) return;

    hideHub();

    const prev = window.Games?.active;

    if (prev !== gameId) {
      window.Games?.switchTo?.(gameId);
    }

    if (gameId === "sudoku") {
      if (!prev) {
        window.SudokuApp?.startFromHub?.();
      } else {
        appEl.classList.add("is-ready");
      }
    } else if (gameId === "mahjong") {
      appEl.classList.add("is-ready");
    }
  }

  function initHubOnLoad() {
    buildGrid();

    if (shouldShowHubOnLoad()) {
      hubVisible = true;
      document.title = "Magic Oasis";
      if (appEl) appEl.hidden = true;
      if (hubPanel) {
        hubPanel.hidden = false;
        requestAnimationFrame(() => hubPanel.classList.add("is-visible"));
      }
      return true;
    }

    return false;
  }

  document.getElementById("btn-home")?.addEventListener("click", showHub);

  window.Hub = {
    shouldShowHubOnLoad,
    showHub,
    hideHub,
    enterGame,
    initHubOnLoad,
    isVisible: () => hubVisible,
  };
})();
