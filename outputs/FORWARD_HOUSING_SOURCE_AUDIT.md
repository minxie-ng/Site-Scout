# Forward housing audit — Matilda Riverside (6 October 2026)

**Outcome: insufficient evidence for a dated future-demand point.** This audit is a source feasibility check, not a normalized decision record or a claim that flats are occupied.

| Claim | Official evidence | Status |
| --- | --- | --- |
| Project and supply | HDB's February 2024 [Matilda Riverside sales brochure](https://assets.hdb.gov.sg/residential/buying-a-flat/finding-a-flat/sales-brochure/24FEBBTO_pdf_selection/matilda_riverside.pdf), pp. 1–2, says seven residential blocks and 962 sale flats, plus 64 rental flats in two blocks. The [February 2024 BTO Annex A](https://www.hdb.gov.sg/-/media/hdb-pulse/news/2024/hdb-launches-5714-flats-in-feb-2024-bto-and-sbf-exercises/21022024---Annex-A.pdf), p. 1, independently lists 37 months estimated waiting time and flat-type counts summing to 962; p. 2 defines the interval. | Observed in retained HDB PDFs. The February 2024 launch is historical; current construction or completion status was not verified. |
| Representative coordinate | [OneMap Search](https://www.onemap.gov.sg/api/common/elastic/search?searchVal=Matilda%20Riverside&returnGeom=Y&getAddrDetails=Y&pageNum=1) labels Block 236A, Sumang Lane, as `MATILDA RIVERSIDE` at WGS84 latitude 1.402450857510928, longitude 103.8894323637948. HDB brochure's unit-distribution page names Block 236A. | The block-to-project join is observed in the two originals. Selecting its point to represent the project would be a **derived value** citing both sources; it is not the site boundary, project centroid, or an occupancy point. |
| Calendar completion/occupancy timing | Annex A defines 37 months as an estimated interval from the *median flat-selection month* to the *median projected block-completion month*. Neither checked PDF states that selection month or a calendar completion month. | **Unsupported.** Do not add 37 months to the February 2024 sales-launch date. No source confirms an actual or scheduled occupancy date. |

Originals retained in `src/data/snapshots/2026-10-06/original/` (SHA-256):

- `matilda-riverside-hdb-brochure.pdf`: `05eb3a430eb29c7f1105ad096d1ca32e4742133b052e345f3e0ebba028d8e4eb`
- `feb-2024-bto-hdb-annex-a.pdf`: `17345fcda557d454c27a3e6f5bfb1b70aa3f8beac610ebf3b422003f6e30de74`
- `matilda-riverside-onemap-search.json`: `b522bf924cae71508dc07525786c2d6f579d17247730a1d74823efe43e68b7c2`

Scope is the Matilda Riverside project on Sumang Lane, Punggol, Singapore. All three were retrieved 6 October 2026. The brochure warns that plans and facilities can change. OneMap's response includes `Authentication token missing`; this is a dated replay, not proof of stable anonymous access. HDB PDF public retrieval is not evidence of a reuse licence. OneMap's published open-data licence requires attribution and its API terms may require a token. The selected point is distant from the existing New Punggol Road candidate cluster; proximity, catchment membership, and Pilates demand have not been established.

**Next evidence request:** obtain an official HDB project-specific calendar projected completion month or block completion schedule, preserve the original, then verify current status and derive any representative point with both HDB and OneMap citations. Until then, keep the future timing scenario explicitly synthetic and the development join out of the recommendation inputs.
