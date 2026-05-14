---
name: frontend-reviewer
description: >
  Use this skill whenever a user shares frontend code for review, explanation, or debugging.
  Triggers on: HTML/CSS/JS files, React/JSX/TSX components, or any frontend code pasted in chat.
  Also triggers when the user says "review my frontend", "explain this component", "check my UI code",
  "does my frontend match my backend", "visualize this code", or pastes code that contains
  JSX, HTML tags, CSS, or React imports. If both frontend AND backend code are present (e.g. Express
  routes, FastAPI endpoints, Django views), ALWAYS run the entrypoint compatibility check.
  Do NOT skip this skill if you think you can handle it directly — always follow the full process.
---

# Frontend Reviewer Skill

## Overview

Two modes depending on what the user shares:

| Input | Mode |
|---|---|
| Frontend only | Visualize + Explain |
| Frontend + Backend | Visualize + Explain + Entrypoint Compatibility Check |

---

## Mode 1: Visualize + Explain

### Step 1 — Parse the Code

Identify:
- **Framework**: Plain HTML/CSS/JS or React/JSX/TSX
- **Components / Sections**: List every major UI block (navbar, form, card, etc.)
- **State & Props** (React only): What state exists, what's passed as props
- **API calls**: Any `fetch`, `axios`, `useEffect` with requests — note the **exact URLs and methods**

### Step 2 — Visualize

Use the `show_widget` tool to render a **component tree diagram** or **layout wireframe** using SVG or HTML.

**For React:** Render a component tree showing parent → child relationships, with props labeled on edges.

**For HTML/CSS/JS:** Render a layout wireframe showing the visual structure (header, main, sidebar, footer, etc.) with approximate proportions.

Style rules:
- Monochrome palette (black, white, grays only)
- Clean, minimal — no decorative elements
- Label every node/section clearly
- Keep it compact — max ~500px tall

### Step 3 — Explain

After the diagram, write a structured explanation:

```
## What This Code Does
[1–2 sentence summary]

## Structure Breakdown
- [Component/Section 1]: [what it does]
- [Component/Section 2]: [what it does]
...

## Data Flow
[How data moves — state, props, events, API calls]

## Notable Patterns / Issues
[Any anti-patterns, missing error handling, accessibility gaps, or good patterns worth noting]
```

Keep it tight. No padding.

---

## Mode 2: Entrypoint Compatibility Check

Triggered when backend code is also present.

### Step 1 — Extract Frontend Entrypoints

Scan frontend code for every outbound request:
- `fetch('/api/...')`, `axios.get(...)`, `axios.post(...)`, etc.
- Note: **method** (GET/POST/PUT/DELETE), **path**, **request body shape** (if any), **expected response shape** (if used)

### Step 2 — Extract Backend Entrypoints

Scan backend code for every defined route/endpoint:
- Express: `app.get('/path', ...)`, `router.post(...)`
- FastAPI: `@app.get('/path')`, `@router.post(...)`
- Django: `urlpatterns`, `path(...)`
- Note: **method**, **path**, **expected input**, **response shape**

### Step 3 — Match & Report

Produce a compatibility table:

```
## Entrypoint Compatibility Report

| Frontend Call | Method | Backend Route | Method | Match? | Issue |
|---|---|---|---|---|---|
| /api/login    | POST   | /api/login    | POST   | ✅     | —     |
| /api/user     | GET    | /api/users    | GET    | ❌     | Path mismatch: /user vs /users |
| /api/data     | POST   | —             | —      | ❌     | No backend route found |
```

Then summarize:
```
## Summary
- X / Y endpoints matched correctly
- Issues found: [list each mismatch briefly]
- Recommended fixes: [concrete fix for each issue]
```

---

## Output Order (always follow this)

1. Component tree diagram or layout wireframe (via `show_widget`)
2. Structured explanation
3. Compatibility report (if backend present)

---

## Edge Cases

- **Partial code / snippets**: Note what's missing, still proceed with what's available
- **Inline styles vs CSS files**: Treat both — note if CSS is scattered vs organized
- **Multiple components in one file**: Diagram each component separately
- **REST vs other**: If backend uses GraphQL or WebSockets, note it and adapt the entrypoint check accordingly
- **No API calls in frontend**: Skip data flow section, note it explicitly
