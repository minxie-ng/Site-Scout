import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { buildIslandwideInvestigationOrder } from '../src/domain/islandwide-priority';
import { mountPriorityMap, priorityMapView, validatePriorityMapFeed, verifyPriorityMapFeed } from '../prototype/priority-map.mjs';

const feedPath = 'prototype/priority-map.json';
const feed = () => JSON.parse(readFileSync(feedPath, 'utf8'));

it('withholds a plausible but altered coordinate in the deployed map feed', async () => {
  const raw = readFileSync(feedPath, 'utf8');
  expect((await verifyPriorityMapFeed(raw)).priorities).toHaveLength(3);
  const changed = JSON.parse(raw);
  changed.priorities[0].members[0].latitude += 0.0001;
  await expect(verifyPriorityMapFeed(JSON.stringify(changed))).rejects.toThrow('integrity');
});

it('binds the displayed three groups and nine block points to checked domain output', () => {
  const domain = buildIslandwideInvestigationOrder();
  const shown = validatePriorityMapFeed(feed());
  expect(shown.snapshotDate).toBe('2026-10-12');
  expect(shown.selectionScope).toBe('sampled_groups_research_triage');
  expect(shown.outcome).toBe('insufficient_evidence');
  expect(shown.coverage).toEqual(domain.coverage);
  expect(shown.priorities).toEqual(domain.priorities.map(priority => ({
    investigationPriority: priority.investigationPriority,
    townCode: priority.townCode,
    publishedDwellingUnits: priority.publishedDwellingUnits,
    maxPairwiseMetres: priority.maxPairwiseMetres,
    evidenceKind: priority.evidenceKind,
    outcome: priority.outcome,
    siteRank: priority.siteRank,
    members: priority.members.map(member => ({ block: member.block, street: member.street,
      latitude: member.latitude, longitude: member.longitude,
      publishedDwellingUnits: member.publishedDwellingUnits,
      sourceUrl: member.sourceUrl, retrievedAt: member.retrievedAt,
      evidenceStatus: member.evidenceStatus, hdbSourceUrl: member.hdbSourceUrl,
      hdbRetrievedDate: member.hdbRetrievedDate })),
  })));
});

it('withholds the map for missing, duplicate or unsupported source points', () => {
  const good = feed();
  const missing = structuredClone(good);
  delete missing.priorities[1].members[1].longitude;
  expect(() => validatePriorityMapFeed(missing)).toThrow();
  const duplicate = structuredClone(good);
  duplicate.priorities[1].members[1].block = duplicate.priorities[1].members[0].block;
  expect(() => validatePriorityMapFeed(duplicate)).toThrow();
  const badSource = structuredClone(good);
  badSource.priorities[2].members[0].sourceUrl = 'https://example.com/fake';
  expect(() => validatePriorityMapFeed(badSource)).toThrow();
});

it('renders source attribution, dates, coverage and abstaining labels for the selected group', () => {
  const view = priorityMapView(validatePriorityMapFeed(feed()), 1);
  expect(view.overview).toContain('Sengkang');
  expect(view.overview).toContain('role="group"');
  expect(view.overview).not.toContain('role="img"');
  expect(view.overview).toContain('data-priority="1"');
  expect(view.detail).toContain('Block 1');
  expect(view.detail).toContain('OneMap');
  expect(view.detail).toContain('HDB');
  expect(view.detail).toContain('retrieved');
  expect(view.detail).toContain('Insufficient evidence');
  expect(view.coverage).toContain('27 whole towns unassessed');
  expect(view.coverage).toContain('10,727');
  expect(view.choices.match(/aria-pressed=/g)).toHaveLength(3);
  expect(view.choices).toContain('aria-pressed="true"');
});

it('changes the inspected three-block group by keyboard-compatible button selection', () => {
  const listeners = new Map<string, (event: { target: { closest: (selector: string) => unknown } }) => void>();
  const regions = new Map(['#priority-overview', '#priority-local', '#priority-choices',
    '#priority-detail', '#priority-coverage'].map(key => [key, { innerHTML: '',
      addEventListener: (type: string, callback: (event: { target: { closest: (selector: string) => unknown } }) => void) =>
        listeners.set(`${key}:${type}`, callback) }]));
  const root = { querySelector: (key: string) => regions.get(key) };
  mountPriorityMap(root, feed());
  const initial = regions.get('#priority-detail')!.innerHTML;
  listeners.get('#priority-choices:click')!({ target: { closest: () => ({ dataset: { priority: '2' } }) } });
  expect(regions.get('#priority-detail')!.innerHTML).not.toBe(initial);
  expect(regions.get('#priority-detail')!.innerHTML).toContain('Clementi');
  expect(regions.get('#priority-choices')!.innerHTML).toContain('aria-pressed="true"');
});

it('restores focus to the selected control after replacing map markup', () => {
  const listeners = new Map<string, (event: any) => void>();
  let focusRestored = false;
  const focused = { dataset: { priority: '1' }, focus: () => { focusRestored = true; } };
  const regions = new Map(['#priority-overview', '#priority-local', '#priority-choices',
    '#priority-detail', '#priority-coverage'].map(key => [key, { innerHTML: '',
      querySelector: () => focused,
      addEventListener: (type: string, callback: (event: any) => void) => listeners.set(`${key}:${type}`, callback) }]));
  mountPriorityMap({ querySelector: (key: string) => regions.get(key) }, feed());
  const target = { dataset: { priority: '1' }, closest: () => target };
  Object.defineProperty(globalThis, 'document', { configurable: true, value: { activeElement: target } });
  try {
    listeners.get('#priority-choices:click')!({ target });
    expect(focusRestored).toBe(true);
  } finally { Reflect.deleteProperty(globalThis, 'document'); }
});

it('places the checked Singapore sample map in the prototype and loads its dated feed', () => {
  const page = readFileSync('prototype/index.html', 'utf8');
  const app = readFileSync('prototype/app.js', 'utf8');
  expect(page).toContain('id="priority-map"');
  for (const region of ['overview', 'local', 'choices', 'detail', 'coverage'])
    expect(page).toContain(`id="priority-${region}"`);
  expect(page).toContain('Interactive coordinate map');
  expect(page).toContain('No national winner');
  expect(page).toContain('href="#priority-map"');
  expect(page).toContain('CHECKED SINGAPORE SAMPLE');
  expect(page).toContain('Data: OneMap address points and HDB housing records');
  expect(app).toContain('mountPriorityMap');
  expect(app).toContain('./priority-map.json');
});
