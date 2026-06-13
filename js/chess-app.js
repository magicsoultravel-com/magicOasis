(() => {
  const boardEl = document.getElementById("chess-board");
  const movesEl = document.getElementById("chess-moves");
  const statusEl = document.getElementById("chess-status");
  const statsTextEl = document.getElementById("chess-stats-text");
  const puzzleMetaEl = document.getElementById("chess-puzzle-meta");

  const btnNew = document.getElementById("btn-chess-new");
  const btnRestart = document.getElementById("btn-chess-restart");
  const btnUndo = document.getElementById("btn-chess-undo");
  const btnRedo = document.getElementById("btn-chess-redo");
  const btnFlip = document.getElementById("btn-chess-flip");
  const btnGames = document.getElementById("btn-chess-games");
  const btnResign = document.getElementById("btn-chess-resign");
  const btnNextPuzzle = document.getElementById("btn-chess-next-puzzle");

  const modeSelect = document.getElementById("chess-mode");
  const sideSelect = document.getElementById("chess-side");
  const diffSelect = document.getElementById("chess-difficulty");
  const puzzleTierSelect = document.getElementById("chess-puzzle-tier");

  const gamesDialog = document.getElementById("chess-games-dialog");
  const gamesListEl = document.getElementById("chess-games-list");
  const gamesCloseBtn = document.getElementById("chess-games-close");
  const copyPgnBtn = document.getElementById("chess-copy-pgn");
  const copyFenBtn = document.getElementById("chess-copy-fen");

  const promoteDialog = document.getElementById("chess-promote-dialog");

  const loadOverlay = document.getElementById("chess-load-overlay");
  const loadLabel = document.getElementById("chess-load-label");
  const loadProgress = document.getElementById("chess-load-progress");
  const loadBar = document.getElementById("chess-load-bar");

  const STATE_KEY = "chess-game";
  const GAMES_KEY = "chess-games";
  const STATS_KEY = "chess-stats";
  const PUZZLE_STATS_KEY = "chess-puzzle-stats";
  const MAX_GAMES = 25;
  const MAX_SAVE_BYTES = 120000;
  const HISTORY_LIMIT = 80;

  const DIFF_MS = { casual: 400, club: 1500, strong: 3000 };
  const LOAD_DELAY_MS = 200;

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
  let gameOver = false;
  let result = null;
  let initialized = false;

  let undoStack = [];
  let redoStack = [];
  let reviewIndex = -1;
  let reviewMoves = [];
  let reviewGame = null;

  let puzzle = null;
  let puzzleStep = 0;
  let puzzleStreak = 0;
  let puzzlePool = [];
  let puzzleTier = "beginner";
  let openings = [];

  let stats = { played: 0, won: 0, lost: 0, drawn: 0 };
  let puzzleStats = { solved: [], bestStreak: 0, currentStreak: 0, attempts: 0 };
  let archive = [];
  let selectedArchiveId = null;

  let pendingPromote = null;

  function setStatus(msg) {
    if (statusEl) statusEl.textContent = msg;
  }

  function setChessLoadProgress(p, label) {
    const pct = Math.round(p * 100);
    if (loadBar) loadBar.style.width = `${pct}%`;
    loadProgress?.setAttribute("aria-valuenow", String(pct));
    if (label && loadLabel) loadLabel.textContent = label;
  }

  function hideChessLoad() {
    if (!loadOverlay) return;
    loadOverlay.classList.remove("is-visible");
    loadOverlay.hidden = true;
    loadOverlay.setAttribute("aria-hidden", "true");
    setChessLoadProgress(0, "Loading…");
  }

  function showChessLoad(label, progress = 0.08) {
    if (!loadOverlay) return;
    setChessLoadProgress(progress, label);
    loadOverlay.hidden = false;
    loadOverlay.setAttribute("aria-hidden", "false");
    requestAnimationFrame(() => {
      loadOverlay.classList.add("is-visible");
    });
  }

  function withChessLoad(label, workFn) {
    let overlayShown = false;
    let progress = 0.08;
    let progressTimer = null;
    let tickTimer = null;
    const reveal = () => {
      if (overlayShown) return;
      overlayShown = true;
      showChessLoad(label, progress);
    };
    progressTimer = setTimeout(reveal, LOAD_DELAY_MS);
    tickTimer = setInterval(() => {
      progress = Math.min(0.92, progress + 0.06);
      if (overlayShown) setChessLoadProgress(progress, label);
    }, 180);

    return Promise.resolve()
      .then(workFn)
      .then((result) => {
        clearTimeout(progressTimer);
        clearInterval(tickTimer);
        if (overlayShown) {
          setChessLoadProgress(1, "Ready");
          return new Promise((resolve) => {
            setTimeout(() => {
              hideChessLoad();
              resolve(result);
            }, 120);
          });
        }
        return result;
      })
      .catch((err) => {
        clearTimeout(progressTimer);
        clearInterval(tickTimer);
        hideChessLoad();
        throw err;
      });
  }

  function updateStatsLine() {
    if (statsTextEl) {
      statsTextEl.textContent = `${stats.played} played · ${stats.won} won · streak ${puzzleStreak}`;
    }
  }

  function loadStats() {
    try {
      const s = localStorage.getItem(STATS_KEY);
      if (s) stats = { ...stats, ...JSON.parse(s) };
      const p = localStorage.getItem(PUZZLE_STATS_KEY);
      if (p) {
        puzzleStats = { ...puzzleStats, ...JSON.parse(p) };
        puzzleStreak = puzzleStats.currentStreak || 0;
      }
    } catch { /* ignore */ }
    updateStatsLine();
  }

  function saveStats() {
    puzzleStats.currentStreak = puzzleStreak;
    try {
      localStorage.setItem(STATS_KEY, JSON.stringify(stats));
      localStorage.setItem(PUZZLE_STATS_KEY, JSON.stringify(puzzleStats));
    } catch { /* ignore */ }
    updateStatsLine();
  }

  function loadArchive() {
    try {
      const raw = localStorage.getItem(GAMES_KEY);
      archive = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(archive)) archive = [];
    } catch {
      archive = [];
    }
  }

  function saveArchive() {
    while (archive.length > MAX_GAMES) archive.pop();
    let json = JSON.stringify(archive);
    while (json.length > MAX_SAVE_BYTES && archive.length) {
      archive.pop();
      json = JSON.stringify(archive);
    }
    try {
      localStorage.setItem(GAMES_KEY, json);
    } catch { /* ignore */ }
  }

  function fetchOpenings() {
    if (openings.length) return Promise.resolve(openings);
    return fetch("data/chess-openings.json")
      .then((r) => r.json())
      .then((data) => {
        openings = data;
        return openings;
      })
      .catch(() => {
        openings = [];
        return openings;
      });
  }

  function fetchPuzzlePack(tier) {
    return fetch(`data/chess-puzzles-${tier}.json`)
      .then((r) => (r.ok ? r.json() : []))
      .catch(() => []);
  }

  function matchOpening(sanMoves) {
    let best = null;
    let bestLen = -1;
    for (const o of openings) {
      const om = o.moves || [];
      if (om.length > sanMoves.length) continue;
      let ok = true;
      for (let i = 0; i < om.length; i++) {
        if (om[i] !== sanMoves[i]) {
          ok = false;
          break;
        }
      }
      if (ok && om.length > bestLen) {
        bestLen = om.length;
        best = o;
      }
    }
    return best ? `${best.eco} ${best.name}` : null;
  }

  function sanHistory() {
    return game.history();
  }

  function buildPgn(res, openingName) {
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, ".");
    const white = mode === "ai" && humanColor === "b" ? "Stockfish" : "You";
    const black = mode === "ai" && humanColor === "w" ? "Stockfish" : "You";
    const headers = [
      '[Event "magicOasis Chess"]',
      `[Date "${date}"]`,
      `[White "${white}"]`,
      `[Black "${black}"]`,
    ];
    if (openingName) headers.push(`[Opening "${openingName}"]`);
    headers.push(`[Result "${res || "*"}"]`);
    const body = game.pgn().trim() || "*";
    return `${headers.join("\n")}\n\n${body} ${res || "*"}`;
  }

  function archiveGame(res) {
    if (mode === 'puzzle' || mode === 'review') return;
    const san = sanHistory();
    fetchOpenings().then(() => {
      const openingName = matchOpening(san);
      const entry = {
        id: String(Date.now()),
        date: new Date().toISOString().slice(0, 10),
        pgn: buildPgn(res, openingName),
        result: res,
        opening: openingName,
        mode,
      };
      archive.unshift(entry);
      saveArchive();
    });
  }

  function pushUndo() {
    undoStack.push(game.fen());
    if (undoStack.length > HISTORY_LIMIT) undoStack.shift();
    redoStack = [];
    updateUndoButtons();
  }

  function updateUndoButtons() {
    const canUndo = undoStack.length > 0 && !gameOver && mode !== 'review';
    const canRedo = redoStack.length > 0 && !gameOver && mode !== 'review';
    if (btnUndo) btnUndo.disabled = !canUndo || thinking;
    if (btnRedo) btnRedo.disabled = !canRedo || thinking;
  }

  function squareName(rank, file) {
    return FILES[file] + RANKS[rank];
  }

  function parseSquare(sq) {
    return { rank: RANKS.indexOf(sq[1]), file: FILES.indexOf(sq[0]) };
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
    const ranks = displayRanks();
    const files = displayFiles();

    for (const r of ranks) {
      for (const f of files) {
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

  function uciToMove(uci) {
    const m = { from: uci.slice(0, 2), to: uci.slice(2, 4) };
    if (uci.length > 4) m.promotion = uci[4];
    return m;
  }

  function applyMove(move, silent) {
    if (!silent) pushUndo();
    const res = game.move(move);
    if (!res) {
      if (!silent) {
        undoStack.pop();
        updateUndoButtons();
      }
      return null;
    }
    if (!silent) {
      renderBoard();
      renderMoves();
      afterMove();
    }
    return res;
  }

  function afterMove() {
    updateUndoButtons();
    saveGame();

    if (mode === "puzzle") {
      handlePuzzleAfterMove();
      return;
    }

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

  function puzzlePlayerColor() {
    if (!puzzle || !puzzle.moves.length) return "w";
    const temp = new Chess(puzzle.fen);
    temp.move(uciToMove(puzzle.moves[0]));
    return temp.turn();
  }

  function playPuzzleAutoReplies() {
    while (puzzleStep < puzzle.moves.length && puzzleStep % 2 === 0) {
      const res = game.move(uciToMove(puzzle.moves[puzzleStep]));
      if (!res) break;
      puzzleStep++;
    }
    renderBoard();
    renderMoves();
    if (puzzleStep >= puzzle.moves.length) puzzleSolved();
    else refreshStatus();
  }

  function handlePuzzleAfterMove() {
    if (!puzzle) return;
    const last = game.history({ verbose: true }).pop();
    const played = last ? last.from + last.to + (last.promotion || "") : "";

    if (played !== puzzle.moves[puzzleStep]) {
      game.undo();
      renderBoard();
      renderMoves();
      setStatus("Not the best move — try again");
      puzzleStreak = 0;
      saveStats();
      return;
    }

    puzzleStep++;
    setTimeout(() => playPuzzleAutoReplies(), 260);
  }

  function puzzleSolved() {
    puzzleStreak++;
    puzzleStats.attempts++;
    if (!puzzleStats.solved.includes(puzzle.id)) puzzleStats.solved.push(puzzle.id);
    if (puzzleStreak > puzzleStats.bestStreak) puzzleStats.bestStreak = puzzleStreak;
    saveStats();
    const themes = (puzzle.themes || []).join(", ");
    setStatus(`Solved! ${themes} · Lichess #${puzzle.id}`);
    if (puzzleMetaEl) {
      puzzleMetaEl.hidden = false;
      puzzleMetaEl.textContent = `Rating ~${puzzle.r} · ${themes}`;
    }
    if (btnNextPuzzle) btnNextPuzzle.hidden = false;
  }

  function finishGame(resignResult) {
    gameOver = true;
    thinking = false;
    let res = resignResult;
    if (!res) {
      if (game.in_checkmate()) res = game.turn() === "w" ? "0-1" : "1-0";
      else if (game.in_draw() || game.in_stalemate()) res = "1/2-1/2";
      else res = "*";
    }
    result = res;
    if (mode === "ai") {
      stats.played++;
      if (res === "1-0") stats.won += humanColor === "w" ? 1 : 0, stats.lost += humanColor === "b" ? 1 : 0;
      else if (res === "0-1") stats.won += humanColor === "b" ? 1 : 0, stats.lost += humanColor === "w" ? 1 : 0;
      else stats.drawn++;
      saveStats();
    }
    archiveGame(res);
    fetchOpenings().then(() => {
      const open = matchOpening(sanHistory());
      const openTxt = open ? ` · ${open}` : "";
      if (res === "1-0") setStatus(`White wins${openTxt}`);
      else if (res === "0-1") setStatus(`Black wins${openTxt}`);
      else if (res === "1/2-1/2") setStatus(`Draw${openTxt}`);
      else setStatus(`Game over${openTxt}`);
    });
    updateUndoButtons();
    saveGame();
  }

  function refreshStatus() {
    if (gameOver) return;
    if (thinking) {
      setStatus("Engine thinking…");
      return;
    }
    if (mode === "puzzle") {
      setStatus(`Find the best move · streak ${puzzleStreak}`);
      return;
    }
    if (mode === "review") {
      setStatus(`Review · move ${Math.floor(reviewIndex / 2) + 1}`);
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

  function runAI() {
    if (thinking || gameOver || mode !== "ai") return;
    const engine = window.ChessEngine;
    if (!engine) {
      setStatus("Engine unavailable");
      return;
    }
    thinking = true;
    refreshStatus();
    const ms = DIFF_MS[difficulty] || 1500;

    const ensureReady = engine.isReady()
      ? Promise.resolve()
      : withChessLoad("Loading engine…", () => engine.init());

    ensureReady
      .then(() => engine.getBestMove(game.fen(), ms))
      .then((uci) => {
        thinking = false;
        if (!uci || gameOver) {
          refreshStatus();
          return;
        }
        applyMove(uciToMove(uci));
      })
      .catch(() => {
        thinking = false;
        setStatus("Engine unavailable");
      });
  }

  function onSquareClick(sq) {
    if (thinking || gameOver) return;
    if (mode === "review") return;

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
          renderBoard();
          return;
        }
        selected = null;
        legalTargets = [];
        applyMove({ from: pick.from, to: pick.to });
        return;
      }
      selected = null;
      legalTargets = [];
      renderBoard();
    }

    const piece = game.get(sq);
    if (!piece) return;
    if (mode === "ai" && piece.color !== humanColor) return;
    if (mode === "puzzle" && piece.color !== puzzlePlayerColor()) return;
    if (mode === "hotseat" && piece.color !== game.turn()) return;

    selected = sq;
    legalTargets = game.moves({ square: sq, verbose: true }).map((m) => m.to);
    renderBoard();
  }

  function completePromotion(pieceType) {
    promoteDialog?.close();
    if (!pendingPromote) return;
    const { from, to } = pendingPromote;
    pendingPromote = null;
    selected = null;
    legalTargets = [];
    applyMove({ from, to, promotion: pieceType });
  }

  function startPuzzle(p) {
    puzzle = p;
    puzzleStep = 1;
    game = new Chess(p.fen);
    gameOver = false;
    result = null;
    undoStack = [];
    redoStack = [];
    if (p.moves.length) {
      game.move(uciToMove(p.moves[0]));
    }
    renderBoard();
    renderMoves();
    if (puzzleMetaEl) {
      puzzleMetaEl.hidden = false;
      puzzleMetaEl.textContent = `Rating ~${p.r} · ${(p.themes || []).join(", ")}`;
    }
    if (btnNextPuzzle) btnNextPuzzle.hidden = true;
    refreshStatus();
    saveGame();
  }

  function pickPuzzle() {
    if (!puzzlePool.length) {
      return withChessLoad("Loading puzzles…", () => fetchPuzzlePack(puzzleTier).then((pack) => {
        puzzlePool = pack;
        if (!pack.length) {
          setStatus("No puzzles in pack");
          return;
        }
        const unsolved = pack.filter((p) => !puzzleStats.solved.includes(p.id));
        const pool = unsolved.length ? unsolved : pack;
        startPuzzle(pool[Math.floor(Math.random() * pool.length)]);
      }));
    }
    const unsolved = puzzlePool.filter((p) => !puzzleStats.solved.includes(p.id));
    const pool = unsolved.length ? unsolved : puzzlePool;
    startPuzzle(pool[Math.floor(Math.random() * pool.length)]);
    return Promise.resolve();
  }

  function newGame() {
    mode = modeSelect?.value || "ai";
    humanColor = sideSelect?.value || "w";
    difficulty = diffSelect?.value || "club";
    puzzleTier = puzzleTierSelect?.value || "beginner";
    gameOver = false;
    result = null;
    thinking = false;
    selected = null;
    legalTargets = [];
    undoStack = [];
    redoStack = [];
    reviewIndex = -1;
    reviewMoves = [];
    reviewGame = null;
    puzzle = null;
    puzzleStep = 0;

    updateModeUI();

    if (mode === "puzzle") {
      puzzlePool = [];
      return fetchOpenings().then(() => pickPuzzle());
    }

    game = new Chess();
    renderBoard();
    renderMoves();
    refreshStatus();
    saveGame();

    if (mode === "ai" && humanColor === "b") {
      runAI();
    }
    return Promise.resolve();
  }

  function updateModeUI() {
    const isPuzzle = mode === "puzzle";
    const isAi = mode === "ai";
    if (sideSelect) sideSelect.hidden = !isAi;
    if (diffSelect) diffSelect.hidden = !isAi;
    if (puzzleTierSelect) puzzleTierSelect.hidden = !isPuzzle;
    if (btnResign) btnResign.hidden = isPuzzle;
    if (btnNextPuzzle) btnNextPuzzle.hidden = !isPuzzle;
    if (puzzleMetaEl) puzzleMetaEl.hidden = !isPuzzle;
  }

  function saveGame() {
    if (!game) return;
    const payload = {
      v: 1,
      mode,
      humanColor,
      difficulty,
      puzzleTier,
      flipped,
      fen: game.fen(),
      history: game.history(),
      gameOver,
      result,
      puzzle: puzzle ? { id: puzzle.id, step: puzzleStep } : null,
    };
    try {
      localStorage.setItem(STATE_KEY, JSON.stringify(payload));
    } catch { /* ignore */ }
  }

  function tryLoadGame() {
    try {
      const raw = localStorage.getItem(STATE_KEY);
      if (!raw) return Promise.resolve(false);
      const s = JSON.parse(raw);
      if (s.v !== 1) return Promise.resolve(false);
      mode = s.mode || "ai";
      humanColor = s.humanColor || "w";
      difficulty = s.difficulty || "club";
      puzzleTier = s.puzzleTier || "beginner";
      flipped = !!s.flipped;
      gameOver = !!s.gameOver;
      result = s.result || null;

      if (modeSelect) modeSelect.value = mode;
      if (sideSelect) sideSelect.value = humanColor;
      if (diffSelect) diffSelect.value = difficulty;
      if (puzzleTierSelect) puzzleTierSelect.value = puzzleTier;
      updateModeUI();

      if (mode === "puzzle" && s.puzzle) {
        return withChessLoad("Loading puzzles…", () => fetchPuzzlePack(puzzleTier).then((pack) => {
          puzzlePool = pack;
          const p = pack.find((x) => x.id === s.puzzle.id);
          if (!p) return newGame().then(() => false);
          puzzle = p;
          puzzleStep = s.puzzle.step || 1;
          game = new Chess(s.fen);
          gameOver = false;
          renderBoard();
          renderMoves();
          refreshStatus();
          return true;
        }));
      }

      game = new Chess();
      const hist = s.history || [];
      for (const san of hist) game.move(san, { sloppy: true });
      renderBoard();
      renderMoves();
      refreshStatus();
      if (mode === "ai" && !gameOver && game.turn() !== humanColor) runAI();
      return Promise.resolve(true);
    } catch {
      return Promise.resolve(false);
    }
  }

  function undo() {
    if (!undoStack.length || thinking) return;
    const fen = undoStack.pop();
    redoStack.push(game.fen());
    game = new Chess(fen);
    selected = null;
    legalTargets = [];
    renderBoard();
    renderMoves();
    refreshStatus();
    updateUndoButtons();
    saveGame();
  }

  function redo() {
    if (!redoStack.length || thinking) return;
    const fen = redoStack.pop();
    undoStack.push(game.fen());
    game = new Chess(fen);
    renderBoard();
    renderMoves();
    refreshStatus();
    updateUndoButtons();
    saveGame();
  }

  function openGamesDialog() {
    loadArchive();
    renderGamesList();
    gamesDialog?.showModal();
  }

  function renderGamesList() {
    if (!gamesListEl) return;
    gamesListEl.innerHTML = "";
    if (!archive.length) {
      const li = document.createElement("li");
      li.textContent = "No saved games yet";
      gamesListEl.appendChild(li);
      return;
    }
    archive.forEach((g) => {
      const li = document.createElement("li");
      li.textContent = `${g.date} · ${g.result}${g.opening ? ` · ${g.opening}` : ""}`;
      li.style.cursor = "pointer";
      li.addEventListener("click", () => {
        selectedArchiveId = g.id;
        openReview(g);
        gamesDialog?.close();
      });
      gamesListEl.appendChild(li);
    });
    if (copyPgnBtn) copyPgnBtn.disabled = !archive.length;
    if (copyFenBtn) copyFenBtn.disabled = !game;
  }

  function openReview(entry) {
    mode = "review";
    if (modeSelect) modeSelect.value = "ai";
    reviewGame = new Chess();
    reviewGame.load_pgn(entry.pgn, { sloppy: true });
    const hist = reviewGame.history();
    reviewMoves = hist;
    reviewIndex = hist.length - 1;
    game = new Chess();
    for (let i = 0; i <= reviewIndex; i++) {
      game.move(hist[i], { sloppy: true });
    }
    gameOver = true;
    result = entry.result;
    renderBoard();
    renderMoves();
    setStatus(`Review: ${entry.opening || entry.result}`);
    updateModeUI();
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
      renderBoard();
      saveGame();
    });
    btnGames?.addEventListener("click", openGamesDialog);
    btnResign?.addEventListener("click", () => {
      if (gameOver || mode !== "ai") return;
      const res = humanColor === "w" ? "0-1" : "1-0";
      finishGame(res);
    });
    btnNextPuzzle?.addEventListener("click", () => pickPuzzle());

    modeSelect?.addEventListener("change", () => newGame());
    sideSelect?.addEventListener("change", () => {
      if (mode === "ai") newGame();
    });
    diffSelect?.addEventListener("change", () => {
      difficulty = diffSelect.value;
      saveGame();
    });
    puzzleTierSelect?.addEventListener("change", () => {
      puzzleTier = puzzleTierSelect.value;
      puzzlePool = [];
      if (mode === "puzzle") newGame();
    });

    gamesCloseBtn?.addEventListener("click", () => gamesDialog?.close());
    gamesDialog?.addEventListener("click", (e) => {
      if (e.target === gamesDialog) gamesDialog.close();
    });

    copyPgnBtn?.addEventListener("click", () => {
      const g = archive[0];
      if (g) copyText(g.pgn);
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
      renderBoard();
    });
  }

  async function bootstrap() {
    try {
      const loaded = await tryLoadGame();
      if (!loaded) await newGame();
    } catch {
      await newGame();
    }
  }

  function init() {
    if (initialized) return;
    initialized = true;
    loadStats();
    loadArchive();
    fetchOpenings();
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
