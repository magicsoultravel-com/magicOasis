#!/usr/bin/env python3
"""Interactive CLI to add quotes and categories to the quotes database."""
from __future__ import annotations

import argparse
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from quotes_lib import (
    ROOT,
    append_author,
    append_category_array,
    append_quote,
    category_counts,
    extract_authors,
    find_duplicate,
    load_categories,
    normalize_slug,
    read_mjs,
    save_categories,
    validate_category_slug,
    write_mjs,
)

BUILD = ROOT / "scripts" / "build-quotes.py"


def rebuild() -> None:
    subprocess.run([sys.executable, str(BUILD)], check=True)


def prompt(text: str, default: str = "") -> str:
    suffix = f" [{default}]" if default else ""
    value = input(f"{text}{suffix}: ").strip()
    return value or default


def prompt_multiline() -> str:
    print("Quote text (blank line to finish):")
    lines: list[str] = []
    while True:
        line = input()
        if not line and lines:
            break
        if line:
            lines.append(line)
        elif not lines:
            continue
        else:
            break
    return " ".join(lines).strip()


def choose_category(categories: list[str]) -> str:
    print("\nCategories:")
    for i, cat in enumerate(categories, start=1):
        print(f"  {i}. {cat}")
    print(f"  {len(categories) + 1}. Add new category")
    while True:
        raw = input("Choose category (number): ").strip()
        if not raw.isdigit():
            print("Enter a number.")
            continue
        n = int(raw)
        if 1 <= n <= len(categories):
            return categories[n - 1]
        if n == len(categories) + 1:
            return add_category_interactive(categories)
        print("Out of range.")


def add_category_interactive(categories: list[str]) -> str:
    label = prompt("New category id (e.g. witty, deadpan)")
    slug = normalize_slug(label)
    validate_category_slug(slug)
    if slug in categories:
        print(f"Category '{slug}' already exists.")
        return slug
    add_category(slug, rebuild_after=False)
    categories.append(slug)
    print(f"Added category '{slug}'.")
    return slug


def add_category(slug: str, rebuild_after: bool = True) -> None:
    validate_category_slug(slug)
    categories = load_categories()
    if slug in categories:
        raise SystemExit(f"Category already listed: {slug}")

    text = read_mjs()
    text = append_category_array(text, slug)
    write_mjs(text)

    categories.append(slug)
    save_categories(categories)

    if rebuild_after:
        rebuild()
    print(f"Category '{slug}' added.")


def add_quote(
    category: str,
    quote_text: str,
    author: str,
    lifespan: str | None = None,
    rebuild_after: bool = True,
) -> None:
    categories = load_categories()
    if category not in categories:
        raise SystemExit(f"Unknown category '{category}'. Known: {', '.join(categories)}")

    quote_text = quote_text.strip()
    author = author.strip()
    if not quote_text or not author:
        raise SystemExit("Quote text and author are required.")

    text = read_mjs()
    dupe_cat = find_duplicate(text, quote_text)
    if dupe_cat:
        raise SystemExit(f"Duplicate quote already in category '{dupe_cat}'.")

    authors = extract_authors(text)
    if author not in authors:
        life = lifespan or prompt(
            f"Lifespan for new author '{author}'",
            default="origin unknown",
        )
        text = append_author(text, author, life)

    text = append_quote(text, category, quote_text, author)
    write_mjs(text)

    if rebuild_after:
        rebuild()

    counts = category_counts(read_mjs(), load_categories())
    print(f"Added quote to '{category}' ({counts.get(category, 0)} quotes in category).")


def add_quote_interactive() -> None:
    categories = load_categories()
    text = read_mjs()
    counts = category_counts(text, categories)
    print("\nCurrent counts:", ", ".join(f"{c}: {counts[c]}" for c in categories))

    category = choose_category(categories)
    quote_text = prompt_multiline()
    if not quote_text:
        print("Cancelled — empty quote.")
        return
    author = prompt("Author")
    if not author:
        print("Cancelled — author required.")
        return

    authors = extract_authors(text)
    lifespan = None
    if author not in authors:
        lifespan = prompt("Lifespan (new author)", default="origin unknown")

    add_quote(category, quote_text, author, lifespan=lifespan)


def list_categories_cmd() -> None:
    categories = load_categories()
    text = read_mjs()
    counts = category_counts(text, categories)
    total = sum(counts.values())
    print(f"\n{total} quotes in {len(categories)} categories:\n")
    for cat in categories:
        print(f"  {cat:12} {counts.get(cat, 0):4}")
    print()


def interactive_menu() -> None:
    print("magicOasis Quotes CLI\n")
    actions = {
        "1": ("Add quote", add_quote_interactive),
        "2": ("Add category", lambda: add_category_interactive(load_categories())),
        "3": ("List categories", list_categories_cmd),
        "4": ("Rebuild quotes.json", rebuild),
        "5": ("Quit", None),
    }
    while True:
        print("1. Add quote")
        print("2. Add category")
        print("3. List categories")
        print("4. Rebuild quotes.json")
        print("5. Quit")
        choice = input("\nChoice: ").strip()
        if choice == "5":
            print("Bye.")
            return
        action = actions.get(choice)
        if not action:
            print("Invalid choice.\n")
            continue
        print()
        try:
            action[1]()
        except (SystemExit, subprocess.CalledProcessError) as err:
            print(f"Error: {err}", file=sys.stderr)
        except KeyboardInterrupt:
            print("\nCancelled.\n")
        print()


def main() -> None:
    parser = argparse.ArgumentParser(description="Manage magicOasis quotes source data")
    sub = parser.add_subparsers(dest="command")

    sub.add_parser("list", help="List categories and quote counts")

    p_add = sub.add_parser("add", help="Add a quote")
    p_add.add_argument("--category", "-c", help="Category id")
    p_add.add_argument("--text", "-t", help="Quote text")
    p_add.add_argument("--author", "-a", help="Author name")
    p_add.add_argument("--lifespan", "-l", help="Author lifespan (for new authors)")
    p_add.add_argument("--no-rebuild", action="store_true")

    p_cat = sub.add_parser("add-category", help="Add a new category")
    p_cat.add_argument("name", help="Category id (e.g. witty)")
    p_cat.add_argument("--no-rebuild", action="store_true")

    sub.add_parser("rebuild", help="Run build-quotes.py")

    args = parser.parse_args()

    if not args.command:
        interactive_menu()
        return

    if args.command == "list":
        list_categories_cmd()
    elif args.command == "add":
        if not args.category or not args.text or not args.author:
            parser.error("add requires --category, --text, and --author (or run without subcommand for interactive mode)")
        add_quote(
            args.category,
            args.text,
            args.author,
            lifespan=args.lifespan,
            rebuild_after=not args.no_rebuild,
        )
    elif args.command == "add-category":
        add_category(normalize_slug(args.name), rebuild_after=not args.no_rebuild)
    elif args.command == "rebuild":
        rebuild()


if __name__ == "__main__":
    main()
