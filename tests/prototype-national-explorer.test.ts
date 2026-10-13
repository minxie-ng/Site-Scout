import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { loadCandidateEligibility } from '../src/domain/candidate-eligibility';
import { verifyPriorityMapFeed } from '../prototype/priority-map.mjs';
import { nationalExplorerView } from '../prototype/national-explorer.mjs';

it('exposes every checked town and three-block witness while retaining missing coverage', async () => {
  const checked = loadCandidateEligibility();
  const feed = await verifyPriorityMapFeed(readFileSync('prototype/priority-map.json', 'utf8'));
  expect(feed.townCoverage).toHaveLength(27);
  expect(feed.sampledGroups).toHaveLength(checked.groups.length);
  expect(feed.checkedPoints).toHaveLength(162);
  expect(feed.townCoverage.map((town: any) => town.code)).toEqual(checked.towns.map(town => town.code));
  expect(feed.checkedPoints.map((point: any) => [point.townCode, point.block, point.street,
    point.latitude, point.longitude, point.sourceUrl, point.retrievedAt])).toEqual(
    checked.checkedPoints.map(point => [point.townCode, point.block, point.street,
      point.latitude, point.longitude, point.sourceUrl, point.retrievedAt]));
  expect(feed.sampledGroups.map((group: any) => group.members.map((member: any) => member.block)))
    .toEqual(checked.groups.map(group => group.members.map(member => member.block)));
  const view = nationalExplorerView(feed);
  expect(view).toContain('27 HDB town codes');
  expect(view).toContain('10,647 unprobed leads');
  expect(view).toContain('OneMap');
  expect(view).toContain('HDB');
  expect(view).toContain('retrieved 2026-10-12');
  expect(view).toContain('Singapore HDB block-address sample');
  expect(view).toContain('Insufficient evidence');
  expect(view).toContain('No checked three-block group');
});
