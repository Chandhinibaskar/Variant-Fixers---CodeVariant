# Fix It First — Don't bin it. Decide it.
Team Variant Fixers · CodeVariant Round 2

A guided triage for broken things: **repair, reuse, repurpose, replace or recycle** — ranked, scored and explained.

## Run
```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # -> dist/index.html (single self-contained file)
npm test           # engine sanity checks
```

## Flow (8 steps from the Round 1 deck)
Landing → Item → Problem (chips + text) → Situation (budget, skill, time, need, sentiment) →
Results (5 ranked options) → Option detail (why it fits) → Next-step checklist → Session shelf.

## Where things live
| File | Purpose |
|---|---|
| `src/config.js` | Categories, symptoms, option profiles, factors, **modes & weights** — edit this for the Surprise Challenge |
| `src/engine.js` | Transparent scoring: each option scored 0–1 on 8 factors, weighted, with a plain-language reason per factor |
| `src/store.jsx` | State + sessionStorage persistence (shelf, checklist progress) |
| `src/screens/*` | One screen per step |

## Surprise Challenge cheat-sheet
- **Budget cap** → already built (toggle on Results); change penalty in `engine.js` (`score *= 0.5`).
- **New user type / eco-first mode** → add an entry to `MODES` in `config.js`.
- **New factor** → add to `FACTORS`, return a 0–1 score + reason in `factorScores()` / `reasons()`.
- **New category** → add to `CATEGORIES` + `SYMPTOMS`.

## 🎨 Surprise Challenge — The Canvas Protocol (implemented)
Primary actions are **never buttons**. Every one is performed by dragging a data card into an Action Zone
(`src/dnd.jsx` — pointer events for mouse + touch, plus a keyboard mode: Enter = pick up, arrows = choose zone, Enter = drop, Esc = cancel).

| Screen | Card you drag | Action Zone → what happens |
|---|---|---|
| Landing | My broken thing / Continue / Example | Start triage · Run example |
| Item / Problem / Situation | Item / Problem / Situation card (live summary) | Next step (validates, shakes if incomplete) · Back |
| Problem | Symptom cards | Tray (add) · Symptoms pool (remove) |
| Results | Option card | Rule out · Next steps · Go with this (saves) · Shelf (saves) |
| Results | Ruled-out chip | Ranked list (restore) |
| Option detail | Option card / Step cards | Go with this · All options · To do ⇄ Done |
| Shelf | Shelf card / Compare chip / header | Reopen · Compare · Remove · New item (header → Remove clears all) |

Remaining controls (category pickers, sliders, mode chips) are *inputs/settings*, not primary actions.
Tests: `npm test` (scoring engine + simulated drag-and-drop).
