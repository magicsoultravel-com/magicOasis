// Chess piece rendering — Staunton (cburnett) + unicode fallback
(() => {
  const UNICODE = {
    wk: "♔", wq: "♕", wr: "♖", wb: "♗", wn: "♘", wp: "♙",
    bk: "♚", bq: "♛", br: "♜", bb: "♝", bn: "♞", bp: "♟",
  };

  // Cburnett / Staunton paths (Lichess, MIT) — viewBox 0 0 45 45
  const PAWN_W =
    "M22.5 9c-2.21 0-4 1.79-4 4 0 .89.29 1.71.78 2.38C17.33 16.5 16 18.59 16 21c0 2.03.94 3.84 2.41 5.03-3 1.06-7.41 5.55-7.41 13.47h23c0-7.92-4.41-12.41-7.41-13.47 1.47-1.19 2.41-3 2.41-5.03 0-2.41-1.33-4.5-3.28-5.62.49-.67.78-1.49.78-2.38 0-2.21-1.79-4-4-4z";
  const PAWN_B =
    "M22.5 9a4 4 0 0 0-3.22 6.38 6.48 6.48 0 0 0-.87 10.65c-3 1.06-7.41 5.55-7.41 13.47h23c0-7.92-4.41-12.41-7.41-13.47a6.46 6.46 0 0 0-.87-10.65A4.01 4.01 0 0 0 22.5 9z";
  const ROOK =
    "M9 39h27v-3H9v3zm3.5-7h20v-3h-20v3zm-2.5-4h25V24h-3v-4h-3v-4h-4V9.5C26 8.12 24.88 7 23.5 7h-2C20.12 7 19 8.12 19 9.5V12h-4v4h-3v4h-3v3.5H10v3z";
  const BISHOP =
    "M9 36c3.39-.97 9.11-1.45 13.5-1.45 4.39 0 10.11.48 13.5 1.45v3H9v-3zm6-4c2.5-.86 7-1.31 7.5-1.31.5 0 5 .45 7.5 1.31V35H15v-3zm-3-5c1.5-2 4-3.5 6-4.5V18h3v5.5c2 1 4.5 2.5 6 4.5 1.5 2 2 4 2 6h-22c0-2 .5-4 2-6zM25 8c0 2.21-1.79 4-4 4s-4-1.79-4-4 1.79-4 4-4 4 1.79 4 4z";
  const QUEEN =
    "M9 36c3.39-.97 9.11-1.45 13.5-1.45 4.39 0 10.11.48 13.5 1.45v3H9v-3zm3-5c1.5 0 4-1.5 6-3 2 1.5 4.5 3 6 3v2H12v-2zm5.5-8c0 1.38-1.12 2.5-2.5 2.5S15 24.38 15 23s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5zm-5-4c0 1.38-1.12 2.5-2.5 2.5S13 20.38 13 19s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5zm11 0c0 1.38-1.12 2.5-2.5 2.5S19 20.38 19 19s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5zm-5.5-5c0 1.38-1.12 2.5-2.5 2.5S16 15.38 16 14s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5z";
  const KING_BODY =
    "M11.5 37c5.5 3.5 15.5 3.5 21 0v-7s9-4.5 6-10.5c-4-6.5-13.5-3.5-16 4V27v-3.5c-3.5-7.5-13-10.5-16-4-3 6 5 10 5 10z";
  const KING_ROBE =
    "M22.5 25s4.5-7.5 3-10.5c0 0-1-2.5-3-2.5s-3 2.5-3 2.5c-1.5 3 3 10.5 3 10.5";
  const KING_TRIM =
    "M11.5 30c5.5-3 15.5-3 21 0m-21 3.5c5.5-3 15.5-3 21 0m-21 3.5c5.5-3 15.5-3 21 0";
  const KING_CROSS = "M22.5 11.63V6M20 8h5";

  const KNIGHT_W =
    '<path class="ch-staunton-body" d="M22 10c10.5 1 16.5 8 16 29H15c0-9 10-6.5 8-21"/>' +
    '<path class="ch-staunton-body" d="M24 18c.38 2.91-5.55 7.37-8 9-3 2-2.82 4.34-5 4-1.042-.94 1.41-3.04 0-3-1 0 .19 1.23-1 2-1 0-4.003 1-4-4 0-2 6-12 6-12s1.89-1.9 2-3.5c-.73-.994-.5-2-.5-3 1-1 3 2.5 3 2.5h2s.78-1.992 2.5-3c1 0 1 3 1 3"/>' +
    '<path class="ch-staunton-eye" d="M9.5 25.5a.5.5 0 1 1-1 0 .5.5 0 1 1 1 0m5.433-9.75a.5 1.5 30 1 1-.866-.5.5 1.5 30 1 1 .866.5"/>';

  const KNIGHT_B =
    '<path class="ch-staunton-body" d="M22 10c10.5 1 16.5 8 16 29H15c0-9 10-6.5 8-21"/>' +
    '<path class="ch-staunton-body" d="M24 18c.38 2.91-5.55 7.37-8 9-3 2-2.82 4.34-5 4-1.04-.94 1.41-3.04 0-3-1 0 .19 1.23-1 2-1 0-4 1-4-4 0-2 6-12 6-12s1.89-1.9 2-3.5c-.73-1-.5-2-.5-3 1-1 3 2.5 3 2.5h2s.78-2 2.5-3c1 0 1 3 1 3"/>' +
    '<path class="ch-staunton-eye" d="M9.5 25.5a.5.5 0 1 1-1 0 .5.5 0 1 1 1 0m5.43-9.75a.5 1.5 30 1 1-.86-.5.5 1.5 30 1 1 .86.5"/>' +
    '<path class="ch-staunton-shine" d="m24.55 10.4-.45 1.45.5.15c3.15 1 5.65 2.49 7.9 6.75S35.75 29.06 35.25 39l-.05.5h2.25l.05-.5c.5-10.06-.88-16.85-3.25-21.34s-5.79-6.64-9.19-7.16z"/>';

  function bodyPath(d) {
    return `<path class="ch-staunton-body" d="${d}"/>`;
  }

  function stauntonSvg(color, type) {
    let inner = "";
    if (type === "p") {
      inner = color === "w"
        ? bodyPath(PAWN_W)
        : `<path class="ch-staunton-body" d="${PAWN_B}"/>`;
    } else if (type === "n") {
      inner = color === "w" ? KNIGHT_W : KNIGHT_B;
    } else if (type === "r") {
      inner = bodyPath(ROOK);
    } else if (type === "b") {
      inner = bodyPath(BISHOP);
    } else if (type === "q") {
      inner = bodyPath(QUEEN);
    } else if (type === "k") {
      inner =
        `<path class="ch-staunton-cross" d="${KING_CROSS}" fill="none"/>` +
        bodyPath(KING_ROBE) +
        bodyPath(KING_BODY) +
        `<path class="ch-staunton-trim" d="${KING_TRIM}" fill="none"/>`;
    }
    const side = color === "w" ? "white" : "black";
    return `<svg class="ch-piece-svg ch-piece-svg--staunton" data-side="${side}" viewBox="0 0 45 45" aria-hidden="true">${inner}</svg>`;
  }

  function unicodeGlyph(color, type) {
    return UNICODE[color + type] || "";
  }

  function render(color, type, set) {
    if (set === "unicode") return unicodeGlyph(color, type);
    return stauntonSvg(color, type);
  }

  window.ChessPieces = {
    sets: ["standard", "large", "unicode"],
    boards: ["classic", "green", "wood", "blue"],
    render,
    unicode: (color, type) => unicodeGlyph(color, type),
  };
})();
