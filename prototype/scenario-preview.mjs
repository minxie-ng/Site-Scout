// Browser projection of the approved class-only fixture; parity-tested against the decision engine.
export const sampleInputs = Object.freeze({ seats: 10, classesPerWeek: 30, priceSgd: 35,
  rentSgd: 13000, utilisationPercent: 70, openingMonths: 24 });

export const occupancyTimingLabel = openingMonths => openingMonths >= 24 ? 'at or after' : 'before';
export const economicResultLabel = condition => condition === 'deficit' ? 'MONTHLY OPERATING GAP' :
  condition === 'break_even' ? 'MONTHLY OPERATING BREAK-EVEN' : 'MONTHLY OPERATING SURPLUS';

function cents(value, label) {
  const scaled = value * 100;
  if (!Number.isFinite(value) || value < 0 || !Number.isSafeInteger(Math.round(scaled)) ||
    Math.abs(scaled - Math.round(scaled)) > 1e-7) throw new RangeError(`${label} must be a nonnegative amount in cents`);
  return Math.round(scaled);
}

export function runPreviewScenario(input) {
  if (!input || !Number.isSafeInteger(input.seats) || input.seats < 1 ||
    !Number.isSafeInteger(input.classesPerWeek) || input.classesPerWeek < 1 ||
    !Number.isSafeInteger(input.openingMonths) || input.openingMonths < 18 || input.openingMonths > 30 ||
    !Number.isFinite(input.utilisationPercent) || input.utilisationPercent < 0 || input.utilisationPercent > 100) {
    throw new RangeError('Enter valid seats, classes, utilisation, and an opening month from 18 to 30');
  }
  const priceCents = cents(input.priceSgd, 'Price');
  const rentCents = cents(input.rentSgd, 'Rent');
  const contributionCents = priceCents - 300; // Synthetic S$3 variable cost per paid visit.
  if (contributionCents <= 0) throw new RangeError('Price must exceed the synthetic S$3 variable cost');
  const classesPerMonth = input.classesPerWeek * 4.33;
  const capacity = input.seats * classesPerMonth;
  const fixedCents = Math.round(classesPerMonth * 6500 + 500000 + rentCents);
  const paidVisitsPerAverageMonth = Math.floor(capacity * input.utilisationPercent / 100);
  const requiredPaidVisitsPerMonth = Math.ceil(fixedCents / contributionCents);
  const surplusCents = paidVisitsPerAverageMonth * contributionCents - fixedCents;
  if (!Number.isFinite(capacity) || capacity > Number.MAX_SAFE_INTEGER ||
    ![fixedCents, paidVisitsPerAverageMonth, requiredPaidVisitsPerMonth, surplusCents]
      .every(Number.isSafeInteger)) throw new RangeError('Scenario is outside the supported range');
  return {
    requiredPaidVisitsPerMonth,
    paidVisitsPerAverageMonth,
    breakEvenAverageUtilisation: requiredPaidVisitsPerMonth / capacity,
    monthlyOperatingSurplusSgd: surplusCents / 100,
    economicCondition: surplusCents > 0 ? 'surplus' : surplusCents < 0 ? 'deficit' : 'break_even',
    occupancyCondition: input.openingMonths >= 24 ? 'synthetic_occupancy_by_opening' : 'synthetic_occupancy_after_opening',
  };
}
