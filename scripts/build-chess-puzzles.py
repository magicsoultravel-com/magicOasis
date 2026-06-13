#!/usr/bin/env python3
"""Build curated Lichess puzzle JSON packs from lichess_db_puzzle.csv.

Usage:
  py scripts/build-chess-puzzles.py
  py scripts/build-chess-puzzles.py --csv path/to/lichess_db_puzzle.csv

Expects CSV columns: PuzzleId,FEN,Moves,Rating,RatingDeviation,Popularity,...
Output: data/chess-puzzles-{beginner,intermediate,advanced}.json
"""
from __future__ import annotations

import argparse
import csv
import json
import random
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
DEFAULT_CSV = ROOT / "tmp" / "lichess_db_puzzle.csv"

TIERS = {
    "beginner": (400, 1000, 500),
    "intermediate": (1000, 1600, 500),
    "advanced": (1600, 2200, 500),
}


def compact_row(row: dict) -> dict | None:
    try:
        pop = int(row.get("Popularity") or 0)
        rating = int(row.get("Rating") or 0)
        dev = int(row.get("RatingDeviation") or 99)
    except ValueError:
        return None
    if pop < 80 or dev > 110:
        return None
    moves = (row.get("Moves") or "").split()
    if len(moves) < 1:
        return None
    themes = [t for t in (row.get("Themes") or "").split() if t]
    return {
        "id": row.get("PuzzleId", ""),
        "fen": row.get("FEN", ""),
        "moves": moves,
        "r": rating,
        "themes": themes[:6],
        "pop": pop,
    }


def pick_diverse(rows: list[dict], limit: int) -> list[dict]:
    by_theme: dict[str, list[dict]] = {}
    for r in rows:
        key = r["themes"][0] if r["themes"] else "other"
        by_theme.setdefault(key, []).append(r)
    picked: list[dict] = []
    themes = list(by_theme.keys())
    random.shuffle(themes)
    idx = 0
    while len(picked) < limit and themes:
        t = themes[idx % len(themes)]
        pool = by_theme.get(t) or []
        if pool:
            picked.append(pool.pop(random.randrange(len(pool))))
            if not pool:
                themes = [x for x in themes if by_theme.get(x)]
        idx += 1
        if idx > limit * len(the_theme) + 10:
            break
    if len(picked) < limit:
        rest = [r for r in rows if r not in picked]
        random.shuffle(rest)
        picked.extend(rest[: limit - len(picked)])
    return picked[:limit]


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--csv", type=Path, default=DEFAULT_CSV)
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()
    random.seed(args.seed)

    if not args.csv.is_file():
        print(f"CSV not found: {args.csv}")
        print("Download: https://database.lichess.org/lichess_db_puzzle.csv.zst")
        print("Shipped starter packs in data/ are used until you rebuild.")
        return

    buckets: dict[str, list[dict]] = {k: [] for k in TIERS}
    with args.csv.open(newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            item = compact_row(row)
            if not item:
                continue
            for name, (lo, hi, _) in TIERS.items():
                if lo <= item["r"] < hi:
                    buckets[name].append(item)
                    break

    DATA.mkdir(parents=True, exist_ok=True)
    for name, (_, _, limit) in TIERS.items():
        pool = buckets[name]
        out = pick_diverse(pool, min(limit, len(pool)))
        path = DATA / f"chess-puzzles-{name}.json"
        path.write_text(json.dumps(out, separators=(",", ":")), encoding="utf-8")
        print(f"Wrote {path.name}: {len(out)} puzzles")


if __name__ == "__main__":
    main()
