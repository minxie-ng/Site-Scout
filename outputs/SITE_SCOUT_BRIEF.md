# Site Scout — product brief and gate checklist

Updated: 12 October 2026. Status: Gate 2, bounded Gate 3, and bounded Gate 4 exits closed; Gate 5 is open.

This file is the current source of truth. Approved choices are distinguished from proposals. Singapore source coverage, competitor capabilities, and grant terms remain unverified. Direct public-page retrieval succeeded for the user-supplied Jev article and official documentation on 5 October 2026, after the default research tools failed. This verifies published documentation, not runtime performance or account access. Do not describe competitive novelty or commercial readiness as established.

## Approved decisions

- Singapore SME expansion and timing advisor for a real operator; use the synthetic Pilates studio only as a labelled demonstration fixture until an operator supplies and confirms their own inputs.
- Search for candidate areas across Singapore, then compare three named clusters of nearby HDB blocks. Each candidate must list its included blocks and a defensible map anchor; broad town names are context, not the recommendation unit. The current three Punggol clusters are a demonstration fixture, not the geographic limit of the product.
- Main demonstration: one block cluster becomes worth investigating in a later launch window. Separate safety demonstration: reject all options when none is suitable.
- Intake captures business model, customers, prices, budget, current locations, and time horizon; ask targeted follow-up questions when needed.
- Explain assumptions, show dated sources, and allow go / wait / no-go outcomes.
- Prepare a recommendation memo and investigation plan; obtain approval before external actions.
- Develop through gates with acceptance checks. Future industry adaptation and ASEAN expansion remain longer-term ambitions.
- Delivery constraints: one builder, two weeks remaining, $50 total budget as stated by the user. Billing currency and any existing API credits are not yet established; do not purchase services automatically.
- Hackathon entry: Track 4, “Solving a Business Problem,” selected by the user. Official Devpost deadline: 19 October 2026 at 11:45 pm Singapore time (15:45 UTC). Submission requires a public GitHub repository, a fully deployed and functional project, and a Devpost write-up with pictures. The published rules require individual builds; no specific technology is mandated in the rules inspected on 5 October 2026. Sources: https://ai-lodge-hackathon-2026.devpost.com/ and https://ai-lodge-hackathon-2026.devpost.com/rules .
- Approved demo profile: group reformer Pilates with the synthetic operating assumptions and decision thresholds documented in `outputs/DEMO_BUSINESS_PROFILE.md`.
- The hackathon target is dependable **screening for real business investigations**: identify when to investigate, wait, rule out, or abstain for one owner-supplied business profile. Do not claim lease approval, guaranteed demand, or live current evidence when those have not been established.
- A **pre-intake, business-agnostic investigate-first** lead may be named from a transparent, dated comparison of the three sampled block groups even when no exact commercial unit is available. This only orders research; it is not a personalized area result, an `investigate` site-viability decision, or a claim that the area is the best place to open. Show the observed proxy, missing comparative factors, and conditions that could reverse the priority. Keep all real site decisions at `insufficient_evidence` until their own evidence gates pass.
- For explicitly synthetic area scenarios only, use user-specified maximum assumed walking minutes and nearby-competitor counts as screening constraints, then choose the unique highest published housing-stock total among qualifying sampled clusters. A tie or no qualifying cluster selects nobody. The thresholds and factor values are assumptions, the housing count is only a proxy, and this rule has no probability or real-site meaning until local evidence and owner inputs are validated.
- No Pilates operator or manager will supply private operating figures or test the product before submission; the user chose public/synthetic data for the hackathon. The real-input pathway may be implemented and tested with synthetic fixtures, but real-world recommendation accuracy and operator usefulness remain unvalidated claims.

## Product promise

Help a Pilates studio owner decide where and when to investigate a second location, what conditions would make it viable, and what evidence must be collected before committing capital.

For a real owner, require them to enter or confirm decision-critical operating inputs before any **personalized area result**. A pre-intake research lead may identify which sampled area to investigate first, but cannot say where that owner's business should expand. Present the source date and assumptions beside each recommendation, rerun adverse rent/utilisation/timing cases, and return `insufficient_evidence` when a missing or conflicting input could change the conclusion. A synthetic fixture may demonstrate the workflow but cannot be presented as a recommendation for an actual business.

A block-cluster recommendation is not approval of a particular lease. Exact premises require separate checks for availability, rent, permitted use, size, access, fit-out, and other relevant constraints. Opening windows are conditional scenarios, not guaranteed dates. A planning-area statistic cannot be presented as a fact about the selected blocks.

## Proposed distinguishing workflow

1. Complete a short intake, then ask only decision-relevant follow-up questions. Display the resulting business assumptions for correction.
2. Discover candidate areas islandwide, disclose where source coverage is missing, then compare three explicitly bounded HDB block clusters using dated evidence, spatial calculations, studio economics, and explicit constraints.
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

At the user's 7 October request, add Firecrawl as an **optional known-URL page retrieval provider** before the remaining Gate 3 sensitivity slice. Limit it to reviewed public-source hosts, one markdown scrape per bounded run, and a server-side key; no key or failed provider response is required for the app to function. A Firecrawl extraction is a `research_only` lead, not the original publisher document, proof of current truth, reuse permission, geographic applicability, or a decision-ready record. Keep the versioned snapshot and source-specific validation contract before any claim affects a location decision. Search, crawl, browser interaction, and automated source promotion remain later work.

RAG retrieves relevant source passages using geographic, temporal, and business filters. Keep structured coordinates, counts, dates, project status, and financial inputs in typed records, rather than relying on vector similarity for exact facts or arithmetic.

Each decision-driving record should retain source URL, publication date when available, retrieval date, geographic scope, entity identity, validity/status, extraction evidence, and whether it is observed, derived, or assumed. Conflicting records remain visible until resolved. A source page is data, not an instruction to the agent.

### Fast and deliberative paths

A proposed System 1 / System 2-inspired architecture has a fast path for recalculating scenarios from a validated snapshot, and a deliberative path for new evidence, conflicts, unfamiliar business assumptions, and unstable recommendations. This is an application design, not a claim that a learned world model has been implemented.

The user confirmed TypeSafe AI's Jev, linking https://typesafe.ai/blog/introducing-system-one-models-and-jev . The article describes a structured decision model; this is unrelated to the previously considered JEPA interpretation. Official API documentation provides Choice, Score, and Noul question types. **Jev is required to optimize the live multi-agent investigation workflow**, by choosing or prioritizing bounded research work from a fixed allowlist so a useful conclusion or honest abstention can be reached sooner. The current post-research claim checker is an experiment, not the intended product role; its measured extra latency must not be presented as optimization. Deterministic code still verifies source provenance, quotes, numbers, dates, permissions, and final economics. Jev cannot waive those checks, invent evidence, or authorize external actions. Never equate a routing confidence with the probability that a studio will succeed.

The live multi-agent path must disclose whether the actual Jev Decisions API ran and which bounded task it selected. If Jev is unavailable, mark that investigation degraded and do not present it as Jev-optimized or promote an unsupported positive claim. Deterministic snapshot/scenario viewing may remain available. A safe fallback may abstain, but it does not satisfy the required Jev-optimized live workflow. Pin the model version when testing thresholds. Compare complete workflows on the same cases and tool budget, including Jev latency and avoided work, before claiming a speed benefit.

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

The existing 30 labelled claim/passage pairs, with 10 held out, test the older narrow claim-check experiment; they do not validate research-task routing. Evaluate the new routing role against a fixed, bounded no-Jev workflow on completed decision quality, abstention, total wait, calls, failures, and cost. A small pilot cannot establish broad calibration or production reliability. If routing does not improve wait or usefulness, report that result and revise task placement rather than describing the checker experiment as the requested optimization.

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

- [x] Specify source-bound point/proximity comparison, explicit unknown walking/market catchments, hard constraints, and all-real-site abstention. No independent customer catchment or positive real-site score is established.
- [x] Separate existing housing stock from explicitly synthetic future milestones; reject duplicate project identities/events and impossible chronology. No real future event or cluster join is admitted.
- [x] Implement and hand-check operating economics and capacity constraints for the approved synthetic class-only profile; real-operator economics remain unvalidated. See `outputs/GATE3_ACCEPTANCE_AUDIT.md`.
- [x] Demonstrate coherent changes under rent, utilisation, occupancy, and delay scenarios for the explicitly synthetic fixture. Occupancy is modelled as an assumed lag after completion, not observed residents or local demand; real clusters continue to abstain.
- [x] Define bounded synthetic research-order sensitivity over explicit endpoint assumptions, including changed and absent leads, without probability scores or a real-site ranking.

**Reviewed Gate 3 exit interpretation for the bounded hackathon demo:** this gate judges whether the deterministic engine handles available evidence, synthetic assumptions, duplicate events, overlap, hard constraints, and abstention correctly. Both independent reviews approved this engine-policy interpretation on 8 October 2026; the acceptance audit and 144 passing tests support it. It does not require or imply a real positive site result when no source-validated walking catchment, competitor reach, or future completion month exists. The engine prevents those missing facts from becoming real decisions; a separately labelled pre-intake area research lead may still be shown. A real positive site decision remains blocked by the evidence upgrades listed in the implementation plan and by owner-confirmed inputs. Gate 3 closure does not certify source coverage, real-world accuracy, or commercial readiness.

### Gate 4 — Agent investigation

- [x] Every decision-driving factual claim resolves to dated evidence or a declared assumption.
- [x] Conflicts, stale evidence, failed tools, and missing fields reach the final decision.
- [x] Unsupported facts cannot enter the calculation as defaults without disclosure.
- [x] Retrieved instructions cannot trigger privileged tools or change the investigation rules.
- [x] Compare the multi-agent workflow with a single-agent baseline on the same cases and tool budget.

**Reviewed bounded Gate 4 exit:** the first four criteria apply to the checked replay, strict research-output contract, and deterministic decision bridge; they do not certify arbitrary-source research or automatic freshness detection. The predeclared four-case live comparison completed all 16 model attempts with known provider-reported costs and retained all real-site abstentions. The three-role path was slower, cost more, had one invalid output, and found no additional checked source compared with the baseline. This meets the comparison requirement without establishing a multi-agent advantage. The four cases were selected after earlier partial runs, and failed/stale tool conditions were replayed. See `outputs/GATE4_ACCEPTANCE_AUDIT.md`.

### Gate 5 — Product and reliability

- [ ] A real operator can enter and confirm their own business inputs; missing decision-critical values block a recommendation.
- [ ] Islandwide discovery enumerates the eligible Singapore geography, records which areas have checked candidate evidence and which remain unassessed, and selects three specific few-block clusters only through a documented deterministic screening rule. Do not present source coverage as complete when it is not or silently exclude an unassessed region.
- [x] Exercise bounded, authenticated OneMap MCP calls for address or transport context with mocked failure/rate-limit tests and dated, source-scoped capture before any result drives a decision. The MCP credential and limits are separate from REST Search.
- [x] Rank up to three eligible few-block areas as investigation priorities by a documented deterministic rule, with provenance, coverage gaps and abstention tests; do not call the order a lease recommendation without suitable premises and owner inputs.
- [x] Render the ranked or abstaining areas on an interactive map using only checked coordinates, with tests for exact block-to-point joins, missing points, source attribution and evidence/status labels. The checked scope is the three sampled investigation priorities and nine reviewed block points, not complete Singapore coverage or lease suitability.
- [ ] The live area/market/challenger workflow invokes actual Jev Decisions to select or prioritize bounded research tasks from an allowlist, reports the selected task, availability, time and cost, and falls back to a clearly degraded abstaining state if Jev fails. Evidence and final scenario checks remain deterministic. Compare complete Jev-routed and fixed-workflow runs on the same cases and tool budget before claiming it speeds up a result.
- [ ] Every displayed outcome survives deterministic scenario and provenance checks; material evidence gaps or contradictory premises facts trigger abstention and a named next investigation.
- [ ] Complete intake → comparison → scenario → investigation plan → memo flow.
- [ ] Reproduce the same result from the same versioned evidence and assumptions.
- [ ] Isolate each business's uploaded data and restrict external actions.
- [ ] Measure response time, tool/LLM cost, failed requests, and evidence coverage.
- [ ] Pass fixtures for delay, stale facts, duplicate projects, impossible economics, no-go, and insufficient evidence.

**Bounded ranking acceptance:** the checked item is a deterministic research-order output over the 20 sampled, integrity-checked three-block groups. The checked map shows three of those sampled groups. Neither establishes nationwide source completeness, personalized site fit or a positive lease decision. The complete user journey remains open.

### Gate 6 — Judging proof

- [ ] Show meaningful AI investigation and a measurable contribution beyond the baseline.
- [ ] Show a real failure scenario and its working safeguard.
- [ ] Demonstrate an owner action tied to a specific business decision.
- [ ] Obtain feedback from a Pilates operator if feasible; identify unvalidated assumptions explicitly.
- [ ] Rehearse a short live demonstration with an honest replay fallback.

## Immediate next work

Use `outputs/ACTIVE_ROADMAP.md` for the short current sequence and keep `outputs/IMPLEMENTATION_PLAN.md` as the historical handoff. The bounded progress contract and reconstructed replay UI passed sequential independent reviews. Gate 5 starts with owner input and confirmation; the existing local memo remains a synthetic, abstaining demonstration. Do not animate fake live agent work or give an invented countdown; an estimated remaining-time range requires measured completed runs. All three real-cluster decisions remain `insufficient_evidence`.

Supporting sources of truth:
- `outputs/ACTIVE_ROADMAP.md` is the short current sequence and current-slice acceptance contract.
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

The bounded demo currently contains one business profile, one region, three areas, three research roles, a small number of source families, a scenario engine, one guarded Jev experiment, and a local visual replay. The target product additionally requires islandwide candidate discovery and Jev in the live multi-agent workflow. All-industry support, ASEAN, autonomous outreach, subscriptions, learned demand prediction, and continuous whole-city monitoring are deferred.

## Change log

- 12 October 2026: stop expanding the provider/evidence backlog for the hackathon submission. The repository is 24 MB of source mainly because it retains an official 20 MB PDF; installed dependencies are ignored. The actual delivery problem is an unconnected local journey and no deployed URL. Use `outputs/ACTIVE_ROADMAP.md` as the short four-step submission queue: connect owner → sampled area → scenario → abstaining memo, publish the reviewed build, deploy/verify, then prepare judging proof. Preserve the mandatory Singapore-wide and live Jev Gate 5 criteria as **open**; a sampled, abstaining demo must not be presented as complete coverage or a Jev-accelerated product. This is a work-order reduction, not permission to weaken evidence or safety rules.
- 12 October 2026: the first bounded live Jev research-task routing canary made one paid Decisions request but returned a degraded result with no accepted task; the scripted fixed path was faster. Do not skip area, market or challenger solely because the current real-site outcome is already `insufficient_evidence`: their missing-field diagnostics remain material to the user. Keep the Jev Gate 5 criterion open and prohibit acceleration claims. Under the hackathon deadline, complete the visible owner-to-area-to-memo journey before another paid routing attempt; diagnose response validation and obtain a fresh bounded comparison before retrying. This changes work order, not the mandatory Jev product role or deterministic decision safeguards.
- 12 October 2026: for the bounded 20-group, 27-code replay, order **pre-intake investigation priorities** by the sum of published HDB dwelling units in each integrity-checked three-block group. This is a housing-stock proxy for deciding where to research next, not Pilates demand or a site recommendation. Show at most one group per contract-town code so overlapping or redundant groups from one sampled code do not fill the three displayed slots. If a town's highest groups tie, withhold that town pending another discriminator; if an equal-score tier crosses the three-slot cutoff, withhold the whole tier instead of choosing arbitrarily. Report these withheld ties and all 27 town coverage states. Do not treat the resulting order as a national winner or hide unassessed codes. This refines the earlier Punggol-only dwelling-stock research-priority rule for the sampled islandwide groups.
- 12 October 2026: the user explicitly required OneMap MCP calls, ranking and map UI to be included and tested. Add separate Gate 5 acceptance criteria for all three. MCP is an additional bounded agent-tool interface, not a substitute for the checked REST coordinate snapshots; a ranking is an investigation priority until premises/owner evidence supports a stronger decision. The map must display checked points and coverage limits. Continue the earlier coordinate-sampling task first so these features cannot imply nonexistent islandwide evidence.
- 11 October 2026: the user corrected Jev's intended role: it should **shorten the decision-making workflow**, not serve as an added post-research safety checker. The paired fixed-role replay found the checker added about 1.118 seconds, so the earlier claim-triage architecture cannot satisfy the intended Jev benefit. Revise Gate 5 to evaluate Jev Decisions as a bounded research-task router/prioritizer; keep deterministic provenance, source validation, economics and permissions as independent safeguards. The existing claim-check code and tests remain a labelled experiment, not a completed Jev workflow. Require same-case, same-budget end-to-end evidence before any speed claim. This supersedes the claim-triage role in the earlier 11 October Jev entry without changing the requirement to use actual Jev Decisions or the rule that a failed Jev run degrades/abstains.
- 11 October 2026: the user made **actual Jev Decisions integration mandatory** for the live multi-agent workflow, with the intended benefit of reducing wait time. The existing guarded Jev claim-check experiment is not yet wired into the live research orchestrator; the chat research roles use a different model, and the prior live comparison showed the roles slower than baseline. Add a Gate 5 acceptance criterion for Jev invocation, degraded-state disclosure, and measured end-to-end latency/cost against the same workflow without Jev. Do not promise acceleration until observed; keep deterministic evidence and financial rules authoritative, and never silently label a fallback run Jev-assisted. This supersedes earlier optional-Jev language for the target live path while preserving safe snapshot use when Jev is unavailable.
- 11 October 2026: the user reaffirmed that Site Scout must search **across Singapore**, not stop at the three Punggol demo clusters. Restore islandwide discovery as a required Gate 5 product capability while retaining few-block clusters as the final comparison unit. A coverage manifest must distinguish checked, unassessed, and unavailable areas; do not infer islandwide evidence completeness from Singapore's size or use unsupported regions in a positive decision. The current Punggol fixture and closed bounded Gates 2–4 remain valid demonstrations, but cannot be presented as nationwide coverage. After owner-input confirmation, build and review deterministic islandwide candidate discovery before calling the product flow complete.
- 11 October 2026: the complete predeclared four-case live comparison and sequential independent specification then different-agent quality reviews approved the bounded Gate 4 exit. All 16 attempts had known provider-reported charges; one challenger output failed schema validation and did not reach the bridge. Baseline was faster and cheaper with the same one-source coverage, so this is a measured comparison, not a multi-agent win. Criteria 1–4 retain their earlier narrow approvals. Gate 5 becomes the earliest open gate; real-site abstention, positive-acceptance disablement, and all evidence limits remain.
- 11 October 2026: repeated fixed seven-case live comparisons ended `unevaluated` through model schema failures and timeouts, while the user asked to finish Gate 4 before the 19 October deadline. Interpret Gate 4's comparison criterion as a **predeclared, complete four-case reliability comparison** over checked context, failed tool, stale tool, and missing fields, using identical checked evidence/model and the same maximum three-call tool budget per arm. A complete 16-attempt run with known charges may count invalid model outputs as measured failures, rather than hiding them; timeout, cancellation, unknown charge, or unattempted calls still invalidate the comparison. Record per-arm validity, latency, cost and checked-source coverage, actual 1-versus-3 calls, and all real-site abstentions. The four cases were chosen after earlier partial results, so disclose selection bias and do not claim superiority, general reliability, conflict/injection coverage from this subset, or any positive location decision. This changes only the bounded comparison acceptance interpretation; the source, calculation, tool, and abstention safeguards remain. Sequential independent acceptance review is still required before checking Gate 4.
- 11 October 2026: the bounded local abstaining memo passed test-first implementation, browser interaction, and sequential independent specification and code-quality reviews. It carries editable synthetic economics into three unranked, dated-source block groups and names the next premises investigation. This completes only the approved presentation slice; Gate 4 and Gate 5 remain open, and no real-site promotion or live-agent claim is authorized. The next task returns to the market-role schema diagnostic and one capped canary.

- 10 October 2026: the progress event contract and reconstructed replay panel passed final sequential specification and code-quality reviews after test-first repairs for skipped source checks, one-call diagnostic completion, and baseline timeout/cancellation. The next bounded presentation task is the abstaining comparison memo. This changes task order only; Gate 4 remains open and no live owner-intake or agent-speed claim is approved.
- 10 October 2026: the user reaffirmed that Site Scout must retain bounded area, market and challenger agents under an orchestrator and requested a visible progress bar with research stage and rough remaining time. Authorize a truthful run-state UI as the next bounded slice. It must show real emitted states, elapsed time, and failures; replay demonstrations are explicitly labelled. Show an ETA range only after enough completed-run measurements to support one, never a fake percentage or countdown. Keep the single-agent path as a comparison baseline, not the product architecture. This changes implementation order, not Gate 4 safety criteria or real-site abstention.
- 10 October 2026: after reviewing the refreshed preview, the user authorized the next visible slice: editable synthetic studio assumptions and immediate scenario feedback. Extend the Gate 4 work-order exception only for this bounded local demo flow. Reuse the approved class-only economics rules, parity-test any browser projection against the deterministic engine, and keep financial feasibility separate from the `insufficient_evidence` real-site decision. Opening timing remains an explicitly synthetic scenario, not a sourced future development claim. This does not check Gate 4 or Gate 5 acceptance boxes or authorize a live agent run.
- 10 October 2026: the user prioritized a faster, visible hackathon product after Gate 4 benchmarking consumed time without an evaluated result. Authorize one bounded local prototype refinement before completing Gate 4: improve the existing Punggol comparison's visual hierarchy and honest study flow using checked replay data and labelled synthetic studio assumptions. Do not introduce fake live-agent progress, a real positive recommendation, new source joins, or Gate 5 completion claims. Pause paid provider experiments. Gate 4 remains open; this is a work-order exception, not weakened evidence or safety criteria.
- 9 October 2026: confirmed the existing OpenRouter benchmark key is distinct from the general key and has a USD $0.01 non-resetting cap with USD $0.0094645 remaining. Reuse it for the bounded chat comparison after fresh preflight instead of requiring a third key. This simplifies configuration without changing Gate 4 criteria or authorizing a live call.
- 9 October 2026: the mocked asynchronous research runner, bounded OpenRouter chat transport, and dedicated atomic spending gate passed test-first implementation and sequential independent specification/code-quality reviews. The chat benchmark key is not configured and no live comparison has run. This updates implementation status and the immediate next task only; Gate 4 criterion 5, positive acceptance, and all approved product decisions remain unchanged.

- 8 October 2026: resumed the interrupted Gate 4 comparison and audited all five criteria. Retain the seven-case comparison as an offline safety rehearsal; actual-agent criterion 5 remains unmet because safe capped chat comparison infrastructure and price verification are absent. Added bridge acceptance evidence for provenance, numeric-claim isolation and hostile inputs, preserving all real-site abstentions. Stale status is explicitly caller-supplied. This updates implementation status and next work, not approved gate criteria or positive acceptance policy; final independent review disposition is recorded in the implementation plan and Gate 4 audit.
- 8 October 2026: independently reviewed a one-record Gate 4 bridge from checked research to the deterministic real-cluster decision. It validates cluster evidence before executing scripted roles, labels corrupt HDB evidence as unvalidated, and derives decision-level next steps from code rather than untrusted role prose. This advances implementation only; all real sites still abstain and the next work is a same-budget workflow comparison followed by the Gate 4 acceptance audit.
- 8 October 2026: independently reviewed a bounded scripted Gate 4 investigation rehearsal over one checked HDB record. It retains role-attributed claim provenance and unresolved items, and compares unique claim coverage with a simpler baseline under the same call ceiling while reporting actual calls consumed. This changes the immediate implementation step to decision-engine integration; it does not change the approved product decision, establish live multi-agent benefit, or permit a positive real-site outcome.
- 8 October 2026: sequential independent specification and code-quality reviews approved the proposed bounded Gate 3 engine-policy exit with no unresolved findings. The acceptance audit and focused/full checks passed. All five engine-behavior boxes are now checked under that precise interpretation; source coverage, independent catchments, real future timing, owner fit, and real positive site decisions remain unverified and must not be implied by the gate status. Gate 4 typed AI investigation is next.
- 8 October 2026: after a bounded official-source retry yielded no verified project-specific future calendar completion date tied to a selected Punggol block group, propose separating Gate 3 **engine safety** from later real-positive evidence coverage. The user has approved a few-block research lead without exact premises and public/synthetic hackathon data; an unavailable external source should cause `insufficient_evidence`, not prevent implementation of the user flow indefinitely. This proposed exit interpretation does not permit a factual future-demand claim, independent walking catchment, or lease approval. It requires acceptance review before any Gate 3 checkbox or gate is closed.
- 8 October 2026: approved the next bounded Gate 3 area-research scenario policy after the user asked to proceed. Use explicit synthetic access and competitor thresholds as hard screening constraints, then compare the source-checked housing-stock proxy only among eligible sampled clusters. This avoids an unexplained weighted score and permits a conditional changed lead or no lead in adverse tests. It does not promote unlinked station or outlet leads into block-level facts, establish an optimal expansion area, or change the `insufficient_evidence` real-site outcomes.
- 8 October 2026: the user clarified that Site Scout should suggest a few-block expansion investigation area without waiting to find a perfect leaseable unit. Separate an area-level research priority from premises-level viability. For the first bounded Gate 3 slice, compare only the three reviewed Punggol block groups using their checked published dwelling-unit totals as a housing-stock proxy; name the unique highest-total group as a **pre-intake, business-agnostic investigate-first research lead**, disclose that this does not measure Pilates demand, and keep other rankings and all real site outcomes unresolved. A personalized area recommendation still requires owner-confirmed inputs. Do not let an exact-unit vacancy search block this area-screening result. This changes the shortlist policy, not the evidence contract or lease checks.
- 7 October 2026: reviewed Gate 3 tests now separate an explicitly synthetic occupancy lag from project completion and studio paid-visit utilisation. The timing outcome waits until the later occupancy start when both completion and occupancy are delayed. Rent, utilisation, completion delay, and occupancy lag each change the labelled synthetic outcome coherently, so the scenario criterion is checked with that limitation. No occupied-home count, actual demand, or real candidate decision is inferred; other Gate 3 criteria remain open.
- 7 October 2026: the reviewed Gate 3 acceptance audit hand-checked the approved synthetic class-only operating model and its capacity/hard constraints, so only that Gate 3 criterion is checked. Four criteria remain open: spatial catchment/comparison policy, future-supply identity and deduplication, a distinct housing-occupancy scenario, and eventual ranking sensitivity among comparable candidates. This is a status correction from the tested implementation, not evidence of real-operator viability or permission to recommend a site.
- 7 October 2026: the user explicitly requested Firecrawl for collecting web data. Authorize a small optional `/v2/scrape` connector now as a scheduling exception while Gate 3 sensitivity work remains open. The connector must be capped, credential-gated, and unable to promote extracted markdown into decision evidence without the existing source contract. This adds a retrieval option, not a new source of truth, live-data claim, paid-plan purchase, or permission to scrape sites whose terms prohibit it. Resume the earliest unfinished Gate 3 item afterward.
- 7 October 2026: the reviewed Gate 3 spatial rules now use small deterministic functions for great-circle metres, radius inclusion, exact block-and-street membership, and evidence-scope exclusion. The earlier implementation-plan suggestion to add Turf.js is deferred unless validated polygon or routing geometry actually requires it; adding an unused dependency would not improve these point and identity checks. This changes an implementation proposal, not the approved block-cluster decision unit or the requirement to verify walking accessibility before using it in a positive recommendation.
- 7 October 2026: corrected and closed Gate 2's source-feasibility boundary after the user asked to proceed. The earlier exit audit treated current exact-unit rent and approved Pilates use, complete local competitor coverage, a live OneMap token, and a verified future completion month as prerequisites to **source feasibility**, despite the existing evidence contract explicitly allowing prominent, adjustable rent and demand assumptions and valid `insufficient_evidence` outcomes. These remain blockers for a real positive decision and later evidence upgrades. The reviewed offline comparison of three Punggol block groups abstains for all three and passes the focused acceptance command; independent specification and separate code-quality reviews approved with no unresolved Gate 2 findings. This does not change the product promise or authorize a positive recommendation; it prevents the source gate from absorbing later decision-engine and premises-due-diligence work.
- 6 October 2026: the user asked to stop deepening the HDB/BTO audit and make rent, premises policy, competitors, access, demographics, and other business factors visible. Prioritize a bounded Gate 2 factor-readiness view using the already audited samples, clearly scoped as research leads with missing decision links. Housing timing remains `insufficient_evidence`; no factor becomes a score, lease approval, or real recommendation merely by appearing in the prototype. This changes the immediate work order and preview presentation, not the approved screening promise or Gate 2 exit criteria.

- 6 October 2026: the user explicitly prioritized seeing and testing a visual prototype before Gate 2 is complete. Permit a bounded, local-first **Gate 2 visualization spike** using the three hash-checked HDB block-cluster snapshots and a clearly labelled synthetic studio profile. This changes work order, not the evidence contract or the product promise: no recommendation, market ranking, walkability claim, live OneMap claim, or project-to-block join may be presented as established. Keep Gate 2 and downstream gates open until their acceptance checks pass. The spike should help expose usability and geographic-overlap problems early, as the delivery proposal already anticipated.

- 5 October 2026: the user made the location output more specific: compare a few named neighbouring HDB blocks per candidate instead of recommending whole towns such as Punggol or Clementi. The approved unit is now a block cluster with explicit member blocks, verified coordinates, and a stated boundary/anchor. Broad-area demographics remain context only; unsupported development-to-block joins and unverified premises-use claims cannot drive a micro-area recommendation. The output remains an investigation target, not approval of a lease. Gate 2 must prove three such clusters before the UI presents them.
- 5 October 2026: the user raised the hackathon bar from an illustrative demo toward a dependable product for real business decisions. The product promise is narrowed to real-operator **screening and investigation decisions**, not lease approval or a demand forecast. The synthetic profile remains a clearly labelled test/demo fixture; actual recommendations require owner-confirmed inputs, dated evidence, sensitivity checks, and abstention when material facts are missing. The user then chose public/synthetic data and no operator tester before submission, so real-world accuracy cannot be claimed as validated. This changes the acceptance bar and work priority, not the two-week deadline, $50 budget, or approved three-area Singapore scope. In particular, no current source audit justifies a live site approval.
- 5 October 2026: the user explicitly prioritized integrating Jev now, ahead of the remaining Gate 2 evidence work. An optional bounded direct TypeSafe adapter was added, but subsequent credential verification showed the available key belongs to OpenRouter. Direct System One access remains unavailable; OpenRouter's `typesafe/jev-router` is a different general model-routing interface. This scheduling exception does not change the evidence gate or business decision rules. Keep deterministic checks and abstention, do not infer production reliability or mark Gate 2 complete, and resume the source audit after this slice.
- 5 October 2026: corrected the earlier provider assumption after reading current OpenRouter Jev documentation and making one successful structured Jev 1.13 call using the user's OpenRouter key. OpenRouter exposes actual Jev via its System One/Decisions API as well as the separate `jev-router` chat-routing product. A separate TypeSafe purchase is not required for this experiment. Added the OpenRouter System One route to the bounded adapter; positive support remains review-only pending the labelled benchmark.
- 5 October 2026: recorded the user's Track 4 choice and the official Devpost deadline and submission rules. This closes Gate 1's submission-rules item and makes a public repository, working deployment, and illustrated write-up explicit delivery requirements. No application or evidence decision changed. The deadline was verified from the event page's displayed Singapore time and matching UTC timestamp; the rules page was checked for individual-build and deployment requirements.
