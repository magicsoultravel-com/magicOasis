(() => {
  const STORAGE_KEY = "magic-ambience-v2";
  const STORAGE_KEY_V1 = "magic-ambience-v1";
  const DEFAULT_MASTER = 0.7;
  const FADE_SEC = 0.08;

  const CATEGORIES = [
    {
      id: "birds",
      label: "Birds",
      defaultVol: 0.55,
      defaultVariant: "dawn",
      variants: [{ id: "dawn", label: "Dawn" }],
    },
    {
      id: "water",
      label: "Water",
      defaultVol: 0.6,
      defaultVariant: "stream",
      variants: [
        { id: "stream", label: "Stream" },
        { id: "fountain", label: "Fountain" },
        { id: "beach", label: "Beach" },
        { id: "calm-coast", label: "Calm coast" },
        { id: "ocean", label: "Ocean" },
        { id: "storm", label: "Storm" },
      ],
    },
    {
      id: "wind",
      label: "Wind",
      defaultVol: 0.45,
      defaultVariant: "light",
      variants: [
        { id: "light", label: "Light" },
        { id: "moderate", label: "Moderate" },
        { id: "strong", label: "Strong" },
        { id: "gusts", label: "Gusts" },
      ],
    },
    {
      id: "forest",
      label: "Forest",
      defaultVol: 0.4,
      defaultVariant: "trees",
      variants: [{ id: "trees", label: "Trees" }],
    },
  ];

  const DEFAULT_VARIANTS = {
    birds: "dawn",
    water: "stream",
    wind: "light",
    forest: "trees",
  };

  let initialized = false;
  let gestureUnlocked = false;
  let pendingResume = false;

  let dialogEl = null;
  let bodyEl = null;
  let openBtn = null;
  let closeBtn = null;
  let statusEl = null;
  let masterRange = null;

  let audioCtx = null;
  let masterGain = null;
  let masterVol = DEFAULT_MASTER;

  const state = {};

  function categoryById(id) {
    return CATEGORIES.find((c) => c.id === id);
  }

  function defaultPrefs() {
    const layers = {};
    CATEGORIES.forEach((cat) => {
      layers[cat.id] = {
        on: false,
        vol: cat.defaultVol,
        variant: cat.defaultVariant,
      };
    });
    return { master: DEFAULT_MASTER, layers };
  }

  function migratePrefs() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        const base = defaultPrefs();
        if (typeof parsed.master === "number") base.master = clamp(parsed.master, 0, 1);
        CATEGORIES.forEach((cat) => {
          const saved = parsed.layers?.[cat.id];
          if (!saved) return;
          if (typeof saved.on === "boolean") base.layers[cat.id].on = saved.on;
          if (typeof saved.vol === "number") base.layers[cat.id].vol = clamp(saved.vol, 0, 1);
          const variantIds = cat.variants.map((v) => v.id);
          if (typeof saved.variant === "string" && variantIds.includes(saved.variant)) {
            base.layers[cat.id].variant = saved.variant;
          }
        });
        return base;
      }
    } catch {
      /* fall through */
    }

    try {
      const v1 = localStorage.getItem(STORAGE_KEY_V1);
      if (!v1) return defaultPrefs();
      const parsed = JSON.parse(v1);
      const base = defaultPrefs();
      if (typeof parsed.master === "number") base.master = clamp(parsed.master, 0, 1);
      CATEGORIES.forEach((cat) => {
        const saved = parsed.layers?.[cat.id];
        if (!saved) return;
        if (typeof saved.on === "boolean") base.layers[cat.id].on = saved.on;
        if (typeof saved.vol === "number") base.layers[cat.id].vol = clamp(saved.vol, 0, 1);
        base.layers[cat.id].variant = DEFAULT_VARIANTS[cat.id];
      });
      return base;
    } catch {
      return defaultPrefs();
    }
  }

  function savePrefs() {
    try {
      const layers = {};
      CATEGORIES.forEach((cat) => {
        const s = state[cat.id];
        layers[cat.id] = { on: s.on, vol: s.vol, variant: s.variant };
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

  function bufferKey(catId) {
    const s = state[catId];
    return `${catId}/${s.variant}`;
  }

  function audioUrls(catId, variant) {
    const base = `audio/ambience/${catId}/${variant}`;
    const probe = document.createElement("audio");
    if (probe.canPlayType('audio/ogg; codecs="vorbis"')) {
      return [`${base}.ogg`, `${base}.mp3`];
    }
    return [`${base}.mp3`, `${base}.ogg`];
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

  function effectiveGain(catId) {
    const s = state[catId];
    return s.on ? s.vol * masterVol : 0;
  }

  function rampGain(catId) {
    const s = state[catId];
    if (!s.gain || !audioCtx) return;
    s.gain.gain.setTargetAtTime(effectiveGain(catId), audioCtx.currentTime, FADE_SEC);
  }

  function setStatus(msg) {
    if (!statusEl) return;
    statusEl.textContent = msg || "";
    statusEl.hidden = !msg;
  }

  async function loadBuffer(catId) {
    const s = state[catId];
    const key = bufferKey(catId);
    if (s.buffers.has(key)) {
      s.activeKey = key;
      return;
    }
    if (s.loading) {
      await s.loading;
      return;
    }
    if (!ensureContext()) throw new Error("Audio not supported");

    s.loading = (async () => {
      let lastErr = null;
      for (const url of audioUrls(catId, s.variant)) {
        try {
          const res = await fetch(url);
          if (!res.ok) {
            lastErr = new Error(`${url} → ${res.status}`);
            continue;
          }
          const data = await res.arrayBuffer();
          const buffer = await audioCtx.decodeAudioData(data.slice(0));
          s.buffers.set(key, buffer);
          s.activeKey = key;
          return;
        } catch (err) {
          lastErr = err;
        }
      }
      throw lastErr || new Error(`Failed to load ${key}`);
    })();

    try {
      await s.loading;
    } finally {
      s.loading = null;
    }
  }

  function stopLayer(catId) {
    const s = state[catId];
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

  function startLayer(catId) {
    const s = state[catId];
    const key = bufferKey(catId);
    const buffer = s.buffers.get(key);
    if (!buffer || s.source) return;

    const source = audioCtx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    const gain = audioCtx.createGain();
    gain.gain.value = 0;
    source.connect(gain);
    gain.connect(masterGain);
    source.start(0);
    s.source = source;
    s.gain = gain;
    rampGain(catId);
  }

  async function enableLayer(catId) {
    if (!ensureContext()) return;
    await unlockAudio();
    const s = state[catId];
    if (!s.on) return;
    try {
      setStatus("");
      await loadBuffer(catId);
      startLayer(catId);
      syncOpenBtn();
    } catch {
      s.on = false;
      syncCategoryUI(catId);
      savePrefs();
      syncOpenBtn();
      setStatus("Could not load sound — use a local server (not file://).");
    }
  }

  async function resumeActiveLayers() {
    if (!gestureUnlocked || !ensureContext()) return;
    for (const cat of CATEGORIES) {
      if (state[cat.id].on) await enableLayer(cat.id);
    }
  }

  function anyLayerOn() {
    return CATEGORIES.some((cat) => state[cat.id].on);
  }

  function syncOpenBtn() {
    if (!openBtn) return;
    openBtn.classList.toggle("active", anyLayerOn());
    openBtn.setAttribute("aria-pressed", anyLayerOn() ? "true" : "false");
    openBtn.title = anyLayerOn() ? "Ambience on" : "Ambience";
  }

  function syncCategoryUI(catId) {
    const s = state[catId];
    if (s.toggle) {
      s.toggle.classList.toggle("active", s.on);
      s.toggle.setAttribute("aria-pressed", s.on ? "true" : "false");
    }
    if (s.volRow) s.volRow.hidden = !s.on;
    if (s.variantsEl) s.variantsEl.hidden = !s.on;
    if (s.volRange) s.volRange.value = String(Math.round(s.vol * 100));
    s.variantChips?.forEach((chip) => {
      chip.classList.toggle("active", chip.dataset.variant === s.variant);
      chip.setAttribute("aria-pressed", chip.dataset.variant === s.variant ? "true" : "false");
    });
  }

  function syncMaster() {
    if (masterRange) masterRange.value = String(Math.round(masterVol * 100));
  }

  async function setLayerOn(catId, on) {
    const s = state[catId];
    s.on = !!on;
    syncCategoryUI(catId);
    savePrefs();
    syncOpenBtn();
    if (s.on) await enableLayer(catId);
    else stopLayer(catId);
  }

  async function setVariant(catId, variantId) {
    const cat = categoryById(catId);
    const s = state[catId];
    if (!cat?.variants.some((v) => v.id === variantId) || s.variant === variantId) return;

    const wasOn = s.on;
    stopLayer(catId);
    s.variant = variantId;
    syncCategoryUI(catId);
    savePrefs();
    if (wasOn) await enableLayer(catId);
  }

  function setLayerVol(catId, vol) {
    const s = state[catId];
    s.vol = clamp(vol, 0, 1);
    if (s.volRange) s.volRange.value = String(Math.round(s.vol * 100));
    rampGain(catId);
    savePrefs();
  }

  function setMaster(vol) {
    masterVol = clamp(vol, 0, 1);
    applyMasterGain();
    CATEGORIES.forEach((cat) => rampGain(cat.id));
    syncMaster();
    savePrefs();
  }

  function buildVariantChips(cat) {
    const wrap = document.createElement("div");
    wrap.className = "appearance-chips ambience-variant-chips";
    wrap.hidden = true;
    wrap.setAttribute("role", "group");
    wrap.setAttribute("aria-label", `${cat.label} sound`);

    const chips = [];
    cat.variants.forEach((variant) => {
      if (cat.variants.length <= 1) return;
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "appearance-chip ambience-variant-chip";
      chip.textContent = variant.label;
      chip.dataset.variant = variant.id;
      chip.setAttribute("aria-pressed", "false");
      chip.addEventListener("click", async () => {
        await unlockAudio();
        await setVariant(cat.id, variant.id);
      });
      wrap.appendChild(chip);
      chips.push(chip);
    });

    if (cat.variants.length <= 1) wrap.hidden = true;
    state[cat.id].variantsEl = wrap;
    state[cat.id].variantChips = chips;
    return wrap;
  }

  function buildCategorySection(cat) {
    const section = document.createElement("section");
    section.className = "ambience-category";
    section.dataset.category = cat.id;

    const head = document.createElement("div");
    head.className = "ambience-category-head";

    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "appearance-chip ambience-toggle";
    toggle.textContent = cat.label;
    toggle.setAttribute("aria-pressed", "false");
    toggle.addEventListener("click", async () => {
      await unlockAudio();
      await setLayerOn(cat.id, !state[cat.id].on);
    });
    state[cat.id].toggle = toggle;
    head.appendChild(toggle);

    const volRow = document.createElement("div");
    volRow.className = "ambience-layer-row";
    volRow.hidden = true;

    const volLabel = document.createElement("span");
    volLabel.className = "ambience-row-label";
    volLabel.textContent = "Vol";

    const volRange = document.createElement("input");
    volRange.type = "range";
    volRange.className = "ambience-range";
    volRange.min = "0";
    volRange.max = "100";
    volRange.step = "1";
    volRange.setAttribute("aria-label", `${cat.label} volume`);
    volRange.addEventListener("input", () => {
      setLayerVol(cat.id, Number(volRange.value) / 100);
    });
    state[cat.id].volRange = volRange;
    state[cat.id].volRow = volRow;

    volRow.append(volLabel, volRange);
    section.append(head, buildVariantChips(cat), volRow);
    return section;
  }

  function buildDialogBody() {
    bodyEl.innerHTML = "";

    statusEl = document.createElement("p");
    statusEl.className = "ambience-status dialog-hint";
    statusEl.hidden = true;
    bodyEl.appendChild(statusEl);

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
    bodyEl.appendChild(masterRow);

    CATEGORIES.forEach((cat) => {
      bodyEl.appendChild(buildCategorySection(cat));
    });
  }

  function applyLoadedPrefs(prefs) {
    masterVol = prefs.master;
    CATEGORIES.forEach((cat) => {
      const s = state[cat.id];
      const saved = prefs.layers[cat.id];
      s.vol = saved.vol;
      s.on = saved.on;
      s.variant = saved.variant;
      syncCategoryUI(cat.id);
    });
    syncMaster();
    syncOpenBtn();
    pendingResume = anyLayerOn();
  }

  function openDialog() {
    if (!dialogEl) return;
    unlockAudio();
    if (!dialogEl.open) dialogEl.showModal();
  }

  function closeDialog() {
    if (dialogEl?.open) dialogEl.close();
  }

  function onVisibilityChange() {
    if (!audioCtx) return;
    if (document.visibilityState === "hidden") {
      if (audioCtx.state === "running") audioCtx.suspend().catch(() => {});
    } else if (gestureUnlocked && anyLayerOn()) {
      audioCtx.resume().catch(() => {});
    }
  }

  function init({ dialog, body, openButton, closeButton }) {
    if (initialized) return;
    initialized = true;

    dialogEl = dialog;
    bodyEl = body;
    openBtn = openButton;
    closeBtn = closeButton;

    CATEGORIES.forEach((cat) => {
      state[cat.id] = {
        on: false,
        vol: cat.defaultVol,
        variant: cat.defaultVariant,
        buffers: new Map(),
        activeKey: null,
        source: null,
        gain: null,
        loading: null,
        toggle: null,
        volRow: null,
        volRange: null,
        variantsEl: null,
        variantChips: [],
      };
    });

    buildDialogBody();

    const prefs = migratePrefs();
    if (prefersReducedMotion() && !localStorage.getItem(STORAGE_KEY) && !localStorage.getItem(STORAGE_KEY_V1)) {
      prefs.master = 0.5;
    }
    applyLoadedPrefs(prefs);

    openBtn?.addEventListener("click", () => {
      unlockAudio();
      openDialog();
    });

    closeBtn?.addEventListener("click", () => closeDialog());
    dialogEl?.addEventListener("click", (e) => {
      if (e.target === dialogEl) closeDialog();
    });
    dialogEl?.addEventListener("cancel", (e) => {
      e.preventDefault();
      closeDialog();
    });

    document.addEventListener("visibilitychange", onVisibilityChange);
    dialogEl?.addEventListener("pointerdown", () => {
      if (pendingResume) unlockAudio();
    });
  }

  window.Ambience = { init, unlockAudio, closeDialog };
})();
