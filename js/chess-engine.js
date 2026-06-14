// Stockfish UCI bridge — lazy Web Worker
(() => {
  const WORKER_URL = "vendor/stockfish/stockfish-lite.js#,worker";
  const INIT_TIMEOUT_MS = 60000;
  const READY_TIMEOUT_MS = 60000;
  const SEARCH_EXTRA_MS = 15000;

  let worker = null;
  let uciOk = false;
  let engineReady = false;
  let initPromise = null;
  let initReject = null;
  let pending = null;
  let activeSearchId = 0;

  function handleLine(line) {
    if (!line) return;
    const text = String(line).trim();
    if (!text) return;
    if (text.startsWith("uciok")) uciOk = true;
    if (text.startsWith("readyok")) engineReady = true;
    if (text.startsWith("bestmove ") && pending) {
      const match = text.match(/bestmove (\S+)/);
      const job = pending;
      if (job.id !== activeSearchId) return;
      pending = null;
      clearTimeout(job.timer);
      job.resolve(match && match[1] !== "(none)" ? match[1] : null);
    }
  }

  function handleMessage(data) {
    String(data).split(/\r?\n/).forEach((raw) => handleLine(raw));
  }

  function failInit(err) {
    if (pending) {
      clearTimeout(pending.timer);
      pending.reject(err);
      pending = null;
    }
    if (initReject) {
      initReject(err);
      initReject = null;
    }
    initPromise = null;
    terminate();
  }

  function waitFor(condFn, timeoutMs = READY_TIMEOUT_MS) {
    return new Promise((resolve, reject) => {
      const deadline = Date.now() + timeoutMs;
      const tick = () => {
        if (condFn()) resolve();
        else if (Date.now() >= deadline) reject(new Error("Engine ready timeout"));
        else setTimeout(tick, 20);
      };
      tick();
    });
  }

  function spawnWorker() {
    if (worker) return;
    worker = new Worker(WORKER_URL);
    worker.onmessage = (e) => handleMessage(e.data);
    worker.onerror = () => {
      failInit(new Error("Engine worker failed"));
    };
  }

  function send(cmd) {
    if (!worker) spawnWorker();
    worker.postMessage(cmd);
  }

  function init() {
    if (initPromise) return initPromise;
    initPromise = new Promise((resolve, reject) => {
      initReject = reject;
      const timeout = setTimeout(() => {
        failInit(new Error("Engine init timeout"));
      }, INIT_TIMEOUT_MS);

      try {
        spawnWorker();
        uciOk = false;
        engineReady = false;
        send("uci");
        waitFor(() => uciOk)
          .then(() => {
            send("ucinewgame");
            engineReady = false;
            send("isready");
            return waitFor(() => engineReady);
          })
          .then(() => {
            clearTimeout(timeout);
            initReject = null;
            resolve();
          })
          .catch((err) => {
            clearTimeout(timeout);
            failInit(err);
          });
      } catch (err) {
        clearTimeout(timeout);
        failInit(err);
      }
    });
    return initPromise;
  }

  function getBestMove(fen, movetimeMs = 1000) {
    const searchMs = Math.max(100, movetimeMs | 0);
    return init().then(() => new Promise((resolve, reject) => {
      const id = ++activeSearchId;
      if (pending) {
        send("stop");
        clearTimeout(pending.timer);
        const prev = pending;
        pending = null;
        prev.reject(new Error("Interrupted"));
      }
      const timer = setTimeout(() => {
        if (!pending || pending.id !== id) return;
        send("stop");
        const job = pending;
        pending = null;
        job.reject(new Error("Search timeout"));
      }, searchMs + SEARCH_EXTRA_MS);
      pending = { id, resolve, reject, timer };
      send(`position fen ${fen}`);
      send(`go movetime ${searchMs}`);
    }));
  }

  function stop() {
    if (worker) send("stop");
    if (pending) {
      clearTimeout(pending.timer);
      pending.resolve(null);
      pending = null;
    }
  }

  function terminate() {
    stop();
    if (worker) {
      worker.terminate();
      worker = null;
    }
    uciOk = false;
    engineReady = false;
    initPromise = null;
    initReject = null;
  }

  window.ChessEngine = {
    init,
    getBestMove,
    stop,
    terminate,
    isReady: () => engineReady,
  };
})();
