(() => {
  const boardEl = document.getElementById("reversi-board");
  const statusEl = document.getElementById("reversi-status");
  const scoreEl = document.getElementById("reversi-score");

  const SIZE = 8;
  const EMPTY = 0;
  const BLACK = 1;
  const WHITE = 2;
  const STATE_KEY = "reversi-game";

  const DIRS = [
    [-1, -1], [-1, 0], [-1, 1],
    [0, -1],           [0, 1],
    [1, -1],  [1, 0],  [1, 1],
  ];

  let board = [];
  let current = BLACK;
  let gameOver = false;
  let passStreak = 0;
  let hints = true;
  let initialized = false;

  function emptyBoard() {
    return Array.from({ length: SIZE }, () => Array(SIZE).fill(EMPTY));
  }

  function inBounds(r, c) {
    return r >= 0 && r < SIZE && c >= 0 && c < SIZE;
  }

  function opponent(p) {
    return p === BLACK ? WHITE : BLACK;
  }

  function flipsForMove(r, c, player, grid = board) {
    if (!inBounds(r, c) || grid[r][c] !== EMPTY) return [];
    const all = [];
    for (const [dr, dc] of DIRS) {
      const line = [];
      let nr = r + dr;
      let nc = c + dc;
      while (inBounds(nr, nc) && grid[nr][nc] === opponent(player)) {
        line.push([nr, nc]);
        nr += dr;
        nc += dc;
      }
      if (line.length && inBounds(nr, nc) && grid[nr][nc] === player) {
        all.push(...line);
      }
    }
    return all;
  }

  function legalMoves(player, grid = board) {
    const moves = [];
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        if (flipsForMove(r, c, player, grid).length) moves.push([r, c]);
      }
    }
    return moves;
  }

  function applyMove(r, c, player) {
    const flips = flipsForMove(r, c, player);
    if (!flips.length) return false;
    board[r][c] = player;
    for (const [fr, fc] of flips) board[fr][fc] = player;
    return true;
  }

  function countDiscs() {
    let black = 0;
    let white = 0;
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        if (board[r][c] === BLACK) black++;
        else if (board[r][c] === WHITE) white++;
      }
    }
    return { black, white };
  }

  function setStatus(msg) {
    if (statusEl) statusEl.textContent = msg;
  }

  function updateScore() {
    const { black, white } = countDiscs();
    if (scoreEl) scoreEl.textContent = `You ${black} · AI ${white}`;
  }

  function evaluateMove(r, c, player) {
    const flips = flipsForMove(r, c, player);
    let score = flips.length;
    const corners = [[0, 0], [0, 7], [7, 0], [7, 7]];
    for (const [cr, cc] of corners) {
      if (r === cr && c === cc) score += 12;
    }
    const bad = [[0, 1], [1, 0], [1, 1], [0, 6], [1, 6], [1, 7], [6, 0], [6, 1], [7, 1], [6, 6], [6, 7], [7, 6]];
    for (const [br, bc] of bad) {
      if (r === br && c === bc) score -= 4;
    }
    if (r === 0 || r === 7 || c === 0 || c === 7) score += 2;
    return score;
  }

  function aiMove() {
    const moves = legalMoves(WHITE);
    if (!moves.length) return false;

    let best = moves[0];
    let bestScore = -Infinity;
    for (const [r, c] of moves) {
      const score = evaluateMove(r, c, WHITE) + Math.random() * 1.5;
      if (score > bestScore) {
        bestScore = score;
        best = [r, c];
      }
    }
    applyMove(best[0], best[1], WHITE);
    return true;
  }

  function endCheck() {
    const blackMoves = legalMoves(BLACK);
    const whiteMoves = legalMoves(WHITE);
    if (!blackMoves.length && !whiteMoves.length) {
      gameOver = true;
      const { black, white } = countDiscs();
      if (black > white) setStatus(`You win ${black}–${white}!`);
      else if (white > black) setStatus(`AI wins ${white}–${black}.`);
      else setStatus(`Draw ${black}–${white}.`);
      render();
      return true;
    }
    return false;
  }

  function switchTurn() {
    if (endCheck()) return;
    current = opponent(current);
    const moves = legalMoves(current);
    if (!moves.length) {
      passStreak++;
      if (passStreak >= 2) {
        endCheck();
        return;
      }
      setStatus(current === BLACK ? "You pass — no legal moves" : "AI passes");
      current = opponent(current);
      if (current === WHITE) {
        setTimeout(() => {
          if (!gameOver && window.Games?.active === "reversi") {
            aiMove();
            passStreak = 0;
            current = BLACK;
            if (!endCheck()) {
              setStatus("Your turn — tap a highlighted cell");
              render();
            }
          }
        }, 450);
      }
      render();
      return;
    }
    passStreak = 0;
    if (current === WHITE) {
      setTimeout(() => {
        if (!gameOver && window.Games?.active === "reversi") {
          aiMove();
          current = BLACK;
          if (!endCheck()) {
            setStatus("Your turn — tap a highlighted cell");
            render();
          }
        }
      }, 500);
    } else {
      setStatus("Your turn — tap a highlighted cell");
    }
    render();
  }

  function onCellClick(r, c) {
    if (gameOver || current !== BLACK) return;
    if (!applyMove(r, c, BLACK)) return;
    current = WHITE;
    updateScore();
    switchTurn();
  }

  function render() {
    if (!boardEl) return;

    const legal = current === BLACK && !gameOver ? legalMoves(BLACK) : [];
    const legalSet = new Set(legal.map(([r, c]) => `${r},${c}`));
    const cells = [];

    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        const v = board[r][c];
        let cls = "rv-cell";
        if (v === BLACK) cls += " rv-cell--black";
        else if (v === WHITE) cls += " rv-cell--white";
        else if (legalSet.has(`${r},${c}`) && hints) cls += " rv-cell--hint";

        const label =
          v === BLACK ? "Black" : v === WHITE ? "White" : legalSet.has(`${r},${c}`) ? "Legal move" : "Empty";

        cells.push(
          `<button type="button" class="${cls}" data-r="${r}" data-c="${c}" aria-label="${label}"${v || gameOver || current !== BLACK ? "" : ""}></button>`
        );
      }
    }

    boardEl.innerHTML = cells.join("");
    boardEl.classList.toggle("rv-board--over", gameOver);
    updateScore();
  }

  function onBoardClick(e) {
    if (window.Games?.active !== "reversi") return;
    const btn = e.target.closest(".rv-cell");
    if (!btn) return;
    onCellClick(parseInt(btn.dataset.r, 10), parseInt(btn.dataset.c, 10));
  }

  function newGame() {
    board = emptyBoard();
    board[3][3] = WHITE;
    board[3][4] = BLACK;
    board[4][3] = BLACK;
    board[4][4] = WHITE;
    current = BLACK;
    gameOver = false;
    passStreak = 0;
    setStatus("Your turn — tap a highlighted cell");
    render();
  }

  function passTurn() {
    if (gameOver || current !== BLACK) return;
    passStreak++;
    current = WHITE;
    switchTurn();
  }

  function saveGame() {
    if (!initialized) return;
    try {
      localStorage.setItem(
        STATE_KEY,
        JSON.stringify({ board, current, gameOver, passStreak, hints })
      );
    } catch {
      /* storage unavailable */
    }
  }

  function loadGame() {
    try {
      const raw = localStorage.getItem(STATE_KEY);
      if (!raw) return false;
      const data = JSON.parse(raw);
      if (!data.board) return false;
      board = data.board;
      current = data.current;
      gameOver = !!data.gameOver;
      passStreak = data.passStreak || 0;
      hints = data.hints !== false;
      if (gameOver) {
        const { black, white } = countDiscs();
        if (black > white) setStatus(`You win ${black}–${white}!`);
        else if (white > black) setStatus(`AI wins ${white}–${black}.`);
        else setStatus(`Draw ${black}–${white}.`);
      } else {
        setStatus(current === BLACK ? "Your turn — tap a highlighted cell" : "AI thinking…");
      }
      render();
      return true;
    } catch {
      return false;
    }
  }

  function init() {
    if (!initialized) {
      initialized = true;
      boardEl?.addEventListener("click", onBoardClick);
      document.getElementById("btn-reversi-new")?.addEventListener("click", newGame);
      document.getElementById("btn-reversi-restart")?.addEventListener("click", newGame);
      document.getElementById("btn-reversi-pass")?.addEventListener("click", passTurn);
      document.getElementById("btn-reversi-hints")?.addEventListener("click", () => {
        hints = !hints;
        document.getElementById("btn-reversi-hints")?.classList.toggle("active", hints);
        render();
      });
    }

    if (!loadGame()) {
      newGame();
    }
  }

  window.ReversiApp = { init, saveGame, newGame };
})();
