// Stockfish UCI bridge — minimal state machine
(() => {
  const WORKER_URL = new URL("vendor/stockfish/stockfish-lite.js", document.baseURI).href;
  const INIT_TIMEOUT_MS = 20000;
  const READY_TIMEOUT_MS = 60000;
  const SEARCH_EXTRA_MS = 15000;

  let worker = null;
  let uciOk = false;
  let engineReady = false;
  let initPromise = null;
  let initReject = null;
  let pending = null;
  let searchGen = 0;

  function handleLine(line) {
    const text = String(line).trim();
    if (!text) return;
    if (text.startsWith("uciok")) uciOk = true;
    if (text.startsWith("readyok")) engineReady = true;
    if (!pending || pending.phase !== "search") return;
    if (!text.startsWith("bestmove ")) return;
    if (pending.gen !== searchGen) return;
    const match = text.match(/bestmove (\S+)/);
    const job = pending;
    pending = null;
    clearTimeout(job.timer);
    job.resolve(match && match[1] !== "(none)" ? match[1] : null);
  }

  function handleMessage(data) {
    String(data).split(/\r?\n/).forEach(handleLine);
  }

  function waitFor(condFn, timeoutMs = READY_TIMEOUT_MS) {
    return new Promise((resolve, reject) => {
      const deadline = Date.now() + timeoutMs;
      const tick = () => {
        if (condFn()) resolve();
        else if (Date.now() >= deadline) reject(new Error("Engine timeout"));
        else setTimeout(tick, 20);
      };
      tick();
    });
  }

  function failInit(err) {
    if (initReject) {
      initReject(err);
      initReject = null;
    }
    initPromise = null;
    if (pending) {
      clearTimeout(pending.timer);
      pending.reject(err);
      pending = null;
    }
    terminateWorker();
  }

  function terminateWorker() {
    if (!worker) return;
    worker.terminate();
    worker = null;
    uciOk = false;
    engineReady = false;
  }

  function spawnWorker() {
    if (worker) return;
    worker = new Worker(WORKER_URL);
    worker.onmessage = (e) => handleMessage(e.data);
    worker.onerror = () => {
      failInit(new Error("Worker failed"));
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

  function cancelPending() {
    searchGen += 1;
    if (worker) send("stop");
    if (pending) {
      clearTimeout(pending.timer);
      pending.reject(new Error("Cancelled"));
      pending = null;
    }
  }

  function search(uciMoves, movetimeMs = 1000) {
    const ms = Math.max(100, movetimeMs | 0);
    const moves = (uciMoves || []).filter(Boolean);
    const posCmd = moves.length
      ? `position startpos moves ${moves.join(" ")}`
      : "position startpos";

    return init().then(() => {
      cancelPending();
      const gen = searchGen;

      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          if (!pending || pending.gen !== gen) return;
          send("stop");
          pending = null;
          reject(new Error("Search timeout"));
        }, ms + SEARCH_EXTRA_MS);

        pending = { gen, resolve, reject, timer, phase: "position" };

        engineReady = false;
        send(posCmd);
        send("isready");

        waitFor(() => engineReady && pending?.gen === gen)
          .then(() => {
            if (!pending || pending.gen !== gen) return;
            pending.phase = "search";
            send(`go movetime ${ms}`);
          })
          .catch((err) => {
            clearTimeout(timer);
            if (pending?.gen === gen) pending = null;
            reject(err);
          });
      });
    });
  }

  window.ChessEngine = {
    init,
    search,
    cancel: cancelPending,
    isReady: () => engineReady && !!initPromise,
  };
})();
