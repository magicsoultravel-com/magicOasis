const Solitaire = (() => {
  const SUITS = ["hearts", "diamonds", "clubs", "spades"];
  const RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
  const TABLEAU_COLS = 7;
  const FOUNDATION_COUNT = 4;

  const DIFFICULTY = {
    easy: { draw: 1, recycle: true },
    medium: { draw: 3, recycle: true },
    hard: { draw: 3, recycle: false },
  };

  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function shuffle(arr, rng) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function isRed(suit) {
    return suit === "hearts" || suit === "diamonds";
  }

  function colorsAlternate(a, b) {
    return isRed(a.suit) !== isRed(b.suit);
  }

  function createDeck() {
    const deck = [];
    let id = 0;
    for (const suit of SUITS) {
      for (let rank = 1; rank <= 13; rank++) {
        deck.push({ id, suit, rank, faceUp: false });
        id++;
      }
    }
    return deck;
  }

  function rankLabel(rank) {
    return RANKS[rank - 1];
  }

  function suitSymbol(suit) {
    return { hearts: "♥", diamonds: "♦", clubs: "♣", spades: "♠" }[suit];
  }

  function cloneCard(card) {
    return { id: card.id, suit: card.suit, rank: card.rank, faceUp: card.faceUp };
  }

  function cloneState(state) {
    return {
      stock: state.stock.map(cloneCard),
      waste: state.waste.map(cloneCard),
      foundations: state.foundations.map((pile) => pile.map(cloneCard)),
      tableau: state.tableau.map((col) => col.map(cloneCard)),
      drawCount: state.drawCount,
      recycleAllowed: state.recycleAllowed,
      seed: state.seed,
      difficulty: state.difficulty,
      recycled: state.recycled,
    };
  }

  function deal(seed, difficulty = "medium") {
    const opts = DIFFICULTY[difficulty] || DIFFICULTY.medium;
    const rng = mulberry32(seed >>> 0);
    const deck = shuffle(createDeck(), rng);

    const tableau = Array.from({ length: TABLEAU_COLS }, () => []);
    let idx = 0;

    for (let col = 0; col < TABLEAU_COLS; col++) {
      for (let row = 0; row <= col; row++) {
        const card = deck[idx++];
        card.faceUp = row === col;
        tableau[col].push(card);
      }
    }

    const stock = deck.slice(idx).map((c) => ({ ...c, faceUp: false }));

    return {
      stock,
      waste: [],
      foundations: Array.from({ length: FOUNDATION_COUNT }, () => []),
      tableau,
      drawCount: opts.draw,
      recycleAllowed: opts.recycle,
      seed: seed >>> 0,
      difficulty,
      recycled: false,
    };
  }

  function topCard(pile) {
    return pile.length ? pile[pile.length - 1] : null;
  }

  function canPlaceOnTableau(card, column) {
    if (!card || !card.faceUp) return false;
    const target = topCard(column);
    if (!target) return card.rank === 13;
    return colorsAlternate(card, target) && card.rank === target.rank - 1;
  }

  function canPlaceOnFoundation(card, foundation) {
    if (!card || !card.faceUp) return false;
    const target = topCard(foundation);
    if (!target) return card.rank === 1;
    return card.suit === target.suit && card.rank === target.rank + 1;
  }

  function validStack(tableau, col, startIdx) {
    const column = tableau[col];
    if (startIdx < 0 || startIdx >= column.length) return null;
    const stack = column.slice(startIdx);
    if (!stack[0].faceUp) return null;
    for (let i = 1; i < stack.length; i++) {
      const prev = stack[i - 1];
      const cur = stack[i];
      if (!cur.faceUp || !colorsAlternate(cur, prev) || cur.rank !== prev.rank - 1) {
        return null;
      }
    }
    return stack;
  }

  function flipTableauTop(state, col) {
    const column = state.tableau[col];
    if (!column.length) return;
    const top = column[column.length - 1];
    if (!top.faceUp) top.faceUp = true;
  }

  function drawFromStock(state) {
    if (state.stock.length) {
      const count = Math.min(state.drawCount, state.stock.length);
      for (let i = 0; i < count; i++) {
        const card = state.stock.pop();
        card.faceUp = true;
        state.waste.push(card);
      }
      return true;
    }

    if (!state.recycleAllowed || state.recycled || !state.waste.length) {
      return false;
    }

    while (state.waste.length) {
      const card = state.waste.pop();
      card.faceUp = false;
      state.stock.push(card);
    }
    state.recycled = true;
    return true;
  }

  function moveStack(state, fromCol, startIdx, toCol) {
    const stack = validStack(state.tableau, fromCol, startIdx);
    if (!stack || fromCol === toCol) return false;
    if (!canPlaceOnTableau(stack[0], state.tableau[toCol])) return false;

    const from = state.tableau[fromCol];
    const moved = from.splice(startIdx);
    state.tableau[toCol].push(...moved);
    flipTableauTop(state, fromCol);
    return true;
  }

  function moveWasteToTableau(state, toCol) {
    const card = topCard(state.waste);
    if (!card || !canPlaceOnTableau(card, state.tableau[toCol])) return false;
    state.tableau[toCol].push(state.waste.pop());
    return true;
  }

  function moveTableauToFoundation(state, fromCol) {
    const column = state.tableau[fromCol];
    const card = topCard(column);
    if (!card) return false;

    for (let f = 0; f < FOUNDATION_COUNT; f++) {
      if (canPlaceOnFoundation(card, state.foundations[f])) {
        state.foundations[f].push(column.pop());
        flipTableauTop(state, fromCol);
        return true;
      }
    }
    return false;
  }

  function moveWasteToFoundation(state) {
    const card = topCard(state.waste);
    if (!card) return false;

    for (let f = 0; f < FOUNDATION_COUNT; f++) {
      if (canPlaceOnFoundation(card, state.foundations[f])) {
        state.foundations[f].push(state.waste.pop());
        return true;
      }
    }
    return false;
  }

  function autoFoundationTarget(state, card) {
    if (!card) return -1;
    for (let f = 0; f < FOUNDATION_COUNT; f++) {
      if (canPlaceOnFoundation(card, state.foundations[f])) return f;
    }
    return -1;
  }

  function isWon(state) {
    return state.foundations.every((pile) => pile.length === 13);
  }

  function remainingFaceDown(state) {
    let count = 0;
    for (const col of state.tableau) {
      for (const card of col) {
        if (!card.faceUp) count++;
      }
    }
    count += state.stock.length;
    return count;
  }

  function findHint(state) {
    const wasteTop = topCard(state.waste);
    if (wasteTop) {
      for (let f = 0; f < FOUNDATION_COUNT; f++) {
        if (canPlaceOnFoundation(wasteTop, state.foundations[f])) {
          return { type: "waste-foundation", foundation: f };
        }
      }
      for (let c = 0; c < TABLEAU_COLS; c++) {
        if (canPlaceOnTableau(wasteTop, state.tableau[c])) {
          return { type: "waste-tableau", toCol: c };
        }
      }
    }

    for (let col = 0; col < TABLEAU_COLS; col++) {
      const column = state.tableau[col];
      if (!column.length) continue;
      const top = column[column.length - 1];
      if (top.faceUp) {
        for (let f = 0; f < FOUNDATION_COUNT; f++) {
          if (canPlaceOnFoundation(top, state.foundations[f])) {
            return { type: "tableau-foundation", fromCol: col };
          }
        }
      }
    }

    for (let from = 0; from < TABLEAU_COLS; from++) {
      for (let idx = 0; idx < state.tableau[from].length; idx++) {
        const stack = validStack(state.tableau, from, idx);
        if (!stack) continue;
        for (let to = 0; to < TABLEAU_COLS; to++) {
          if (from === to) continue;
          if (canPlaceOnTableau(stack[0], state.tableau[to])) {
            return { type: "tableau-tableau", fromCol: from, startIdx: idx, toCol: to };
          }
        }
      }
    }

    if (state.stock.length || (state.recycleAllowed && state.waste.length && !state.recycled)) {
      return { type: "draw" };
    }

    return null;
  }

  function generateSeed() {
    const bytes = new Uint32Array(1);
    crypto.getRandomValues(bytes);
    return bytes[0] >>> 0;
  }

  return {
    SUITS,
    RANKS,
    TABLEAU_COLS,
    FOUNDATION_COUNT,
    DIFFICULTY,
    rankLabel,
    suitSymbol,
    isRed,
    cloneState,
    deal,
    topCard,
    canPlaceOnTableau,
    canPlaceOnFoundation,
    validStack,
    drawFromStock,
    moveStack,
    moveWasteToTableau,
    moveTableauToFoundation,
    moveWasteToFoundation,
    autoFoundationTarget,
    isWon,
    remainingFaceDown,
    findHint,
    generateSeed,
  };
})();
