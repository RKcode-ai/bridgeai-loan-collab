# BridgeAI — Pitch-Ready Loan Calculator Collaboration App

BridgeAI is a judges-first web app that turns a **business requirement** into:
1. a structured **Business Agent brief**,
2. a repository-grounded **Engineering Agent implementation plan**, and
3. **evidence traceability** showing exactly which repo files/chunks informed the recommendation.

The app is intentionally optimized for the **loan-calculator challenge** and public GitHub repos.

---

## What the app does

BridgeAI helps business experts and engineers collaborate quickly on a sample loan calculator codebase.

A user can:
- paste a **public GitHub repository URL**,
- index that repository once,
- enter a business requirement,
- run two visible AI roles:
  - **Business Agent**: product framing + acceptance criteria + handoff brief
  - **Engineering Agent**: impacted files + implementation plan + test plan + risks
- inspect a **traceability panel** that maps requirement → handoff → retrieved evidence → plan.

## Why the dual-role design matters

BridgeAI deliberately exposes two visible roles instead of one generic assistant:

- **Business Agent** reduces requirement ambiguity first.
  - Converts broad asks into testable acceptance criteria and edge cases.
  - Produces a clean handoff brief engineers can act on.
- **Engineering Agent** consumes that handoff + repo evidence.
  - Maps intent to real files and implementation steps.
  - Returns a concrete test plan and delivery risks.

This separation mirrors real product/engineering workflows and makes judge demos easier to follow.

---

## One-glance homepage value

The homepage is designed so judges immediately understand:
- what BridgeAI is,
- the three-step workflow,
- the one-click “**Run Judges Demo (End-to-End)**” flow.

---

## Setup

### 1) Install dependencies

```bash
npm install
```

### 2) Create local env file

```bash
cp .env.example .env.local
```

If `.env.example` does not exist, create `.env.local` manually (see env vars below).

### 3) Run locally

```bash
npm run dev
```

Open: `http://localhost:3000`

### 4) Build checks

```bash
npm run typecheck
npm run build
```

---

## Environment variables

| Variable | Required | Purpose |
|---|---:|---|
| `OPENAI_API_KEY` | Recommended | Enables live model output for both agents. |
| `OPENAI_MODEL` | Optional | Overrides default model (`gpt-4.1-mini`). |
| `GITHUB_TOKEN` | Optional | Raises GitHub API limits for indexing. |

Notes:
- Without `OPENAI_API_KEY`, BridgeAI still returns deterministic fallback outputs for demos.
- Without `GITHUB_TOKEN`, indexing still works but may hit rate limits faster.

---

## Architecture

BridgeAI uses a simple, demo-reliable App Router architecture.

### Frontend
- `app/page.tsx`
  - Repo URL + requirement input
  - One-click judges demo
  - Business Agent panel
  - Engineering Agent panel
  - Evidence / Traceability panel
- `components/AgentPanel.tsx`
- `components/EvidencePanel.tsx`

### Backend routes
- `POST /api/index-repo`
  - Validates GitHub URL
  - Ingests repository metadata/files
  - Builds manifest + summaries + chunks
  - Caches locally for reuse
- `POST /api/business-agent`
  - Retrieves relevant context
  - Produces business-structured output via schema
- `POST /api/engineering-agent`
  - Uses requirement + handoff brief + retrieved evidence
  - Produces engineering-structured output via schema
- `POST /api/analyze`
  - Combined dual-agent route (available for orchestration patterns)

### Core libraries
- `lib/github.ts`: repository ingestion + manifest creation
- `lib/chunking.ts`: chunk generation for retrieval
- `lib/retrieval.ts`: ranked context retrieval
- `lib/openai.ts`: OpenAI Responses API wrapper with schema parsing + fallback
- `lib/schemas.ts`: strict zod request/response contracts
- `lib/cache.ts`: local JSON cache

---

## Large-context strategy (important)

BridgeAI does **not** send full repositories on each request.

It uses a hierarchical approach:
1. build a repo-level summary,
2. summarize files,
3. chunk relevant files,
4. retrieve only top-ranked summaries/chunks for the requirement,
5. send only those targeted snippets to the model.
6. display retrieved evidence in the UI for traceability.

This keeps latency low, reduces token usage, and improves reliability for a hackathon demo.

### Context-window credibility note

BridgeAI is intentionally not RAG-for-everything. It is scoped to the loan-calculator challenge and optimized for demo reliability:

- hard cap on indexed files and file size,
- language-aware text filtering for likely source/docs/config files,
- retrieval of only the top evidence slices per run,
- local cache for repeat demos,
- optional `GITHUB_TOKEN` support to reduce rate-limit risk.

---

## Demo flow (judges-first)

Recommended live demo:

1. Open homepage and point to the hero line (“requirement to implementation plan in under 2 minutes”).
2. Click **Load sample repo + requirement** (if needed).
3. Click **Run Judges Demo (End-to-End)**.
4. Explain outputs in order:
   - Business Agent: feature framing and acceptance criteria
   - Engineering Agent: impacted files and implementation plan
   - Evidence panel: why those files were selected
5. End by emphasizing traceability and handoff quality.

### Live demo guardrails (recommended)

Before demo:
1. Run `npm run typecheck && npm run build`.
2. Load app and click **Force Re-index (Refresh cache)** once.
3. Verify the index status and timestamp update.
4. Keep one fallback line ready: “If the API key is missing, BridgeAI returns deterministic structured output so the demo still runs.”

---

## Sample requirement for the loan-term challenge

Use this requirement (already prefilled in the UI):

> Add a loan term calculation feature that compares 12, 24, and 36 month options, highlights the lowest total cost, and explains monthly payment tradeoffs in plain language.

---

## Pitch bullets (for judges)

- **Problem:** business and engineering alignment breaks down when requirements lack technical traceability.
- **Solution:** BridgeAI creates a business brief + engineering plan grounded in repo evidence.
- **Differentiator:** dual visible roles and transparent evidence chain.
- **Pragmatic design:** scoped to public loan-calculator repos for reliability.
- **Hackathon strength:** one-click end-to-end flow, presentable UI, clear narrative.

---

## 2-minute pitch script

“Hi judges — this is BridgeAI. We solve a common product-delivery problem: business requests and engineering execution often drift because there isn’t a shared, evidence-backed handoff.

In BridgeAI, I paste a public loan calculator GitHub URL and click one button: **Run Judges Demo**.

First, the **Business Agent** transforms a plain-language requirement into a feature definition, user story, acceptance criteria, assumptions, edge cases, and a concise engineering handoff brief.

Second, the **Engineering Agent** reads repository evidence and returns a practical implementation plan: current system summary, impacted files with reasons, tests, and risks.

Third, the **Evidence panel** makes it auditable: you can see how we move from requirement to handoff to retrieved chunks to engineering plan.

Under the hood, we use a large-context strategy that avoids sending the full repo every time. We index once, summarize, chunk, retrieve only what matters, and then call structured model outputs.

So BridgeAI gives teams speed, clarity, and trust — exactly what you want in a real delivery workflow, and exactly what you want in a hackathon demo.”

---

## Remaining known limitations

- Public GitHub repositories only (private auth intentionally out of scope).
- Retrieval quality depends on indexed file coverage and repository structure.
- Model output quality may vary if API credentials are absent (fallback mode is deterministic).
- GitHub API can rate-limit unauthenticated indexing; set `GITHUB_TOKEN` for best reliability.

---

## Troubleshooting

### Indexing fails with 403
- Cause: GitHub API rate limit.
- Fix: set `GITHUB_TOKEN` in `.env.local`, then click **Force Re-index (Refresh cache)**.

### Outputs look generic
- Cause: low-relevance retrieval or missing key files in indexed subset.
- Fix: use a focused requirement and rerun indexing to refresh evidence.

### Build passes but demo feels slow
- Cause: cold indexing against GitHub on first run.
- Fix: pre-index your chosen repo before presenting and use cached runs during the demo.
