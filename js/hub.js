(() => {
  const GAME_CATALOG = window.GameCatalog?.GAME_CATALOG ?? [];

  const STORAGE_KEY = "magic-active-game";
  const BRAND_TITLE = "magicOasis";

  const hubGrid = document.getElementById("hub-grid");
  const appEl = document.querySelector(".app");

  const ICONS = {
    sudoku: `<svg width="48" height="48" viewBox="0 0 48 48" aria-hidden="true"><rect x="6" y="6" width="36" height="36" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M18 6v36M30 6v36M6 18h36M6 30h36" stroke="currentColor" stroke-width="1.5"/><circle cx="12" cy="12" r="2" fill="currentColor"/><circle cx="24" cy="24" r="2" fill="currentColor"/><circle cx="36" cy="36" r="2" fill="currentColor"/></svg>`,
    mahjong: `<svg width="48" height="48" viewBox="0 0 48 48" aria-hidden="true"><rect x="10" y="8" width="28" height="34" rx="3" fill="none" stroke="currentColor" stroke-width="2"/><rect x="14" y="12" width="28" height="34" rx="3" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.5"/><circle cx="20" cy="20" r="3" fill="currentColor"/><circle cx="32" cy="32" r="3" fill="currentColor"/></svg>`,
    solitaire: `<svg width="48" height="48" viewBox="0 0 48 48" aria-hidden="true"><rect x="8" y="10" width="22" height="30" rx="2.5" fill="none" stroke="currentColor" stroke-width="1.8"/><rect x="18" y="8" width="22" height="30" rx="2.5" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M24 8v8M21 11h6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><circle cx="29" cy="22" r="3" fill="currentColor"/></svg>`,
    snake: `<svg width="48" height="48" viewBox="0 0 48 48" aria-hidden="true"><rect x="8" y="8" width="32" height="32" rx="3" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M14 20h4v4h-4zM18 24h4v4h-4zM22 28h4v4h-4zM26 24h4v4h-4zM30 20h4v4h-4z" fill="currentColor" opacity="0.85"/><circle cx="34" cy="22" r="2" fill="currentColor"/></svg>`,
    minesweeper: `<svg width="48" height="48" viewBox="0 0 48 48" aria-hidden="true"><rect x="10" y="10" width="28" height="28" rx="2" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M16 18l4 4-4 4M28 18l-4 4 4 4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="24" cy="32" r="2.5" fill="currentColor"/></svg>`,
    game2048: `<svg width="48" height="48" viewBox="0 0 48 48" aria-hidden="true"><rect x="8" y="8" width="32" height="32" rx="3" fill="none" stroke="currentColor" stroke-width="1.8"/><rect x="12" y="12" width="11" height="11" rx="2" fill="currentColor" opacity="0.35"/><rect x="25" y="12" width="11" height="11" rx="2" fill="currentColor" opacity="0.55"/><rect x="12" y="25" width="11" height="11" rx="2" fill="currentColor" opacity="0.75"/><text x="29" y="33" font-size="9" font-weight="700" fill="currentColor" font-family="system-ui,sans-serif">8</text></svg>`,
    slitherlink: `<svg width="48" height="48" viewBox="0 0 48 48" aria-hidden="true"><rect x="10" y="10" width="28" height="28" rx="2" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M10 18h8v12h12v-8h8" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><text x="16" y="28" font-size="8" font-weight="700" fill="currentColor" font-family="system-ui,sans-serif">3</text></svg>`,
    kakuro: `<svg width="48" height="48" viewBox="0 0 48 48" aria-hidden="true"><path d="M14 12h20v24H14z" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M14 12l20 24" stroke="currentColor" stroke-width="1.2"/><text x="26" y="22" font-size="7" fill="currentColor" font-family="system-ui,sans-serif">9</text><text x="16" y="32" font-size="7" fill="currentColor" font-family="system-ui,sans-serif">12</text></svg>`,
    reversi: `<svg width="48" height="48" viewBox="0 0 48 48" aria-hidden="true"><rect x="10" y="10" width="28" height="28" rx="2" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="20" cy="20" r="5" fill="currentColor"/><circle cx="28" cy="28" r="5" fill="none" stroke="currentColor" stroke-width="2"/></svg>`,
    soon: `<svg width="48" height="48" viewBox="0 0 48 48" aria-hidden="true"><rect x="10" y="10" width="28" height="28" rx="3" fill="none" stroke="currentColor" stroke-width="1.5" stroke-dasharray="4 3"/><path d="M24 20v8M20 24h8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`,
  };

  let hubVisible = false;

  function shouldShowHubOnLoad() {
    return !localStorage.getItem(STORAGE_KEY);
  }

  function setHubView(active) {
    if (!appEl) return;
    appEl.dataset.view = active ? "hub" : "game";
    if (active) {
      delete appEl.dataset.game;
      appEl.classList.add("is-ready");
      document.title = BRAND_TITLE;
    }
    hubVisible = active;
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
    if (!appEl) return;

    if (window.Games?.active === "sudoku" && typeof window.SudokuApp?.saveGame === "function") {
      window.SudokuApp.saveGame();
    }
    if (window.Games?.active === "mahjong" && typeof window.MahjongApp?.saveGame === "function") {
      window.MahjongApp.saveGame();
    }
    if (window.Games?.active === "solitaire" && typeof window.SolitaireApp?.saveGame === "function") {
      window.SolitaireApp.saveGame();
    }
    if (window.Games?.active === "snake" && typeof window.SnakeApp?.saveGame === "function") {
      window.SnakeApp.saveGame();
    }
    if (window.Games?.active === "minesweeper" && typeof window.MinesweeperApp?.saveGame === "function") {
      window.MinesweeperApp.saveGame();
    }
    if (window.Games?.active === "game2048" && typeof window.Game2048App?.saveGame === "function") {
      window.Game2048App.saveGame();
    }
    if (window.Games?.active === "slitherlink" && typeof window.SlitherlinkApp?.saveGame === "function") {
      window.SlitherlinkApp.saveGame();
    }
    if (window.Games?.active === "kakuro" && typeof window.KakuroApp?.saveGame === "function") {
      window.KakuroApp.saveGame();
    }
    if (window.Games?.active === "reversi" && typeof window.ReversiApp?.saveGame === "function") {
      window.ReversiApp.saveGame();
    }

    window.SudokuApp?.closeMenu?.();
    setHubView(true);
  }

  function hideHub() {
    setHubView(false);
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
    } else if (
      gameId === "mahjong" ||
      gameId === "solitaire" ||
      gameId === "snake" ||
      gameId === "minesweeper" ||
      gameId === "game2048" ||
      gameId === "slitherlink" ||
      gameId === "kakuro" ||
      gameId === "reversi"
    ) {
      appEl.classList.add("is-ready");
    }
  }

  function initHubOnLoad() {
    buildGrid();

    if (shouldShowHubOnLoad()) {
      setHubView(true);
      return true;
    }

    return false;
  }

  document.getElementById("btn-home")?.addEventListener("click", showHub);
  document.getElementById("btn-hub-appearance")?.addEventListener("click", () => {
    window.SudokuApp?.openSettings?.({ view: "hub", gameId: null });
  });

  window.Hub = {
    shouldShowHubOnLoad,
    showHub,
    hideHub,
    enterGame,
    initHubOnLoad,
    isVisible: () => hubVisible,
  };
})();
