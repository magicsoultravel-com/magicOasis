(() => {
  Appearance.registerSection("scenery", {
    label: "Scenery",
    choices: [
      {
        id: "sceneryBiome",
        label: "Biome",
        defaultValue: "palms",
        options: [
          { id: "palms", label: "Palms" },
          { id: "bamboo", label: "Bamboo" },
          { id: "evergreen", label: "Evergreen" },
          { id: "cherry", label: "Cherry" },
          { id: "autumn", label: "Autumn" },
          { id: "desert", label: "Desert" },
          { id: "none", label: "Off" },
        ],
        get: () => window.Scenery?.getSceneryBiome?.() ?? "palms",
        set: (v) => window.Scenery?.applySceneryBiome?.(v),
      },
      {
        id: "scenerySky",
        label: "Sky",
        defaultValue: "none",
        options: [
          { id: "none", label: "Off" },
          { id: "stars", label: "Stars" },
          { id: "clouds", label: "Clouds" },
          { id: "moon", label: "Moon" },
          { id: "sunset", label: "Sunset" },
        ],
        get: () => window.Scenery?.getScenerySky?.() ?? "none",
        set: (v) => window.Scenery?.applyScenerySky?.(v),
      },
      {
        id: "sceneryMotion",
        label: "Motion",
        defaultValue: "static",
        options: [
          { id: "static", label: "Static" },
          { id: "sway", label: "Sway" },
        ],
        get: () => window.Scenery?.getSceneryMotion?.() ?? "static",
        set: (v) => window.Scenery?.applySceneryMotion?.(v),
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
