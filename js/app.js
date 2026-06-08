(() => {
  const boardEl = document.getElementById("board");
  const boardWrap = document.querySelector(".board-wrap");
  const numpadEl = document.getElementById("numpad");
  const statusEl = document.getElementById("status");
  const timerEl = document.getElementById("timer");
  const difficultyEl = document.getElementById("difficulty");
  const themePickerBtn = document.getElementById("theme-picker-btn");
  const themePickerMenu = document.getElementById("theme-picker-menu");
  const themeSwatch = document.getElementById("theme-swatch");
  const versionEl = document.getElementById("app-version");
  const colorPickerDialog = document.getElementById("color-picker-dialog");
  const quoteSplash = document.getElementById("quote-splash");
  const quoteTextEl = document.getElementById("quote-text");
  const quoteAuthorEl = document.getElementById("quote-author");
  const quoteProceed = document.getElementById("quote-proceed");
  const QUOTE_BUTTON_DELAY_MS = 2200;
  const QUOTE_FADE_MS = 280;
  const GENERATE_PROGRESS_DELAY_MS = 500;
  const GENERATE_CLEAR_MS = 280;
  const GENERATE_READY_MS = 200;
  const lessonsDialog = document.getElementById("lessons-dialog");
  const lessonsBasics = document.getElementById("lessons-basics");
  const lessonsAdvanced = document.getElementById("lessons-advanced");
  const seedsDialog = document.getElementById("seeds-dialog");
  const appearanceDialog = document.getElementById("appearance-dialog");
  const appEl = document.querySelector(".app");
  const menuScrim = document.getElementById("menu-scrim");
  const confirmDialog = document.getElementById("confirm-dialog");
  const confirmMessage = document.getElementById("confirm-message");
  const confirmOk = document.getElementById("confirm-ok");
  const confirmCancel = document.getElementById("confirm-cancel");
  const settingsColors = document.getElementById("settings-colors");
  const btnSettings = document.getElementById("btn-settings");
  const btnMenu = document.getElementById("btn-menu");
  const btnZenExit = document.getElementById("btn-zen-exit");
  const navMenu = document.getElementById("nav-menu");
  const seedList = document.getElementById("seed-list");
  const currentSeedEl = document.getElementById("current-seed");

  const btnUndo = document.getElementById("btn-undo");
  const btnRedo = document.getElementById("btn-redo");
  const btnPencil = document.getElementById("btn-pencil");
  const btnZen = document.getElementById("btn-zen");
  const btnCat = document.getElementById("btn-companion-cat");
  const boardCat = document.getElementById("board-cat");
  const cellPicker = document.getElementById("cell-picker");
  const generateOverlay = document.getElementById("generate-overlay");
  const generateLabel = document.getElementById("generate-label");
  const generateProgress = document.getElementById("generate-progress");
  const generateBar = document.getElementById("generate-bar");

  const STATE_KEY = "sudoku-game";
  const SEED_KEY = "sudoku-seeds";
  const STATS_KEY = "sudoku-stats";
  const statsStartedEl = document.getElementById("stats-started");
  const statsCompletedEl = document.getElementById("stats-completed");
  const MAX_SEEDS = 10;
  const HISTORY_LIMIT = 10;
  const THEMES = [
    { id: "slate", label: "Slate", swatch: "#1a2332" },
    { id: "light", label: "Light", swatch: "#f4f4f5" },
    { id: "ocean", label: "Ocean", swatch: "#e8f5f2" },
    { id: "dusk", label: "Dusk", swatch: "#1c1824" },
    { id: "oled", label: "OLED", swatch: "#09090b" },
  ];
  const DEFAULT_THEME = "slate";

  let puzzle = [];
  let solution = [];
  let given = [];
  let notes = [];
  let selected = null;
  let activeNumber = null;
  let activePencilSet = new Set();
  let pencilMode = false;
  let zenMode = false;
  let catEnabled = false;
  let timerInterval = null;
  let timerRunning = false;
  let animateBoardReveal = false;
  let saveInterval = null;
  let seconds = 0;
  let gameWon = false;
  let history = [];
  let future = [];
  let currentSeed = null;
  let currentDifficulty = null;
  let seedHistory = [];
  let settingsOpen = false;
  let menuOpen = false;
  let confirmCallback = null;
  let quoteSplashActive = false;
  let cellPickerOpen = false;
  let cellPickerCell = null;
  let pickerNoteBatch = false;
  let gamesStarted = 0;
  let gamesCompleted = 0;
  let generateToken = 0;

  function wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function waitForProceed() {
    return new Promise((resolve) => {
      const onProceed = () => {
        quoteProceed.removeEventListener("click", onProceed);
        resolve();
      };
      quoteProceed.addEventListener("click", onProceed);
    });
  }

  async function showQuoteSplash() {
    if (quoteSplashActive) return;
    quoteSplashActive = true;

    const quote = Quotes.nextQuote();
    quoteTextEl.textContent = quote.text;
    quoteAuthorEl.textContent = quote.attribution;

    quoteProceed.classList.remove("is-visible");
    quoteSplash.hidden = false;
    quoteSplash.classList.remove("is-hiding");

    await wait(20);
    quoteSplash.classList.add("is-visible");

    await wait(QUOTE_BUTTON_DELAY_MS);
    await wait(20);
    quoteProceed.classList.add("is-visible");

    await waitForProceed();

    quoteSplash.classList.add("is-hiding");
    quoteSplash.classList.remove("is-visible");
    quoteProceed.classList.remove("is-visible");
    appEl.classList.add("is-ready");

    await wait(QUOTE_FADE_MS);

    quoteSplash.hidden = true;
    quoteSplash.classList.remove("is-hiding");
    quoteSplashActive = false;
  }

  function emptyNotes() {
    return Array.from({ length: 9 }, () =>
      Array.from({ length: 9 }, () => new Set())
    );
  }

  function cloneNotes(src) {
    return src.map((row) => row.map((set) => new Set(set)));
  }

  function serializeNotes() {
    return notes.map((row) => row.map((set) => [...set]));
  }

  function deserializeNotes(data) {
    return data.map((row) => row.map((arr) => new Set(arr)));
  }

  function snapshot() {
    return {
      puzzle: puzzle.map((row) => [...row]),
      notes: cloneNotes(notes),
    };
  }

  function serializeSnapshot(snap) {
    return {
      puzzle: snap.puzzle,
      notes: snap.notes.map((row) => row.map((set) => [...set])),
    };
  }

  function deserializeSnapshot(data) {
    return {
      puzzle: data.puzzle.map((row) => [...row]),
      notes: data.notes.map((row) => row.map((arr) => new Set(arr))),
    };
  }

  function serializeStack(stack) {
    return stack.map(serializeSnapshot);
  }

  function deserializeStack(data) {
    if (!Array.isArray(data)) return [];
    return data.slice(-HISTORY_LIMIT).map(deserializeSnapshot);
  }

  function trimStack(stack) {
    while (stack.length > HISTORY_LIMIT) stack.shift();
  }

  function applySnapshot(snap) {
    puzzle = snap.puzzle.map((row) => [...row]);
    notes = cloneNotes(snap.notes);
  }

  function pushHistory() {
    history.push(snapshot());
    trimStack(history);
    future = [];
    updateUndoRedo();
  }

  function updateUndoRedo() {
    btnUndo.disabled = history.length === 0 || gameWon;
    btnRedo.disabled = future.length === 0 || gameWon;
  }

  function undo() {
    if (!history.length || gameWon) return;
    future.push(snapshot());
    trimStack(future);
    applySnapshot(history.pop());
    clearErrors();
    setStatus("");
    renderBoard();
    updateUndoRedo();
    saveGame();
  }

  function redo() {
    if (!future.length || gameWon) return;
    history.push(snapshot());
    trimStack(history);
    applySnapshot(future.pop());
    clearErrors();
    setStatus("");
    renderBoard();
    updateUndoRedo();
    saveGame();
  }

  function themeById(id) {
    return THEMES.find((t) => t.id === id) || THEMES[0];
  }

  function setTheme(themeId) {
    const theme = themeById(themeId);
    document.documentElement.setAttribute("data-theme", theme.id);
    localStorage.setItem("sudoku-theme", theme.id);
    updateThemePickerUI(theme.id);
    Settings.onThemeChange();
    saveGame();
  }

  function updateThemePickerUI(activeId) {
    if (themeSwatch) {
      themeSwatch.style.backgroundColor = themeById(activeId).swatch;
    }
    if (!themePickerMenu) return;
    themePickerMenu.querySelectorAll(".theme-option").forEach((btn) => {
      const selected = btn.dataset.theme === activeId;
      btn.classList.toggle("active", selected);
      btn.setAttribute("aria-selected", selected ? "true" : "false");
    });
  }

  function buildThemePicker() {
    if (!themePickerMenu) return;
    themePickerMenu.innerHTML = "";
    THEMES.forEach((theme) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "theme-option";
      btn.dataset.theme = theme.id;
      btn.setAttribute("role", "option");
      btn.title = theme.label;
      btn.innerHTML = `<span class="theme-option-swatch" style="background:${theme.swatch}"></span><span class="theme-option-label">${theme.label}</span>`;
      btn.addEventListener("click", () => {
        setTheme(theme.id);
        closeThemePicker();
      });
      themePickerMenu.appendChild(btn);
    });
  }

  function closeThemePicker() {
    if (!themePickerMenu) return;
    themePickerMenu.hidden = true;
    themePickerBtn?.setAttribute("aria-expanded", "false");
  }

  function toggleThemePicker() {
    if (!themePickerMenu) return;
    const willOpen = themePickerMenu.hidden;
    themePickerMenu.hidden = !willOpen;
    themePickerBtn?.setAttribute("aria-expanded", willOpen ? "true" : "false");
  }

  function resetAppearance() {
    Settings.reset();
    if (settingsColors.childElementCount) {
      Settings.syncPanel(settingsColors);
    }
    saveGame();
  }

  function closeMenu() {
    if (!menuOpen) return;
    menuOpen = false;
    navMenu.hidden = true;
    menuScrim.hidden = true;
    menuScrim.setAttribute("aria-hidden", "true");
    btnMenu.classList.remove("active");
    btnMenu.setAttribute("aria-expanded", "false");
    closeThemePicker();
  }

  function openMenu() {
    if (menuOpen) return;
    closeSettings();
    menuOpen = true;
    navMenu.hidden = false;
    menuScrim.hidden = false;
    menuScrim.setAttribute("aria-hidden", "false");
    btnMenu.classList.add("active");
    btnMenu.setAttribute("aria-expanded", "true");
  }

  function toggleMenu() {
    if (menuOpen) {
      closeMenu();
      return;
    }
    openMenu();
  }

  function closeSettings() {
    if (!settingsOpen) return;
    settingsOpen = false;
    btnSettings.classList.remove("active");
    Settings.closeAllMenus();
    if (appearanceDialog.open) appearanceDialog.close();
  }

  function showConfirm(message, onConfirm) {
    confirmMessage.textContent = message;
    confirmCallback = onConfirm;
    confirmDialog.showModal();
  }

  function closeConfirm() {
    confirmCallback = null;
    confirmDialog.close();
  }

  function setZen(enabled) {
    zenMode = enabled;
    appEl.classList.toggle("zen", zenMode);
    btnZen.classList.toggle("active", zenMode);
    btnZenExit.classList.toggle("active", zenMode);
    btnZen.title = zenMode ? "Exit zen mode" : "Zen mode — focus on the puzzle";
    localStorage.setItem("sudoku-zen", zenMode ? "1" : "0");
    document.querySelectorAll(".zen-hide").forEach((el) => {
      if (enabled) el.setAttribute("aria-hidden", "true");
      else el.removeAttribute("aria-hidden");
    });
    if (zenMode) {
      closeSettings();
      closeMenu();
    }
  }

  function setCatEnabled(enabled) {
    catEnabled = enabled;
    boardCat.hidden = !enabled;
    boardCat.setAttribute("aria-hidden", enabled ? "false" : "true");
    btnCat.classList.toggle("active", enabled);
    btnCat.title = enabled ? "Hide companion cat" : "Companion cat";
    btnCat.setAttribute("aria-label", btnCat.title);
    localStorage.setItem("sudoku-cat", enabled ? "1" : "0");
    if (enabled) CatCompanion.start();
    else CatCompanion.stop();
  }

  function toggleCat() {
    setCatEnabled(!catEnabled);
  }

  function initPreferences() {
    let savedTheme = localStorage.getItem("sudoku-theme");
    if (savedTheme === "dark") savedTheme = "oled";
    setTheme(THEMES.some((t) => t.id === savedTheme) ? savedTheme : DEFAULT_THEME);
    setZen(localStorage.getItem("sudoku-zen") === "1");
    const savedCat = localStorage.getItem("sudoku-cat");
    setCatEnabled(savedCat === "1" || (parseInt(savedCat, 10) || 0) > 0);
    Settings.load();
  }

  function formatTime(s) {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  }

  function resetTimer() {
    stopTimer();
    seconds = 0;
    timerRunning = false;
    timerEl.textContent = formatTime(0);
  }

  function startTimer(fromSeconds = 0) {
    stopTimer();
    seconds = fromSeconds;
    timerEl.textContent = formatTime(seconds);
    if (gameWon) return;
    timerRunning = true;
    timerInterval = setInterval(() => {
      seconds++;
      timerEl.textContent = formatTime(seconds);
    }, 1000);
  }

  function stopTimer() {
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
  }

  function ensureTimerRunning() {
    if (gameWon || timerRunning) return;
    startTimer(0);
  }

  function startAutoSave() {
    if (saveInterval) clearInterval(saveInterval);
    saveInterval = setInterval(saveGame, 15000);
  }

  function setStatus(msg, type = "") {
    statusEl.textContent = msg;
    statusEl.className = "status" + (type ? ` ${type}` : "");
  }

  function saveGame() {
    if (!puzzle.length || !solution.length) return;
    const state = {
      v: 1,
      puzzle,
      solution,
      given,
      notes: serializeNotes(),
      seed: currentSeed,
      difficulty: currentDifficulty,
      seconds,
      gameWon,
      pencilMode,
      activeNumber,
      activePencilNumbers: [...activePencilSet],
      selected,
      difficultyPref: difficultyEl.value,
      history: serializeStack(history),
      future: serializeStack(future),
    };
    try {
      localStorage.setItem(STATE_KEY, JSON.stringify(state));
    } catch {
      /* storage full or unavailable */
    }
  }

  function tryLoadGame() {
    const raw = localStorage.getItem(STATE_KEY);
    if (!raw) return false;

    try {
      const state = JSON.parse(raw);
      if (state.v !== 1 || !Array.isArray(state.puzzle) || state.puzzle.length !== 9) {
        return false;
      }

      puzzle = state.puzzle.map((row) => [...row]);
      solution = state.solution.map((row) => [...row]);
      given = state.given.map((row) => [...row]);
      notes = deserializeNotes(state.notes);
      currentSeed = state.seed;
      currentDifficulty = state.difficulty;
      seconds = state.seconds || 0;
      gameWon = !!state.gameWon;
      pencilMode = !!state.pencilMode;
      activeNumber = state.activeNumber ?? null;
      activePencilSet = new Set(
        Array.isArray(state.activePencilNumbers) ? state.activePencilNumbers : []
      );
      if (pencilMode) activeNumber = null;
      else activePencilSet.clear();
      selected = state.selected ?? null;
      history = deserializeStack(state.history);
      future = deserializeStack(state.future);

      if (state.difficultyPref) difficultyEl.value = state.difficultyPref;

      btnPencil.classList.toggle("active", pencilMode);
      if (gameWon) setStatus("Solved!", "ok");
      else setStatus("");

      renderBoard();
      if (gameWon) {
        timerEl.textContent = formatTime(seconds);
        timerRunning = false;
      } else if (seconds > 0) {
        startTimer(seconds);
      } else {
        resetTimer();
      }
      updateUndoRedo();
      return true;
    } catch {
      return false;
    }
  }

  function cellTitle(row, col) {
    const parts = [];
    if (given[row][col]) {
      parts.push(`Given ${puzzle[row][col]}`);
    } else if (puzzle[row][col]) {
      parts.push(`Your entry: ${puzzle[row][col]}`);
    } else if (notes[row][col].size) {
      parts.push(`Notes: ${[...notes[row][col]].sort().join(", ")}`);
    } else {
      parts.push("Empty cell");
    }
    if (!given[row][col] && !gameWon) {
      if (pencilMode && activePencilSet.size) {
        parts.push(`Pencil ${[...activePencilSet].sort((a, b) => a - b).join(", ")} — click to mark`);
      } else if (pencilMode) {
        parts.push("Pick note(s) on the numpad");
      } else if (activeNumber) {
        parts.push("Tap a number to fill");
      } else {
        parts.push("Tap cell to pick a number");
      }
    }
    return parts.join(" · ");
  }

  function buildNumpad() {
    numpadEl.innerHTML = "";
    for (let n = 1; n <= 9; n++) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "btn";
      btn.textContent = n;
      btn.dataset.num = n;
      btn.title = `Select ${n}`;
      btn.addEventListener("click", () => onNumpadClick(n));
      numpadEl.appendChild(btn);
    }
  }

  function buildCellPicker() {
    cellPicker.innerHTML = "";

    const grid = document.createElement("div");
    grid.className = "cell-picker-grid";
    for (let n = 1; n <= 9; n++) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "cell-picker-btn";
      btn.textContent = n;
      btn.dataset.num = n;
      btn.addEventListener("click", (e) => onCellPickerClick(n, e));
      grid.appendChild(btn);
    }
    cellPicker.appendChild(grid);

    const pencilBtn = document.createElement("button");
    pencilBtn.type = "button";
    pencilBtn.className = "cell-picker-pencil";
    pencilBtn.title = "Pencil marks";
    pencilBtn.setAttribute("aria-label", "Toggle pencil marks");
    pencilBtn.innerHTML =
      '<svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true"><path d="M11.5 2.5l2 2-8 8H3.5v-2l8-8z" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/><path d="M10 4l2 2" stroke="currentColor" stroke-width="1.2"/></svg>';
    pencilBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      togglePencilFromPicker();
    });
    cellPicker.appendChild(pencilBtn);
    cellPicker.addEventListener("pointerdown", (e) => e.stopPropagation());
  }

  function togglePencilFromPicker() {
    pencilMode = !pencilMode;
    btnPencil.classList.toggle("active", pencilMode);
    if (pencilMode) {
      activeNumber = null;
    } else {
      activePencilSet.clear();
    }
    syncCellPicker();
    saveGame();
  }

  function shouldShowCellPicker(row, col) {
    if (gameWon || given[row][col]) return false;
    if (activeNumber !== null) return false;
    if (pencilMode) return puzzle[row][col] === 0;
    if (activePencilSet.size > 0) return false;
    return true;
  }

  function closeCellPicker() {
    if (!cellPickerOpen) return;
    cellPickerOpen = false;
    cellPickerCell = null;
    pickerNoteBatch = false;
    cellPicker.classList.remove("is-open");
    cellPicker.hidden = true;
  }

  function syncCellPicker() {
    if (!cellPickerCell) return;
    const { row, col } = cellPickerCell;
    cellPicker.querySelectorAll(".cell-picker-btn").forEach((btn) => {
      const num = +btn.dataset.num;
      const blocked =
        !pencilMode && !Sudoku.isValid(puzzle, row, col, num);
      btn.disabled = blocked;
      btn.classList.toggle("active", pencilMode && notes[row][col].has(num));
    });
    const pencilBtn = cellPicker.querySelector(".cell-picker-pencil");
    if (pencilBtn) pencilBtn.classList.toggle("active", pencilMode);
  }

  function positionCellPicker(row, col) {
    const cell = boardEl.children[row * 9 + col];
    if (!cell) return;

    cellPicker.hidden = false;
    cellPicker.classList.remove("is-open");

    const wrapRect = boardWrap.getBoundingClientRect();
    const cellRect = cell.getBoundingClientRect();
    const pickerW = cellPicker.offsetWidth || Math.min(boardWrap.clientWidth * 0.42, 116);
    const pickerH = cellPicker.offsetHeight || pickerW;

    let left = cellRect.left - wrapRect.left + cellRect.width / 2 - pickerW / 2;
    let top = cellRect.top - wrapRect.top + cellRect.height / 2 - pickerH / 2;

    left = Math.max(2, Math.min(left, boardWrap.clientWidth - pickerW - 2));
    top = Math.max(2, Math.min(top, boardWrap.clientHeight - pickerH - 2));

    cellPicker.style.left = `${left}px`;
    cellPicker.style.top = `${top}px`;
  }

  function openCellPicker(row, col) {
    cellPickerCell = { row, col };
    cellPickerOpen = true;
    pickerNoteBatch = false;
    positionCellPicker(row, col);
    syncCellPicker();
    requestAnimationFrame(() => cellPicker.classList.add("is-open"));
  }

  function refreshPickerCell() {
    if (!cellPickerCell) return;
    const { row, col } = cellPickerCell;
    const cell = boardEl.children[row * 9 + col];
    if (!cell || puzzle[row][col] !== 0) return;
    cell.innerHTML = "";
    if (notes[row][col].size) renderNotes(cell, row, col);
  }

  function toggleNoteInPicker(row, col, num) {
    if (given[row][col] || puzzle[row][col] !== 0 || gameWon) return;
    if (!pickerNoteBatch) {
      pushHistory();
      pickerNoteBatch = true;
    }
    if (notes[row][col].has(num)) notes[row][col].delete(num);
    else notes[row][col].add(num);
    ensureTimerRunning();
    clearErrors();
    refreshPickerCell();
    syncCellPicker();
    saveGame();
  }

  function onCellPickerClick(num, e) {
    e.stopPropagation();
    e.preventDefault();
    if (!cellPickerCell || gameWon) return;

    const { row, col } = cellPickerCell;
    if (given[row][col]) return;

    selected = { row, col };

    if (pencilMode) {
      if (puzzle[row][col] === 0) toggleNoteInPicker(row, col, num);
      return;
    }

    if (!Sudoku.isValid(puzzle, row, col, num)) return;

    placeNumber(num, { keepActive: false });
    closeCellPicker();
  }

  function getHighlightNumber() {
    return pencilMode ? null : activeNumber;
  }

  function togglePencilNumber(num) {
    if (activePencilSet.has(num)) activePencilSet.delete(num);
    else activePencilSet.add(num);
  }

  function applyPencilToCell(row, col) {
    if (given[row][col] || puzzle[row][col] !== 0 || gameWon || !activePencilSet.size) return;
    pushHistory();
    for (const num of activePencilSet) {
      if (notes[row][col].has(num)) notes[row][col].delete(num);
      else notes[row][col].add(num);
    }
    ensureTimerRunning();
    clearErrors();
    renderBoard();
    saveGame();
  }

  function blockedCellsForNumber(num) {
    const blocked = new Set();
    if (!num) return blocked;
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (!Sudoku.isValid(puzzle, r, c, num)) {
          blocked.add(`${r},${c}`);
        }
      }
    }
    return blocked;
  }

  function countRemaining(num) {
    let count = 0;
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (puzzle[r][c] === num) count++;
      }
    }
    return 9 - count;
  }

  function updateNumpad() {
    numpadEl.querySelectorAll(".btn").forEach((btn) => {
      const num = +btn.dataset.num;
      if (pencilMode) {
        btn.classList.toggle("active", activePencilSet.has(num));
      } else {
        btn.classList.toggle("active", activeNumber === num);
      }
      btn.classList.toggle("exhausted", countRemaining(num) === 0);
    });
  }

  function renderNotes(cellEl, row, col) {
    const grid = document.createElement("div");
    grid.className = "notes";
    for (let n = 1; n <= 9; n++) {
      const span = document.createElement("span");
      span.className = "note";
      if (notes[row][col].has(n)) {
        span.textContent = n;
      }
      grid.appendChild(span);
    }
    cellEl.appendChild(grid);
  }

  function renderBoard() {
    boardEl.innerHTML = "";
    const hlNum = getHighlightNumber();
    const blocked = hlNum ? blockedCellsForNumber(hlNum) : new Set();

    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "cell";
        btn.setAttribute("role", "gridcell");
        btn.title = cellTitle(r, c);

        if (c === 2 || c === 5) btn.classList.add("box-right");
        if (r === 2 || r === 5) btn.classList.add("box-bottom");

        const val = puzzle[r][c];
        if (val !== 0) {
          btn.textContent = val;
        } else if (notes[r][c].size) {
          renderNotes(btn, r, c);
        }

        if (given[r][c]) btn.classList.add("given");

        if (selected && selected.row === r && selected.col === c) {
          btn.classList.add("selected");
        }

        if (hlNum && blocked.has(`${r},${c}`)) {
          btn.classList.add("blocked");
        }

        if (animateBoardReveal) {
          btn.classList.add("cell-reveal");
          btn.style.animationDelay = `${(r * 9 + c) * 6}ms`;
        }

        btn.addEventListener("click", () => selectCell(r, c));
        btn.addEventListener("mouseenter", () => {
          if (!gameWon) btn.title = cellTitle(r, c);
        });

        boardEl.appendChild(btn);
      }
    }
    if (animateBoardReveal) animateBoardReveal = false;
    updateNumpad();
    if (cellPickerOpen && cellPickerCell) {
      const { row, col } = cellPickerCell;
      requestAnimationFrame(() => {
        positionCellPicker(row, col);
        syncCellPicker();
      });
    }
  }

  function onNumpadClick(num) {
    closeCellPicker();

    if (pencilMode) {
      togglePencilNumber(num);
      renderBoard();
      saveGame();
      return;
    }

    if (activeNumber === num) {
      activeNumber = null;
      renderBoard();
      saveGame();
      return;
    }

    if (
      selected &&
      !gameWon &&
      !given[selected.row][selected.col] &&
      Sudoku.isValid(puzzle, selected.row, selected.col, num)
    ) {
      placeNumber(num, { keepActive: true });
      return;
    }

    activeNumber = num;
    renderBoard();
    saveGame();
  }

  function toggleNoteAt(row, col, num) {
    if (given[row][col] || puzzle[row][col] !== 0 || gameWon) return;
    pushHistory();
    if (notes[row][col].has(num)) notes[row][col].delete(num);
    else notes[row][col].add(num);
    ensureTimerRunning();
    clearErrors();
    renderBoard();
    saveGame();
  }

  function selectCell(row, col) {
    if (gameWon) return;

    if (activeNumber !== null && !given[row][col]) {
      if (!pencilMode && Sudoku.isValid(puzzle, row, col, activeNumber)) {
        selected = { row, col };
        placeNumber(activeNumber, { keepActive: true });
        closeCellPicker();
        return;
      }
    }

    if (selected && selected.row === row && selected.col === col) {
      if (cellPickerOpen && cellPickerCell?.row === row && cellPickerCell?.col === col) {
        return;
      }
      selected = null;
      activeNumber = null;
      closeCellPicker();
      clearErrors();
      renderBoard();
      saveGame();
      return;
    }

    selected = { row, col };

    if (shouldShowCellPicker(row, col)) {
      clearErrors();
      renderBoard();
      openCellPicker(row, col);
      saveGame();
      return;
    }

    if (
      pencilMode &&
      activePencilSet.size &&
      puzzle[row][col] === 0 &&
      !given[row][col]
    ) {
      applyPencilToCell(row, col);
      return;
    }

    closeCellPicker();
    clearErrors();
    renderBoard();
    saveGame();
  }

  function clearErrors() {
    boardEl.querySelectorAll(".cell.error").forEach((el) => {
      el.classList.remove("error");
    });
  }

  function clearNotesAt(row, col) {
    notes[row][col].clear();
  }

  function removeNoteFromPeers(row, col, num) {
    for (let i = 0; i < 9; i++) {
      notes[row][i].delete(num);
      notes[i][col].delete(num);
    }
    const br = Math.floor(row / 3) * 3;
    const bc = Math.floor(col / 3) * 3;
    for (let r = br; r < br + 3; r++) {
      for (let c = bc; c < bc + 3; c++) {
        notes[r][c].delete(num);
      }
    }
  }

  function placeNumber(num, { keepActive = false } = {}) {
    if (!selected || given[selected.row][selected.col] || gameWon) return;
    const { row, col } = selected;

    if (pencilMode) {
      if (keepActive) activeNumber = num;
      else activeNumber = null;
      if (puzzle[row][col] === 0) toggleNoteAt(row, col, num);
      else {
        renderBoard();
        saveGame();
      }
      return;
    }

    pushHistory();
    puzzle[row][col] = num;
    clearNotesAt(row, col);
    removeNoteFromPeers(row, col, num);
    activeNumber = keepActive ? num : null;
    ensureTimerRunning();
    clearErrors();
    renderBoard();
    checkWin();
    saveGame();
  }

  function eraseCell() {
    if (!selected || given[selected.row][selected.col] || gameWon) return;
    const { row, col } = selected;
    if (puzzle[row][col] === 0 && notes[row][col].size === 0) return;

    pushHistory();
    puzzle[row][col] = 0;
    notes[row][col].clear();
    ensureTimerRunning();
    clearErrors();
    closeCellPicker();
    renderBoard();
    setStatus("");
    saveGame();
  }

  function togglePencil() {
    pencilMode = !pencilMode;
    btnPencil.classList.toggle("active", pencilMode);
    if (pencilMode) {
      activeNumber = null;
    } else {
      activePencilSet.clear();
    }
    if (cellPickerOpen) syncCellPicker();
    else closeCellPicker();
    renderBoard();
    saveGame();
  }

  function notesDiffer(a, b) {
    if (a.size !== b.size) return true;
    for (const n of a) {
      if (!b.has(n)) return true;
    }
    return false;
  }

  function fillAllPencil() {
    if (gameWon) return;

    const nextNotes = emptyNotes();
    let changed = false;

    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (given[r][c] || puzzle[r][c] !== 0) continue;
        for (let n = 1; n <= 9; n++) {
          if (Sudoku.isValid(puzzle, r, c, n)) nextNotes[r][c].add(n);
        }
        if (notesDiffer(notes[r][c], nextNotes[r][c])) changed = true;
      }
    }

    if (!changed) return;

    pushHistory();
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (!given[r][c] && puzzle[r][c] === 0) {
          notes[r][c] = new Set(nextNotes[r][c]);
        }
      }
    }

    ensureTimerRunning();
    clearErrors();
    renderBoard();
    saveGame();
  }

  function clearAllPencil() {
    if (gameWon) return;

    let changed = false;
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (notes[r][c].size) changed = true;
      }
    }
    if (!changed) return;

    pushHistory();
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        notes[r][c].clear();
      }
    }

    ensureTimerRunning();
    clearErrors();
    renderBoard();
    saveGame();
  }

  function restartGame() {
    if (!puzzle.length) return;

    closeMenu();
    gameWon = false;
    selected = null;
    activeNumber = null;
    activePencilSet.clear();
    history = [];
    future = [];

    clearErrors();
    setStatus("");
    boardWrap.classList.add("is-clearing");
    setTimeout(() => {
      for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
          if (!given[r][c]) puzzle[r][c] = 0;
        }
      }
      notes = emptyNotes();
      renderBoard();
      boardWrap.classList.remove("is-clearing");
      resetTimer();
      updateUndoRedo();
      saveGame();
    }, 220);
  }

  function showErrors(errorSet) {
    errorSet.forEach((key) => {
      const [r, c] = key.split(",").map(Number);
      const idx = r * 9 + c;
      const cell = boardEl.children[idx];
      if (cell) cell.classList.add("error");
    });
  }

  function checkSolution() {
    if (gameWon) return;

    const errors = Sudoku.findErrors(puzzle, solution);
    if (errors.size > 0) {
      showErrors(errors);
      setStatus(`${errors.size} mistake${errors.size > 1 ? "s" : ""}`, "err");
      return;
    }

    if (!Sudoku.isComplete(puzzle)) {
      setStatus("No mistakes so far", "ok");
      return;
    }

    winGame();
  }

  function checkWin() {
    if (!Sudoku.isComplete(puzzle)) return;
    const errors = Sudoku.findErrors(puzzle, solution);
    if (errors.size === 0) winGame();
  }

  function winGame() {
    gameWon = true;
    stopTimer();
    timerRunning = false;
    recordGameCompleted();
    setStatus("Solved!", "ok");
    updateUndoRedo();
    saveGame();
  }

  function loadStats() {
    try {
      const stats = JSON.parse(localStorage.getItem(STATS_KEY) || "{}");
      gamesStarted = Number.isFinite(stats.started) ? stats.started : 0;
      gamesCompleted = Number.isFinite(stats.completed) ? stats.completed : 0;
    } catch {
      gamesStarted = 0;
      gamesCompleted = 0;
    }
    renderStats();
  }

  function saveStats() {
    try {
      localStorage.setItem(
        STATS_KEY,
        JSON.stringify({ started: gamesStarted, completed: gamesCompleted })
      );
    } catch {
      /* storage unavailable */
    }
  }

  function renderStats() {
    statsStartedEl.textContent = String(gamesStarted);
    statsCompletedEl.textContent = String(gamesCompleted);
  }

  function recordGameStarted() {
    gamesStarted += 1;
    renderStats();
    saveStats();
  }

  function recordGameCompleted() {
    gamesCompleted += 1;
    renderStats();
    saveStats();
  }

  function loadSeedHistory() {
    try {
      seedHistory = JSON.parse(localStorage.getItem(SEED_KEY) || "[]");
    } catch {
      seedHistory = [];
    }
  }

  function saveSeedHistory() {
    localStorage.setItem(SEED_KEY, JSON.stringify(seedHistory));
  }

  function recordSeed(seed, difficulty) {
    currentSeed = seed;
    currentDifficulty = difficulty;
    seedHistory = seedHistory.filter((e) => e.seed !== seed);
    seedHistory.unshift({ seed, difficulty, at: Date.now() });
    if (seedHistory.length > MAX_SEEDS) seedHistory.length = MAX_SEEDS;
    saveSeedHistory();
  }

  function renderSeeds() {
    currentSeedEl.textContent = currentSeed
      ? `${currentSeed} · ${currentDifficulty}`
      : "—";

    seedList.innerHTML = "";
    if (!seedHistory.length) {
      const li = document.createElement("li");
      li.textContent = "No seeds yet";
      seedList.appendChild(li);
      return;
    }

    seedHistory.forEach((entry) => {
      const li = document.createElement("li");
      li.textContent = `${entry.seed} · ${entry.difficulty}`;
      if (entry.seed === currentSeed) li.classList.add("current");
      li.title = new Date(entry.at).toLocaleString();
      seedList.appendChild(li);
    });
  }

  function openSeeds() {
    closeMenu();
    renderSeeds();
    seedsDialog.showModal();
  }

  function applyGameResult(result) {
    puzzle = result.puzzle.map((row) => [...row]);
    solution = result.solution;
    given = result.given;
    notes = emptyNotes();
    recordSeed(result.seed, result.difficulty);
  }

  function setGenerateProgress(p, label) {
    const pct = Math.round(p * 100);
    if (generateBar) generateBar.style.width = `${pct}%`;
    generateProgress?.setAttribute("aria-valuenow", String(pct));
    if (label && generateLabel) generateLabel.textContent = label;
  }

  function hideGenerateOverlay() {
    if (!generateOverlay) return;
    generateOverlay.classList.remove("is-visible");
    generateOverlay.hidden = true;
    generateOverlay.setAttribute("aria-hidden", "true");
    setGenerateProgress(0, "Generating puzzle…");
  }

  function showGenerateOverlay() {
    if (!generateOverlay) return;
    setGenerateProgress(0.08, "Generating puzzle…");
    generateOverlay.hidden = false;
    generateOverlay.setAttribute("aria-hidden", "false");
    requestAnimationFrame(() => {
      generateOverlay.classList.add("is-visible");
    });
  }

  async function newGame({ skipQuote = false } = {}) {
    const token = ++generateToken;

    closeMenu();
    closeCellPicker();
    gameWon = false;
    selected = null;
    activeNumber = null;
    activePencilSet.clear();
    history = [];
    future = [];
    setStatus("");

    if (!skipQuote) {
      await showQuoteSplash();
      if (token !== generateToken) return;
    }

    boardWrap.classList.add("is-clearing");
    await wait(GENERATE_CLEAR_MS);
    if (token !== generateToken) return;

    boardWrap.classList.add("is-generating");
    boardWrap.classList.remove("is-clearing");

    let overlayShown = false;
    let progressTimer = null;
    let lastProgress = 0;
    let lastProgressLabel = "Generating puzzle…";
    const revealProgress = () => {
      if (token !== generateToken || overlayShown) return;
      overlayShown = true;
      showGenerateOverlay();
      setGenerateProgress(Math.max(lastProgress, 0.08), lastProgressLabel);
    };
    progressTimer = setTimeout(revealProgress, GENERATE_PROGRESS_DELAY_MS);

    const difficulty = difficultyEl.value;
    let result;
    try {
      result = await Sudoku.generateAsync(difficulty, null, (p, label) => {
        if (token !== generateToken) return;
        lastProgress = p;
        if (label) lastProgressLabel = label;
        if (overlayShown) setGenerateProgress(p, label);
      });
    } catch (err) {
      console.error(err);
      clearTimeout(progressTimer);
      if (token !== generateToken) return;
      hideGenerateOverlay();
      boardWrap.classList.remove("is-generating");
      setStatus("Could not generate puzzle — try again", "err");
      return;
    }

    clearTimeout(progressTimer);
    if (token !== generateToken) return;

    if (overlayShown) {
      setGenerateProgress(1, "Ready");
      await wait(GENERATE_READY_MS);
      if (token !== generateToken) return;
      hideGenerateOverlay();
    }

    boardWrap.classList.remove("is-generating");
    applyGameResult(result);
    recordGameStarted();
    animateBoardReveal = true;
    renderBoard();
    resetTimer();
    setStatus("");
    updateUndoRedo();
    saveGame();
  }

  function fillLessons(container, lessons) {
    container.innerHTML = "";
    lessons.forEach((lesson) => {
      const article = document.createElement("article");
      article.className = "lesson";
      article.innerHTML = `<h3>${lesson.title}</h3><p>${lesson.body}</p>`;
      container.appendChild(article);
    });
  }

  function switchLessonTab(tab) {
    const isBasics = tab === "basics";
    document.getElementById("tab-basics").classList.toggle("active", isBasics);
    document.getElementById("tab-advanced").classList.toggle("active", !isBasics);
    document.getElementById("tab-basics").setAttribute("aria-selected", isBasics);
    document.getElementById("tab-advanced").setAttribute("aria-selected", !isBasics);
    lessonsBasics.hidden = !isBasics;
    lessonsAdvanced.hidden = isBasics;
  }

  function openLessons() {
    closeMenu();
    if (!lessonsBasics.childElementCount) {
      fillLessons(lessonsBasics, LessonsBasics);
      fillLessons(lessonsAdvanced, LessonsAdvanced);
    }
    switchLessonTab("basics");
    lessonsDialog.showModal();
  }

  function openSettings() {
    if (settingsOpen) return;
    closeMenu();
    settingsOpen = true;
    btnSettings.classList.add("active");
    if (!settingsColors.childElementCount) {
      Settings.buildPanel(settingsColors);
    } else {
      Settings.syncPanel(settingsColors);
    }
    appearanceDialog.showModal();
  }

  function toggleSettings() {
    if (settingsOpen) {
      closeSettings();
      return;
    }
    openSettings();
  }

  function handleKeydown(e) {
    if (e.ctrlKey || e.metaKey) {
      if (e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
        return;
      }
      if (e.key === "y" || (e.key === "z" && e.shiftKey)) {
        e.preventDefault();
        redo();
        return;
      }
    }

    if (e.key === "p" && !e.ctrlKey && !e.metaKey) {
      togglePencil();
      return;
    }

    if (gameWon) return;

    const num = parseInt(e.key, 10);
    if (num >= 1 && num <= 9) {
      onNumpadClick(num);
      return;
    }

    if (e.key === "Backspace" || e.key === "Delete" || e.key === "0") {
      eraseCell();
      return;
    }

    if (!selected) return;

    const { row, col } = selected;
    let nr = row;
    let nc = col;

    switch (e.key) {
      case "ArrowUp":
        nr = Math.max(0, row - 1);
        break;
      case "ArrowDown":
        nr = Math.min(8, row + 1);
        break;
      case "ArrowLeft":
        nc = Math.max(0, col - 1);
        break;
      case "ArrowRight":
        nc = Math.min(8, col + 1);
        break;
      default:
        return;
    }

    e.preventDefault();
    selectCell(nr, nc);
  }

  themePickerBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    toggleThemePicker();
  });
  btnMenu.addEventListener("click", toggleMenu);
  btnZen.addEventListener("click", () => {
    setZen(true);
    saveGame();
  });
  btnZenExit.addEventListener("click", () => {
    setZen(false);
    saveGame();
  });
  document.getElementById("btn-new").addEventListener("click", () => {
    if (window.Games && !window.Games.isSudoku()) return;
    newGame();
  });
  document.getElementById("btn-restart").addEventListener("click", () => {
    if (window.Games && !window.Games.isSudoku()) return;
    restartGame();
  });
  document.getElementById("btn-check").addEventListener("click", checkSolution);
  document.getElementById("btn-erase").addEventListener("click", eraseCell);
  document.getElementById("btn-pencil").addEventListener("click", togglePencil);
  document.getElementById("btn-pencil-fill").addEventListener("click", () => {
    showConfirm("Fill every empty cell with valid pencil marks?", () => fillAllPencil());
  });
  document.getElementById("btn-pencil-clear").addEventListener("click", () => {
    showConfirm("Clear all pencil marks from the board?", () => clearAllPencil());
  });
  confirmOk.addEventListener("click", () => {
    const action = confirmCallback;
    closeConfirm();
    if (action) action();
  });
  confirmCancel.addEventListener("click", closeConfirm);
  confirmDialog.addEventListener("cancel", (e) => {
    e.preventDefault();
    closeConfirm();
  });
  menuScrim.addEventListener("click", closeMenu);
  btnCat.addEventListener("click", () => toggleCat());
  document.getElementById("btn-lessons").addEventListener("click", openLessons);
  document.getElementById("btn-seeds").addEventListener("click", openSeeds);
  btnSettings.addEventListener("click", toggleSettings);
  document.getElementById("settings-close").addEventListener("click", closeSettings);
  appearanceDialog.addEventListener("click", (e) => {
    if (e.target === appearanceDialog) closeSettings();
  });
  appearanceDialog.addEventListener("cancel", (e) => {
    e.preventDefault();
    closeSettings();
  });
  document.getElementById("lessons-close").addEventListener("click", () => lessonsDialog.close());
  document.getElementById("seeds-close").addEventListener("click", () => seedsDialog.close());
  lessonsDialog.addEventListener("click", (e) => {
    if (e.target === lessonsDialog) lessonsDialog.close();
  });
  seedsDialog.addEventListener("click", (e) => {
    if (e.target === seedsDialog) seedsDialog.close();
  });
  document.addEventListener("click", (e) => {
    if (
      menuOpen &&
      !e.target.closest("#nav-menu") &&
      !e.target.closest("#btn-menu") &&
      !e.target.closest("#btn-zen")
    ) {
      closeMenu();
    }
    if (
      themePickerMenu &&
      !themePickerMenu.hidden &&
      !e.target.closest(".theme-picker")
    ) {
      closeThemePicker();
    }
    if (
      cellPickerOpen &&
      !e.target.closest("#cell-picker") &&
      !e.target.closest(".cell")
    ) {
      closeCellPicker();
    }
  });
  document.addEventListener("sudoku:reset-appearance", resetAppearance);
  document.querySelectorAll(".dialog-tabs .tab").forEach((tab) => {
    tab.addEventListener("click", () => switchLessonTab(tab.dataset.tab));
  });
  btnUndo.addEventListener("click", undo);
  btnRedo.addEventListener("click", redo);
  document.addEventListener("keydown", handleKeydown);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") saveGame();
  });
  window.addEventListener("beforeunload", saveGame);

  CatModels.mount(boardCat);
  CatCompanion.init(boardWrap, boardCat, document.getElementById("board-cat-mouse"));

  Settings.initPickerDialog(
    colorPickerDialog,
    document.getElementById("color-picker-body"),
    document.getElementById("color-picker-title"),
    document.getElementById("color-picker-close")
  );

  buildThemePicker();

  async function startFromHub() {
    await Quotes.init();
    await showQuoteSplash();

    if (!tryLoadGame()) {
      await newGame({ skipQuote: true });
    }
  }

  async function boot() {
    if (versionEl && window.APP_VERSION) {
      versionEl.textContent = window.APP_VERSION;
    }
    initPreferences();
    loadStats();
    loadSeedHistory();
    buildNumpad();
    buildCellPicker();
    startAutoSave();

    if (!localStorage.getItem("magic-active-game")) {
      return;
    }

    await Quotes.init();
    await showQuoteSplash();

    if (!tryLoadGame()) {
      await newGame({ skipQuote: true });
    }
  }

  boot();

  window.SudokuApp = {
    saveGame,
    closeMenu,
    openMenu,
    openSettings,
    openThemePicker: toggleThemePicker,
    startFromHub,
  };
})();
