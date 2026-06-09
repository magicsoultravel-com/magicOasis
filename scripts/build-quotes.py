"""Parse scripts/build-quotes.mjs and emit data/quotes.json."""
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from quotes_lib import (  # noqa: E402
    MJS,
    OUT,
    ROOT,
    extract_array,
    extract_authors,
    load_categories,
    normalize_quote_text,
    read_mjs,
)


def sanitize(text: str) -> str:
    for pattern, repl in (
        (r"\bfuck\b", "f***"),
        (r"\bfucked\b", "f*****"),
        (r"\bfucking\b", "f******"),
    ):
        text = re.sub(pattern, repl, text, flags=re.I)
    return text


def parse_year_token(token: str) -> int | None:
    token = token.strip().lower()
    if not token:
        return None
    bc = "bc" in token
    token = re.sub(r"\s*(bc|ad)\s*$", "", token, flags=re.I).strip()
    token = re.sub(r"^c\.?\s*", "", token)
    m = re.match(r"^(\d+)(?:st|nd|rd|th)?\s+century$", token)
    if m:
        century = int(m.group(1))
        year = (century - 1) * 100 + 50
        return -year if bc else year
    if not re.match(r"^\d+$", token):
        return None
    year = int(token)
    return -year if bc else year


def parse_lifespan(lifespan: str) -> dict:
    """Return {lifespan, birth, death, mid} with numeric years (BC negative)."""
    raw = lifespan.strip()
    if not raw or raw in ("origin unknown", "date unknown"):
        return {"lifespan": raw, "birth": None, "death": None, "mid": None}
    if "contemporary" in raw.lower():
        return {"lifespan": raw, "birth": None, "death": None, "mid": None}

    cleaned = re.sub(r"^c\.?\s*", "", raw, flags=re.I).strip()
    birth_only = re.match(r"^b\.?\s*(\d+)\s*(bc|ad)?$", cleaned, flags=re.I)
    if birth_only:
        birth = parse_year_token(birth_only.group(1) + (birth_only.group(2) or ""))
        return {"lifespan": raw, "birth": birth, "death": None, "mid": birth}

    century_only = re.match(r"^(\d+)(?:st|nd|rd|th)?\s+century\s*(bc|ad)?$", cleaned, flags=re.I)
    if century_only:
        mid = parse_year_token(f"{century_only.group(1)}th century {century_only.group(2) or ''}".strip())
        return {"lifespan": raw, "birth": None, "death": None, "mid": mid}

    range_suffix = ""
    range_m = re.search(r"\s*(bc|ad)\s*$", cleaned, flags=re.I)
    if range_m:
        range_suffix = f" {range_m.group(1)}"
        cleaned = cleaned[: range_m.start()].strip()

    parts = re.split(r"[–—\-]", cleaned, maxsplit=1)
    if len(parts) == 2:
        left, right = parts[0].strip(), parts[1].strip()
        if range_suffix and "bc" not in left.lower() and "ad" not in left.lower():
            left += range_suffix
        if range_suffix and "bc" not in right.lower() and "ad" not in right.lower():
            right += range_suffix
        birth = parse_year_token(left)
        death = parse_year_token(right)
        if birth is not None and death is not None:
            mid = round((birth + death) / 2)
            return {"lifespan": raw, "birth": birth, "death": death, "mid": mid}
        if birth is not None:
            return {"lifespan": raw, "birth": birth, "death": death, "mid": birth}
        if death is not None:
            return {"lifespan": raw, "birth": birth, "death": death, "mid": death}

    single = parse_year_token(cleaned)
    if single is not None:
        return {"lifespan": raw, "birth": single, "death": None, "mid": single}

    return {"lifespan": raw, "birth": None, "death": None, "mid": None}


def build_authors_meta(authors: dict) -> dict:
    return {name: parse_lifespan(lifespan) for name, lifespan in authors.items()}


def main() -> None:
    categories = load_categories()
    text = read_mjs()
    authors = extract_authors(text)
    by_category = {}
    for name in categories:
        arr = extract_array(name, text)
        if not arr:
            print(f"WARNING {name}: no quotes found (empty or missing array)", file=sys.stderr)
        by_category[name] = arr

    quotes = []
    for category, arr in by_category.items():
        for i, q in enumerate(arr, start=1):
            quotes.append(
                {
                    "id": f"{category}-{i:03d}",
                    "text": sanitize(q["text"]),
                    "author": q["author"],
                    "category": category,
                }
            )

    seen: dict[str, dict] = {}
    dupes = []
    for q in quotes:
        key = normalize_quote_text(q["text"])
        if key in seen:
            dupes.append(q["text"])
        else:
            seen[key] = q

    if dupes:
        print("ERROR duplicate quotes:", file=sys.stderr)
        for d in dupes:
            print(f"  {d}", file=sys.stderr)
        sys.exit(1)

    extra_authors = {
        "Thomas Edison": "1847–1931",
        "Steve Martin": "b. 1945",
        "A. Whitney Brown": "b. 1952",
        "Les Dawson": "1931–1993",
        "Paul Merton": "b. 1957",
        "Richard Dawkins": "b. 1941",
        "James A. Garfield": "1831–1881",
        "Charles Lamb": "1775–1834",
        "Deng Xiaoping": "1904–1997",
        "Fred Allen": "1894–1956",
        "Orson Welles": "1915–1985",
        "Dwight D. Eisenhower": "1890–1969",
        "Helmuth von Moltke": "1800–1891",
        "Michael Porter": "b. 1947",
        "Peter Drucker": "1909–2005",
        "Andy Grove": "1936–2016",
        "Jack Welch": "1935–2020",
        "George S. Patton": "1885–1945",
        "Douglas MacArthur": "1880–1964",
        "Omar Bradley": "1893–1981",
        "B.H. Liddell Hart": "1895–1970",
        "José Raúl Capablanca": "1888–1942",
        "Aron Nimzowitsch": "1886–1935",
        "Garry Kasparov": "b. 1963",
        "Bobby Fischer": "1943–2008",
        "John Boyd": "1927–1997",
        "Miyamoto Musashi": "c. 1584–1645",
        "Alfred Sloan": "1875–1966",
        "Warren Buffett": "b. 1930",
        "Charlie Munger": "1924–2023",
        "Jeff Bezos": "b. 1964",
        "Reed Hastings": "b. 1960",
        "Abraham Lincoln": "1809–1865",
        "George Washington": "1732–1799",
        "Benjamin Graham": "1894–1976",
        "Matsuo Bashō": "1644–1694",
        "Thomas Huxley": "1825–1895",
        "Henry Mintzberg": "b. 1939",
        "Proverbs": "origin unknown",
        "Antoine de Saint-Exupéry": "1900–1944",
        "Frederick the Great": "1712–1786",
        "Mother Teresa": "1910–1997",
        "Walt Disney": "1901–1966",
        "Margaret Mead": "1901–1978",
        "Steve Jobs": "1955–2011",
        "Coco Chanel": "1883–1971",
        "Thomas Mann": "1875–1955",
        "Rickson Gracie": "b. 1958",
    }
    authors.update(extra_authors)
    authors_meta = build_authors_meta(authors)

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(
        json.dumps(
            {
                "authors": authors,
                "authorsMeta": authors_meta,
                "categories": list(categories),
                "quotes": quotes,
            },
            indent=2,
            ensure_ascii=False,
        )
        + "\n",
        encoding="utf-8",
    )
    counts = ", ".join(f"{name}: {len(by_category[name])}" for name in categories)
    print(f"Wrote {OUT.relative_to(ROOT)} — {len(quotes)} quotes in {len(categories)} categories ({counts})")


if __name__ == "__main__":
    main()
