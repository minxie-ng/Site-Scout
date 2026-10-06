# Third candidate HDB block cluster: Punggol Ripples

Audited 6 October 2026. The normalized record is `src/data/snapshots/2026-10-06/punggol-ripples-cluster.json`; its six original official API responses are under `src/data/snapshots/2026-10-06/original/`. SHA-256 digests in the record and validator bind each response. This is a dated, non-exhaustive selection of three named residential block address points, not a premises or market recommendation.

| Block | OneMap residential-building result | HDB Property Information exact block and street row |
| --- | --- | --- |
| 211A Punggol Walk | Punggol Ripples, 821211, 1.401759847011012, 103.899944347349 | residential Y, 112 published dwelling units, completed 2013 |
| 211B Punggol Walk | Punggol Ripples, 822211, 1.40116989540272, 103.8999208781727 | residential Y, 129 published dwelling units, completed 2013 |
| 211C Punggol Walk | Punggol Ripples, 823211, 1.400760492755734, 103.8996135596005 | residential Y, 119 published dwelling units, completed 2013 |

The OneMap Search URL and HDB Property Information query URL for every block, retrieval timestamp, geographic scope, access caveat, and source licence note are in the normalized record. The HDB dataset is [HDB Property Information](https://data.gov.sg/datasets/d_17f5382f26140b1fdae0ba2ef6239d2f/view) under the [Singapore Open Data Licence](https://data.gov.sg/open-data-licence). Its 6 July 2026 catalogue update is not a row-level observation date. OneMap returned an authentication-token warning in all three responses; [Search API documentation](https://www.onemap.gov.sg/apidocs/) requires a token. These snapshots do not establish stable anonymous live access. OneMap's linked licence requires conspicuous attribution and a current licence link.

The 211A response also includes a Busy Bees childcare point with postal `NIL`; the normalized member selects the single Punggol Ripples residential-building address result by exact block, road, building, and postal code. HDB queries can include same-number blocks on other streets; the validator binds the exact `PUNGGOL WALK` row.

Deterministic WGS84 great-circle distances between 211A–211B, 211A–211C, and 211B–211C are approximately 65.7 m, 117.0 m, and 56.9 m. The 211A anchor is approximately 2.45 km from the first cluster's 442A anchor and 413 m from the second cluster's 267A anchor. These are straight-line address-point distances, not walking distances or independent demand catchments. The second and third groups may overlap as a customer market; no independence assumption is justified.

The three HDB published unit counts total 360 as a derived sum, not occupied households or target customers. No official source here establishes a development phase, future completion, competitor coverage, actual Pilates premises, allowable fitness use, rent, pedestrian routes, occupancy, or demand. `linkedDevelopmentIds` and `linkedCompetitorIds` remain empty. If live APIs fail or require credentials, the application may use these integrity-checked replay snapshots with their date and limitations.
