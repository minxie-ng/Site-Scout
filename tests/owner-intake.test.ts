import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, it } from 'vitest';
import { invalidateOwnerConfirmation, mountOwnerIntake, runOwnerEconomics, screenOwnerAreas, validateOwnerIntake } from '../prototype/owner-intake.mjs';
import { calculateBreakEven, calculateContributionPerPaidVisit, calculateMonthlyCapacity,
  calculateMonthlyFixedCost } from '../src/engine/economics';

const complete = { businessFormat: 'Group reformer Pilates', targetCustomers: 'Adults near transit',
  existingOutlet: 'None', priceSgd: 35, seats: 10, classesPerWeek: 30,
  variableCostSgd: 3, instructorCostSgd: 65, otherFixedSgd: 5000,
  rentCeilingSgd: 13000, openingBudgetSgd: 100000, runwayMonths: 6,
  openingMonths: 24, confirmed: true };
const feed = JSON.parse(readFileSync(resolve('prototype/data.json'), 'utf8'));

it('connects confirmed owner economics to three reviewed areas without promoting any site', () => {
  const screen = screenOwnerAreas(feed, complete);
  expect(screen.economics).toEqual(runOwnerEconomics(complete));
  expect(screen.candidates).toHaveLength(3);
  expect(screen.candidates.every(candidate => candidate.outcome === 'insufficient_evidence' && candidate.rank === null)).toBe(true);
  expect(screen.candidates[0].name).toContain('Punggol Point Cove');
  expect(screen).not.toHaveProperty('recommendedArea');
});

it('blocks owner area screening without confirmation or the reviewed local comparison', () => {
  expect(() => screenOwnerAreas(feed, { ...complete, confirmed: false })).toThrow();
  expect(() => screenOwnerAreas({ ...feed, clusters: [] }, complete)).toThrow();
  expect(() => screenOwnerAreas({ ...feed, decision: 'investigate' }, complete)).toThrow();
  expect(() => screenOwnerAreas({ ...feed, clusters: feed.clusters.map((cluster: any, index: number) =>
    index === 0 ? { ...cluster, blocks: cluster.blocks.map((block: any, blockIndex: number) =>
      blockIndex === 0 ? { ...block, hdbUrl: 'https://example.com/fake' } : block) } : cluster) }, complete)).toThrow();
});

it('accepts complete confirmed owner estimates without treating them as a location recommendation', () => {
  expect(validateOwnerIntake(complete)).toEqual({ ready: true, missing: [] });
});

it('does not apply the Pilates class model to tuition or food businesses', () => {
  for (const businessFormat of ['Tuition centre', 'Cafe and takeaway']) {
    const otherBusiness = { ...complete, businessFormat };
    expect(validateOwnerIntake(otherBusiness).ready).toBe(false);
    expect(() => runOwnerEconomics(otherBusiness)).toThrow();
  }
  expect(readFileSync(resolve('prototype/index.html'), 'utf8')).toContain('Current calculation supports group reformer Pilates only');
});

it('blocks missing and unconfirmed critical values without using synthetic defaults', () => {
  const result = validateOwnerIntake({ ...complete, targetCustomers: '', rentCeilingSgd: undefined,
    confirmed: false });
  expect(result).toEqual({ ready: false, missing: ['targetCustomers', 'rentCeilingSgd', 'confirmation'] });
});

it('rejects impossible price, capacity and monetary values', () => {
  const result = validateOwnerIntake({ ...complete, priceSgd: 2, variableCostSgd: 3,
    seats: 10.5, openingBudgetSgd: -1 });
  expect(result.ready).toBe(false);
  expect(result.missing).toEqual(expect.arrayContaining(['priceSgd', 'seats', 'openingBudgetSgd']));
});

it('requires fresh confirmation after an operator edits a confirmed estimate', () => {
  const confirmation = { checked: true };
  const form = { querySelector: () => confirmation };
  invalidateOwnerConfirmation(form, { target: { name: 'rentCeilingSgd' } });
  expect(confirmation.checked).toBe(false);
  expect(validateOwnerIntake({ ...complete, rentCeilingSgd: 14000, confirmed: confirmation.checked }))
    .toMatchObject({ ready: false, missing: ['confirmation'] });
});

it('offers a separate owner form and withholds personalized results until confirmation', () => {
  const page = readFileSync(resolve('prototype/index.html'), 'utf8');
  const app = readFileSync(resolve('prototype/app.js'), 'utf8');
  expect(page).toContain('id="owner-intake"');
  expect(page).toContain('id="owner-form"');
  expect(page).toContain('name="confirmed"');
  expect(app).toContain('mountOwnerIntake');
  expect(page).toContain('No personalized location result yet');
});

it('cannot submit owner figures through native HTML when JavaScript is unavailable', () => {
  const page = readFileSync(resolve('prototype/index.html'), 'utf8');
  const app = readFileSync(resolve('prototype/app.js'), 'utf8');
  expect(page).toContain('<div id="owner-form"');
  expect(page).not.toContain('<form id="owner-form"');
  expect(page).toContain('type="button" class="primary-action owner-submit"');
  expect(app).not.toContain('new FormData(form)');
});

it('clears a previously confirmed status when a field becomes invalid or changes through autofill', () => {
  const handlers = new Map<string, (event?: any) => void>();
  const fields = Object.entries(complete).map(([name, value]) => ({ name,
    type: name === 'confirmed' ? 'checkbox' : 'text', value: String(value), checked: value === true,
    checkValidity() { return this.type === 'checkbox' ? this.checked : this.value !== ''; },
    reportValidity() {} }));
  const confirmation = fields.find(field => field.name === 'confirmed')!;
  const button = { addEventListener: (_: string, handler: () => void) => handlers.set('click', handler) };
  const root = { addEventListener: (name: string, handler: (event: any) => void) => handlers.set(name, handler),
    querySelector: (selector: string) => selector === '.owner-submit' ? button : confirmation,
    querySelectorAll: () => fields };
  const status = { innerHTML: '<strong>Business inputs confirmed for this session</strong>' };
  mountOwnerIntake(root, status, feed);
  fields.find(field => field.name === 'priceSgd')!.value = '';
  handlers.get('click')!();
  expect(status.innerHTML).toContain('No personalized location result yet');
  confirmation.checked = true;
  handlers.get('change')!({ target: { name: 'priceSgd' } });
  expect(confirmation.checked).toBe(false);
});

it('rejects a valid silent autofill change after confirmation', () => {
  const handlers = new Map<string, (event?: any) => void>();
  const fields = Object.entries(complete).map(([name, value]) => ({ name,
    type: name === 'confirmed' ? 'checkbox' : 'text', value: String(value), checked: value === true,
    checkValidity: () => true, reportValidity() {} }));
  const confirmation = fields.find(field => field.name === 'confirmed')!;
  const button = { addEventListener: (_: string, handler: () => void) => handlers.set('click', handler) };
  const root = { addEventListener: (name: string, handler: (event: any) => void) => handlers.set(name, handler),
    querySelector: (selector: string) => selector === '.owner-submit' ? button : confirmation,
    querySelectorAll: () => fields };
  const status = { innerHTML: '' };
  mountOwnerIntake(root, status, feed);
  handlers.get('input')!({ target: { name: 'confirmed' } });
  handlers.get('click')!();
  expect(status.innerHTML).toContain('Business inputs confirmed');
  expect(status.innerHTML).toContain('break-even');
  expect(status.innerHTML).toContain('Punggol Point Cove');
  expect(status.innerHTML).toContain('Punggol Sapphire');
  expect(status.innerHTML).toContain('Punggol Ripples');
  expect(status.innerHTML.match(/insufficient evidence/g)).toHaveLength(3);
  expect(status.innerHTML).toContain('Confirmed calculation snapshot');
  expect(status.innerHTML).toContain('opening horizon');
  expect(status.innerHTML).toContain('business format');
  fields.find(field => field.name === 'priceSgd')!.value = '36';
  handlers.get('focusin')!();
  expect(confirmation.checked).toBe(false);
  expect(status.innerHTML).not.toContain('break-even');
  expect(status.innerHTML).not.toContain('Punggol Point Cove');
  confirmation.checked = true;
  handlers.get('click')!();
  expect(confirmation.checked).toBe(false);
  expect(status.innerHTML).toContain('No personalized location result yet');
  expect(status.innerHTML).not.toContain('break-even');
});

it('exposes confirmation freshness for later map changes and memo copying', () => {
  const handlers = new Map<string, (event?: any) => void>();
  const fields = Object.entries(complete).map(([name, value]) => ({ name,
    type: name === 'confirmed' ? 'checkbox' : 'text', value: String(value), checked: value === true,
    checkValidity: () => true, reportValidity() {} }));
  const root = { addEventListener: (name: string, handler: (event: any) => void) => handlers.set(name, handler),
    querySelector: (selector: string) => selector === '.owner-submit' ?
      { addEventListener: (_: string, handler: () => void) => handlers.set('click', handler) } :
      fields.find(field => field.name === 'confirmed'),
    querySelectorAll: () => fields };
  const current = mountOwnerIntake(root, { innerHTML: '' }, feed);
  handlers.get('input')!({ target: { name: 'confirmed' } });
  handlers.get('click')!();
  expect(current()).toBe(true);
  fields.find(field => field.name === 'priceSgd')!.value = '36';
  expect(current()).toBe(false);
});

it('keeps confirmed class economics available when the separate Punggol replay is missing', () => {
  const handlers = new Map<string, (event?: any) => void>();
  const fields = Object.entries(complete).map(([name, value]) => ({ name,
    type: name === 'confirmed' ? 'checkbox' : 'text', value: String(value), checked: value === true,
    checkValidity: () => true, reportValidity() {} }));
  const root = { addEventListener: (name: string, handler: (event: any) => void) => handlers.set(name, handler),
    querySelector: (selector: string) => selector === '.owner-submit' ?
      { addEventListener: (_: string, handler: () => void) => handlers.set('click', handler) } :
      fields.find(field => field.name === 'confirmed'),
    querySelectorAll: () => fields };
  const status = { innerHTML: '' };
  let confirmed = false;
  mountOwnerIntake(root, status, null, { onConfirmed: () => { confirmed = true; } });
  handlers.get('input')!({ target: { name: 'confirmed' } });
  handlers.get('click')!();
  expect(confirmed).toBe(true);
  expect(status.innerHTML).toContain('break-even');
  expect(status.innerHTML).toContain('Punggol replay unavailable');
  expect(status.innerHTML).not.toContain('Punggol Point Cove');
});

it('identifies invalid area evidence without blaming valid owner estimates', () => {
  const handlers = new Map<string, (event?: any) => void>();
  const fields = Object.entries(complete).map(([name, value]) => ({ name,
    type: name === 'confirmed' ? 'checkbox' : 'text', value: String(value), checked: value === true,
    checkValidity: () => true, reportValidity() {} }));
  const confirmation = fields.find(field => field.name === 'confirmed')!;
  const button = { addEventListener: (_: string, handler: () => void) => handlers.set('click', handler) };
  const root = { addEventListener: (name: string, handler: (event: any) => void) => handlers.set(name, handler),
    querySelector: (selector: string) => selector === '.owner-submit' ? button : confirmation,
    querySelectorAll: () => fields };
  const status = { innerHTML: '' };
  mountOwnerIntake(root, status, { ...feed, decision: 'investigate' });
  handlers.get('input')!({ target: { name: 'confirmed' } });
  handlers.get('click')!();
  expect(status.innerHTML).toContain('Evidence unavailable');
  expect(status.innerHTML).not.toContain('estimates are outside');
  expect(status.innerHTML).not.toContain('Punggol Point Cove');
  expect(confirmation.checked).toBe(false);
});

it('uses only confirmed owner figures for a rent-ceiling break-even screen', () => {
  const capacity = calculateMonthlyCapacity({ sellableSeatsPerClass: complete.seats,
    scheduledClassesPerWeek: complete.classesPerWeek, weeksPerMonth: 4.33 });
  const contribution = calculateContributionPerPaidVisit({ realisedRevenuePerVisit: complete.priceSgd,
    variableCostPerVisit: complete.variableCostSgd });
  const fixed = calculateMonthlyFixedCost({ averageClassesPerMonth: capacity.averageClassesPerMonth,
    instructorCostPerScheduledClass: complete.instructorCostSgd,
    otherFixedMonthlyCosts: complete.otherFixedSgd, rentPerMonth: complete.rentCeilingSgd });
  const expected = calculateBreakEven({ monthlyFixedCost: fixed, contributionPerPaidVisit: contribution,
    averageSeatVisitsPerMonth: capacity.averageSeatVisitsPerMonth });
  expect(runOwnerEconomics(complete)).toMatchObject({ basis: 'owner_confirmed_rent_ceiling',
    ...expected });
  expect(runOwnerEconomics(complete)).not.toHaveProperty('locationOutcome');
});

it('blocks owner economics when inputs are missing, changed or unconfirmed', () => {
  expect(() => runOwnerEconomics({ ...complete, confirmed: false })).toThrow();
  expect(() => runOwnerEconomics({ ...complete, rentCeilingSgd: undefined })).toThrow();
  expect(runOwnerEconomics({ ...complete, rentCeilingSgd: 16000 }).breakEvenAverageUtilisation)
    .toBeGreaterThan(runOwnerEconomics(complete).breakEvenAverageUtilisation);
});
