"""Shared helpers for quotes source (build-quotes.mjs) and CLI."""
from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
MJS = ROOT / "scripts" / "build-quotes.mjs"
CATEGORIES_FILE = ROOT / "data" / "quotes-categories.json"
OUT = ROOT / "data" / "quotes.json"

QUOTE_RE = re.compile(r'\{ text: "(.*?)", author: "(.*?)" \}', re.DOTALL)
CATEGORY_SLUG_RE = re.compile(r"^[a-z][a-z0-9_-]*$")


def load_categories() -> list[str]:
    if not CATEGORIES_FILE.is_file():
        raise SystemExit(f"Missing {CATEGORIES_FILE.relative_to(ROOT)}")
    data = json.loads(CATEGORIES_FILE.read_text(encoding="utf-8"))
    if not isinstance(data, list) or not data:
        raise SystemExit("quotes-categories.json must be a non-empty array")
    return [str(c) for c in data]


def save_categories(categories: list[str]) -> None:
    CATEGORIES_FILE.write_text(
        json.dumps(categories, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )


def read_mjs() -> str:
    return MJS.read_text(encoding="utf-8")


def write_mjs(text: str) -> None:
    MJS.write_text(text, encoding="utf-8")


def escape_js_string(value: str) -> str:
    return (
        value.replace("\\", "\\\\")
        .replace('"', '\\"')
        .replace("\n", "\\n")
        .replace("\r", "\\r")
        .replace("\t", "\\t")
    )


def extract_array(name: str, text: str) -> list[dict]:
    m = re.search(rf"const {re.escape(name)} = \[(.*?)\n\];", text, re.DOTALL)
    if not m:
        return []
    return [{"text": t, "author": a} for t, a in QUOTE_RE.findall(m.group(1))]


def extract_authors(text: str) -> dict[str, str]:
    m = re.search(r"const authors = \{(.*?)\n\};", text, re.DOTALL)
    if not m:
        raise SystemExit("Could not find authors map in build-quotes.mjs")
    authors: dict[str, str] = {}
    for line in m.group(1).splitlines():
        line = line.strip().rstrip(",")
        if not line:
            continue
        km = re.match(r'"([^"]+)":\s*"(.*)"$', line)
        if km:
            authors[km.group(1)] = km.group(2)
            continue
        km = re.match(r'(\w+):\s*"(.*)"$', line)
        if km:
            authors[km.group(1)] = km.group(2)
    return authors


def author_map_key(name: str) -> str:
    if re.match(r"^[A-Za-z_]\w*$", name):
        return name
    return f'"{escape_js_string(name)}"'


def append_author(text: str, name: str, lifespan: str) -> str:
    if name in extract_authors(text):
        return text
    m = re.search(r"(const authors = \{.*?)(\n\};)", text, re.DOTALL)
    if not m:
        raise SystemExit("Could not find authors map in build-quotes.mjs")
    key = author_map_key(name)
    prefix = text[: m.end(1)]
    if not prefix.endswith("\n"):
        prefix += "\n"
    line = f'  {key}: "{escape_js_string(lifespan)}",\n'
    return prefix + line + text[m.start(2) :]


def append_quote(text: str, category: str, quote_text: str, author: str) -> str:
    pattern = rf"(const {re.escape(category)} = \[)(.*?)(\n\];)"
    m = re.search(pattern, text, re.DOTALL)
    if not m:
        raise SystemExit(f"Category array not found in build-quotes.mjs: {category}")
    entry = (
        f'  {{ text: "{escape_js_string(quote_text)}", '
        f'author: "{escape_js_string(author)}" }},\n'
    )
    body = m.group(2)
    if body and not body.endswith("\n"):
        body += "\n"
    replacement = m.group(1) + body + entry + m.group(3)
    return text[: m.start()] + replacement + text[m.end() :]


def append_category_array(text: str, category: str) -> str:
    if extract_array(category, text):
        raise SystemExit(f"Category already exists in build-quotes.mjs: {category}")
    anchor = re.search(r"\nfunction normalize\(", text)
    if not anchor:
        raise SystemExit("Could not find insertion point for new category array")
    block = f"\nconst {category} = [\n];\n"
    return text[: anchor.start()] + block + text[anchor.start() :]


def normalize_slug(name: str) -> str:
    slug = name.strip().lower().replace(" ", "_")
    slug = re.sub(r"[^a-z0-9_-]", "", slug)
    return slug


def validate_category_slug(slug: str) -> None:
    if not CATEGORY_SLUG_RE.match(slug):
        raise SystemExit(
            "Category id must be lowercase letters, digits, underscores, or hyphens "
            "(e.g. witty, deadpan)."
        )


def category_counts(text: str, categories: list[str]) -> dict[str, int]:
    return {cat: len(extract_array(cat, text)) for cat in categories}


def normalize_quote_text(text: str) -> str:
    return " ".join(text.lower().split())


def find_duplicate(text: str, quote_text: str) -> str | None:
    key = normalize_quote_text(quote_text)
    for cat in load_categories():
        for q in extract_array(cat, text):
            if normalize_quote_text(q["text"]) == key:
                return cat
    return None
