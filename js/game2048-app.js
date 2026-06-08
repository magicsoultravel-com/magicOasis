(() => {
  const boardEl = document.getElementById("game2048-board");
  const statusEl = document.getElementById("game2048-status");
  const scoreEl = document.getElementById("game2048-score");
  const bestEl = document.getElementById("game2048-best");
  const appEl = document.querySelector(".app");

  const SIZE = 4;
  const STATE_KEY = "game2048-game";
  const BEST_KEY = "game2048-best";
  const WIN_TILE = 2048;

  const DIR = {
    ArrowUp: "up",
    ArrowDown: "down",
    ArrowLeft: "left",
    ArrowRight: "right",
  };

  let grid = [];
  let score = 0;
  let best = 0;
  let gameOver = false;
  let won = false;
  let keepPlaying = false;
  let initialized = false;
  let touchStart = null;

  function emptyGrid() {
    return Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
  }

  function loadBest() {
    try {
      best = parseInt(localStorage.getItem(BEST_KEY), 10) || 0;
    } catch {
      best = 0;
    }
    if (bestEl) bestEl.textContent = String(best);
  }

  function saveBest() {
    if (score > best) {
      best = score;
      try {
        localStorage.setItem(BEST_KEY, String(best));
      } catch {
        /* storage unavailable */
      }
      if (bestEl) bestEl.textContent = String(best);
    }
  }

  function updateScore() {
    if (scoreEl) scoreEl.textContent = String(score);
    saveBest();
  }

  function setStatus(msg) {
    if (statusEl) statusEl.textContent = msg;
  }

  function freeCells() {
    const cells = [];
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        if (!grid[r][c]) cells.push([r, c]);
      }
    }
    return cells;
  }

  function addRandomTile() {
    const free = freeCells();
    if (!free.length) return false;
    const [r, c] = free[Math.floor(Math.random() * free.length)];
    grid[r][c] = Math.random() < 0.9 ? 2 : 4;
    return true;
  }

  function slideLine(line) {
    const filtered = line.filter((v) => v);
    const merged = [];
    let gained = 0;
    let i = 0;
    while (i < filtered.length) {
      if (i + 1 < filtered.length && filtered[i] === filtered[i + 1]) {
        const v = filtered[i] * 2;
        merged.push(v);
        gained += v;
        i += 2;
      } else {
        merged.push(filtered[i]);
        i++;
      }
    }
    while (merged.length < SIZE) merged.push(0);
    return { line: merged, gained, changed: merged.some((v, idx) => v !== line[idx]) };
  }

  function cloneGrid(g) {
    return g.map((row) => [...row]);
  }

  function reverseRows(g) {
    return g.map((row) => [...row].reverse());
  }

  function transpose(g) {
    return g[0].map((_, c) => g.map((row) => row[c]));
  }

  function moveLeft(g) {
    let moved = false;
    let gained = 0;
    const next = g.map((row) => {
      const result = slideLine(row);
      if (result.changed) moved = true;
      gained += result.gained;
      return result.line;
    });
    return { grid: next, moved, gained };
  }

  function transformForDirection(g, direction) {
    if (direction === "left") return g;
    if (direction === "right") return reverseRows(g);
    if (direction === "up") return transpose(g);
    return reverseRows(transpose(g));
  }

  function untransform(g, direction) {
    if (direction === "left") return g;
    if (direction === "right") return reverseRows(g);
    if (direction === "up") return transpose(g);
    return transpose(reverseRows(g));
  }

  function move(direction) {
    if (gameOver) return false;

    const working = transformForDirection(cloneGrid(grid), direction);
    const { grid: slid, moved, gained } = moveLeft(working);
    if (!moved) return false;

    grid = untransform(slid, direction);
    score += gained;
    updateScore();
    addRandomTile();

    if (!won && grid.some((row) => row.some((v) => v >= WIN_TILE))) {
      won = true;
      setStatus("2048! Keep going…");
    } else if (!canMove()) {
      gameOver = true;
      setStatus(`Game over — score ${score}`);
    } else {
      setStatus("Merge tiles to reach 2048");
    }

    render();
    return true;
  }

  function canMove() {
    if (freeCells().length) return true;
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        const v = grid[r][c];
        if (c + 1 < SIZE && grid[r][c + 1] === v) return true;
        if (r + 1 < SIZE && grid[r + 1][c] === v) return true;
      }
    }
    return false;
  }

  function tileClass(v) {
    if (!v) return "g2048-tile g2048-tile--empty";
    const exp = Math.min(17, Math.log2(v));
    return `g2048-tile g2048-tile--${exp}`;
  }

  function render() {
    if (!boardEl) return;

    const tiles = [];
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        const v = grid[r][c];
        tiles.push(
          `<div class="${tileClass(v)}" style="--r:${r};--c:${c}">${v || ""}</div>`
        );
      }
    }

    boardEl.innerHTML = `<div class="g2048-grid">${tiles.join("")}</div>`;
    boardEl.classList.toggle("g2048-board--over", gameOver);
    boardEl.classList.toggle("g2048-board--won", won && !keepPlaying);
  }

  function newGame() {
    grid = emptyGrid();
    score = 0;
    gameOver = false;
    won = false;
    keepPlaying = false;
    updateScore();
    addRandomTile();
    addRandomTile();
    setStatus("Swipe or use arrow keys");
    render();
  }

  function onKeyDown(e) {
    if (window.Games?.active !== "game2048") return;
    const dir = DIR[e.key];
    if (!dir) return;
    e.preventDefault();
    move(dir);
  }

  function bindSwipe() {
    boardEl?.addEventListener(
      "touchstart",
      (e) => {
        const t = e.changedTouches[0];
        touchStart = { x: t.clientX, y: t.clientY };
      },
      { passive: true }
    );

    boardEl?.addEventListener(
      "touchend",
      (e) => {
        if (!touchStart) return;
        const t = e.changedTouches[0];
        const dx = t.clientX - touchStart.x;
        const dy = t.clientY - touchStart.y;
        touchStart = null;
        const ax = Math.abs(dx);
        const ay = Math.abs(dy);
        if (Math.max(ax, ay) < 28) return;
        if (ax > ay) move(dx > 0 ? "right" : "left");
        else move(dy > 0 ? "down" : "up");
      },
      { passive: true }
    );
  }

  function saveGame() {
    if (!initialized) return;
    try {
      localStorage.setItem(
        STATE_KEY,
        JSON.stringify({ grid, score, gameOver, won, keepPlaying })
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
      if (!Array.isArray(data.grid)) return false;
      grid = data.grid;
      score = data.score || 0;
      gameOver = data.gameOver;
      won = data.won;
      keepPlaying = data.keepPlaying;
      updateScore();
      render();
      setStatus(gameOver ? `Game over — score ${score}` : "Merge tiles to reach 2048");
      return true;
    } catch {
      return false;
    }
  }

  function init() {
    if (!initialized) {
      initialized = true;
      loadBest();
      bindSwipe();
      document.addEventListener("keydown", onKeyDown);
      document.getElementById("btn-game2048-new")?.addEventListener("click", newGame);
      document.getElementById("btn-game2048-restart")?.addEventListener("click", newGame);
    }

    if (!loadGame()) {
      newGame();
    }
  }

  window.Game2048App = { init, saveGame, newGame };
})();
