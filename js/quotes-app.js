(() => {
  const STATE_KEY = "quotes-browser-state";
  const CATEGORY_LABELS = {
    uplifting: "Uplifting",
    cunning: "Cunning",
    funny: "Funny",
    strategic: "Strategic",
    philosophical: "Philosophical",
    scripture: "Scripture",
  };

  const panel = document.getElementById("quotes-panel");
  const statsEl = document.getElementById("quotes-stats");
  const browsePane = document.getElementById("quotes-browse");
  const authorsPane = document.getElementById("quotes-authors");
  const searchEl = document.getElementById("quotes-menu-search");
  const searchWrapEl = document.getElementById("quotes-menu-search-wrap");
  const searchBtnEl = document.getElementById("btn-quotes-search");
  const chipsEl = document.getElementById("quotes-chips");
  const authorClearEl = document.getElementById("quotes-author-clear");
  const listEl = document.getElementById("quotes-list");
  const authorsListEl = document.getElementById("quotes-authors-list");
  const timelineTrackEl = document.getElementById("quotes-timeline-track");
  const timelineAxisEl = document.getElementById("quotes-timeline-axis");
  const timelineNoteEl = document.getElementById("quotes-timeline-note");
  const tabButtons = panel?.querySelectorAll("[data-quotes-tab]") ?? [];

  let initialized = false;
  let state = loadState();

  function loadState() {
    try {
      const raw = localStorage.getItem(STATE_KEY);
      if (!raw) return { tab: "browse", category: "all", author: null, search: "", highlightId: null };
      const parsed = JSON.parse(raw);
      let tab = parsed.tab || "browse";
      if (tab === "timeline") tab = "browse";
      return {
        tab,
        category: parsed.category || "all",
        author: parsed.author || null,
        search: parsed.search || "",
        highlightId: parsed.highlightId || null,
      };
    } catch {
      return { tab: "browse", category: "all", author: null, search: "", highlightId: null };
    }
  }

  function saveState() {
    try {
      localStorage.setItem(STATE_KEY, JSON.stringify(state));
    } catch {
      /* storage unavailable */
    }
  }

  function formatYear(year) {
    if (year == null) return "";
    if (year < 0) return `${Math.abs(year)} BC`;
    return `${year}`;
  }

  function truncate(text, max = 72) {
    if (text.length <= max) return text;
    return `${text.slice(0, max - 1)}…`;
  }

  function syncSearchUi() {
    const hasSearch = Boolean(state.search.trim());
    if (searchEl) searchEl.value = state.search;
    if (searchWrapEl && searchWrapEl.hidden && hasSearch) {
      searchWrapEl.hidden = false;
    }
    if (searchBtnEl) {
      searchBtnEl.classList.toggle("active", hasSearch || (searchWrapEl && !searchWrapEl.hidden));
      const expanded = searchWrapEl && !searchWrapEl.hidden;
      searchBtnEl.setAttribute("aria-expanded", expanded ? "true" : "false");
    }
  }

  function renderStats() {
    if (!statsEl) return;
    const s = Quotes.getStats();
    const cats = Quotes.categories.length;
    statsEl.textContent = `${s.total} quotes · ${cats} categories · ${s.authorCount} authors · ${s.datedCount} on timeline`;
  }

  function renderToolbar() {
    if (authorClearEl) {
      if (state.author) {
        authorClearEl.hidden = false;
        authorClearEl.textContent = `Clear: ${state.author}`;
      } else {
        authorClearEl.hidden = true;
      }
    }
  }

  function renderChips() {
    if (!chipsEl) return;
    chipsEl.innerHTML = "";
    const allBtn = document.createElement("button");
    allBtn.type = "button";
    allBtn.className = `btn quotes-category-chip${state.category === "all" ? " active" : ""}`;
    allBtn.textContent = "All";
    allBtn.addEventListener("click", () => {
      state.category = "all";
      state.author = null;
      state.highlightId = null;
      saveState();
      renderToolbar();
      renderChips();
      renderBrowseList();
      renderTimeline();
    });
    chipsEl.appendChild(allBtn);

    for (const cat of Quotes.categories) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = `btn quotes-category-chip${state.category === cat ? " active" : ""}`;
      btn.textContent = CATEGORY_LABELS[cat] || cat;
      btn.dataset.category = cat;
      btn.addEventListener("click", () => {
        state.category = cat;
        state.author = null;
        state.highlightId = null;
        saveState();
        renderToolbar();
        renderChips();
        renderBrowseList();
        renderTimeline();
      });
      chipsEl.appendChild(btn);
    }
  }

  function renderBrowseList() {
    if (!listEl) return;
    const items = Quotes.filter({
      category: state.category,
      author: state.author,
      search: state.search,
    });

    listEl.innerHTML = "";

    if (items.length === 0) {
      const empty = document.createElement("p");
      empty.className = "quotes-empty";
      empty.textContent = "No quotes match your filters.";
      listEl.appendChild(empty);
      return;
    }

    for (const q of items) {
      const article = document.createElement("article");
      article.className = "quotes-item";
      article.setAttribute("role", "listitem");
      if (state.highlightId === q.id) article.classList.add("is-highlighted");
      article.dataset.quoteId = q.id;

      const text = document.createElement("p");
      text.className = "quotes-item-text";
      text.textContent = `"${q.text}"`;
      article.appendChild(text);

      const meta = document.createElement("p");
      meta.className = "quotes-item-meta";
      meta.textContent = q.attribution;
      article.appendChild(meta);

      const badge = document.createElement("span");
      badge.className = `quotes-badge quotes-badge--${q.category}`;
      badge.textContent = CATEGORY_LABELS[q.category] || q.category;
      article.appendChild(badge);

      article.addEventListener("click", () => {
        state.highlightId = q.id;
        saveState();
        article.scrollIntoView({ block: "nearest", behavior: "smooth" });
        listEl.querySelectorAll(".quotes-item").forEach((el) => el.classList.remove("is-highlighted"));
        article.classList.add("is-highlighted");
        renderTimeline();
      });

      listEl.appendChild(article);
    }

    if (state.highlightId) {
      const target = listEl.querySelector(`[data-quote-id="${state.highlightId}"]`);
      target?.scrollIntoView({ block: "center", behavior: "smooth" });
    }
  }

  function renderAuthors() {
    if (!authorsListEl) return;
    authorsListEl.innerHTML = "";
    for (const author of Quotes.getAuthors()) {
      const row = document.createElement("button");
      row.type = "button";
      row.className = "quotes-author-row";
      row.setAttribute("role", "listitem");
      const name = document.createElement("span");
      name.className = "quotes-author-name";
      name.textContent = author.name;
      const meta = document.createElement("span");
      meta.className = "quotes-author-meta";
      meta.textContent = `${author.quoteCount} · ${author.lifespan}`;
      row.appendChild(name);
      row.appendChild(meta);
      row.addEventListener("click", () => {
        state.tab = "browse";
        state.author = author.name;
        state.category = "all";
        state.highlightId = null;
        saveState();
        switchTab("browse");
        syncSearchUi();
        renderToolbar();
        renderChips();
        renderBrowseList();
        renderTimeline();
      });
      authorsListEl.appendChild(row);
    }
  }

  function timelineQuotes() {
    let buckets = Quotes.getTimelineBuckets();
    if (state.highlightId) {
      const q = Quotes.getById(state.highlightId);
      if (!q || !q.hasDate) return [];
      return [{ year: q.midYear, quotes: [q] }];
    }
    if (state.author) {
      buckets = buckets
        .map((bucket) => ({
          year: bucket.year,
          quotes: bucket.quotes.filter((q) => q.author === state.author),
        }))
        .filter((bucket) => bucket.quotes.length > 0);
    }
    return buckets;
  }

  function renderTimeline() {
    if (!timelineTrackEl || !timelineAxisEl || !timelineNoteEl) return;
    const buckets = timelineQuotes();
    const stats = Quotes.getStats();
    timelineTrackEl.innerHTML = "";
    timelineAxisEl.innerHTML = "";

    if (buckets.length === 0) {
      if (state.highlightId) {
        const q = Quotes.getById(state.highlightId);
        timelineNoteEl.textContent = q && !q.hasDate
          ? "Selected quote has no known date for the timeline."
          : "No dated quotes match the current filter.";
      } else if (state.author) {
        timelineNoteEl.textContent = `No dated quotes for ${state.author}.`;
      } else {
        timelineNoteEl.textContent = "No dated quotes to plot.";
      }
      return;
    }

    const minYear = buckets[0].year;
    const maxYear = Math.max(buckets[buckets.length - 1].year, new Date().getFullYear());
    const range = maxYear - minYear || 1;

    const tickStep = range > 2000 ? 500 : range > 800 ? 200 : range > 300 ? 100 : 50;
    const firstTick = Math.ceil(minYear / tickStep) * tickStep;
    for (let year = firstTick; year <= maxYear; year += tickStep) {
      const label = document.createElement("span");
      label.className = "quotes-timeline-tick";
      label.style.left = `${((year - minYear) / range) * 100}%`;
      label.textContent = formatYear(year);
      timelineAxisEl.appendChild(label);
    }

    for (const bucket of buckets) {
      const { year, quotes: yearQuotes } = bucket;
      const baseLeft = ((year - minYear) / range) * 100;
      yearQuotes.forEach((q, index) => {
        const dot = document.createElement("button");
        dot.type = "button";
        dot.className = "quotes-timeline-dot";
        if (state.highlightId === q.id) dot.classList.add("is-active");
        dot.dataset.category = q.category;
        dot.setAttribute("aria-label", `${q.author}, ${formatYear(year)}: ${truncate(q.text, 60)}`);
        const jitter = (index % 3 - 1) * 0.15;
        const stack = Math.floor(index / 3) * 12;
        dot.style.left = `calc(${baseLeft}% + ${jitter}px)`;
        dot.style.bottom = `${8 + stack}px`;
        dot.addEventListener("click", () => {
          state.tab = "browse";
          state.highlightId = q.id;
          state.author = null;
          state.category = "all";
          state.search = "";
          saveState();
          switchTab("browse");
          syncSearchUi();
          renderToolbar();
          renderChips();
          renderBrowseList();
          renderTimeline();
        });

        QuoteTooltip.bind(dot, () => ({
          text: q.text,
          category: q.category,
          attribution: q.attribution,
        }));

        timelineTrackEl.appendChild(dot);
      });
    }

    const filterNote = state.author
      ? `Showing timeline for ${state.author}. `
      : state.highlightId
        ? "Showing selected quote on the timeline. "
        : "";

    timelineNoteEl.textContent =
      filterNote +
      (stats.undatedCount > 0
        ? `${stats.undatedCount} quote${stats.undatedCount === 1 ? "" : "s"} without a known date (not shown).`
        : "Tap a dot to jump to the quote in Browse.");
  }

  function switchTab(tab) {
    if (tab === "timeline") tab = "browse";
    state.tab = tab;
    saveState();
    tabButtons.forEach((btn) => {
      const active = btn.dataset.quotesTab === tab;
      btn.classList.toggle("active", active);
      btn.setAttribute("aria-selected", active ? "true" : "false");
    });
    if (browsePane) browsePane.hidden = tab !== "browse";
    if (authorsPane) authorsPane.hidden = tab !== "authors";
    if (tab === "authors") renderAuthors();
  }

  function toggleSearchField() {
    if (!searchWrapEl) return;
    if (!searchWrapEl.hidden) {
      searchWrapEl.hidden = true;
      syncSearchUi();
      return;
    }
    searchWrapEl.hidden = false;
    syncSearchUi();
    searchEl?.focus();
  }

  function bindControls() {
    tabButtons.forEach((btn) => {
      btn.addEventListener("click", () => switchTab(btn.dataset.quotesTab));
    });

    authorClearEl?.addEventListener("click", () => {
      state.author = null;
      state.highlightId = null;
      saveState();
      renderToolbar();
      renderBrowseList();
      renderTimeline();
    });

    searchEl?.addEventListener("input", () => {
      state.search = searchEl.value;
      saveState();
      syncSearchUi();
      renderBrowseList();
    });

    searchBtnEl?.addEventListener("click", () => {
      if (searchWrapEl && !searchWrapEl.hidden && state.search.trim()) {
        state.search = "";
        if (searchEl) searchEl.value = "";
        saveState();
        syncSearchUi();
        renderBrowseList();
        return;
      }
      if (searchWrapEl && !searchWrapEl.hidden && !state.search.trim()) {
        searchWrapEl.hidden = true;
        syncSearchUi();
        return;
      }
      toggleSearchField();
    });
  }

  function showLoadError() {
    if (statsEl) statsEl.textContent = "";
    if (listEl) {
      listEl.innerHTML = "";
      const empty = document.createElement("p");
      empty.className = "quotes-empty";
      empty.textContent = "Could not load quotes — check your connection.";
      listEl.appendChild(empty);
    }
  }

  async function init() {
    if (initialized || !panel) return;
    try {
      await Quotes.init();
    } catch {
      showLoadError();
      return;
    }
    initialized = true;
    syncSearchUi();
    renderStats();
    renderToolbar();
    renderChips();
    bindControls();
    switchTab(state.tab);
    renderBrowseList();
    renderTimeline();
  }

  function saveGame() {
    saveState();
  }

  window.QuotesApp = { init, saveGame };
})();
