(() => {
  const STORAGE_KEY = "magic-ambience-v1";

  const LAYERS = [
    { id: "birds", label: "Birds", ogg: "audio/ambience/birds.ogg", mp3: "audio/ambience/birds.mp3", defaultVol: 0.55 },
    { id: "water", label: "Water", ogg: "audio/ambience/water.ogg", mp3: "audio/ambience/water.mp3", defaultVol: 0.6 },
    { id: "wind", label: "Wind", ogg: "audio/ambience/wind.ogg", mp3: "audio/ambience/wind.mp3", defaultVol: 0.45 },
    { id: "forest", label: "Forest", ogg: "audio/ambience/forest.ogg", mp3: "audio/ambience/forest.mp3", defaultVol: 0.4 },
  ];

  const DEFAULT_MASTER = 0.7;
  const FADE_SEC = 0.08;

  let initialized = false;
  let gestureUnlocked = false;
  let pendingResume = false;

  let audioCtx = null;
  let masterGain = null;
  let masterRange = null;
  let masterVol = DEFAULT_MASTER;

  const state = {};

  function defaultLayerState() {
    const layers = {};
    LAYERS.forEach((layer) => {
      layers[layer.id] = { on: false, vol: layer.defaultVol };
    });
    return { master: DEFAULT_MASTER, layers };
  }

  function loadPrefs() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultLayerState();
      const parsed = JSON.parse(raw);
      const base = defaultLayerState();
      if (typeof parsed.master === "number") base.master = clamp(parsed.master, 0, 1);
      LAYERS.forEach((layer) => {
        const saved = parsed.layers?.[layer.id];
        if (!saved) return;
        if (typeof saved.on === "boolean") base.layers[layer.id].on = saved.on;
        if (typeof saved.vol === "number") base.layers[layer.id].vol = clamp(saved.vol, 0, 1);
      });
      return base;
    } catch {
      return defaultLayerState();
    }
  }

  function savePrefs() {
    try {
      const layers = {};
      LAYERS.forEach((layer) => {
        const s = state[layer.id];
        layers[layer.id] = { on: s.on, vol: s.vol };
      });
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ master: masterVol, layers }));
    } catch {
      /* storage unavailable */
    }
  }

  function clamp(n, min, max) {
    return Math.min(max, Math.max(min, n));
  }

  function prefersReducedMotion() {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function pickUrl(layer) {
    const probe = document.createElement("audio");
    if (probe.canPlayType('audio/ogg; codecs="vorbis"')) return layer.ogg;
    return layer.mp3;
  }

  function ensureContext() {
    if (!audioCtx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return false;
      audioCtx = new Ctx();
      masterGain = audioCtx.createGain();
      masterGain.connect(audioCtx.destination);
      applyMasterGain();
    }
    return true;
  }

  async function unlockAudio() {
    if (!ensureContext()) return;
    gestureUnlocked = true;
    if (audioCtx.state === "suspended") {
      try {
        await audioCtx.resume();
      } catch {
        /* ignore */
      }
    }
    if (pendingResume) {
      pendingResume = false;
      await resumeActiveLayers();
    }
  }

  function applyMasterGain() {
    if (!masterGain || !audioCtx) return;
    masterGain.gain.setTargetAtTime(masterVol, audioCtx.currentTime, FADE_SEC);
  }

  function effectiveGain(layerId) {
    const s = state[layerId];
    return s.on ? s.vol * masterVol : 0;
  }

  function rampLayerGain(layerId) {
    const s = state[layerId];
    if (!s.gain || !audioCtx) return;
    s.gain.gain.setTargetAtTime(effectiveGain(layerId), audioCtx.currentTime, FADE_SEC);
  }

  async function loadBuffer(layerId) {
    const layer = LAYERS.find((l) => l.id === layerId);
    const s = state[layerId];
    if (!layer || s.buffer) return;
    if (s.loading) {
      await s.loading;
      return;
    }
    s.loading = (async () => {
      const url = pickUrl(layer);
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Failed to load ${url}`);
      const data = await res.arrayBuffer();
      s.buffer = await audioCtx.decodeAudioData(data);
    })();
    try {
      await s.loading;
    } finally {
      s.loading = null;
    }
  }

  function stopLayer(layerId) {
    const s = state[layerId];
    if (!s.source) return;
    try {
      s.source.stop();
    } catch {
      /* already stopped */
    }
    s.source.disconnect();
    s.gain?.disconnect();
    s.source = null;
    s.gain = null;
  }

  function startLayer(layerId) {
    const s = state[layerId];
    if (!s.buffer || s.source) return;
    const source = audioCtx.createBufferSource();
    source.buffer = s.buffer;
    source.loop = true;
    const gain = audioCtx.createGain();
    gain.gain.value = 0;
    source.connect(gain);
    gain.connect(masterGain);
    source.start(0);
    s.source = source;
    s.gain = gain;
    rampLayerGain(layerId);
  }

  async function enableLayer(layerId) {
    if (!ensureContext()) return;
    await unlockAudio();
    const s = state[layerId];
    if (!s.on) return;
    try {
      await loadBuffer(layerId);
      startLayer(layerId);
    } catch {
      s.on = false;
      syncChip(layerId);
      syncRow(layerId);
      savePrefs();
    }
  }

  async function resumeActiveLayers() {
    if (!gestureUnlocked || !ensureContext()) return;
    for (const layer of LAYERS) {
      if (state[layer.id].on) await enableLayer(layer.id);
    }
  }

  function anyLayerOn() {
    return LAYERS.some((layer) => state[layer.id].on);
  }

  function syncChip(layerId) {
    const s = state[layerId];
    if (!s.chip) return;
    s.chip.classList.toggle("active", s.on);
    s.chip.setAttribute("aria-pressed", s.on ? "true" : "false");
  }

  function syncRow(layerId) {
    const s = state[layerId];
    if (!s.row) return;
    s.row.hidden = !s.on;
    if (s.range) s.range.value = String(Math.round(s.vol * 100));
  }

  function syncMaster() {
    if (masterRange) masterRange.value = String(Math.round(masterVol * 100));
  }

  async function setLayerOn(layerId, on) {
    const s = state[layerId];
    s.on = !!on;
    syncChip(layerId);
    syncRow(layerId);
    savePrefs();
    if (s.on) await enableLayer(layerId);
    else stopLayer(layerId);
  }

  function setLayerVol(layerId, vol) {
    const s = state[layerId];
    s.vol = clamp(vol, 0, 1);
    if (s.range) s.range.value = String(Math.round(s.vol * 100));
    rampLayerGain(layerId);
    savePrefs();
  }

  function setMaster(vol) {
    masterVol = clamp(vol, 0, 1);
    applyMasterGain();
    LAYERS.forEach((layer) => rampLayerGain(layer.id));
    syncMaster();
    savePrefs();
  }

  function buildLayerRow(layer) {
    const row = document.createElement("div");
    row.className = "ambience-layer-row";
    row.hidden = true;

    const label = document.createElement("span");
    label.className = "ambience-row-label";
    label.textContent = layer.label;

    const range = document.createElement("input");
    range.type = "range";
    range.className = "ambience-range";
    range.min = "0";
    range.max = "100";
    range.step = "1";
    range.setAttribute("aria-label", `${layer.label} volume`);
    range.addEventListener("input", () => {
      setLayerVol(layer.id, Number(range.value) / 100);
    });

    row.append(label, range);
    state[layer.id].row = row;
    state[layer.id].range = range;
    return row;
  }

  function buildUI(root) {
    root.className = "menu-ambience";
    root.setAttribute("aria-label", "Ambience");

    const heading = document.createElement("span");
    heading.className = "menu-themes-label";
    heading.textContent = "Ambience";

    const chipsEl = document.createElement("div");
    chipsEl.className = "appearance-chips ambience-chips";
    chipsEl.setAttribute("role", "group");
    chipsEl.setAttribute("aria-label", "Ambience layers");

    LAYERS.forEach((layer) => {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "appearance-chip ambience-chip";
      chip.textContent = layer.label;
      chip.dataset.layer = layer.id;
      chip.setAttribute("aria-pressed", "false");
      chip.addEventListener("click", async () => {
        await unlockAudio();
        await setLayerOn(layer.id, !state[layer.id].on);
      });
      state[layer.id].chip = chip;
      chipsEl.appendChild(chip);
    });

    const masterRow = document.createElement("div");
    masterRow.className = "ambience-master-row";

    const masterLabel = document.createElement("span");
    masterLabel.className = "ambience-row-label";
    masterLabel.textContent = "Master";

    masterRange = document.createElement("input");
    masterRange.type = "range";
    masterRange.className = "ambience-range";
    masterRange.min = "0";
    masterRange.max = "100";
    masterRange.step = "1";
    masterRange.setAttribute("aria-label", "Master ambience volume");
    masterRange.addEventListener("input", () => {
      setMaster(Number(masterRange.value) / 100);
    });
    masterRange.addEventListener("pointerdown", () => {
      unlockAudio();
    });

    masterRow.append(masterLabel, masterRange);

    const volsEl = document.createElement("div");
    volsEl.className = "ambience-layer-vols";
    LAYERS.forEach((layer) => volsEl.appendChild(buildLayerRow(layer)));

    root.append(heading, chipsEl, masterRow, volsEl);
  }

  function applyLoadedPrefs(prefs) {
    masterVol = prefs.master;
    LAYERS.forEach((layer) => {
      const s = state[layer.id];
      const saved = prefs.layers[layer.id];
      s.vol = saved.vol;
      s.on = saved.on;
      syncChip(layer.id);
      syncRow(layer.id);
    });
    syncMaster();
    pendingResume = anyLayerOn();
  }

  function onVisibilityChange() {
    if (!audioCtx) return;
    if (document.visibilityState === "hidden") {
      if (audioCtx.state === "running") audioCtx.suspend().catch(() => {});
    } else if (gestureUnlocked && anyLayerOn()) {
      audioCtx.resume().catch(() => {});
    }
  }

  function init(root) {
    if (initialized || !root) return;
    initialized = true;

    LAYERS.forEach((layer) => {
      state[layer.id] = {
        on: false,
        vol: layer.defaultVol,
        buffer: null,
        source: null,
        gain: null,
        loading: null,
        chip: null,
        row: null,
        range: null,
      };
    });

    buildUI(root);

    const prefs = loadPrefs();
    if (prefersReducedMotion() && !localStorage.getItem(STORAGE_KEY)) {
      prefs.master = 0.5;
    }
    applyLoadedPrefs(prefs);

    document.addEventListener("visibilitychange", onVisibilityChange);
    root.addEventListener("pointerdown", () => {
      if (pendingResume) unlockAudio();
    });
  }

  window.Ambience = { init, unlockAudio };
})();
