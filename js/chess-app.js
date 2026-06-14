(() => {
  const boardEl = document.getElementById("chess-board");
  const movesEl = document.getElementById("chess-moves");
  const statusEl = document.getElementById("chess-status");
  const statsTextEl = document.getElementById("chess-stats-text");

  const btnNew = document.getElementById("btn-chess-new");
  const btnRestart = document.getElementById("btn-chess-restart");
  const btnUndo = document.getElementById("btn-chess-undo");
  const btnRedo = document.getElementById("btn-chess-redo");
  const btnFlip = document.getElementById("btn-chess-flip");
  const btnGames = document.getElementById("btn-chess-games");
  const btnResign = document.getElementById("btn-chess-resign");

  const modeSelect = document.getElementById("chess-mode");
  const sideSelect = document.getElementById("chess-side");
  const diffSelect = document.getElementById("chess-difficulty");
  const puzzleTierSelect = document.getElementById("chess-puzzle-tier");

  const gamesDialog = document.getElementById("chess-games-dialog");
  const gamesListEl = document.getElementById("chess-games-list");
  const gamesCloseBtn = document.getElementById("chess-games-close");
  const copyFenBtn = document.getElementById("chess-copy-fen");

  const promoteDialog = document.getElementById("chess-promote-dialog");
  const startDialog = document.getElementById("chess-start-dialog");
  const startMessageEl = document.getElementById("chess-start-message");
  const btnStartNew = document.getElementById("chess-start-new");
  const btnStartResume = document.getElementById("chess-start-resume");

  const STATE_KEY = "chess-game";
  const STATS_KEY = "chess-stats";
  const HISTORY_LIMIT = 80;

  const DIFF_MS = { casual: 400, club: 1500, strong: 3000 };

  const PIECES = {
    wk: "♔", wq: "♕", wr: "♖", wb: "♗", wn: "♘", wp: "♙",
    bk: "♚", bq: "♛", br: "♜", bb: "♝", bn: "♞", bp: "♟",
  };

  const FILES = "abcdefgh";
  const RANKS = "87654321";

  let game = null;
  let mode = "ai";
  let humanColor = "w";
  let difficulty = "club";
  let flipped = false;
  let selected = null;
  let legalTargets = [];
  let thinking = false;
  let engineReady = false;
  let gameOver = false;
  let initialized = false;
  let aiTurnId = 0;

  let undoStack = [];
  let redoStack = [];
  let pendingPromote = null;

  let stats = { played: 0, won: 0, lost: 0, drawn: 0 };

  function setStatus(msg) {
    if (statusEl) statusEl.textContent = msg;
  }

  function updateStatsLine() {
    if (statsTextEl) {
      statsTextEl.textContent = `${stats.played} played · ${stats.won} won`;
    }
  }

  function loadStats() {
    try {
      const raw = localStorage.getItem(STATS_KEY);
      if (raw) stats = { ...stats, ...JSON.parse(raw) };
    } catch { /* ignore */ }
    updateStatsLine();
  }

  function saveStats() {
    try {
      localStorage.setItem(STATS_KEY, JSON.stringify(stats));
    } catch { /* ignore */ }
    updateStatsLine();
  }

  function uciMovesFromGame() {
    if (!game) return [];
    return game.history({ verbose: true }).map((m) => m.from + m.to + (m.promotion || ""));
  }

  function uciToMove(uci) {
    const m = { from: uci.slice(0, 2), to: uci.slice(2, 4) };
    if (uci.length > 4) m.promotion = uci[4];
    return m;
  }

  function squareName(rank, file) {
    return FILES[file] + RANKS[rank];
  }

  function displayRanks() {
    return flipped ? [...RANKS].reverse() : [...RANKS];
  }

  function displayFiles() {
    return flipped ? [...FILES].reverse() : [...FILES];
  }

  function boardSquare(rank, file) {
    const b = game.board();
    const row = flipped ? rank : 7 - rank;
    const col = flipped ? 7 - file : file;
    return b[row][col];
  }

  function renderBoard() {
    if (!boardEl || !game) return;
    boardEl.innerHTML = "";
    for (const r of displayRanks()) {
      for (const f of displayFiles()) {
        const rank = RANKS.indexOf(r);
        const file = FILES.indexOf(f);
        const sq = squareName(rank, file);
        const piece = boardSquare(rank, file);
        const isLight = (rank + file) % 2 === 0;
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "ch-cell";
        btn.dataset.square = sq;
        btn.setAttribute("role", "gridcell");
        btn.setAttribute("aria-label", sq + (piece ? ` ${piece.type}` : " empty"));
        if (isLight) btn.classList.add("ch-cell--light");
        else btn.classList.add("ch-cell--dark");
        if (selected === sq) btn.classList.add("ch-cell--selected");
        if (legalTargets.includes(sq)) btn.classList.add("ch-cell--target");
        if (piece) {
          const span = document.createElement("span");
          span.className = "ch-piece";
          span.textContent = PIECES[piece.color + piece.type] || "";
          if (piece.color === "b") span.classList.add("ch-piece--black");
          btn.appendChild(span);
        }
        btn.addEventListener("click", () => onSquareClick(sq));
        boardEl.appendChild(btn);
      }
    }
  }

  function renderMoves() {
    if (!movesEl || !game) return;
    movesEl.innerHTML = "";
    const hist = game.history();
    for (let i = 0; i < hist.length; i += 2) {
      const li = document.createElement("li");
      const num = Math.floor(i / 2) + 1;
      li.textContent = hist[i + 1] ? `${num}. ${hist[i]} ${hist[i + 1]}` : `${num}. ${hist[i]}`;
      movesEl.appendChild(li);
    }
  }

  function updateUndoButtons() {
    const canUndo = undoStack.length > 0 && !gameOver && !thinking;
    const canRedo = redoStack.length > 0 && !gameOver && !thinking;
    if (btnUndo) btnUndo.disabled = !canUndo;
    if (btnRedo) btnRedo.disabled = !canRedo;
  }

  function refreshStatus() {
    if (gameOver) return;
    if (!engineReady && mode === "ai") {
      setStatus("Loading engine…");
      return;
    }
    if (thinking) {
      setStatus("Engine thinking…");
      return;
    }
    const side = game.turn() === "w" ? "White" : "Black";
    let msg = `${side} to move`;
    if (game.in_check()) msg += " · check!";
    if (mode === "ai") {
      msg += game.turn() === humanColor ? " (you)" : " (AI)";
    }
    setStatus(msg);
  }

  function syncUI() {
    renderBoard();
    renderMoves();
    refreshStatus();
    updateUndoButtons();
  }

  function pushUndo() {
    undoStack.push(game.fen());
    if (undoStack.length > HISTORY_LIMIT) undoStack.shift();
    redoStack = [];
  }

  function saveGame() {
    if (!game || gameOver) return;
    const payload = {
      v: 2,
      mode,
      humanColor,
      difficulty,
      flipped,
      history: game.history(),
      fen: game.fen(),
    };
    try {
      localStorage.setItem(STATE_KEY, JSON.stringify(payload));
    } catch { /* ignore */ }
  }

  function finishGame(resignResult) {
    gameOver = true;
    thinking = false;
    window.ChessEngine?.cancel?.();

    let res = resignResult;
    if (!res) {
      if (game.in_checkmate()) res = game.turn() === "w" ? "0-1" : "1-0";
      else if (game.in_draw() || game.in_stalemate()) res = "1/2-1/2";
      else res = "*";
    }

    if (mode === "ai") {
      stats.played++;
      if (res === "1-0") {
        if (humanColor === "w") stats.won++;
        else stats.lost++;
      } else if (res === "0-1") {
        if (humanColor === "b") stats.won++;
        else stats.lost++;
      } else {
        stats.drawn++;
      }
      saveStats();
    }

    if (res === "1-0") setStatus("White wins");
    else if (res === "0-1") setStatus("Black wins");
    else if (res === "1/2-1/2") setStatus("Draw");
    else setStatus("Game over");

    updateUndoButtons();
    try {
      localStorage.removeItem(STATE_KEY);
    } catch { /* ignore */ }
  }

  function onTurnEnd() {
    saveGame();
    if (game.game_over()) {
      finishGame();
      return;
    }
    if (mode === "ai" && game.turn() !== humanColor) {
      runAI();
    } else {
      refreshStatus();
    }
  }

  function playMove(move, { recordUndo = true } = {}) {
    if (recordUndo) pushUndo();
    const res = game.move(move);
    if (!res) {
      if (recordUndo) {
        undoStack.pop();
        updateUndoButtons();
      }
      return null;
    }
    syncUI();
    onTurnEnd();
    return res;
  }

  function runAI() {
    if (thinking || gameOver || mode !== "ai" || !engineReady) return;
    const engine = window.ChessEngine;
    if (!engine) {
      setStatus("Engine unavailable");
      return;
    }

    const turnId = ++aiTurnId;
    const uciMoves = uciMovesFromGame();
    const ms = DIFF_MS[difficulty] || 1500;

    thinking = true;
    syncUI();

    engine.search(uciMoves, ms)
      .then((uci) => {
        thinking = false;
        if (turnId !== aiTurnId || gameOver) {
          syncUI();
          return;
        }
        if (!uci) {
          setStatus("Engine passed");
          syncUI();
          return;
        }
        const res = playMove(uciToMove(uci), { recordUndo: false });
        if (!res) {
          setStatus("Engine returned an invalid move");
          syncUI();
        }
      })
      .catch(() => {
        thinking = false;
        if (turnId === aiTurnId) {
          setStatus("Engine unavailable");
          syncUI();
        }
      });
  }

  function canInteract() {
    return game && !gameOver && !thinking && (mode !== "ai" || engineReady);
  }

  function onSquareClick(sq) {
    if (!canInteract()) return;

    if (selected) {
      if (legalTargets.includes(sq)) {
        const moves = game.moves({ square: selected, verbose: true });
        const pick = moves.find((m) => m.to === sq);
        if (pick && pick.flags.includes("p")) {
          pendingPromote = { from: selected, to: sq };
          promoteDialog?.showModal();
          return;
        }
        if (!pick) {
          selected = null;
          legalTargets = [];
          syncUI();
          return;
        }
        selected = null;
        legalTargets = [];
        playMove({ from: pick.from, to: pick.to });
        return;
      }
      selected = null;
      legalTargets = [];
      syncUI();
    }

    const piece = game.get(sq);
    if (!piece) return;
    if (mode === "ai" && piece.color !== humanColor) return;
    if (mode === "hotseat" && piece.color !== game.turn()) return;

    selected = sq;
    legalTargets = game.moves({ square: sq, verbose: true }).map((m) => m.to);
    syncUI();
  }

  function completePromotion(pieceType) {
    promoteDialog?.close();
    if (!pendingPromote) return;
    const { from, to } = pendingPromote;
    pendingPromote = null;
    selected = null;
    legalTargets = [];
    playMove({ from, to, promotion: pieceType });
  }

  function updateModeUI() {
    const isAi = mode === "ai";
    if (sideSelect) sideSelect.hidden = !isAi;
    if (diffSelect) diffSelect.hidden = !isAi;
    if (puzzleTierSelect) puzzleTierSelect.hidden = true;
    if (btnResign) btnResign.hidden = !isAi;
  }

  function loadPosition(history) {
    game = new Chess();
    for (const san of history || []) {
      const ok = game.move(san, { sloppy: true });
      if (!ok) break;
    }
  }

  function newGame() {
    mode = modeSelect?.value || "ai";
    if (mode === "puzzle") {
      mode = "ai";
      if (modeSelect) modeSelect.value = "ai";
    }

    humanColor = sideSelect?.value || "w";
    difficulty = diffSelect?.value || "club";
    gameOver = false;
    thinking = false;
    selected = null;
    legalTargets = [];
    undoStack = [];
    redoStack = [];
    aiTurnId++;

    window.ChessEngine?.cancel?.();
    updateModeUI();

    game = new Chess();
    syncUI();
    saveGame();

    if (mode === "ai" && humanColor === "b" && engineReady) {
      runAI();
    }
  }

  function undo() {
    if (!undoStack.length || thinking) return;
    window.ChessEngine?.cancel?.();
    aiTurnId++;
    const fen = undoStack.pop();
    redoStack.push(game.fen());
    game = new Chess(fen);
    selected = null;
    legalTargets = [];
    syncUI();
    saveGame();
  }

  function redo() {
    if (!redoStack.length || thinking) return;
    window.ChessEngine?.cancel?.();
    aiTurnId++;
    const fen = redoStack.pop();
    undoStack.push(game.fen());
    game = new Chess(fen);
    selected = null;
    legalTargets = [];
    syncUI();
    saveGame();
    if (mode === "ai" && game.turn() !== humanColor && engineReady) {
      runAI();
    }
  }

  function peekSave() {
    try {
      const raw = localStorage.getItem(STATE_KEY);
      if (!raw) return null;
      const s = JSON.parse(raw);
      if ((s.v !== 1 && s.v !== 2) || s.gameOver) return null;
      if (!["ai", "hotseat"].includes(s.mode || "ai")) return null;
      if (!(s.history?.length) && !s.fen) return null;
      const side = s.humanColor === "b" ? "Black" : "White";
      const moveNo = s.history?.length ? Math.ceil(s.history.length / 2) : 1;
      const msg = s.mode === "hotseat"
        ? `Resume 2-player game · move ${moveNo}`
        : `Resume Vs AI · ${side} · move ${moveNo}`;
      return { save: s, message: msg };
    } catch {
      return null;
    }
  }

  function showStartDialog(message) {
    return new Promise((resolve) => {
      if (!startDialog || !startMessageEl) {
        resolve("new");
        return;
      }
      startMessageEl.textContent = message;
      const onNew = () => { cleanup(); resolve("new"); };
      const onResume = () => { cleanup(); resolve("resume"); };
      const cleanup = () => {
        startDialog.close();
        btnStartNew?.removeEventListener("click", onNew);
        btnStartResume?.removeEventListener("click", onResume);
      };
      btnStartNew?.addEventListener("click", onNew);
      btnStartResume?.addEventListener("click", onResume);
      startDialog.showModal();
    });
  }

  function tryLoadGame(save) {
    const s = save;
    mode = s.mode || "ai";
    if (mode === "puzzle") return false;

    humanColor = s.humanColor || "w";
    difficulty = s.difficulty || "club";
    flipped = !!s.flipped;
    gameOver = false;
    undoStack = [];
    redoStack = [];
    aiTurnId++;

    if (modeSelect) modeSelect.value = mode;
    if (sideSelect) sideSelect.value = humanColor;
    if (diffSelect) diffSelect.value = difficulty;
    updateModeUI();

    if (s.history?.length) {
      loadPosition(s.history);
    } else if (s.fen) {
      game = new Chess(s.fen);
    } else {
      return false;
    }

    syncUI();
    return true;
  }

  async function ensureEngine() {
    if (mode !== "ai") {
      engineReady = true;
      return;
    }
    engineReady = false;
    syncUI();
    try {
      await window.ChessEngine?.init?.();
      engineReady = true;
    } catch {
      engineReady = false;
      setStatus("Engine unavailable");
    }
    syncUI();
  }

  async function bootstrap() {
    const peeked = peekSave();
    if (peeked) {
      const choice = await showStartDialog(peeked.message);
      if (choice === "resume") {
        if (!tryLoadGame(peeked.save)) {
          try { localStorage.removeItem(STATE_KEY); } catch { /* ignore */ }
          newGame();
        }
      } else {
        try { localStorage.removeItem(STATE_KEY); } catch { /* ignore */ }
        newGame();
      }
    } else {
      newGame();
    }

    await ensureEngine();

    if (mode === "ai" && !gameOver && game.turn() !== humanColor && engineReady) {
      runAI();
    }
  }

  function openGamesDialog() {
    if (!gamesListEl) return;
    gamesListEl.innerHTML = "";
    const li = document.createElement("li");
    li.textContent = "Game archive coming soon";
    gamesListEl.appendChild(li);
    gamesDialog?.showModal();
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      setStatus("Copied to clipboard");
    } catch {
      setStatus("Copy failed");
    }
  }

  function wireEvents() {
    btnNew?.addEventListener("click", () => newGame());
    btnRestart?.addEventListener("click", () => newGame());
    btnUndo?.addEventListener("click", undo);
    btnRedo?.addEventListener("click", redo);
    btnFlip?.addEventListener("click", () => {
      flipped = !flipped;
      syncUI();
      saveGame();
    });
    btnGames?.addEventListener("click", openGamesDialog);
    btnResign?.addEventListener("click", () => {
      if (gameOver || mode !== "ai") return;
      finishGame(humanColor === "w" ? "0-1" : "1-0");
    });

    modeSelect?.addEventListener("change", () => newGame());
    sideSelect?.addEventListener("change", () => {
      if (mode === "ai") newGame();
    });
    diffSelect?.addEventListener("change", () => {
      difficulty = diffSelect.value;
      saveGame();
    });

    gamesCloseBtn?.addEventListener("click", () => gamesDialog?.close());
    gamesDialog?.addEventListener("click", (e) => {
      if (e.target === gamesDialog) gamesDialog.close();
    });
    copyFenBtn?.addEventListener("click", () => {
      if (game) copyText(game.fen());
    });

    promoteDialog?.querySelectorAll(".ch-promote-btn").forEach((btn) => {
      btn.addEventListener("click", () => completePromotion(btn.dataset.piece));
    });
    promoteDialog?.addEventListener("cancel", (e) => {
      e.preventDefault();
      pendingPromote = null;
      selected = null;
      legalTargets = [];
      syncUI();
    });
  }

  function init() {
    if (initialized) return;
    initialized = true;
    loadStats();
    wireEvents();
    void bootstrap();
  }

  window.ChessApp = {
    init,
    saveGame,
    newGame,
    isActive: () => window.Games?.isChess?.(),
  };
})();
