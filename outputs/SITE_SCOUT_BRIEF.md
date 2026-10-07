# Site Scout — product brief and gate checklist

Updated: 7 October 2026. Status: Gate 2 source-feasibility exit reviewed and closed; Gate 3 deterministic engine work is in progress.

This file is the current source of truth. Approved choices are distinguished from proposals. Singapore source coverage, competitor capabilities, and grant terms remain unverified. Direct public-page retrieval succeeded for the user-supplied Jev article and official documentation on 5 October 2026, after the default research tools failed. This verifies published documentation, not runtime performance or account access. Do not describe competitive novelty or commercial readiness as established.

## Approved decisions

- Singapore SME expansion and timing advisor for a real operator; use the synthetic Pilates studio only as a labelled demonstration fixture until an operator supplies and confirms their own inputs.
- Compare three named clusters of nearby HDB blocks within one Singapore region. Each candidate must list its included blocks and a defensible map anchor; broad town names are context, not the recommendation unit.
- Main demonstration: one block cluster becomes worth investigating in a later launch window. Separate safety demonstration: reject all options when none is suitable.
- Intake captures business model, customers, prices, budget, current locations, and time horizon; ask targeted follow-up questions when needed.
- Explain assumptions, show dated sources, and allow go / wait / no-go outcomes.
- Prepare a recommendation memo and investigation plan; obtain approval before external actions.
- Develop through gates with acceptance checks. Future industry adaptation and ASEAN expansion remain longer-term ambitions.
- Delivery constraints: one builder, two weeks remaining, $50 total budget as stated by the user. Billing currency and any existing API credits are not yet established; do not purchase services automatically.
- Hackathon entry: Track 4, “Solving a Business Problem,” selected by the user. Official Devpost deadline: 19 October 2026 at 11:45 pm Singapore time (15:45 UTC). Submission requires a public GitHub repository, a fully deployed and functional project, and a Devpost write-up with pictures. The published rules require individual builds; no specific technology is mandated in the rules inspected on 5 October 2026. Sources: https://ai-lodge-hackathon-2026.devpost.com/ and https://ai-lodge-hackathon-2026.devpost.com/rules .
- Approved demo profile: group reformer Pilates with the synthetic operating assumptions and decision thresholds documented in `outputs/DEMO_BUSINESS_PROFILE.md`.
- The hackathon target is dependable **screening for real business investigations**: identify when to investigate, wait, rule out, or abstain for one owner-supplied business profile. Do not claim lease approval, guaranteed demand, or live current evidence when those have not been established.
- No Pilates operator or manager will supply private operating figures or test the product before submission; the user chose public/synthetic data for the hackathon. The real-input pathway may be implemented and tested with synthetic fixtures, but real-world recommendation accuracy and operator usefulness remain unvalidated claims.

## Product promise

Help a Pilates studio owner decide where and when to investigate a second location, what conditions would make it viable, and what evidence must be collected before committing capital.

For a real owner, require them to enter or confirm decision-critical operating inputs before any area result. Present the source date and assumptions beside each recommendation, rerun adverse rent/utilisation/timing cases, and return `insufficient_evidence` when a missing or conflicting input could change the conclusion. A synthetic fixture may demonstrate the workflow but cannot be presented as a recommendation for an actual business.

A block-cluster recommendation is not approval of a particular lease. Exact premises require separate checks for availability, rent, permitted use, size, access, fit-out, and other relevant constraints. Opening windows are conditional scenarios, not guaranteed dates. A planning-area statistic cannot be presented as a fact about the selected blocks.

## Proposed distinguishing workflow

1. Complete a short intake, then ask only decision-relevant follow-up questions. Display the resulting business assumptions for correction.
2. Compare three explicitly bounded HDB block clusters using a dated evidence snapshot, spatial calculations, studio economics, and explicit constraints.
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

Verified on 5 October 2026: OpenRouter exposes the actual Jev 1.13 structured System One/Decisions API under `typesafe/jev-1.13`, accessible with an OpenRouter key. This is distinct from OpenRouter's `typesafe/jev-router`, which routes general chat requests. A separate direct TypeSafe account is unnecessary for the hackathon Jev experiment while OpenRouter access works. Keep the two API routes as provider choices and benchmark either route before positive claims are automatically accepted.

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

Proposed main screen: HDB block-cluster map; quarter selector; three comparable decision cards; business assumptions; source drawer; next action. Show scenario assumptions beside results and accessible colours and labels for investigate / wait / reject / insufficient evidence.

Proposed demonstration sequence:

1. Owner completes intake and confirms the structured brief.
2. Three named HDB block clusters appear with their member blocks and evidence-backed explanations.
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
- [x] Three named HDB block clusters within one Singapore region; exact candidate blocks remain subject to Gate 2 evidence coverage.
- [x] Conditional opening window and valid abstention outcomes.
- [x] Confirm duration, team, and budget: two weeks, solo, $50.
- [x] Confirm exact submission time and mandatory submission rules from Devpost; no mandated technology found in the inspected rules.
- [x] Resolve “jev” model reference: TypeSafe AI Jev; official article and docs read.
- [x] Confirm studio subtype and complete demonstration business profile.
- [x] Select Punggol as the bounded demo evidence region after the source audit established nine checked HDB block points and documented factor-source feasibility. This is not a finding that Punggol is the strongest commercial market; the three candidate groups currently all abstain.

### Gate 2 — Evidence feasibility

- [x] Retrieve bounded samples for every core source family and document access conditions, including negative findings and research-only pages; see `SOURCE_REGISTER.md` and `GATE2_EXIT_AUDIT.md`.
- [x] Demonstrate checked coordinates, explicit block membership, dates/status, and source scope for three proposed Punggol block clusters. No project-to-block join is inferred from a town label.
- [x] Establish which competitor, price, housing-pipeline, access, and rent claims are obtainable at usable scope and which are not; keep the latter out of positive decisions.
- [x] Create a source register with refresh, uncertainty, fallback, access/rights, and attribution requirements.
- [x] Remove unsupported cluster claims from the offline comparison or classify them as prominent, editable assumptions for later scenarios. All three current candidates return `insufficient_evidence`.

Exit: a manually assembled, defensible three-cluster comparison is possible. If it is not, narrow or revise the promise before building the UI.

Gate 2 tests **source feasibility and safe comparison**, not whether a real premises is ready to lease or whether a positive location recommendation is possible. A comparison that names all three clusters, validates their block points, preserves source scope, separates observed facts from assumptions, and returns `insufficient_evidence` for all three can satisfy the exit. A failed source search is an explicit feasibility finding when the source register records the search, access/rights limit, fallback, and decision impact. An unverified competitor price, future completion month, current rent, premises approval, walking route, or live OneMap token cannot be silently used in a positive result. These remain required investigations before any real positive decision, with Gate 3 enforcing abstention and adverse scenarios. Gate 2 closure does not establish market completeness, independent customer catchments, commercial readiness, or real-world recommendation accuracy.

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

- [ ] A real operator can enter and confirm their own business inputs; missing decision-critical values block a recommendation.
- [ ] Every displayed outcome survives deterministic scenario and provenance checks; material evidence gaps or contradictory premises facts trigger abstention and a named next investigation.
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

Continue Gate 3 with test-first rent, utilisation, and synthetic development-delay scenarios after the completed pure economics and spatial-rule slices. Preserve the current all-abstain outcome whenever missing local competitor, premises, access, or future-timing evidence could change a real decision. The demo profile remains synthetic and subject to intake confirmation. The unchecked positive-use evidence upgrades in `IMPLEMENTATION_PLAN.md` remain required before a real positive location recommendation; Gate 2 closure does not establish commercial readiness.

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

## Change log

- 7 October 2026: the reviewed Gate 3 spatial rules now use small deterministic functions for great-circle metres, radius inclusion, exact block-and-street membership, and evidence-scope exclusion. The earlier implementation-plan suggestion to add Turf.js is deferred unless validated polygon or routing geometry actually requires it; adding an unused dependency would not improve these point and identity checks. This changes an implementation proposal, not the approved block-cluster decision unit or the requirement to verify walking accessibility before using it in a positive recommendation.
- 7 October 2026: corrected and closed Gate 2's source-feasibility boundary after the user asked to proceed. The earlier exit audit treated current exact-unit rent and approved Pilates use, complete local competitor coverage, a live OneMap token, and a verified future completion month as prerequisites to **source feasibility**, despite the existing evidence contract explicitly allowing prominent, adjustable rent and demand assumptions and valid `insufficient_evidence` outcomes. These remain blockers for a real positive decision and later evidence upgrades. The reviewed offline comparison of three Punggol block groups abstains for all three and passes the focused acceptance command; independent specification and separate code-quality reviews approved with no unresolved Gate 2 findings. This does not change the product promise or authorize a positive recommendation; it prevents the source gate from absorbing later decision-engine and premises-due-diligence work.
- 6 October 2026: the user asked to stop deepening the HDB/BTO audit and make rent, premises policy, competitors, access, demographics, and other business factors visible. Prioritize a bounded Gate 2 factor-readiness view using the already audited samples, clearly scoped as research leads with missing decision links. Housing timing remains `insufficient_evidence`; no factor becomes a score, lease approval, or real recommendation merely by appearing in the prototype. This changes the immediate work order and preview presentation, not the approved screening promise or Gate 2 exit criteria.

- 6 October 2026: the user explicitly prioritized seeing and testing a visual prototype before Gate 2 is complete. Permit a bounded, local-first **Gate 2 visualization spike** using the three hash-checked HDB block-cluster snapshots and a clearly labelled synthetic studio profile. This changes work order, not the evidence contract or the product promise: no recommendation, market ranking, walkability claim, live OneMap claim, or project-to-block join may be presented as established. Keep Gate 2 and downstream gates open until their acceptance checks pass. The spike should help expose usability and geographic-overlap problems early, as the delivery proposal already anticipated.

- 5 October 2026: the user made the location output more specific: compare a few named neighbouring HDB blocks per candidate instead of recommending whole towns such as Punggol or Clementi. The approved unit is now a block cluster with explicit member blocks, verified coordinates, and a stated boundary/anchor. Broad-area demographics remain context only; unsupported development-to-block joins and unverified premises-use claims cannot drive a micro-area recommendation. The output remains an investigation target, not approval of a lease. Gate 2 must prove three such clusters before the UI presents them.
- 5 October 2026: the user raised the hackathon bar from an illustrative demo toward a dependable product for real business decisions. The product promise is narrowed to real-operator **screening and investigation decisions**, not lease approval or a demand forecast. The synthetic profile remains a clearly labelled test/demo fixture; actual recommendations require owner-confirmed inputs, dated evidence, sensitivity checks, and abstention when material facts are missing. The user then chose public/synthetic data and no operator tester before submission, so real-world accuracy cannot be claimed as validated. This changes the acceptance bar and work priority, not the two-week deadline, $50 budget, or approved three-area Singapore scope. In particular, no current source audit justifies a live site approval.
- 5 October 2026: the user explicitly prioritized integrating Jev now, ahead of the remaining Gate 2 evidence work. An optional bounded direct TypeSafe adapter was added, but subsequent credential verification showed the available key belongs to OpenRouter. Direct System One access remains unavailable; OpenRouter's `typesafe/jev-router` is a different general model-routing interface. This scheduling exception does not change the evidence gate or business decision rules. Keep deterministic checks and abstention, do not infer production reliability or mark Gate 2 complete, and resume the source audit after this slice.
- 5 October 2026: corrected the earlier provider assumption after reading current OpenRouter Jev documentation and making one successful structured Jev 1.13 call using the user's OpenRouter key. OpenRouter exposes actual Jev via its System One/Decisions API as well as the separate `jev-router` chat-routing product. A separate TypeSafe purchase is not required for this experiment. Added the OpenRouter System One route to the bounded adapter; positive support remains review-only pending the labelled benchmark.
- 5 October 2026: recorded the user's Track 4 choice and the official Devpost deadline and submission rules. This closes Gate 1's submission-rules item and makes a public repository, working deployment, and illustrated write-up explicit delivery requirements. No application or evidence decision changed. The deadline was verified from the event page's displayed Singapore time and matching UTC timestamp; the rules page was checked for individual-build and deployment requirements.
