"""Parse scripts/build-quotes.mjs and emit data/quotes.json."""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "scripts" / "build-quotes.mjs"
OUT = ROOT / "data" / "quotes.json"

CATEGORIES = ("uplifting", "cunning", "funny", "strategic")
QUOTE_RE = re.compile(r'\{ text: "(.*?)", author: "(.*?)" \}', re.DOTALL)


def extract_array(name: str, text: str) -> list[dict]:
    m = re.search(rf"const {name} = \[(.*?)\n\];", text, re.DOTALL)
    if not m:
        raise SystemExit(f"Could not find array: {name}")
    return [{"text": t, "author": a} for t, a in QUOTE_RE.findall(m.group(1))]


def extract_authors(text: str) -> dict:
    m = re.search(r"const authors = \{(.*?)\n\};", text, re.DOTALL)
    if not m:
        raise SystemExit("Could not find authors map")
    authors = {}
    for line in m.group(1).splitlines():
        line = line.strip().rstrip(",")
        if not line:
            continue
        km = re.match(r'"([^"]+)":\s*"(.*)"$', line)
        if km:
            authors[km.group(1)] = km.group(2)
            continue
        km = re.match(r"(\w+):\s*\"(.*)\"$", line)
        if km:
            authors[km.group(1)] = km.group(2)
    return authors


def normalize(s: str) -> str:
    return " ".join(s.lower().split())


def sanitize(text: str) -> str:
    for pattern, repl in (
        (r"\bfuck\b", "f***"),
        (r"\bfucked\b", "f*****"),
        (r"\bfucking\b", "f******"),
    ):
        text = re.sub(pattern, repl, text, flags=re.I)
    return text


def main() -> None:
    text = SRC.read_text(encoding="utf-8")
    authors = extract_authors(text)
    by_category = {name: extract_array(name, text) for name in CATEGORIES}

    for name, arr in by_category.items():
        if len(arr) != 100:
            print(f"ERROR {name}: expected 100, got {len(arr)}", file=sys.stderr)
            sys.exit(1)

    quotes = []
    for category, arr in by_category.items():
        for q in arr:
            quotes.append(
                {
                    "text": sanitize(q["text"]),
                    "author": q["author"],
                    "category": category,
                }
            )

    seen: dict[str, dict] = {}
    dupes = []
    for q in quotes:
        key = normalize(q["text"])
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

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(
        json.dumps(
            {
                "authors": authors,
                "categories": list(CATEGORIES),
                "quotes": quotes,
            },
            indent=2,
            ensure_ascii=False,
        )
        + "\n",
        encoding="utf-8",
    )
    print(f"Wrote {OUT.relative_to(ROOT)} — {len(quotes)} quotes in {len(CATEGORIES)} categories")


if __name__ == "__main__":
    main()
