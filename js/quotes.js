const Quotes = (() => {
  const DECK_KEY = "sudoku-quote-deck";
  const FOOTER_DECK_KEY = "magic-quote-footer-deck";

  let list = null;
  let authors = {};
  let authorsMeta = {};
  let enriched = null;

  function normalizeText(text) {
    return text.toLowerCase().replace(/\s+/g, " ").trim();
  }

  function dedupeQuotes(entries) {
    const seen = new Set();
    const out = [];
    for (const entry of entries) {
      const key = normalizeText(entry.text);
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(entry);
    }
    return out;
  }

  function parseYearToken(token) {
    let t = token.trim().toLowerCase();
    if (!t) return null;
    const bc = t.includes("bc");
    t = t.replace(/\s*(bc|ad)\s*$/i, "").trim();
    t = t.replace(/^c\.?\s*/, "");
    const century = t.match(/^(\d+)(?:st|nd|rd|th)?\s+century$/);
    if (century) {
      const year = (parseInt(century[1], 10) - 1) * 100 + 50;
      return bc ? -year : year;
    }
    if (!/^\d+$/.test(t)) return null;
    const year = parseInt(t, 10);
    return bc ? -year : year;
  }

  function parseLifespan(lifespan) {
    const raw = (lifespan || "").trim();
    if (!raw || raw === "origin unknown" || raw === "date unknown") {
      return { lifespan: raw, birth: null, death: null, mid: null };
    }
    if (/contemporary/i.test(raw)) {
      return { lifespan: raw, birth: null, death: null, mid: null };
    }

    let cleaned = raw.replace(/^c\.?\s*/i, "").trim();
    const birthOnly = cleaned.match(/^b\.?\s*(\d+)\s*(bc|ad)?$/i);
    if (birthOnly) {
      const birth = parseYearToken(`${birthOnly[1]} ${birthOnly[2] || ""}`.trim());
      return { lifespan: raw, birth, death: null, mid: birth };
    }

    const centuryOnly = cleaned.match(/^(\d+)(?:st|nd|rd|th)?\s+century\s*(bc|ad)?$/i);
    if (centuryOnly) {
      const mid = parseYearToken(`${centuryOnly[1]}th century ${centuryOnly[2] || ""}`.trim());
      return { lifespan: raw, birth: null, death: null, mid };
    }

    let rangeSuffix = "";
    const rangeMatch = cleaned.match(/\s*(bc|ad)\s*$/i);
    if (rangeMatch) {
      rangeSuffix = ` ${rangeMatch[1]}`;
      cleaned = cleaned.slice(0, rangeMatch.index).trim();
    }

    const parts = cleaned.split(/[–—\-]/);
    if (parts.length === 2) {
      let left = parts[0].trim();
      let right = parts[1].trim();
      if (rangeSuffix && !/bc|ad/i.test(left)) left += rangeSuffix;
      if (rangeSuffix && !/bc|ad/i.test(right)) right += rangeSuffix;
      const birth = parseYearToken(left);
      const death = parseYearToken(right);
      if (birth != null && death != null) {
        return { lifespan: raw, birth, death, mid: Math.round((birth + death) / 2) };
      }
      if (birth != null) return { lifespan: raw, birth, death, mid: birth };
      if (death != null) return { lifespan: raw, birth, death, mid: death };
    }

    const single = parseYearToken(cleaned);
    if (single != null) return { lifespan: raw, birth: single, death: null, mid: single };
    return { lifespan: raw, birth: null, death: null, mid: null };
  }

  function metaForAuthor(name) {
    if (authorsMeta[name]) return authorsMeta[name];
    const lifespan = authors[name] || "";
    return parseLifespan(lifespan);
  }

  function circaFor(entry) {
    return entry.circa || authors[entry.author] || "date unknown";
  }

  function formatAttribution(entry) {
    return `${entry.author} · ${circaFor(entry)}`;
  }

  function enrichEntry(entry, index) {
    const meta = metaForAuthor(entry.author);
    const midYear = meta.mid ?? null;
    return {
      id: entry.id || `quote-${index}`,
      text: entry.text,
      author: entry.author,
      category: entry.category || "uplifting",
      circa: circaFor(entry),
      attribution: formatAttribution(entry),
      midYear,
      hasDate: midYear != null,
      birth: meta.birth ?? null,
      death: meta.death ?? null,
    };
  }

  function buildEnriched() {
    enriched = list.map((entry, i) => enrichEntry(entry, i));
    return enriched;
  }

  function shuffleOrder(length) {
    const order = Array.from({ length }, (_, i) => i);
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    return order;
  }

  function loadDeckState() {
    try {
      const raw = localStorage.getItem(DECK_KEY);
      if (!raw) return null;
      const state = JSON.parse(raw);
      if (!Array.isArray(state.order) || state.order.length !== list.length) return null;
      if (typeof state.pos !== "number" || state.pos < 0 || state.pos >= list.length) return null;
      return state;
    } catch {
      return null;
    }
  }

  function saveDeckState(state) {
    try {
      localStorage.setItem(DECK_KEY, JSON.stringify(state));
    } catch {
      /* storage unavailable */
    }
  }

  function fallbackQuote() {
    return {
      text: "The obstacle is the way.",
      author: "Marcus Aurelius",
      category: "uplifting",
      circa: "c. 121–180",
      attribution: "Marcus Aurelius · c. 121–180",
    };
  }

  function entryToQuote(entry) {
    const circa = circaFor(entry);
    return {
      text: entry.text,
      author: entry.author,
      category: entry.category || "uplifting",
      circa,
      attribution: formatAttribution(entry),
    };
  }

  function loadFooterDeckState() {
    try {
      const raw = localStorage.getItem(FOOTER_DECK_KEY);
      if (!raw) return null;
      const state = JSON.parse(raw);
      if (!Array.isArray(state.order) || state.order.length !== list.length) return null;
      if (typeof state.index !== "number" || state.index < 0 || state.index >= list.length) return null;
      return state;
    } catch {
      return null;
    }
  }

  function saveFooterDeckState(state) {
    try {
      localStorage.setItem(FOOTER_DECK_KEY, JSON.stringify(state));
    } catch {
      /* storage unavailable */
    }
  }

  function ensureFooterDeck() {
    if (!list || list.length === 0) return null;
    let state = loadFooterDeckState();
    if (!state) {
      state = { order: shuffleOrder(list.length), index: 0 };
      saveFooterDeckState(state);
    }
    return state;
  }

  function getFooterQuote() {
    if (!list || list.length === 0) return fallbackQuote();
    const state = ensureFooterDeck();
    return entryToQuote(list[state.order[state.index]]);
  }

  function footerNext() {
    if (!list || list.length === 0) return fallbackQuote();
    const state = ensureFooterDeck();
    state.index += 1;
    if (state.index >= list.length) {
      state.order = shuffleOrder(list.length);
      state.index = 0;
    }
    saveFooterDeckState(state);
    return entryToQuote(list[state.order[state.index]]);
  }

  function footerPrev() {
    if (!list || list.length === 0) return fallbackQuote();
    const state = ensureFooterDeck();
    state.index -= 1;
    if (state.index < 0) state.index = list.length - 1;
    saveFooterDeckState(state);
    return entryToQuote(list[state.order[state.index]]);
  }

  function loadEntries(data) {
    if (Array.isArray(data.quotes)) return data.quotes;
    const tagged = [];
    for (const category of data.categories || ["uplifting", "cunning", "funny", "strategic"]) {
      for (const entry of data[category] || []) {
        tagged.push({ ...entry, category: entry.category || category });
      }
    }
    return tagged;
  }

  async function init() {
    if (list) return;
    const res = await fetch("data/quotes.json");
    if (!res.ok) throw new Error("Failed to load quotes");
    const data = await res.json();
    authors = data.authors || {};
    authorsMeta = data.authorsMeta || {};
    list = dedupeQuotes(loadEntries(data));
    buildEnriched();
  }

  function nextQuote() {
    if (!list || list.length === 0) return fallbackQuote();

    let state = loadDeckState();
    if (!state) {
      state = { order: shuffleOrder(list.length), pos: 0 };
    }

    const entry = list[state.order[state.pos]];
    state.pos += 1;
    if (state.pos >= list.length) {
      saveDeckState({ order: shuffleOrder(list.length), pos: 0 });
    } else {
      saveDeckState(state);
    }

    return entryToQuote(entry);
  }

  function getAll() {
    if (!enriched) return [];
    return enriched.slice();
  }

  function getAuthors() {
    if (!enriched) return [];
    const byName = new Map();
    for (const q of enriched) {
      let row = byName.get(q.author);
      if (!row) {
        const meta = metaForAuthor(q.author);
        row = {
          name: q.author,
          lifespan: meta.lifespan || authors[q.author] || "date unknown",
          midYear: meta.mid ?? null,
          quoteCount: 0,
          categories: new Set(),
        };
        byName.set(q.author, row);
      }
      row.quoteCount += 1;
      row.categories.add(q.category);
    }
    return [...byName.values()]
      .map((row) => ({
        name: row.name,
        lifespan: row.lifespan,
        midYear: row.midYear,
        quoteCount: row.quoteCount,
        categories: [...row.categories].sort(),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  function getStats() {
    if (!enriched) {
      return { total: 0, byCategory: {}, authorCount: 0, datedCount: 0, undatedCount: 0 };
    }
    const byCategory = {};
    for (const q of enriched) {
      byCategory[q.category] = (byCategory[q.category] || 0) + 1;
    }
    const authorCount = new Set(enriched.map((q) => q.author)).size;
    const datedCount = enriched.filter((q) => q.hasDate).length;
    return {
      total: enriched.length,
      byCategory,
      authorCount,
      datedCount,
      undatedCount: enriched.length - datedCount,
    };
  }

  function filter({ category, author, search, yearMin, yearMax } = {}) {
    if (!enriched) return [];
    const q = (search || "").trim().toLowerCase();
    return enriched.filter((entry) => {
      if (category && category !== "all" && entry.category !== category) return false;
      if (author && entry.author !== author) return false;
      if (yearMin != null && (entry.midYear == null || entry.midYear < yearMin)) return false;
      if (yearMax != null && (entry.midYear == null || entry.midYear > yearMax)) return false;
      if (q) {
        const hay = `${entry.text} ${entry.author} ${entry.circa}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }

  function getTimelineBuckets() {
    if (!enriched) return [];
    const buckets = new Map();
    for (const q of enriched) {
      if (!q.hasDate) continue;
      const year = q.midYear;
      if (!buckets.has(year)) buckets.set(year, []);
      buckets.get(year).push(q);
    }
    return [...buckets.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([year, quotes]) => ({ year, quotes }));
  }

  function getById(id) {
    if (!enriched) return null;
    return enriched.find((q) => q.id === id) || null;
  }

  return {
    init,
    nextQuote,
    getAll,
    getAuthors,
    getStats,
    filter,
    getTimelineBuckets,
    getById,
    getFooterQuote,
    footerNext,
    footerPrev,
    get count() {
      return list ? list.length : 0;
    },
    get categories() {
      if (!list) return [];
      return [...new Set(list.map((q) => q.category))];
    },
  };
})();
