"""One-shot migration: philosophical split, uplifting backfill, scripture seed."""
from __future__ import annotations

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from quote_seeds.philosophical_new import PHILOSOPHICAL_NEW
from quote_seeds.uplifting_backfill import UPLIFTING_BACKFILL
from quotes_lib import (
    append_author,
    append_category_array,
    extract_array,
    normalize_quote_text,
    read_mjs,
    replace_category_array,
    save_categories,
    write_mjs,
)

PHILOSOPHICAL_AUTHORS = {
    "Socrates",
    "Plato",
    "Marcus Aurelius",
    "Seneca",
    "Epictetus",
    "Buddha",
    "Lao Tzu",
    "Confucius",
    "William James",
    "Ralph Waldo Emerson",
}

SEED_DIR = Path(__file__).resolve().parent / "quote_seeds"
SCRIPTURE_CACHE = SEED_DIR / "scripture_cache.json"

NEW_AUTHORS = {
    "Bible": "ancient",
    "Quran": "c. 7th century",
    "Torah": "ancient",
    "Aristotle": "384–322 BC",
    "Immanuel Kant": "1724–1804",
    "Friedrich Nietzsche": "1844–1900",
    "René Descartes": "1596–1650",
    "David Hume": "1711–1776",
    "Arthur Schopenhauer": "1788–1860",
    "Albert Camus": "1913–1960",
    "Baruch Spinoza": "1632–1677",
    "Jean-Paul Sartre": "1905–1980",
    "Voltaire": "1694–1778",
    "Heraclitus": "c. 535–475 BC",
    "Diogenes": "c. 412–323 BC",
}


def load_scripture() -> list[dict]:
    if SCRIPTURE_CACHE.is_file():
        data = json.loads(SCRIPTURE_CACHE.read_text(encoding="utf-8"))
        if len(data) == 300:
            return data
    from quote_seeds.scripture import SCRIPTURE_QUOTES

    SCRIPTURE_CACHE.write_text(
        json.dumps(SCRIPTURE_QUOTES, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    return SCRIPTURE_QUOTES


def assert_no_dupes(quotes: list[dict], label: str) -> None:
    seen: set[str] = set()
    for q in quotes:
        key = normalize_quote_text(q["text"])
        if key in seen:
            raise SystemExit(f"Duplicate in {label}: {q['text'][:80]}")
        seen.add(key)


def main() -> None:
    uplifting = extract_array("uplifting", read_mjs())
    moved = [q for q in uplifting if q["author"] in PHILOSOPHICAL_AUTHORS]
    kept = [q for q in uplifting if q["author"] not in PHILOSOPHICAL_AUTHORS]

    def merge_to_count(base: list[dict], extra: list[dict], target: int) -> list[dict]:
        out = list(base)
        seen = {normalize_quote_text(q["text"]) for q in out}
        for q in extra:
            if len(out) >= target:
                break
            key = normalize_quote_text(q["text"])
            if key in seen:
                continue
            out.append(q)
            seen.add(key)
        return out

    philosophical = merge_to_count(moved, PHILOSOPHICAL_NEW, 100)
    uplifting_new = merge_to_count(kept, UPLIFTING_BACKFILL, 100)
    scripture = load_scripture()

    if len(philosophical) != 100:
        raise SystemExit(
            f"philosophical: expected 100, got {len(philosophical)} "
            f"(moved {len(moved)}, need {100 - len(moved)} more)"
        )
    if len(uplifting_new) != 100:
        raise SystemExit(
            f"uplifting: expected 100, got {len(uplifting_new)} "
            f"(kept {len(kept)}, need {100 - len(kept)} more)"
        )
    if len(scripture) != 300:
        raise SystemExit(f"scripture: expected 300, got {len(scripture)}")

    all_quotes = uplifting_new + extract_array("cunning", read_mjs())
    all_quotes += extract_array("funny", read_mjs())
    all_quotes += extract_array("strategic", read_mjs())
    all_quotes += philosophical + scripture
    assert_no_dupes(all_quotes, "all categories")

    save_categories(
        ["uplifting", "cunning", "funny", "strategic", "philosophical", "scripture"]
    )

    text = read_mjs()
    for name, lifespan in NEW_AUTHORS.items():
        text = append_author(text, name, lifespan)

    if not extract_array("philosophical", text):
        text = append_category_array(text, "philosophical")
    if not extract_array("scripture", text):
        text = append_category_array(text, "scripture")

    text = replace_category_array(text, "uplifting", uplifting_new)
    text = replace_category_array(text, "philosophical", philosophical)
    text = replace_category_array(text, "scripture", scripture)
    write_mjs(text)

    print(
        f"Updated build-quotes.mjs — uplifting {len(uplifting_new)}, "
        f"philosophical {len(philosophical)} (moved {len(moved)}), "
        f"scripture {len(scripture)}"
    )


if __name__ == "__main__":
    main()
