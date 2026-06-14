// Stockfish UCI bridge — lazy Web Worker
(() => {
  const WORKER_URL = "vendor/stockfish/stockfish-lite.js#,worker";
  const INIT_TIMEOUT_MS = 60000;
  const READY_TIMEOUT_MS = 60000;
  const SEARCH_EXTRA_MS = 15000;

  let worker = null;
  let ready = false;
  let initPromise = null;
  let initReject = null;
  let pending = null;

  function handleLine(line) {
    if (!line) return;
    const text = String(line).trim();
    if (!text) return;
    if (text.startsWith("uciok") || text.startsWith("readyok")) ready = true;
    if (text.startsWith("bestmove ") && pending) {
      const match = text.match(/bestmove (\S+)/);
      const resolve = pending.resolve;
      clearTimeout(pending.timer);
      pending = null;
      resolve(match && match[1] !== "(none)" ? match[1] : null);
    }
  }

  function handleMessage(data) {
    String(data).split(/\r?\n/).forEach((raw) => handleLine(raw));
  }

  function failEngine(err) {
    if (pending) {
      clearTimeout(pending.timer);
      pending.reject(err);
      pending = null;
    }
    if (initReject) {
      initReject(err);
      initReject = null;
    }
    terminate();
  }

  function spawnWorker() {
    if (worker) return;
    worker = new Worker(WORKER_URL);
    worker.onmessage = (e) => handleMessage(e.data);
    worker.onerror = () => {
      failEngine(new Error("Engine worker failed"));
    };
  }

  function send(cmd) {
    if (!worker) spawnWorker();
    worker.postMessage(cmd);
  }

  function waitReady(timeoutMs = READY_TIMEOUT_MS) {
    return new Promise((resolve, reject) => {
      if (ready) {
        resolve();
        return;
      }
      const deadline = Date.now() + timeoutMs;
      const tick = () => {
        if (ready) resolve();
        else if (Date.now() >= deadline) reject(new Error("Engine ready timeout"));
        else setTimeout(tick, 20);
      };
      tick();
    });
  }

  function init() {
    if (initPromise) return initPromise;
    initPromise = new Promise((resolve, reject) => {
      initReject = reject;
      const timeout = setTimeout(() => {
        failEngine(new Error("Engine init timeout"));
      }, INIT_TIMEOUT_MS);

      try {
        spawnWorker();
        ready = false;
        send("uci");
        waitReady()
          .then(() => {
            ready = false;
            send("isready");
            return waitReady();
          })
          .then(() => {
            clearTimeout(timeout);
            initReject = null;
            resolve();
          })
          .catch((err) => {
            clearTimeout(timeout);
            initReject = null;
            initPromise = null;
            reject(err);
          });
      } catch (err) {
        clearTimeout(timeout);
        initReject = null;
        initPromise = null;
        reject(err);
      }
    });
    return initPromise;
  }

  function getBestMove(fen, movetimeMs = 1000) {
    const searchMs = Math.max(100, movetimeMs | 0);
    return init().then(() => new Promise((resolve, reject) => {
      if (pending) {
        send("stop");
        clearTimeout(pending.timer);
        pending.reject(new Error("Interrupted"));
      }
      const timer = setTimeout(() => {
        if (!pending) return;
        send("stop");
        pending.reject(new Error("Search timeout"));
        pending = null;
      }, searchMs + SEARCH_EXTRA_MS);
      pending = { resolve, reject, timer };
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
    ready = false;
    initPromise = null;
    initReject = null;
  }

  window.ChessEngine = { init, getBestMove, stop, terminate, isReady: () => ready };
})();
