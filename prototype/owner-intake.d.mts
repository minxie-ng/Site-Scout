export type OwnerIntake = {
  businessFormat: string; targetCustomers: string; existingOutlet: string;
  priceSgd: number; seats: number; classesPerWeek: number;
  variableCostSgd: number; instructorCostSgd: number; otherFixedSgd: number;
  rentCeilingSgd: number; openingBudgetSgd: number; runwayMonths: number;
  openingMonths: number; confirmed: boolean;
};
export function validateOwnerIntake(input: Partial<OwnerIntake> | null | undefined):
  { ready: boolean; missing: string[] };
export function runOwnerEconomics(input: Partial<OwnerIntake>): {
  basis: 'owner_confirmed_rent_ceiling'; requiredPaidVisitsPerMonth: number;
  breakEvenAverageUtilisation: number;
  capacityStatus: 'within_average_capacity' | 'impossible_at_average_capacity';
};
export function screenOwnerAreas(feed: unknown, input: Partial<OwnerIntake>): {
  economics: ReturnType<typeof runOwnerEconomics>;
  candidates: Array<{ id: string; name: string; blocks: string[];
    outcome: 'insufficient_evidence'; rank: null }>;
};
export function invalidateOwnerConfirmation(form: { querySelector(selector: string): { checked: boolean } },
  event: { target?: { name?: string } }): void;
export function mountOwnerIntake(root: unknown, status: unknown, feed: unknown): void;
