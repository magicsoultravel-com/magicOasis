const StorageSanitize = (() => {
  function remove(key) {
    try {
      localStorage.removeItem(key);
    } catch {
      /* storage unavailable */
    }
  }

  function getString(key, allowed, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (raw == null) return fallback;
      if (allowed.includes(raw)) return raw;
      remove(key);
      return fallback;
    } catch {
      return fallback;
    }
  }

  function getJson(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return fallback;
      return JSON.parse(raw);
    } catch {
      remove(key);
      return fallback;
    }
  }

  return {
    getString,
    getJson,
    remove,
  };
})();
