(() => {
  Appearance.registerSection("hub", {
    label: "Hub",
    choices: [
      {
        id: "palmMotion",
        label: "Palm trees",
        defaultValue: "static",
        options: [
          { id: "static", label: "Static" },
          { id: "sway", label: "Sway" },
        ],
        get: () => window.Hub?.getPalmMotion?.() ?? "static",
        set: (v) => window.Hub?.applyPalmMotion?.(v),
      },
    ],
  });

  const SUDOKU_COLORS = [
    { id: "borderStrong", label: "Outer borders", var: "--board-border-strong", themeVar: "--border-strong" },
    { id: "border", label: "Grid lines", var: "--board-border", themeVar: "--border" },
    { id: "fontColor", label: "Numbers", var: "--board-font", themeVar: "--user" },
    { id: "highlightValue", label: "Selection tint", var: "--board-highlight-value", themeVar: "--highlight-value" },
    { id: "highlightPeer", label: "Blocked tint", var: "--board-highlight-peer", themeVar: "--highlight-peer" },
    { id: "catColor", label: "Companion cat", var: "--board-cat-color", themeVar: "--text" },
  ];

  Appearance.registerSection("sudoku", {
    label: "Sudoku",
    colors: SUDOKU_COLORS,
  });

  Appearance.registerSection("mahjong", {
    label: "Mahjong",
    colors: [
      { id: "borderStrong", label: "Frame", var: "--board-border-strong", themeVar: "--border-strong" },
      { id: "border", label: "Grid", var: "--board-border", themeVar: "--border" },
    ],
    choices: [
      {
        id: "tileSet",
        label: "Tiles",
        defaultValue: "ivory",
        options: [
          { id: "ivory", label: "Ivory" },
          { id: "black", label: "Black" },
        ],
        get: () => window.MahjongApp?.getTileSet?.() ?? "ivory",
        set: (v) => window.MahjongApp?.applyTileSet?.(v),
      },
    ],
  });

  Appearance.registerSection("solitaire", {
    label: "Solitaire",
    colors: [
      { id: "borderStrong", label: "Frame", var: "--board-border-strong", themeVar: "--border-strong" },
    ],
    choices: [
      {
        id: "deckSet",
        label: "Cards",
        defaultValue: "classic",
        options: [
          { id: "classic", label: "Classic" },
          { id: "vintage", label: "Vintage" },
          { id: "bavarian", label: "Bavarian" },
          { id: "midnight", label: "Midnight" },
        ],
        get: () => window.SolitaireApp?.getDeckSet?.() ?? "classic",
        set: (v) => window.SolitaireApp?.applyDeckSet?.(v),
      },
    ],
    steppers: [
      {
        id: "zoom",
        label: "Card size",
        defaultIndex: 2,
        getIndex: () => window.SolitaireApp?.getZoomIndex?.() ?? 2,
        setIndex: (i) => window.SolitaireApp?.applyZoom?.(i),
        step: (delta) => window.SolitaireApp?.stepZoom?.(delta),
        min: 0,
        getMax: () => window.SolitaireApp?.getZoomMax?.() ?? 0,
        format: (i) => window.SolitaireApp?.getZoomLabel?.(i) ?? String(i),
      },
    ],
  });
})();
