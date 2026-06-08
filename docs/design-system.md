# Design system — magicOasis

## Aesthetic
Minimal. Lightweight. Smooth. Modern.
Default dark theme (slate). Support all existing themes via data-theme — never bypass CSS variables.

## CSS rules
- Reuse existing classes (.btn, .btn-icon, .dialog, .title) before creating new ones.
- New classes only when semantics differ (e.g. .hub-tile extends button surface language).
- Use var(--bg), var(--surface), var(--accent), etc. — no hardcoded hex except inside theme definitions.
- kebab-case naming; state via .active or .is-*.
- If unsure whether to add a class or reuse an existing one, ask the user.

## Structure
- Keep files modular: css/style.css (shared), css/mahjong.css (game-specific), js per feature.
- New UI must work with existing theme + zen modes.

## UX
- Mobile-first, human-centered layout.
- Touch targets ≥ 44px on interactive hub tiles.
- Respect prefers-reduced-motion.

## Icons
- Inline SVG, currentColor, stroke 1.2–1.6.
- Header/menu: 16×16. Hub tiles: ~48px.

## Game hub
- 3×3 grid; .hub-tile for live games, .hub-tile--soon for placeholders.
- Fade transitions consistent with .quote-splash.

## Existing primitives
- CSS variables: --bg, --surface, --text, --text-muted, --border, --accent, --accent-soft, --highlight, --shadow
- Components: .btn, .btn-icon, .btn-primary, .dialog, .title, .select
- Modes: data-theme on html, data-game on .app, .sudoku-only / .mahjong-only visibility
- Boards: .board (sudoku), .mahjong-board (mahjong) — surface + border frame, no .card class

## Before shipping UI changes
- Grep/read existing patterns in css/style.css and index.html.
- Verify both themes and both games still work; no broken layout regressions.
