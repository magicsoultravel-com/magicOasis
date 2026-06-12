(() => {
  const ENABLED_KEY = "magic-quote-footer-enabled";

  const footerEl = document.getElementById("quote-footer");
  const textEl = document.getElementById("quote-footer-text");
  const authorEl = document.getElementById("quote-footer-author");
  const btnPrev = document.getElementById("quote-footer-prev");
  const btnNext = document.getElementById("quote-footer-next");
  const btnToggle = document.getElementById("btn-quote-footer");
  const appEl = document.querySelector(".app");

  let initialized = false;
  let enabled = true;

  function loadEnabled() {
    const stored = localStorage.getItem(ENABLED_KEY);
    return stored !== "0";
  }

  function saveEnabled(on) {
    try {
      localStorage.setItem(ENABLED_KEY, on ? "1" : "0");
    } catch {
      /* storage unavailable */
    }
  }

  function syncToggleButton() {
    if (!btnToggle) return;
    btnToggle.classList.toggle("active", enabled);
    btnToggle.setAttribute("aria-label", enabled ? "Quote footer on" : "Quote footer off");
    btnToggle.title = enabled ? "Quote footer on" : "Quote footer off";
  }

  function render() {
    if (!textEl || !authorEl) return;
    const quote = Quotes.getFooterQuote();
    textEl.textContent = `"${quote.text}"`;
    authorEl.textContent = quote.attribution;
  }

  function shouldShow() {
    if (!footerEl || !enabled) return false;
    if (!appEl || appEl.dataset.view !== "game") return false;
    if (appEl.dataset.game === "quotes") return false;
    return true;
  }

  function applyVisibility() {
    if (!footerEl) return;
    footerEl.hidden = !shouldShow();
  }

  async function setEnabled(on) {
    enabled = !!on;
    saveEnabled(enabled);
    syncToggleButton();
    applyVisibility();
    if (enabled) {
      await Quotes.init();
      render();
    }
  }

  function wireControls() {
    if (btnPrev?.dataset.ready) return;
    btnPrev?.addEventListener("click", () => {
      Quotes.footerPrev();
      render();
    });
    btnNext?.addEventListener("click", () => {
      Quotes.footerNext();
      render();
    });
    btnToggle?.addEventListener("click", () => {
      setEnabled(!enabled);
    });
    if (btnPrev) btnPrev.dataset.ready = "1";
  }

  async function init() {
    enabled = loadEnabled();
    syncToggleButton();
    wireControls();

    if (initialized) {
      applyVisibility();
      if (enabled && shouldShow()) {
        await Quotes.init();
        render();
      }
      return;
    }
    initialized = true;

    if (enabled) {
      await Quotes.init();
      render();
    }

    applyVisibility();
  }

  window.QuoteFooter = { init, applyVisibility, setEnabled };
})();
