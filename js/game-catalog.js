// Single source of truth for hub tiles and games.js routing.
// When adding a game: add here, wire *-app.js init in games.js, add panel in index.html.
(() => {
  const GAME_CATALOG = [
    { id: "sudoku", label: "Sudoku", available: true },
    { id: "mahjong", label: "Mahjong", available: true },
    { id: "solitaire", label: "Solitaire", available: true },
    { id: null, label: "Coming soon", available: false },
    { id: null, label: "Coming soon", available: false },
    { id: null, label: "Coming soon", available: false },
    { id: null, label: "Coming soon", available: false },
    { id: null, label: "Coming soon", available: false },
    { id: null, label: "Coming soon", available: false },
  ];

  const TITLES = {
    sudoku: "Magic Sudoku",
    mahjong: "Magic Mahjong",
    solitaire: "Magic Solitaire",
  };

  const GAMES = GAME_CATALOG.filter((g) => g.available && g.id).map((g) => g.id);

  window.GameCatalog = { GAME_CATALOG, GAMES, TITLES };
})();
