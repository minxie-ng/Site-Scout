# Site Scout MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a reliable, visually strong Singapore neighbourhood expansion advisor that helps a synthetic reformer Pilates operator investigate where and when to open a second studio.

**Architecture:** A Next.js application reads versioned evidence snapshots and user assumptions, runs deterministic spatial and financial scenarios, and invokes bounded AI adapters for research synthesis and claim checking. The UI shows three neighbourhoods on a map with timeline scenarios, evidence provenance, and investigate / wait / no-go / insufficient-evidence decisions. Live MCP connectors refresh evidence when available; the judged demo remains reproducible from a labelled snapshot.

**Tech Stack:** Next.js with TypeScript, Zod, Vitest, MapLibre GL, Turf.js, a small checked-in JSON/GeoJSON demo snapshot, Vercel Hobby for personal hackathon hosting, OpenRouter-compatible general LLM adapter, and optional direct TypeSafe Jev adapter.

---

## File map

| Path | Responsibility |
| --- | --- |
| `src/domain/evidence.ts` | Evidence, provenance, status, and assumption schemas. |
| `src/domain/business.ts` | Pilates business intake and validation. |
| `src/domain/scenario.ts` | Scenario inputs and deterministic decision outputs. |
| `src/engine/economics.ts` | Capacity, contribution, break-even, and viability calculations. |
| `src/engine/spatial.ts` | Distance and catchment calculations. |
| `src/engine/decision.ts` | Hard constraints, abstention rules, sensitivity, and next investigation. |
| `src/providers/research.ts` | Stable interface for bounded research roles. |
| `src/providers/claim-check.ts` | Jev and structured-LLM implementations behind one interface. |
| `src/data/demo/*.json` | Versioned synthetic assumptions and reviewed source snapshots. |
| `src/app/page.tsx` | Intake-to-recommendation product flow. |
| `src/components/*` | Map, cards, timeline, assumptions, evidence drawer, and memo. |
| `src/app/api/analyse/route.ts` | Server-side orchestration and budget controls. |
| `mcp/site-scout/*` | Read-only MCP server for evidence and spatial tools if time permits. |
| `tests/*` | Unit, fixture, provider-contract, and end-to-end reliability tests. |

## Task 0: Preserve shared truth

**Files:** `AGENTS.md`, `outputs/SITE_SCOUT_BRIEF.md`, `outputs/SOURCE_REGISTER.md`, `outputs/IMPLEMENTATION_PLAN.md`

- [x] Read and align the product brief, evidence register, and plan.
- [x] Record the two-week solo constraint and $50 budget.
- [ ] Add the exact submission deadline and mandatory hackathon technologies to `SITE_SCOUT_BRIEF.md` when known.
- [ ] At every session end, check completed items and append a session note containing commands run, findings, blocker, and exact next task.

Acceptance: a new coding agent can identify the authoritative product decisions, earliest unfinished gate, and next task without relying on chat history.

## Task 1: Close Gate 1 with a demo decision contract

**Files:** create `src/data/demo/business-profile.json`; create `tests/fixtures/business-profile.invalid.json`; modify `outputs/SITE_SCOUT_BRIEF.md`.

- [x] Define a synthetic reformer studio: class size, weekly schedule, average realised price per visit, variable cost per visit, instructor and other fixed monthly costs, rent range, opening budget, runway, target segment, expansion horizon, and hard go/no-go thresholds.
- [x] Mark every value `synthetic_assumption` with owner-editable status.
- [ ] Pick three neighbourhoods in one region only after Task 2 confirms usable coordinates and development evidence.
- [x] Define four mutually exclusive outputs: `investigate`, `wait`, `no_go`, `insufficient_evidence`.
- [x] Validate that missing price, capacity, rent range, or time horizon blocks analysis rather than being guessed.

Acceptance: the valid profile passes schema validation; the invalid fixture reports each missing decision-critical field.

## Task 2: Prove source feasibility

**Files:** create `src/data/snapshots/2026-10-05/manifest.json`; create `src/data/snapshots/2026-10-05/places.geojson`; create `src/data/snapshots/2026-10-05/developments.json`; create `src/data/snapshots/2026-10-05/competitors.json`; modify `outputs/SOURCE_REGISTER.md`.

- [ ] Register/test OneMap access and save a response for each candidate neighbourhood anchor.
- [ ] Find one official dated development record with usable name, area, status, timing, and unit count; otherwise use a synthetic event and label the factual timing feature unproven.
- [ ] Curate 8–12 relevant Pilates outlets in the chosen region with source URLs and retrieval dates.
- [ ] Record map-tile attribution and deployment terms.
- [ ] Normalize the records and validate coordinates, status vocabulary, timestamps, and provenance.
- [ ] Select the final region based on evidence coverage, not narrative preference.

Acceptance: a script loads the snapshot, validates every record, and renders all three neighbourhood anchors and evidence points without a network call.

## Task 3: Build the deterministic decision engine

**Files:** create `src/domain/*.ts`; create `src/engine/*.ts`; create `tests/economics.test.ts`, `tests/spatial.test.ts`, and `tests/decision.test.ts`.

- [ ] Write failing tests for monthly capacity, contribution, break-even visits, and break-even utilisation.
- [ ] Implement pure financial functions; reject non-positive contribution and impossible utilisation.
- [ ] Write failing tests for Haversine distance and radius membership using known coordinate pairs.
- [ ] Implement spatial functions with Turf.js and retain units in function names/types.
- [ ] Write fixture tests where rent increase, delayed development, and lower utilisation change the outcome predictably.
- [ ] Implement hard constraints before weighted comparison. Missing decision-critical evidence yields `insufficient_evidence`; all failed economics yields `no_go`.
- [ ] Compute the next investigation by re-running uncertain inputs across their ranges and returning the unresolved input most capable of changing the result.

Acceptance command: `npm test`. Expected: all unit and fixture tests pass with no network access and identical results on repeat runs.

## Task 4: Add bounded AI providers

**Files:** create `src/providers/research.ts`, `src/providers/claim-check.ts`, `src/providers/openrouter.ts`, `src/providers/typesafe.ts`, `tests/provider-contract.test.ts`, and `tests/fixtures/claim-check.json`.

- [ ] Define typed research outputs: claims, cited evidence IDs, conflicts, unknowns, and recommended investigation. Reject prose-only provider responses.
- [ ] Implement a configurable OpenRouter-compatible adapter with request, token, retry, and dollar caps.
- [ ] Implement claim checking with `supported`, `contradicted`, `not_established`, and `review` results.
- [ ] Put direct TypeSafe access behind `TYPESAFE_API_KEY`; keep it optional.
- [ ] Create 30 manually labelled claim/passage pairs and hold 10 out from threshold tuning.
- [ ] Compare Jev and fallback on unsupported claims incorrectly accepted, accepted-claim coverage, latency, and measured cost. Pin exact models in the result log.
- [ ] Disable automatic acceptance if the held-out set reveals an unsafe threshold.

Acceptance: both provider implementations pass the same contract tests; the app completes with the fallback when TypeSafe is absent; no model performs arithmetic, date comparison, or tool authorization.

## Task 5: Expose bounded MCP tools

**Files:** create `mcp/site-scout/server.ts`, `mcp/site-scout/tools.ts`, `mcp/site-scout/schemas.ts`, and `tests/mcp-tools.test.ts`.

- [ ] Expose read-only tools for `get_business_profile`, `search_evidence`, `get_neighbourhood_snapshot`, `calculate_distance`, and `run_scenario`.
- [ ] Require bounded area IDs and return evidence IDs with every retrieved claim.
- [ ] Reject unknown tools, arbitrary URLs, write requests, and instruction-like content from evidence.
- [ ] Add per-run call limits and structured error codes.

Acceptance: tool tests demonstrate valid calls, invalid schema rejection, prompt-injection text treated as data, and no external writes. If this task threatens the schedule, demo the same interfaces in process and explain the MCP boundary in architecture.

## Task 6: Build the visual decision flow

**Files:** create `src/app/page.tsx`, `src/app/api/analyse/route.ts`, and components under `src/components/`.

- [ ] Build a short structured form followed by conditional chat questions for missing decision-critical fields.
- [ ] Display and require confirmation of the resulting business decision contract.
- [ ] Render three neighbourhoods, evidence layers, competitor markers, and accessible statuses on a MapLibre map.
- [ ] Add a quarter selector and controls for rent, development delay, occupancy, and utilisation assumptions.
- [ ] Keep map, decision cards, economics, explanations, and calendar synchronized from one scenario object.
- [ ] Add an evidence drawer showing source, date, scope, observed/derived/assumed status, and conflicts.
- [ ] Add a decision memo and next-investigation checklist; no external action is sent.

Acceptance: one user can complete intake, compare three areas, alter a scenario, see a recommendation change, inspect its evidence, and export/copy the memo.

## Task 7: Prove reliability and judging value

**Files:** create `tests/e2e/demo.spec.ts`, `tests/e2e/failures.spec.ts`, `outputs/EVALUATION_REPORT.md`, and `outputs/DEMO_SCRIPT.md`.

- [ ] Test main case: a neighbourhood becomes worth investigating in a later window.
- [ ] Test delayed-development case: recommendation changes to `wait`.
- [ ] Test all-fail case: result is `no_go` without manufacturing a winner.
- [ ] Test missing-source case: result is `insufficient_evidence`.
- [ ] Test stale, duplicate, contradictory, and injected evidence fixtures.
- [ ] Compare multi-role research with a single-agent baseline using the same cases and call budget.
- [ ] Record evidence coverage, unsupported claims accepted, latency, and cost; do not claim statistical significance from the small set.
- [ ] Rehearse a short demo and a labelled snapshot fallback.

Acceptance commands: `npm test`, `npm run build`, and the selected end-to-end test command all pass. Total measured model/API spend remains below the project cap.

## Task 8: Deploy the personal hackathon demo

**Files:** create `.env.example`; modify `README.md`; add deployment configuration only if required.

- [ ] Document local setup, snapshot provenance, required variables, demo limitations, and provider fallbacks.
- [ ] Keep secrets server-side and configure usage caps.
- [ ] Deploy on Vercel Hobby only as a personal hackathon demonstration under current terms.
- [ ] Verify the deployed primary flow and snapshot fallback on desktop and mobile.
- [ ] Record the final URL and commit SHA in `outputs/DEMO_SCRIPT.md`.

Acceptance: a fresh checkout runs from documented commands; the deployed demo completes without exposing keys or requiring a paid data source.

## Session log

### 5 October 2026 — planning and first feasibility check

- Commands/checks: read project brief; queried OneMap documentation and search; requested data.gov.sg, URA, and HDB pages; queried OpenRouter's public model catalogue; read Vercel's official pricing markdown.
- Findings: OneMap returned sample Punggol coordinates with a token warning; URA/HDB direct automated requests returned HTTP 403; OpenRouter listed `typesafe/jev-router`; Vercel listed Hobby at $0/month and described it as personal, non-commercial use.
- Interpretation: use a dated snapshot for demo reproducibility; verify OneMap account access; treat future housing and rent coverage as unresolved; use Vercel Hobby only for the personal hackathon demo.
- Next task: review and approve the five proposed decisions in `outputs/DEMO_BUSINESS_PROFILE.md`; then convert the approved profile into the typed JSON fixture.

### 5 October 2026 — Task 1, part A

- Commands/checks: reread all three required source-of-truth files; drafted one synthetic reformer Pilates decision contract; manually checked the profile's base financial arithmetic.
- Findings: a 10-reformer, 30-class weekly scenario at S$35 realised revenue and base S$13,000 rent yields approximately 63.7% break-even utilisation under the explicitly stated simplified model.
- Remaining blocker: the profile subtype, operating assumptions, financial assumptions, thresholds, and 18–30 month horizon require user approval before they become authoritative or are converted to code.
- Exact next task: obtain approval or corrections for the five items at the end of `outputs/DEMO_BUSINESS_PROFILE.md`.

### 5 October 2026 — Task 1, part B

- Commands/checks: recorded user approval; converted the approved profile to `src/data/demo/business-profile.json`; parsed the JSON; compared its stored inputs with the approved Markdown profile.
- Findings: all decision inputs carry `synthetic_assumption` provenance and an explicit `ownerEditable` flag; the four allowed outcomes are encoded.
- Remaining blocker: no runtime schema exists yet, so required-field rejection has not been implemented or tested.
- Exact next task: define the smallest Zod business-profile schema and one invalid fixture that proves missing decision-critical values are rejected.

### 5 October 2026 — Task 1, part C

- TDD evidence: the initial focused test failed because the validator was absent; missing-input tests passed after the Zod schema was added. Four quality-boundary tests then failed before strict units, integer counts, a fixed ISO analysis date, threshold ordering, and strict object validation were implemented. Two additional tests failed before calendar-valid dates and the rent unit literal were implemented.
- Verification: `npm test -- tests/business-profile.test.ts` passed 8/8; `npx tsc --noEmit` passed; `npm audit --json` reported zero known vulnerabilities after Vitest was upgraded to 5.0.3.
- Independent specification review: approved with no missing or extra scope.
- Independent quality review: initially rejected dimensional units, fractional counts, relative date, threshold ordering, silent unknown keys, invalid calendar dates, and rent-unit looseness. After two test-first repair rounds, the reviewer approved the slice and independently reproduced the focused tests and TypeScript check.
- Remaining Gate 1 item: neighbourhood selection stays open until Gate 2 provides sufficient source coverage.
- Exact next task: audit one official dated development record for the candidate northeast region and decide whether it is usable under the Gate 2 evidence contract.
