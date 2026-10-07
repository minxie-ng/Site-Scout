function positiveFinite(value: number, label: string): number {
  if (!Number.isFinite(value) || value <= 0) throw new RangeError(`${label} must be positive and finite`);
  return value;
}

function nonnegativeFinite(value: number, label: string): number {
  if (!Number.isFinite(value) || value < 0) throw new RangeError(`${label} must be nonnegative and finite`);
  return value;
}

function cents(value: number, label: string): number {
  nonnegativeFinite(value, label);
  const scaled = value * 100;
  if (!Number.isSafeInteger(Math.round(scaled)) || Math.abs(scaled - Math.round(scaled)) > 1e-7) {
    throw new RangeError(`${label} must be a safe amount with at most two decimal places`);
  }
  return Math.round(scaled);
}

export function calculateMonthlyCapacity(input: {
  sellableSeatsPerClass: number;
  scheduledClassesPerWeek: number;
  weeksPerMonth: number;
}): { averageClassesPerMonth: number; averageSeatVisitsPerMonth: number } {
  if (!Number.isSafeInteger(input.sellableSeatsPerClass) || input.sellableSeatsPerClass <= 0 ||
      !Number.isSafeInteger(input.scheduledClassesPerWeek) || input.scheduledClassesPerWeek <= 0) {
    throw new RangeError("Seats and scheduled classes must be positive whole numbers");
  }
  positiveFinite(input.weeksPerMonth, "Weeks per month");
  // A 4.33-week month yields an average monthly equivalent, not a calendar-exact schedule.
  const averageClassesPerMonth = input.scheduledClassesPerWeek * input.weeksPerMonth;
  const averageSeatVisitsPerMonth = input.sellableSeatsPerClass * averageClassesPerMonth;
  if (!Number.isFinite(averageSeatVisitsPerMonth) || averageSeatVisitsPerMonth > Number.MAX_SAFE_INTEGER) {
    throw new RangeError("Monthly capacity is outside the supported range");
  }
  return { averageClassesPerMonth, averageSeatVisitsPerMonth };
}

export function calculateContributionPerPaidVisit(input: {
  realisedRevenuePerVisit: number;
  variableCostPerVisit: number;
}): number {
  const revenueCents = cents(input.realisedRevenuePerVisit, "Realised revenue per visit");
  const variableCents = cents(input.variableCostPerVisit, "Variable cost per visit");
  if (revenueCents <= variableCents) throw new RangeError("Positive contribution per visit is required");
  return (revenueCents - variableCents) / 100;
}

export function calculateMonthlyFixedCost(input: {
  averageClassesPerMonth: number;
  instructorCostPerScheduledClass: number;
  otherFixedMonthlyCosts: number;
  rentPerMonth: number;
}): number {
  nonnegativeFinite(input.averageClassesPerMonth, "Average classes per month");
  const instructorCents = cents(input.instructorCostPerScheduledClass, "Instructor cost per class");
  const otherCents = cents(input.otherFixedMonthlyCosts, "Other fixed monthly costs");
  const rentCents = cents(input.rentPerMonth, "Monthly rent");
  const totalCents = Math.round(input.averageClassesPerMonth * instructorCents + otherCents + rentCents);
  if (!Number.isSafeInteger(totalCents)) throw new RangeError("Monthly fixed cost is outside the supported range");
  return totalCents / 100;
}

export function calculateBreakEven(input: {
  monthlyFixedCost: number;
  contributionPerPaidVisit: number;
  averageSeatVisitsPerMonth: number;
}): { requiredPaidVisitsPerMonth: number; breakEvenAverageUtilisation: number; capacityStatus: "within_average_capacity" | "impossible_at_average_capacity" } {
  const fixedCents = cents(input.monthlyFixedCost, "Monthly fixed cost");
  const contributionCents = cents(input.contributionPerPaidVisit, "Contribution per paid visit");
  if (contributionCents === 0) throw new RangeError("Positive contribution per visit is required");
  const capacity = positiveFinite(input.averageSeatVisitsPerMonth, "Average seat visits per month");
  const requiredPaidVisitsPerMonth = Math.ceil(fixedCents / contributionCents);
  if (!Number.isSafeInteger(requiredPaidVisitsPerMonth)) throw new RangeError("Break-even visits are outside the supported range");
  const breakEvenAverageUtilisation = requiredPaidVisitsPerMonth / capacity;
  if (!Number.isFinite(breakEvenAverageUtilisation)) throw new RangeError("Break-even utilisation is outside the supported range");
  return {
    requiredPaidVisitsPerMonth,
    breakEvenAverageUtilisation,
    capacityStatus: requiredPaidVisitsPerMonth > capacity ? "impossible_at_average_capacity" : "within_average_capacity",
  };
}
