// Stockfish UCI bridge — lazy Web Worker
(() => {
  const WORKER_URL = "vendor/stockfish/stockfish-lite.js#,worker";

  let worker = null;
  let ready = false;
  let initPromise = null;
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

  function spawnWorker() {
    if (worker) return;
    worker = new Worker(WORKER_URL);
    worker.onmessage = (e) => handleLine(e.data);
    worker.onerror = () => {
      if (pending) {
        pending.reject(new Error("Engine worker failed"));
        pending = null;
      }
    };
  }

  function send(cmd) {
    if (!worker) spawnWorker();
    worker.postMessage(cmd);
  }

  function waitReady() {
    return new Promise((resolve) => {
      if (ready) {
        resolve();
        return;
      }
      const tick = () => {
        if (ready) resolve();
        else setTimeout(tick, 20);
      };
      tick();
    });
  }

  function init() {
    if (initPromise) return initPromise;
    initPromise = new Promise((resolve, reject) => {
      try {
        spawnWorker();
        ready = false;
        send("uci");
        waitReady().then(() => {
          send("isready");
          waitReady().then(resolve);
        });
      } catch (err) {
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
  }

  window.ChessEngine = { init, getBestMove, stop, terminate, isReady: () => ready };
})();
