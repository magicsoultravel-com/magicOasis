const SolitaireCards = (() => {
  const W = 70;
  const H = 100;

  const SET_ORDER = ["classic", "vintage", "midnight"];

  const SETS = {
    classic: {
      label: "Classic",
      faceBg: "#fffef8",
      faceBorder: "#c4c0b8",
      faceInk: { red: "#c41e3a", black: "#1a1a1a" },
      back: "classic",
    },
    vintage: {
      label: "Vintage",
      faceBg: "#f3e9d2",
      faceBorder: "#8b6914",
      faceInk: { red: "#8b2500", black: "#2c1810" },
      back: "vintage",
    },
    midnight: {
      label: "Midnight",
      faceBg: "#1e293b",
      faceBorder: "#475569",
      faceInk: { red: "#fb7185", black: "#e2e8f0" },
      back: "midnight",
    },
  };

  const SUIT_SYM = {
    hearts: "♥",
    diamonds: "♦",
    clubs: "♣",
    spades: "♠",
  };

  const PIP_LAYOUTS = {
    1: [[50, 50]],
    2: [
      [50, 24],
      [50, 76, 1],
    ],
    3: [
      [50, 18],
      [50, 50],
      [50, 82, 1],
    ],
    4: [
      [30, 26],
      [70, 26],
      [30, 74, 1],
      [70, 74, 1],
    ],
    5: [
      [30, 24],
      [70, 24],
      [50, 50],
      [30, 76, 1],
      [70, 76, 1],
    ],
    6: [
      [30, 22],
      [70, 22],
      [30, 50],
      [70, 50],
      [30, 78, 1],
      [70, 78, 1],
    ],
    7: [
      [30, 18],
      [70, 18],
      [50, 34],
      [30, 50],
      [70, 50],
      [30, 82, 1],
      [70, 82, 1],
    ],
    8: [
      [30, 18],
      [70, 18],
      [30, 36],
      [70, 36],
      [30, 64, 1],
      [70, 64, 1],
      [30, 82, 1],
      [70, 82, 1],
    ],
    9: [
      [30, 20],
      [50, 20],
      [70, 20],
      [30, 50],
      [50, 50],
      [70, 50],
      [30, 80, 1],
      [50, 80, 1],
      [70, 80, 1],
    ],
    10: [
      [24, 18],
      [76, 18],
      [30, 32],
      [70, 32],
      [50, 50],
      [30, 68, 1],
      [70, 68, 1],
      [24, 82, 1],
      [76, 82, 1],
    ],
  };

  function svgNode(html) {
    const tpl = document.createElement("template");
    tpl.innerHTML = html.trim();
    return tpl.content.firstElementChild;
  }

  function ink(suit, set) {
    const palette = SETS[set]?.faceInk || SETS.classic.faceInk;
    return suit === "hearts" || suit === "diamonds" ? palette.red : palette.black;
  }

  function cornerLabel(rank) {
    return Solitaire.rankLabel(rank);
  }

  function pipMarkup(x, y, suit, color, flip) {
    const rot = flip ? ` rotate(180 ${x} ${y})` : "";
    return `<text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="middle" font-size="9" fill="${color}" transform="translate(0 1)${rot}">${SUIT_SYM[suit]}</text>`;
  }

  function facePips(rank, suit, set) {
    const color = ink(suit, set);
    const layout = PIP_LAYOUTS[rank];
    if (!layout) return "";
    return layout
      .map(([px, py, flip]) => {
        const x = (px / 100) * W;
        const y = (py / 100) * H;
        return pipMarkup(x, y, suit, color, !!flip);
      })
      .join("");
  }

  function faceCourt(rank, suit, set) {
    const color = ink(suit, set);
    const letter = rank === 11 ? "J" : rank === 12 ? "Q" : "K";
    return `
      <text x="35" y="46" text-anchor="middle" font-size="26" font-family="Georgia, 'Times New Roman', serif" font-weight="700" fill="${color}">${letter}</text>
      <text x="35" y="66" text-anchor="middle" font-size="16" fill="${color}">${SUIT_SYM[suit]}</text>
    `;
  }

  function corners(rank, suit, setId) {
    const color = ink(suit, setId);
    const label = cornerLabel(rank);
    const sym = SUIT_SYM[suit];
    return `
      <text x="9" y="15" font-size="11" font-weight="700" font-family="Georgia, serif" fill="${color}">${label}</text>
      <text x="9" y="25" font-size="10" fill="${color}">${sym}</text>
      <g transform="rotate(180 35 50)">
        <text x="9" y="15" font-size="11" font-weight="700" font-family="Georgia, serif" fill="${color}">${label}</text>
        <text x="9" y="25" font-size="10" fill="${color}">${sym}</text>
      </g>
    `;
  }

  function backPatternDef(id, kind) {
    if (kind === "vintage") {
      return `
        <pattern id="${id}" width="10" height="10" patternUnits="userSpaceOnUse">
          <rect width="10" height="10" fill="#5c1018"/>
          <circle cx="5" cy="5" r="1.2" fill="#9a3040" opacity="0.55"/>
        </pattern>
      `;
    }
    if (kind === "midnight") {
      return `
        <pattern id="${id}" width="12" height="12" patternUnits="userSpaceOnUse">
          <rect width="12" height="12" fill="#0f172a"/>
          <path d="M0 12L12 0M-3 3L3 -3M9 15L15 9" stroke="#1e3a5f" stroke-width="1"/>
          <circle cx="6" cy="6" r="0.8" fill="#334155"/>
        </pattern>
      `;
    }
    return `
      <pattern id="${id}" width="8" height="8" patternUnits="userSpaceOnUse">
        <rect width="8" height="8" fill="#1a3a6e"/>
        <path d="M0 8L8 0M-2 2L2 -2M6 10L10 6" stroke="#2f5f9e" stroke-width="0.9"/>
      </pattern>
    `;
  }

  function backFrameColor(kind) {
    if (kind === "vintage") return "#c9a45c";
    if (kind === "midnight") return "#64748b";
    return "#d4af37";
  }

  function renderBackSvg(setId, uid) {
    const set = SETS[setId] || SETS.classic;
    const pid = `sol-back-${set.back}-${uid}`;
    const frame = backFrameColor(set.back);
    const inner =
      set.back === "vintage"
        ? `<ellipse cx="35" cy="50" rx="16" ry="22" fill="none" stroke="${frame}" stroke-width="1.2" opacity="0.85"/>
           <text x="35" y="54" text-anchor="middle" font-size="14" font-family="Georgia, serif" fill="${frame}" opacity="0.9">✦</text>`
        : set.back === "midnight"
          ? `<circle cx="35" cy="50" r="14" fill="none" stroke="${frame}" stroke-width="1" opacity="0.7"/>
             <path d="M35 38l3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z" fill="${frame}" opacity="0.35"/>`
          : `<circle cx="35" cy="50" r="14" fill="none" stroke="${frame}" stroke-width="1.3"/>
             <circle cx="35" cy="50" r="6" fill="none" stroke="${frame}" stroke-width="0.8" opacity="0.8"/>`;

    return svgNode(`
      <svg class="sol-card-art" viewBox="0 0 ${W} ${H}" aria-hidden="true">
        <defs>${backPatternDef(pid, set.back)}</defs>
        <rect width="${W}" height="${H}" rx="5" fill="url(#${pid})" stroke="#0a1628" stroke-width="1"/>
        <rect x="5" y="7" width="60" height="86" rx="4" fill="none" stroke="${frame}" stroke-width="1.4"/>
        <rect x="8" y="10" width="54" height="80" rx="3" fill="none" stroke="${frame}" stroke-width="0.6" opacity="0.55"/>
        ${inner}
      </svg>
    `);
  }

  function renderFaceSvg(card, setId, uid) {
    const set = SETS[setId] || SETS.classic;
    const { rank, suit } = card;
    const center = rank >= 11 ? faceCourt(rank, suit, setId) : facePips(rank, suit, setId);

    return svgNode(`
      <svg class="sol-card-art" viewBox="0 0 ${W} ${H}" aria-hidden="true">
        <rect width="${W}" height="${H}" rx="5" fill="${set.faceBg}" stroke="${set.faceBorder}" stroke-width="1.2"/>
        <rect x="4" y="5" width="62" height="90" rx="3.5" fill="none" stroke="${set.faceBorder}" stroke-width="0.5" opacity="0.45"/>
        ${corners(rank, suit, setId)}
        ${center}
      </svg>
    `);
  }

  function mount(el, card, setId) {
    el.replaceChildren();
    el.classList.remove("sol-card--red", "sol-card--black");
    if (!card.faceUp) {
      el.classList.add("sol-card--back");
      el.appendChild(renderBackSvg(setId, String(card.id)));
    } else {
      el.classList.add("sol-card--face");
      el.appendChild(renderFaceSvg(card, setId, String(card.id)));
    }
  }

  function nextSet(current) {
    const idx = SET_ORDER.indexOf(current);
    const next = SET_ORDER[(idx + 1) % SET_ORDER.length];
    return next;
  }

  function setLabel(setId) {
    return SETS[setId]?.label || "Classic";
  }

  return {
    SET_ORDER,
    SETS,
    mount,
    renderBackSvg,
    renderFaceSvg,
    nextSet,
    setLabel,
  };
})();
