(() => {
  const boardEl = document.getElementById("snake-board");
  const startEl = document.getElementById("snake-start");
  const statusEl = document.getElementById("snake-status");
  const scoreEl = document.getElementById("snake-score");
  const bestEl = document.getElementById("snake-best");
  const difficultyEl = document.getElementById("snake-difficulty");
  const appEl = document.querySelector(".app");

  const DEATH_LINES = ["Nein!", "Mein Leben!", "Scheiße!"];

  const STATE_KEY = "snake-game";
  const BEST_KEY = "snake-best";
  const SPEEDS = { easy: 140, medium: 100, hard: 70 };
  const GRID = 16;

  const DIR = {
    ArrowUp: { dr: -1, dc: 0 },
    ArrowDown: { dr: 1, dc: 0 },
    ArrowLeft: { dr: 0, dc: -1 },
    ArrowRight: { dr: 0, dc: 1 },
  };

  let snake = [];
  let dir = { dr: 0, dc: 1 };
  let nextDir = dir;
  let food = null;
  let score = 0;
  let best = 0;
  let running = false;
  let waiting = true;
  let gameOver = false;
  let tickTimer = null;
  let initialized = false;
  let touchStart = null;
  let germanVoice = null;

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

  function randomFood() {
    const occupied = new Set(snake.map(([r, c]) => `${r},${c}`));
    const free = [];
    for (let r = 0; r < GRID; r++) {
      for (let c = 0; c < GRID; c++) {
        if (!occupied.has(`${r},${c}`)) free.push([r, c]);
      }
    }
    return free[Math.floor(Math.random() * free.length)];
  }

  function setStatus(msg) {
    if (statusEl) statusEl.textContent = msg;
  }

  function pickGermanVoice() {
    if (!window.speechSynthesis) return null;
    const voices = speechSynthesis.getVoices();
    const de = voices.filter((v) => /^de(-|_)/i.test(v.lang));
    if (!de.length) return null;
    return de.find((v) => /de-DE/i.test(v.lang)) || de[0];
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
    utterance.rate = 0.82;
    utterance.pitch = 0.92;
    window.speechSynthesis.speak(utterance);
  }

  function updateStartOverlay() {
    if (!startEl) return;
    const show = waiting || gameOver;
    startEl.hidden = !show;
    startEl.textContent = "START";
  }

  function updateScore() {
    if (scoreEl) scoreEl.textContent = String(score);
  }

  function speedMs() {
    const diff = difficultyEl?.value || "medium";
    return SPEEDS[diff] ?? SPEEDS.medium;
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
    if (gameOver) return;
    running = true;
    tickTimer = setInterval(tick, speedMs());
  }

  function resetGame() {
    stopTick();
    const mid = Math.floor(GRID / 2);
    snake = [
      [mid, mid - 1],
      [mid, mid],
      [mid, mid + 1],
    ];
    dir = { dr: 0, dc: 1 };
    nextDir = dir;
    score = 0;
    gameOver = false;
    waiting = true;
    food = randomFood();
    updateScore();
    setStatus("Press START to play");
    render();
    updateStartOverlay();
  }

  function startGame() {
    if (gameOver) resetGame();
    if (!waiting) return;
    waiting = false;
    setStatus("Arrow keys or swipe to move");
    updateStartOverlay();
    startTick();
  }

  function tick() {
    const nd = nextDir;
    if (!(nd.dr === -dir.dr && nd.dc === -dir.dc)) {
      dir = nd;
    }

    const head = snake[snake.length - 1];
    const nr = head[0] + dir.dr;
    const nc = head[1] + dir.dc;

    if (nr < 0 || nr >= GRID || nc < 0 || nc >= GRID) {
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
      setStatus(`Score ${score}`);
      stopTick();
      startTick();
    } else {
      snake.shift();
    }

    render();
  }

  function endGame() {
    gameOver = true;
    waiting = false;
    stopTick();
    saveBest();
    speakDeath();
    setStatus(`Game over — score ${score}`);
    render();
    updateStartOverlay();
  }

  function setDirection(key) {
    const d = DIR[key];
    if (!d || gameOver || waiting) return;
    const opposite = d.dr === -dir.dr && d.dc === -dir.dc;
    const pendingOpposite = d.dr === -nextDir.dr && d.dc === -nextDir.dc;
    if (!opposite && !pendingOpposite) {
      nextDir = d;
    }
    if (!running && !gameOver && !waiting) startTick();
  }

  function render() {
    if (!boardEl) return;

    const snakeSet = new Set(snake.map(([r, c]) => `${r},${c}`));
    const head = snake[snake.length - 1];
    const cells = [];

    for (let r = 0; r < GRID; r++) {
      for (let c = 0; c < GRID; c++) {
        const key = `${r},${c}`;
        let cls = "snake-cell";
        if (snakeSet.has(key)) {
          cls += " snake-cell--body";
          if (head[0] === r && head[1] === c) cls += " snake-cell--head";
        } else if (food && food[0] === r && food[1] === c) {
          cls += " snake-cell--food";
        }
        cells.push(`<div class="${cls}" data-r="${r}" data-c="${c}"></div>`);
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
    if (!initialized || gameOver || waiting) return;
    try {
      localStorage.setItem(
        STATE_KEY,
        JSON.stringify({ snake, dir, nextDir, food, score, running: running && !waiting })
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
      snake = data.snake;
      dir = data.dir || { dr: 0, dc: 1 };
      nextDir = data.nextDir || dir;
      food = data.food;
      score = data.score || 0;
      gameOver = false;
      waiting = true;
      updateScore();
      setStatus("Press START to resume");
      render();
      updateStartOverlay();
      return true;
    } catch {
      return false;
    }
  }

  function init() {
    if (!initialized) {
      initialized = true;
      loadBest();
      initVoice();
      bindControls();
      document.addEventListener("keydown", onKeyDown);
      startEl?.addEventListener("click", startGame);
      document.getElementById("btn-snake-new")?.addEventListener("click", resetGame);
      document.getElementById("btn-snake-restart")?.addEventListener("click", resetGame);
      difficultyEl?.addEventListener("change", () => {
        if (running) {
          stopTick();
          startTick();
        }
      });
    }

    if (!loadGame()) {
      resetGame();
    }
  }

  window.SnakeApp = { init, saveGame, resetGame };
})();
