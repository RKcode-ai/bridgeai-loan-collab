# AGENTS.md

## Project
Build a hackathon-ready web app called BridgeAI.

## What the app does
BridgeAI helps business experts and software engineers collaborate on a sample loan calculator GitHub repository.

The app must let a user:
1. paste a public GitHub repository URL
2. index the repository
3. enter a business requirement
4. get answers from two visible AI roles:
   - Business Agent
   - Engineering Agent

## What each role does

### Business Agent
Turn a business requirement into:
- feature name
- business goal
- user story
- acceptance criteria
- assumptions
- edge cases
- open questions
- engineering handoff brief

### Engineering Agent
Use repository evidence to return:
- summary of the current system
- impacted files with reasons
- implementation plan
- test plan
- risks
- business-language explanation of the technical change

## Scope rules
- Build only for the loan calculator challenge
- Support only public GitHub repo URLs
- Ignore private repo access for now
- Optimize for demo quality and reliability
- Do not generalize for all codebases
- The final submission must be publishable and pitch ready

## Technical stack
- Next.js with App Router
- TypeScript
- Tailwind CSS
- Backend routes in Next.js
- OpenAI Responses API for the app backend
- Use retrieval for repo analysis
- Prefer simple local JSON caching if it is faster than adding a database

## Required screens
Single-page app with:
- repo URL input
- "Index Repo" button
- requirement input box
- Business Agent panel
- Engineering Agent panel
- Evidence / Traceability panel
- polished landing copy for judges

## Required architecture
Implement:
- repo ingestion
- repo manifest
- chunking
- file and repo summaries
- retrieval
- Business Agent route
- Engineering Agent route
- shared schemas and prompts
- graceful loading and error states

## Large codebase rule
Do not send the whole repository on every request.
Use:
- repo summary
- file summaries
- chunking
- retrieval of only relevant chunks

## Delivery rules
A task is done only when:
1. the app runs
2. the app builds
3. important errors are fixed
4. the README explains setup, architecture, and demo flow
5. the UI is presentable for a hackathon
6. the app includes sample prompts for the loan-term-calculation challenge

## Working style
- Make pragmatic choices
- Prefer working code over perfect architecture
- Prefer small simple files over overengineering
- If something is unclear, choose the simplest path that still works
- State assumptions clearly
- Do not stop at planning only; produce real working code
- At the end of each task, summarize:
  - what changed
  - files changed
  - commands run
  - any remaining risks
