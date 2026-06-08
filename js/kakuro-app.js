(() => {
  const boardEl = document.getElementById("kakuro-board");
  const statusEl = document.getElementById("kakuro-status");
  const difficultyEl = document.getElementById("kakuro-difficulty");
  const guideDialog = document.getElementById("kakuro-guide-dialog");
  const guideBody = document.getElementById("kakuro-guide-body");

  const STATE_KEY = "kakuro-game";

  let rows = 5;
  let cols = 5;
  let grid = [];
  let clues = {};
  let solution = {};
  let values = {};
  let notes = {};
  let selected = null;
  let pencilMode = false;
  let puzzleIndex = 0;
  let solved = false;
  let initialized = false;

  function key(r, c) {
    return `${r},${c}`;
  }

  function isWhite(r, c) {
    return grid[r]?.[c] === 1;
  }

  function getRuns() {
    const runs = [];

    for (let r = 0; r < rows; r++) {
      let c = 0;
      while (c < cols) {
        if (!isWhite(r, c)) {
          c++;
          continue;
        }
        const start = c;
        const cells = [];
        while (c < cols && isWhite(r, c)) {
          cells.push([r, c]);
          c++;
        }
        if (cells.length > 1) {
          const clueCell = [r, start - 1];
          const clueKey = key(clueCell[0], clueCell[1]);
          const sum = clues[clueKey]?.across;
          if (sum) runs.push({ cells, sum, dir: "across" });
        }
      }
    }

    for (let c = 0; c < cols; c++) {
      let r = 0;
      while (r < rows) {
        if (!isWhite(r, c)) {
          r++;
          continue;
        }
        const start = r;
        const cells = [];
        while (r < rows && isWhite(r, c)) {
          cells.push([r, c]);
          r++;
        }
        if (cells.length > 1) {
          const clueCell = [start - 1, c];
          const clueKey = key(clueCell[0], clueCell[1]);
          const sum = clues[clueKey]?.down;
          if (sum) runs.push({ cells, sum, dir: "down" });
        }
      }
    }

    return runs;
  }

  function runSum(run) {
    let total = 0;
    let filled = 0;
    for (const [r, c] of run.cells) {
      const v = values[key(r, c)];
      if (v) {
        total += v;
        filled++;
      }
    }
    return { total, filled, complete: filled === run.cells.length };
  }

  function hasDuplicateInRun(run) {
    const seen = new Set();
    for (const [r, c] of run.cells) {
      const v = values[key(r, c)];
      if (!v) continue;
      if (seen.has(v)) return true;
      seen.add(v);
    }
    return false;
  }

  function setStatus(msg) {
    if (statusEl) statusEl.textContent = msg;
  }

  function loadPuzzle(diff, index) {
    const list = KakuroPuzzles[diff] ?? KakuroPuzzles.easy;
    const puzzle = list[index % list.length];
    rows = puzzle.rows;
    cols = puzzle.cols;
    grid = puzzle.grid.map((row) => [...row]);
    clues = { ...puzzle.clues };
    solution = { ...puzzle.solution };
    values = {};
    notes = {};
    selected = null;
    solved = false;
    puzzleIndex = index % list.length;
    setStatus("Fill white cells — sums must match clues");
    render();
  }

  function newGame() {
    const diff = difficultyEl?.value || "easy";
    const list = KakuroPuzzles[diff] ?? KakuroPuzzles.easy;
    const index = Math.floor(Math.random() * list.length);
    loadPuzzle(diff, index);
  }

  function checkWin() {
    const runs = getRuns();
    for (const run of runs) {
      const { total, complete } = runSum(run);
      if (!complete || total !== run.sum || hasDuplicateInRun(run)) return false;
    }
    for (const k of Object.keys(solution)) {
      if (values[k] !== solution[k]) return false;
    }
    solved = true;
    setStatus("Puzzle complete!");
    render();
    return true;
  }

  function cellError(r, c) {
    const k = key(r, c);
    const v = values[k];
    if (!v) return false;
    const runs = getRuns().filter((run) => run.cells.some(([rr, cc]) => rr === r && cc === c));
    for (const run of runs) {
      const { total, complete } = runSum(run);
      if (hasDuplicateInRun(run)) return true;
      if (complete && total !== run.sum) return true;
      if (!complete && total > run.sum) return true;
    }
    return false;
  }

  function setValue(r, c, num) {
    if (!isWhite(r, c) || solved) return;
    const k = key(r, c);
    if (pencilMode) {
      if (!notes[k]) notes[k] = new Set();
      if (notes[k].has(num)) notes[k].delete(num);
      else notes[k].add(num);
      if (!notes[k].size) delete notes[k];
    } else {
      if (values[k] === num) delete values[k];
      else values[k] = num;
      delete notes[k];
    }
    if (!checkWin()) {
      setStatus("Fill white cells — sums must match clues");
      render();
    }
  }

  function clearCell() {
    if (!selected || solved) return;
    const k = key(selected.r, selected.c);
    delete values[k];
    delete notes[k];
    setStatus("Fill white cells — sums must match clues");
    render();
  }

  function renderClueCell(r, c) {
    const clue = clues[key(r, c)];
    if (!clue) return '<span class="kk-clue-empty"></span>';
    const down = clue.down != null ? `<span class="kk-clue-down">${clue.down}</span>` : "";
    const across = clue.across != null ? `<span class="kk-clue-across">${clue.across}</span>` : "";
    return `<span class="kk-clue">${down}${across}</span>`;
  }

  function renderNotes(r, c) {
    const set = notes[key(r, c)];
    if (!set?.size) return "";
    const bits = Array.from({ length: 9 }, (_, i) => {
      const n = i + 1;
      return `<span class="kk-note${set.has(n) ? " is-on" : ""}">${set.has(n) ? n : ""}</span>`;
    });
    return `<span class="kk-notes">${bits.join("")}</span>`;
  }

  function render() {
    if (!boardEl) return;

    boardEl.style.setProperty("--kk-cols", String(cols));
    boardEl.classList.toggle("kk-board--solved", solved);

    const cells = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const white = isWhite(r, c);
        const k = key(r, c);
        const sel = selected?.r === r && selected?.c === c;
        const err = white && cellError(r, c);
        let cls = white ? "kk-cell kk-cell--white" : "kk-cell kk-cell--black";
        if (sel) cls += " is-selected";
        if (err) cls += " is-error";
        if (white && values[k]) cls += " is-filled";

        let inner = "";
        if (white) {
          inner = values[k]
            ? `<span class="kk-val">${values[k]}</span>`
            : renderNotes(r, c);
        } else {
          inner = renderClueCell(r, c);
        }

        cells.push(
          `<button type="button" class="${cls}" data-r="${r}" data-c="${c}" aria-label="Cell ${r + 1}, ${c + 1}">${inner}</button>`
        );
      }
    }

    boardEl.innerHTML = cells.join("");
  }

  function onBoardClick(e) {
    if (window.Games?.active !== "kakuro") return;
    const btn = e.target.closest(".kk-cell");
    if (!btn) return;
    const r = parseInt(btn.dataset.r, 10);
    const c = parseInt(btn.dataset.c, 10);
    if (!isWhite(r, c)) return;
    selected = { r, c };
    render();
  }

  function onKeyDown(e) {
    if (window.Games?.active !== "kakuro" || !selected) return;
    if (e.key >= "1" && e.key <= "9") {
      setValue(selected.r, selected.c, parseInt(e.key, 10));
      e.preventDefault();
    } else if (e.key === "Backspace" || e.key === "Delete" || e.key === "0") {
      clearCell();
      e.preventDefault();
    }
  }

  function renderGuide() {
    if (!guideBody) return;
    guideBody.innerHTML = KakuroGuide.map(
      (s) => `<section class="lesson-section"><h3>${s.title}</h3><p>${s.body}</p></section>`
    ).join("");
  }

  function saveGame() {
    if (!initialized) return;
    try {
      localStorage.setItem(
        STATE_KEY,
        JSON.stringify({
          rows,
          cols,
          grid,
          clues,
          solution,
          values,
          notes: Object.fromEntries(
            Object.entries(notes).map(([k, set]) => [k, [...set]])
          ),
          selected,
          pencilMode,
          puzzleIndex,
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
      if (!data.grid) return false;
      if (data.difficulty && difficultyEl) difficultyEl.value = data.difficulty;
      rows = data.rows;
      cols = data.cols;
      grid = data.grid;
      clues = data.clues;
      solution = data.solution;
      values = data.values || {};
      notes = Object.fromEntries(
        Object.entries(data.notes || {}).map(([k, arr]) => [k, new Set(arr)])
      );
      selected = data.selected;
      pencilMode = !!data.pencilMode;
      puzzleIndex = data.puzzleIndex || 0;
      solved = !!data.solved;
      setStatus(solved ? "Puzzle complete!" : "Fill white cells — sums must match clues");
      render();
      return true;
    } catch {
      return false;
    }
  }

  function init() {
    if (!initialized) {
      initialized = true;
      renderGuide();
      boardEl?.addEventListener("click", onBoardClick);
      document.addEventListener("keydown", onKeyDown);
      document.getElementById("btn-kakuro-new")?.addEventListener("click", newGame);
      document.getElementById("btn-kakuro-restart")?.addEventListener("click", () => {
        const diff = difficultyEl?.value || "easy";
        loadPuzzle(diff, puzzleIndex);
      });
      document.getElementById("btn-kakuro-pencil")?.addEventListener("click", () => {
        pencilMode = !pencilMode;
        document.getElementById("btn-kakuro-pencil")?.classList.toggle("active", pencilMode);
      });
      document.getElementById("btn-kakuro-clear")?.addEventListener("click", clearCell);
      document.getElementById("btn-kakuro-guide")?.addEventListener("click", () => {
        window.SudokuApp?.closeMenu?.();
        guideDialog?.showModal();
      });
      document.getElementById("kakuro-guide-close")?.addEventListener("click", () => guideDialog?.close());
      difficultyEl?.addEventListener("change", newGame);

      const pad = document.getElementById("kakuro-pad");
      pad?.querySelectorAll("[data-kk-num]").forEach((btn) => {
        btn.addEventListener("click", () => {
          if (!selected) return;
          const num = parseInt(btn.dataset.kkNum, 10);
          if (btn.dataset.kkAction === "clear") clearCell();
          else setValue(selected.r, selected.c, num);
        });
      });
    }

    if (!loadGame()) {
      newGame();
    }
  }

  window.KakuroApp = { init, saveGame, newGame };
})();
