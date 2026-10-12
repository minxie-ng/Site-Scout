import { runPreviewScenario } from './scenario-preview.mjs';
import { reviewedSnapshotDate, reviewedSources } from './memo-source-manifest.mjs';

const dated = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(value) &&
  !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().replace('.000Z', 'Z') === value;
const reviewedGroups = [
  { id: 'punggol-point-cove-442a-442b-443a', name: 'Punggol Point Cove: Blocks 442A, 442B, 443A', blocks: ['442A', '442B', '443A'] },
  { id: 'punggol-sapphire-267a-267b-267c', name: 'Punggol Sapphire: Blocks 267A, 267B, 267C', blocks: ['267A', '267B', '267C'] },
  { id: 'punggol-ripples-211a-211b-211c', name: 'Punggol Ripples: Blocks 211A, 211B, 211C', blocks: ['211A', '211B', '211C'] },
];

export function buildReviewedCandidates(feed) {
  if (feed?.decision !== 'insufficient_evidence' || feed.snapshotDate !== reviewedSnapshotDate ||
    !dated(`${feed.snapshotDate}T00:00:00Z`) ||
    !Array.isArray(feed.clusters) || feed.clusters.length !== 3) throw new Error('Invalid memo evidence');
  return feed.clusters.map((cluster, index) => {
    const reviewed = reviewedGroups[index];
    if (cluster.evidenceStatus !== 'candidate_cluster' || !Array.isArray(cluster.blocks) || cluster.blocks.length !== 3 ||
      cluster.linkedDevelopmentIds?.length !== 0 || cluster.linkedCompetitorIds?.length !== 0 ||
      cluster.id !== reviewed.id || cluster.name !== reviewed.name ||
      cluster.blocks.some((block, blockIndex) => block.id !== reviewed.blocks[blockIndex])) throw new Error('Invalid memo cluster');
    const sources = cluster.blocks.map(block => {
      const citation = reviewedSources[block.id];
      if (typeof block.id !== 'string' || !dated(block.oneMapRetrievedAt) || !dated(block.hdbRetrievedAt) ||
        !citation || [block.postal, block.oneMapUrl, block.oneMapRetrievedAt, block.hdbUrl, block.hdbRetrievedAt,
          block.latitude, block.longitude, block.units, block.completed]
          .some((value, index) => value !== citation[index])) throw new Error('Missing memo provenance');
      return { block: block.id, oneMapUrl: block.oneMapUrl, oneMapRetrievedAt: block.oneMapRetrievedAt,
        hdbUrl: block.hdbUrl, hdbRetrievedAt: block.hdbRetrievedAt };
    });
    return { id: cluster.id, name: cluster.name.split(':')[0], blocks: sources.map(source => source.block),
      sources, sourceDates: { oneMap: [...new Set(sources.map(source => source.oneMapRetrievedAt.slice(0, 10)))].sort(),
        hdb: [...new Set(sources.map(source => source.hdbRetrievedAt.slice(0, 10)))].sort() },
      outcome: 'insufficient_evidence', rank: null };
  });
}

export function buildStudyMemo(feed, inputs) {
  const candidates = buildReviewedCandidates(feed);
  const scenario = runPreviewScenario(inputs);
  return { snapshotDate: feed.snapshotDate, profileStatus: 'synthetic_assumption', decision: 'insufficient_evidence',
    inputs: { ...inputs }, monthlyOperatingSurplusSgd: scenario.monthlyOperatingSurplusSgd,
    economicCondition: scenario.economicCondition, candidates,
    nextInvestigation: 'Identify one specific commercial unit near a candidate group, then confirm its current rent, permitted Pilates use and size.' };
}
