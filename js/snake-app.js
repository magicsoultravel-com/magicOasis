(() => {
  const boardEl = document.getElementById("snake-board");
  const boardWrapEl = boardEl?.parentElement;
  const startEl = document.getElementById("snake-start");
  const pauseEl = document.getElementById("snake-pause");
  const statusEl = document.getElementById("snake-status");
  const scoreEl = document.getElementById("snake-score");
  const bestEl = document.getElementById("snake-best");
  const levelEl = document.getElementById("snake-level");
  const gridEl = document.getElementById("snake-difficulty");

  const DEATH_LINES = ["Nein!", "Mein Leben!", "Scheiße!"];
  const STATE_KEY = "snake-game";
  const BEST_PREFIX = "snake-best";
  const GRID_SIZES = { easy: 12, medium: 16, hard: 24 };
  const MAX_LEVEL = 10;
  const LEVEL_SPEEDS = [200, 175, 155, 135, 115, 98, 82, 68, 55, 45];

  const DIR = {
    ArrowUp: { dr: -1, dc: 0 },
    ArrowDown: { dr: 1, dc: 0 },
    ArrowLeft: { dr: 0, dc: -1 },
    ArrowRight: { dr: 0, dc: 1 },
  };

  let gridSize = 16;
  let snake = [];
  let dir = { dr: 0, dc: 1 };
  let nextDir = dir;
  let food = null;
  let score = 0;
  let best = 0;
  let speedLevel = 1;
  let running = false;
  let waiting = true;
  let paused = false;
  let gameOver = false;
  let tickTimer = null;
  let initialized = false;
  let touchStart = null;
  let germanVoice = null;

  function gridSizeFromMenu() {
    const key = gridEl?.value || "medium";
    return GRID_SIZES[key] ?? GRID_SIZES.medium;
  }

  function bestKey() {
    return `${BEST_PREFIX}-${gridSize}`;
  }

  function loadBest() {
    try {
      best = parseInt(localStorage.getItem(bestKey()), 10) || 0;
      if (!best && gridSize === GRID_SIZES.medium) {
        const legacy = parseInt(localStorage.getItem("snake-best"), 10) || 0;
        if (legacy) {
          best = legacy;
          localStorage.setItem(bestKey(), String(legacy));
        }
      }
    } catch {
      best = 0;
    }
    if (bestEl) bestEl.textContent = String(best);
  }

  function saveBest() {
    if (score > best) {
      best = score;
      try {
        localStorage.setItem(bestKey(), String(best));
      } catch {
        /* storage unavailable */
      }
      if (bestEl) bestEl.textContent = String(best);
    }
  }

  function randomFood() {
    const occupied = new Set(snake.map(([r, c]) => `${r},${c}`));
    const free = [];
    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        if (!occupied.has(`${r},${c}`)) free.push([r, c]);
      }
    }
    return free[Math.floor(Math.random() * free.length)];
  }

  function setStatus(msg) {
    if (statusEl) statusEl.textContent = msg;
  }

  function updateLevel() {
    if (levelEl) levelEl.textContent = String(speedLevel);
  }

  function headDirClass() {
    if (dir.dr < 0) return "snake-cell--head-up";
    if (dir.dr > 0) return "snake-cell--head-down";
    if (dir.dc < 0) return "snake-cell--head-left";
    return "snake-cell--head-right";
  }

  function pickGermanVoice() {
    if (!window.speechSynthesis) return null;
    const voices = speechSynthesis.getVoices();
    const de = voices.filter((v) => /^de(-|_)/i.test(v.lang));
    if (!de.length) return null;

    const malePatterns = [
      /male|mann|stefan|markus|hans|konrad|yannick|jan|thorsten|peter|klaus|michael|google deutsch/i,
    ];
    const femalePatterns = [/female|frau|anna|petra|hedda|katja|sabrina|viktoria|helena|marlene/i];

    for (const pattern of malePatterns) {
      const match = de.find((v) => pattern.test(v.name) && !femalePatterns.some((fp) => fp.test(v.name)));
      if (match) return match;
    }

    const nonFemale = de.find((v) => !femalePatterns.some((fp) => fp.test(v.name)));
    return nonFemale || de.find((v) => /de-DE/i.test(v.lang)) || de[0];
  }

  function initVoice() {
    if (!("speechSynthesis" in window)) return;
    const refresh = () => {
      germanVoice = pickGermanVoice();
    };
    refresh();
    window.speechSynthesis.addEventListener("voiceschanged", refresh);
  }

  function speakDeath() {
    if (!window.speechSynthesis) return;
    const text = DEATH_LINES[Math.floor(Math.random() * DEATH_LINES.length)];
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "de-DE";
    if (germanVoice) utterance.voice = germanVoice;
    utterance.rate = 0.68;
    utterance.pitch = 0.72;
    utterance.volume = 1;
    window.speechSynthesis.speak(utterance);
  }

  function updateStartOverlay() {
    if (!startEl) return;
    startEl.hidden = !(waiting || gameOver);
    startEl.textContent = "START";
  }

  function updatePauseOverlay() {
    if (pauseEl) {
      pauseEl.hidden = !paused;
      pauseEl.setAttribute("aria-hidden", paused ? "false" : "true");
    }
    boardWrapEl?.classList.toggle("snake-board-wrap--paused", paused);
  }

  function updateScore() {
    if (scoreEl) scoreEl.textContent = String(score);
  }

  function speedMs() {
    return LEVEL_SPEEDS[Math.min(speedLevel, MAX_LEVEL) - 1] ?? LEVEL_SPEEDS[0];
  }

  function stopTick() {
    if (tickTimer) {
      clearInterval(tickTimer);
      tickTimer = null;
    }
    running = false;
  }

  function startTick() {
    stopTick();
    if (gameOver || paused || waiting) return;
    running = true;
    tickTimer = setInterval(tick, speedMs());
  }

  function applyGridSize() {
    gridSize = gridSizeFromMenu();
    if (boardEl) {
      boardEl.style.gridTemplateColumns = `repeat(${gridSize}, 1fr)`;
      boardEl.classList.toggle("snake-board--grid-24", gridSize >= 24);
    }
    boardWrapEl?.classList.toggle("snake-board-wrap--large", gridSize >= 24);
    loadBest();
  }

  function resetGame() {
    stopTick();
    paused = false;
    applyGridSize();
    const mid = Math.floor(gridSize / 2);
    snake = [
      [mid, mid - 1],
      [mid, mid],
      [mid, mid + 1],
    ];
    dir = { dr: 0, dc: 1 };
    nextDir = dir;
    score = 0;
    speedLevel = 1;
    gameOver = false;
    waiting = true;
    food = randomFood();
    updateScore();
    updateLevel();
    setStatus("Press START to play");
    render();
    updateStartOverlay();
    updatePauseOverlay();
  }

  function startGame() {
    if (gameOver) resetGame();
    if (!waiting) return;
    waiting = false;
    paused = false;
    setStatus("Arrow keys or swipe to move · P to pause");
    updateStartOverlay();
    updatePauseOverlay();
    startTick();
  }

  function togglePause() {
    if (waiting || gameOver || !running) return;
    paused = !paused;
    if (paused) {
      stopTick();
      setStatus("Paused — press P to resume");
    } else {
      setStatus("Arrow keys or swipe to move · P to pause");
      startTick();
    }
    updatePauseOverlay();
  }

  function bumpSpeed() {
    if (speedLevel >= MAX_LEVEL) return;
    speedLevel += 1;
    updateLevel();
    if (running && !paused) {
      stopTick();
      startTick();
    }
  }

  function tick() {
    const nd = nextDir;
    if (!(nd.dr === -dir.dr && nd.dc === -dir.dc)) {
      dir = nd;
    }

    const head = snake[snake.length - 1];
    const nr = head[0] + dir.dr;
    const nc = head[1] + dir.dc;

    if (nr < 0 || nr >= gridSize || nc < 0 || nc >= gridSize) {
      endGame();
      return;
    }

    for (const [r, c] of snake) {
      if (r === nr && c === nc) {
        endGame();
        return;
      }
    }

    snake.push([nr, nc]);

    if (food && nr === food[0] && nc === food[1]) {
      score += 10;
      updateScore();
      food = randomFood();
      bumpSpeed();
      setStatus(`Score ${score} · speed ${speedLevel}`);
    } else {
      snake.shift();
    }

    render();
  }

  function endGame() {
    gameOver = true;
    waiting = false;
    paused = false;
    stopTick();
    saveBest();
    speakDeath();
    setStatus(`Game over — score ${score}`);
    render();
    updateStartOverlay();
    updatePauseOverlay();
  }

  function setDirection(key) {
    const d = DIR[key];
    if (!d || gameOver || waiting || paused) return;
    const opposite = d.dr === -dir.dr && d.dc === -dir.dc;
    const pendingOpposite = d.dr === -nextDir.dr && d.dc === -nextDir.dc;
    if (!opposite && !pendingOpposite) {
      nextDir = d;
    }
    if (!running && !gameOver && !waiting && !paused) startTick();
  }

  function renderHeadMarkup() {
    return `<span class="snake-face" aria-hidden="true"><span class="snake-eye"></span><span class="snake-eye"></span><span class="snake-mouth"></span></span>`;
  }

  function render() {
    if (!boardEl) return;

    const snakeSet = new Set(snake.map(([r, c]) => `${r},${c}`));
    const head = snake[snake.length - 1];
    const cells = [];

    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        const key = `${r},${c}`;
        let cls = "snake-cell";
        let inner = "";
        if (snakeSet.has(key)) {
          cls += " snake-cell--body";
          if (head[0] === r && head[1] === c) {
            cls += ` snake-cell--head ${headDirClass()}`;
            inner = renderHeadMarkup();
          }
        } else if (food && food[0] === r && food[1] === c) {
          cls += " snake-cell--food";
        }
        cells.push(`<div class="${cls}" data-r="${r}" data-c="${c}">${inner}</div>`);
      }
    }

    boardEl.innerHTML = cells.join("");
    boardEl.classList.toggle("snake-board--over", gameOver);
  }

  function onKeyDown(e) {
    if (window.Games?.active !== "snake") return;
    if (DIR[e.key]) {
      e.preventDefault();
      setDirection(e.key);
    } else if ((e.key === "p" || e.key === "P") && !waiting && !gameOver) {
      e.preventDefault();
      togglePause();
    } else if (e.key === " " && (gameOver || waiting)) {
      e.preventDefault();
      startGame();
    }
  }

  function bindControls() {
    document.querySelectorAll("[data-snake-dir]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const key = btn.dataset.snakeDir;
        if (key) setDirection(key);
      });
    });

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
        if (Math.max(ax, ay) < 24) return;
        if (ax > ay) {
          setDirection(dx > 0 ? "ArrowRight" : "ArrowLeft");
        } else {
          setDirection(dy > 0 ? "ArrowDown" : "ArrowUp");
        }
      },
      { passive: true }
    );
  }

  function saveGame() {
    if (!initialized || gameOver || waiting || paused) return;
    try {
      localStorage.setItem(
        STATE_KEY,
        JSON.stringify({
          snake,
          dir,
          nextDir,
          food,
          score,
          speedLevel,
          gridSize,
          gridKey: gridEl?.value || "medium",
          running: running && !waiting,
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
      if (!Array.isArray(data.snake) || !data.snake.length) return false;
      if (data.gridKey && gridEl) gridEl.value = data.gridKey;
      applyGridSize();
      if (data.gridSize && data.gridSize !== gridSize) {
        gridSize = data.gridSize;
        if (boardEl) boardEl.style.gridTemplateColumns = `repeat(${gridSize}, 1fr)`;
      }
      snake = data.snake;
      dir = data.dir || { dr: 0, dc: 1 };
      nextDir = data.nextDir || dir;
      food = data.food;
      score = data.score || 0;
      speedLevel = Math.min(Math.max(data.speedLevel || 1, 1), MAX_LEVEL);
      gameOver = false;
      waiting = true;
      paused = false;
      updateScore();
      updateLevel();
      setStatus("Press START to resume");
      render();
      updateStartOverlay();
      updatePauseOverlay();
      return true;
    } catch {
      return false;
    }
  }

  function init() {
    if (!initialized) {
      initialized = true;
      initVoice();
      bindControls();
      document.addEventListener("keydown", onKeyDown);
      startEl?.addEventListener("click", startGame);
      document.getElementById("btn-snake-new")?.addEventListener("click", resetGame);
      document.getElementById("btn-snake-restart")?.addEventListener("click", resetGame);
      gridEl?.addEventListener("change", resetGame);
    }

    if (!loadGame()) {
      resetGame();
    }
  }

  window.SnakeApp = { init, saveGame, resetGame };
})();
