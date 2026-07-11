# SentinelAI Design System

## Theme Architecture

Three-way theme: Cream (default/warm-paper), Light (clean), Dark (dark-paper).

```
tokens.css          globals.css
─────────────────   ─────────────────
:root (cream)       :root (shadcn HSL)
[data-theme=dark]   .dark (shadcn HSL)
                    ─────────────────
                          ↑
                    ThemeSync bridges:
                    data-theme ←→ .dark class
```

### Theme Values (Cream)

| Token             | Hex       | Role                |
|-------------------|-----------|----------------------|
| `--paper`         | `#F2EFE6` | Page background      |
| `--paper-raised`  | `#FDFCF8` | Card/surface raised  |
| `--paper-sunken`  | `#E8E4D8` | Depressed surface    |
| `--line`          | `#D8D3C4` | Borders              |
| `--ink`           | `#1A1814` | Body text            |
| `--ink-soft`      | `#6B6659` | Muted text           |
| `--red`           | `#A83426` | Primary/destructive  |
| `--green`         | `#2E5231` | Success              |
| `--amber`         | `#7A5410` | Warning              |

---

## Diagnosis

### 1. Surface Hierarchy Collapse (Critical)

**Problem:** Cards and raised surfaces merge into the page background.

```
background (#F2EFE6)
  └─ card (#FDFCF8)  ← ΔL ≈ 4 — barely perceptible
       └─ shadow (--shadow-sm)  ← rgba(26,24,20,0.06) — invisible
```

`shadow-card: var(--shadow-sm)` = `0 1px 2px rgba(26,24,20,0.06)` — the opacity is too low to register on a cream background.

**Fix:** Raise card bg from `#FDFCF8` to `#FFFFFB` (pure white with slight warmth) and darken shadows (opacity 0.06→0.12).

### 2. Dual Theme Mismatch (High)

`bg-secondary` in tailwind maps to `rgb(var(--ink-soft-rgb))` = `#6B6659` (medium gray).
`--secondary` in shadcn HSL = `42 20% 81%` = `#DDD6C8` (warm beige).

Components using `bg-secondary text-secondary-foreground` via shadcn get a different color than those using tailwind `bg-secondary`.
The Button's `secondary` variant uses the tailwind mapping → dark gray button. The Badge's `secondary` variant uses the shadcn mapping → warm beige.

### 3. Button Variant Visibility (Medium)

- `ghost`: `hover:bg-accent` where accent = `#E8E4D8` on cream `#F2EFE6` — invisible until hover
- `outline`: `border-input bg-background` where input = `#D8D3C4` on cream `#F2EFE6` — extremely subtle
- `secondary`: maps to `--ink-soft` (`#6B6659`) — not a surface bg, it's a text color used as bg

### 4. Light Theme Missing (Medium)

ThemeSync only produces `data-theme="dark"` or `data-theme="light"`.
tokens.css has no `html[data-theme='light']` section — it falls through to `:root` (cream).
There is no true "light" (clean white) variant.

### 5. Badge Uses Tailwind Colors (Low)

Badge warning/success use `bg-amber-500/15` and `bg-emerald-500/15` instead of the design tokens `--amber-bg` and `--green-bg`.

### 6. DESIGN_SPEC.md is Stale (Low)

Existing `DESIGN_SPEC.md` is a project spec, not a design system document. Should be replaced/referenced.

---

## Fix Plan

1. **tokens.css** — Deepen card bg to `#FFFFFB`, increase shadow opacity to 0.12, add `[data-theme='light']` section
2. **Button.tsx** — Rework ghost/outline/secondary variants for cream
3. **ThemeSync** — Add cream mode support (tri-state toggle)
4. **Badge.tsx** — Replace tailwind amber/emerald with design tokens
5. **globals.css** — Align shadcn `--secondary` with actual token intent
6. **Nav.tsx** — Remove hardcoded blue-600 references
7. **DESIGN_SPEC.md** — Archive, replace with reference to DESIGN.md
