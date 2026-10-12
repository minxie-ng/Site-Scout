import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { buildStudyMemo } from '../prototype/study-memo.mjs';
import { runPreviewScenario, sampleInputs } from '../prototype/scenario-preview.mjs';

const feed = () => JSON.parse(readFileSync('prototype/data.json', 'utf8'));

describe('local abstaining study memo', () => {
  it('carries edited synthetic economics into three dated, unranked real block groups', () => {
    const edits = { ...sampleInputs, rentSgd: 16000, utilisationPercent: 60, openingMonths: 30 };
    const scenario = runPreviewScenario(edits);
    const memo = buildStudyMemo(feed(), edits);
    expect(memo).toMatchObject({ snapshotDate: '2026-10-06', profileStatus: 'synthetic_assumption',
      decision: 'insufficient_evidence', inputs: edits,
      monthlyOperatingSurplusSgd: scenario.monthlyOperatingSurplusSgd });
    expect(memo.candidates).toHaveLength(3);
    expect(memo.candidates.map((candidate: { blocks: string[] }) => candidate.blocks)).toEqual([
      ['442A', '442B', '443A'], ['267A', '267B', '267C'], ['211A', '211B', '211C'],
    ]);
    expect(memo.candidates.every((candidate: { outcome: string; rank: null; sourceDates: { oneMap: string[]; hdb: string[] } }) =>
      candidate.outcome === 'insufficient_evidence' && candidate.rank === null &&
      candidate.sourceDates.oneMap.length > 0 && candidate.sourceDates.hdb.length > 0)).toBe(true);
    expect(memo.nextInvestigation).toMatch(/specific commercial unit.*rent.*permitted.*size/i);
  });

  it('rejects a promoted site, missing source dates, and invalid economics', () => {
    const promoted = feed(); promoted.decision = 'investigate';
    expect(() => buildStudyMemo(promoted, sampleInputs)).toThrow();
    const duplicate = feed(); duplicate.clusters[1] = structuredClone(duplicate.clusters[0]);
    expect(() => buildStudyMemo(duplicate, sampleInputs)).toThrow();
    const invented = feed(); invented.clusters[0].blocks[0].id = '999Z';
    expect(() => buildStudyMemo(invented, sampleInputs)).toThrow();
    const renamed = feed(); renamed.clusters[0].name = 'Best Pilates opening site';
    expect(() => buildStudyMemo(renamed, sampleInputs)).toThrow();
    const impossibleSnapshot = feed(); impossibleSnapshot.snapshotDate = '2026-02-30';
    expect(() => buildStudyMemo(impossibleSnapshot, sampleInputs)).toThrow();
    const changedSnapshot = feed(); changedSnapshot.snapshotDate = '2026-10-07';
    expect(() => buildStudyMemo(changedSnapshot, sampleInputs)).toThrow();
    const swappedSources = feed();
    const a = swappedSources.clusters[0].blocks[0];
    const b = swappedSources.clusters[1].blocks[0];
    [a.oneMapUrl, b.oneMapUrl] = [b.oneMapUrl, a.oneMapUrl];
    [a.hdbUrl, b.hdbUrl] = [b.hdbUrl, a.hdbUrl];
    [a.oneMapRetrievedAt, b.oneMapRetrievedAt] = [b.oneMapRetrievedAt, a.oneMapRetrievedAt];
    [a.hdbRetrievedAt, b.hdbRetrievedAt] = [b.hdbRetrievedAt, a.hdbRetrievedAt];
    expect(() => buildStudyMemo(swappedSources, sampleInputs)).toThrow();
    const undated = feed(); undated.clusters[0].blocks[0].hdbRetrievedAt = null;
    expect(() => buildStudyMemo(undated, sampleInputs)).toThrow();
    const impossibleDate = feed(); impossibleDate.clusters[0].blocks[0].hdbRetrievedAt = '2026-02-30T04:03:06Z';
    expect(() => buildStudyMemo(impossibleDate, sampleInputs)).toThrow();
    expect(() => buildStudyMemo(feed(), { ...sampleInputs, rentSgd: -1 })).toThrow();
  });

  it('has a browser panel for memo, source dates, synthetic inputs and abstention', () => {
    const page = readFileSync('prototype/index.html', 'utf8');
    const app = readFileSync('prototype/app.js', 'utf8');
    expect(page).toContain('id="study-memo"');
    expect(page).toContain('id="memo-content"');
    expect(app).toContain('buildStudyMemo');
    expect(app).toContain('memo-content');
  });
});
