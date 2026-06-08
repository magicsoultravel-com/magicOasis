const Settings = (() => {
  const STORAGE_KEY = "sudoku-colors";

  const PRESETS = [
    "#ffffff", "#000000", "#ef4444", "#f97316",
    "#eab308", "#22c55e", "#14b8a6", "#06b6d4",
    "#3b82f6", "#6366f1", "#8b5cf6", "#ec4899",
    "#78716c", "#64748b", "#1e293b", "#94a3b8",
  ];

  const FIELDS = [
    { id: "borderStrong", label: "Outer borders", var: "--board-border-strong", themeVar: "--border-strong" },
    { id: "border", label: "Grid lines", var: "--board-border", themeVar: "--border" },
    { id: "fontColor", label: "Numbers", var: "--board-font", themeVar: "--user" },
    { id: "highlightValue", label: "Selection tint", var: "--board-highlight-value", themeVar: "--highlight-value" },
    { id: "highlightPeer", label: "Blocked tint", var: "--board-highlight-peer", themeVar: "--highlight-peer" },
    { id: "catColor", label: "Companion cat", var: "--board-cat-color", themeVar: "--text" },
  ];

  let colors = {};
  let panelContainer = null;
  let pickerDialog = null;
  let pickerBody = null;
  let pickerTitle = null;
  let activeField = null;

  function getField(id) {
    return FIELDS.find((f) => f.id === id);
  }

  function getThemeColor(field) {
    return getComputedStyle(document.documentElement)
      .getPropertyValue(field.themeVar)
      .trim();
  }

  function getResolvedColor(field) {
    const custom = getColor(field.id);
    return custom || getThemeColor(field);
  }

  function load() {
    try {
      colors = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    } catch {
      colors = {};
    }
    apply();
  }

  function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(colors));
  }

  function apply() {
    FIELDS.forEach(({ id, var: cssVar }) => {
      const value = colors[id];
      if (value) {
        document.documentElement.style.setProperty(cssVar, value);
      } else {
        document.documentElement.style.removeProperty(cssVar);
      }
    });
  }

  function setColor(id, value) {
    if (!value) delete colors[id];
    else colors[id] = value;
    save();
    apply();
    if (panelContainer) syncPanel(panelContainer);
  }

  function getColor(id) {
    return colors[id] || "";
  }

  function reset() {
    colors = {};
    localStorage.removeItem(STORAGE_KEY);
    apply();
    if (panelContainer) syncPanel(panelContainer);
  }

  function updateCurrentSwatch(swatch, field) {
    const custom = getColor(field.id);
    const resolved = getResolvedColor(field);
    swatch.style.backgroundColor = resolved;
    swatch.classList.toggle("is-theme", !custom);
    swatch.title = custom ? custom : `Theme default (${resolved})`;
  }

  function updateThemeDefaultBtn(btn, field) {
    const themeColor = getThemeColor(field);
    btn.style.backgroundColor = themeColor;
    btn.title = `Theme default (${themeColor})`;
  }

  function buildPickerContent(field) {
    pickerBody.innerHTML = "";

    const grid = document.createElement("div");
    grid.className = "color-menu-grid";

    const defaultBtn = document.createElement("button");
    defaultBtn.type = "button";
    defaultBtn.className = "color-opt theme-default";
    defaultBtn.addEventListener("click", () => {
      setColor(field.id, "");
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
        setColor(field.id, hex);
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
    picker.value = getColor(field.id) || "#3b82f6";
    picker.addEventListener("input", () => {
      setColor(field.id, picker.value);
    });

    pickerWrap.appendChild(picker);
    pickerBody.append(grid, pickerWrap);

    const value = getColor(field.id);
    grid.querySelectorAll(".color-opt:not(.theme-default)").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.color === value);
    });
    defaultBtn.classList.toggle("active", !value);
  }

  function openPicker(field) {
    if (!pickerDialog) return;
    activeField = field;
    pickerTitle.textContent = field.label;
    buildPickerContent(field);
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

  function buildPanel(container) {
    panelContainer = container;
    container.innerHTML = "";

    FIELDS.forEach((field) => {
      const item = document.createElement("div");
      item.className = "settings-item";
      item.dataset.field = field.id;

      const head = document.createElement("div");
      head.className = "settings-item-head";

      const label = document.createElement("span");
      label.className = "settings-item-label";
      label.textContent = field.label;

      const current = document.createElement("span");
      current.className = "color-current-swatch";
      current.title = "Current color";

      const toggle = document.createElement("button");
      toggle.type = "button";
      toggle.className = "btn btn-icon color-toggle";
      toggle.setAttribute("aria-label", `Choose color for ${field.label}`);
      toggle.innerHTML =
        '<svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><path d="M4 2.5h4v1H4zm0 3h4v1H4zm0 3h4v1H4z" fill="currentColor"/></svg>';

      toggle.addEventListener("click", (e) => {
        e.stopPropagation();
        openPicker(field);
      });

      head.append(label, current, toggle);
      item.append(head);
      container.appendChild(item);

      updateCurrentSwatch(current, field);
    });

    const resetBtn = document.createElement("button");
    resetBtn.type = "button";
    resetBtn.className = "btn btn-reset";
    resetBtn.textContent = "Reset to theme defaults";
    resetBtn.addEventListener("click", () => {
      document.dispatchEvent(new CustomEvent("sudoku:reset-appearance"));
    });
    container.appendChild(resetBtn);
  }

  function syncPanel(container) {
    FIELDS.forEach((field) => {
      const item = container.querySelector(`[data-field="${field.id}"]`);
      if (!item) return;
      const swatch = item.querySelector(".color-current-swatch");
      updateCurrentSwatch(swatch, field);
    });
    if (activeField && pickerDialog?.open) {
      buildPickerContent(activeField);
    }
  }

  function onThemeChange() {
    if (panelContainer) syncPanel(panelContainer);
  }

  function closeAllMenus() {
    if (pickerDialog?.open) pickerDialog.close();
  }

  return {
    load,
    reset,
    getColor,
    setColor,
    buildPanel,
    syncPanel,
    closeAllMenus,
    onThemeChange,
    initPickerDialog,
  };
})();
