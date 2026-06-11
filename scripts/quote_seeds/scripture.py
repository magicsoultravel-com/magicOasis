import html
import json
import re
import unicodedata
import urllib.parse
import urllib.request
from pathlib import Path


JPS_1917 = "The Holy Scriptures: A New Translation (JPS 1917)"


def _fetch_json(url):
    request = urllib.request.Request(
        url,
        headers={"User-Agent": "magicOasis-scripture-seed/1.0"},
    )
    with urllib.request.urlopen(request, timeout=25) as response:
        return json.loads(response.read().decode("utf-8"))


def _ascii_text(text):
    text = html.unescape(text or "")
    text = re.sub(r"<[^>]+>", " ", text)
    text = text.replace("’", "'").replace("‘", "'")
    text = text.replace("“", '"').replace("”", '"')
    text = text.replace("—", "-").replace("–", "-")
    text = re.sub(r"\s+", " ", text).strip()
    text = unicodedata.normalize("NFKD", text)
    text = text.encode("ascii", "ignore").decode("ascii")
    return re.sub(r"\s+", " ", text).strip()


def _norm(text):
    return re.sub(r"[^a-z0-9]+", "", text.lower())


def _clean_bible_text(raw_text, chapter, verse):
    text = _ascii_text(raw_text)
    marker = f"{chapter}.{verse}"
    marker_pos = text.find(marker)
    if marker_pos > 0:
        text = text[:marker_pos].strip()
    text = re.sub(r"\[\s*.*?\s*\]", "", text).strip()
    return text


def _collect_bible_quotes():
    chapter_plan = [
        ("psalms", list(range(1, 31))),
        ("proverbs", list(range(1, 32))),
        ("john", [1, 3, 6, 8, 10, 14, 15, 16]),
        ("matthew", [5, 6, 7, 11, 18, 22]),
        ("romans", [5, 8, 12]),
        ("philippians", [1, 2, 3, 4]),
        ("james", [1, 2, 3, 4, 5]),
        ("isaiah", [40, 41, 43, 55]),
    ]

    quotes = []
    seen = set()

    for book, chapters in chapter_plan:
        for chapter in chapters:
            url = (
                "https://cdn.jsdelivr.net/gh/wldeh/bible-api/"
                f"bibles/en-kjv/books/{book}/chapters/{chapter}.json"
            )
            try:
                payload = _fetch_json(url)
            except Exception:
                continue
            rows = payload.get("data", [])
            for row in rows:
                verse = str(row.get("verse", "")).strip()
                text = _clean_bible_text(row.get("text", ""), chapter, verse)
                if not text or len(text) > 220:
                    continue
                key = _norm(text)
                if not key or key in seen:
                    continue
                seen.add(key)
                quotes.append(
                    {
                        "text": text,
                        "author": "Bible",
                        "ref": f"{row.get('book', '').strip()} {chapter}:{verse}",
                    }
                )
                if len(quotes) == 100:
                    return quotes
    raise RuntimeError(f"Collected only {len(quotes)} Bible quotes; need 100.")


def _collect_quran_quotes():
    surah_plan = list(range(93, 115)) + [67, 55, 36, 2, 3, 14, 39]
    quotes = []
    seen = set()

    for surah in surah_plan:
        url = f"https://api.alquran.cloud/v1/surah/{surah}/en.pickthall"
        try:
            payload = _fetch_json(url)
        except Exception:
            continue
        ayahs = payload.get("data", {}).get("ayahs", [])
        for ayah in ayahs:
            text = _ascii_text(ayah.get("text", ""))
            if not text or len(text) > 220:
                continue
            key = _norm(text)
            if not key or key in seen:
                continue
            seen.add(key)
            quotes.append(
                {
                    "text": text,
                    "author": "Quran",
                    "ref": f"Surah {surah}:{ayah.get('numberInSurah')}",
                }
            )
            if len(quotes) == 100:
                return quotes
    raise RuntimeError(f"Collected only {len(quotes)} Quran quotes; need 100.")


def _collect_torah_quotes(global_seen):
    chapter_plan = {
        "Genesis": list(range(1, 31)),
        "Exodus": list(range(1, 31)),
        "Leviticus": list(range(1, 21)),
        "Numbers": list(range(1, 21)),
        "Deuteronomy": list(range(1, 21)),
    }
    quotes = []
    local_seen = set()
    ven = urllib.parse.quote(JPS_1917, safe="")

    for book, chapters in chapter_plan.items():
        for chapter in chapters:
            url = f"https://www.sefaria.org/api/texts/{book}.{chapter}?ven={ven}"
            try:
                payload = _fetch_json(url)
            except Exception:
                continue
            verses = payload.get("text", [])
            for idx, verse_text in enumerate(verses, start=1):
                text = _ascii_text(verse_text)
                if not text or len(text) > 220:
                    continue
                key = _norm(text)
                if not key or key in local_seen or key in global_seen:
                    continue
                local_seen.add(key)
                quotes.append(
                    {
                        "text": text,
                        "author": "Torah",
                        "ref": f"{book} {chapter}:{idx}",
                    }
                )
                if len(quotes) == 100:
                    return quotes
    raise RuntimeError(f"Collected only {len(quotes)} Torah quotes; need 100.")


def _validate_counts(scripture_quotes):
    bible = [q for q in scripture_quotes if q["author"] == "Bible"]
    quran = [q for q in scripture_quotes if q["author"] == "Quran"]
    torah = [q for q in scripture_quotes if q["author"] == "Torah"]

    assert len(bible) == 100, f"Bible count mismatch: {len(bible)}"
    assert len(quran) == 100, f"Quran count mismatch: {len(quran)}"
    assert len(torah) == 100, f"Torah count mismatch: {len(torah)}"
    assert len(scripture_quotes) == 300, f"Total count mismatch: {len(scripture_quotes)}"

    norms = [_norm(q["text"]) for q in scripture_quotes]
    assert len(norms) == len(set(norms)), "Duplicate normalized scripture text found."


def _build_scripture_quotes():
    bible = _collect_bible_quotes()
    quran = _collect_quran_quotes()
    global_seen = {_norm(q["text"]) for q in (bible + quran)}
    torah = _collect_torah_quotes(global_seen)
    quotes = bible + quran + torah
    _validate_counts(quotes)
    return quotes


def _load_scripture_quotes():
    cache = Path(__file__).with_name("scripture_cache.json")
    if cache.is_file():
        quotes = json.loads(cache.read_text(encoding="utf-8"))
        _validate_counts(quotes)
        return quotes
    quotes = _build_scripture_quotes()
    cache.write_text(
        json.dumps(quotes, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    return quotes


SCRIPTURE_QUOTES = _load_scripture_quotes()

