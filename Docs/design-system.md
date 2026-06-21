# SentinelAI — Design System Specification

**Product:** AI Risk Monitoring & Observability Platform
**Version:** 1.0
**Status:** Draft — Pending Design Review
**Author:** Principal Product Designer / Design Systems Lead (ex-Datadog, ex-CrowdStrike, ex-Linear, ex-Vercel)
**Date:** 2026-06-22

---

## Table of Contents

1. [Brand Personality](#1-brand-personality)
2. [Visual Design Principles](#2-visual-design-principles)
3. [Color System](#3-color-system)
4. [Typography System](#4-typography-system)
5. [Spacing System](#5-spacing-system)
6. [Layout System](#6-layout-system)
7. [Navigation System](#7-navigation-system)
8. [Dashboard Components](#8-dashboard-components)
9. [Investigation Components](#9-investigation-components)
10. [Table Design System](#10-table-design-system)
11. [Form System](#11-form-system)
12. [Empty States](#12-empty-states)
13. [Loading States](#13-loading-states)
14. [Error States](#14-error-states)
15. [Alert System](#15-alert-system)
16. [Accessibility Requirements](#16-accessibility-requirements)
17. [Data Visualization Guidelines](#17-data-visualization-guidelines)
18. [Microinteractions](#18-microinteractions)
19. [Design Tokens](#19-design-tokens)

---

## 1. Brand Personality

### 1.1 Brand Attributes

| Attribute | Why |
|-----------|-----|
| **Authoritative** | SentinelAI sits at the intersection of security and observability. Users must trust it with production AI systems. Authority is earned through transparency, not marketing. |
| **Precise** | Risk scores, severity levels, and compliance status must be unambiguous. There is no room for vague visual language in a tool that determines whether to block a prompt injection. |
| **Calm** | Even critical alerts use measured visual language. Panic-inducing design erodes trust. The UI communicates urgency through color and hierarchy, not through alarming animations or chaotic layouts. |
| **Transparent** | Every data point has provenance, every score has an explanation, every action has a trail. The design exposes the reasoning behind every surface. |
| **Efficient** | Information density is high but structured. Every pixel earns its place. This is a tool for professionals who spend hours in it daily — not a marketing site. |

### 1.2 Tone Matrix

| Context | Tone | Example UI Text |
|---------|------|-----------------|
| Dashboard idle | Confident, calm | "Your AI risk posture is healthy. 2 items need attention." |
| Critical alert | Urgent, controlled | "Prompt injection detected. Input blocked per guardrail rule #3." |
| Investigation | Clinical, direct | "3.2σ above baseline. 47 similar events in the last 24 hours." |
| Compliance report | Formal, definitive | "Audit trail enabled for 12 of 12 models. Coverage: 100%." |
| Empty state | Encouraging, helpful | "Connect your first model to start monitoring." |
| Error | Direct, actionable | "Connection to model endpoint failed. [Check endpoint URL] or [Retry]." |
| Configuration change | Understated, confirmatory | "Guardrail saved. Active on gpt-4-prod. Estimated prevention: 12/week." |

### 1.3 Emotional Experience

| When | User Should Feel | How We Achieve It |
|------|------------------|--------------------|
| Opening the dashboard | **In control** | The health score answers "should I be worried?" in under 5 seconds. The layout is predictable. Nothing moves unless something changed. |
| Receiving an alert | **Informed, not alarmed** | Alerts arrive with context: what happened, why it matters, what to do next. Severity is communicated through clear visual hierarchy, not flashing red. |
| Investigating an event | **Confident** | Every data point is explainable. Token heatmaps, feature attributions, and confidence scores leave no room for doubt. |
| Running a compliance report | **Prepared** | One-click evidence packages with signed manifests. The system has been logging immutably since day one — there is nothing to scramble for. |
| Configuring a policy | **Empowered** | The rule builder shows estimated impact before activation. Dry-run testing validates against historical data. Preview confirms: "This will block ~50 requests/day." |

### 1.4 Product Character

SentinelAI is not playful. It is not friendly. It is **professional, trustworthy, and direct** — like a CrowdStrike dashboard that happens to be well-designed. It earns trust through transparency, not warmth.

```
CrowdStrike (security rigor)
    × Linear (interaction polish)
    × Datadog (information density)
    × Stripe (trust signals)
    ─────────────────────
    = SentinelAI
```

### 1.5 Design Language Positioning

```
                    WARM
                     │
     PLAYFUL         │         AUTHORITATIVE
     (Vercel)        │         (SentinelAI ●)
                     │
                     │         (CrowdStrike)
                     │
                     ├─────────────────────────── INFORMATIONAL DENSITY
                     │         (Datadog)
                     │
     MINIMAL         │
     (Linear)        │
                     │
                     COLD
```

SentinelAI sits at **authoritative × high density** — the most demanding quadrant. Every design decision prioritizes scanability and decision speed over visual flourish.

---

## 2. Visual Design Principles

### Principle 1: Clarity First

Every UI element must answer: "What is this telling me, and what should I do about it?"

| Do | Don't |
|----|-------|
| Show risk score with breakdown, trend, and confidence | Show a single number with no context |
| Use severity color consistently across all surfaces | Use color decoratively |
| Label everything clearly (icons never appear without text labels in navigation) | Assume icon-only navigation is intuitive |
| Expose reasoning ("Why this score? →") | Hide explanation behind tooltip-only access |

### Principle 2: Information Density

Enterprise monitoring tools are used for hours daily. Information must be dense but structured.

| Rule | Implementation |
|------|---------------|
| **Scan, not read** | Users should find what they need by scanning visual hierarchy, not reading every label |
| **Consistent rhythm** | Every card, table row, and list item follows the same internal spacing rules |
| **Data-ink ratio** | Remove non-data ink. Chart axes are thin gray lines, not heavy black. Gridlines are optional and always subtle |
| **Collapsible density** | List views default to compact; users can toggle to detailed |

### Principle 3: Risk Visibility

Risk signals must be impossible to miss when critical, and easy to ignore when informational.

| Severity | Visual Treatment |
|----------|-----------------|
| Critical | Red background, icon + text label, elevated card border. Never appears without both color and text |
| Warning | Amber/amber-adjacent, icon + text label |
| Info | Blue, icon + text label |
| Success | Green, icon |

**Rule:** Color is never the sole differentiator. Every severity badge includes an icon and a text label.

### Principle 4: Progressive Disclosure

Show the headline first. Reveal detail on demand.

| Level | Content | Interaction |
|-------|---------|-------------|
| **Dashboard** | Health score, alert count, top 3 risks | Click → navigates to detail |
| **Event list** | Severity, type, score, model, timestamp, status | Click row → event detail |
| **Event detail** | Risk breakdown, input summary, timeline | Tab switches: Summary, Token Heatmap, Raw Event |
| **Investigation** | Full timeline, explanation, recommendations | Three-panel layout, expand/collapse panels |

### Principle 5: Actionable Insights

Every data point shown should lead to a decision or an action.

| Data Shown | Implied Question | Action |
|------------|------------------|--------|
| Health score 64/100 | "What's wrong?" | Top risks list shows exactly which items need attention |
| Critical alert count | "What is it?" | Click opens investigation with full context |
| "3 similar events" | "Should I worry?" | Timeline shows correlation, recommendations suggest next step |
| Drift detected | "What changed?" | Deploy timeline overlaid on drift chart |

---

## 3. Color System

### 3.1 Brand Palette

```
Primary:        #2B42F5     hsl(233, 91%, 56%)    — CTAs, active nav, logo
Primary Hover:  #1A2DE0     hsl(233, 91%, 49%)    — Button hover, link hover
Primary Light:  #E8EBFF     hsl(233, 100%, 95%)   — Selected rows, active filter bg

Accent:         #6366F1     hsl(239, 84%, 66%)    — Secondary CTAs, indicators
Accent Soft:    #EEF2FF     hsl(239, 100%, 97%)   — Accent backgrounds

Brand Bg:       #0A1628     hsl(220, 60%, 10%)    — Marketing hero, dark mode bg
Brand Text:     #FFFFFF     hsl(0, 0%, 100%)      — Text on brand backgrounds

Neutral 900:    #111827     hsl(220, 40%, 11%)    — Primary text (dark)
Neutral 800:    #1F2937     hsl(215, 28%, 17%)    — Secondary text
Neutral 700:    #374151     hsl(216, 19%, 28%)    — Tertiary text
Neutral 600:    #4B5563     hsl(216, 15%, 34%)    — Disabled text
Neutral 500:    #6B7280     hsl(220, 9%, 46%)     — Placeholder, metadata
Neutral 400:    #9CA3AF     hsl(218, 11%, 65%)    — Non-essential info
Neutral 300:    #D1D5DB     hsl(216, 12%, 84%)    — Borders, dividers
Neutral 200:    #E5E7EB     hsl(220, 13%, 91%)    — Card borders, subtle dividers
Neutral 100:    #F3F4F6     hsl(220, 14%, 96%)    — Surface secondary, hover state
Neutral 50:     #F9FAFB     hsl(210, 17%, 98%)    — Surface primary, page bg
White:          #FFFFFF     hsl(0, 0%, 100%)      — Card bg, modal bg
```

### 3.2 Risk Severity Colors

```
CRITICAL
  DEFAULT:   #E02525     hsl(0, 74%, 51%)     — Badge dot, border, icon
  BG:        #FEF2F2     hsl(0, 71%, 97%)     — Card bg, row bg
  BORDER:    #FECACA     hsl(0, 93%, 89%)     — Alert card border
  TEXT:      #991B1B     hsl(0, 70%, 35%)     — Label text on light bg
  ICON:      AlertTriangle (lucide)

WARNING
  DEFAULT:   #E88B1F     hsl(33, 82%, 52%)    — Badge dot, border, icon
  BG:        #FFFBEB     hsl(43, 100%, 96%)   — Card bg, row bg
  BORDER:    #FDE68A     hsl(43, 96%, 77%)    — Alert card border
  TEXT:      #92400E     hsl(27, 84%, 31%)    — Label text on light bg
  ICON:      AlertCircle

INFO
  DEFAULT:   #2B8CE5     hsl(209, 78%, 53%)   — Badge dot, border, icon
  BG:        #EFF6FF     hsl(210, 100%, 97%)  — Card bg, row bg
  BORDER:    #BFDBFE     hsl(210, 94%, 87%)   — Alert card border
  TEXT:      #1E40AF     hsl(224, 71%, 40%)   — Label text on light bg
  ICON:      Info

SUCCESS (Healthy)
  DEFAULT:   #1FAA5C     hsl(145, 69%, 39%)   — Badge dot, border, icon
  BG:        #F0FDF4     hsl(140, 74%, 97%)   — Card bg, row bg
  BORDER:    #BBF7D0     hsl(141, 84%, 85%)   — Alert card border
  TEXT:      #166534     hsl(143, 64%, 20%)   — Label text on light bg
  ICON:      CheckCircle

NEUTRAL
  DEFAULT:   #6B7280     hsl(220, 9%, 46%)    — Badge dot, border, icon
  BG:        #F9FAFB     hsl(210, 17%, 98%)   — Card bg
  BORDER:    #E5E7EB     hsl(220, 13%, 91%)   — Border
  TEXT:      #6B7280     hsl(220, 9%, 46%)    — Label text
  ICON:      Minus
```

### 3.3 Surface & Background Colors

```
Background
  Page:           #F3F4F6 (Neutral 100)     — Main app background
  Sidebar:        #FFFFFF                    — Sidebar surface
  Modal Overlay:  rgba(0, 0, 0, 0.5)        — Modal backdrop

Surface (Cards, Panels)
  Card:           #FFFFFF                    — Default card background
  Card Hover:     #F9FAFB (Neutral 50)      — Card hover state
  Elevated:       #FFFFFF                    — Modals, dropdowns, tooltips
  Selected:       #E8EBFF (Primary Light)   — Selected rows, active filters
  Highlight:      #FFFBEB                    — Temporarily highlighted items

Surface Secondary (Table headers, section bg)
  Default:        #F9FAFB (Neutral 50)      — Table header, section background
  Hover:          #F3F4F6 (Neutral 100)     — Interactive row hover

Border
  Default:        #E5E7EB (Neutral 200)     — Card borders, dividers
  Strong:         #D1D5DB (Neutral 300)     — Focus ring, active border
  Critical:       #FECACA                    — Critical alert card border
  Selected:       #2B42F5 (Primary)         — Selected/focused border
```

### 3.4 Text Colors

```
Text Primary:     #111827 (Neutral 900)     — Headings, body text
Text Secondary:   #4B5563 (Neutral 600)     — Descriptions, card subtitles
Text Tertiary:    #6B7280 (Neutral 500)     — Captions, metadata, timestamps
Text Quaternary:  #9CA3AF (Neutral 400)     — Placeholder, disabled
Text Inverse:     #FFFFFF                   — Text on primary/dark backgrounds
Text Link:        #2B42F5 (Primary)         — Hyperlinks (passes AA on white)
Text Link Hover:  #1A2DE0 (Primary Hover)   — Link hover state
```

### 3.5 Severity Color Usage Rules

| Rule | Rationale |
|------|-----------|
| Severity colors are **only** used for risk/severity indicators | Using red for anything other than critical risk dilutes its meaning |
| Icon + color + text label on every severity badge | Color-blind users and screen readers must receive the same signal |
| Background tint severity colors (e.g., `CRITICAL.BG`) only on cards/rows containing risk data | Tinting the entire page in red for a single critical alert is overwhelming |
| Never use severity colors for decorative elements | Buttons, borders on non-risk cards, and accent UI use brand colors, not severity |
| Severity colors must maintain WCAG AA on white background | `CRITICAL.TEXT (#991B1B)` on `CRITICAL.BG (#FEF2F2)` = 8.3:1 contrast ratio |

### 3.6 Dark Mode Considerations

Dark mode is a P2 feature. When implemented:

```
Dark Bg:          #111827 (Neutral 900)     — Page background
Dark Surface:     #1F2937 (Neutral 800)     — Card background
Dark Border:      #374151 (Neutral 700)     — Borders
Dark Text:        #F3F4F6 (Neutral 100)    — Primary text
Dark Text Muted:  #9CA3AF (Neutral 400)    — Secondary text
```

Severity colors in dark mode invert the light/dark relationship:
- `CRITICAL.DEFAULT` remains `#E02525`
- `CRITICAL.BG` becomes `rgba(224, 37, 37, 0.15)` — tinted dark surface

---

## 4. Typography System

### 4.1 Font Stack

```
Headings & Body:    Inter (sans-serif)
Data & Code:        JetBrains Mono (monospace)
```

Both loaded from Google Fonts. Inter is used across the entire UI — no secondary heading font. JetBrains Mono is used exclusively for data display (event IDs, JSON payloads, log entries, token heatmap text, code blocks).

### 4.2 Type Scale

```
Display   36px / 44px  / 700  — Health score number, empty state hero
H1        24px / 32px  / 600  — Page titles
H2        18px / 24px  / 600  — Section headers, modal titles
H3        15px / 20px  / 500  — Card titles, panel headers
Body      14px / 20px  / 400  — Standard content text
Body Bold 14px / 20px  / 600  — Emphasis in body, table cell values
Small     12px / 16px  / 400  — Metadata, timestamps, captions
Small Bold12px / 16px  / 600  — Badge labels, metric values
Label     13px / 16px  / 500  — Form labels, sidebar items
Mono      13px / 20px  / 400  — Event IDs, code, JSON, token text
Mono Small11px / 16px  / 500  — Audit log hashes, hex values
```

### 4.3 Usage Rules

| Where | Use | Size | Weight |
|-------|-----|------|--------|
| Page title | H1 | 24px | 600 |
| Section heading inside page | H2 | 18px | 600 |
| Card / panel title | H3 | 15px | 500 |
| Card body content | Body | 14px | 400 |
| Table cell content | Body | 14px | 400 |
| Table header | Small + uppercase | 12px | 600 |
| Badge text | Small Bold | 12px | 600 |
| Event ID | Mono | 13px | 400 |
| Risk score | Display | 36px | 700 |
| Sidebar item | Label | 13px | 500 |
| Description, subtitle | Body Secondary | 14px | 400 |
| Timestamp | Small | 12px | 400 |
| Form label | Label | 13px | 500 |
| Form input value | Body | 14px | 400 |
| Toast notification | Body | 14px | 400 |
| Chart axis labels | Small | 12px | 400 |
| Chart tooltip | Small | 12px | 500 |

### 4.4 Line Length

| Container | Max Width | Rationale |
|-----------|-----------|-----------|
| Dashboard cards | Content-dependent | Cards expand to fill grid cells |
| Detail panels (investigation)  | 720px | Optimized for scanability at ~14 chars/inch |
| Modal content | 480px | Comfortable reading width |
| Table cells | Content-dependent | Truncated with tooltip on overflow |
| Empty state | 420px | Focused, readable CTA |

### 4.5 Type Color by Hierarchy

```
Level 1 (Headlines, health score, primary metrics): Text Primary
Level 2 (Section titles, card titles):              Text Primary
Level 3 (Body, form labels, table cells):           Text Primary
Level 4 (Descriptions, card subtitles):             Text Secondary
Level 5 (Metadata, timestamps, badges):             Text Tertiary
Level 6 (Placeholder, disabled):                    Text Quaternary
```

---

## 5. Spacing System

### 5.1 Base Unit: 4px

All spacing is derived from a 4px base unit. This ensures visual rhythm across all components.

```
0:    0px
1:    4px     — Micro spacing (icon padding, badge internal)
2:    8px     — Tight spacing (icon-text gap, badge padding)
3:    12px    — Compact spacing (button padding, table cell padding)
4:    16px    — Standard spacing (card padding, form field gap)
5:    20px    — Generous spacing (card title to body gap)
6:    24px    — Section spacing (cards in grid, panel gaps)
8:    32px    — Component spacing (sidebar width, page padding)
10:   40px    — Module spacing (page sections)
12:   48px    — Page spacing (page title to content)
16:   64px    — Large page spacing (empty state hero)
20:   80px    — Maximum spacing (marketing sections)
```

### 5.2 Spacing Usage Map

```
Page Level
  Page padding (desktop):          24px (6)
  Page padding (tablet):           16px (4)
  Section margin bottom:           32px (8)
  Page title to content gap:       24px (6)
  Breadcrumb to title gap:         4px (1)

Card Level
  Card padding:                    16px (4)
  Card title to body:              12px (3)
  Card body internal gap:          16px (4)
  Card to card gap (grid):         16px (4)
  Card icon to text:               8px (2)

Table Level
  Table cell padding (default):    8px 12px (2, 3)
  Table cell padding (compact):    4px 8px (1, 2)
  Header to first row gap:         0px (border-bottom)
  Table to pagination:             16px (4)
  Row height (default):            44px
  Row height (compact):            36px

Form Level
  Label to input:                  4px (1)
  Input to hint/error:             4px (1)
  Form field group gap:            20px (5)
  Form section to section:         32px (8)
  Submit button to form end:       24px (6)

List Level
  List item padding:               10px 16px (2.5, 4)
  List item to item:               0px (border separator)
  Icon to text in list:            12px (3)

Sidebar Level
  Sidebar width (expanded):        240px
  Sidebar width (collapsed):       64px
  Nav item padding:                10px 16px (2.5, 4)
  Nav icon to label gap:           12px (3)
  Nav section gap:                 8px (2)
  Nav section label:               8px 16px 4px (2, 4, 1)
```

### 5.3 Spacing Scale Rationale

| Why 4px base? | Enterprise tools require dense layouts. 8px base forces too much space. 4px allows both tight (8px) and generous (24px) from the same scale. |
|---------------|-------------------------------------------------------------------------------------------------------------------------------------------------|
| Why 10px for list items? | Matches the visual center between 8px (too tight) and 12px (too loose) for row content. 4px scale allows 8→12 stepping. |
| Why odd numbers? | We avoid them. The 4px base ensures all spacing is even. 10px appears in the spec as "2.5 units" but should be 10px, not 12px, for list density. Implementation: use `p-2.5` in Tailwind. |

---

## 6. Layout System

### 6.1 Breakpoints

```
Desktop:   >1200px    — Full experience
Tablet:    768-1200px — Collapsible sidebar, adjusted grid
Mobile:    <768px     — Single column, bottom nav, hidden sidebar
```

### 6.2 Desktop Layout

```
┌──────────────────────────────────────────────────────────────┐
│ TOP NAV (56px)                                                │
│ (empty on desktop — all nav in sidebar)                       │
├────────┬─────────────────────────────────────────────────────┤
│        │                                                      │
│ SIDE   │  CONTENT (flex-grow)                                 │
│ BAR    │                                                      │
│ 240px  │  ┌──────┐ ┌──────┐ ┌──────┐                        │
│        │  │ Card │ │ Card │ │ Card │                        │
│        │  └──────┘ └──────┘ └──────┘                        │
│        │                                                      │
│        │  ┌──────────────────────────────────────────────┐   │
│        │  │  Primary content area                         │   │
│        │  │  (list, chart, detail panel)                  │   │
│        │  └──────────────────────────────────────────────┘   │
│        │                                                      │
└────────┴──────────────────────────────────────────────────────┘
```

### 6.3 Tablet Layout

```
┌─────────────────────────────────────────────────────┐
│ TOP NAV (56px)                                       │
│ [☰] Breadcrumb                    Search  Profile   │
├─────────────────────────────────────────────────────┤
│                                                       │
│ CONTENT (full width)                                  │
│                                                       │
│ ┌──────┐ ┌──────┐                                    │
│ │ Card │ │ Card │                                    │
│ └──────┘ └──────┘                                    │
│                                                       │
│ ┌────────────────────────────────────────────────┐   │
│ │  Primary content                                │   │
│ └────────────────────────────────────────────────┘   │
│                                                       │
└─────────────────────────────────────────────────────┘
```

Sidebar collapses to icon-only tray. Hover or click hamburger expands it as a floating panel over content.

### 6.4 Mobile Layout

```
┌──────────────────────────────────┐
│ TOP NAV (56px)                    │
│ [☰] SentinelAI          Profile  │
├──────────────────────────────────┤
│                                   │
│ CONTENT (single column)           │
│                                   │
│ ┌────────────────────────────┐   │
│ │  Card (full width)         │   │
│ └────────────────────────────┘   │
│                                   │
│ ┌────────────────────────────┐   │
│ │  Card (full width)         │   │
│ └────────────────────────────┘   │
│                                   │
│ ┌────────────────────────────┐   │
│ │  Primary content           │   │
│ └────────────────────────────┘   │
│                                   │
├──────────────────────────────────┤
│ BOTTOM NAV (56px)                 │
│ [Dashboard] [Models] [Alerts] [+] │
└──────────────────────────────────┘
```

### 6.5 Grid System

```
Dashboard grid:    12 columns (desktop), 6 columns (tablet), 1 column (mobile)
  ─ Full width:    col-span-12
  ─ Half width:    col-span-6
  ─ Third width:   col-span-4
  ─ Quarter:       col-span-3

Card grid:         Auto-fill with min-width
  ─ Metric cards:  minmax(240px, 1fr)
  ─ Model cards:   minmax(280px, 1fr)
  ─ Integration:   minmax(320px, 1fr)

Detail layout:     3-column investigation (desktop)
  ─ Timeline:      280px (fixed left panel)
  ─ Content:       flex-grow (center)
  ─ Recommends:    300px (fixed right panel, scroll)
```

### 6.6 Card Spacing

```
Desktop grid gap:  16px (4)
Tablet grid gap:   16px (4)
Mobile grid gap:   12px (3)

Dashboard cards (desktop):
  Row 1: [Health Score (full width)]
  Row 2: [Top Risks (6 cols)] [Active Alerts (6 cols)]
  Row 3: [Trend Chart (8 cols)] [Recent Events (4 cols)]
```

---

## 7. Navigation System

### 7.1 Sidebar Behavior

```
Desktop (expanded, 240px):
  ┌──────────────────────┐
  │  Logo + Product Name │  32px logo + 16px gap
  │                      │
  │  ▸ Dashboard         │  Active: brand primary left border + bg tint
  │    Models            │  Inactive: text secondary
  │    Risk Events       │  Icon (20x20) + label (12px gap)
  │    Investigations    │
  │  ──────────────────  │  1px border separator
  │    Audit Logs        │
  │    Analytics         │
  │    Policies          │  Hidden for compliance role
  │  ──────────────────  │
  │    API Usage         │  Hidden for viewer, compliance
  │    Team              │  Hidden for viewer, compliance
  │    Settings          │
  │                      │
  │  ──────────────────  │
  │  ⚡ Help & Support   │  Bottom section (secondary nav)
  │  ★ Changelog         │
  └──────────────────────┘

Collapsed (64px):
  ┌──────┐
  │  L   │   Logo only (24x24)
  │      │
  │  ◑   │   Icons only (20x20)
  │  □   │   Hover → floating tooltip with label
  │  ◎   │
  └──────┘
```

### 7.2 Top Navigation

Desktop top nav contains only:

```
┌──────────────────────────────────────────────────────────────┐
│                         [empty]         [Cmd+K Search] [🔔] [👤] │
└──────────────────────────────────────────────────────────────┘
```

On tablet/mobile, top nav gains:

```
┌──────────────────────────────────────────────────────────────┐
│ [☰] [Workspace: Acme ▾] > Analytics > Trends    [Cmd+K] [🔔] [👤] │
└──────────────────────────────────────────────────────────────┘
```

### 7.3 Workspace Selector

| Feature | Detail |
|---------|--------|
| Trigger | Click workspace name in breadcrumb area |
| Panel | Dropdown with search, list of workspaces |
| Each item | Workspace name, member count, active alert count |
| Action | Switch → full page reload (new session scope) |
| "All Workspaces" | Admin-only option for cross-workspace view |

### 7.4 Global Search (Cmd+K)

| Behavior | Detail |
|----------|--------|
| Trigger | `Cmd+K` (Mac) / `Ctrl+K` (Windows/Linux), or click search icon |
| Placement | Modal, centered, 640px width (desktop), full-screen (mobile) |
| Auto-focus | Search input focused on open |
| Results | Grouped by type: Models, Events, Policies, Settings |
| Empty | "No results found for [query]." |
| Recent | Recent searches shown before query (localStorage, max 5) |
| Navigation | ↓↑ arrows navigate results, Enter selects, Escape closes |

### 7.5 Notification Center

| Feature | Detail |
|---------|--------|
| Trigger | Bell icon in top nav |
| Badge | Unread count (red dot, number if >0) |
| Panel | Dropdown, 340px width, max 380px height |
| Empty | "No new notifications." |
| Items | Type icon + message + timestamp |
| Grouping | Critical first, then by recency |
| Actions | Mark read, View → navigate, Dismiss |
| Real-time | WebSocket pushes new notifications |

### 7.6 User Menu

| Feature | Detail |
|---------|--------|
| Trigger | Avatar (24x24) with fallback initials |
| Content | Name, email, Preferences, Theme toggle, Keyboard shortcuts, Sign out |

---

## 8. Dashboard Components

### 8.1 Risk Health Score Card

**Purpose:** Hero metric that answers "should I be worried?" in under 5 seconds.

```
┌──────────────────────────────────────────────────────────────────┐
│                                                                   │
│   84                    ↑2 from last week                         │
│   ━━━━━━━━━━━━━━━━━━━━━━━━━                                      │
│   Your AI risk posture is healthy. 2 items need attention.       │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

| Property | Specification |
|----------|---------------|
| **Background** | Primary brand (`#2B42F5`) with gradient or solid |
| **Score** | Display (36px/700), white |
| **Label** | "AI Risk Health Score" (Small, 400, white 70% opacity) |
| **Trend** | ↑↓→ arrow + "X from last week" (Body, white 80%) |
| **Bar** | Horizontal progress bar, 100% width, lighter brand color |
| **Message** | "Your AI risk posture is [healthy / needs attention / critical]. [N] items need attention." |
| **Click** | Navigate to Analytics → Risk Trends |

**Color thresholds:**

| Score Range | Status | Bar Color |
|-------------|--------|-----------|
| 80-100 | Healthy | Green (`#1FAA5C`) |
| 50-79 | Needs attention | Warning (`#E88B1F`) |
| 0-49 | Critical | Critical (`#E02525`) |

**States:**

| State | Treatment |
|-------|-----------|
| Loading | Large skeleton rectangle, same dimensions |
| Error | Brand background + "Unable to load risk score. Data may be stale. [Refresh]" |
| Empty (no models) | "Connect your first model to see your AI risk posture. [Connect Model →]" |

### 8.2 Active Alerts Card

**Purpose:** Show current alert volume by severity.

```
┌──────────────────────────────┐
│  Active Alerts               │  H3 title
│                              │
│  🔴 Critical           2     │  Red dot + count
│  🟡 Warning            5     │  Yellow dot + count
│  🔵 Info               12    │  Blue dot + count
│                              │
│  [View All →]                │  Link to /risk-events
└──────────────────────────────┘
```

| Property | Specification |
|----------|---------------|
| **Layout** | Card, 1/3 width (desktop) |
| **Title** | H3, text primary |
| **Severity rows** | Dot (8x8) + severity label (Body) + count (Body Bold), 16px row height |
| **View All** | Text link, primary color |
| **Background** | White card on page bg |

**States:**

| State | Treatment |
|-------|-----------|
| Loading | 3 skeleton rows |
| Empty | "No active alerts. Everything looks good." with success icon |
| Zero critical | Show just Warning and Info counts |

### 8.3 Top Risks Card

**Purpose:** Ranked list of the top 3 urgent risks.

```
┌─────────────────────────────────────────────────┐
│  Top Risks                                       │  H3 title
│                                                  │
│  1.  🔴 Prompt injection spike                  │  Rank + severity icon + title
│      ↑ 340% in 24h  ·  gpt-4-prod              │  Delta + model
│                                                  │
│  2.  🟡 Drift in embeddings-v2                  │
│      1.8σ above baseline  ·  embeddings-prod    │
│                                                  │
│  [Review All Risks →]                            │
└─────────────────────────────────────────────────┘
```

| Property | Specification |
|----------|---------------|
| **Layout** | Card, 1/3 width (desktop) |
| **Rank** | Number (Text Tertiary, Small) |
| **Title** | Severity icon + title (Body Bold) |
| **Meta** | Delta + model (Small, Text Tertiary) |
| **Max items** | 3, with "Review All Risks →" link |
| **Click item** | Navigate to investigation for that event |

**States:**

| State | Treatment |
|-------|-----------|
| Loading | 3 skeleton rows |
| Empty | "No risks detected in the last 24 hours." with shield icon |
| <3 risks | Show available items, reduce "View All" → "View [N] Risks" |

### 8.4 Risk Trend Chart

**Purpose:** 7-day aggregated risk score trend.

```
┌─────────────────────────────────────────────────┐
│  7-Day Risk Trend                    Last 7 days │  H3 + Small description
│                                                  │
│  100 ┊                                          │
│      ┊        ╱╲                                 │
│   80 ┊      ╱╱  ╲╲     ╱╲                       │
│      ┊     ╱      ╲   ╱  ╲                      │  Observable Plot line chart
│   60 ┊    ╱        ╲ ╱    ╲                     │  Brand color line
│      ┊   ╱          ╲      ╲╱                    │  Gradient area fill
│   40 ┊  ╱                                      │
│      ┊ ╱                                       │
│   20 ┊╱                                        │
│      ┊                                         │
│    0 ┊──────────────────────────────────        │
│      M   T   W   T   F   S   S                 │
│                                                  │
│  [View Full Analytics →]                         │
└─────────────────────────────────────────────────┘
```

| Property | Specification |
|----------|---------------|
| **Layout** | Card, 2/3 width (desktop) |
| **Chart type** | Line chart with area fill |
| **Line color** | Brand primary (`#2B42F5`) |
| **Area fill** | Brand primary at 10% opacity |
| **Hover** | Tooltip with date + score |
| **Y axis** | 0-100, 3-4 tick marks |
| **X axis** | Day labels (M, T, W, T, F, S, S) |

**States:**

| State | Treatment |
|-------|-----------|
| Loading | Skeleton chart area (gray rectangle with wave) |
| Empty | "Insufficient data. Baseline requires 7 days of monitoring." |
| Partial | Show available days, gray out missing |

### 8.5 Recently Resolved Card

**Purpose:** Show recent activity to build trust that the system is working.

```
┌─────────────────────────────────────────────────┐
│  Recently Resolved                  3 open      │  H3 + Small counter
│                                                  │
│  ✓ PII leak — blocked @ 14:22                  │  Success icon + event + action + time
│  ✓ Rate limit — resolved @ 12:10               │
│  ✓ Config drift — reverted @ 09:45             │
│                                                  │
│  Avg MTTR: 12m                                   │  Small, Text Tertiary
│                                                  │
│  [View All →]                                    │
└─────────────────────────────────────────────────┘
```

| Property | Specification |
|----------|---------------|
| **Layout** | Card, full-width bottom section |
| **Items** | Icon (success green) + event name (Body) + action (Body, text tertiary) + time (Small, text quaternary) |
| **Open count** | "N open incidents" pill next to title |
| **MTTR** | Average mean-time-to-resolve metric |

**States:**

| State | Treatment |
|-------|-----------|
| Loading | 5 skeleton rows |
| Empty | "No resolved events yet. Events will appear here after they're processed." |
| No MTTR | Hide MTTR line |

### 8.6 Status Badge

**Purpose:** Compact label for model status, event status, connection status.

```
[CRITICAL]      // Red bg + red text + alert triangle icon
[WARNING]       // Amber bg + amber text + alert circle icon
[INFO]          // Blue bg + blue text + info icon
[HEALTHY]       // Green bg + green text + check icon
[INACTIVE]      // Gray bg + gray text + minus icon
[PENDING]       // Gray bg + gray text + clock icon
```

| Property | Specification |
|----------|---------------|
| **Layout** | Inline flex, icon + label, rounded-full |
| **Padding** | 4px 8px (icon+text), 4px 4px (icon only) |
| **Font** | Small Bold (12px/600) |
| **Icon** | 12x12, matching severity color |
| **Border radius** | 9999px (pill) |

### 8.7 Metric Widget

**Purpose:** Compact KPI display for dashboards (model risk, alert count, MTTR).

```
┌────────────────────┐
│  MTTR              │  Label (Small, Text Tertiary, uppercase)
│                    │
│  12m               │  Value (Display size on blue, Body otherwise)
│                    │
│  ↓ 8% from last   │  Trend (Small, color-coded)
│  week              │
└────────────────────┘
```

| Property | Specification |
|----------|---------------|
| **Layout** | Compact card, ~200px width |
| **Value size** | H2 (18px) for most, Display (36px) for hero metric |
| **Trend** | Small, green if improving, red if worsening |
| **Color** | Text Primary for value, Text Tertiary for label |

### 8.8 Recommendation Card

**Purpose:** Suggest an action based on event context.

```
┌─────────────────────────────────────────────────┐
│  💡 Recommendation                               │  H3
│                                                  │
│  Block 'ignore previous' pattern                │  Title (Body Bold)
│  47 events would have been prevented last week  │  Impact estimate (Small)
│  Confidence: 94%                                 │  Confidence badge
│                                                  │
│  [Apply] [View Events] [Dismiss]                 │  Actions
└─────────────────────────────────────────────────┘
```

| Property | Specification |
|----------|---------------|
| **Layout** | Card with subtle brand left border (2px) |
| **Icon** | Lightbulb or action-specific icon |
| **Primary action** | Primary button (brand) |
| **Secondary** | Ghost buttons |

### 8.9 Alert Banner

**Purpose:** Persistent notification at the top of a page for system-wide alerts.

```
┌──────────────────────────────────────────────────────────────────┐
│  🛡️  No models registered. Connect your first model to start     │
│  monitoring AI risk.                         [Connect Model →]   │
└──────────────────────────────────────────────────────────────────┘
```

| Property | Specification |
|----------|---------------|
| **Layout** | Full-width banner below top nav |
| **Variants** | Info (blue), Warning (amber), Error (red), Success (green) |
| **Icon** | Left-aligned, severity-matching icon |
| **Action** | Right-aligned CTA button |
| **Dismiss** | × button in top-right (if dismissible) |
| **Height** | 48px standard, 64px with secondary text |

---

## 9. Investigation Components

### 9.1 Incident Timeline

**Purpose:** Chronological event sequence for root cause analysis.

```
┌─── Timeline ───────────────────────────────────────── 280px ──┐
│  Timeline                                    1h │6h │24h │7d   │  Header + zoom controls
│                                                                  │
│  ┌──────────────────────────────────────────────┐               │
│  │ ●  Prompt Injection Detected                 │  Event node   │
│  │    gpt-4-prod · score: 0.94                  │  Red dot + detail
│  │    14:22:03                                  │  Timestamp
│  ├──────────────────────────────────────────────┤               │
│  │ ○  Similar Event (#023)                      │  Similar event
│  │    same model · score: 0.87                  │  Yellow dot
│  │    12:30:00                                  │
│  ├──────────────────────────────────────────────┤               │
│  │ ○  Model Deployed v2.4.1                     │  Deployment event
│  │    gpt-4-prod                                 │  Green dot
│  │    14:15:00                                  │
│  ├──────────────────────────────────────────────┤               │
│  │ ○  Baseline Threshold Updated                │  Config change
│  │    injection threshold: 0.9 → 0.85           │  Blue dot
│  │    10:00:00                                  │
│  └──────────────────────────────────────────────┘               │
│                                                                  │
│  ◀ Now                                                        │  Now indicator (dashed)
└──────────────────────────────────────────────────────────────────┘
```

| Property | Specification |
|----------|---------------|
| **Width** | 280px fixed (desktop), full width (mobile) |
| **Event dots** | 12px diameter, color-coded: red=risk, yellow=similar, green=deploy, blue=config, gray=disposition |
| **Vertical line** | 2px, Neutral 200, connecting all dots |
| **Zoom controls** | 1h, 6h, 24h, 7d — changes visible window |
| **Scroll** | Vertical scroll for long timelines |
| **Click** | Any event navigates to that event/detail |
| **Hover** | Slight background tint on row |
| **Now** | Dashed line across timeline, labeled "Now" |

### 9.2 Evidence Panel

**Purpose:** One-click evidence package generation for incident reports.

```
┌─── Evidence Package ─────────────────────────────────────────────┐
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  📄 Evidence Package                                    │    │
│  │                                                          │    │
│  │  Event: EVT-001                                         │    │
│  │  Model: gpt-4-prod                                      │    │
│  │  Timestamp: 22 Jun 2026, 14:22:03 UTC                   │    │
│  │                                                          │    │
│  │  Included: Event JSON, Token Attribution, Timeline,     │    │
│  │            Related Events (3), Disposition History       │    │
│  │                                                          │    │
│  │  Signed: True · SHA-256: a3f8...c2d1                    │    │
│  │                                                          │    │
│  │  [Download JSON + Manifest] [Copy Share Link]            │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

| Property | Specification |
|----------|---------------|
| **Layout** | Card, full-width within investigation panel |
| **Signed badge** | Green checkmark if manifest signed, icon |
| **Manifest hash** | Mono small (11px), truncated with tooltip |
| **Actions** | Primary button (Download), ghost button (Copy) |

### 9.3 Root Cause Analysis Card

**Purpose:** Summarize the primary contributing factors of a risk event.

```
┌─── Root Cause Analysis ──────────────────────────────────────────┐
│                                                                  │
│  Primary Cause: Prompt Injection                                 │
│  Confidence: 94%                                                 │
│                                                                  │
│  Top Contributing Tokens:                                        │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  "ignore"    ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 0.45       │    │
│  │  "previous"  ━━━━━━━━━━━━━━━━━━━━━━━━━━━ 0.30           │    │
│  │  "system"    ━━━━━━━━━━━━━━━━ 0.19                       │    │
│  │  "override"  ━━━━━━━━ 0.12                               │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  Feature Importance:                                             │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  Instruction Count      ━━━━━━━━━━━━━━━━━━━ 65%         │    │
│  │  Special Character %    ━━━━━━━ 12%                      │    │
│  │  Input Length           ━━━ 8%                           │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

| Property | Specification |
|----------|---------------|
| **Bar** | Horizontal bar chart, brand primary fill, text label left |
| **Value** | Right-aligned, mono font |
| **Confidence** | Pill badge next to cause label |
| **Max items** | Top 5 tokens + top 3 features |

### 9.4 Token Heatmap

**Purpose:** Visualize which tokens contributed most to a risk score.

```
┌─── Token Heatmap ────────────────────────────────────────────────┐
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  ignore      previous    instructions   and    replace  │    │
│  │  █████████   ████████    ██████        ██     ████     │    │
│  │  system      prompt      content       with   user     │    │
│  │  ███████     ████        ███           █      ██       │    │
│  │  data        .            end           text            │    │
│  │  █           ░            ░            ░                │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  Legend:  ██ High Risk    ██ Medium    ██ Low    ░░ Neutral      │
│                                                                  │
│  Hover any token: "ignore — contribution: 0.45 — injection"     │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

| Property | Specification |
|----------|---------------|
| **Layout** | Grid of token cells, word-wrap layout |
| **Cell** | Background color from score: red (0.7-1.0), amber (0.4-0.7), blue (0.1-0.4), transparent (<0.1) |
| **Text** | Mono font, 13px, white on dark cells, dark on light cells |
| **Hover** | Tooltip: token text, contribution score, risk category |
| **Legend** | Color scale bar, 4 stops |
| **Implementation** | Custom div-grid, not a chart library |

### 9.5 Audit History Viewer

**Purpose:** Show immutable audit trail for a specific event or model.

```
┌─── Audit Trail ──────────────────────────────────────────────────┐
│                                                                  │
│  Chain: ✅ Verified (12 entries)                                 │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  14:22:05  Maya      Disposition    Blocked pattern     │    │
│  │  14:22:04  System    Alert Created  auto-escalated      │    │
│  │  14:15:00  Maya      Model Deploy   v2.4.1 → prod      │    │
│  │  10:00:00  System    Threshold      injection: 0.9→0.85│    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  [Export CSV] [Verify Chain]                                     │
└──────────────────────────────────────────────────────────────────┘
```

| Property | Specification |
|----------|---------------|
| **Chain badge** | Green checkmark + "Verified (N entries)" |
| **Row** | Timestamp (Mono small), Actor (avatar + name), Action (badge), Detail (text) |
| **Row gap** | 0px (compact, between border lines) |
| **Max visible** | 5 entries, "View all N entries →" |
| **Export** | CSV download of full audit trail |

---

## 10. Table Design System

### 10.1 Unified Table Structure

All tables in SentinelAI share the same visual system:

```
┌────────────────────────────────────────────────────────────────────┐
│  Header Row                                                        │
│  ┌─────────┬──────────┬──────────┬──────────┬──────────┬────────┐ │
│  │ Event   │ Severity │ Risk     │ Model    │ Timestamp│ Status │ │
│  │ ID ▾    │          │ Type     │          │          │        │ │
│  ├─────────┼──────────┼──────────┼──────────┼──────────┼────────┤ │
│  │ EVT-001 │ 🔴 CRI   │ Inject   │ gpt-4   │ 14:22:03 │ Active │ │
│  │ EVT-002 │ 🟡 WARN  │ PII      │ claude   │ 12:10:00 │ Active │ │
│  │ EVT-003 │ 🔵 INFO  │ Drift    │ gpt-4   │ 08:30:00 │ Done   │ │
│  └─────────┴──────────┴──────────┴──────────┴──────────┴────────┘ │
│                                                                    │
│  Pagination:  [<]  1  2  3  ...  12  [>]   25 / page ▾     │
└────────────────────────────────────────────────────────────────────┘
```

| Property | Specification |
|----------|---------------|
| **Header bg** | Neutral 50 (`#F9FAFB`) |
| **Header text** | Small (12px), 600 weight, uppercase, Text Tertiary |
| **Header sort** | Clickable, sort icon (▾ ascending, ▴ descending, ⇅ unsorted) |
| **Row bg** | White (`#FFFFFF`), alternating row = Neutral 50 (optional for dense tables) |
| **Row hover** | Neutral 50 on non-selected, Primary Light on selected |
| **Row height** | 44px (default), 36px (compact) |
| **Cell padding** | 8px 12px (default), 4px 8px (compact) |
| **Border** | 1px bottom, Neutral 200 (`#E5E7EB`) |
| **Selected row** | Primary Light (`#E8EBFF`) background + primary left border (3px) |
| **Border radius** | 8px on table wrapper |

### 10.2 Column Types

```
Text:             Body (14px/400), Text Primary
Monospace:        Mono (13px), Text Primary — event IDs, hashes
Numeric:          Right-aligned, Mono (13px), Text Primary — scores, counts
Severity Badge:   Icon + label (Small Bold), severity-colored
Status Badge:     Pill badge, color-coded
Timestamp:        Small (12px), Text Tertiary. Relative + tooltip with absolute
Actions:          Icon buttons or small ghost buttons
Checkbox:         For bulk selection (always first column)
```

### 10.3 Risk Events Table Columns

```
☐        Checkbox (bulk select)
Event ID  EVT-001 (Mono, link-style clickable)
Severity  Badge: CRITICAL / WARNING / INFO / HEALTHY
Risk Type Badge: Injection, PII, Drift, Toxicity, Jailbreak (color by type category)
Risk Score Score bar (0-1, color-coded), e.g., 0.94  ████████░░
Model     Model name + environment badge (Production/Staging)
Timestamp 14:22 (relative) — tooltip shows full ISO
Status    Badge: Active / Resolved / Dismissed / Escalated
Actions   [Investigate] [▸] (kebab menu with quick disposition)
```

### 10.4 Audit Logs Table Columns

```
Timestamp 14:22:03 (Mono small)
Actor     Avatar + name
Action    Badge: Created / Updated / Deleted / Configured
Resource  Model name, policy name, setting name
Details   Truncated summary of change
Hash      a3f8...c2d1 (Mono small, tooltip with full hash)
```

### 10.5 Analytics Model Breakdown Table

```
Model Name    gpt-4-prod
Environment   Badge: Production
Avg Score     0.42 (with color bar)
Alert Count   147 (with severity breakdown: ●12 ●45 ○90)
Change        ↑ 12% from last period (color-coded)
Last Event    22m ago (relative)
```

### 10.6 Table Features

| Feature | Behavior |
|---------|----------|
| **Sorting** | Click header to sort. Shift+click for multi-column sort. Sort indicator shows direction. |
| **Filtering** | Column header dropdown filter. Input for text, multi-select for enums, date picker for timestamps. |
| **Search** | Global search above table. Searches across visible columns. |
| **Pagination** | Bottom of table: Previous/Next buttons, page numbers, page size selector (25, 50, 100). |
| **Bulk selection** | Checkbox in first column. Header checkbox selects all (current page). |
| **Column visibility** | Dropdown to toggle columns on/off. Persisted in localStorage per table. |
| **Row click** | Click row (not actions) navigates to detail. Cmd+click opens in new tab. |
| **Row selection** | Click checkbox to select. Selected row highlighted with primary border. |
| **Empty** | "No results found." with optional clear filters button. |
| **Loading** | Skeleton rows (8) matching table structure. |
| **Error** | "Failed to load data. [Retry]" inline in table area. |

---

## 11. Form System

### 11.1 Input Field

```
┌──────────────────────────────────────────────────────────────────┐
│  Label                                                            │  Label (13px/500, Text Primary)
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  Input value                                                │  │  Body (14px/400), border Neutral 300
│  └────────────────────────────────────────────────────────────┘  │
│  Hint text for guidance                                           │  Small (12px), Text Tertiary
└──────────────────────────────────────────────────────────────────┘

Error state:
┌──────────────────────────────────────────────────────────────────┐
│  Label                                                            │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  Input value                                           ⚠️  │  │  Border Critical DEFAULT
│  └────────────────────────────────────────────────────────────┘  │
│  This field is required                                           │  Small (12px), Critical TEXT
└──────────────────────────────────────────────────────────────────┘

Disabled state:
┌──────────────────────────────────────────────────────────────────┐
│  Label                                                            │  Text Quaternary
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  Disabled value                                          🔒 │  │  bg Neutral 100, opacity 50%
│  └────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

| Property | Value |
|----------|-------|
| **Height** | 40px (md), 32px (sm) |
| **Padding** | 10px 12px (md), 6px 8px (sm) |
| **Border** | 1px Neutral 300, 6px radius |
| **Focus** | 2px brand primary ring, offset 2px |
| **Error** | 1px Critical DEFAULT border + error icon |
| **Disabled** | Neutral 100 bg, Text Quaternary, locked icon |
| **Placeholder** | Text Quaternary |

### 11.2 Select / Dropdown

```
┌──────────────────────────────────────────────────────────────────┐
│  Label                                                            │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  Selected option                                       ▾  │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  Option 1                                              ✓  │  │  Selected: Primary Light bg, checkmark
│  │  Option 2                                                │  │
│  │  Option 3                                                │  │  Hover: Neutral 100
│  │  ──────────────────────────────────────────────────────  │  │  Separator
│  │  Option 4 (grouped)                                      │  │
│  └────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

| Property | Value |
|----------|-------|
| **Dropdown width** | Matches trigger width (min 200px) |
| **Max height** | 320px, scroll with shadow |
| **Option padding** | 10px 12px |
| **Selected** | Primary Light bg, brand checkmark |
| **Hover** | Neutral 100 bg |
| **Separator** | 1px Neutral 200 |
| **Search inside** | Optional search input at top for >10 items |
| **Multi-select** | Checkbox on left of each option |

### 11.3 Date Range Picker

```
┌──────────────────────────────────────────────────────────────────┐
│  [Last 7 days ▾]        or   [📅 From] ── [📅 To]               │
│                                                                   │
│  Presets: [Last 24h] [Last 7d] [Last 30d] [Last 90d] [Custom ▸] │
└──────────────────────────────────────────────────────────────────┐
```

| Property | Value |
|----------|-------|
| **Presets** | 24h, 7d, 30d, 90d — always visible as tabs |
| **Custom** | "Custom" tab reveals start/end date inputs |
| **Format** | ISO 8601 display: "22 Jun 2026" |
| **Validation** | End must be after start. Max range: 365 days. |

### 11.4 Search Field

```
┌──────────────────────────────────────────────────────────────────┐
│  🔍  Search events by ID or input text...                   ⌘K  │
└──────────────────────────────────────────────────────────────────┘
```

| Property | Value |
|----------|-------|
| **Icon** | Search icon left, 16x16 |
| **Hint** | "Search by ID or input text..." |
| **Shortcut** | /Cmd+K indicator right |
| **Clear** | × appears when text is entered |
| **Debounce** | 300ms before search fires |

### 11.5 Validation Patterns

| Pattern | Timing | Behavior |
|---------|--------|----------|
| **Inline** | On blur | Validate single field, show error below input |
| **On submit** | Form submit | Validate all fields, scroll to first error |
| **Debounced** | While typing | For async validation (endpoint uniqueness), 500ms debounce |
| **Required** | Asterisk on label | "This field is required" on empty blur |
| **Format** | Regex or zod | Email, URL, HEX color, etc. |
| **Async** | Debounced API call | "Endpoint validated ✓" or "Connection failed" |

---

## 12. Empty States

### 12.1 Design Pattern

Every empty state follows this structure:

```
┌──────────────────────────────────────────────────────────────────┐
│                        🛡️  (64x64 icon)                         │
│                                                                   │
│                    Title (H1, centered)                          │
│                                                                   │
│            Description explaining what to do next.               │
│            (Body, Text Secondary, centered, max 420px)           │
│                                                                   │
│                    [Primary CTA →]                               │
│                                                                   │
│            Secondary text or link (Small, Text Tertiary)         │
└──────────────────────────────────────────────────────────────────┘
```

### 12.2 Dashboard Empty State

```
┌──────────────────────────────────────────────────────────────────┐
│                                                                   │
│                          🛡️ Shield                               │
│                                                                   │
│                   Welcome to SentinelAI                          │
│                                                                   │
│            Your AI systems are unmonitored. Let's fix that.       │
│            Connect your first model to start seeing risk data.   │
│                                                                   │
│                    [Connect Your First Model →]                  │
│                                                                   │
│            📖 Follow our 5-minute setup guide                    │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

### 12.3 Risk Events Empty State

```
┌──────────────────────────────────────────────────────────────────┐
│                                                                   │
│                          ☑️ Check Circle                          │
│                                                                   │
│                    No risk events detected                        │
│                                                                   │
│            All models are operating within normal parameters.     │
│            Events will appear here when risk thresholds are      │
│            exceeded.                                              │
│                                                                   │
│                    [Configure Alert Thresholds →]                │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

### 12.4 Investigations Empty State

```
┌──────────────────────────────────────────────────────────────────┐
│                                                                   │
│                          🔍 Search                               │
│                                                                   │
│                    No active investigations                       │
│                                                                   │
│            Click on any risk event to start an investigation.     │
│            Investigations help you trace root causes and         │
│            gather evidence.                                       │
│                                                                   │
│                    [View Risk Events →]                          │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

### 12.5 Audit Logs Empty State

```
┌──────────────────────────────────────────────────────────────────┐
│                                                                   │
│                          📋 Clipboard                            │
│                                                                   │
│                    No audit log entries                           │
│                                                                   │
│            Audit logs will appear as you configure models,        │
│            policies, and settings. Every change is recorded       │
│            immutably for compliance and forensics.               │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

### 12.6 Analytics Empty State

```
┌──────────────────────────────────────────────────────────────────┐
│                                                                   │
│                          📊 Bar Chart                            │
│                                                                   │
│                    Insufficient data for trends                   │
│                                                                   │
│            Analytics require at least 7 days of monitoring data.  │
│            Trends, comparisons, and compliance reports will      │
│            become available as data accumulates.                 │
│                                                                   │
│                    [Return to Dashboard →]                       │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

### 12.7 Empty State Rules

| Rule | Explanation |
|------|-------------|
| Every data-display component must have an empty state | Tables, lists, charts, cards — all of them |
| Empty states must include a CTA | Tell the user what to do next |
| No raw "No data" messages | "No data" is never a terminal state |
| Icons are optional but recommended | They provide visual relief in an otherwise empty space |
| Maximum 420px content width | Prevents line-length issues on large screens |

---

## 13. Loading States

### 13.1 Skeleton Components

All data-fetching components display skeleton shapes that mirror the final layout:

```
Card Skeleton:            Table Skeleton:
┌──────────────────┐     ┌─────────────────────────────────┐
│ ████████████████  │     │ ████████  ██████  ██████  ████ │  Header row (shorter)
│ ██                │     │ ─────────────────────────────── │
│ ██████  ████      │     │ ████████  ██████  ██████  ████ │  Content row
│ ████    ████████  │     │ ████████  ██████  ██████  ████ │
└──────────────────┘     │ ████████  ██████  ██████  ████ │
                          └─────────────────────────────────┘
```

| Property | Specification |
|----------|---------------|
| **Color** | Neutral 100 (`#F3F4F6`) base, Neutral 200 (`#E5E7EB`) shimmer |
| **Animation** | Shimmer: gradient sweep left-to-right, 1.5s duration, ease-in-out |
| **Shape** | Matches content bounds. Text = rectangle, charts = rounded rect, avatars = circle |
| **Respect** | Respects `prefers-reduced-motion`: show static skeleton, no shimmer |

### 13.2 Component-Specific Skeletons

| Component | Skeleton |
|-----------|----------|
| HealthScoreCard | Full-width rectangle, 120px height, rounded-lg |
| ActiveAlertsCard | 3 skeleton lines, 16px height each, 8px gap |
| TopRisksCard | 3 skeleton items, each 48px height, with avatar circle + text lines |
| TrendChart | Rectangle with wave pattern, 240px height |
| Table | 8 skeleton rows with columns matching header widths |
| Card grid | 6 skeleton cards in responsive grid |
| Detail panel | Left skeleton (280px) + center skeleton (flex) |

### 13.3 Progress Indicators

```
Linear progress (determinate):
  ┌──────────────────────────────────────────────────────────────┐
  │  ████████████░░░░░░░░░░░░░░░░░  45%                         │
  └──────────────────────────────────────────────────────────────┘
  
Linear progress (indeterminate):
  ┌──────────────────────────────────────────────────────────────┐
  │  ████████░░░░░░░░░░████████░░░░░░░░░░░░████████░░░░░░░░░░  │
  └──────────────────────────────────────────────────────────────┘
```

| Usage | Type | Details |
|-------|------|---------|
| Report generation | Determinate | "Generating compliance report... 45%" |
| Baseline learning | Determinate | "Learning baseline... 7 of 14 days (50%)" |
| Page load | Indeterminate | Thin (2px) bar at top of content area |
| Async upload | Determinate | File upload progress |
| Bulk action | Indeterminate | "Disposing 12 events..." |

### 13.4 Chart Loading

Charts show a dedicated skeleton rather than a generic spinner:

```
Line chart skeleton:              Bar chart skeleton:
┌──────────────────────────────┐  ┌──────────────────────────────┐
│  ╱╲    ╱╲                    │  │  ██  ██                     │
│ ╱  ╲  ╱  ╲    ╱╲            │  │  ██  ██  ██                │
│╱    ╲╱    ╲  ╱  ╲  ╱╲      │  │  ██  ██  ██  ██            │
│            ╲╱    ╲╱  ╲     │  │  ██  ██  ██  ██  ██        │
│                     ╲╱      │  └──────────────────────────────┘
└──────────────────────────────┘
```

The skeleton shapes approximate the eventual chart data with randomized fake bars/lines at Neutral 100 with shimmer.

---

## 14. Error States

### 14.1 Error State Design

```
┌──────────────────────────────────────────────────────────────────┐
│                        ⚠️ Warning Triangle                       │
│                                                                   │
│                    Title describing the error                    │
│                                                                   │
│            Human-readable explanation of what went wrong.        │
│            Actionable suggestion for next steps.                 │
│                                                                   │
│                    [Retry]  [Contact Support]                    │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

### 14.2 Error Types

| Error Type | Title | Message | Actions |
|------------|-------|---------|---------|
| **API Error (5xx)** | "Failed to load data" | "The server encountered an error. Our team has been notified." | [Retry] |
| **Network Error** | "Connection lost" | "Could not reach SentinelAI. Check your network connection." | [Retry] [Check Status] |
| **Rate Limited** | "Too many requests" | "You've exceeded the rate limit. Try again in 30 seconds." | [Try Again] |
| **Permission Denied** | "Access denied" | "You don't have permission to access this resource. Contact your workspace admin." | [Request Access] [Go Back] |
| **Not Found (404)** | "Page not found" | "The page you're looking for doesn't exist or was moved." | [Go to Dashboard] |
| **Validation Error** | "Invalid input" | "Fix the highlighted fields and try again." | (inline field errors) |
| **Session Expired** | "Session expired" | "Your session has expired. Please sign in again." | [Sign In] |
| **Feature Unavailable** | "Feature unavailable" | "This feature is not available on your current plan. Upgrade to access it." | [View Plans] |

### 14.3 Inline Error States

For component-level errors (non-blocking):

```
┌─── Widget Title ───────────────────────────────────────────────┐
│                                                                  │
│  ⚠️  Failed to load widget data.                    [Retry]     │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

| Property | Specification |
|----------|---------------|
| **Layout** | Inline within card, preserves card dimensions |
| **Icon** | Warning severity icon |
| **Message** | "Failed to load [widget name]." |
| **Action** | Ghost button: "Retry" |
| **Non-blocking** | Error in one widget does not affect other widgets on the page |

### 14.4 Error Copy Guidelines

```
Structure: [WHAT] + [WHY] + [WHAT TO DO]

Good:
  "Couldn't save guardrail. The rule name 'Production Block' already exists.
   [Use a different name] or [Edit existing rule]"

Bad (too vague):
  "Error saving configuration. Please try again."

Good:
  "Connection to model endpoint failed. Endpoint timed out after 30s.
   [Check endpoint URL] or [Retry]"

Bad (too technical):
  "HTTP 503: Service Unavailable. upstream_connect_timeout exceeded."
```

---

## 15. Alert System

### 15.1 Toast Notifications

```
Success:
┌──────────────────────────────────────────────────────────────────┐
│  ✅ Guardrail created                                            │
│     Rule: IF injection_score > 0.9 THEN block                    │
│     Model: gpt-4-prod · Status: Active            [×]           │
│                                                                   │
│     [View Rule] [Test Rule]                                      │
│  ──────────────────────── Auto-dismiss in 6s ──────────────────  │
└──────────────────────────────────────────────────────────────────┘

Error:
┌──────────────────────────────────────────────────────────────────┐
│  ❌ Failed to save guardrail                                      │
│     The rule name already exists. Use a different name.          │
│                                                   [Retry]  [×]   │
│  ──────────────────────── Manual dismiss only ──────────────────  │
└──────────────────────────────────────────────────────────────────┘

Warning:
┌──────────────────────────────────────────────────────────────────┐
│  ⚠️ Rate limit approaching                                        │
│     You've used 85% of your monthly request quota.               │
│                                                   [View Usage] [×]│
│  ──────────────────────── Auto-dismiss in 8s ──────────────────  │
└──────────────────────────────────────────────────────────────────┘

Info:
┌──────────────────────────────────────────────────────────────────┐
│  ℹ️ Baseline learning complete                                    │
│     Model gpt-4-prod has completed its 7-day baseline.           │
│                                                   [View] [×]     │
│  ──────────────────────── Auto-dismiss in 4s ──────────────────  │
└──────────────────────────────────────────────────────────────────┘
```

### 15.2 Toast Specifications

| Property | Value |
|----------|-------|
| **Position** | Bottom-right, 16px from edges |
| **Width** | 400px |
| **Stacking** | Newest at bottom. Max 3 visible. |
| **Animation** | Slide up + fade in, 200ms |
| **Dismiss** | × button in top-right. Auto-dismiss per type. |
| **Action buttons** | Up to 2 ghost buttons |
| **Progress bar** | Countdown bar at bottom during auto-dismiss |
| **Z-index** | 9999 (above all UI) |

### 15.3 Alert Rules

| Rule | Rationale |
|------|-----------|
| Only one toast of the same type at a time | Duplicate toasts are replaced, not stacked |
| Error toasts require manual dismiss | User must acknowledge errors |
| Success toasts auto-dismiss in 6s | User sees confirmation, doesn't need to act |
| Warning toasts auto-dismiss in 8s | Gives time to read, but doesn't block |
| Info toasts auto-dismiss in 4s | Quick acknowledgement only |
| Max 3 visible toasts | Beyond 3, oldest is replaced |
| Toast content has icon + title + optional description | Clear hierarchy |

### 15.4 Inline Alerts (Banners)

For page-level alerts that need more space than a toast:

```
┌──────────────────────────────────────────────────────────────────┐
│  ℹ️  No models registered. Connect your first model to start     │
│  monitoring AI risk.                         [Connect Model →]   │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│  ⚠️  Integration error: Slack connection failed.                 │
│  Slack webhook returned 401. Check your API token.              │
│                                       [Reconnect] [Dismiss] [×]  │
└──────────────────────────────────────────────────────────────────┘
```

| Property | Value |
|----------|-------|
| **Position** | Below page header, full width |
| **Layout** | Icon + message + actions |
| **Severity** | Info (blue), Warning (amber), Error (red), Success (green) |
| **Dismiss** | × for dismissible, no × for persistent |
| **CTAs** | Up to 2 buttons, ghost style |

---

## 16. Accessibility Requirements

### 16.1 WCAG 2.1 AA Compliance Targets

| Criterion | Requirement | Implementation |
|-----------|-------------|----------------|
| **1.4.3 Contrast (AA)** | 4.5:1 for text, 3:1 for large text/UI | All tokens verified against white bg. Severity TEXT tokens use darker shades. |
| **1.4.11 Non-text Contrast** | 3:1 for UI components | Focus rings, borders, chart lines meet 3:1 against adjacent colors. |
| **1.4.12 Text Spacing** | No loss of content | All layouts tested with 0.16em letter-spacing, 2x word-spacing |
| **2.1.1 Keyboard** | Full keyboard operability | All interactive elements reachable and operable via keyboard. |
| **2.4.3 Focus Order** | Logical tab order | Navigation → content → actions. No tabindex >0. |
| **2.4.7 Focus Visible** | Visible focus indicator | 2px brand primary ring + 2px offset on all interactive elements. |
| **2.5.3 Label in Name** | Accessible name matches visible label | Button labels match aria-label. Icons with aria-hidden. |
| **3.3.2 Labels** | Form inputs have labels | Every input has a visible `<label>`. Placeholder is never a substitute. |
| **4.1.2 Name, Role, Value** | Custom controls expose correct semantics | ARIA roles, states, and properties on custom components (select, dropdown, modal). |

### 16.2 Keyboard Navigation

| Key | Action | Context |
|-----|--------|---------|
| `Tab` | Move focus forward | Global — all interactive elements |
| `Shift+Tab` | Move focus backward | Global |
| `Enter` or `Space` | Activate focused element | Buttons, links, toggles |
| `Escape` | Close modal/dropdown/popover | Modals, dropdowns, tooltips, search |
| `↓` `↑` | Navigate list items | Dropdowns, select menus, table rows |
| `Cmd+K` | Open global search | Global |
| `Cmd+,` | Open settings | Global |
| `Esc` (from investigations) | Back to event list | Investigation page |
| `/` | Focus page search | Any page with a search input |
| `?` | Show keyboard shortcuts | Global (modal) |

### 16.3 Focus States

```
Button focus:        2px brand primary ring, 2px offset (4px total gap)
Input focus:         2px brand primary ring, 2px offset
Card focus:          2px brand primary ring on entire card
Link focus:          Underlined + 2px brand primary outline
Table row focus:     2px brand primary left border + Neutral 100 bg
Dropdown focus:      2px brand primary ring on active option
Modal focus:         Trap focus inside modal, restore on close
```

### 16.4 Screen Reader Support

| Requirement | Implementation |
|-------------|----------------|
| **Semantic HTML** | Use `<nav>`, `<main>`, `<aside>`, `<header>`, `<footer>`, `<table>`, `<form>` |
| **ARIA landmarks** | `role="navigation"` on sidebar, `role="search"` on Cmd+K, `role="dialog"` on modals |
| **Dynamic content** | `aria-live="polite"` on toast notifications, `aria-live="assertive"` on error states |
| **Charts** | `role="img"` with `aria-label` summarizing chart data. Hidden `<table>` with raw data. |
| **Icons** | `aria-hidden="true"` on decorative icons. Contextual icons have accessible labels. |
| **Badges** | Include text label. Icon is decorative (`aria-hidden`). |
| **Severity indicators** | Always include text label alongside color. |
| **Loading states** | `aria-busy="true"` on loading containers. |
| **Disposition feedback** | `role="status"` for confirmation messages. |

### 16.5 Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

| Element | With Motion | Without Motion |
|---------|-------------|----------------|
| Skeleton shimmer | Gradient sweep | Static gray blocks |
| Toast slide-up | 200ms slide + fade | Instant appear |
| Sidebar collapse | 200ms width transition | Instant |
| Modal open | 150ms fade + slight scale | Instant appear |
| Alert pulse | 500ms pulse animation | Static red indicator |
| Page transition | 200ms fade | Instant |

---

## 17. Data Visualization Guidelines

### 17.1 Chart Selection Decision Tree

```
What are you showing?
│
├── Trend over time?
│   ├── Single metric over 7-90 days → Line chart
│   └── Multiple metrics over time → Multi-line chart with legend
│
├── Composition / breakdown?
│   ├── ≤5 categories → Donut chart
│   └── >5 categories → Horizontal bar chart (sorted)
│
├── Comparison across categories?
│   ├── ≤10 items → Horizontal bar chart
│   └── >10 items → Data table with mini bars (sparklines)
│
├── Distribution?
│   ├── Single metric → Histogram
│   └── Two dimensions → Scatter plot (use rarely, only with explanation)
│
├── Part-to-whole?
│   └── Stacked bar chart (not pie chart — donut only if ≤3 segments)
│
└── Single KPI?
    └── Display number with trend arrow. No chart needed.
```

### 17.2 Chart Type Specifications

**Line Chart (Trend)**

| Use Case | Example |
|----------|---------|
| Risk score over time | 7-day risk trend on dashboard |
| Alert volume trend | Daily alert count with 7-day moving average |
| Model risk comparison | Two models' risk scores overlaid |

| Property | Specification |
|----------|---------------|
| **Line** | 2px, brand primary. Multiple lines: use distinct hues (not severity colors) |
| **Area fill** | Optional, 10% opacity of line color, gradient to 0% |
| **Axis labels** | Small (12px), Text Tertiary. Y-axis only if meaningful. |
| **Gridlines** | Optional, Neutral 100, 0.5px. Remove if chart is small. |
| **Tooltip** | On hover: date + value + change indicator |
| **Zero baseline** | Always. Chart y-axis must start at 0 unless variation is <1% of range. |
| **Missing data** | Dashed line connecting gaps, with tooltip noting "insufficient data" |
| **Max data points** | 90 (daily). Beyond that, aggregate. |

**Bar Chart (Comparison)**

| Use Case | Example |
|----------|---------|
| Alert volume by severity | Stacked bars: critical/warning/info per day |
| Model comparison | Grouped bars: risk score per model per environment |
| Risk type distribution | Horizontal bars: injection count, PII count, drift count |

| Property | Specification |
|----------|---------------|
| **Bar width** | 60-80% of available slot |
| **Bar colors** | Category-based or severity-based. Never gradient. |
| **Stacked bars** | Severity colors (critical on top). Only for time-series. |
| **Grouped bars** | ≤6 groups. Use muted brand colors for secondary groups. |
| **Label** | Value on bar if space permits. Otherwise, axis label. |
| **Zero baseline** | Always. |

**Donut Chart (Composition)**

| Use Case | Example |
|----------|---------|
| Risk breakdown by category | Injection 65%, PII 20%, Drift 10%, Toxicity 5% |
| Compliance coverage | Compliant 85%, Non-compliant 10%, N/A 5% |

| Property | Specification |
|----------|---------------|
| **Use sparingly** | Only for 2-5 categories. >5 = use horizontal bar. |
| **Center label** | Total or % in center, Small weight |
| **Segments** | Largest at 12 o'clock, descending clockwise |
| **Colors** | Distinct categorical palette (not severity) |
| **Label** | Outside segment with connector line. Category + %. |

**Gauge (Single Metric)**

| Use Case | Example |
|----------|---------|
| Compliance score | 0-100% across a framework |
| System health | Risk health score alternative view |

| Property | Specification |
|----------|---------------|
| **Arc range** | 0-100%, bottom 50% of circle (semi-circle) |
| **Color** | Green (80-100), Amber (50-79), Red (0-49) |
| **Label** | Value center, label below |
| **Needle** | None. Highlighted arc segment instead. |

**Data Table (Tabular Data)**

| Use Case | Example |
|----------|---------|
| Model breakdown | Model name, avg score, alert count, trend |
| Compliance controls | Control ID, status, evidence, last verified |
| Any >10 comparisons | Tables are always readable; charts with >10 bars are not |

### 17.3 Visualization Anti-Patterns

| Don't | Why |
|-------|-----|
| 3D charts | Distorts perception, hurts readability |
| Pie charts (>3 segments) | Humans are bad at comparing angles |
| Radar charts | Confusing, hard to read accurately |
| Gradient fills on bars | Implies data quality gradient where none exists |
| Animated chart transitions | Disorienting in a monitoring tool |
| Chart-only views without data table | Power users need the numbers |
| Red/green coded charts without labels | Color-blind users lose information |
| Overlapping labels | Rotate and truncate before overlap |

### 17.4 Color for Charts

Chart colors are distinct from severity colors and brand colors:

```
Chart Blue:     #2B8CE5    — Primary chart line
Chart Teal:     #0891B2    — Secondary line
Chart Purple:   #7C3AED    — Tertiary line
Chart Orange:   #EA580C    — Highlight line
Chart Pink:     #DB2777    — Comparison line
Chart Gray:     #9CA3AF    — Baseline/average line

Categorical Palette (for bar chart segments):
#2B8CE5, #8B5CF6, #0891B2, #EA580C, #10B981, #F59E0B, #EC4899, #6B7280
```

---

## 18. Microinteractions

### 18.1 Design Philosophy

Enterprise microinteractions are **functional, not delightful**. They communicate state, provide feedback, and guide attention — they do not entertain.

| Principle | Rationale |
|-----------|-----------|
| **Under 200ms** | Enterprise users move fast. Animations should not feel like waiting. |
| **Purpose-driven** | Every animation communicates: focus, state change, notification, or progression. |
| **Subtle** | No bouncy spring animations. Ease-in-out or linear. |
| **Accessible** | All animations disable on `prefers-reduced-motion: reduce`. |

### 18.2 Interaction Specifications

**Hover States (100ms)**

| Element | Effect |
|---------|--------|
| Button | Background darken or lighten, cursor pointer |
| Card | Subtle shadow increase (0 1px 3px → 0 4px 6px), border unchanged |
| Table row | Background tint to Neutral 50 |
| List item | Background tint to Neutral 50 |
| Sidebar item | Background tint to Neutral 100 |
| Icon button | Background tint to Neutral 100, 24x24 hit area |

**Active / Click States (100ms)**

| Element | Effect |
|---------|--------|
| Button | Scale 0.98 (micro press) + bg darken |
| Card click | Brief bg flash (Neutral 100 for 150ms) |
| Toggle | Immediate state change, 200ms bg transition |
| Checkbox | Immediate check mark, 150ms border→bg transition |

**Focus States (150ms)**

| Element | Effect |
|---------|--------|
| Input | Border color transition to brand primary + ring |
| Button | Ring appears, no border color change |
| Link | Underline appears |
| Card | Border color transition to brand primary |

**Transition Durations**

| Element | Duration | Easing |
|---------|----------|--------|
| Sidebar collapse | 200ms | ease-in-out |
| Modal overlay | 150ms | ease-out |
| Toast slide-in | 200ms | ease-out |
| Skeleton shimmer | 1.5s | ease-in-out (looping) |
| Alert pulse (new) | 500ms | ease-out (2 pulses) |
| Progress bar fill | 300ms | ease-out |
| Tab switch | 150ms | ease-out |
| Dropdown open | 150ms | ease-out |

### 18.3 Pulse Animation (Critical Alerts)

New critical alerts get a subtle pulse to draw attention:

```css
@keyframes alert-pulse {
  0%   { box-shadow: 0 0 0 0 rgba(224, 37, 37, 0.4); }
  70%  { box-shadow: 0 0 0 6px rgba(224, 37, 37, 0); }
  100% { box-shadow: 0 0 0 0 rgba(224, 37, 37, 0); }
}

.new-critical-alert {
  animation: alert-pulse 500ms ease-out 2;
}
```

**Rules:**
- Only for **new** critical alerts that appeared since last page visit
- Maximum 2 pulse cycles
- Never pulse continuously
- Disabled on `prefers-reduced-motion: reduce` (show static indicator instead)

---

## 19. Design Tokens

### 19.1 Token Categories

All tokens organized for direct conversion to:
- Tailwind CSS config (`tailwind.config.ts`)
- CSS custom properties (`:root { ... }`)
- Figma variables

### 19.2 Color Tokens (CSS Variable Format)

```css
:root {
  /* Brand */
  --color-brand-50: #EFF2FF;
  --color-brand-100: #DBE1FF;
  --color-brand-200: #BEC8FF;
  --color-brand-300: #92A2FF;
  --color-brand-400: #6676FF;
  --color-brand-500: #2B42F5;
  --color-brand-600: #1A2DE0;
  --color-brand-700: #1524B8;
  --color-brand-800: #131F96;
  --color-brand-900: #121D7A;

  /* Severity — Critical */
  --color-critical: #E02525;
  --color-critical-bg: #FEF2F2;
  --color-critical-border: #FECACA;
  --color-critical-text: #991B1B;

  /* Severity — Warning */
  --color-warning: #E88B1F;
  --color-warning-bg: #FFFBEB;
  --color-warning-border: #FDE68A;
  --color-warning-text: #92400E;

  /* Severity — Info */
  --color-info: #2B8CE5;
  --color-info-bg: #EFF6FF;
  --color-info-border: #BFDBFE;
  --color-info-text: #1E40AF;

  /* Severity — Success */
  --color-success: #1FAA5C;
  --color-success-bg: #F0FDF4;
  --color-success-border: #BBF7D0;
  --color-success-text: #166534;

  /* Severity — Neutral */
  --color-neutral: #6B7280;
  --color-neutral-bg: #F9FAFB;
  --color-neutral-border: #E5E7EB;
  --color-neutral-text: #6B7280;

  /* Neutral scale */
  --color-gray-50: #F9FAFB;
  --color-gray-100: #F3F4F6;
  --color-gray-200: #E5E7EB;
  --color-gray-300: #D1D5DB;
  --color-gray-400: #9CA3AF;
  --color-gray-500: #6B7280;
  --color-gray-600: #4B5563;
  --color-gray-700: #374151;
  --color-gray-800: #1F2937;
  --color-gray-900: #111827;

  /* Accent */
  --color-accent: #6366F1;
  --color-accent-soft: #EEF2FF;

  /* Surface */
  --surface-page: #F3F4F6;
  --surface-card: #FFFFFF;
  --surface-sidebar: #FFFFFF;
  --surface-elevated: #FFFFFF;
  --surface-selected: #E8EBFF;
  --surface-secondary: #F9FAFB;

  /* Border */
  --border-default: #E5E7EB;
  --border-strong: #D1D5DB;
  --border-critical: #FECACA;
  --border-selected: #2B42F5;

  /* Text */
  --text-primary: #111827;
  --text-secondary: #4B5563;
  --text-tertiary: #6B7280;
  --text-quaternary: #9CA3AF;
  --text-inverse: #FFFFFF;
  --text-link: #2B42F5;
}
```

### 19.3 Typography Tokens

```css
:root {
  /* Font families */
  --font-sans: 'Inter', system-ui, -apple-system, sans-serif;
  --font-mono: 'JetBrains Mono', 'Fira Code', monospace;

  /* Type scale */
  --text-display: 36px;
  --text-display-line: 44px;
  --text-display-weight: 700;

  --text-h1: 24px;
  --text-h1-line: 32px;
  --text-h1-weight: 600;

  --text-h2: 18px;
  --text-h2-line: 24px;
  --text-h2-weight: 600;

  --text-h3: 15px;
  --text-h3-line: 20px;
  --text-h3-weight: 500;

  --text-body: 14px;
  --text-body-line: 20px;
  --text-body-weight: 400;

  --text-body-bold: 14px;
  --text-body-bold-line: 20px;
  --text-body-bold-weight: 600;

  --text-small: 12px;
  --text-small-line: 16px;
  --text-small-weight: 400;

  --text-small-bold: 12px;
  --text-small-bold-line: 16px;
  --text-small-bold-weight: 600;

  --text-label: 13px;
  --text-label-line: 16px;
  --text-label-weight: 500;

  --text-mono: 13px;
  --text-mono-line: 20px;
  --text-mono-weight: 400;

  --text-mono-sm: 11px;
  --text-mono-sm-line: 16px;
  --text-mono-sm-weight: 500;
}
```

### 19.4 Spacing Tokens

```css
:root {
  --space-0: 0px;
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  --space-10: 40px;
  --space-12: 48px;
  --space-16: 64px;
  --space-20: 80px;
}
```

### 19.5 Component Tokens

```css
:root {
  /* Border radius */
  --radius-sm: 4px;
  --radius-md: 6px;
  --radius-lg: 8px;
  --radius-xl: 12px;
  --radius-full: 9999px;

  /* Shadows */
  --shadow-card: 0 1px 3px 0 rgba(0, 0, 0, 0.04), 0 1px 2px -1px rgba(0, 0, 0, 0.06);
  --shadow-card-hover: 0 4px 6px -1px rgba(0, 0, 0, 0.06), 0 2px 4px -2px rgba(0, 0, 0, 0.08);
  --shadow-elevated: 0 4px 6px -1px rgba(0, 0, 0, 0.08), 0 2px 4px -2px rgba(0, 0, 0, 0.06);
  --shadow-modal: 0 20px 25px -5px rgba(0, 0, 0, 0.10), 0 8px 10px -6px rgba(0, 0, 0, 0.12);
  --shadow-dropdown: 0 4px 12px rgba(0, 0, 0, 0.08);

  /* Focus ring */
  --focus-ring: 0 0 0 2px #2B42F5;
  --focus-ring-offset: 2px;

  /* Sidebar */
  --sidebar-width-expanded: 240px;
  --sidebar-width-collapsed: 64px;

  /* Top nav */
  --topnav-height: 56px;

  /* Breakpoints (for reference — used in Tailwind config) */
  --breakpoint-tablet: 768px;
  --breakpoint-desktop: 1200px;

  /* Transitions */
  --transition-fast: 150ms ease-out;
  --transition-normal: 200ms ease-in-out;
  --transition-slow: 300ms ease-out;
}
```

### 19.6 Chart Color Tokens

```css
:root {
  --chart-blue: #2B8CE5;
  --chart-teal: #0891B2;
  --chart-purple: #7C3AED;
  --chart-orange: #EA580C;
  --chart-pink: #DB2777;
  --chart-gray: #9CA3AF;

  /* Categorical palette (order matters — use in sequence) */
  --chart-cat-1: #2B8CE5;
  --chart-cat-2: #8B5CF6;
  --chart-cat-3: #0891B2;
  --chart-cat-4: #EA580C;
  --chart-cat-5: #10B981;
  --chart-cat-6: #F59E0B;
  --chart-cat-7: #EC4899;
  --chart-cat-8: #6B7280;
}
```

### 19.7 Tailwind Config Integration

```typescript
// tailwind.config.ts
export default {
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#EFF2FF',
          500: '#2B42F5',
          600: '#1A2DE0',
        },
        severity: {
          critical: { DEFAULT: '#E02525', bg: '#FEF2F2', border: '#FECACA', text: '#991B1B' },
          warning:  { DEFAULT: '#E88B1F', bg: '#FFFBEB', border: '#FDE68A', text: '#92400E' },
          info:     { DEFAULT: '#2B8CE5', bg: '#EFF6FF', border: '#BFDBFE', text: '#1E40AF' },
          success:  { DEFAULT: '#1FAA5C', bg: '#F0FDF4', border: '#BBF7D0', text: '#166534' },
          neutral:  { DEFAULT: '#6B7280', bg: '#F9FAFB', border: '#E5E7EB', text: '#6B7280' },
        },
        surface: {
          DEFAULT: '#FFFFFF',
          secondary: '#F9FAFB',
          selected: '#E8EBFF',
        },
        border: {
          DEFAULT: '#E5E7EB',
          strong: '#D1D5DB',
        },
        text: {
          primary: '#111827',
          secondary: '#4B5563',
          tertiary: '#6B7280',
          quaternary: '#9CA3AF',
          inverse: '#FFFFFF',
        },
        chart: {
          blue: '#2B8CE5',
          teal: '#0891B2',
          purple: '#7C3AED',
          orange: '#EA580C',
          pink: '#DB2777',
          gray: '#9CA3AF',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      fontSize: {
        'display': ['36px', { lineHeight: '44px', fontWeight: '700' }],
        'h1': ['24px', { lineHeight: '32px', fontWeight: '600' }],
        'h3': ['15px', { lineHeight: '20px', fontWeight: '500' }],
      },
      spacing: {
        '0': '0px',
        '1': '4px',
        '2': '8px',
        '3': '12px',
        '4': '16px',
        '5': '20px',
        '6': '24px',
        '8': '32px',
        '10': '40px',
        '12': '48px',
        '16': '64px',
        '20': '80px',
      },
      borderRadius: {
        'sm': '4px',
        'md': '6px',
        'lg': '8px',
        'xl': '12px',
        'full': '9999px',
      },
      boxShadow: {
        'card': '0 1px 3px 0 rgb(0 0 0 / 0.04), 0 1px 2px -1px rgb(0 0 0 / 0.06)',
        'card-hover': '0 4px 6px -1px rgb(0 0 0 / 0.06), 0 2px 4px -2px rgb(0 0 0 / 0.08)',
        'modal': '0 20px 25px -5px rgb(0 0 0 / 0.10), 0 8px 10px -6px rgb(0 0 0 / 0.12)',
      },
    },
  },
};
```

---

## Design Review Checklist

| Criteria | Pass/Fail |
|----------|-----------|
| All severity indicators include icon + color + text label | |
| Color tokens verified against WCAG AA 4.5:1 on white background | |
| Every data component has loading, empty, error, and populated states | |
| Typography uses only Inter (UI) and JetBrains Mono (data) | |
| Spacing follows 4px base unit consistently | |
| All interactive elements have visible focus indicators | |
| Charts include data table fallbacks for screen readers | |
| No severity colors used for decorative/non-severity UI | |
| Empty states include actionable CTAs | |
| Toast types follow the auto-dismiss duration rules | |
| `prefers-reduced-motion` disables all animations | |
| Navigation items filtered by role (Compliance doesn't see Policies) | |

---

## Document Version History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-06-22 | Principal Product Designer | Initial design system specification |

---

*This document should be read alongside:*
- *UX Research Document (`Docs/ux-research-sentinelai.md`)*
- *Product Requirements Document (`docs/prd.md`)*
- *Frontend Architecture Document (`docs/frontend-architecture.md`)*
