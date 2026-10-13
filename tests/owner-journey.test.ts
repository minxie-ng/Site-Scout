import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { buildOwnerJourney, ownerJourneyMemo } from '../prototype/owner-journey.mjs';
import { verifyPriorityMapFeed } from '../prototype/priority-map.mjs';

const owner = { businessFormat: 'Group reformer Pilates', targetCustomers: 'Adults near transit',
  existingOutlet: 'None', priceSgd: 35, seats: 10, classesPerWeek: 30,
  variableCostSgd: 3, instructorCostSgd: 65, otherFixedSgd: 5000,
  rentCeilingSgd: 13000, openingBudgetSgd: 100000, runwayMonths: 6,
  openingMonths: 24, confirmed: true };
const feed = async () => verifyPriorityMapFeed(readFileSync('prototype/priority-map.json', 'utf8'));

it('connects confirmed owner economics to a selected checked block group and dated memo without a site approval', async () => {
  const snapshot = await feed();
  const result = buildOwnerJourney(snapshot, owner, 1, 60);
  expect(result).toMatchObject({ area: 'Sengkang', blocks: ['1', '2', '3'],
    utilisationPercent: 60, outcome: 'insufficient_evidence',
    profileStatus: 'owner_confirmed_estimate', areaStatus: 'checked_sample_replay' });
  expect(result.economicCondition).toBe('below_class_only_break_even');
  expect(result.sources).toHaveLength(3);
  const memo = ownerJourneyMemo(result);
  expect(memo).toContain('Sengkang');
  expect(memo).toContain('OneMap');
  expect(memo).toContain('HDB');
  expect(memo).toContain('retrieved');
  expect(memo).toContain('checked address replay');
  expect(memo).toContain('checked housing-record replay');
  expect(memo).toContain('derived housing-stock proxy');
  expect(memo).toContain('10,727');
  expect(memo).toContain('27 whole towns');
  expect(memo).toContain('insufficient_evidence');
  expect(memo).toContain('permitted Pilates use');
  expect(memo).not.toMatch(/recommended site|best location/i);
});

it('changes only the class economics when the owner changes assumed paid-seat utilisation', async () => {
  const snapshot = await feed();
  const high = buildOwnerJourney(snapshot, owner, 0, 80);
  const low = buildOwnerJourney(snapshot, owner, 0, 20);
  expect(high.economicCondition).toBe('above_class_only_break_even');
  expect(low.economicCondition).toBe('below_class_only_break_even');
  expect(high.outcome).toBe(low.outcome);
  expect(high.sources).toEqual(low.sources);
});

it('withholds the journey for unconfirmed owner inputs, invalid scenario or unchecked area', async () => {
  const snapshot = await feed();
  expect(() => buildOwnerJourney(snapshot, { ...owner, confirmed: false }, 0, 60)).toThrow();
  expect(() => buildOwnerJourney(snapshot, owner, 3, 60)).toThrow();
  expect(() => buildOwnerJourney(snapshot, owner, 0, Number.NaN)).toThrow();
  expect(() => buildOwnerJourney(snapshot, owner, 0, 101)).toThrow();
  const altered = structuredClone(snapshot);
  delete altered.priorities[0].members[0].latitude;
  expect(() => buildOwnerJourney(altered, owner, 0, 60)).toThrow();
  const plausible = structuredClone(snapshot);
  plausible.priorities[0].members[0].latitude += 0.0001;
  expect(() => buildOwnerJourney(plausible, owner, 0, 60)).toThrow();
  const originalLatitude = snapshot.priorities[0].members[0].latitude;
  expect(() => { snapshot.priorities[0].members[0].latitude = originalLatitude + 0.0001; }).toThrow();
  expect(snapshot.priorities[0].members[0].latitude).toBe(originalLatitude);
});

it('wires confirmation, selected checked area, scenario control and copyable memo into one page', () => {
  const page = readFileSync('prototype/index.html', 'utf8');
  const app = readFileSync('prototype/app.js', 'utf8');
  for (const id of ['owner-journey', 'owner-utilisation', 'owner-journey-result', 'owner-journey-memo', 'copy-owner-memo'])
    expect(page).toContain(`id="${id}"`);
  expect(app).toContain('buildOwnerJourney');
  expect(app).toContain('onConfirmed');
  expect(app).toContain('selectedPriority = index');
  expect(app).toContain('navigator.clipboard.writeText');
  expect(app).toContain('ownerConfirmationCurrent()');
  expect(app).toContain('value.trim()');
  expect(page).toContain('id="owner-utilisation" type="number" min="0" max="100" step="1" value="60" required');
});
