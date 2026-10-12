import { createHash } from 'node:crypto';
import { readFileSync, realpathSync } from 'node:fs';
import { resolve, sep } from 'node:path';
import { expect, it } from 'vitest';
import { loadHdbBlockLeads } from '../src/domain/hdb-block-leads';
import { planOneMapProbes, reviewOneMapSearch } from '../src/providers/onemap-search';

const root = resolve('src/data/snapshots/2026-10-12/original');
const manifestPath = resolve('src/data/snapshots/2026-10-12/onemap-town-sample.json');

it('replays one bounded, source-checked OneMap request per HDB town without selecting a site', () => {
  const manifestBytes = readFileSync(manifestPath);
  expect(createHash('sha256').update(manifestBytes).digest('hex'))
    .toBe('ea4e5c8d78199756579244f709a9e5b85b657813ba0053f3e5c3bef96f8c09a0');
  const manifest = JSON.parse(manifestBytes.toString('utf8'));
  const plan = planOneMapProbes(loadHdbBlockLeads());
  expect(manifest).toMatchObject({ schemaVersion: 1, requestCeiling: 27,
    geographicScope: 'One exact HDB block-and-street probe in each of 27 Singapore HDB contract-town codes',
    outcome: 'insufficient_evidence', selected: null });
  expect(manifest.entries).toHaveLength(27);
  expect(manifest.entries.map((entry: any) => entry.townCode)).toEqual(plan.probes.map(probe => probe.townCode));
  for (const [index, entry] of manifest.entries.entries()) {
    const lead = plan.probes[index];
    expect(entry).toMatchObject({ townCode: lead.townCode, block: lead.block, street: lead.street,
      outcome: 'insufficient_evidence' });
    expect(entry.sourceUrl).toBe(reviewOneMapSearch(lead, null, entry.retrievedAt.slice(0, 10)).sourceUrl);
    expect(entry.retrievedAt).toMatch(/^2026-10-12T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    if (entry.rawPath) {
      expect(entry.httpStatus).toBe(200);
      const path = realpathSync(resolve(entry.rawPath));
      expect(path.startsWith(root + sep)).toBe(true);
      const bytes = readFileSync(path);
      expect(createHash('sha256').update(bytes).digest('hex')).toBe(entry.sha256);
      const reviewed = reviewOneMapSearch(lead, JSON.parse(bytes.toString('utf8')), entry.retrievedAt.slice(0, 10));
      expect(entry.reviewStatus).toBe(reviewed.status);
      expect(reviewed.outcome).toBe('insufficient_evidence');
    } else {
      expect(entry.reviewStatus).toMatch(/^(request_failed|auth_failed|rate_limited)$/);
    }
  }
});
