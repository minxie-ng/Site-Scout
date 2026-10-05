# Site Scout source register

Updated: 5 October 2026. Status values describe what was directly observed during the audit, not what a source might support after account registration or manual access.

| Need | Candidate source | Observed status | Decision use | Required treatment | MVP fallback |
| --- | --- | --- | --- | --- | --- |
| Address and coordinates | [OneMap API](https://www.onemap.gov.sg/apidocs/) | Documentation page loaded. A read-only search for Punggol MRT returned coordinates but also an authentication-token warning. | Geocode neighbourhood anchors and candidate sites. | Register and test a token before treating access as stable. Cache response with retrieval date. | Store a reviewed coordinate fixture from the source response and label it as a snapshot. |
| Travel accessibility | OneMap routing or public-transport endpoints | Not tested. | Travel-time catchments and station access. | Verify token, quota, terms, and route reproducibility. | Use straight-line distance only, label it clearly, and avoid travel-time claims. |
| Existing HDB stock | [data.gov.sg](https://data.gov.sg/) datasets | Platform loaded; exact dataset and API record have not been verified. | Current residential context. | Find exact dataset ID, fields, update date, licence, and sample record. Avoid treating dwelling count as target customers. | Use a small reviewed fixture with source metadata. |
| Planned BTO supply | [HDB flat information](https://www.hdb.gov.sg/residential/buying-a-flat/buying-procedure-for-new-flats/modes-of-sale) and official releases | Direct automated request returned HTTP 403. | Time-dependent future housing scenario. | Manually verify official project name, location, unit count, announced completion/status, publication date, and source URL. Separate announced, launched, under construction, completed, and occupied. | Seed two clearly synthetic projects to prove scenario behavior; do not present them as real. |
| Private residential pipeline | [URA property data](https://www.ura.gov.sg/Corporate/Property/Property-Data) | Direct automated request returned HTTP 403. Coverage and paid-access requirements unverified. | Future housing scenario and competing supply. | Determine whether a permitted downloadable/API source exists. Record paywall and usage constraints. | Exclude from the factual demo or model it as a user-supplied assumption. |
| Population and household profile | [SingStat](https://www.singstat.gov.sg/) | Not yet sampled. | Broad planning-area context. | Verify geographic granularity and reference year. Do not project willingness to pay from demographics alone. | Display as missing evidence; omit factor from score. |
| Pilates competitors | Business websites, permitted listings, and manual research | No scalable, licensed source verified. | Offering overlap and evidence gaps. | Record name, outlet, service type, documented price, coordinates, URL, and retrieval date. Never infer capacity, utilisation, customers, or revenue. | Curate 8–12 real outlets manually for one region; clearly state coverage limitations. |
| Commercial rent | URA statistics, listing sources, or user quotes | No usable source verified. | Break-even and site viability. | Separate signed quote, asking rent, and area statistic. Include date, unit size, service charges, and tax assumptions. | Owner-editable low/base/high assumptions; identify a rent quote as the next investigation. |
| Spending and demand | Public statistics and operator data | No local source verified at useful granularity. | Demand scenarios. | Treat public proxies as context. Require the user to supply conversion and price assumptions. | Use editable synthetic assumptions and sensitivity analysis. |
| Business permissions | GoBusiness and relevant agencies | Not yet sampled. | Later premises due diligence. | Retrieve only rules relevant to selected use and premises; cite effective date. Never claim approval. | Provide a checklist for human verification. |
| Map display | MapLibre plus a permitted tile provider | Not yet selected. | Visual comparison. | Check attribution, rate limits, and deployment terms before implementation. | Use a static GeoJSON diagram or locally stored schematic for demo continuity. |
| Structured semantic judgement | [TypeSafe Jev API](https://docs.typesafe.ai/introduction/quickstart) | Official docs verified; account/API access not tested. | Classify claim as supported, contradicted, or not established by supplied passage. | Pin model during evaluation; code handles quote matching, dates, numbers, and action thresholds. | Structured-output LLM provider; route low-confidence results to review. |
| General LLM access | [OpenRouter model catalogue](https://openrouter.ai/api/v1/models) | Public catalogue contained `typesafe/jev-router` on 5 Oct 2026. Catalogue pricing fields were `-1`; effective price was not established. | Report generation and optional research synthesis. | Select and cap a configured model. Track usage and verify price before use. | Use one existing provider directly or replay cached outputs. |
| Hosting | [Vercel pricing](https://vercel.com/pricing) | Official page listed Hobby at $0/month with included usage. It states Hobby is for personal, non-commercial use. | Personal hackathon demo hosting. | Keep within current limits and re-evaluate before business deployment. | Run locally and record a demo video. |

## Gate 2 evidence contract

A source becomes `usable` only when the repository contains:

- one original response or document snapshot;
- one normalized typed record;
- source URL, retrieval time, publication/effective date when available, and licence/access note;
- a validation that rejects a missing coordinate, ambiguous status, or unsupported decision claim;
- a documented fallback for outage, quota, or account failure.

The manually assembled comparison may proceed when coordinates, at least one dated development event, a curated competitor sample, and editable economics are available for three neighbourhoods. Rent and demand may remain assumptions if they are prominent, adjustable, and capable of producing `insufficient_evidence` or `no_go`.
