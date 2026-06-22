# ARCA — Frontend Design Document
**Autonomous Regulatory Compliance Agent**
React + TypeScript · Version 1.0 · June 2026

---

## Table of Contents

1. [Aesthetic Direction](#1-aesthetic-direction)
2. [Design System](#2-design-system)
3. [Component Library & Inspirations](#3-component-library--inspirations)
4. [Page Architecture](#4-page-architecture)
5. [Page-by-Page Specifications](#5-page-by-page-specifications)
   - 5.1 Login
   - 5.2 Dashboard (Compliance Officer)
   - 5.3 Circular Detail & MAP Review (Gate 1)
   - 5.4 Department Portal (Department User)
   - 5.5 Validation Sign-Off (Gate 2)
   - 5.6 Analytics & Learning Stats
   - 5.7 Audit Trail
   - 5.8 Settings
6. [Motion & Animation System](#6-motion--animation-system)
7. [Responsive Behaviour](#7-responsive-behaviour)
8. [Accessibility](#8-accessibility)

---

## 1. Aesthetic Direction

### 1.1 Design Philosophy

ARCA is not a productivity app. It is a compliance operations platform used by people whose decisions carry regulatory weight and whose failures result in government fines. The interface must communicate **authority, precision, and control** — not friendliness, playfulness, or consumer-app warmth.

The chosen aesthetic: **Regulatory Dark Terminal**

Inspired by financial data terminals (Bloomberg, Reuters Eikon), legal document systems, and aviation cockpit instruments — environments where density and clarity are inseparable, where every pixel earns its place, and where the absence of decoration signals professionalism rather than laziness.

This is a purpose-built dark interface, not a "dark mode" toggle. It is dark by conviction.

### 1.2 Aesthetic References

| Reference | What we borrow |
|-----------|---------------|
| Bloomberg Terminal | Dense information grids, monospace data, amber accent on black |
| Aviation instrument panels | Status indicators with zero ambiguity, warning hierarchies |
| Legal docket systems | Structured document hierarchy, clause references, numbered obligations |
| Editorial print design | Confident typography, ruled dividers, authoritative weight contrast |
| 21st.dev animated components | Staggered list reveals, animated number counters, scroll areas |
| Aceternity UI | Spotlight hover on MAP cards, moving border on CTA buttons, beam effects on login |

### 1.3 What This Is Not

- Not a SaaS marketing dashboard with indigo gradients
- Not a "modern banking app" with rounded white cards on light gray
- Not a productivity tool aesthetic (no Notion/Linear/Figma-inspired neutrality)
- Not dark mode of a light app — the darkness is the primary state

---

## 4. Page Architecture

### 4.1 Route Map

```
/login                        — Login page (unauthenticated)

/dashboard                    — Compliance Officer dashboard (default post-login)
/circulars/:id                — Circular detail page
/circulars/:id/review         — Gate 1: MAP review & dispatch
/circulars/:id/signoff        — Gate 2: Validation sign-off (HIGH priority)

/department                   — Department user portal
/department/map/:mapId        — Individual MAP detail + evidence submission

/analytics                    — Learning stats & accuracy trends
/audit                        — Immutable audit trail
/settings                     — Platform settings (routing taxonomy, notification prefs)
```

### 4.2 Layout Shells

**Authenticated Shell (Compliance Officer + Department Head + Auditor)**

```
┌─────────────────────────────────────────────────────┐
│  TOPNAV: Logo · ARCA  |  Nav links  |  User menu    │
├─────────────────────────────────────────────────────┤
│  TICKER RAIL: Live circular processing status       │ ← Signature element
├─────────────────────────────────────────────────────┤
│                                                     │
│  PAGE CONTENT (full-width or sidebar layout)        │
│                                                     │
└─────────────────────────────────────────────────────┘
```

**Department User Shell**

Simplified — no ticker rail. Just topnav + page content. Narrower nav with only: My MAPs, Notifications, Profile.

### 4.3 Top Navigation

- Background: `--bg-surface`, `1px` bottom border `--border-subtle`
- Logo: "ARCA" in `Playfair Display` italic, amber colored, followed by a `1px` vertical rule and a `DM Sans` "Regulatory Compliance" label in `--text-tertiary`
- Navigation links: DM Sans 13px, `--text-secondary` default, `--text-primary` active state, amber underline 1px on active
- Right side: notification bell (badge with unread count), user avatar (initials), role chip

---

## 5. Page-by-Page Specifications

---

### 5.1 Login Page

**URL:** `/login`  
**Roles:** All  
**Job:** Authenticate the user and communicate what ARCA is in a single glance.

#### Elements

- **Background:** Aceternity `BackgroundBeams` component — diagonal amber-tinted beams sweeping in from top-left corner. Set opacity to 30% to avoid overpowering the form.
- **Spotlight effect:** A radial `conic-gradient` that follows the cursor, implemented with `mousemove` listener updating a CSS custom property. This creates the impression of a flashlight illuminating the login card.
- **Card:** `--bg-raised`, `1px border --border-default`, `border-radius: --radius-xl`, padding `48px`. No drop shadow — the beams create depth.
- **Logo:** "ARCA" in `Playfair Display` 36px italic, `--accent` color.
- **Tagline:** Aceternity `TypewriterEffect` — "Compliance that never sleeps." in DM Sans 14px `--text-secondary`. Delay starts after 600ms.
- **Inputs:** `--bg-surface` background, `1px border --border-default`, transitions to `--border-accent` on focus. DM Sans 14px. No rounded corners — `--radius-sm` only (3px).
- **Sign in button:** Full width, `--accent` background, `--text-inverse` text, Aceternity `MovingBorder` wrapping it so the amber border traces the perimeter on hover.
- **Footer text:** Fixed bottom — bank name, year, "Powered by ARCA" in DM Sans 11px `--text-tertiary`.

#### States

- Default — empty form
- Loading — button shows a minimal spinner (two dots), inputs disabled
- Error — input border flashes to `--status-overdue`, error text appears below in 12px coral
- Success — brief flash of amber, redirect to `/dashboard`

---

### 5.2 Dashboard — Compliance Officer

**URL:** `/dashboard`  
**Roles:** Compliance Officer  
**Job:** Give an instant read on what needs attention right now — pending gates, overdue MAPs, recent circular activity.

#### Layout

Two-column, 70/30 split. Left: main content stream. Right: sidebar for upcoming deadlines and activity feed.

```
┌──────────────────────────────────────────────────────────────────┐
│  TOPNAV + TICKER RAIL                                            │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─ STAT ROW ─────────────────────────────────────────────────┐  │
│  │  [Circulars this month]  [Active MAPs]  [Overdue]          │  │
│  │  [Awaiting Gate 1]       [Awaiting Gate 2]                 │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌─ ATTENTION REQUIRED ──────────────┐  ┌─ SIDEBAR ──────────┐  │
│  │                                    │  │                    │  │
│  │  Gate 1 Pending (N)                │  │  Upcoming          │  │
│  │  ┌──────────────────────────────┐  │  │  Deadlines         │  │
│  │  │  FEMA 389(1)/2026-RB        │  │  │  ─────────────     │  │
│  │  │  3 MAPs · 29 May 2026       │  │  │  [MAP-003]         │  │
│  │  │  [Review & Dispatch →]      │  │  │  Jun 12 · LEGAL    │  │
│  │  └──────────────────────────────┘  │  │                    │  │
│  │                                    │  │  Activity Feed     │  │
│  │  Gate 2 Pending (N)                │  │  ─────────────     │  │
│  │  [MAP-001 · Satisfied · 94%]       │  │  [timestamps]      │  │
│  │  [MAP-002 · Satisfied · 97%]       │  │                    │  │
│  │                                    │  │                    │  │
│  │  Recent Circulars                  │  │                    │  │
│  │  ──────────────────────────────    │  │                    │  │
│  │  [circular list]                   │  └────────────────────┘  │
│  └────────────────────────────────────┘                          │
└──────────────────────────────────────────────────────────────────┘
```

#### Components

**Stat Row (5 cards)**
- Component: Metric card — `--bg-surface` surface, `1px border --border-subtle`
- Each shows: label in DM Sans 11px `--text-tertiary` uppercase, value as animated counter in `JetBrains Mono` 24px `--text-primary`
- 21st.dev animated counter — numbers count up on page load with spring easing
- "Overdue" stat uses `--status-overdue` color when value > 0

**Attention Required section**

_Gate 1 pending block:_
- Header: "Gate 1 — awaiting dispatch" with an amber dot that pulses (CSS `@keyframes pulse` on opacity 1→0.4→1 at 2s interval)
- Each circular card: `--bg-surface`, left border `4px solid --border-accent`, `--radius-md`
  - Top line: `<CircularID>` component + date
  - Middle: N MAPs extracted · auto-routed to X departments
  - Bottom: "Review & Dispatch" link with arrow — hover animates arrow rightward by 4px
- Empty state: "No circulars awaiting review" in `--text-tertiary`, with small check mark icon

_Gate 2 pending block:_
- Similar card format
- Shows verdict badge (Satisfied/Partial) and confidence percentage
- "Confirm Closure" button — Aceternity `MovingBorder` — the only place this component appears outside the login page, intentionally scarce

**Recent Circulars list**
- Compact list rows — not cards. Each row: circular ID (monospace), title (truncated), date, status badge
- 21st.dev `ScrollArea` wrapping the list with custom amber scrollbar
- Click row → navigate to `/circulars/:id`

**Sidebar: Upcoming Deadlines**
- Sorted ascending by deadline date
- Each entry: MAP ID (monospace), department badge, deadline with `<DeadlineTag>` coloring
- "Overdue" items sorted first, labeled in `--status-overdue`

**Sidebar: Activity Feed**
- Most recent 8 events across the system
- Format: `[timestamp] [actor] [action]` in 12px DM Sans
- Timestamps in JetBrains Mono — visual separation from names and actions
- Subtle bottom border between items

#### Interactions

- Stat cards respond to hover with a very slight amber border glow on `--border-accent`
- Gate 1 card: hovering "Review & Dispatch" highlights the entire card with `--accent-muted` background tint
- Ticker rail is live — new circular detections appear with a brief amber flash on the entry

---

### 5.3 Circular Detail & MAP Review — Gate 1

**URL:** `/circulars/:id/review`  
**Roles:** Compliance Officer  
**Job:** Review all extracted MAPs for a circular, edit any incorrect fields, approve or reject each, then dispatch all approved MAPs to departments.

This is the most important and densely-used page in the product.

#### Layout

Full-width. Two panels side-by-side on desktop: left panel is the circular text, right panel is the MAP list.

```
┌──────────────────────────────────────────────────────────────────┐
│  TOPNAV + TICKER RAIL                                            │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─ GATE 1 BANNER ────────────────────────────────────────────┐  │
│  │  ⚡  FEMA 389(1)/2026-RB — 3 MAPs awaiting your review    │  │
│  │  Review, edit, and approve before dispatch. [Dismiss]      │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌─ CIRCULAR TEXT ──────────────┐  ┌─ MAPS ────────────────────┐ │
│  │  [Sticky header: circ. ID]   │  │  [Bulk actions toolbar]   │ │
│  │                              │  │  [Sort / Filter]          │ │
│  │  Full extracted text of the  │  │                           │ │
│  │  circular, formatted with    │  │  ┌─ MAP-001 ────────────┐ │ │
│  │  clause numbers highlighted  │  │  │  [card content]      │ │ │
│  │  in amber.                   │  │  └──────────────────────┘ │ │
│  │                              │  │                           │ │
│  │  Obligation sentences        │  │  ┌─ MAP-002 ────────────┐ │ │
│  │  underlined and color-coded  │  │  │  [card content]      │ │ │
│  │  by their MAP assignment.    │  │  └──────────────────────┘ │ │
│  │                              │  │                           │ │
│  │  [Scroll area — left panel]  │  │  ┌─ MAP-003 ────────────┐ │ │
│  │                              │  │  │  [card content]      │ │ │
│  │                              │  │  └──────────────────────┘ │ │
│  └──────────────────────────────┘  └───────────────────────────┘ │
│                                                                  │
│  [    Cancel    ]              [  Dispatch N MAPs →  ] ← sticky  │
└──────────────────────────────────────────────────────────────────┘
```

#### Components

**Gate 1 Banner**
- `<GateBanner>` component — full-width, `--gate-bg` background, `1px border --gate-border`, left border `4px solid --accent`
- Contains: bolt icon (amber), circular ID, MAP count, brief instruction
- A dismissible version collapses to a thin amber top border after dismissal

**Split panel layout**
- Left: `40%` width, `--bg-surface`, `1px right border --border-default`
- Right: `60%` width, `--bg-void`
- 21st.dev `ScrollArea` in both panels — independent scrolling

**Circular text panel (left)**
- Circular ID at top in JetBrains Mono with amber color
- Title in DM Sans 16px 500
- Body text in DM Sans 14px 300 (reading weight)
- Obligation sentences highlighted: each extracted obligation gets a subtle amber underline and a corresponding MAP-ID label that floats in the right margin
- Clause numbers (`Para 3.1`, `Regulation 4`) rendered in JetBrains Mono amber

**MAP card (right panel)**
The core review unit. Uses Aceternity `CardSpotlight` — subtle radial spotlight that follows the cursor across the card, creating a physical examination effect.

Each card contains:
- **Card header:** MAP-ID (monospace), Department badge, Priority chip, Approved/Rejected toggle (segmented control)
- **Action field:** Editable `<textarea>` showing the extracted action text — appears as static text by default, click to edit (border animates in)
- **Field grid:** 2-column grid of fields — each shows label and value
  - Department: `<DeptBadge>` + edit icon on hover
  - Deadline: `<DeadlineTag>` + edit icon on hover
  - Clause Reference: monospace
  - Required Proof: editable text
- **Footer:** "Last edited by [system]" in 11px muted, correction count badge if any prior corrections exist on this obligation

Editing a field:
- Click the field value → it becomes an inline input with amber border
- The change is tracked — a subtle amber dot appears in the card header "1 edit" to show an officer modified this MAP
- Saving the edit closes inline mode, logs the correction to the feedback loop

Card states:
- Default: `--bg-surface` background
- Approved: green left border `2px solid --status-closed`, slight teal tint on background
- Rejected: gray left border, content dims to `opacity: 0.5`
- Editing: amber left border `2px solid --accent`

**Bulk actions toolbar**
- Left: checkbox "Select all", counter "N of M selected"
- Right: "Approve selected", "Reject selected", "Reassign department" dropdown
- Shows only when ≥1 card selected

**Sticky footer bar**
- `--bg-surface` background, `1px top border --border-default`
- Left: "Cancel" — text button
- Right: "Dispatch N MAPs" — primary button with Aceternity `MovingBorder` when all MAPs are approved
- Button is disabled and grayed until at least one MAP is approved
- On click: confirmation modal before dispatching

---

### 5.4 Department User Portal

**URL:** `/department`  
**Roles:** Department User, Department Head  
**Job:** Show a department user their assigned MAPs, let them upload evidence, and track submission status.

#### Layout

Single column. Prominent "attention required" section at top for overdue items, then tabbed list of all MAPs.

```
┌───────────────────────────────────────────────────────────┐
│  TOPNAV (simplified — no ticker rail)                     │
├───────────────────────────────────────────────────────────┤
│                                                           │
│  Good morning, Rahul. You have 2 items due this week.     │
│                                                           │
│  ┌─ OVERDUE ──────────────────────────────────────────┐   │
│  │  ⚠ MAP-003  |  Cross Border Merger  |  3 days late │   │
│  │  [Submit evidence →]                               │   │
│  └────────────────────────────────────────────────────┘   │
│                                                           │
│  [ Pending (4) ] [ Under Review (2) ] [ Closed (12) ]     │
│  ─────────────────────────────────────────────────────    │
│                                                           │
│  MAP card list (tab content)                              │
│                                                           │
└───────────────────────────────────────────────────────────┘
```

#### Components

**Greeting header**
- "Good morning, [name]." in Playfair Display 22px — the only display font usage outside the login page
- Subtext summary in DM Sans 14px `--text-secondary`

**Overdue alert block**
- `--status-overdue-bg` background, `1px border --status-overdue` at 30% opacity, left border `3px solid --status-overdue`
- Framer Motion `AnimatePresence` — slides down if items exist, collapses if resolved
- Each overdue item is a compact row with MAP ID, circular title, days overdue, and "Submit evidence" CTA

**Tabs (Pending / Under Review / Closed)**
- 21st.dev animated tabs — sliding amber underline indicator
- Count badge on each tab in amber
- Content fades in on tab switch (100ms opacity transition)

**MAP list card**
Simpler than Gate 1 cards — not editable, just informational.
- Header: MAP-ID + circular reference + `<DeadlineTag>`
- Body: action description (full text, no truncation)
- Proof required: gray box showing what evidence to submit
- Status badge
- Footer (if submitted): submission timestamp + current verdict

**Evidence Submission** (per MAP — inline panel expands below card)
- Expands with spring animation when "Submit evidence" clicked
- Upload zone: dashed `1px border --border-accent` box, amber accent, drag-and-drop supported
- Text description field: textarea with character counter
- Confirmation: "I confirm this evidence satisfies the obligation" checkbox (required)
- Submit button — full width amber, DM Sans 14px

**Individual MAP detail page** (`/department/map/:mapId`)
- Full-page view with the circular excerpt, full MAP details, full evidence submission area, and the validation verdict once returned
- Shows verdict reasoning in a styled blockquote if verdict exists

---

### 5.5 Validation Sign-Off — Gate 2

**URL:** `/circulars/:id/signoff`  
**Roles:** Compliance Officer  
**Job:** Review LLM validation verdicts for HIGH priority MAPs and confirm or override before closure.

#### Layout

Focused, deliberate. This page is intentionally constrained — no sidebar, no ticker distractions. Full attention on the decision.

```
┌───────────────────────────────────────────────────────────┐
│  TOPNAV (no ticker)                                       │
├───────────────────────────────────────────────────────────┤
│                                                           │
│  ┌─ GATE 2 BANNER ─────────────────────────────────────┐  │
│  │  HIGH PRIORITY — 2 verdicts require your sign-off   │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                           │
│  ┌─ VERDICT CARD ────────────────────────────────────┐    │
│  │  MAP-001 · FEMA 389(1)/2026-RB                    │    │
│  │  SATISFIED  ████████████████████░░░░  94%          │    │
│  │                                                    │    │
│  │  Action:                                           │    │
│  │  [Original MAP action text]                        │    │
│  │                                                    │    │
│  │  Evidence submitted:                               │    │
│  │  [Evidence preview / file name]                    │    │
│  │                                                    │    │
│  │  Verdict reasoning:                                │    │
│  │  [LLM reasoning text]                             │    │
│  │                                                    │    │
│  │  [ Confirm & Close ]   [ Override ]  [ Resubmit ] │    │
│  └────────────────────────────────────────────────────┘    │
└───────────────────────────────────────────────────────────┘
```

#### Components

**Verdict card**
- Large, padded, `--bg-raised` background — feels like a formal document being presented for signature
- MAP ID + circular reference in monospace header
- `<VerdictBadge>` prominently placed: Satisfied (teal), Partial (amber), Insufficient (coral)
- `<ConfidenceBar>` — full width, colored to match verdict, percentage shown at right end
- Three sections: Action text (gray background block), Evidence preview, Reasoning (LLM output in a blockquote-style element with left amber rule)
- Reasoning is the longest field — set in DM Sans 14px 300, line-height 1.7, `--text-secondary`

**Decision buttons**
- "Confirm & Close" — primary, `--accent` background. Aceternity `MovingBorder` on hover. Triggers a brief confirmation modal.
- "Override" — secondary, `--bg-overlay` background, opens a textarea modal to record override reason (required for audit trail)
- "Request Resubmission" — text button, opens modal to select which elements are missing

**Confirmation modal**
- Appears with Framer Motion `scale: 0.95 → 1.0` enter animation
- "You are about to close MAP-001. This action is final and will be recorded in the audit trail."
- "Confirm" (amber) / "Go back" (text)

**Progress indicator**
- For batches (e.g. 2 MAPs to sign off): progress pill showing "1 of 2" at the top of the page, advancing with each decision

---

### 5.6 Analytics & Learning Stats

**URL:** `/analytics`  
**Roles:** Compliance Officer  
**Job:** Show how ARCA is improving — accuracy trend, correction count, common correction types, and circular processing performance.

#### Layout

Dashboard-style with charts. No sidebar. Three rows of content.

```
┌──────────────────────────────────────────────────────┐
│  TOPNAV + TICKER RAIL                                │
├──────────────────────────────────────────────────────┤
│                                                      │
│  ARCA is getting smarter.                            │
│  [subtitle: corrections fed back, accuracy trend]    │
│                                                      │
│  ┌─ HEADLINE STATS ──────────────────────────────┐   │
│  │  [Total corrections]  [Accuracy: last 30]     │   │
│  │  [Most common fix]    [Circulars processed]   │   │
│  └───────────────────────────────────────────────┘   │
│                                                      │
│  ┌─ ACCURACY TREND ──────────────────────────────┐   │
│  │  Line chart: % no-edit MAPs / last 30 circulars│   │
│  └───────────────────────────────────────────────┘   │
│                                                      │
│  ┌─ CORRECTION TYPES ──┐  ┌─ DEPT ACCURACY ────────┐ │
│  │  Donut chart        │  │  Bar chart per dept     │ │
│  └─────────────────────┘  └───────────────────────┘ │
│                                                      │
│  ┌─ RECENT CORRECTIONS LOG ──────────────────────┐   │
│  │  Chronological table of officer corrections    │   │
│  └───────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────┘
```

#### Components

**Section header**
- "ARCA is getting smarter." in Playfair Display 28px — rare use of display font outside login, earned by the editorial nature of this page
- Subtitle in DM Sans 14px muted

**Stat cards** — same animated counter component as dashboard but with sparkline mini-charts

**Accuracy trend chart** — Recharts `<LineChart>`
- Dark themed: `--bg-surface` background, amber line (`--accent`), no fill below the line
- X-axis: circular numbers (abbreviated), Y-axis: percentage
- Tooltip: dark surface, monospace values
- Reference line at 85% (auto-close threshold) — dashed white at 20% opacity

**Correction types donut** — Recharts `<PieChart>`
- Segments: Department reassignment / Deadline fix / Action rewrite / Priority change
- Amber segment is the largest (most common type)
- Center text shows total corrections in JetBrains Mono

**Department accuracy bar** — Recharts `<BarChart>`
- One bar per department
- Color: above 90% → teal, 75–90% → amber, below 75% → coral
- Horizontal bars preferred (easier to read department labels)

**Corrections log table**
- Columns: Date, Circular, Obligation excerpt, Field changed, Original → Corrected
- 21st.dev `ScrollArea` wrapping the table
- Original → Corrected shown as a diff: strikethrough old value in `--status-overdue`, new value in `--status-closed`

---

### 5.7 Audit Trail

**URL:** `/audit`  
**Roles:** Compliance Officer, Auditor  
**Job:** Immutable record of every action taken in the system. Exportable for RBI inspection.

This page should feel like a legal ledger — dense, precise, permanent.

#### Layout

Full-width table with filters. No sidebar.

```
┌──────────────────────────────────────────────────────┐
│  TOPNAV + TICKER RAIL                                │
├──────────────────────────────────────────────────────┤
│                                                      │
│  Audit Trail                                         │
│  [Filters: Date range · Circular · Actor · Type]     │
│  [Export PDF]  [Export CSV]                          │
│                                                      │
│  ┌──────────────────────────────────────────────┐    │
│  │  Timestamp | Actor | Action | Circular | MAP │    │
│  ├──────────────────────────────────────────────┤    │
│  │  [row] [row] [row] [row] [row]               │    │
│  └──────────────────────────────────────────────┘    │
│  [Pagination]                                        │
└──────────────────────────────────────────────────────┘
```

#### Components

**Filter bar**
- Compact horizontal bar of filter chips that expand on click
- Date range picker (21st.dev calendar component, dark themed)
- Circular filter: typeahead search by circular ID
- Actor filter: dropdown of users
- Type filter: multi-select chips — MAP Created / Approved / Dispatched / Evidence Submitted / Verdict Returned / Gate 2 Closed / Escalation Fired

**Audit table**
- `table-layout: fixed`, column widths explicitly set
- Timestamp: JetBrains Mono 12px `--text-secondary`
- Actor: DM Sans 13px with role chip (tiny)
- Action: DM Sans 13px. Event types have a leading icon (Tabler icons matching event type)
- Circular: `<CircularID>` component
- MAP: `<MapID>` component (if applicable)
- Row hover: very subtle `--accent-muted` background

**Immutability indicator**
- A small padlock icon in the header with tooltip: "This log is immutable and tamper-evident"
- The entire table has a `1px` amber left border on the container — a subtle visual signal of permanence

**Export**
- "Export PDF" triggers a backend call that generates the PDF (uses the existing PDF skill)
- "Export CSV" downloads filtered results
- Both buttons are secondary style — no accent color (exporting is not a high-stakes action)

---

### 5.8 Settings

**URL:** `/settings`  
**Roles:** Compliance Officer  
**Job:** Configure department routing taxonomy, notification preferences, auto-close thresholds, and user management.

#### Layout

Vertical tabs on the left (sidebar nav), content panel on the right.

```
┌───────────────────────────────────────────────────────────┐
│  TOPNAV + TICKER RAIL                                     │
├───────────────────────────────────────────────────────────┤
│                                                           │
│  ┌─ SETTINGS NAV ────┐  ┌─ CONTENT PANEL ──────────────┐ │
│  │  Routing Taxonomy │  │                              │ │
│  │  Notifications    │  │  [Current section content]   │ │
│  │  Auto-close       │  │                              │ │
│  │  Users            │  │                              │ │
│  │  Escalation       │  │                              │ │
│  └───────────────────┘  └──────────────────────────────┘ │
└───────────────────────────────────────────────────────────┘
```

#### Settings Sections

**Routing Taxonomy**
- Editable list of departments, each expandable to show trigger keywords
- Add/remove keywords with tag-style input
- "Test routing" feature: paste an obligation sentence, see which department it would be assigned to and why
- Save changes logs to audit trail

**Notifications**
- Per-user email preferences
- Escalation schedule config: 3-day / 7-day / 14-day thresholds (editable)
- Digest vs immediate toggles

**Auto-close thresholds**
- Confidence threshold slider (default 85%) — below this, ALL verdicts go to Gate 2 regardless of priority
- Toggle: require Gate 2 sign-off for ALL MAPs (highest security setting)

**Users**
- Table of users, roles, departments
- Invite new user form
- Role assignment dropdown

**Escalation Ladder**
- Visual representation of the escalation chain
- Editable: reassign escalation recipients at each tier
- Uses a simplified pipeline visualization with Aceternity `TracingBeam` to show the escalation flow

---

## 6. Motion & Animation System

### 6.1 Principles

1. Motion communicates **state change**, not decoration
2. The ticker rail and stat counters are the two ambient animations — always running
3. Framer Motion for component-level animations, CSS `@keyframes` for ambient effects
4. Total motion on any given page should feel like a precision instrument, not a demo reel

### 6.2 Animation Library

```tsx
// Shared Framer Motion variants — import from @/lib/motion

export const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.25, ease: [0.16, 1, 0.3, 1] } }
}

export const staggerChildren = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } }
}

export const mapCardReveal = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] } }
}

export const scaleIn = {
  hidden: { opacity: 0, scale: 0.96 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.2, ease: [0.16, 1, 0.3, 1] } }
}

export const slideInRight = {
  hidden: { opacity: 0, x: 24 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] } }
}
```

### 6.3 Page Load Sequence

Each page has a deliberate stagger sequence on mount:

1. Topnav fades in — 0ms
2. Ticker rail slides down — 150ms
3. Page title fades up — 200ms
4. Stat row: cards stagger in left to right — 300ms, 60ms between each
5. Main content area: cards/rows stagger in — 450ms

This entire sequence takes under 700ms and uses `fadeUp` with `staggerChildren`.

### 6.4 Micro-interactions

| Interaction | Animation |
|-------------|-----------|
| Button hover | `scale: 1.01`, 120ms spring |
| Card hover | `translateY: -2px`, 150ms ease-out |
| MAP card approve toggle | Background color crossfade, 200ms |
| Evidence upload drag-enter | Border transitions from `--border-default` to `--border-accent`, 100ms |
| Toast appear | Slides in from right, 250ms spring |
| Modal open | `scale: 0.96 → 1`, `opacity: 0 → 1`, 200ms |
| Gate banner pulse dot | `opacity: 1 → 0.3 → 1`, 2s ease-in-out infinite |
| Overdue row | Subtle amber shimmer on the left border, 3s infinite |

### 6.5 Ticker Rail Animation

```css
@keyframes ticker-scroll {
  from { transform: translateX(0); }
  to   { transform: translateX(-50%); }
}

.ticker-track {
  display: flex;
  animation: ticker-scroll 40s linear infinite;
}

.ticker-track:hover {
  animation-play-state: paused;
}
```

Content is duplicated to create a seamless loop. Each item has a `1px` amber-colored separator (`·`) between it and the next.

---

## 7. Responsive Behaviour

### 7.1 Breakpoints

```
mobile:  0 — 767px
tablet:  768 — 1023px
desktop: 1024px+
```

ARCA is a desktop-first product. It is used by compliance officers at workstations. Mobile support is secondary — provide it for reading and notification viewing, not for MAP review.

### 7.2 Layout Adaptations

| Page | Desktop | Tablet | Mobile |
|------|---------|--------|--------|
| Dashboard | 70/30 split | Stack columns | Stack, sidebar collapsed |
| Gate 1 Review | 40/60 split | Hide circular panel by default, toggle | Single column, tabs between circular/MAPs |
| Gate 2 Sign-off | Centered card | Same | Full-width card |
| Analytics | Multi-column charts | 2-column | Single column, charts full width |
| Audit Trail | Full table | Horizontal scroll | Card view per row |
| Settings | Side nav + content | Top tabs | Top tabs |

### 7.3 Ticker Rail

On mobile: replaced with a static "N items need attention" chip below the topnav. The scrolling ticker doesn't translate well to narrow viewports.

---

## 8. Accessibility

### 8.1 Minimum Requirements

- All interactive elements reachable by keyboard in logical tab order
- Focus rings: `2px solid --accent` offset `2px` — amber rings work well on the dark background
- Color never used as the sole signal — status chips always include text labels, priority chips always include text, `<VerdictBadge>` includes an icon
- `prefers-reduced-motion` respected: Framer Motion provides this via the `useReducedMotion` hook; wrap all non-essential animations

### 8.2 Contrast Ratios

- `--text-primary` (#F0EDE8) on `--bg-void` (#0A0C0F): 18.5:1 — far exceeds AAA
- `--accent` (#E8C547) on `--bg-void` (#0A0C0F): 11.2:1 — passes AAA
- `--text-secondary` (#9A9590) on `--bg-surface` (#111418): 5.1:1 — passes AA
- Status colors on their respective `*-bg` tokens all exceed 4.5:1

### 8.3 Screen Reader Considerations

- `aria-live="polite"` on the toast notification container
- `aria-label` on all icon-only buttons
- MAP cards: `role="article"` with `aria-labelledby` pointing to the MAP ID
- Gate banners: `role="alert"` so screen readers announce them immediately on page load
- Ticker rail: `aria-hidden="true"` — the content is visible in the dashboard list, the ticker is decorative

---

*End of ARCA Frontend Design Document — v1.0*
