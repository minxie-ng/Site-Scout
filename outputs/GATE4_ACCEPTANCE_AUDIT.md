# Gate 4 acceptance audit — updated 11 October 2026

## Final bounded acceptance — 11 October 2026

Status: **CLOSED for the reviewed-snapshot research and deterministic decision bridge described below**. Criteria 1–4 retain their earlier sequential independent approvals and limits. Criterion 5 now has a complete actual-chat comparison under the predeclared four-case contract in the brief. An independent specification reviewer approved it, followed by a different code-quality reviewer with no unresolved findings. This is a hackathon screening gate, not validated real-world recommendation accuracy.

The saved report is `outputs/RESEARCH_FOCUSED_COMPARISON_2026-10-11T03-53-17-259Z.json`. `RUN_LIVE_RESEARCH_FOCUSED_COMPARISON=1 npm test -- --run tests/live-research-comparison.opt-in.test.ts` passed its run/report assertions (1 passed, 4 other opt-in tests skipped). The checked-context, failed-tool, stale-tool and missing-fields cases each used identical checked replay evidence and the pinned `mistralai/mistral-nemo` model in both arms. The three-call maximum applied to each arm per case; the baseline actually made one call and the roles made three. All 16 attempts completed with known provider-reported charges, zero unattempted/cancelled/unknown-charge attempts, and all eight real-site decisions were `insufficient_evidence`.

| Actual-chat comparison, four cases | Single baseline | Area + market + challenger |
| --- | ---: | ---: |
| Attempted calls | 4 | 12 |
| Schema-valid outputs | 4/4 | 11/12 |
| Generation plus checked-bridge time | 26.533 s | 56.578 s |
| Provider-reported cost | $0.000094576 | $0.000269140 |
| Unique checked supporting sources | 1 | 1 |
| Real-site decisions abstaining | 4/4 | 4/4 |

Total provider-reported cost was **$0.000363716**. One `failed_tool` challenger output failed the `conflicts[].evidenceIds` schema field, retained its known $0.000016302 charge, and did not reach the bridge as evidence. No research claim entered deterministic calculations. The three-role path was slower in every pair, cost about 2.85 times as much, and added no checked source. **No speed or multi-agent superiority is established.** The four cases were chosen after earlier partial runs; failed/stale tool statuses are supplied replay conditions, not live outages or automatic freshness detection. This subset does not exercise live conflict or prompt-injection cases. One historical HDB annex is the supported evidence in both arms; schema validity alone does not make a failed/stale claim usable. Costs are provider-reported metadata, not separately reconciled to account billing. Positive automatic site acceptance remains disabled.

The earlier sections below document why criteria 1–4 were approved narrowly and why the offline rehearsal and failed paid attempts did not satisfy criterion 5 at those times. Their historical OPEN wording is superseded by this final audit.

## Historical audit — 8 October 2026 (superseded)

Status: **OPEN**. This is a bounded screening implementation over checked replay evidence, not validated lease advice. Independent specification review and a different independent code-quality review approved this session's safety slice/audit with no blocking findings; the quality reviewer independently reproduced 47/47 focused tests plus the diff check. Criterion 5 remains unmet, so no brief acceptance box is newly checked.

The seven-case comparison is an **offline safety rehearsal**. The baseline and area/market/challenger paths receive the same prewritten observations. It exercises the decision bridge and diagnostics, not actual agent investigation performance. Jev remains optional; automatic positive acceptance remains disabled; every real-site result remains `insufficient_evidence`.

| Authoritative Gate 4 criterion | Implementation and acceptance evidence | Disposition |
| --- | --- | --- |
| Every decision-driving factual claim resolves to dated evidence or a declared assumption. | The real-cluster engine derives stock and coordinates from integrity-checked HDB/OneMap snapshots. Research review only supports an exact historical HDB template and retains source URL, retrieval date, geographic scope and evidence status; unknown publication date remains null. The bridge now tests changed URL/date/scope, missing metadata and missing snapshot path, with zero callbacks and unvalidated-source abstention. Other factual claims stay unresolved diagnostics. Synthetic financial inputs retain their explicit provenance. | Supported within the existing reviewed source contract, approved by sequential independent specification and code-quality reviews. No arbitrary-source semantic correctness claimed. |
| Conflicts, stale evidence, failed tools, and missing fields reach the final decision. | Bridge and rehearsal tests retain unresolved conflicts with checked provenance, unknowns, failed callbacks, malformed output and explicit stale signals. Returned stale claims are excluded. Throwing stale callbacks now retain `stale_evidence`; rejected Promises for stale/failed callbacks are consumed safely. Fixed next steps name retry, refresh, conflict resolution or source restoration. | Supported for supplied diagnostics, approved by sequential independent specification and code-quality reviews. Stale status is caller-supplied; automatic freshness detection is not implemented. Historical completion is not represented as current occupancy. |
| Unsupported facts cannot enter the calculation as defaults without disclosure. | Research diagnostics have no input path into deterministic economics or stock counts. Direct tests submit invented occupied-home counts, SGD rent and paid demand with genuine citations, compare against `decideReviewedCluster`, verify stock/scenario outputs and input snapshots unchanged, and reject missing rent/utilisation/timing values. Rehearsal zero-admission metrics describe this structural boundary, not a model accuracy measurement. | Supported within the current bridge, approved by sequential independent specification and code-quality reviews. |
| Retrieved instructions cannot trigger privileged tools or change the investigation rules. | Strict output schemas reject extra tools/budget/rules fields. Hostile claims/conflicts/unknowns/next-step prose stays untrusted diagnostics; top-level next steps are fixed code guidance. Tests assert unchanged budget/callback count and abstention. Mocked chat requests retain fixed endpoint/system instructions, token ceiling and one-request cap with no tool definitions. Sparse assignment entries now reject before callbacks. | Supported for this bounded data path, approved by sequential independent specification and code-quality reviews. Arbitrary trusted local callbacks are not sandboxed; no tool dispatcher executes retrieved text. |
| Compare the multi-agent workflow with a single-agent baseline on the same cases and tool budget. | The seven-case rehearsal checks equal three-call ceilings and unique evidence accounting but uses prewritten output. No actual chat-agent comparison ran. Current chat adapter has no selected price-verified model, verified dedicated/shared experiment spend control, async comparison integration, or complete failure billing/cancellation accounting. Jev's guarded Decisions endpoint does not generate general research outputs. | **UNMET. Keep checkbox and Gate 4 open.** |

Acceptance command (8 October):

`npm test -- --run tests/research-workflow-comparison.test.ts tests/bounded-investigation.test.ts tests/research-decision-bridge.test.ts tests/research-review.test.ts tests/openrouter-research.test.ts tests/source-bound-claim.test.ts tests/scenario.test.ts`

Result: **47/47 passed** across seven files. Full `npm test`: **229 passed, 2 opt-in skipped**. `npx tsc --noEmit` and `git diff --check` passed. `npm audit --json`: **0 vulnerabilities, 64 dependencies**. No build script is configured.

Red/green evidence: previous interrupted session observed four comparison-stub failures before implementation and a rejected-Promise regression before its repair. This session observed a throwing-stale callback lose its stale reason (1/10 bridge failure), then fixed it without changing Promise consumption; all ten bridge tests passed. A sparse assignment regression failed before own-entry validation and then passed. New provenance/arithmetic/instruction assertions passed against existing safeguards and required no unnecessary implementation changes.

## Offline safety rehearsal measurements

Command: `REPORT_WORKFLOW_MEASUREMENTS=1 npm test -- --run tests/research-workflow-comparison.test.ts --reporter=verbose --disableConsoleIntercept` — **4/4 passed** at 16:34:57 local on 8 October 2026.

| Measured quantity, seven cases | Baseline | Three roles |
| --- | ---: | ---: |
| Scripted callbacks consumed | 7 | 21 |
| Maximum callbacks per case and arm | 3 | 3 |
| Unique supported evidence sources across all cases | 1 | 1 |
| Unsupported claims admitted to calculations | 0 | 0 |
| All research claims admitted to calculations | 0 | 0 |
| Local bridge latency, summed milliseconds | 286.818375 | 460.659542 |
| External model calls / external tool calls | 0 / 0 | 0 / 0 |
| External API cost, USD | 0 | 0 |

The checked source is `hdb-punggol-point-completion-annex-a`. The seven cases are checked historical context, failed tool, caller-flagged stale tool, missing fields, unresolved conflict, unsupported inference and retrieved instructions. Failed/stale/malformed cases have zero supported-source coverage. Multiple roles repeating one source provide no independent confirmation. Zero calculation admissions reflect the bridge's closed research-to-arithmetic boundary. Latency includes synchronous snapshot validation and file/hash reads; it is one local measurement, excludes model/network work, and is not statistical or live performance evidence. The roles provide no increased evidence coverage in this rehearsal.

## Actual comparison blocker and exact repair

The separate mocked asynchronous runner in `src/providers/async-research-comparison.ts` is implemented and approved for its bounded contract. It validates the checked replay and cluster before effects, uses fixed seven-case evidence packets and role instructions, shares an atomic attempt/spend gate, awaits and parses provider output before the synchronous bridge, and makes canceled, timed-out, failed, or unknown-billing runs unevaluated. Its 18 focused tests passed; the full suite passed 247 tests with two opt-in tests skipped; TypeScript, diff check, and dependency audit passed (zero vulnerabilities across 64 dependencies). Sequential independent specification and different code-quality reviews approved after test-first repairs. The mock made no external provider call and spent USD $0. These results do not satisfy criterion 5: the runner has a mocked provider and does not measure actual agents.

The bounded OpenRouter chat transport adapter and atomic spending gate are implemented and independently approved. Neither has made a live provider request. The gate rejects resetting or oversized key caps and retains unknown-charge reservations. A read-only 9 October check found that the existing `OPENROUTER_BENCHMARK_API_KEY` is distinct from the general key and has a USD $0.01 non-resetting cap with USD $0.0094645 remaining, so a third key is unnecessary. Before an opt-in actual seven-case comparison, recheck the selected chat-model tariff and this key's current cap and balance immediately before spending. The prior Jev tariff is not a chat tariff. The actual run must compare the same checked evidence and tool ceiling; until then criterion 5 and Gate 4 remain open.

## Completed independent review

The sequential independent specification review approved criteria 1–4 within the bounded reviewed-source contract and rejected criterion 5 closure. A different independent code-quality/hidden-failure review then approved the same slice with no blocking findings. It reproduced the 47/47 focused tests and `git diff --check`. Confirmed limitations remain explicit: caller-supplied stale status, trusted local callbacks not sandboxed, exact reviewed templates only, and zero cost/calculation admissions describing only the offline path. These approvals do not close Gate 4.

This audit does not change product or gate criteria. It identifies an unmet criterion rather than substituting the offline rehearsal for it. Source expansion, UI and deployment are outside this session.

## 10 October live-comparison addendum

Criterion 5 remains **unmet**. The opt-in actual runs saved under `outputs/RESEARCH_COMPARISON_*.json` used the same seven checked cases and call ceiling but were unevaluated: one OpenAI timeout with unknown charge, 28/28 Qwen invalid responses, then 21/28 valid Qwen responses with seven truncated. The last Qwen run reported $0.00164064 provider cost, which has not been reconciled to key billing. A Mistral Nemo 1,200-token JSON-mode repair passed test-first focused **29/29**, full **264 passed/4 skipped**, TypeScript, diff and a zero-vulnerability npm audit. Sequential independent specification and different code-quality reviews approved the bounded repair, not Gate 4 closure. Its 10 October one-call canary failed at the key-budget preflight: the saved report says `cap_unavailable`, and a separate read-only key check returned HTTP 401. No model call occurred. Restore a valid dedicated capped key, pass one canary, then complete and review the actual comparison before changing this criterion.

A later 10 October retry also made zero model calls: the refreshed key returned HTTP 200, but its non-resetting cap was **$0.10**, above the gate's approved **$0.01** maximum. Lower that dedicated cap before another canary. The gate and criterion 5 remain unchanged.

The user subsequently authorized that intentional **$0.10** cap. The chat gate now accepts it, with a separate per-run local reservation ceiling of **$0.00476** across 28 calls. The preceding instruction to lower the key is superseded for this chat comparison; the separate Jev benchmark retains its $0.01 guard. Criterion 5 remains unchanged pending live comparison and review.

The 10 October Mistral canary returned one valid response, but the subsequent fixed seven-case, 28-call comparison was **unevaluated**: 18 outputs validated and 10 failed validation, including all seven market-role outputs. All real-site outcomes abstained. Known response costs sum to $0.000566217 and generation-plus-bridge time was 126,397.58 ms; neither establishes a fair multi-agent benefit. Sequential independent specification and quality audits approved this interpretation, not criterion 5. A test-first, independently reviewed one-call market diagnostic reproduced `schema_validation` without saving raw output and reported $0.000020623. Next, record a safe field-path category, repair the specific contract mismatch, and pass one market canary before another full run. Gate 4 stays **OPEN**.
