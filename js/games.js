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
    quotes: "magicQuotes",
  };

  const STORAGE_KEY = "magic-active-game";
  const QUOTE_FOOTER_KEY = "magic-quote-footer-enabled";

  const MINI_GAMES = new Set(["snake", "minesweeper", "game2048", "slitherlink", "kakuro", "reversi"]);

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
  const quotesPanel = document.getElementById("quotes-panel");

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
    quotes: quotesPanel,
  };

  const scriptPromises = new Map();
  const loadedStyles = new Set();

  let active = window.StorageSanitize?.getString?.(STORAGE_KEY, GAMES, null) ?? null;

  function loadStylesheet(href, id) {
    if (loadedStyles.has(id) || document.getElementById(id)) {
      loadedStyles.add(id);
      return;
    }
    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href = href;
    document.head.appendChild(link);
    loadedStyles.add(id);
  }

  function ensureGameStyles(gameId) {
    if (gameId === "mahjong") loadStylesheet("css/mahjong.css", "game-css-mahjong");
    else if (gameId === "solitaire") loadStylesheet("css/solitaire.css", "game-css-solitaire");
    else if (gameId === "quotes") loadStylesheet("css/quotes.css", "game-css-quotes");
    else if (MINI_GAMES.has(gameId)) loadStylesheet("css/mini-games.css", "game-css-mini-games");
  }

  function injectScript(src) {
    if (scriptPromises.has(src)) return scriptPromises.get(src);
    const promise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = src;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error(`Failed to load ${src}`));
      document.head.appendChild(script);
    });
    scriptPromises.set(src, promise);
    return promise;
  }

  function ensureGameAssets(gameId) {
    ensureGameStyles(gameId);
    if (gameId === "kakuro" && !window.KakuroPuzzles) {
      return injectScript("js/kakuro-puzzles.js");
    }
    return Promise.resolve();
  }

  function isQuoteFooterEnabled() {
    try {
      return localStorage.getItem(QUOTE_FOOTER_KEY) !== "0";
    } catch {
      return true;
    }
  }

  function maybeInitQuoteFooter(gameId) {
    if (gameId === "quotes" || !isQuoteFooterEnabled()) {
      window.QuoteFooter?.applyVisibility?.();
      return;
    }
    window.QuoteFooter?.init?.();
    window.QuoteFooter?.applyVisibility?.();
  }

  function scheduleBootFallback() {
    setTimeout(() => {
      const app = document.querySelector(".app");
      const splash = document.getElementById("quote-splash");
      const splashActive = splash && !splash.hidden;
      if (app && !app.classList.contains("is-ready") && !splashActive) {
        app.classList.add("is-ready");
        window.Scenery?.showScenery?.();
      }
    }, 2000);
  }

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
    if (active === "quotes") window.QuotesApp?.saveGame?.();
  }

  function runGameInit(id) {
    if (id === "mahjong") window.MahjongApp?.init?.();
    if (id === "solitaire") window.SolitaireApp?.init?.();
    if (id === "snake") window.SnakeApp?.init?.();
    if (id === "minesweeper") window.MinesweeperApp?.init?.();
    if (id === "game2048") window.Game2048App?.init?.();
    if (id === "slitherlink") window.SlitherlinkApp?.init?.();
    if (id === "kakuro") window.KakuroApp?.init?.();
    if (id === "reversi") window.ReversiApp?.init?.();
    if (id === "quotes") window.QuotesApp?.init?.();
  }

  function initGame(id) {
    void ensureGameAssets(id).then(() => runGameInit(id));
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

    ensureGameStyles(active);
  }

  function switchTo(gameId) {
    if (!GAMES.includes(gameId) || gameId === active) return;

    saveActiveGame();

    active = gameId;
    localStorage.setItem(STORAGE_KEY, active);
    if (gameId === "quotes") window.SudokuApp?.setZen?.(false);
    applyVisibility();
    window.SudokuApp?.syncCatForGameActive?.(gameId === "sudoku");
    Settings.applyForGame(active);
    initGame(active);
    maybeInitQuoteFooter(active);
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
    isQuotes: () => active === "quotes",
  };

  scheduleBootFallback();

  const hubOnLoad = window.Hub?.initHubOnLoad?.();

  if (!hubOnLoad) {
    if (!active) {
      active = "sudoku";
      localStorage.setItem(STORAGE_KEY, active);
    }
    if (active === "quotes") window.SudokuApp?.setZen?.(false);
    applyVisibility();
    window.SudokuApp?.syncCatForGameActive?.(active === "sudoku");
    if (active !== "sudoku") {
      appEl?.classList.add("is-ready");
    }
    window.Scenery?.initScenery?.();
    Settings.applyForGame(active);
    initGame(active);
    maybeInitQuoteFooter(active);
  }
})();
