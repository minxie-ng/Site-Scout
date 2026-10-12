import { buildReviewedInvestigationShortlist, compareHypotheticalAreaResearchOrder } from "./shortlist";

type NumericRange = { min: number; max: number };
type FactorRange = {
  clusterId: string;
  evidenceKind: string;
  assumedWalkingMinutes: NumericRange;
  assumedNearbyCompetitors: NumericRange;
};
type RangeScenario = {
  evidenceKind: string;
  factors: readonly FactorRange[];
  maxAssumedWalkingMinutes: NumericRange;
  maxAssumedNearbyCompetitors: NumericRange;
};

function endpoints(range: NumericRange, integer: boolean) {
  if (!range || !Number.isFinite(range.min) || !Number.isFinite(range.max) ||
      range.min < 0 || range.max < range.min ||
      (integer && (!Number.isSafeInteger(range.min) || !Number.isSafeInteger(range.max)))) {
    throw new Error("Invalid hypothetical range minimum or maximum");
  }
  return range.min === range.max ? [range.min] : [range.min, range.max];
}

/** Enumerate the 3-cluster scenario endpoints only; these are assumptions, not evidence. */
export function assessHypotheticalAreaRange(
  input: Parameters<typeof buildReviewedInvestigationShortlist>[0],
  scenario: RangeScenario,
) {
  const shortlist = buildReviewedInvestigationShortlist(input);
  const clusterIds: string[] = shortlist.candidates.map(candidate => candidate.id);
  if (scenario.evidenceKind !== "synthetic_assumption" ||
      scenario.factors.some(factor => factor.evidenceKind !== "synthetic_assumption")) {
    throw new Error("Only explicitly synthetic ranges are supported");
  }
  if (scenario.factors.length !== clusterIds.length ||
      new Set(scenario.factors.map(factor => factor.clusterId)).size !== clusterIds.length ||
      scenario.factors.some(factor => !clusterIds.includes(factor.clusterId))) {
    throw new Error("A complete, unique factor range is required for each cluster");
  }
  const orderedFactors = clusterIds.map(id => scenario.factors.find(factor => factor.clusterId === id)!);
  const dimensions = [
    endpoints(scenario.maxAssumedWalkingMinutes, false),
    endpoints(scenario.maxAssumedNearbyCompetitors, true),
    ...orderedFactors.flatMap(factor => [
      endpoints(factor.assumedWalkingMinutes, false),
      endpoints(factor.assumedNearbyCompetitors, true),
    ]),
  ];
  let combinations: number[][] = [[]];
  for (const values of dimensions) {
    combinations = combinations.flatMap(prefix => values.map(value => [...prefix, value]));
    if (combinations.length > 256) throw new Error("Hypothetical range exceeds the 256-scenario bound");
  }
  const outcomes = new Set<string | null>();
  const witnesses = new Map<string | null, {
    selectedClusterId: string | null;
    assumptions: {
      maxAssumedWalkingMinutes: number;
      maxAssumedNearbyCompetitors: number;
      factors: { clusterId: string; assumedWalkingMinutes: number; assumedNearbyCompetitors: number }[];
    };
    candidateTrace: ReturnType<typeof compareHypotheticalAreaResearchOrder>["candidateTrace"];
  }>();
  for (const values of combinations) {
    const factors = orderedFactors.map((factor, index) => ({
      clusterId: factor.clusterId,
      evidenceKind: "synthetic_assumption" as const,
      assumedWalkingMinutes: values[2 + index * 2]!,
      assumedNearbyCompetitors: values[3 + index * 2]!,
    }));
    const result = compareHypotheticalAreaResearchOrder(input, {
      evidenceKind: "synthetic_assumption",
      factors,
      maxAssumedWalkingMinutes: values[0]!,
      maxAssumedNearbyCompetitors: values[1]!,
    });
    outcomes.add(result.selectedClusterId);
    if (!witnesses.has(result.selectedClusterId)) {
      witnesses.set(result.selectedClusterId, {
        selectedClusterId: result.selectedClusterId,
        assumptions: {
          maxAssumedWalkingMinutes: values[0]!,
          maxAssumedNearbyCompetitors: values[1]!,
          factors: factors.map(({ clusterId, assumedWalkingMinutes, assumedNearbyCompetitors }) =>
            ({ clusterId, assumedWalkingMinutes, assumedNearbyCompetitors })),
        },
        candidateTrace: result.candidateTrace,
      });
    }
  }
  const possibleLeadIds = clusterIds.filter(id => outcomes.has(id));
  const includesNoLead = outcomes.has(null);
  return {
    evidenceKind: "synthetic_assumption" as const,
    status: includesNoLead ? "no_unique_lead_across_range" as const
      : possibleLeadIds.length === 1 ? "stable_hypothetical_lead" as const
      : "lead_changes_across_range" as const,
    possibleLeadIds,
    includesNoLead,
    scenarioCount: combinations.length,
    witnesses: [...witnesses.values()],
    siteOutcome: "insufficient_evidence" as const,
  };
}
