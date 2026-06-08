const Quotes = (() => {
  const DECK_KEY = "sudoku-quote-deck";

  let list = null;
  let authors = {};

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

  function circaFor(entry) {
    return entry.circa || authors[entry.author] || "date unknown";
  }

  function formatAttribution(entry) {
    return `${entry.author} · ${circaFor(entry)}`;
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
    list = dedupeQuotes(loadEntries(data));
  }

  function nextQuote() {
    if (!list || list.length === 0) {
      return {
        text: "The obstacle is the way.",
        author: "Marcus Aurelius",
        circa: "c. 121–180",
        attribution: "Marcus Aurelius · c. 121–180",
      };
    }

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

    const circa = circaFor(entry);
    return {
      text: entry.text,
      author: entry.author,
      category: entry.category || "uplifting",
      circa,
      attribution: formatAttribution(entry),
    };
  }

  return {
    init,
    nextQuote,
    get count() {
      return list ? list.length : 0;
    },
    get categories() {
      if (!list) return [];
      return [...new Set(list.map((q) => q.category))];
    },
  };
})();
