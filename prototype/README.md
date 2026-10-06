# Site Scout local evidence preview

From the repository root, run `python3 -m http.server 4173 --bind 127.0.0.1`, then open `http://127.0.0.1:4173/prototype/`. The page uses only local files and makes no live API requests; outbound source links open if selected. Run `npm test -- --run tests/prototype-data.test.ts tests/prototype-factor-readiness.test.ts tests/prototype-failure.test.ts` after changing a cluster snapshot, factor research lead, or `prototype/data.json`.

This is a Gate 2 visualization spike. The plotted positions come from the three reviewed, dated HDB/OneMap cluster records. The plot has no basemap, walking routes, catchment boundaries, or verified market ranking. The reformer Pilates business mentioned in the page is a synthetic demo case; no owner figures are shown or used for a recommendation. The decision remains `insufficient_evidence`.

The corresponding offline, source-bound point collection is `src/data/snapshots/2026-10-06/places.geojson`. Run `npm test -- --run tests/map-snapshot.test.ts` to check it against the integrity-checked cluster originals and reject unsupported joins.

The six factor cards summarize earlier Gate 2 research on rent, premises use, competitors, access, demographics, and future housing. They cite their own source and retrieval date, identify their geographic scope, and remain `research_only` with no cluster linkage. They are not normalized usable evidence records or current unit approvals; see `outputs/SOURCE_REGISTER.md` and the factor-specific audits for access and rights limits. If the local feed is missing or malformed, the page hides the factor cards along with the block evidence.
