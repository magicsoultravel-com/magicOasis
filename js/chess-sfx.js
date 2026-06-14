// Chess move / capture sounds (Web Audio, no asset files)
(() => {
  let ctx = null;

  function ensureContext() {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    if (!ctx) ctx = new Ctx();
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  }

  function unlock() {
    window.Ambience?.unlockAudio?.();
    return ensureContext();
  }

  function playTone({ freq, duration, type = "sine", gainPeak = 0.12, decay = 0.1 }) {
    const audio = ensureContext();
    if (!audio) return;
    const t = audio.currentTime;
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(60, freq * 0.35), t + duration);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(gainPeak, t + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + decay);
    osc.connect(gain);
    gain.connect(audio.destination);
    osc.start(t);
    osc.stop(t + decay + 0.02);
  }

  function playMove(capture = false) {
    unlock();
    if (capture) {
      playTone({ freq: 220, type: "triangle", gainPeak: 0.14, decay: 0.14 });
      playTone({ freq: 140, type: "square", gainPeak: 0.06, decay: 0.1 });
    } else {
      playTone({ freq: 320, type: "sine", gainPeak: 0.11, decay: 0.11 });
    }
  }

  window.ChessSfx = { unlock, playMove };
})();
