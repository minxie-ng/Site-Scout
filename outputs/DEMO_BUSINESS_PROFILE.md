# Demo business profile

Status: approved on 5 October 2026 as synthetic demo assumptions. None of the values below describe a real Pilates operator or establish Singapore market benchmarks. Every business input will be editable in the product.

## Business decision

A synthetic reformer Pilates operator with one established central Singapore studio is deciding whether to investigate a second outlet in one Singapore region during the next 18–30 months.

The product will shortlist neighbourhoods for deeper investigation. It will not recommend signing a particular lease.

## Studio model

| Input | Draft value | Why the decision engine needs it |
| --- | ---: | --- |
| Format | Group reformer Pilates | Defines relevant competitors and capacity model. |
| Reformers / sellable seats | 10 | Sets maximum seats per class. |
| Scheduled classes | 30 per week | Sets monthly sellable capacity. |
| Average realised revenue | S$35 per paid visit | Represents package discounts and mix; it is not the advertised drop-in price. |
| Variable cost | S$3 per paid visit | Covers payment and per-visit consumable assumptions. |
| Instructor cost | S$65 per scheduled class | Treated as a scheduled operating cost even when seats go unsold. |
| Other fixed costs | S$5,000 per month | Synthetic allowance for administration, software, marketing, utilities, cleaning, and insurance. |
| Monthly rent range | S$10,000 low / S$13,000 base / S$16,000 high | Allows sensitivity testing before a real quote is obtained. |
| Opening investment | S$200,000 expected; S$250,000 maximum | Hard capital constraint for deposit, fit-out, reformers, professional fees, and launch costs. |
| Operating runway | At least 9 months | Prevents recommending expansion with inadequate resilience. |
| Expansion horizon | Investigation starts 5 October 2026; possible opening in 18–30 months | Resolves the approved “now” assumption to a reproducible analysis date and enables conditional timing. |
| Existing outlet | Synthetic central Singapore outlet | Used later to check likely overlap; no factual coordinates are asserted yet. |
| Primary customer statement | Adults seeking convenient, recurring group reformer classes near home or a regular travel route | Guides research questions without claiming demographic demand. |

All monetary values are in Singapore dollars. They are scenario inputs, not market estimates.

## Derived base scenario

Using 4.33 weeks per month:

- Scheduled classes per month: 129.9.
- Available seat-visits per month: 1,299.
- Instructor cost per month: S$8,443.50.
- Total fixed monthly cost at base rent: S$26,443.50.
- Contribution per paid visit: S$32.
- Break-even paid visits: approximately 827 per month.
- Break-even utilisation: approximately 63.7%.

These calculations check internal consistency only. They do not forecast acquisition, retention, class distribution, ramp-up time, or actual revenue.

## Proposed decision rules

### Investigate

Return `investigate` when all of the following hold:

- base-scenario break-even utilisation is no more than 70%;
- high-rent break-even utilisation is no more than 85%;
- expected opening investment is within S$250,000;
- required evidence meets the minimum coverage gate;
- no hard premises or business constraint has failed.

This means the neighbourhood deserves site visits, rent quotes, and customer validation. It is not approval to open.

### Wait

Return `wait` when the economics could pass, but the recommendation depends materially on a future event that is announced or underway and not yet sufficiently realized. The result must name the condition and a review window, such as verifying completion, occupancy, access, or asking rent.

### No-go

Return `no_go` when available evidence is adequate and a hard constraint fails, including:

- break-even utilisation exceeds 85% even under the most favourable permitted rent scenario;
- the opening investment exceeds S$250,000;
- the required operating runway cannot be maintained;
- every candidate fails the same viability gate.

### Insufficient evidence

Return `insufficient_evidence` when a recommendation cannot be evaluated because any of these are absent or unusable:

- sellable seats and planned class schedule;
- realised price and variable cost;
- a bounded rent assumption or quote;
- opening budget and expansion horizon;
- coordinates for the compared neighbourhoods;
- at least one dated source for each decision-driving future development claim;
- enough competitor coverage to disclose what was and was not searched.

Missing evidence must not be converted into a neutral score.

## Information the intake asks first

The initial form asks for business format, current outlet, target customer statement, capacity, schedule, realised price, main variable and fixed costs, rent range, opening budget, runway, expansion horizon, and any non-negotiable location constraints.

The chat intake asks follow-up questions only when a required value is missing, contradictory, or unusually influential. Before analysis, the owner sees and confirms the complete decision contract.

## Approved decisions

1. Use group reformer Pilates as the demo subtype.
2. Use a 10-reformer, 30-classes-per-week operating model.
3. Use the stated synthetic financial assumptions.
4. Use 70% base and 85% stress break-even utilisation thresholds.
5. Treat an 18–30 month opening horizon as the timing decision.

Machine-readable fixture: `src/data/demo/business-profile.json`.
