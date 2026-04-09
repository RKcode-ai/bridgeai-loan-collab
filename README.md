# BridgeAI (Loan Calculator Collaboration MVP)

BridgeAI is a hackathon-ready Next.js application that helps business experts and engineers collaborate on a **public loan calculator GitHub repository**.

## Core flow

1. Paste a public GitHub repository URL.
2. Click **Index Repo**.
3. Enter a business requirement.
4. Run analysis to receive:
   - **Business Agent** output
   - **Engineering Agent** output
   - **Evidence / Traceability** snippets from the indexed repository

## Stack

- Next.js (App Router)
- TypeScript
- Tailwind CSS
- Next.js API routes
- OpenAI Responses API
- Local JSON cache for repository manifests (`.cache/repos`)

## Scope

- Optimized for a loan calculator challenge only.
- Supports public GitHub repos only.
- Private repo auth is intentionally out of scope.
- Focused on demo reliability and speed.

## Architecture

### Repo ingestion

`POST /api/index-repo`
- Validates GitHub URL
- Fetches repo metadata + default branch from GitHub API
- Fetches up to 40 text files from the repository tree
- Creates:
  - file summaries
  - chunked text segments
  - repo-level summary
- Caches manifest JSON locally for re-use

### Retrieval

During analysis, BridgeAI does lightweight token-based ranking and selects top chunks relevant to the requirement.

### Dual-agent orchestration

`POST /api/analyze`
- Loads cached manifest (or indexes if missing)
- Retrieves relevant evidence chunks
- Calls OpenAI Responses API for:
  - Business Agent JSON
  - Engineering Agent JSON
- Uses strict shared schemas (`zod`) and fallback outputs when model/API is unavailable

## Run locally

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open http://localhost:3000

## Build checks

```bash
npm run typecheck
npm run build
```

## Demo script

1. Use sample repo URL and click **Index Repo**.
2. Click **Use sample requirement**.
3. Click **Run Business + Engineering Agents**.
4. Walk judges through:
   - business framing
   - engineering impact plan
   - retrieved evidence mapping to impacted files

## Sample requirement

> Add support for a promotional rule where users selecting a 36-month term with credit score above 740 receive a 0.5% reduced interest rate, while keeping monthly payment calculation transparent.

## Notes

- If `OPENAI_API_KEY` is not set, the app still works with deterministic fallback outputs.
- GitHub API rate limits may affect frequent indexing in unauthenticated mode.
