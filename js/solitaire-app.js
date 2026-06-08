(() => {
  const boardEl = document.getElementById("solitaire-board");
  const boardWrap = document.getElementById("solitaire-wrap");
  const statusEl = document.getElementById("solitaire-status");
  const timerEl = document.getElementById("solitaire-timer");
  const statsStartedEl = document.getElementById("solitaire-stats-started");
  const statsCompletedEl = document.getElementById("solitaire-stats-completed");
  const cardCountEl = document.getElementById("solitaire-card-count");
  const btnUndo = document.getElementById("btn-solitaire-undo");
  const btnHint = document.getElementById("btn-solitaire-hint");
  const difficultyEl = document.getElementById("solitaire-difficulty");
  const dealOverlay = document.getElementById("solitaire-deal-overlay");
  const dealBar = document.getElementById("solitaire-deal-bar");
  const dealLabel = document.getElementById("solitaire-deal-label");
  const dealProgress = document.getElementById("solitaire-deal-progress");
  const guideDialog = document.getElementById("solitaire-guide-dialog");
  const guideBody = document.getElementById("solitaire-guide-body");
  const btnDeck = document.getElementById("btn-solitaire-deck");
  const btnZoomIn = document.getElementById("btn-sol-zoom-in");
  const btnZoomOut = document.getElementById("btn-sol-zoom-out");
  const appEl = document.querySelector(".app");
  const seedsDialog = document.getElementById("seeds-dialog");
  const currentSeedEl = document.getElementById("current-seed");
  const seedList = document.getElementById("seed-list");

  const STATE_KEY = "solitaire-game";
  const STATS_KEY = "solitaire-stats";
  const SEEDS_KEY = "solitaire-seeds";
  const DECK_KEY = "solitaire-deck-set";
  const ZOOM_KEY = "solitaire-zoom";
  const DEFAULT_ZOOM_INDEX = 2;
  const ZOOM_STEPS = [
    { card: 1.85, window: 34, fan: 7, gap: 0.2 },
    { card: 2.1, window: 36, fan: 8, gap: 0.22 },
    { card: 2.35, window: 40, fan: 10, gap: 0.3 },
    { card: 2.6, window: 40, fan: 11, gap: 0.3 },
    { card: 2.85, window: 40, fan: 12, gap: 0.32 },
    { card: 3.1, window: 40, fan: 13, gap: 0.34 },
    { card: 3.35, window: 40, fan: 14, gap: 0.36 },
    { card: 3.6, window: 40, fan: 15, gap: 0.38 },
    { card: 3.6, window: 44, fan: 15, gap: 0.4 },
    { card: 3.6, window: 48, fan: 15, gap: 0.42 },
    { card: 3.6, window: 52, fan: 15, gap: 0.44 },
    { card: 3.6, window: 56, fan: 15, gap: 0.46 },
  ];
  const STATE_VERSION = 1;
  const MAX_SEEDS = 10;
  const HISTORY_LIMIT = 80;
  const DEAL_MS = 280;

  let state = null;
  let seed = null;
  let currentDifficulty = "medium";
  let seedHistory = [];
  let history = [];
  let timerInterval = null;
  let timerRunning = false;
  let seconds = 0;
  let gameWon = false;
  let gamesStarted = 0;
  let gamesCompleted = 0;
  let initialized = false;
  let dealToken = 0;
  let selected = null;
  let hintTarget = null;
  let deckSet = "classic";
  let zoomIndex = DEFAULT_ZOOM_INDEX;

  function fanStepPx() {
    if (!boardEl) return 10;
    const raw = getComputedStyle(boardEl).getPropertyValue("--sol-fan-step").trim();
    const n = parseFloat(raw);
    return Number.isFinite(n) ? n : 10;
  }

  function updateZoomButtons() {
    if (btnZoomOut) {
      btnZoomOut.disabled = zoomIndex <= 0;
      btnZoomOut.title = zoomIndex <= 0 ? "Cards already smallest" : "Smaller cards";
    }
    if (btnZoomIn) {
      btnZoomIn.disabled = zoomIndex >= ZOOM_STEPS.length - 1;
      const next = ZOOM_STEPS[Math.min(zoomIndex + 1, ZOOM_STEPS.length - 1)];
      btnZoomIn.title =
        zoomIndex >= ZOOM_STEPS.length - 1
          ? "Already at maximum"
          : zoomIndex >= 7
            ? `Wider board (${next.window}rem)`
            : `Larger cards (${next.card}rem)`;
    }
  }

  function applyZoom(index, { persist = true } = {}) {
    zoomIndex = Math.max(0, Math.min(ZOOM_STEPS.length - 1, index));
    const step = ZOOM_STEPS[zoomIndex];
    const ratio = step.card / ZOOM_STEPS[DEFAULT_ZOOM_INDEX].card;

    if (appEl) {
      appEl.style.setProperty("--sol-card-w-user", `${step.card}rem`);
      appEl.style.setProperty("--sol-app-max", `${step.window}rem`);
      appEl.style.setProperty("--sol-stack-face", String(Math.round(14 * ratio)));
      appEl.style.setProperty("--sol-stack-back", String(Math.max(4, Math.round(5 * ratio))));
      appEl.style.setProperty("--sol-fan-step", `${step.fan}px`);
      appEl.style.setProperty("--sol-tableau-gap", `${step.gap}rem`);
      if (zoomIndex === DEFAULT_ZOOM_INDEX) {
        appEl.removeAttribute("data-sol-zoom");
      } else {
        appEl.dataset.solZoom = String(zoomIndex);
      }
    }

    updateZoomButtons();

    if (persist) {
      try {
        localStorage.setItem(ZOOM_KEY, String(zoomIndex));
      } catch {
        /* storage unavailable */
      }
    }

    if (state) renderBoard();
  }

  function loadZoom() {
    try {
      const raw = localStorage.getItem(ZOOM_KEY);
      const saved = raw != null ? parseInt(raw, 10) : DEFAULT_ZOOM_INDEX;
      applyZoom(Number.isFinite(saved) ? saved : DEFAULT_ZOOM_INDEX, { persist: false });
    } catch {
      applyZoom(DEFAULT_ZOOM_INDEX, { persist: false });
    }
  }

  function zoomIn() {
    if (zoomIndex >= ZOOM_STEPS.length - 1) return;
    applyZoom(zoomIndex + 1);
  }

  function zoomOut() {
    if (zoomIndex <= 0) return;
    applyZoom(zoomIndex - 1);
  }

  function stackStep(faceUp) {
    if (!boardEl) return faceUp ? 14 : 5;
    const name = faceUp ? "--sol-stack-face" : "--sol-stack-back";
    const raw = getComputedStyle(boardEl).getPropertyValue(name).trim();
    const n = parseFloat(raw);
    return Number.isFinite(n) ? n : faceUp ? 14 : 5;
  }

  function cardHeightPx() {
    if (!boardEl) return 56;
    const raw = getComputedStyle(boardEl).getPropertyValue("--sol-card-h").trim();
    const n = parseFloat(raw);
    return Number.isFinite(n) ? n : 56;
  }

  function applyDeckSet(setId) {
    deckSet = SolitaireCards.SETS[setId] ? setId : "classic";
    if (appEl) appEl.dataset.solDeck = deckSet;
    if (btnDeck) {
      const label = SolitaireCards.setLabel(deckSet);
      btnDeck.title = `Card set: ${label} — tap to change`;
      btnDeck.setAttribute("aria-label", `Card set ${label}, tap to change`);
      btnDeck.classList.toggle("active", deckSet !== "classic");
    }
    try {
      localStorage.setItem(DECK_KEY, deckSet);
    } catch {
      /* storage unavailable */
    }
    if (state) renderBoard();
  }

  function loadDeckSet() {
    try {
      const saved = localStorage.getItem(DECK_KEY);
      applyDeckSet(saved && SolitaireCards.SETS[saved] ? saved : "classic");
    } catch {
      applyDeckSet("classic");
    }
  }

  function toggleDeckSet() {
    window.SudokuApp?.closeMenu?.();
    applyDeckSet(SolitaireCards.nextSet(deckSet));
  }

  function wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
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
    if (timerEl) timerEl.textContent = formatTime(0);
  }

  function startTimer(fromSeconds = 0) {
    stopTimer();
    seconds = fromSeconds;
    if (timerEl) timerEl.textContent = formatTime(seconds);
    if (gameWon) return;
    timerRunning = true;
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

  function ensureTimerRunning() {
    if (gameWon || timerRunning) return;
    startTimer(seconds);
  }

  function setStatus(msg, type = "") {
    if (!statusEl) return;
    statusEl.textContent = msg;
    statusEl.className = "status" + (type ? ` ${type}` : "");
  }

  function updateCardCount() {
    if (!cardCountEl || !state) return;
    const left = Solitaire.remainingFaceDown(state) + state.waste.length;
    cardCountEl.textContent = `${left} hidden`;
    cardCountEl.setAttribute("aria-label", `${left} face-down or stock cards`);
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
      localStorage.setItem(STATS_KEY, JSON.stringify({ started: gamesStarted, completed: gamesCompleted }));
    } catch {
      /* storage unavailable */
    }
  }

  function renderStats() {
    if (statsStartedEl) statsStartedEl.textContent = String(gamesStarted);
    if (statsCompletedEl) statsCompletedEl.textContent = String(gamesCompleted);
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
      seedHistory = JSON.parse(localStorage.getItem(SEEDS_KEY) || "[]");
    } catch {
      seedHistory = [];
    }
  }

  function saveSeedHistory() {
    try {
      localStorage.setItem(SEEDS_KEY, JSON.stringify(seedHistory));
    } catch {
      /* storage unavailable */
    }
  }

  function recordSeed(nextSeed, difficulty) {
    seed = nextSeed;
    currentDifficulty = difficulty;
    seedHistory = seedHistory.filter((e) => e.seed !== nextSeed);
    seedHistory.unshift({ seed: nextSeed, difficulty, at: Date.now() });
    if (seedHistory.length > MAX_SEEDS) seedHistory.length = MAX_SEEDS;
    saveSeedHistory();
  }

  function renderSeeds() {
    if (!currentSeedEl || !seedList) return;
    currentSeedEl.textContent = seed != null ? `${seed} · ${currentDifficulty}` : "—";

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
      if (entry.seed === seed) li.classList.add("current");
      li.title = new Date(entry.at).toLocaleString();
      seedList.appendChild(li);
    });
  }

  function openSeeds() {
    window.SudokuApp?.closeMenu?.();
    renderSeeds();
    seedsDialog?.showModal();
  }

  function pushHistory() {
    if (!state) return;
    history.push(Solitaire.cloneState(state));
    while (history.length > HISTORY_LIMIT) history.shift();
    if (btnUndo) btnUndo.disabled = gameWon || history.length === 0;
  }

  function undo() {
    if (!history.length || gameWon) return;
    state = history.pop();
    selected = null;
    clearHint();
    setStatus("");
    renderBoard();
    if (btnUndo) btnUndo.disabled = history.length === 0;
    saveGame();
  }

  function clearHint() {
    hintTarget = null;
  }

  function setDealProgress(p, label) {
    const pct = Math.round(p * 100);
    if (dealBar) dealBar.style.width = `${pct}%`;
    dealProgress?.setAttribute("aria-valuenow", String(pct));
    if (label && dealLabel) dealLabel.textContent = label;
  }

  function showDealOverlay() {
    if (!dealOverlay) return;
    setDealProgress(0.1, "Dealing cards…");
    dealOverlay.hidden = false;
    dealOverlay.setAttribute("aria-hidden", "false");
    requestAnimationFrame(() => dealOverlay.classList.add("is-visible"));
  }

  function hideDealOverlay() {
    if (!dealOverlay) return;
    dealOverlay.classList.remove("is-visible");
    dealOverlay.hidden = true;
    dealOverlay.setAttribute("aria-hidden", "true");
    setDealProgress(0, "Dealing cards…");
  }

  function createCardEl(card, { stackOffset = 0, fanOffset = 0, selectable = true, layer = 0 } = {}) {
    const el = document.createElement("button");
    el.type = "button";
    el.className = "sol-card";
    el.dataset.cardId = String(card.id);
    el.style.setProperty("--stack-offset", String(stackOffset));
    el.style.setProperty("--fan-offset", String(fanOffset));
    el.style.setProperty("--card-layer", String(layer));

    SolitaireCards.mount(el, card, deckSet);

    if (!card.faceUp) {
      el.setAttribute("aria-label", "Face-down card");
      el.disabled = true;
      return el;
    }

    el.setAttribute("aria-label", `${Solitaire.rankLabel(card.rank)} of ${card.suit}`);

    if (selectable) {
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        onCardClick(card, el);
      });
      el.addEventListener("dblclick", (e) => {
        e.stopPropagation();
        onCardDoubleClick(card);
      });
    }

    return el;
  }

  function appendBackPreview(parent, card, { stackOffset = 0, fanOffset = 0, layer = 0 } = {}) {
    const el = document.createElement("span");
    el.className = "sol-card sol-card--back sol-card--preview";
    el.style.setProperty("--stack-offset", String(stackOffset));
    el.style.setProperty("--fan-offset", String(fanOffset));
    el.style.setProperty("--card-layer", String(layer));
    el.setAttribute("aria-hidden", "true");
    el.appendChild(SolitaireCards.renderBackSvg(deckSet, `p${card.id}-${layer}`));
    parent.appendChild(el);
  }

  function isSelected(cardRef) {
    if (!selected || !cardRef) return false;
    return selected.ref === cardRef;
  }

  function selectCard(ref) {
    selected = ref;
    renderBoard();
  }

  function clearSelection() {
    selected = null;
    renderBoard();
  }

  function onStockClick() {
    if (gameWon || !state) return;
    pushHistory();
    const drew = Solitaire.drawFromStock(state);
    if (!drew) {
      history.pop();
      setStatus("No more draws", "err");
      return;
    }
    clearSelection();
    clearHint();
    ensureTimerRunning();
    setStatus("");
    renderBoard();
    checkWin();
    saveGame();
  }

  function tryAutoFoundation(card, source) {
    const f = Solitaire.autoFoundationTarget(state, card);
    if (f < 0) return false;

    pushHistory();
    let moved = false;
    if (source === "waste") moved = Solitaire.moveWasteToFoundation(state);
    else if (source.type === "tableau") moved = Solitaire.moveTableauToFoundation(state, source.col);

    if (!moved) {
      history.pop();
      return false;
    }

    clearSelection();
    clearHint();
    ensureTimerRunning();
    renderBoard();
    checkWin();
    saveGame();
    return true;
  }

  function onCardDoubleClick(card) {
    if (gameWon || !card.faceUp) return;

    if (selected?.type === "waste" && Solitaire.topCard(state.waste)?.id === card.id) {
      tryAutoFoundation(card, "waste");
      return;
    }

    for (let col = 0; col < Solitaire.TABLEAU_COLS; col++) {
      const column = state.tableau[col];
      if (column.length && column[column.length - 1].id === card.id) {
        tryAutoFoundation(card, { type: "tableau", col });
        return;
      }
    }
  }

  function tryMoveToFoundation() {
    if (!selected) return false;
    pushHistory();
    let moved = false;

    if (selected.type === "waste") {
      moved = Solitaire.moveWasteToFoundation(state);
    } else if (selected.type === "tableau") {
      moved = Solitaire.moveTableauToFoundation(state, selected.col);
    }

    if (!moved) {
      history.pop();
      return false;
    }

    clearSelection();
    clearHint();
    ensureTimerRunning();
    renderBoard();
    checkWin();
    saveGame();
    return true;
  }

  function tryMoveToTableau(toCol) {
    if (!selected || !state) return false;

    pushHistory();
    let moved = false;

    if (selected.type === "waste") {
      moved = Solitaire.moveWasteToTableau(state, toCol);
    } else if (selected.type === "tableau") {
      moved = Solitaire.moveStack(state, selected.col, selected.startIdx, toCol);
    }

    if (!moved) {
      history.pop();
      return false;
    }

    clearSelection();
    clearHint();
    ensureTimerRunning();
    setStatus("");
    renderBoard();
    checkWin();
    saveGame();
    return true;
  }

  function onCardClick(card, el) {
    if (gameWon || !state) return;

    const wasteTop = Solitaire.topCard(state.waste);
    if (wasteTop?.id === card.id) {
      if (selected?.type === "waste") {
        clearSelection();
        return;
      }
      selectCard({ type: "waste", ref: "waste" });
      return;
    }

    for (let col = 0; col < Solitaire.TABLEAU_COLS; col++) {
      const column = state.tableau[col];
      const idx = column.findIndex((c) => c.id === card.id);
      if (idx < 0) continue;

      const stack = Solitaire.validStack(state.tableau, col, idx);
      if (!stack) return;

      if (selected) {
        if (selected.type === "tableau" && selected.col === col && selected.startIdx === idx) {
          clearSelection();
          return;
        }
        if (tryMoveToTableau(col)) return;
        if (selected.type === "tableau" && selected.col === col) {
          clearSelection();
          return;
        }
      }

      selectCard({ type: "tableau", col, startIdx: idx, ref: `t${col}-${idx}` });
      return;
    }
  }

  function onFoundationClick(index) {
    if (gameWon) return;
    if (selected && tryMoveToFoundation()) return;
    if (selected) clearSelection();
  }

  function onTableauSlotClick(col) {
    if (gameWon) return;
    if (selected && tryMoveToTableau(col)) return;
    if (selected) clearSelection();
  }

  function renderBoard() {
    if (!boardEl || !state) return;
    boardEl.innerHTML = "";

    const topRow = document.createElement("div");
    topRow.className = "sol-top";

    const stockBtn = document.createElement("button");
    stockBtn.type = "button";
    stockBtn.className = "sol-pile sol-stock";
    stockBtn.setAttribute("aria-label", "Stock pile — tap to draw");
    stockBtn.title = "Draw cards";
    if (state.stock.length) {
      stockBtn.classList.add("sol-pile--has-cards");
      const layers = Math.min(3, state.stock.length);
      for (let i = 0; i < layers; i++) {
        const card = state.stock[state.stock.length - layers + i];
        appendBackPreview(stockBtn, card, { stackOffset: i * 2, layer: i });
      }
      const count = document.createElement("span");
      count.className = "sol-pile-count";
      count.textContent = String(state.stock.length);
      stockBtn.appendChild(count);
    }
    stockBtn.addEventListener("click", onStockClick);
    topRow.appendChild(stockBtn);

    const wastePile = document.createElement("div");
    wastePile.className = "sol-pile sol-waste";
    wastePile.setAttribute("aria-label", "Waste pile");
    if (state.waste.length) {
      const visible = Math.min(3, state.waste.length);
      const start = state.waste.length - visible;
      for (let i = 0; i < visible; i++) {
        const card = state.waste[start + i];
        const isTop = i === visible - 1;
        const wasteCard = createCardEl(card, {
          fanOffset: i * fanStepPx(),
          selectable: isTop,
          layer: i,
        });
        if (isTop && isSelected("waste")) wasteCard.classList.add("selected");
        if (
          isTop &&
          (hintTarget?.type === "waste-foundation" || hintTarget?.type === "waste-tableau")
        ) {
          wasteCard.classList.add("hint");
        }
        wastePile.appendChild(wasteCard);
      }
    }
    topRow.appendChild(wastePile);

    const spacer = document.createElement("div");
    spacer.className = "sol-spacer";
    topRow.appendChild(spacer);

    const foundations = document.createElement("div");
    foundations.className = "sol-foundations";
    state.foundations.forEach((pile, i) => {
      const slot = document.createElement("button");
      slot.type = "button";
      slot.className = "sol-pile sol-foundation";
      slot.setAttribute("aria-label", `Foundation ${i + 1}`);
      const top = Solitaire.topCard(pile);
      if (top) {
        slot.appendChild(createCardEl(top, { selectable: false }));
      } else {
        slot.classList.add("sol-pile--empty");
      }
      if (hintTarget?.type === "waste-foundation" && hintTarget.foundation === i) {
        slot.classList.add("hint");
      }
      if (hintTarget?.type === "tableau-foundation" && hintTarget.fromCol != null) {
        const colTop = Solitaire.topCard(state.tableau[hintTarget.fromCol]);
        if (colTop && Solitaire.canPlaceOnFoundation(colTop, pile)) {
          slot.classList.add("hint");
        }
      }
      slot.addEventListener("click", () => onFoundationClick(i));
      foundations.appendChild(slot);
    });
    topRow.appendChild(foundations);
    boardEl.appendChild(topRow);

    const tableau = document.createElement("div");
    tableau.className = "sol-tableau";
    state.tableau.forEach((column, col) => {
      const colEl = document.createElement("div");
      colEl.className = "sol-column";

      const slot = document.createElement("button");
      slot.type = "button";
      slot.className = "sol-column-slot";
      slot.setAttribute("aria-label", `Tableau column ${col + 1}`);
      if (hintTarget?.type === "waste-tableau" && hintTarget.toCol === col) {
        slot.classList.add("hint");
      }
      if (hintTarget?.type === "tableau-tableau" && hintTarget.toCol === col) {
        slot.classList.add("hint");
      }
      slot.addEventListener("click", () => onTableauSlotClick(col));
      colEl.appendChild(slot);

      const stack = document.createElement("div");
      stack.className = "sol-stack";
      let stackOffset = 0;
      column.forEach((card, idx) => {
        const cardEl = createCardEl(card, { stackOffset });
        stackOffset += stackStep(card.faceUp);
        if (
          selected?.type === "tableau" &&
          selected.col === col &&
          idx >= selected.startIdx
        ) {
          cardEl.classList.add("selected");
        }
        if (
          hintTarget?.type === "tableau-tableau" &&
          hintTarget.fromCol === col &&
          idx >= hintTarget.startIdx
        ) {
          cardEl.classList.add("hint");
        }
        if (hintTarget?.type === "tableau-foundation" && hintTarget.fromCol === col && idx === column.length - 1) {
          cardEl.classList.add("hint");
        }
        stack.appendChild(cardEl);
      });
      if (column.length) {
        stack.style.minHeight = `${stackOffset + cardHeightPx()}px`;
      }
      colEl.appendChild(stack);
      tableau.appendChild(colEl);
    });
    boardEl.appendChild(tableau);

    updateCardCount();
    if (btnUndo) btnUndo.disabled = gameWon || history.length === 0;
  }

  function checkWin() {
    if (!state || !Solitaire.isWon(state)) return;
    gameWon = true;
    stopTimer();
    recordGameCompleted();
    setStatus("You win!", "ok");
    clearSelection();
    clearHint();
    saveGame();
  }

  function saveGame() {
    if (!state) return;
    const payload = {
      v: STATE_VERSION,
      state: {
        stock: state.stock,
        waste: state.waste,
        foundations: state.foundations,
        tableau: state.tableau,
        drawCount: state.drawCount,
        recycleAllowed: state.recycleAllowed,
        seed: state.seed,
        difficulty: state.difficulty,
        recycled: state.recycled,
      },
      seed,
      seconds,
      gameWon,
      difficultyPref: difficultyEl?.value,
      deckSet,
      zoomIndex,
    };
    try {
      localStorage.setItem(STATE_KEY, JSON.stringify(payload));
    } catch {
      /* storage full */
    }
  }

  function tryLoadGame() {
    const raw = localStorage.getItem(STATE_KEY);
    if (!raw) return false;

    try {
      const data = JSON.parse(raw);
      if (data.v !== STATE_VERSION || !data.state) return false;

      state = data.state;
      seed = data.seed ?? state.seed;
      currentDifficulty = state.difficulty || "medium";
      seconds = data.seconds || 0;
      gameWon = !!data.gameWon;
      history = [];

      if (data.difficultyPref && difficultyEl) difficultyEl.value = data.difficultyPref;
      if (data.deckSet && SolitaireCards.SETS[data.deckSet]) applyDeckSet(data.deckSet);
      if (Number.isFinite(data.zoomIndex)) applyZoom(data.zoomIndex, { persist: false });

      renderBoard();
      if (gameWon) {
        if (timerEl) timerEl.textContent = formatTime(seconds);
        setStatus("You win!", "ok");
      } else if (seconds > 0) {
        startTimer(seconds);
        setStatus("");
      } else {
        resetTimer();
        setStatus("");
      }
      return true;
    } catch {
      return false;
    }
  }

  async function dealBoard({ dealSeed, recordStart = true } = {}) {
    const token = ++dealToken;
    const difficulty = difficultyEl?.value || "medium";

    gameWon = false;
    selected = null;
    history = [];
    clearHint();
    setStatus("");

    boardWrap?.classList.add("is-clearing");
    await wait(DEAL_MS);
    if (token !== dealToken) return;

    showDealOverlay();
    boardWrap?.classList.add("is-dealing");
    setDealProgress(0.35, "Shuffling…");
    await wait(120);
    if (token !== dealToken) return;

    state = Solitaire.deal(dealSeed, difficulty);
    setDealProgress(0.85, "Laying out…");
    await wait(100);
    if (token !== dealToken) return;

    if (recordStart) {
      recordGameStarted();
      recordSeed(dealSeed, difficulty);
    } else {
      seed = dealSeed;
    }

    setDealProgress(1, "Ready");
    await wait(140);
    if (token !== dealToken) return;

    boardWrap?.classList.remove("is-dealing");
    renderBoard();

    await wait(80);
    if (token !== dealToken) return;

    hideDealOverlay();
    boardWrap?.classList.remove("is-clearing");
    resetTimer();
    if (btnUndo) btnUndo.disabled = true;
    saveGame();
  }

  function newGame() {
    const diff = difficultyEl?.value || "medium";
    const offset = diff === "easy" ? 0 : diff === "hard" ? 777777 : 314159;
    const dealSeed = (Solitaire.generateSeed() + offset) >>> 0;
    dealBoard({ dealSeed, recordStart: true });
  }

  function restartGame() {
    if (seed == null && !state) return;
    dealBoard({ dealSeed: seed ?? Solitaire.generateSeed(), recordStart: false });
  }

  function showHint() {
    if (gameWon || !state) return;
    const hint = Solitaire.findHint(state);
    clearHint();
    if (!hint) {
      setStatus("No moves found", "err");
      renderBoard();
      return;
    }
    hintTarget = hint;
    setStatus(
      hint.type === "draw"
        ? "Hint: draw from stock"
        : "Hint: try the highlighted move",
      "ok"
    );
    renderBoard();
    setTimeout(() => {
      if (hintTarget === hint) {
        clearHint();
        renderBoard();
      }
    }, 2400);
  }

  function fillGuide() {
    if (!guideBody) return;
    guideBody.innerHTML = "";
    SolitaireGuide.forEach((lesson) => {
      const article = document.createElement("article");
      article.className = "lesson";
      article.innerHTML = `<h3>${lesson.title}</h3><p>${lesson.body}</p>`;
      guideBody.appendChild(article);
    });
  }

  function openGuide() {
    window.SudokuApp?.closeMenu?.();
    fillGuide();
    guideDialog?.showModal();
  }

  function init() {
    if (initialized) return;
    initialized = true;

    loadStats();
    loadSeedHistory();
    loadDeckSet();
    loadZoom();

    btnUndo?.addEventListener("click", undo);
    btnHint?.addEventListener("click", showHint);
    document.getElementById("btn-solitaire-new")?.addEventListener("click", newGame);
    document.getElementById("btn-solitaire-restart")?.addEventListener("click", restartGame);
    document.getElementById("btn-solitaire-guide")?.addEventListener("click", openGuide);
    document.getElementById("btn-solitaire-seeds")?.addEventListener("click", openSeeds);
    btnDeck?.addEventListener("click", toggleDeckSet);
    btnZoomIn?.addEventListener("click", zoomIn);
    btnZoomOut?.addEventListener("click", zoomOut);
    document.getElementById("solitaire-guide-close")?.addEventListener("click", () => guideDialog?.close());
    guideDialog?.addEventListener("click", (e) => {
      if (e.target === guideDialog) guideDialog.close();
    });

    document.addEventListener("click", (e) => {
      if (!selected) return;
      if (e.target.closest(".sol-card, .sol-pile, .sol-column-slot, .sol-stock")) return;
      clearSelection();
    });

    try {
      if (!tryLoadGame()) newGame();
    } catch (err) {
      console.error("Solitaire init failed — starting fresh", err);
      localStorage.removeItem(STATE_KEY);
      newGame();
    }
  }

  window.SolitaireApp = {
    init,
    saveGame,
    newGame,
    restartGame,
    openSeeds,
    isActive() {
      return window.Games?.active === "solitaire";
    },
  };
})();
