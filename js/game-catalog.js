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
    { id: null, label: "Coming soon", available: false },
    { id: null, label: "Coming soon", available: false },
    { id: null, label: "Coming soon", available: false },
  ];

  const TITLES = {
    sudoku: "magicSudoku",
    mahjong: "magicMahjong",
    solitaire: "magicSolitaire",
    snake: "magicSnake",
    minesweeper: "magicMinesweeper",
    game2048: "magic2048",
  };

  const GAMES = GAME_CATALOG.filter((g) => g.available && g.id).map((g) => g.id);

  window.GameCatalog = { GAME_CATALOG, GAMES, TITLES };
})();
