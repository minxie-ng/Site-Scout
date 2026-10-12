export type PreviewInputs = { seats: number; classesPerWeek: number; priceSgd: number; rentSgd: number;
  utilisationPercent: number; openingMonths: number };
export const sampleInputs: Readonly<PreviewInputs>;
export function occupancyTimingLabel(openingMonths: number): 'before' | 'at or after';
export function economicResultLabel(condition: 'surplus' | 'deficit' | 'break_even'): string;
export function runPreviewScenario(input: PreviewInputs): {
  requiredPaidVisitsPerMonth: number; paidVisitsPerAverageMonth: number;
  breakEvenAverageUtilisation: number; monthlyOperatingSurplusSgd: number;
  economicCondition: 'surplus' | 'deficit' | 'break_even';
  occupancyCondition: 'synthetic_occupancy_by_opening' | 'synthetic_occupancy_after_opening';
};
