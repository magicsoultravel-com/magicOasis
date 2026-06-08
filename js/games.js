(() => {
  const GAMES = window.GameCatalog?.GAMES ?? ["sudoku", "mahjong", "solitaire"];
  const TITLES = window.GameCatalog?.TITLES ?? {
    sudoku: "magicSudoku",
    mahjong: "magicMahjong",
    solitaire: "magicSolitaire",
    snake: "magicSnake",
    minesweeper: "magicMinesweeper",
    game2048: "magic2048",
    slitherlink: "magicSlitherlink",
    kakuro: "magicKakuro",
    reversi: "magicReversi",
  };

  const STORAGE_KEY = "magic-active-game";

  const titleEl = document.getElementById("game-title");
  const btnPrev = document.getElementById("game-prev");
  const btnNext = document.getElementById("game-next");
  const appEl = document.querySelector(".app");
  const sudokuPanel = document.getElementById("sudoku-panel");
  const mahjongPanel = document.getElementById("mahjong-panel");
  const solitairePanel = document.getElementById("solitaire-panel");
  const snakePanel = document.getElementById("snake-panel");
  const minesweeperPanel = document.getElementById("minesweeper-panel");
  const game2048Panel = document.getElementById("game2048-panel");
  const slitherlinkPanel = document.getElementById("slitherlink-panel");
  const kakuroPanel = document.getElementById("kakuro-panel");
  const reversiPanel = document.getElementById("reversi-panel");

  const PANELS = {
    sudoku: sudokuPanel,
    mahjong: mahjongPanel,
    solitaire: solitairePanel,
    snake: snakePanel,
    minesweeper: minesweeperPanel,
    game2048: game2048Panel,
    slitherlink: slitherlinkPanel,
    kakuro: kakuroPanel,
    reversi: reversiPanel,
  };

  let active = localStorage.getItem(STORAGE_KEY);
  if (active && !GAMES.includes(active)) active = null;

  function gameIndex(id) {
    return GAMES.indexOf(id);
  }

  function saveActiveGame() {
    if (active === "sudoku") window.SudokuApp?.saveGame?.();
    if (active === "mahjong") window.MahjongApp?.saveGame?.();
    if (active === "solitaire") window.SolitaireApp?.saveGame?.();
    if (active === "snake") window.SnakeApp?.saveGame?.();
    if (active === "minesweeper") window.MinesweeperApp?.saveGame?.();
    if (active === "game2048") window.Game2048App?.saveGame?.();
    if (active === "slitherlink") window.SlitherlinkApp?.saveGame?.();
    if (active === "kakuro") window.KakuroApp?.saveGame?.();
    if (active === "reversi") window.ReversiApp?.saveGame?.();
  }

  function initGame(id) {
    if (id === "mahjong") window.MahjongApp?.init?.();
    if (id === "solitaire") window.SolitaireApp?.init?.();
    if (id === "snake") window.SnakeApp?.init?.();
    if (id === "minesweeper") window.MinesweeperApp?.init?.();
    if (id === "game2048") window.Game2048App?.init?.();
    if (id === "slitherlink") window.SlitherlinkApp?.init?.();
    if (id === "kakuro") window.KakuroApp?.init?.();
    if (id === "reversi") window.ReversiApp?.init?.();
  }

  function applyVisibility() {
    if (!active) return;

    appEl.dataset.view = "game";
    appEl.dataset.game = active;
    window.Games.active = active;
    document.title = TITLES[active];
    if (titleEl) titleEl.textContent = TITLES[active];

    for (const [id, panel] of Object.entries(PANELS)) {
      if (panel) panel.hidden = active !== id;
    }

    if (btnPrev) btnPrev.disabled = GAMES.length <= 1;
    if (btnNext) btnNext.disabled = GAMES.length <= 1;
  }

  function switchTo(gameId) {
    if (!GAMES.includes(gameId) || gameId === active) return;

    saveActiveGame();

    active = gameId;
    localStorage.setItem(STORAGE_KEY, active);
    applyVisibility();
    Settings.applyForGame(active);
    initGame(active);
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
    isSolitaire: () => active === "solitaire",
    isSnake: () => active === "snake",
    isMinesweeper: () => active === "minesweeper",
    isGame2048: () => active === "game2048",
    isSlitherlink: () => active === "slitherlink",
    isKakuro: () => active === "kakuro",
    isReversi: () => active === "reversi",
  };

  const hubOnLoad = window.Hub?.initHubOnLoad?.();

  if (!hubOnLoad) {
    if (!active) {
      active = "sudoku";
      localStorage.setItem(STORAGE_KEY, active);
    }
    applyVisibility();
    Settings.applyForGame(active);
    initGame(active);
  }
})();
