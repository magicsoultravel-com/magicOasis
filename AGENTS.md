# magicOasis

Mobile-first SPA: Sudoku + Mahjong (+ more games). Vanilla HTML/CSS/JS, no build step.

## Dev
- Open index.html in a browser (or static host)
- No npm install required

## Design (required for all UI work)
Read docs/design-system.md before changing HTML, CSS, or JS that affects the UI.

Cross-site principles:
- Minimal, lightweight, smooth, modern. Dark default, multi-theme support.
- Minimize new CSS classes — reuse existing patterns. Ask the user if unsure.
- Modular files; elements share the same design tropes and classes.
- UX first: sensible layout, large tap targets, mobile-first.

## Process
- Audit the codebase before changing UI — grep/read existing patterns first.
- No regressions: verify affected games, themes, and hub/game view switching still work.
- Prefer concise delivery; explain tradeoffs when a decision isn't obvious.

## Key files
- css/style.css, css/mahjong.css, index.html
- js/games.js, js/hub.js, js/app.js, js/mahjong-app.js
