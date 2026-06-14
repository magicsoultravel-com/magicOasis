// Chess piece rendering — solid SVG glyphs + unicode fallback
(() => {
  const UNICODE = {
    wk: "♔", wq: "♕", wr: "♖", wb: "♗", wn: "♘", wp: "♙",
    bk: "♚", bq: "♛", br: "♜", bb: "♝", bn: "♞", bp: "♟",
  };

  // Compact filled silhouettes (45×45, inspired by cburnett / Lichess, MIT)
  const PATHS = {
    p: "M22.5 9c-2.21 0-4 1.79-4 4 0 .89.29 1.71.78 2.38-1.87 1.07-3.33 3.36-3.33 5.62 0 2.03.94 3.84 2.41 5.03-3 1.06-7.41 5.55-7.41 13.47H38c0-7.92-4.41-12.41-7.41-13.47 1.47-1.19 2.41-3 2.41-5.03 0-2.26-1.46-4.55-3.33-5.62.49-.67.78-1.49.78-2.38 0-2.21-1.79-4-4-4z",
    r: "M9 39h27v-3H9v3zm3.5-7h20v-3h-20v3zm-2.5-4h25V24h-3v-4h-3v-4h-4V9.5C26 8.12 24.88 7 23.5 7h-2C20.12 7 19 8.12 19 9.5V12h-4v4h-3v4h-3v3.5H10v3z",
    n: "M22 10c11 1 17 9 16 19-1 7-5 12-10 14v2h-4v-2c-5-2-9-7-10-14-1-10 5-18 16-19l-2-5h-4l-1 5z",
    b: "M9 36c3.39-.97 9.11-1.45 13.5-1.45 4.39 0 10.11.48 13.5 1.45v3H9v-3zm6-4c2.5-.86 7-1.31 7.5-1.31.5 0 5 .45 7.5 1.31V35H15v-3zm-3-5c1.5-2 4-3.5 6-4.5V18h3v5.5c2 1 4.5 2.5 6 4.5 1.5 2 2 4 2 6h-22c0-2 .5-4 2-6zM25 8c0 2.21-1.79 4-4 4s-4-1.79-4-4 1.79-4 4-4 4 1.79 4 4z",
    q: "M9 36c3.39-.97 9.11-1.45 13.5-1.45 4.39 0 10.11.48 13.5 1.45v3H9v-3zm3-5c1.5 0 4-1.5 6-3 2 1.5 4.5 3 6 3v2H12v-2zm5.5-8c0 1.38-1.12 2.5-2.5 2.5S15 24.38 15 23s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5zm-5-4c0 1.38-1.12 2.5-2.5 2.5S13 20.38 13 19s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5zm11 0c0 1.38-1.12 2.5-2.5 2.5S19 20.38 19 19s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5zm-5.5-5c0 1.38-1.12 2.5-2.5 2.5S16 15.38 16 14s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5z",
    k: "M11.5 37c5.5 3.5 15.5 3.5 21 0v-7s9-4.5 6-10.5c-4-1-5 2-8 2s-4-3-8-2c-3 6 6 10.5 6 10.5v7z",
  };

  const KING_CROSS = "M22.5 11.63V6M20 8h5";

  function svgGlyph(color, type) {
    const path = PATHS[type];
    if (!path) return "";
    const cross = type === "k" ? `<path class="ch-piece-cross" d="${KING_CROSS}" fill="none"/>` : "";
    return `<svg class="ch-piece-svg" viewBox="0 0 45 45" aria-hidden="true"><path class="ch-piece-path" d="${path}"/>${cross}</svg>`;
  }

  function unicodeGlyph(color, type) {
    return UNICODE[color + type] || "";
  }

  function render(color, type, set) {
    if (set === "unicode") return unicodeGlyph(color, type);
    return svgGlyph(color, type);
  }

  window.ChessPieces = {
    sets: ["solid", "large", "unicode"],
    boards: ["classic", "green", "wood", "blue"],
    render,
    unicode: (color, type) => unicodeGlyph(color, type),
  };
})();
