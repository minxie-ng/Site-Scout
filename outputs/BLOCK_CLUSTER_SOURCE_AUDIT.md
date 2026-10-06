# Gate 2 candidate block cluster: Punggol Point Cove address points

Evidence snapshot: 5–6 October 2026. Geographic scope: Blocks 442A, 442B, and 443A, New Punggol Road, Singapore. Status: **candidate HDB residential block cluster; not a decision-ready area**. The three [OneMap Search](https://www.onemap.gov.sg/apidocs/search) responses are stored under `src/data/snapshots/2026-10-05/original/` and `src/data/snapshots/2026-10-06/original/`, with fixed source URLs, retrieval times, SHA-256 digests, and licence/access notes in `src/data/snapshots/2026-10-06/block-cluster.json`.

| Block | Postal code | OneMap WGS84 latitude, longitude | Source observation |
| --- | --- | --- | --- |
| 442A | 821442 | 1.419635402182583, 103.9128224429809 | Response retrieved 5 Oct; includes an authentication-token warning. |
| 442B | 822442 | 1.419030120414359, 103.9128831725031 | Response retrieved 6 Oct without inline warning. |
| 443A | 821443 | 1.418699970052094, 103.9123514239558 | Response retrieved 6 Oct without inline warning. |

Each response names `PUNGGOL POINT COVE` and `NEW PUNGGOL ROAD`. The **selection** of these three blocks is a derived, non-exhaustive grouping citing all three OneMap responses: their address points are within 125 metres of each other pairwise (approximately 67.6, 116.5, and 69.6 metres using a deterministic Haversine calculation). The points are not entrance locations, a site boundary, or a walking route. The grouping does not assert that all nearby blocks are included. These address responses alone do not independently establish HDB residential status for each block.

**No checked source identifies any of these blocks as Punggol Point Cove Phase 2.** The HDB completion record remains `insufficient_evidence` for a mapped Phase 2 claim; it is not joined to this cluster. The am Pilates Punggol outlet likewise has no verified coordinate or defined catchment here and is not joined. The cluster does not establish local demand, available premises, or an `investigate` result.

## HDB residential identity check

On 6 October 2026, the official [HDB Property Information dataset](https://data.gov.sg/datasets/d_17f5382f26140b1fdae0ba2ef6239d2f/view) on data.gov.sg was queried separately for block numbers 442A, 442B, and 443A. Each response returned same-number blocks on other streets, so the validator requires **both** the block number and the exact HDB street value `NEW PUNGGOL RD`. The matching rows show:

| Block + street | Residential | Published total dwelling units | Published year completed |
| --- | --- | ---: | ---: |
| 442A NEW PUNGGOL RD | Y | 194 | 2025 |
| 442B NEW PUNGGOL RD | Y | 129 | 2024 |
| 443A NEW PUNGGOL RD | Y | 188 | 2024 |

The three complete original API responses are preserved in `src/data/snapshots/2026-10-06/original/` and hash-checked against `hdbSources` metadata in the normalized cluster record. This establishes **HDB residential block identity** for these three block-and-street pairs as a dated dataset observation; it does not establish occupancy, live unit counts, a site boundary, commercial premises, or a Phase 1/Phase 2 assignment. The different completion years must not be used to guess which phase contains a block.

The dataset catalogue says its coverage runs through December 2025 and was last updated on 6 July 2026, but it does not supply a row-specific publication/effective date. The API was retrieved without authentication. The dataset page lists the [Singapore Open Data Licence](https://data.gov.sg/open-data-licence), which permits reuse with conspicuous source acknowledgement and a current licence link. If the API fails, use the checked dated responses; revalidate before claiming current stock.

[OneMap's API documentation](https://www.onemap.gov.sg/apidocs/) says Search now requires token-based authentication. In the same short audit, two other candidate queries returned HTTP 429; the successful anonymous responses are dated replays, not proof of stable live access. Before live integration, use a user-controlled OneMap account/token and verify quota and per-API terms. The [API terms](https://www.onemap.gov.sg/legal/apitermsofservice.html) and linked [Singapore Open Data Licence](https://www.onemap.gov.sg/legal/opendatalicence.html) allow bounded data use subject to access conditions, conspicuous source attribution, and a current licence link. If refresh fails, load and label the hash-checked stored responses; do not imply current coordinates or live service.

`parseBlockCluster` verifies all six original response hashes, source identities, OneMap coordinates, HDB block-and-street residential rows, Singapore bounds, unique IDs, and pairwise separation. It accepts only this reviewed sample. It cannot validate housing phase membership, station walking access, competitor overlap, or retail availability; those remain separate Gate 2 evidence questions.
