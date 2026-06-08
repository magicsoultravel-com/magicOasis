const Settings = (() => {
  const STORAGE_KEY = "appearance-colors";
  const LEGACY_KEY = "sudoku-colors";

  const PRESETS = [
    "#ffffff", "#000000", "#ef4444", "#f97316",
    "#eab308", "#22c55e", "#14b8a6", "#06b6d4",
    "#3b82f6", "#6366f1", "#8b5cf6", "#ec4899",
    "#78716c", "#64748b", "#1e293b", "#94a3b8",
  ];

  let allColors = {};
  let activeGameId = null;
  let activeFields = [];
  let panelContainer = null;
  let pickerDialog = null;
  let pickerBody = null;
  let pickerTitle = null;
  let activeField = null;
  let activePickerGameId = null;

  function getThemeColor(field) {
    return getComputedStyle(document.documentElement)
      .getPropertyValue(field.themeVar)
      .trim();
  }

  function getResolvedColor(gameId, field) {
    const custom = getColor(gameId, field.id);
    return custom || getThemeColor(field);
  }

  function migrateLegacy() {
    try {
      const legacy = localStorage.getItem(LEGACY_KEY);
      if (!legacy) return;
      const parsed = JSON.parse(legacy);
      if (parsed && typeof parsed === "object" && Object.keys(parsed).length) {
        if (!allColors.sudoku) allColors.sudoku = {};
        Object.assign(allColors.sudoku, parsed);
        save();
      }
      localStorage.removeItem(LEGACY_KEY);
    } catch {
      localStorage.removeItem(LEGACY_KEY);
    }
  }

  function load() {
    try {
      allColors = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    } catch {
      allColors = {};
    }
    migrateLegacy();
    if (activeGameId) applyForGame(activeGameId);
  }

  function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(allColors));
  }

  function gameColors(gameId) {
    if (!allColors[gameId]) allColors[gameId] = {};
    return allColors[gameId];
  }

  function allBoardVars() {
    const vars = new Set();
    const fromRegistry = window.Appearance?.getAllColorFields?.() || activeFields;
    fromRegistry.forEach(({ var: cssVar }) => vars.add(cssVar));
    return vars;
  }

  function applyForGame(gameId) {
    activeGameId = gameId;
    const fields = gameId
      ? window.Appearance?.getSectionFields?.(gameId) || activeFields
      : [];
    if (fields.length) setActiveFields(fields);

    allBoardVars().forEach((cssVar) => {
      document.documentElement.style.removeProperty(cssVar);
    });

    if (!gameId) return;
    const colors = gameColors(gameId);
    fields.forEach((field) => {
      const value = colors[field.id];
      if (value) {
        document.documentElement.style.setProperty(field.var, value);
      }
    });
  }

  function setActiveFields(fields) {
    activeFields = fields || [];
  }

  function setColor(gameId, id, value) {
    const map = gameColors(gameId);
    if (!value) delete map[id];
    else map[id] = value;
    if (!Object.keys(map).length) delete allColors[gameId];
    save();
    if (gameId === activeGameId) applyForGame(gameId);
    if (panelContainer) {
      const fields = window.Appearance?.getSectionFields?.(gameId) || activeFields;
      syncColorRowsForGame(panelContainer, gameId, fields);
    }
  }

  function getColor(gameId, id) {
    return gameColors(gameId)[id] || "";
  }

  function reset(gameId) {
    delete allColors[gameId];
    save();
    if (gameId === activeGameId) applyForGame(gameId);
    if (panelContainer && gameId) {
      const fields = window.Appearance?.getSectionFields?.(gameId) || activeFields;
      syncColorRowsForGame(panelContainer, gameId, fields);
    }
  }

  function updateCurrentSwatch(swatch, gameId, field) {
    const custom = getColor(gameId, field.id);
    const resolved = getResolvedColor(gameId, field);
    swatch.style.backgroundColor = resolved;
    swatch.classList.toggle("is-theme", !custom);
    swatch.title = custom ? custom : `Theme default (${resolved})`;
  }

  function updateThemeDefaultBtn(btn, field) {
    const themeColor = getThemeColor(field);
    btn.style.backgroundColor = themeColor;
    btn.title = `Theme default (${themeColor})`;
  }

  function buildPickerContent(gameId, field) {
    pickerBody.innerHTML = "";

    const grid = document.createElement("div");
    grid.className = "color-menu-grid";

    const defaultBtn = document.createElement("button");
    defaultBtn.type = "button";
    defaultBtn.className = "color-opt theme-default";
    defaultBtn.addEventListener("click", () => {
      setColor(gameId, field.id, "");
      pickerDialog.close();
    });
    updateThemeDefaultBtn(defaultBtn, field);
    grid.appendChild(defaultBtn);

    PRESETS.forEach((hex) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "color-opt";
      btn.style.backgroundColor = hex;
      btn.title = hex;
      btn.dataset.color = hex;
      btn.addEventListener("click", () => {
        setColor(gameId, field.id, hex);
        pickerDialog.close();
      });
      grid.appendChild(btn);
    });

    const pickerWrap = document.createElement("label");
    pickerWrap.className = "color-picker-label";
    pickerWrap.title = "Custom color";

    const picker = document.createElement("input");
    picker.type = "color";
    picker.className = "color-menu-picker";
    picker.value = getColor(gameId, field.id) || "#3b82f6";
    picker.addEventListener("input", () => {
      setColor(gameId, field.id, picker.value);
    });

    pickerWrap.appendChild(picker);
    pickerBody.append(grid, pickerWrap);

    const value = getColor(gameId, field.id);
    grid.querySelectorAll(".color-opt:not(.theme-default)").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.color === value);
    });
    defaultBtn.classList.toggle("active", !value);
  }

  function openPicker(gameId, field) {
    if (!pickerDialog) return;
    activeField = field;
    activePickerGameId = gameId;
    pickerTitle.textContent = field.label;
    buildPickerContent(gameId, field);
    pickerDialog.showModal();
  }

  function initPickerDialog(dialogEl, bodyEl, titleEl, closeBtn) {
    pickerDialog = dialogEl;
    pickerBody = bodyEl;
    pickerTitle = titleEl;
    closeBtn.addEventListener("click", () => pickerDialog.close());
    pickerDialog.addEventListener("click", (e) => {
      if (e.target === pickerDialog) pickerDialog.close();
    });
    pickerDialog.addEventListener("cancel", (e) => {
      e.preventDefault();
      pickerDialog.close();
    });
  }

  function buildColorRows(container, gameId, fields) {
    panelContainer = container;
    const wrap = document.createElement("div");
    wrap.className = "appearance-color-rows";
    wrap.dataset.game = gameId;

    fields.forEach((field) => {
      const item = document.createElement("div");
      item.className = "settings-item";
      item.dataset.field = field.id;
      item.dataset.game = gameId;
      item.dataset.themeVar = field.themeVar;
      item.dataset.cssVar = field.var;

      const head = document.createElement("div");
      head.className = "settings-item-head";

      const label = document.createElement("span");
      label.className = "settings-item-label";
      label.textContent = field.label;

      const current = document.createElement("button");
      current.type = "button";
      current.className = "color-current-swatch";
      current.setAttribute("aria-label", `Choose color for ${field.label}`);
      current.addEventListener("click", () => openPicker(gameId, field));

      head.append(label, current);
      item.append(head);
      wrap.appendChild(item);

      updateCurrentSwatch(current, gameId, field);
    });

    return wrap;
  }

  function syncColorRowsForGame(container, gameId, fields) {
    setActiveFields(fields);
    fields.forEach((field) => {
      const item = container.querySelector(
        `[data-game="${gameId}"][data-field="${field.id}"]`
      );
      if (!item) return;
      const swatch = item.querySelector(".color-current-swatch");
      if (swatch) updateCurrentSwatch(swatch, gameId, field);
    });
  }

  function onThemeChange() {
    if (panelContainer) {
      const section = panelContainer.querySelector(".appearance-game-section");
      if (section) {
        const gameId = section.dataset.game;
        const fields = window.Appearance?.getSectionFields?.(gameId) || activeFields;
        syncColorRowsForGame(panelContainer, gameId, fields);
      }
    }
    if (activeField && activePickerGameId && pickerDialog?.open) {
      buildPickerContent(activePickerGameId, activeField);
    }
  }

  function closeAllMenus() {
    if (pickerDialog?.open) pickerDialog.close();
  }

  return {
    load,
    reset,
    getColor,
    setColor,
    applyForGame,
    setActiveFields,
    buildColorRows,
    syncColorRowsForGame,
    closeAllMenus,
    onThemeChange,
    initPickerDialog,
  };
})();
