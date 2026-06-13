// Single source of truth for hub tiles and games.js routing.
// When adding a game: add here, wire *-app.js init in games.js, add panel in index.html.
(() => {
  const GAME_CATALOG = [
    { id: "sudoku", label: "Sudoku", available: true },
    { id: "mahjong", label: "Mahjong", available: true },
    { id: "solitaire", label: "Solitaire", available: true },
    { id: "snake", label: "Snake", available: true },
    { id: "minesweeper", label: "Minesweeper", available: true },
    { id: "game2048", label: "2048", available: true },
    { id: "slitherlink", label: "Slitherlink", available: true },
    { id: "kakuro", label: "Kakuro", available: true },
    { id: "reversi", label: "Reversi", available: true },
    { id: "chess", label: "Chess", available: true },
    { id: "quotes", label: "Quotes", available: true },
  ];

  const TITLES = {
    sudoku: "magicSudoku",
    mahjong: "magicMahjong",
    solitaire: "magicSolitaire",
    snake: "magicSnake",
    minesweeper: "magicMinesweeper",
    game2048: "magic2048",
    slitherlink: "magicSlitherlink",
    kakuro: "magicKakuro",
    reversi: "magicReversi",
    chess: "magicChess",
    quotes: "magicQuotes",
  };

  const GAMES = GAME_CATALOG.filter((g) => g.available && g.id).map((g) => g.id);

  window.GameCatalog = { GAME_CATALOG, GAMES, TITLES };
})();
