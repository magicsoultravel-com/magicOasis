(() => {
  const boardEl = document.getElementById("slitherlink-board");
  const statusEl = document.getElementById("slitherlink-status");
  const difficultyEl = document.getElementById("slitherlink-difficulty");

  const CONFIGS = {
    easy: { rows: 7, cols: 7 },
    medium: { rows: 10, cols: 10 },
    hard: { rows: 13, cols: 13 },
  };

  const STATE_KEY = "slitherlink-game";

  let rows = 7;
  let cols = 7;
  let clues = [];
  let solutionH = [];
  let solutionV = [];
  let playerH = [];
  let playerV = [];
  let undoStack = [];
  let seed = 1;
  let solved = false;
  let initialized = false;

  function mulberry32(a) {
    return function () {
      let t = (a += 0x6d2b79f5);
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function hashSeed(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function neighbors4(r, c) {
    const list = [];
    if (r > 0) list.push([r - 1, c]);
    if (r < rows - 1) list.push([r + 1, c]);
    if (c > 0) list.push([r, c - 1]);
    if (c < cols - 1) list.push([r, c + 1]);
    return list;
  }

  function generateInside(rng) {
    const inside = Array.from({ length: rows }, () => Array(cols).fill(0));
    const sr = Math.floor(rng() * rows);
    const sc = Math.floor(rng() * cols);
    const target = Math.max(4, Math.floor(rows * cols * (0.28 + rng() * 0.35)));
    const queue = [[sr, sc]];
    inside[sr][sc] = 1;
    let count = 1;

    while (queue.length && count < target) {
      const idx = Math.floor(rng() * queue.length);
      const [r, c] = queue.splice(idx, 1)[0];
      for (const [nr, nc] of neighbors4(r, c)) {
        if (!inside[nr][nc] && rng() > 0.38) {
          inside[nr][nc] = 1;
          count++;
          queue.push([nr, nc]);
        }
      }
    }
    return inside;
  }

  function loopFromInside(inside) {
    const h = Array.from({ length: rows + 1 }, () => Array(cols).fill(false));
    const v = Array.from({ length: rows }, () => Array(cols + 1).fill(false));

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const inCell = inside[r][c];
        if (r === 0) {
          if (inCell) h[0][c] = true;
        } else if (inCell !== inside[r - 1][c]) {
          h[r][c] = true;
        }
        if (r === rows - 1) {
          if (inCell) h[rows][c] = true;
        } else if (inCell !== inside[r + 1][c]) {
          h[r + 1][c] = true;
        }
        if (c === 0) {
          if (inCell) v[r][0] = true;
        } else if (inCell !== inside[r][c - 1]) {
          v[r][c] = true;
        }
        if (c === cols - 1) {
          if (inCell) v[r][cols] = true;
        } else if (inCell !== inside[r][c + 1]) {
          v[r][c + 1] = true;
        }
      }
    }
    return { h, v };
  }

  function cluesFromLoop(h, v) {
    const grid = Array.from({ length: rows }, () => Array(cols).fill(null));
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        let n = 0;
        if (h[r][c]) n++;
        if (h[r + 1][c]) n++;
        if (v[r][c]) n++;
        if (v[r][c + 1]) n++;
        grid[r][c] = n;
      }
    }
    return grid;
  }

  function generatePuzzle(gameSeed) {
    const rng = mulberry32(hashSeed(`${gameSeed}-${rows}x${cols}`));
    for (let attempt = 0; attempt < 40; attempt++) {
      const inside = generateInside(rng);
      const { h, v } = loopFromInside(inside);
      const grid = cluesFromLoop(h, v);
      const hasVariety = grid.some((row) => row.some((n) => n > 0 && n < 4));
      if (hasVariety) {
        return { clues: grid, h, v };
      }
    }
    const inside = generateInside(rng);
    const { h, v } = loopFromInside(inside);
    return { clues: cluesFromLoop(h, v), h, v };
  }

  function emptyEdges() {
    playerH = Array.from({ length: rows + 1 }, () => Array(cols).fill(false));
    playerV = Array.from({ length: rows }, () => Array(cols + 1).fill(false));
  }

  function setStatus(msg) {
    if (statusEl) statusEl.textContent = msg;
  }

  function edgeCount(r, c) {
    let n = 0;
    if (playerH[r][c]) n++;
    if (playerH[r + 1][c]) n++;
    if (playerV[r][c]) n++;
    if (playerV[r][c + 1]) n++;
    return n;
  }

  function cluesSatisfied() {
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const clue = clues[r][c];
        if (clue === null) continue;
        if (edgeCount(r, c) !== clue) return false;
      }
    }
    return true;
  }

  function validateLoop() {
    const dotDeg = Array.from({ length: rows + 1 }, () => Array(cols + 1).fill(0));

    for (let r = 0; r <= rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (playerH[r][c]) {
          dotDeg[r][c]++;
          dotDeg[r][c + 1]++;
        }
      }
    }
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c <= cols; c++) {
        if (playerV[r][c]) {
          dotDeg[r][c]++;
          dotDeg[r + 1][c]++;
        }
      }
    }

    let onLoop = 0;
    for (let r = 0; r <= rows; r++) {
      for (let c = 0; c <= cols; c++) {
        if (dotDeg[r][c] !== 0 && dotDeg[r][c] !== 2) return false;
        if (dotDeg[r][c] === 2) onLoop++;
      }
    }
    if (onLoop === 0) return false;

    let start = null;
    for (let r = 0; r <= rows && !start; r++) {
      for (let c = 0; c <= cols; c++) {
        if (dotDeg[r][c] === 2) {
          start = [r, c];
          break;
        }
      }
    }
    if (!start) return false;

    const visited = new Set();
    let prev = null;
    let cur = start;
    let steps = 0;
    const maxSteps = onLoop + 5;

    while (steps < maxSteps) {
      const key = `${cur[0]},${cur[1]}`;
      if (visited.has(key) && steps > 0) break;
      visited.add(key);
      steps++;

      const [cr, cc] = cur;
      const options = [];
      if (cc > 0 && playerH[cr][cc - 1]) options.push([cr, cc - 1]);
      if (cc < cols && playerH[cr][cc]) options.push([cr, cc + 1]);
      if (cr > 0 && playerV[cr - 1][cc]) options.push([cr - 1, cc]);
      if (cr < rows && playerV[cr][cc]) options.push([cr + 1, cc]);

      const next = options.find(([nr, nc]) => !prev || nr !== prev[0] || nc !== prev[1]);
      if (!next) return false;
      prev = cur;
      cur = next;
    }

    return visited.size === onLoop;
  }

  function checkWin() {
    if (!cluesSatisfied()) return false;
    if (!validateLoop()) return false;
    solved = true;
    setStatus("Loop complete!");
    render();
    return true;
  }

  function toggleHEdge(r, c) {
    if (solved) return;
    const was = playerH[r][c];
    playerH[r][c] = !was;
    undoStack.push({ type: "h", r, c, was });
    if (undoStack.length > 80) undoStack.shift();
    if (!checkWin()) {
      setStatus("Tap edges to draw one closed loop");
      render();
    }
  }

  function toggleVEdge(r, c) {
    if (solved) return;
    const was = playerV[r][c];
    playerV[r][c] = !was;
    undoStack.push({ type: "v", r, c, was });
    if (undoStack.length > 80) undoStack.shift();
    if (!checkWin()) {
      setStatus("Tap edges to draw one closed loop");
      render();
    }
  }

  function undo() {
    if (!undoStack.length || solved) return;
    const last = undoStack.pop();
    if (last.type === "h") playerH[last.r][last.c] = last.was;
    else playerV[last.r][last.c] = last.was;
    setStatus("Tap edges to draw one closed loop");
    render();
  }

  function render() {
    if (!boardEl) return;

    boardEl.style.setProperty("--sl-cols", String(cols));
    boardEl.style.setProperty("--sl-rows", String(rows));
    boardEl.classList.toggle("sl-board--solved", solved);

    const parts = ['<div class="sl-inner">'];

    parts.push('<div class="sl-dots" aria-hidden="true">');
    for (let r = 0; r <= rows; r++) {
      for (let c = 0; c <= cols; c++) {
        parts.push(`<span class="sl-dot" style="--dr:${r};--dc:${c}"></span>`);
      }
    }
    parts.push("</div>");

    parts.push('<div class="sl-edges">');
    for (let r = 0; r <= rows; r++) {
      for (let c = 0; c < cols; c++) {
        const on = playerH[r][c];
        parts.push(
          `<button type="button" class="sl-edge sl-edge--h${on ? " is-on" : ""}" data-kind="h" data-r="${r}" data-c="${c}" style="--dr:${r};--dc:${c}" aria-label="Horizontal edge ${r + 1},${c + 1}"></button>`
        );
      }
    }
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c <= cols; c++) {
        const on = playerV[r][c];
        parts.push(
          `<button type="button" class="sl-edge sl-edge--v${on ? " is-on" : ""}" data-kind="v" data-r="${r}" data-c="${c}" style="--dr:${r};--dc:${c}" aria-label="Vertical edge ${r + 1},${c + 1}"></button>`
        );
      }
    }
    parts.push("</div>");

    parts.push('<div class="sl-cells">');
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const clue = clues[r][c];
        const cls =
          clue === null
            ? "sl-cell sl-cell--blank"
            : `sl-cell sl-cell--clue${edgeCount(r, c) === clue ? " is-done" : ""}`;
        const label = clue === null ? "" : String(clue);
        parts.push(
          `<div class="${cls}" style="--dr:${r};--dc:${c}" aria-label="${clue === null ? "Empty" : `Clue ${clue}`}">${label}</div>`
        );
      }
    }
    parts.push("</div></div>");

    boardEl.innerHTML = parts.join("");
  }

  function onBoardClick(e) {
    if (window.Games?.active !== "slitherlink") return;
    const edge = e.target.closest(".sl-edge");
    if (!edge) return;
    const kind = edge.dataset.kind;
    const r = parseInt(edge.dataset.r, 10);
    const c = parseInt(edge.dataset.c, 10);
    if (kind === "h") toggleHEdge(r, c);
    else toggleVEdge(r, c);
  }

  function newGame(nextSeed) {
    const cfg = CONFIGS[difficultyEl?.value || "easy"] ?? CONFIGS.easy;
    rows = cfg.rows;
    cols = cfg.cols;
    seed = nextSeed ?? Date.now();
    const puzzle = generatePuzzle(seed);
    clues = puzzle.clues;
    solutionH = puzzle.h;
    solutionV = puzzle.v;
    emptyEdges();
    undoStack = [];
    solved = false;
    setStatus("Tap edges to draw one closed loop");
    render();
  }

  function saveGame() {
    if (!initialized) return;
    try {
      localStorage.setItem(
        STATE_KEY,
        JSON.stringify({
          rows,
          cols,
          clues,
          playerH,
          playerV,
          seed,
          solved,
          difficulty: difficultyEl?.value,
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
      if (!data.rows || !data.clues) return false;
      if (data.difficulty && difficultyEl) difficultyEl.value = data.difficulty;
      rows = data.rows;
      cols = data.cols;
      clues = data.clues;
      playerH = data.playerH;
      playerV = data.playerV;
      seed = data.seed;
      solved = !!data.solved;
      undoStack = [];
      setStatus(solved ? "Loop complete!" : "Tap edges to draw one closed loop");
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
      document.getElementById("btn-slitherlink-new")?.addEventListener("click", () => newGame());
      document.getElementById("btn-slitherlink-restart")?.addEventListener("click", () => newGame(seed));
      document.getElementById("btn-slitherlink-undo")?.addEventListener("click", undo);
      difficultyEl?.addEventListener("change", () => newGame());
    }

    if (!loadGame()) {
      newGame();
    }
  }

  window.SlitherlinkApp = { init, saveGame, newGame };
})();
