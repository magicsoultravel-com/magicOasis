/**
 * Inline SVG playing cards — one art style per deck set.
 * magiCards can later replace renderers with external sprites via mount().
 */
const SolitaireCards = (() => {
  const W = 70;
  const H = 100;

  const SET_ORDER = ["classic", "vintage", "bavarian", "midnight"];

  const SETS = {
    classic: {
      label: "Classic",
      faceBg: "#fffef8",
      faceBorder: "#c4c0b8",
      faceInk: { red: "#c41e3a", black: "#1a1a1a" },
      accent: "#2563eb",
    },
    vintage: {
      label: "Vintage",
      faceBg: "#f3e9d2",
      faceBorder: "#8b6914",
      faceInk: { red: "#8b2500", black: "#2c1810" },
      accent: "#8b6914",
    },
    bavarian: {
      label: "Bavarian",
      faceBg: "#faf6ee",
      faceBorder: "#2d5a27",
      faceInk: { red: "#b91c1c", black: "#1f3d1a" },
      accent: "#c9a227",
    },
    midnight: {
      label: "Midnight",
      faceBg: "#1e293b",
      faceBorder: "#475569",
      faceInk: { red: "#fb7185", black: "#e2e8f0" },
      accent: "#60a5fa",
    },
  };

  const PIP_LAYOUTS = {
    1: [[50, 50]],
    2: [[50, 24], [50, 76, 1]],
    3: [[50, 18], [50, 50], [50, 82, 1]],
    4: [[30, 26], [70, 26], [30, 74, 1], [70, 74, 1]],
    5: [[30, 24], [70, 24], [50, 50], [30, 76, 1], [70, 76, 1]],
    6: [[30, 22], [70, 22], [30, 50], [70, 50], [30, 78, 1], [70, 78, 1]],
    7: [[30, 18], [70, 18], [50, 34], [30, 50], [70, 50], [30, 82, 1], [70, 82, 1]],
    8: [[30, 18], [70, 18], [30, 36], [70, 36], [30, 64, 1], [70, 64, 1], [30, 82, 1], [70, 82, 1]],
    9: [[30, 20], [50, 20], [70, 20], [30, 50], [50, 50], [70, 50], [30, 80, 1], [50, 80, 1], [70, 80, 1]],
    10: [[24, 18], [76, 18], [30, 32], [70, 32], [50, 50], [30, 68, 1], [70, 68, 1], [24, 82, 1], [76, 82, 1]],
  };

  function svgNode(html) {
    const tpl = document.createElement("template");
    tpl.innerHTML = html.trim();
    return tpl.content.firstElementChild;
  }

  function palette(setId) {
    return SETS[setId] || SETS.classic;
  }

  function ink(suit, setId) {
    const p = palette(setId).faceInk;
    return suit === "hearts" || suit === "diamonds" ? p.red : p.black;
  }

  function cornerLabel(rank) {
    return Solitaire.rankLabel(rank);
  }

  function iconTransform(cx, cy, size, flip) {
    const scale = size / 10;
    const rot = flip ? " rotate(180)" : "";
    return `translate(${cx} ${cy}) scale(${scale}) translate(-5 -5)${rot}`;
  }

  /* ── Classic (International French) ───────────────────────── */

  const classicSuits = {
    hearts: "M5 7.6C2.1 4.1.4 2.2.4.4.4 2.3 2 3.7 3.8 3.7c.9 0 1.7-.3 2.3-.85.6.55 1.4.85 2.3.85 1.8 0 3.4-1.4 3.4-3.3 0 1.8-1.6 3.7-4.4 7.3z",
    diamonds: "M5 .6L9.1 5 5 9.4.9 5Z",
    clubs: "M5 8.6V6.4M3.1 5.5a1.9 1.9 0 1 1 3.8 0 1.9 1.9 0 1 1-3.8 0zM5 3.8a1.9 1.9 0 1 1 0-3.8 1.9 1.9 0 0 1 0 3.8zM1.3 5.5a1.9 1.9 0 1 1 3.8 0 1.9 1.9 0 1 1-3.8 0zM8.7 5.5a1.9 1.9 0 1 1 3.8 0 1.9 1.9 0 1 1-3.8 0z",
    spades: "M5 .5C2 3.8.5 5.3.5 6.8a2.9 2.9 0 0 0 4.5 2.5A2.9 2.9 0 0 0 9.5 6.8c0-1.5-1.5-3-4.5-6.3zM3.4 9.2h3.2v1.6H3.4z",
  };

  function classicSuit(suit, cx, cy, size, color, flip) {
    const d = classicSuits[suit];
    return d ? `<path d="${d}" fill="${color}" transform="${iconTransform(cx, cy, size, flip)}"/>` : "";
  }

  function classicCourts(color, suit, rank) {
    const badge = classicSuit(suit, 0, 10, 7, color, false);
    if (rank === 11) {
      return `<g fill="none" stroke="${color}" stroke-width="0.9" stroke-linecap="round">
        <circle cx="0" cy="-5" r="5.5"/><path d="M-5.5-10 L-3-16 M5.5-10 L3-16"/>
        <path d="M-6 0 Q0 4 6 0 L5 14 Q0 18 -5 14Z" fill="${color}" fill-opacity="0.1"/>
        <path d="M-6 0 Q0 4 6 0 L5 14 Q0 18 -5 14Z"/></g><g transform="translate(0 8)">${badge}</g>`;
    }
    if (rank === 12) {
      return `<g fill="none" stroke="${color}" stroke-width="0.9" stroke-linecap="round">
        <path d="M-7-16 L-4-12 L0-15 L4-12 L7-16 L5-10 L-5-10Z" fill="${color}" fill-opacity="0.12"/>
        <path d="M-7-16 L-4-12 L0-15 L4-12 L7-16 L5-10 L-5-10Z"/>
        <circle cx="0" cy="-4" r="5.5"/><path d="M-7 1 Q0 6 7 1 L6 15 Q0 19 -6 15Z" fill="${color}" fill-opacity="0.1"/>
        <path d="M-7 1 Q0 6 7 1 L6 15 Q0 19 -6 15Z"/></g><g transform="translate(0 9)">${badge}</g>`;
    }
    return `<g fill="none" stroke="${color}" stroke-width="0.9" stroke-linecap="round">
      <path d="M-6-17 L-3-12 L0-16 L3-12 L6-17 L4-10 L-4-10Z" fill="${color}" fill-opacity="0.12"/>
      <path d="M-6-17 L-3-12 L0-16 L3-12 L6-17 L4-10 L-4-10Z"/><path d="M0-19 V-16"/>
      <circle cx="0" cy="-3" r="5.5"/><path d="M-4 1 L4 1 M-3 3 L3 3"/>
      <path d="M-3.5 4 Q0 9 3.5 4 L3 15 Q0 19 -3 15Z" fill="${color}" fill-opacity="0.1"/>
      <path d="M-3.5 4 Q0 9 3.5 4 L3 15 Q0 19 -3 15Z"/><path d="M6 2 L9 12 M-6 2 L-9 12"/></g><g transform="translate(0 9)">${badge}</g>`;
  }

  /* ── Vintage (Victorian engraved) ─────────────────────────── */

  function vintageSuit(suit, cx, cy, size, color, flip) {
    const inner = classicSuit(suit, cx, cy, size * 0.82, color, flip);
    const ring = `<circle cx="${cx}" cy="${cy}" r="${size * 0.52}" fill="none" stroke="${color}" stroke-width="0.35" opacity="0.45"/>`;
    return ring + inner;
  }

  function vintageCourts(color, suit, rank) {
    const badge = vintageSuit(suit, 0, 10, 7, color, false);
    const hatch = `stroke="${color}" stroke-width="0.35" opacity="0.25"`;
    if (rank === 11) {
      return `<g fill="none" stroke="${color}" stroke-width="0.85">
        <ellipse cx="0" cy="-4" rx="5" ry="6"/><path d="M-5-11 L-2-17 M5-11 L2-17"/>
        <path d="M-7 0 L-4 14 L4 14 L7 0" fill="${color}" fill-opacity="0.08"/>
        <path d="M-7 0 L-4 14 L4 14 L7 0"/>
        <line x1="-3" y1="2" x2="3" y2="2" ${hatch}/><line x1="-2" y1="6" x2="2" y2="6" ${hatch}/>
      </g><g transform="translate(0 8)">${badge}</g>`;
    }
    if (rank === 12) {
      return `<g fill="none" stroke="${color}" stroke-width="0.85">
        <path d="M-8-15 L-3-11 L0-14 L3-11 L8-15 L6-9 L-6-9Z" fill="${color}" fill-opacity="0.1"/>
        <path d="M-8-15 L-3-11 L0-14 L3-11 L8-15 L6-9 L-6-9Z"/>
        <ellipse cx="0" cy="-2" rx="5" ry="6"/><path d="M-6 2 Q0 8 6 2 L5 16 Q0 20 -5 16Z" fill="${color}" fill-opacity="0.08"/>
        <path d="M-6 2 Q0 8 6 2 L5 16 Q0 20 -5 16Z"/>
        <circle cx="-2" cy="6" r="0.8" fill="${color}"/><circle cx="2" cy="6" r="0.8" fill="${color}"/>
      </g><g transform="translate(0 9)">${badge}</g>`;
    }
    return `<g fill="none" stroke="${color}" stroke-width="0.85">
      <path d="M-7-16 L-3-11 L0-15 L3-11 L7-16 L5-9 L-5-9Z" fill="${color}" fill-opacity="0.1"/>
      <path d="M-7-16 L-3-11 L0-15 L3-11 L7-16 L5-9 L-5-9Z"/><path d="M0-18 V-15"/>
      <ellipse cx="0" cy="-1" rx="5.5" ry="6"/><path d="M-5 2 L5 2 M-4 4.5 L4 4.5 M-3 7 Q0 11 3 7"/>
      <path d="M-4 7 L-4 15 M4 7 L4 15"/><path d="M-7 1 L-10 13 M7 1 L10 13"/>
    </g><g transform="translate(0 9)">${badge}</g>`;
  }

  /* ── Bavarian (Bayerisches Bild — folk style, French suits) ─ */

  function bavarianSuit(suit, cx, cy, size, color, flip) {
    const gold = SETS.bavarian.accent;
    const t = iconTransform(cx, cy, size, flip);
    switch (suit) {
      case "hearts":
        return `<path d="M5 7.4C2.2 4 1 2.4 1 .8c0 1.8 1.4 3.2 3.2 3.2.8 0 1.5-.25 1.9-.7.4.45 1.1.7 1.9.7 1.8 0 3.2-1.4 3.2-3.2 0 1.6-1.2 3.2-3.8 6.4z" fill="${color}" transform="${t}"/>
          <path d="M5 2.2l.5 1h1l-.8.6.3 1L5 4l-.9.8.3-1-.8-.6h1z" fill="${gold}" opacity="0.85" transform="${t}"/>`;
      case "diamonds":
        return `<path d="M5 1.2C5 1.2 8.8 4.2 8.8 5.2 8.8 6.5 5 9.2 5 9.2S1.2 6.5 1.2 5.2 5 1.2 5 1.2z" fill="${color}" transform="${t}"/>
          <circle cx="5" cy="5.2" r="1.1" fill="${gold}" opacity="0.9" transform="${t}"/>`;
      case "clubs":
        return `<g transform="${t}"><path d="M5 8.5V6.3M3.2 5.4a1.8 1.8 0 1 1 3.6 0 1.8 1.8 0 1 1-3.6 0zM5 3.7a1.8 1.8 0 1 1 0-3.6 1.8 1.8 0 0 1 0 3.6zM1.4 5.4a1.8 1.8 0 1 1 3.6 0 1.8 1.8 0 1 1-3.6 0zM8.6 5.4a1.8 1.8 0 1 1 3.6 0 1.8 1.8 0 1 1-3.6 0z" fill="${color}"/>
          <path d="M3.5 9.2 Q5 8 6.5 9.2" fill="none" stroke="${SETS.bavarian.faceInk.black}" stroke-width="0.5" opacity="0.5"/></g>`;
      case "spades":
        return `<g transform="${t}"><path d="M5 .8C2.2 4 1 5.2 1 6.6a2.6 2.6 0 0 0 4 2.2 2.6 2.6 0 0 0 4-2.2c0-1.4-1.2-2.6-4-5.8z" fill="${color}"/>
          <path d="M3.6 9h2.8v1.4H3.6z" fill="${color}"/><ellipse cx="5" cy="1.8" rx="1.2" ry="1.5" fill="${gold}" opacity="0.75"/></g>`;
      default:
        return "";
    }
  }

  function bavarianCourts(color, suit, rank) {
    const gold = SETS.bavarian.accent;
    const green = SETS.bavarian.faceBorder;
    const badge = bavarianSuit(suit, 0, 10, 7.5, color, false);
    if (rank === 11) {
      return `<g fill="none" stroke="${green}" stroke-width="0.75" stroke-linecap="round">
        <path d="M-8-12 C-4-18 4-18 8-12 L6-8 C3-10 0-9 0-6" fill="${color}" fill-opacity="0.12"/>
        <path d="M-8-12 C-4-18 4-18 8-12 L5-7 L-5-7Z" fill="${gold}" fill-opacity="0.35"/>
        <circle cx="0" cy="-2" r="5" stroke="${color}" fill="${color}" fill-opacity="0.08"/>
        <path d="M-6 1 L-4 14 L4 14 L6 1 Q0 6 -6 1Z" fill="${color}" fill-opacity="0.1"/>
        <path d="M-6 1 L-4 14 L4 14 L6 1 Q0 6 -6 1Z" stroke="${color}"/>
        <path d="M-2 5 L2 5 M0 5 L0 9" stroke="${gold}" stroke-width="0.6"/>
      </g><g transform="translate(0 8)">${badge}</g>`;
    }
    if (rank === 12) {
      return `<g fill="none" stroke="${green}" stroke-width="0.75">
        <path d="M-9-14 L-4-10 L0-13 L4-10 L9-14 L7-8 L-7-8Z" fill="${gold}" fill-opacity="0.4"/>
        <path d="M-9-14 L-4-10 L0-13 L4-10 L9-14 L7-8 L-7-8Z"/>
        <circle cx="-4" cy="-12" r="1" fill="${gold}"/><circle cx="0" cy="-14" r="1.1" fill="${gold}"/><circle cx="4" cy="-12" r="1" fill="${gold}"/>
        <circle cx="0" cy="-2" r="5.5" stroke="${color}" fill="${color}" fill-opacity="0.08"/>
        <path d="M-7 2 Q0 9 7 2 L6 16 Q0 21 -6 16Z" fill="${color}" fill-opacity="0.1"/>
        <path d="M-7 2 Q0 9 7 2 L6 16 Q0 21 -6 16Z" stroke="${color}"/>
        <path d="M-3 7 L3 7" stroke="${gold}" stroke-width="0.7"/>
      </g><g transform="translate(0 9)">${badge}</g>`;
    }
    return `<g fill="none" stroke="${green}" stroke-width="0.75">
      <path d="M-8-15 L-3-10 L0-14 L3-10 L8-15 L6-8 L-6-8Z" fill="${gold}" fill-opacity="0.45"/>
      <path d="M-8-15 L-3-10 L0-14 L3-10 L8-15 L6-8 L-6-8Z"/>
      <path d="M0-17 V-14" stroke="${gold}" stroke-width="1"/>
      <circle cx="0" cy="-1" r="6" stroke="${color}" fill="${color}" fill-opacity="0.08"/>
      <path d="M-5 2 L5 2 M-4 4.5 L4 4.5"/>
      <path d="M-4 5 Q0 12 4 5 L3.5 16 Q0 20 -3.5 16Z" fill="${color}" fill-opacity="0.12"/>
      <path d="M-4 5 Q0 12 4 5 L3.5 16 Q0 20 -3.5 16Z" stroke="${color}"/>
      <path d="M7 0 L11 14 M-7 0 L-11 14" stroke="${color}" stroke-width="0.8"/>
      <path d="M-6 14 L6 14" stroke="${gold}" stroke-width="0.8"/>
    </g><g transform="translate(0 9)">${badge}</g>`;
  }

  /* ── Midnight (minimal neon) ──────────────────────────────── */

  function midnightSuit(suit, cx, cy, size, color, flip) {
    const glow = `<circle cx="${cx}" cy="${cy}" r="${size * 0.35}" fill="${color}" opacity="0.12"/>`;
    return glow + classicSuit(suit, cx, cy, size, color, flip);
  }

  function midnightCourts(color, suit, rank) {
    const badge = midnightSuit(suit, 0, 10, 7, color, false);
    const accent = SETS.midnight.accent;
    if (rank === 11) {
      return `<g fill="none" stroke="${accent}" stroke-width="0.8" opacity="0.9">
        <circle cx="0" cy="-5" r="5.5"/><path d="M-6 0 L6 0 L5 14 L-5 14Z" fill="${color}" fill-opacity="0.15"/>
        <path d="M-6 0 L6 0 L5 14 L-5 14Z"/></g><g transform="translate(0 8)">${badge}</g>`;
    }
    if (rank === 12) {
      return `<g fill="none" stroke="${accent}" stroke-width="0.8">
        <path d="M-6-14 L0-17 L6-14 L4-9 L-4-9Z" fill="${color}" fill-opacity="0.15"/>
        <path d="M-6-14 L0-17 L6-14 L4-9 L-4-9Z"/><circle cx="0" cy="-3" r="5.5"/>
        <path d="M-6 2 Q0 8 6 2 L5 15 L-5 15Z" fill="${color}" fill-opacity="0.12"/>
        <path d="M-6 2 Q0 8 6 2 L5 15 L-5 15Z"/></g><g transform="translate(0 9)">${badge}</g>`;
    }
    return `<g fill="none" stroke="${accent}" stroke-width="0.8">
      <path d="M-5-15 L0-18 L5-15 L3-9 L-3-9Z" fill="${color}" fill-opacity="0.15"/>
      <path d="M-5-15 L0-18 L5-15 L3-9 L-3-9Z"/><circle cx="0" cy="-2" r="5.5" stroke="${color}"/>
      <path d="M-3.5 4 Q0 10 3.5 4 L3 15 L-3 15Z" fill="${color}" fill-opacity="0.12"/>
      <path d="M-3.5 4 Q0 10 3.5 4 L3 15 L-3 15Z"/><path d="M-7 1 L-9 12 M7 1 L9 12" stroke="${color}"/></g><g transform="translate(0 9)">${badge}</g>`;
  }

  /* ── Art registry ─────────────────────────────────────────── */

  const ART = {
    classic: {
      suit: classicSuit,
      courts: classicCourts,
      cornerFont: "Georgia, 'Times New Roman', serif",
      frame: () => "",
      aceSize: 26,
      pipSize: 8,
    },
    vintage: {
      suit: vintageSuit,
      courts: vintageCourts,
      cornerFont: "'Palatino Linotype', Palatino, Georgia, serif",
      frame: (set) =>
        `<rect x="6" y="7" width="58" height="86" rx="3" fill="none" stroke="${set.faceBorder}" stroke-width="0.6" stroke-dasharray="2 1.5" opacity="0.5"/>`,
      aceSize: 24,
      pipSize: 7.5,
    },
    bavarian: {
      suit: bavarianSuit,
      courts: bavarianCourts,
      cornerFont: "Georgia, 'Times New Roman', serif",
      frame: (set) => `
        <rect x="5.5" y="6.5" width="59" height="87" rx="3" fill="none" stroke="${set.accent}" stroke-width="0.7"/>
        <path d="M8 9 Q12 7 16 9 M54 9 Q58 7 62 9 M8 91 Q12 93 16 91 M54 91 Q58 93 62 91" fill="none" stroke="${set.faceBorder}" stroke-width="0.55" opacity="0.7"/>
        <path d="M35 8 l1.2 2.4 2.6.4-1.9 1.8.45 2.6-2.35-1.2-2.35 1.2.45-2.6-1.9-1.8 2.6-.4z" fill="${set.accent}" opacity="0.55"/>`,
      aceSize: 27,
      pipSize: 8.5,
    },
    midnight: {
      suit: midnightSuit,
      courts: midnightCourts,
      cornerFont: "system-ui, sans-serif",
      frame: (set) =>
        `<rect x="7" y="8" width="56" height="84" rx="3" fill="none" stroke="${set.accent}" stroke-width="0.4" opacity="0.35"/>`,
      aceSize: 25,
      pipSize: 8,
    },
  };

  function artFor(setId) {
    return ART[setId] || ART.classic;
  }

  function suitIcon(setId, suit, cx, cy, size, color, flip = false) {
    return artFor(setId).suit(suit, cx, cy, size, color, flip);
  }

  function facePips(rank, suit, setId) {
    const color = ink(suit, setId);
    const layout = PIP_LAYOUTS[rank];
    const pipSize = artFor(setId).pipSize;
    if (!layout) return "";
    return layout
      .map(([px, py, flip]) => {
        const x = (px / 100) * W;
        const y = (py / 100) * H;
        return suitIcon(setId, suit, x, y, pipSize, color, !!flip);
      })
      .join("");
  }

  function faceAce(suit, setId) {
    const color = ink(suit, setId);
    const size = artFor(setId).aceSize;
    return suitIcon(setId, suit, 35, 50, size, color);
  }

  function faceCourt(rank, suit, setId) {
    const color = ink(suit, setId);
    const bust = artFor(setId).courts(color, suit, rank);
    return `
      <g transform="translate(35 40)">${bust}</g>
      <g transform="rotate(180 35 50) translate(35 40)">${bust}</g>
    `;
  }

  function faceCenter(rank, suit, setId) {
    if (rank === 1) return faceAce(suit, setId);
    if (rank >= 11) return faceCourt(rank, suit, setId);
    return facePips(rank, suit, setId);
  }

  function corners(rank, suit, setId) {
    const color = ink(suit, setId);
    const label = cornerLabel(rank);
    const font = artFor(setId).cornerFont;
    const block = `
      <text x="8" y="14" font-size="11" font-weight="700" font-family="${font}" fill="${color}">${label}</text>
      ${suitIcon(setId, suit, 8, 21, 6.5, color)}
    `;
    return `${block}<g transform="rotate(180 35 50)">${block}</g>`;
  }

  /* ── Card backs per set ───────────────────────────────────── */

  function renderBackSvg(setId, uid) {
    const set = palette(setId);
    const pid = `sol-back-${setId}-${uid}`;

    if (setId === "vintage") {
      return svgNode(`
        <svg class="sol-card-art" viewBox="0 0 ${W} ${H}" aria-hidden="true">
          <defs><pattern id="${pid}" width="10" height="10" patternUnits="userSpaceOnUse">
            <rect width="10" height="10" fill="#5c1018"/><circle cx="5" cy="5" r="1.2" fill="#9a3040" opacity="0.55"/>
          </pattern></defs>
          <rect width="${W}" height="${H}" rx="5" fill="url(#${pid})" stroke="#3a1010" stroke-width="1"/>
          <rect x="5" y="7" width="60" height="86" rx="4" fill="none" stroke="#c9a45c" stroke-width="1.4"/>
          <text x="35" y="54" text-anchor="middle" font-size="14" font-family="Georgia, serif" fill="#c9a45c" opacity="0.9">✦</text>
        </svg>`);
    }

    if (setId === "bavarian") {
      return svgNode(`
        <svg class="sol-card-art" viewBox="0 0 ${W} ${H}" aria-hidden="true">
          <defs>
            <pattern id="${pid}" width="12" height="12" patternUnits="userSpaceOnUse">
              <rect width="12" height="12" fill="#1e4a7a"/>
              <circle cx="6" cy="6" r="2" fill="none" stroke="#3d7ab8" stroke-width="0.5" opacity="0.6"/>
              <path d="M6 3.5l.4.9.9.1-.7.6.2.9-.8-.4-.8.4.2-.9-.7-.6.9-.1z" fill="#c9a227" opacity="0.5"/>
            </pattern>
          </defs>
          <rect width="${W}" height="${H}" rx="5" fill="url(#${pid})" stroke="#14325a" stroke-width="1"/>
          <rect x="5" y="7" width="60" height="86" rx="4" fill="none" stroke="#c9a227" stroke-width="1.5"/>
          <ellipse cx="35" cy="50" rx="14" ry="18" fill="none" stroke="#c9a227" stroke-width="1"/>
          <path d="M35 36c-4 0-7 3-7 6.5 0 2 1.5 3.5 3 5 1.5-1.5 3-3 3-5 0-3.5-3-6.5-7-6.5z" fill="#c9a227" opacity="0.35"/>
          <path d="M28 58 Q35 52 42 58 Q35 64 28 58" fill="none" stroke="#2d5a27" stroke-width="0.8" opacity="0.7"/>
        </svg>`);
    }

    if (setId === "midnight") {
      return svgNode(`
        <svg class="sol-card-art" viewBox="0 0 ${W} ${H}" aria-hidden="true">
          <defs><pattern id="${pid}" width="12" height="12" patternUnits="userSpaceOnUse">
            <rect width="12" height="12" fill="#0f172a"/>
            <path d="M0 12L12 0M-3 3L3 -3M9 15L15 9" stroke="#1e3a5f" stroke-width="1"/>
          </pattern></defs>
          <rect width="${W}" height="${H}" rx="5" fill="url(#${pid})" stroke="#334155" stroke-width="1"/>
          <rect x="5" y="7" width="60" height="86" rx="4" fill="none" stroke="#64748b" stroke-width="1"/>
          <path d="M35 38l3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z" fill="#60a5fa" opacity="0.3"/>
        </svg>`);
    }

    return svgNode(`
      <svg class="sol-card-art" viewBox="0 0 ${W} ${H}" aria-hidden="true">
        <defs><pattern id="${pid}" width="8" height="8" patternUnits="userSpaceOnUse">
          <rect width="8" height="8" fill="#1a3a6e"/>
          <path d="M0 8L8 0M-2 2L2 -2M6 10L10 6" stroke="#2f5f9e" stroke-width="0.9"/>
        </pattern></defs>
        <rect width="${W}" height="${H}" rx="5" fill="url(#${pid})" stroke="#0a1628" stroke-width="1"/>
        <rect x="5" y="7" width="60" height="86" rx="4" fill="none" stroke="#d4af37" stroke-width="1.4"/>
        <circle cx="35" cy="50" r="14" fill="none" stroke="#d4af37" stroke-width="1.3"/>
        <circle cx="35" cy="50" r="6" fill="none" stroke="#d4af37" stroke-width="0.8" opacity="0.8"/>
      </svg>`);
  }

  function renderFaceSvg(card, setId, uid) {
    const set = palette(setId);
    const { rank, suit } = card;
    const frame = artFor(setId).frame(set);

    return svgNode(`
      <svg class="sol-card-art" viewBox="0 0 ${W} ${H}" aria-hidden="true">
        <rect width="${W}" height="${H}" rx="5" fill="${set.faceBg}" stroke="${set.faceBorder}" stroke-width="1.2"/>
        <rect x="4" y="5" width="62" height="90" rx="3.5" fill="none" stroke="${set.faceBorder}" stroke-width="0.5" opacity="0.45"/>
        ${frame}
        ${corners(rank, suit, setId)}
        ${faceCenter(rank, suit, setId)}
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
    return SET_ORDER[(idx + 1) % SET_ORDER.length];
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
