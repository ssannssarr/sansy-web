---
name: backend-review
description: >
  Use this skill whenever the user asks about, shares, or wants feedback on anything backend-related.
  This includes APIs, databases, auth flows, server logic, middleware, ORMs, schemas, WebSockets,
  queues, caching, microservices, Node.js/Python/Go/etc. backend code, or any system design with
  a server component. Trigger on phrases like "review my backend", "is this secure", "does this
  scale", "check my API", "is my schema good", "my server code", "auth flow", "database design",
  or any time backend code or architecture is shared or described. Do NOT skip this skill if you
  think you can answer directly — always run the full review process.
---

# Backend Review Skill

A structured mental-model review process for all backend-related questions or code. No hallucination, no assumptions — ask when unclear, search when unsure.

---

## Process (always follow this order)

### Step 1 — Understand what was shared
- Identify what type of backend thing this is (API, DB schema, auth, infra, code logic, etc.)
- If anything is ambiguous or missing context, **ask the user before proceeding**
- Never assume tech stack, environment, or intent — confirm it

### Step 2 — Mental Model Review
Internally build a mental model of how the system works, then review it across two lenses:

**Security Issues**
- Auth/authz gaps (missing checks, broken access control, JWT misuse, etc.)
- Injection vulnerabilities (SQL, NoSQL, command injection)
- Sensitive data exposure (plaintext secrets, unencrypted fields, logging PII)
- Rate limiting / abuse surface
- CORS, CSRF, SSRF risks
- Dependency or supply chain concerns

**Future Compatibility**
- Will this break under scale? (N+1 queries, missing indexes, connection pool exhaustion)
- Is it tightly coupled in ways that make changes painful?
- Schema migration friendliness (breaking changes, nullable fields, versioning)
- API versioning / backward compatibility
- Tech debt that becomes expensive later

### Step 3 — Search for failure modes
Before giving a verdict, actively think about:
- What could go wrong at runtime?
- What edge cases aren't handled?
- What assumptions does this code make that could be violated?

If you're uncertain about a specific behavior (e.g., how a library handles X, or what a spec says), **do not guess** — use web search to verify.

### Step 4 — Clarification checkpoint
If during the review you find anything where the user's intent is unclear, **stop and ask**. Do not invent intent. Do not proceed past ambiguity.

### Step 5 — Verdict (scored breakdown)

Present results in this format:

```
## Backend Review Verdict

### Security Score: X/10
[List issues found, each with severity: Critical / High / Medium / Low]
[If no issues: explicitly state "No issues found in this area"]

### Future Compatibility Score: X/10
[List concerns with brief explanation]
[If none: explicitly state "No concerns found"]

### Overall Score: X/10
[1–2 sentence summary of the state of this backend thing]

### Recommendations
[Prioritized list: fix these first → then these → nice to have]
```

Scores:
- 9–10: Solid, production-ready
- 7–8: Good with minor gaps
- 5–6: Usable but needs attention before production
- 3–4: Notable problems, refactor recommended
- 1–2: Critical issues, do not ship as-is

---

## Rules

- **No hallucination**: If you don't know something, say so and search or ask.
- **No assumptions**: If the user didn't say it, don't invent it.
- **Always ask if confused**: One clarifying question is better than a wrong review.
- **Be direct**: Don't pad. Give the verdict clearly.
- **Scope is all backend**: APIs, DBs, auth, queues, caching, schemas, server code, infra config — all covered.
