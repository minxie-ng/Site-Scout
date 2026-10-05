import { z } from "zod";

const provenanceSchema = z.literal("synthetic_assumption");

const stringAssumptionSchema = z.object({
  value: z.string().min(1),
  provenance: provenanceSchema,
  ownerEditable: z.boolean(),
}).strict();

function numberAssumptionSchema<const TUnit extends string>(unit: TUnit) {
  return z.object({
    value: z.number().positive(),
    unit: z.literal(unit),
    provenance: provenanceSchema,
    ownerEditable: z.boolean(),
  }).strict();
}

function integerAssumptionSchema<const TUnit extends string>(unit: TUnit) {
  return numberAssumptionSchema(unit).extend({
    value: z.number().int().positive(),
  }).strict();
}

const ratioAssumptionSchema = z.object({
  value: z.number().min(0).max(1),
  unit: z.literal("ratio"),
  provenance: provenanceSchema,
  ownerEditable: z.boolean(),
}).strict();

const isoDateAssumptionSchema = stringAssumptionSchema.extend({
  value: z.iso.date(),
}).strict();

export const businessProfileSchema = z
  .object({
    id: z.string().min(1),
    version: z.number().int().positive(),
    status: z.literal("approved_synthetic_demo"),
    currency: z.literal("SGD"),
    business: z.object({
      category: stringAssumptionSchema,
      format: stringAssumptionSchema,
      expansionDecision: stringAssumptionSchema,
      existingOutlet: stringAssumptionSchema.extend({
        coordinates: z
          .object({
            latitude: z.number().min(-90).max(90),
            longitude: z.number().min(-180).max(180),
          })
          .nullable(),
      }).strict(),
      targetCustomerStatement: stringAssumptionSchema,
    }).strict(),
    capacity: z.object({
      sellableSeatsPerClass: integerAssumptionSchema("seat_visits"),
      scheduledClassesPerWeek: integerAssumptionSchema("classes"),
      weeksPerMonth: numberAssumptionSchema("weeks"),
    }).strict(),
    economics: z.object({
      averageRealisedRevenuePerPaidVisit: numberAssumptionSchema("SGD_per_paid_visit"),
      variableCostPerPaidVisit: numberAssumptionSchema("SGD_per_paid_visit"),
      instructorCostPerScheduledClass: numberAssumptionSchema("SGD_per_scheduled_class"),
      otherFixedMonthlyCosts: numberAssumptionSchema("SGD_per_month"),
      monthlyRent: z
        .object({
          low: z.number().nonnegative(),
          base: z.number().nonnegative(),
          high: z.number().nonnegative(),
          unit: z.literal("SGD_per_month"),
          provenance: provenanceSchema,
          ownerEditable: z.boolean(),
        })
        .strict()
        .refine((rent) => rent.low <= rent.base && rent.base <= rent.high, {
          message: "Rent must be ordered low <= base <= high",
        }),
      openingInvestmentExpected: numberAssumptionSchema("SGD"),
      openingInvestmentMaximum: numberAssumptionSchema("SGD"),
      minimumOperatingRunwayMonths: integerAssumptionSchema("months"),
    }).strict(),
    timing: z.object({
      investigationStart: isoDateAssumptionSchema,
      earliestOpeningMonths: integerAssumptionSchema("months_from_analysis"),
      latestOpeningMonths: integerAssumptionSchema("months_from_analysis"),
    }).strict(),
    decisionPolicy: z.object({
      allowedOutcomes: z.tuple([
        z.literal("investigate"),
        z.literal("wait"),
        z.literal("no_go"),
        z.literal("insufficient_evidence"),
      ]),
      maximumBaseBreakEvenUtilisation: ratioAssumptionSchema,
      maximumStressBreakEvenUtilisation: ratioAssumptionSchema,
      futureDependentOutcome: stringAssumptionSchema.extend({
        value: z.literal("wait"),
      }).strict(),
      missingDecisionCriticalEvidenceOutcome: stringAssumptionSchema.extend({
        value: z.literal("insufficient_evidence"),
      }).strict(),
    }).strict(),
  }).strict()
  .refine(
    (profile) =>
      profile.economics.openingInvestmentExpected.value <=
      profile.economics.openingInvestmentMaximum.value,
    {
      path: ["economics", "openingInvestmentExpected", "value"],
      message: "Expected opening investment cannot exceed the maximum",
    },
  )
  .refine(
    (profile) =>
      profile.timing.earliestOpeningMonths.value <=
      profile.timing.latestOpeningMonths.value,
    {
      path: ["timing", "earliestOpeningMonths", "value"],
      message: "Earliest opening month cannot exceed the latest",
    },
  )
  .refine(
    (profile) =>
      profile.decisionPolicy.maximumBaseBreakEvenUtilisation.value <=
      profile.decisionPolicy.maximumStressBreakEvenUtilisation.value,
    {
      path: ["decisionPolicy", "maximumBaseBreakEvenUtilisation", "value"],
      message: "Base utilisation threshold cannot exceed the stress threshold",
    },
  );

export type BusinessProfile = z.infer<typeof businessProfileSchema>;

export function parseBusinessProfile(input: unknown) {
  return businessProfileSchema.safeParse(input);
}
