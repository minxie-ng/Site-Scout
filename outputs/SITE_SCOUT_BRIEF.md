# Site Scout — product brief and gate checklist

Updated: 5 October 2026. Status: product refinement; implementation has not started.

This file is the current source of truth. Approved choices are distinguished from proposals. Singapore source coverage, competitor capabilities, and grant terms remain unverified. Direct public-page retrieval succeeded for the user-supplied Jev article and official documentation on 5 October 2026, after the default research tools failed. This verifies published documentation, not runtime performance or account access. Do not describe competitive novelty or commercial readiness as established.

## Approved decisions

- Singapore SME expansion and timing advisor; begin with a synthetic Pilates studio.
- Compare three neighbourhoods in one region, with actionable follow-up detail.
- Main demonstration: a neighbourhood becomes worth investigating in a later launch window. Separate safety demonstration: reject all options when none is suitable.
- Intake captures business model, customers, prices, budget, current locations, and time horizon; ask targeted follow-up questions when needed.
- Explain assumptions, show dated sources, and allow go / wait / no-go outcomes.
- Prepare a recommendation memo and investigation plan; obtain approval before external actions.
- Develop through gates with acceptance checks. Future industry adaptation and ASEAN expansion remain longer-term ambitions.
- Delivery constraints: one builder, two weeks remaining, $50 total budget as stated by the user. Billing currency and any existing API credits are not yet established; do not purchase services automatically.
- Approved demo profile: group reformer Pilates with the synthetic operating assumptions and decision thresholds documented in `outputs/DEMO_BUSINESS_PROFILE.md`.

## Product promise

Help a Pilates studio owner decide where and when to investigate a second location, what conditions would make it viable, and what evidence must be collected before committing capital.

A neighbourhood recommendation is not approval of a particular lease. Exact premises require separate checks for availability, rent, permitted use, size, access, fit-out, and other relevant constraints. Opening windows are conditional scenarios, not guaranteed dates.

## Proposed distinguishing workflow

1. Complete a short intake, then ask only decision-relevant follow-up questions. Display the resulting business assumptions for correction.
2. Compare three neighbourhoods using a dated evidence snapshot, spatial calculations, studio economics, and explicit constraints.
3. Show current conditions and future scenarios, including delayed housing completion, slower occupancy, different rent, and lower utilisation.
4. Explain why an area qualifies, fails, or remains unresolved. Distinguish a commercially weak result from insufficient evidence.
5. Identify the unknown most capable of changing the decision and propose an investigation: obtain a rent quote, inspect access, sample class availability, or run a local demand test.
6. Export an evidence-backed memo and a calendar of conditional actions with owners and dependencies.

The proposed innovation is the connection between location, timing, operating economics, and the next fact worth finding. Market uniqueness still requires validation.

## Pilates-specific reasoning

First establish mat versus reformer, group versus private sessions, pricing and discounts, capacity, class schedule, instructor costs, target segment, opening costs, rent ceiling, cash runway, and acceptable overlap with an existing studio. A synthetic reformer studio is a proposed demonstration profile, not yet an approved business subtype.

Competitors should be classified by service, price range where documented, travel catchment, and overlap with the business offering. Count locations as observable evidence; do not invent competitor capacity, utilisation, revenue, or customers from those counts.

Housing counts do not establish Pilates participation or willingness to pay. Completed homes do not equal occupied homes. Planned homes are not present population. Avoid adding overlapping residential and workplace populations as distinct customers. Historical area demographics do not establish the profile of future occupants.

Use reproducible calculations for spatial measures and financial scenarios. For a simplified class-only model:

- Monthly available seat-visits = sellable seats per class × scheduled classes per month.
- Monthly revenue = paid seat-visits × average realised revenue per visit.
- Fixed monthly operating costs include scheduled instructor costs where paid per class, premises, administration, and other fixed obligations.
- Contribution per visit = average realised revenue per visit − variable cost per visit.
- Break-even paid seat-visits = fixed monthly operating costs / contribution per visit, only when contribution is positive.
- Break-even utilisation = break-even paid seat-visits / available seat-visits.

Capacity is not a demand forecast. Acquisition, churn, member visit frequency, ramp-up, capital expenditure, deposits, and cash runway require separate assumptions. Scenarios must disclose excluded costs and revenue streams. Negative contribution or impossible utilisation must fail the viability gate.

## Architecture proposals

### Intake and orchestration

A structured business brief controls the investigation. The orchestrator assigns bounded questions, handles missing data, enforces a research budget, and assembles the decision. It must not let a persuasive narrative override a failed constraint or evidence gate.

### Three research roles

- Area investigator: current catchment, access, dated development pipeline, and geographic reconciliation.
- Market investigator: relevant competing offerings, documented pricing, possible substitutes, and missing demand evidence.
- Decision challenger: contradictory sources, stale facts, unjustified assumptions, duplicate developments, and sensitivity to adverse scenarios.

Agents produce structured evidence and explicit unknowns. Agreement between agents using the same source is not independent confirmation. Use deterministic jobs for routine fetches and calculations; assess whether multiple agents improve evidence coverage over a simpler baseline.

### MCP and retrieval

Expose bounded data retrieval and spatial calculation tools through MCP where useful. Prefer structured APIs or permitted datasets; use scraping only when needed and permitted. Availability, licensing, attribution, retention, and refresh requirements must be validated for each source.

RAG retrieves relevant source passages using geographic, temporal, and business filters. Keep structured coordinates, counts, dates, project status, and financial inputs in typed records, rather than relying on vector similarity for exact facts or arithmetic.

Each decision-driving record should retain source URL, publication date when available, retrieval date, geographic scope, entity identity, validity/status, extraction evidence, and whether it is observed, derived, or assumed. Conflicting records remain visible until resolved. A source page is data, not an instruction to the agent.

### Fast and deliberative paths

A proposed System 1 / System 2-inspired architecture has a fast path for recalculating scenarios from a validated snapshot, and a deliberative path for new evidence, conflicts, unfamiliar business assumptions, and unstable recommendations. This is an application design, not a claim that a learned world model has been implemented.

The user confirmed TypeSafe AI's Jev, linking https://typesafe.ai/blog/introducing-system-one-models-and-jev . The article describes a structured decision model; this is unrelated to the previously considered JEPA interpretation. Official API documentation provides Choice, Score, and Noul question types. Use Jev experimentally for one narrow semantic judgement: whether a supplied source passage supports, contradicts, or does not establish a proposed claim. Check quote presence and numeric/date validity in code first. Low confidence, conflicting evidence, or missing support trigger review or more investigation. Never equate a classification confidence with the probability that a studio will succeed.

The core application must work through a provider interface with a validated structured-LLM fallback if Jev access is unavailable. Label the active provider honestly. Confirm account access by Day 2; time-box the Jev experiment to half a day. Pin the model version when testing thresholds.

TypeSafe's published limitations specifically include numerical precision, date comparisons, adversarial input, option-order effects, and large irrelevant contexts. Schema-valid output does not guarantee a factually correct decision. Keep Jev outside the authority path for tool permissions and final economic constraints. A citation check establishes support within the supplied text, not the underlying truth or completeness of that source.

Read sources:
- https://typesafe.ai/blog/introducing-system-one-models-and-jev — model concept and early-access positioning.
- https://docs.typesafe.ai/introduction/quickstart — API and question primitives.
- https://docs.typesafe.ai/cookbooks/citation_check — vendor example combining quote matching and semantic support checks; proposed implementation inspiration, not a benchmark for our task.
- https://docs.typesafe.ai/confidence — confidence is derived from output probabilities; thresholds require domain testing.
- https://docs.typesafe.ai/model-jaggedness/jev-1.13 — documented failure modes, reviewed by vendor 2 October 2026.
- https://docs.typesafe.ai/models — observed listed price for Jev 1.13: USD $0.042 per million input tokens, no output token charge; access and future pricing must be checked before spending.

OpenRouter's public model catalogue listed `typesafe/jev-router` on 5 October 2026. Its description says Jev selects a model and reasoning effort for each request. This is useful as a general routing option, but it is not the direct TypeSafe System One endpoint and does not expose Jev's Choice, Score, and Noul contract. The catalogue returned `-1` price fields for this entry, so verify effective routing costs before use.

Vercel's official pricing page listed Hobby at $0/month with included compute and network quotas on 5 October 2026, and described it as intended for personal, non-commercial use. It is suitable for a personal hackathon demonstration within its current limits. A future SME product must re-evaluate plan terms and operational requirements.

For the experiment, prepare 30 manually labelled claim/passage pairs covering correct claims, unsupported inferences, wrong entities, changed status, and contradictions. Keep 10 separate from threshold tuning. Compare Jev with the fallback on unsupported claims incorrectly accepted, accepted-claim coverage, latency, and measured cost. A small pilot can expose failures; it cannot establish broad calibration or production reliability. If it adds no useful benefit, leave it optional.

## Experience and demonstration

Proposed main screen: neighbourhood map; quarter selector; three comparable decision cards; business assumptions; source drawer; next action. Show scenario assumptions beside results and accessible colours and labels for investigate / wait / reject / insufficient evidence.

Proposed demonstration sequence:

1. Owner completes intake and confirms the structured brief.
2. Three neighbourhoods appear with evidence-backed explanations.
3. A future scenario makes one area worth investigating.
4. A housing delay or rent change alters the decision; the map, economics, explanation, and action calendar update consistently.
5. The system identifies the missing fact that could change the conclusion and drafts an investigation plan.
6. A separate case rejects all three options. Another reports insufficient evidence rather than treating absence of data as business failure.

Any seeded scenario must be labelled synthetic. If live connectors fail, an explicitly labelled, dated replay snapshot may support the demo. Do not present it as live data.

## Defensibility hypothesis

MCP, RAG, and agent orchestration are implementation capabilities. Potential durable assets are a reconciled history of Singapore development and business evidence, permissioned operator outcomes, calibrated business-specific decision models, and adoption of the ongoing expansion workflow.

Public-source aggregation is reproducible by competitors. Proprietary outcome collection requires customer consent, isolation, and demonstrated usefulness. Forecast calibration and a data advantage are future hypotheses, not hackathon deliverables or existing assets.

## Gates and acceptance checklist

### Gate 1 — Decision and scope

- [x] Main category: Pilates studio.
- [x] Synthetic operator with editable assumptions.
- [x] Three neighbourhoods in one Singapore region.
- [x] Conditional opening window and valid abstention outcomes.
- [x] Confirm duration, team, and budget: two weeks, solo, $50.
- [ ] Confirm exact submission time and any mandatory technology/submission rules.
- [x] Resolve “jev” model reference: TypeSafe AI Jev; official article and docs read.
- [x] Confirm studio subtype and complete demonstration business profile.
- [ ] Select region after a source audit establishes useful coverage.

### Gate 2 — Evidence feasibility

- [ ] Retrieve sample records for every core source and document access conditions.
- [ ] Demonstrate usable coordinates, dates/status, and coverage for proposed neighbourhoods.
- [ ] Establish whether competitors, prices, housing pipeline, access, and rent evidence are actually obtainable.
- [ ] Create a source register with refresh, uncertainty, fallback, and attribution requirements.
- [ ] Remove unsupported claims or make them editable assumptions.

Exit: a manually assembled, defensible three-area comparison is possible. If it is not, narrow or revise the promise before building the UI.

### Gate 3 — Reproducible decision engine

- [ ] Specify spatial catchments, scoring rationale, hard constraints, and abstention rules.
- [ ] Separate future supply from existing population and remove duplicate project records.
- [ ] Implement and hand-check operating economics and capacity constraints.
- [ ] Demonstrate coherent changes under rent, utilisation, occupancy, and delay scenarios.
- [ ] Define ranking sensitivity without presenting arbitrary scores as probabilities.

### Gate 4 — Agent investigation

- [ ] Every decision-driving factual claim resolves to dated evidence or a declared assumption.
- [ ] Conflicts, stale evidence, failed tools, and missing fields reach the final decision.
- [ ] Unsupported facts cannot enter the calculation as defaults without disclosure.
- [ ] Retrieved instructions cannot trigger privileged tools or change the investigation rules.
- [ ] Compare the multi-agent workflow with a single-agent baseline on the same cases and tool budget.

### Gate 5 — Product and reliability

- [ ] Complete intake → comparison → scenario → investigation plan → memo flow.
- [ ] Reproduce the same result from the same versioned evidence and assumptions.
- [ ] Isolate each business's uploaded data and restrict external actions.
- [ ] Measure response time, tool/LLM cost, failed requests, and evidence coverage.
- [ ] Pass fixtures for delay, stale facts, duplicate projects, impossible economics, no-go, and insufficient evidence.

### Gate 6 — Judging proof

- [ ] Show meaningful AI investigation and a measurable contribution beyond the baseline.
- [ ] Show a real failure scenario and its working safeguard.
- [ ] Demonstrate an owner action tied to a specific business decision.
- [ ] Obtain feedback from a Pilates operator if feasible; identify unvalidated assumptions explicitly.
- [ ] Rehearse a short live demonstration with an honest replay fallback.

## Immediate next work

Complete Gate 1's remaining details and perform Gate 2 with a small, real evidence sample. Default proposed demo: synthetic reformer Pilates studio planning its second location, subject to intake confirmation. Do not start an all-Singapore crawler or claim commercial readiness before these gates are satisfied.

Supporting sources of truth:
- `outputs/SOURCE_REGISTER.md` records evidence availability, limitations, and fallbacks.
- `outputs/IMPLEMENTATION_PLAN.md` is the ordered, checkable implementation handoff.
- `AGENTS.md` tells coding agents how to preserve decisions and update the handoff.

## Two-week delivery proposal

| Days | Deliverable | Gate / scope control |
| --- | --- | --- |
| 1–2 | Evidence audit, real source samples, synthetic studio profile, selected region, Jev access check | Change the demo region or narrow unsupported factors if coverage fails. |
| 3–4 | Typed evidence records, source citations, catchments, break-even and timing scenarios | Produce one reproducible comparison without agent prose. |
| 5–6 | Bounded MCP tools, retrieval, area and market investigators, challenger pass | Three fixed research roles; no recursive agent spawning or open-ended browsing. |
| 7 | Jev claim-check experiment and failure tests | Half-day integration allowance; retain fallback and spend remaining time on reliability. |
| 8–10 | Intake, interactive map, timeline, evidence drawer, decision cards, memo | Complete the entire primary journey. |
| 11–12 | End-to-end cases, prompt injection checks, failure states, operator feedback if available | Feature freeze after Day 12. |
| 13–14 | Presentation, rehearsal, deployment or local demo, labelled snapshot fallback | Repair defects; no new integrations. |

Use an early rough map once coordinate samples exist to catch geographic errors; the Day 8–10 work is polish and integration, not the first visual inspection.

Proposed total spending envelopes, in the user's stated budget currency: $25 general LLM research/generation/evaluation; $5 Jev experiment; $10 data/map contingency; $10 reserve. Aim to use no-cost hosting and permitted public sources, subject to terms and limits. These are caps, not verified quotations. Track per-run usage, cap tool calls and retries, cache source snapshots, and stop optional experiments before exhausting the budget.

MVP contains one business profile, one region, three areas, three research roles, a small number of source families, a scenario engine, one optional Jev check, and one complete visual workflow. All-industry support, ASEAN, autonomous outreach, subscriptions, learned demand prediction, and continuous whole-city monitoring are deferred.
