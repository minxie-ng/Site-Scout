import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, it } from 'vitest';
import { parseBusinessProfile } from '../src/domain/business';
import { runSyntheticScenario } from '../src/engine/scenario';
import { runPreviewScenario, sampleInputs, occupancyTimingLabel, economicResultLabel } from '../prototype/scenario-preview.mjs';

const fixture = JSON.parse(readFileSync(resolve('src/data/demo/business-profile.json'), 'utf8'));
const parsed = parseBusinessProfile(fixture);
if (!parsed.success) throw new Error('Invalid synthetic fixture');

it('uses the approved synthetic defaults and matches the deterministic engine under edits', () => {
  expect(sampleInputs).toMatchObject({ seats: 10, classesPerWeek: 30, priceSgd: 35,
    rentSgd: 13000, utilisationPercent: 70, openingMonths: 24 });
  for (const edits of [sampleInputs,
    { ...sampleInputs, rentSgd: 16000, utilisationPercent: 60, openingMonths: 18 },
    { ...sampleInputs, seats: 8, classesPerWeek: 24, priceSgd: 40, openingMonths: 30 }]) {
    const profile = structuredClone(parsed.data);
    profile.capacity.sellableSeatsPerClass.value = edits.seats;
    profile.capacity.scheduledClassesPerWeek.value = edits.classesPerWeek;
    profile.economics.averageRealisedRevenuePerPaidVisit.value = edits.priceSgd;
    const engine = runSyntheticScenario(profile, { monthlyRentSgd: edits.rentSgd,
      paidVisitUtilisation: edits.utilisationPercent / 100,
      projectedDevelopmentCompletionMonths: 20, developmentDelayMonths: 0,
      proposedOpeningMonths: edits.openingMonths, developmentProvenance: 'synthetic_assumption',
      occupancyLagMonths: 4, occupancyProvenance: 'synthetic_assumption' });
    expect(runPreviewScenario(edits)).toMatchObject({ requiredPaidVisitsPerMonth: engine.requiredPaidVisitsPerMonth,
      breakEvenAverageUtilisation: engine.breakEvenAverageUtilisation,
      monthlyOperatingSurplusSgd: engine.monthlyOperatingSurplusSgd,
      paidVisitsPerAverageMonth: engine.paidVisitsPerAverageMonth,
      occupancyCondition: engine.occupancyCondition });
  }
});

it('rejects missing, impossible, and non-cent synthetic inputs', () => {
  expect(() => runPreviewScenario({ ...sampleInputs, priceSgd: 3 })).toThrow();
  expect(() => runPreviewScenario({ ...sampleInputs, rentSgd: -1 })).toThrow();
  expect(() => runPreviewScenario({ ...sampleInputs, utilisationPercent: 101 })).toThrow();
  expect(() => runPreviewScenario({ ...sampleInputs, seats: 0 })).toThrow();
  expect(() => runPreviewScenario({ ...sampleInputs, priceSgd: 35.001 })).toThrow();
  expect(() => runPreviewScenario({ ...sampleInputs, openingMonths: 31 })).toThrow();
});

it('describes equal opening and occupancy months accurately', () => {
  expect(occupancyTimingLabel(18)).toBe('before');
  expect(occupancyTimingLabel(24)).toBe('at or after');
  expect(occupancyTimingLabel(30)).toBe('at or after');
});

it('labels a zero monthly result as break-even rather than surplus', () => {
  const result = runPreviewScenario({ ...sampleInputs, rentSgd: 15644.5 });
  expect(result).toMatchObject({ monthlyOperatingSurplusSgd: 0, economicCondition: 'break_even' });
  expect(economicResultLabel(result.economicCondition)).toBe('MONTHLY OPERATING BREAK-EVEN');
});
