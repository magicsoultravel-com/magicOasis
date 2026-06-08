(() => {
  const GAMES = ["sudoku", "mahjong"];
  const TITLES = {
    sudoku: "Magic Sudoku",
    mahjong: "Magic Mahjong",
  };

  const STORAGE_KEY = "magic-active-game";

  const titleEl = document.getElementById("game-title");
  const btnPrev = document.getElementById("game-prev");
  const btnNext = document.getElementById("game-next");
  const appEl = document.querySelector(".app");
  const sudokuPanel = document.getElementById("sudoku-panel");
  const mahjongPanel = document.getElementById("mahjong-panel");

  let active = localStorage.getItem(STORAGE_KEY);
  if (active && !GAMES.includes(active)) active = null;

  function gameIndex(id) {
    return GAMES.indexOf(id);
  }

  function applyVisibility() {
    if (!active) return;

    appEl.dataset.game = active;
    window.Games.active = active;
    document.title = TITLES[active];
    if (titleEl) titleEl.textContent = TITLES[active];

    if (sudokuPanel) sudokuPanel.hidden = active !== "sudoku";
    if (mahjongPanel) mahjongPanel.hidden = active !== "mahjong";

    if (btnPrev) btnPrev.disabled = GAMES.length <= 1;
    if (btnNext) btnNext.disabled = GAMES.length <= 1;
  }

  function switchTo(gameId) {
    if (!GAMES.includes(gameId) || gameId === active) return;

    if (active === "sudoku" && typeof window.SudokuApp?.saveGame === "function") {
      window.SudokuApp.saveGame();
    }
    if (active === "mahjong" && typeof window.MahjongApp?.saveGame === "function") {
      window.MahjongApp.saveGame();
    }

    active = gameId;
    localStorage.setItem(STORAGE_KEY, active);
    applyVisibility();

    if (active === "mahjong") {
      window.MahjongApp?.init?.();
    }
  }

  function cycle(delta) {
    const idx = gameIndex(active);
    const next = GAMES[(idx + delta + GAMES.length) % GAMES.length];
    switchTo(next);
  }

  btnPrev?.addEventListener("click", () => cycle(-1));
  btnNext?.addEventListener("click", () => cycle(1));

  window.Games = {
    get active() {
      return active;
    },
    set active(value) {
      active = value;
    },
    switchTo,
    isSudoku: () => active === "sudoku",
    isMahjong: () => active === "mahjong",
  };

  const hubOnLoad = window.Hub?.initHubOnLoad?.();

  if (!hubOnLoad) {
    if (!active) {
      active = "sudoku";
      localStorage.setItem(STORAGE_KEY, active);
    }
    applyVisibility();
    if (active === "mahjong") {
      window.MahjongApp?.init?.();
    }
  }
})();
