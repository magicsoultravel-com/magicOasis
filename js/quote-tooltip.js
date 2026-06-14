(() => {
  const CATEGORY_LABELS = {
    uplifting: "Uplifting",
    cunning: "Cunning",
    funny: "Funny",
    strategic: "Strategic",
    philosophical: "Philosophical",
    scripture: "Scripture",
  };

  const HIDE_DELAY_MS = 80;
  const LONG_PRESS_MS = 450;
  const tipId = "quote-tooltip-bubble";

  let bubble = null;
  let activeAnchor = null;
  let hideTimer = null;
  let longPressTimer = null;
  let longPressActive = false;

  const bindings = new WeakMap();

  function ensureBubble() {
    if (bubble) return bubble;
    bubble = document.createElement("div");
    bubble.id = tipId;
    bubble.className = "quote-tooltip";
    bubble.setAttribute("role", "tooltip");
    bubble.hidden = true;
    document.body.appendChild(bubble);
    return bubble;
  }

  function clearHideTimer() {
    if (hideTimer) {
      clearTimeout(hideTimer);
      hideTimer = null;
    }
  }

  function clearLongPressTimer() {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      longPressTimer = null;
    }
  }

  function setAnchorDescribed(active) {
    if (!activeAnchor) return;
    if (active) {
      activeAnchor.setAttribute("aria-describedby", tipId);
    } else {
      activeAnchor.removeAttribute("aria-describedby");
    }
  }

  function hide() {
    clearHideTimer();
    clearLongPressTimer();
    longPressActive = false;
    if (!bubble || bubble.hidden) return;
    bubble.hidden = true;
    bubble.classList.remove("is-visible");
    setAnchorDescribed(false);
    activeAnchor = null;
    window.removeEventListener("scroll", onReposition, true);
    window.removeEventListener("resize", onReposition);
    document.removeEventListener("pointerdown", onOutsidePointer, true);
    document.removeEventListener("keydown", onKeydown);
  }

  function scheduleHide() {
    clearHideTimer();
    hideTimer = setTimeout(hide, HIDE_DELAY_MS);
  }

  function renderBubble(payload) {
    ensureBubble();
    bubble.innerHTML = "";

    const text = document.createElement("p");
    text.className = "quote-tooltip-text";
    text.textContent = `"${payload.text}"`;
    bubble.appendChild(text);

    if (payload.attribution) {
      const meta = document.createElement("p");
      meta.className = "quote-tooltip-meta";
      meta.textContent = payload.attribution;
      bubble.appendChild(meta);
    }

    if (payload.category) {
      const badge = document.createElement("span");
      badge.className = `quotes-badge quotes-badge--${payload.category}`;
      badge.textContent = CATEGORY_LABELS[payload.category] || payload.category;
      bubble.appendChild(badge);
    }
  }

  function positionBubble(anchor) {
    if (!bubble || !anchor) return;
    bubble.hidden = false;
    bubble.style.visibility = "hidden";
    bubble.classList.add("is-visible");

    const rect = anchor.getBoundingClientRect();
    const tipRect = bubble.getBoundingClientRect();
    const gap = 10;
    const inset = 8;
    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;

    let top = rect.top - tipRect.height - gap;
    let placement = "above";

    if (top < inset) {
      top = rect.bottom + gap;
      placement = "below";
    }

    if (placement === "below" && top + tipRect.height > viewportH - inset) {
      top = Math.max(inset, rect.top - tipRect.height - gap);
      placement = "above";
    }

    let left = rect.left + rect.width / 2 - tipRect.width / 2;
    left = Math.max(inset, Math.min(left, viewportW - tipRect.width - inset));

    bubble.style.top = `${Math.round(top)}px`;
    bubble.style.left = `${Math.round(left)}px`;
    bubble.dataset.placement = placement;

    const anchorCenter = rect.left + rect.width / 2;
    const caretLeft = Math.max(12, Math.min(anchorCenter - left, tipRect.width - 12));
    bubble.style.setProperty("--quote-tooltip-caret-left", `${Math.round(caretLeft)}px`);
    bubble.style.visibility = "";
  }

  function onReposition() {
    if (activeAnchor && bubble && !bubble.hidden) {
      positionBubble(activeAnchor);
    }
  }

  function onOutsidePointer(e) {
    if (!bubble || bubble.hidden) return;
    if (bubble.contains(e.target) || activeAnchor?.contains(e.target)) return;
    hide();
  }

  function onKeydown(e) {
    if (e.key === "Escape") hide();
  }

  function show(anchor, binding) {
    const payload = binding.getPayload();
    if (!payload?.text) return;

    clearHideTimer();
    activeAnchor = anchor;
    renderBubble(payload);
    positionBubble(anchor);
    setAnchorDescribed(true);

    window.addEventListener("scroll", onReposition, true);
    window.addEventListener("resize", onReposition);
    document.addEventListener("pointerdown", onOutsidePointer, true);
    document.addEventListener("keydown", onKeydown);
  }

  function attachHandlers(anchor, binding) {
    const onEnter = () => {
      if (longPressActive) return;
      show(anchor, binding);
    };

    const onLeave = () => {
      if (longPressActive) return;
      scheduleHide();
    };

    const onFocusIn = () => show(anchor, binding);
    const onFocusOut = (e) => {
      if (anchor.contains(e.relatedTarget)) return;
      scheduleHide();
    };

    const onPointerDown = (e) => {
      if (e.pointerType === "mouse") return;
      clearLongPressTimer();
      longPressTimer = setTimeout(() => {
        longPressActive = true;
        show(anchor, binding);
      }, LONG_PRESS_MS);
    };

    const onPointerUp = () => clearLongPressTimer();
    const onPointerCancel = () => clearLongPressTimer();
    const onPointerMove = (e) => {
      if (!longPressTimer || e.pointerType === "mouse") return;
      clearLongPressTimer();
    };

    anchor.addEventListener("pointerenter", onEnter);
    anchor.addEventListener("pointerleave", onLeave);
    anchor.addEventListener("focusin", onFocusIn);
    anchor.addEventListener("focusout", onFocusOut);
    anchor.addEventListener("pointerdown", onPointerDown);
    anchor.addEventListener("pointerup", onPointerUp);
    anchor.addEventListener("pointercancel", onPointerCancel);
    anchor.addEventListener("pointermove", onPointerMove);

    return {
      onEnter,
      onLeave,
      onFocusIn,
      onFocusOut,
      onPointerDown,
      onPointerUp,
      onPointerCancel,
      onPointerMove,
    };
  }

  function bind(anchor, getPayload) {
    if (!anchor || typeof getPayload !== "function") return;
    unbind(anchor);

    const binding = { getPayload };
    binding.handlers = attachHandlers(anchor, binding);
    bindings.set(anchor, binding);

    if (!anchor.hasAttribute("tabindex")) {
      anchor.tabIndex = 0;
    }
  }

  function unbind(anchor) {
    if (!anchor) return;
    const binding = bindings.get(anchor);
    if (!binding) return;

    const h = binding.handlers;
    anchor.removeEventListener("pointerenter", h.onEnter);
    anchor.removeEventListener("pointerleave", h.onLeave);
    anchor.removeEventListener("focusin", h.onFocusIn);
    anchor.removeEventListener("focusout", h.onFocusOut);
    anchor.removeEventListener("pointerdown", h.onPointerDown);
    anchor.removeEventListener("pointerup", h.onPointerUp);
    anchor.removeEventListener("pointercancel", h.onPointerCancel);
    anchor.removeEventListener("pointermove", h.onPointerMove);

    bindings.delete(anchor);
    if (activeAnchor === anchor) hide();
  }

  window.QuoteTooltip = { bind, unbind };
})();
