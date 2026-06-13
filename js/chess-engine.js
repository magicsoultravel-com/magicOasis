// Stockfish UCI bridge — lazy Web Worker
(() => {
  const WORKER_URL = "vendor/stockfish/stockfish-lite.js#,worker";
  const READY_TIMEOUT_MS = 15000;

  let worker = null;
  let ready = false;
  let initPromise = null;
  let initReject = null;
  let pending = null;

  function handleLine(line) {
    if (!line || typeof line !== "string") return;
    if (line === "uciok" || line === "readyok") ready = true;
    if (line.startsWith("bestmove ") && pending) {
      const match = line.match(/bestmove (\S+)/);
      const resolve = pending.resolve;
      pending = null;
      resolve(match && match[1] !== "(none)" ? match[1] : null);
    }
  }

  function failEngine(err) {
    if (pending) {
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
    worker.onmessage = (e) => handleLine(e.data);
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
      }, READY_TIMEOUT_MS);

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
    return init().then(() => new Promise((resolve, reject) => {
      if (pending) {
        send("stop");
        pending.reject(new Error("Interrupted"));
      }
      pending = { resolve, reject };
      send(`position fen ${fen}`);
      send(`go movetime ${Math.max(100, movetimeMs | 0)}`);
    }));
  }

  function stop() {
    if (worker) send("stop");
    if (pending) {
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
