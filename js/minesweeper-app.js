(() => {
  const boardEl = document.getElementById("minesweeper-board");
  const statusEl = document.getElementById("minesweeper-status");
  const timerEl = document.getElementById("minesweeper-timer");
  const minesLeftEl = document.getElementById("minesweeper-mines-left");
  const difficultyEl = document.getElementById("minesweeper-difficulty");

  const CONFIGS = {
    easy: { rows: 9, cols: 9, mines: 10 },
    medium: { rows: 12, cols: 12, mines: 22 },
    hard: { rows: 16, cols: 16, mines: 40 },
  };

  const STATE_KEY = "minesweeper-game";

  let rows = 9;
  let cols = 9;
  let mineCount = 10;
  let mines = new Set();
  let revealed = new Set();
  let flagged = new Set();
  let gameOver = false;
  let won = false;
  let firstClick = true;
  let timerInterval = null;
  let seconds = 0;
  let initialized = false;
  let longPressTimer = null;

  function config() {
    const diff = difficultyEl?.value || "easy";
    return CONFIGS[diff] ?? CONFIGS.easy;
  }

  function key(r, c) {
    return `${r},${c}`;
  }

  function neighbors(r, c) {
    const list = [];
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (!dr && !dc) continue;
        const nr = r + dr;
        const nc = c + dc;
        if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) list.push([nr, nc]);
      }
    }
    return list;
  }

  function countAdjacent(r, c) {
    let n = 0;
    for (const [nr, nc] of neighbors(r, c)) {
      if (mines.has(key(nr, nc))) n++;
    }
    return n;
  }

  function placeMines(safeR, safeC) {
    mines.clear();
    const safe = new Set([key(safeR, safeC)]);
    for (const [nr, nc] of neighbors(safeR, safeC)) safe.add(key(nr, nc));

    const spots = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (!safe.has(key(r, c))) spots.push([r, c]);
      }
    }

    for (let i = spots.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [spots[i], spots[j]] = [spots[j], spots[i]];
    }

    for (let i = 0; i < Math.min(mineCount, spots.length); i++) {
      mines.add(key(spots[i][0], spots[i][1]));
    }
  }

  function updateMinesLeft() {
    if (minesLeftEl) minesLeftEl.textContent = String(Math.max(0, mineCount - flagged.size));
  }

  function formatTime(s) {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  }

  function startTimer() {
    if (timerInterval) return;
    timerInterval = setInterval(() => {
      seconds++;
      if (timerEl) timerEl.textContent = formatTime(seconds);
    }, 1000);
  }

  function stopTimer() {
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
  }

  function setStatus(msg) {
    if (statusEl) statusEl.textContent = msg;
  }

  function checkWin() {
    if (revealed.size === rows * cols - mines.size) {
      won = true;
      gameOver = true;
      stopTimer();
      setStatus("You win!");
      render();
    }
  }

  function reveal(r, c) {
    if (gameOver || flagged.has(key(r, c)) || revealed.has(key(r, c))) return;

    if (firstClick) {
      firstClick = false;
      placeMines(r, c);
      startTimer();
    }

    const k = key(r, c);
    revealed.add(k);

    if (mines.has(k)) {
      gameOver = true;
      stopTimer();
      setStatus("Boom! Tap restart to try again.");
      render(true);
      return;
    }

    const n = countAdjacent(r, c);
    if (n === 0) {
      for (const [nr, nc] of neighbors(r, c)) {
        if (!revealed.has(key(nr, nc))) reveal(nr, nc);
      }
    }

    checkWin();
    if (!gameOver) render();
  }

  function toggleFlag(r, c) {
    if (gameOver || revealed.has(key(r, c))) return;
    const k = key(r, c);
    if (flagged.has(k)) flagged.delete(k);
    else flagged.add(k);
    updateMinesLeft();
    render();
  }

  function render(showMines = false) {
    if (!boardEl) return;

    boardEl.style.setProperty("--ms-cols", String(cols));
    const cells = [];

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const k = key(r, c);
        const isMine = mines.has(k);
        const isRev = revealed.has(k);
        const isFlag = flagged.has(k);
        let cls = "ms-cell";
        let label = "";

        if (isRev) {
          cls += " ms-cell--revealed";
          if (isMine) {
            cls += " ms-cell--mine";
            label = "💣";
          } else {
            const n = countAdjacent(r, c);
            if (n > 0) {
              cls += ` ms-cell--n${n}`;
              label = String(n);
            }
          }
        } else if (isFlag) {
          cls += " ms-cell--flagged";
          label = "🚩";
        } else if (showMines && isMine) {
          cls += " ms-cell--mine-hint";
          label = "💣";
        }

        cells.push(
          `<button type="button" class="${cls}" data-r="${r}" data-c="${c}" aria-label="Cell ${r + 1}, ${c + 1}">${label}</button>`
        );
      }
    }

    boardEl.innerHTML = cells.join("");
    boardEl.classList.toggle("ms-board--won", won);
    boardEl.classList.toggle("ms-board--lost", gameOver && !won);
  }

  function onCellClick(e) {
    const btn = e.target.closest(".ms-cell");
    if (!btn || window.Games?.active !== "minesweeper") return;
    const r = parseInt(btn.dataset.r, 10);
    const c = parseInt(btn.dataset.c, 10);
    reveal(r, c);
  }

  function onCellContext(e) {
    const btn = e.target.closest(".ms-cell");
    if (!btn) return;
    e.preventDefault();
    const r = parseInt(btn.dataset.r, 10);
    const c = parseInt(btn.dataset.c, 10);
    toggleFlag(r, c);
  }

  function onPointerDown(e) {
    const btn = e.target.closest(".ms-cell");
    if (!btn) return;
    longPressTimer = setTimeout(() => {
      const r = parseInt(btn.dataset.r, 10);
      const c = parseInt(btn.dataset.c, 10);
      toggleFlag(r, c);
      longPressTimer = null;
    }, 450);
  }

  function clearLongPress() {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      longPressTimer = null;
    }
  }

  function newGame() {
    const cfg = config();
    rows = cfg.rows;
    cols = cfg.cols;
    mineCount = cfg.mines;
    mines.clear();
    revealed.clear();
    flagged.clear();
    gameOver = false;
    won = false;
    firstClick = true;
    seconds = 0;
    stopTimer();
    if (timerEl) timerEl.textContent = "0:00";
    updateMinesLeft();
    setStatus("Tap to reveal · long-press to flag");
    render();
  }

  function saveGame() {
    if (!initialized || firstClick) return;
    try {
      localStorage.setItem(
        STATE_KEY,
        JSON.stringify({
          rows,
          cols,
          mineCount,
          mines: [...mines],
          revealed: [...revealed],
          flagged: [...flagged],
          gameOver,
          won,
          firstClick,
          seconds,
        })
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
      if (!data.rows) return false;
      rows = data.rows;
      cols = data.cols;
      mineCount = data.mineCount;
      mines = new Set(data.mines);
      revealed = new Set(data.revealed);
      flagged = new Set(data.flagged);
      gameOver = data.gameOver;
      won = data.won;
      firstClick = data.firstClick;
      seconds = data.seconds || 0;
      if (timerEl) timerEl.textContent = formatTime(seconds);
      updateMinesLeft();
      if (!gameOver && !firstClick) startTimer();
      setStatus(won ? "You win!" : gameOver ? "Boom!" : "Keep sweeping!");
      render(gameOver && !won);
      return true;
    } catch {
      return false;
    }
  }

  function init() {
    if (!initialized) {
      initialized = true;
      boardEl?.addEventListener("click", onCellClick);
      boardEl?.addEventListener("contextmenu", onCellContext);
      boardEl?.addEventListener("pointerdown", onPointerDown);
      boardEl?.addEventListener("pointerup", clearLongPress);
      boardEl?.addEventListener("pointerleave", clearLongPress);
      boardEl?.addEventListener("pointercancel", clearLongPress);
      document.getElementById("btn-minesweeper-new")?.addEventListener("click", newGame);
      document.getElementById("btn-minesweeper-restart")?.addEventListener("click", newGame);
      difficultyEl?.addEventListener("change", newGame);
    }

    if (!loadGame()) {
      newGame();
    }
  }

  window.MinesweeperApp = { init, saveGame, newGame };
})();
