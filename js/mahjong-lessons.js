const MahjongGuideBasics = [
  {
    title: "The goal",
    body: "Remove all 144 tiles by matching pairs. When the board is empty, you win. If no free matching pairs remain, start a new game.",
  },
  {
    title: "Free tiles",
    body: "A tile is free when nothing lies on top of it and at least one long side is open (left or right). Blocked tiles are dimmed and cannot be selected.",
  },
  {
    title: "Matching pairs",
    body: "Tap a free tile, then tap another free tile with the same suit and rank. Flowers and seasons are special — see the All tiles tab for which tiles match.",
  },
  {
    title: "Layers",
    body: "Tiles are stacked in layers. Higher tiles block those underneath. Work from the top down and try to uncover buried tiles early.",
  },
  {
    title: "Hints & undo",
    body: "Hint reveals a valid free pair one tile at a time. Undo steps back one move (within the current session). Use Hint if you get stuck on a tough layout.",
  },
  {
    title: "New game & restart",
    body: "New game deals a fresh layout. Restart replays the same deal from the current seed. Difficulty in the menu tweaks which seed family is used.",
  },
];

const MahjongGuideAtlas = [
  {
    title: "Dots · 筒子",
    pronunciation: "tǒngzi",
    english: "Circles suit",
    rule: "Four of each rank (1–9). Match tiles with the same number of dots.",
    tiles: [
      { kind: "dots", rank: 1, label: "1", key: "dots:1", chinese: "一筒", pronunciation: "yī tǒng", english: "1 dot" },
      { kind: "dots", rank: 2, label: "2", key: "dots:2", chinese: "二筒", pronunciation: "èr tǒng", english: "2 dots" },
      { kind: "dots", rank: 3, label: "3", key: "dots:3", chinese: "三筒", pronunciation: "sān tǒng", english: "3 dots" },
      { kind: "dots", rank: 4, label: "4", key: "dots:4", chinese: "四筒", pronunciation: "sì tǒng", english: "4 dots" },
      { kind: "dots", rank: 5, label: "5", key: "dots:5", chinese: "五筒", pronunciation: "wǔ tǒng", english: "5 dots" },
      { kind: "dots", rank: 6, label: "6", key: "dots:6", chinese: "六筒", pronunciation: "liù tǒng", english: "6 dots" },
      { kind: "dots", rank: 7, label: "7", key: "dots:7", chinese: "七筒", pronunciation: "qī tǒng", english: "7 dots" },
      { kind: "dots", rank: 8, label: "8", key: "dots:8", chinese: "八筒", pronunciation: "bā tǒng", english: "8 dots" },
      { kind: "dots", rank: 9, label: "9", key: "dots:9", chinese: "九筒", pronunciation: "jiǔ tǒng", english: "9 dots" },
    ],
  },
  {
    title: "Bamboo · 索子",
    pronunciation: "suǒzi",
    english: "Bamboo suit",
    rule: "Four of each rank (1–9). The 1 is drawn as a bird. Match identical stick counts.",
    tiles: [
      { kind: "bamboo", rank: 1, label: "1", key: "bamboo:1", chinese: "一条", pronunciation: "yī tiáo", english: "1 bamboo (bird)" },
      { kind: "bamboo", rank: 2, label: "2", key: "bamboo:2", chinese: "二条", pronunciation: "èr tiáo", english: "2 bamboo" },
      { kind: "bamboo", rank: 3, label: "3", key: "bamboo:3", chinese: "三条", pronunciation: "sān tiáo", english: "3 bamboo" },
      { kind: "bamboo", rank: 4, label: "4", key: "bamboo:4", chinese: "四条", pronunciation: "sì tiáo", english: "4 bamboo" },
      { kind: "bamboo", rank: 5, label: "5", key: "bamboo:5", chinese: "五条", pronunciation: "wǔ tiáo", english: "5 bamboo" },
      { kind: "bamboo", rank: 6, label: "6", key: "bamboo:6", chinese: "六条", pronunciation: "liù tiáo", english: "6 bamboo" },
      { kind: "bamboo", rank: 7, label: "7", key: "bamboo:7", chinese: "七条", pronunciation: "qī tiáo", english: "7 bamboo" },
      { kind: "bamboo", rank: 8, label: "8", key: "bamboo:8", chinese: "八条", pronunciation: "bā tiáo", english: "8 bamboo" },
      { kind: "bamboo", rank: 9, label: "9", key: "bamboo:9", chinese: "九条", pronunciation: "jiǔ tiáo", english: "9 bamboo" },
    ],
  },
  {
    title: "Characters · 萬子",
    pronunciation: "wànzi",
    english: "Characters suit",
    rule: "Four of each rank (1–9). Match the same numeral + 萬 wàn (ten thousand).",
    tiles: [
      { kind: "chars", rank: 1, label: "一萬", key: "chars:1", chinese: "一萬", pronunciation: "yī wàn", english: "1 character" },
      { kind: "chars", rank: 2, label: "二萬", key: "chars:2", chinese: "二萬", pronunciation: "èr wàn", english: "2 character" },
      { kind: "chars", rank: 3, label: "三萬", key: "chars:3", chinese: "三萬", pronunciation: "sān wàn", english: "3 character" },
      { kind: "chars", rank: 4, label: "四萬", key: "chars:4", chinese: "四萬", pronunciation: "sì wàn", english: "4 character" },
      { kind: "chars", rank: 5, label: "五萬", key: "chars:5", chinese: "五萬", pronunciation: "wǔ wàn", english: "5 character" },
      { kind: "chars", rank: 6, label: "六萬", key: "chars:6", chinese: "六萬", pronunciation: "liù wàn", english: "6 character" },
      { kind: "chars", rank: 7, label: "七萬", key: "chars:7", chinese: "七萬", pronunciation: "qī wàn", english: "7 character" },
      { kind: "chars", rank: 8, label: "八萬", key: "chars:8", chinese: "八萬", pronunciation: "bā wàn", english: "8 character" },
      { kind: "chars", rank: 9, label: "九萬", key: "chars:9", chinese: "九萬", pronunciation: "jiǔ wàn", english: "9 character" },
    ],
  },
  {
    title: "Winds · 風牌",
    pronunciation: "fēngpái",
    english: "Wind tiles",
    rule: "Four of each wind. Only the same wind direction matches.",
    tiles: [
      { kind: "wind", rank: 1, label: "東", key: "wind:1", chinese: "東", pronunciation: "dōng", english: "East" },
      { kind: "wind", rank: 2, label: "南", key: "wind:2", chinese: "南", pronunciation: "nán", english: "South" },
      { kind: "wind", rank: 3, label: "西", key: "wind:3", chinese: "西", pronunciation: "xī", english: "West" },
      { kind: "wind", rank: 4, label: "北", key: "wind:4", chinese: "北", pronunciation: "běi", english: "North" },
    ],
  },
  {
    title: "Dragons · 三元牌",
    pronunciation: "sān yuán pái",
    english: "Dragon tiles",
    rule: "Four of each dragon. Match the same dragon type.",
    tiles: [
      { kind: "dragon", rank: 1, label: "中", key: "dragon:1", chinese: "中", pronunciation: "zhōng", english: "Red dragon" },
      { kind: "dragon", rank: 2, label: "發", key: "dragon:2", chinese: "發", pronunciation: "fā", english: "Green dragon" },
      { kind: "dragon", rank: 3, label: "白", key: "dragon:3", chinese: "白", pronunciation: "bái", english: "White dragon" },
    ],
  },
  {
    title: "Flowers · 花牌",
    pronunciation: "huā pái",
    english: "Flower tiles",
    rule: "One of each flower. Any flower matches any other flower.",
    tiles: [
      { kind: "flower", rank: 1, label: "梅", key: "flower", chinese: "梅", pronunciation: "méi", english: "Plum blossom" },
      { kind: "flower", rank: 2, label: "蘭", key: "flower", chinese: "蘭", pronunciation: "lán", english: "Orchid" },
      { kind: "flower", rank: 3, label: "菊", key: "flower", chinese: "菊", pronunciation: "jú", english: "Chrysanthemum" },
      { kind: "flower", rank: 4, label: "竹", key: "flower", chinese: "竹", pronunciation: "zhú", english: "Bamboo plant" },
    ],
  },
  {
    title: "Seasons · 季牌",
    pronunciation: "jì pái",
    english: "Season tiles",
    rule: "One of each season. Any season matches any other season.",
    tiles: [
      { kind: "season", rank: 1, label: "春", key: "season", chinese: "春", pronunciation: "chūn", english: "Spring" },
      { kind: "season", rank: 2, label: "夏", key: "season", chinese: "夏", pronunciation: "xià", english: "Summer" },
      { kind: "season", rank: 3, label: "秋", key: "season", chinese: "秋", pronunciation: "qiū", english: "Autumn" },
      { kind: "season", rank: 4, label: "冬", key: "season", chinese: "冬", pronunciation: "dōng", english: "Winter" },
    ],
  },
];

const MahjongTileMeta = new Map();
const MahjongGroupPeers = { flower: [], season: [] };

for (const section of MahjongGuideAtlas) {
  for (const tile of section.tiles) {
    MahjongTileMeta.set(`${tile.kind}:${tile.rank}`, {
      chinese: tile.chinese,
      pronunciation: tile.pronunciation,
      english: tile.english,
      group: tile.kind === "flower" || tile.kind === "season" ? tile.kind : null,
    });
    if (tile.kind === "flower" || tile.kind === "season") {
      MahjongGroupPeers[tile.kind].push(tile);
    }
  }
}

function mahjongMatchPeers(kind, rank) {
  const list = MahjongGroupPeers[kind];
  if (!list) return [];
  return list.filter((t) => t.rank !== rank);
}

function formatMahjongMatchPeers(peers) {
  return peers
    .map((p) => `${p.chinese} (${p.pronunciation}) — ${p.english}`)
    .join("; ");
}

const MahjongPhrasePools = {
  approval: [
    { chinese: "是的", pronunciation: "shì de", english: "Yes" },
    { chinese: "对了", pronunciation: "duì le", english: "That's right" },
    { chinese: "很好", pronunciation: "hěn hǎo", english: "Very good" },
    { chinese: "正确", pronunciation: "zhèngquè", english: "Correct" },
    { chinese: "没错", pronunciation: "méi cuò", english: "Exactly" },
  ],
  disapproval: [
    { chinese: "不是", pronunciation: "bù shì", english: "No" },
    { chinese: "不对", pronunciation: "bù duì", english: "Not right" },
    { chinese: "错了", pronunciation: "cuò le", english: "Wrong" },
    { chinese: "再试试", pronunciation: "zài shì shi", english: "Try again" },
    { chinese: "不对哦", pronunciation: "bù duì ó", english: "Not quite" },
  ],
  win: [
    { chinese: "谢谢", pronunciation: "xiè xie", english: "Thank you" },
    { chinese: "恭喜", pronunciation: "gōng xǐ", english: "Congratulations" },
    { chinese: "做得好", pronunciation: "zuò de hǎo", english: "Great job" },
    { chinese: "太棒了", pronunciation: "tài bàng le", english: "Awesome" },
    { chinese: "你赢了", pronunciation: "nǐ yíng le", english: "You won" },
  ],
  greet: [
    { chinese: "你好", pronunciation: "nǐ hǎo", english: "Hello" },
    { chinese: "欢迎", pronunciation: "huān yíng", english: "Welcome" },
    { chinese: "开始吧", pronunciation: "kāi shǐ ba", english: "Let's begin" },
    { chinese: "加油", pronunciation: "jiā yóu", english: "Good luck" },
    { chinese: "祝你好运", pronunciation: "zhù nǐ hǎo yùn", english: "Best of luck" },
  ],
};

const MahjongPhraseDecks = {};

function shufflePhraseOrder(length) {
  const order = Array.from({ length }, (_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}

const MahjongPhrases = {
  next(kind) {
    const pool = MahjongPhrasePools[kind];
    if (!pool?.length) return null;

    let deck = MahjongPhraseDecks[kind];
    if (!deck || deck.pos >= pool.length) {
      deck = { order: shufflePhraseOrder(pool.length), pos: 0 };
      MahjongPhraseDecks[kind] = deck;
    }

    const line = pool[deck.order[deck.pos]];
    deck.pos += 1;
    return line;
  },

  fromTile(tile) {
    const meta = MahjongTileMeta.get(`${tile.kind}:${tile.rank}`);
    if (meta) {
      return {
        chinese: meta.chinese,
        pronunciation: meta.pronunciation,
        english: meta.english,
      };
    }
    return {
      chinese: tile.label,
      pronunciation: "",
      english: "",
    };
  },

  captionForMatch(tileA, tileB) {
    const lineA = MahjongPhrases.fromTile(tileA);
    const lineB = MahjongPhrases.fromTile(tileB);

    if (tileA.kind === tileB.kind && tileA.rank === tileB.rank) {
      return lineA;
    }

    const pron = [lineA.pronunciation, lineB.pronunciation].filter(Boolean).join(" · ");
    const english = [lineA.english, lineB.english].filter(Boolean).join("; ");
    const groupLabel = tileA.kind === "flower" ? "Flowers match" : "Seasons match";

    return {
      chinese: `${lineA.chinese} · ${lineB.chinese}`,
      pronunciation: pron,
      english: english ? `${groupLabel} — ${english}` : groupLabel,
    };
  },
};
