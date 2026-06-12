const Appearance = (() => {
  const THEMES = [
    { id: "slate", label: "Slate", swatch: "#1a2332" },
    { id: "light", label: "Light", swatch: "#f4f4f5" },
    { id: "ocean", label: "Ocean", swatch: "#e8f5f2" },
    { id: "dusk", label: "Dusk", swatch: "#1c1824" },
    { id: "oled", label: "OLED", swatch: "#09090b" },
  ];
  const DEFAULT_THEME = "slate";
  const THEME_KEY = "sudoku-theme";

  const sections = new Map();
  let panelContainer = null;
  let panelContext = { view: "hub", gameId: null };
  let onThemeChanged = null;

  function themeById(id) {
    return THEMES.find((t) => t.id === id) || THEMES[0];
  }

  function getTheme() {
    let saved = localStorage.getItem(THEME_KEY);
    if (saved === "dark") saved = "oled";
    return THEMES.some((t) => t.id === saved) ? saved : DEFAULT_THEME;
  }

  function setTheme(themeId) {
    const theme = themeById(themeId);
    document.documentElement.setAttribute("data-theme", theme.id);
    localStorage.setItem(THEME_KEY, theme.id);
    syncThemeChips(theme.id);
    Settings.onThemeChange();
    onThemeChanged?.();
  }

  function initTheme() {
    setTheme(getTheme());
  }

  function registerSection(gameId, def) {
    sections.set(gameId, def);
  }

  function getSection(gameId) {
    return sections.get(gameId);
  }

  function getSectionFields(gameId) {
    return sections.get(gameId)?.colors || [];
  }

  function getAllColorFields() {
    const fields = [];
    const seen = new Set();
    sections.forEach((def) => {
      def.colors?.forEach((field) => {
        if (!seen.has(field.var)) {
          seen.add(field.var);
          fields.push(field);
        }
      });
    });
    return fields;
  }

  function syncThemeChips(activeId) {
    document.querySelectorAll(".appearance-theme-chip").forEach((btn) => {
      const selected = btn.dataset.theme === activeId;
      btn.classList.toggle("active", selected);
      btn.setAttribute("aria-selected", selected ? "true" : "false");
    });
  }

  function buildThemeChips() {
    const chips = document.createElement("div");
    chips.className = "appearance-chips appearance-theme-chips";
    chips.setAttribute("role", "listbox");
    chips.setAttribute("aria-label", "Theme");

    const activeId = getTheme();
    THEMES.forEach((theme) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "appearance-chip appearance-theme-chip";
      btn.dataset.theme = theme.id;
      btn.setAttribute("role", "option");
      btn.title = theme.label;
      btn.innerHTML = `<span class="appearance-chip-swatch" style="background:${theme.swatch}"></span><span class="appearance-chip-label">${theme.label}</span>`;
      btn.classList.toggle("active", theme.id === activeId);
      btn.setAttribute("aria-selected", theme.id === activeId ? "true" : "false");
      btn.addEventListener("click", () => setTheme(theme.id));
      chips.appendChild(btn);
    });

    return chips;
  }

  function initMenuTheme(container) {
    if (!container || container.dataset.ready) return;
    const label = document.createElement("span");
    label.className = "menu-themes-label";
    label.textContent = "Theme";
    container.appendChild(label);
    container.appendChild(buildThemeChips());
    container.dataset.ready = "1";
  }

  function buildChoiceRow(gameId, choice) {
    const row = document.createElement("div");
    row.className = "appearance-choice-row";
    row.dataset.choice = choice.id;

    const label = document.createElement("span");
    label.className = "appearance-row-label";
    label.textContent = choice.label;
    row.appendChild(label);

    const chips = document.createElement("div");
    chips.className = "appearance-chips";
    const current = choice.get();

    choice.options.forEach((opt) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "appearance-chip";
      btn.dataset.value = opt.id;
      btn.textContent = opt.label;
      btn.classList.toggle("active", opt.id === current);
      btn.addEventListener("click", () => {
        choice.set(opt.id);
        chips.querySelectorAll(".appearance-chip").forEach((chip) => {
          chip.classList.toggle("active", chip.dataset.value === opt.id);
        });
        onThemeChanged?.();
      });
      chips.appendChild(btn);
    });

    row.appendChild(chips);
    return row;
  }

  function buildStepperRow(stepper) {
    const row = document.createElement("div");
    row.className = "appearance-stepper-row";
    row.dataset.stepper = stepper.id;

    const label = document.createElement("span");
    label.className = "appearance-row-label";
    label.textContent = stepper.label;
    row.appendChild(label);

    const controls = document.createElement("div");
    controls.className = "appearance-stepper";

    const btnDown = document.createElement("button");
    btnDown.type = "button";
    btnDown.className = "btn btn-icon appearance-stepper-btn";
    btnDown.setAttribute("aria-label", `Decrease ${stepper.label}`);
    btnDown.innerHTML =
      '<svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><path d="M3 6h6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>';

    const valueEl = document.createElement("span");
    valueEl.className = "appearance-stepper-value";

    const btnUp = document.createElement("button");
    btnUp.type = "button";
    btnUp.className = "btn btn-icon appearance-stepper-btn";
    btnUp.setAttribute("aria-label", `Increase ${stepper.label}`);
    btnUp.innerHTML =
      '<svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><path d="M6 3v6M3 6h6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>';

    function refresh() {
      const idx = stepper.getIndex();
      const min = stepper.min ?? 0;
      const max = stepper.max ?? stepper.getMax?.() ?? 0;
      valueEl.textContent = stepper.format?.(idx) ?? String(idx);
      btnDown.disabled = idx <= min;
      btnUp.disabled = idx >= max;
    }

    btnDown.addEventListener("click", () => {
      stepper.step(-1);
      refresh();
      onThemeChanged?.();
    });
    btnUp.addEventListener("click", () => {
      stepper.step(1);
      refresh();
      onThemeChanged?.();
    });

    controls.append(btnDown, valueEl, btnUp);
    row.appendChild(controls);
    refresh();
    return row;
  }

  function buildGameSection(gameId) {
    const def = sections.get(gameId);
    if (!def) return null;

    const section = document.createElement("section");
    section.className = "appearance-section appearance-game-section";
    section.dataset.game = gameId;

    if (def.label) {
      const heading = document.createElement("h3");
      heading.className = "appearance-section-label";
      heading.textContent = def.label;
      section.appendChild(heading);
    }

    if (def.colors?.length) {
      Settings.setActiveFields(def.colors);
      section.appendChild(Settings.buildColorRows(panelContainer, gameId, def.colors));
    }

    def.choices?.forEach((choice) => {
      section.appendChild(buildChoiceRow(gameId, choice));
    });

    def.steppers?.forEach((stepper) => {
      section.appendChild(buildStepperRow(stepper));
    });

    return section;
  }

  function buildFooter() {
    const footer = document.createElement("div");
    footer.className = "appearance-footer";

    const resetBtn = document.createElement("button");
    resetBtn.type = "button";
    resetBtn.className = "btn btn-icon appearance-reset-btn";
    resetBtn.setAttribute("aria-label", "Reset appearance defaults");
    resetBtn.title = "Reset to defaults";
    resetBtn.innerHTML =
      '<svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true"><path d="M13 4.5V2.5h-2M3 11.5v2h2" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/><path d="M4 6.5a5 5 0 0 1 8.2-1.8L13 4.5M12 9.5a5 5 0 0 1-8.2 1.8L3 11.5" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    resetBtn.addEventListener("click", () => {
      resetScope(panelContext);
    });

    footer.appendChild(resetBtn);
    return footer;
  }

  function resetScope(context) {
    if (context.view === "hub") {
      setTheme(DEFAULT_THEME);
      const hubDef = sections.get("hub");
      hubDef?.choices?.forEach((choice) => {
        if (choice.defaultValue != null) choice.set(choice.defaultValue);
      });
      buildPanel(panelContainer, context);
      return;
    }

    const gameId = context.gameId;
    if (!gameId) return;

    Settings.reset(gameId);

    const def = sections.get(gameId);
    def?.choices?.forEach((choice) => {
      if (choice.defaultValue != null) choice.set(choice.defaultValue);
    });
    def?.steppers?.forEach((stepper) => {
      if (stepper.defaultIndex != null) stepper.setIndex(stepper.defaultIndex);
    });

    buildPanel(panelContainer, context);
    onThemeChanged?.();
  }

  function buildPanel(container, context = { view: "hub", gameId: null }) {
    panelContainer = container;
    panelContext = context;
    container.innerHTML = "";

    if (context.view === "hub") {
      const hubSection = buildGameSection("hub");
      if (hubSection) container.insertBefore(hubSection, container.firstChild);
    }

    if (context.view === "game" && context.gameId) {
      const gameSection = buildGameSection(context.gameId);
      if (gameSection) container.appendChild(gameSection);
      Settings.applyForGame(context.gameId);
    }

    container.appendChild(buildFooter());
  }

  function syncPanel(container, context) {
    if (context) panelContext = context;
    const gameId = panelContext.gameId;
    syncThemeChips(getTheme());
    if (gameId && panelContext.view === "game") {
      const fields = getSectionFields(gameId);
      Settings.syncColorRowsForGame(container, gameId, fields);
    }
  }

  function setOnThemeChanged(fn) {
    onThemeChanged = fn;
  }

  return {
    THEMES,
    DEFAULT_THEME,
    registerSection,
    getSection,
    getSectionFields,
    getAllColorFields,
    buildPanel,
    syncPanel,
    resetScope,
    setTheme,
    getTheme,
    initTheme,
    initMenuTheme,
    setOnThemeChanged,
  };
})();
