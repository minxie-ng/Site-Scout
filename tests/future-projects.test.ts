import { describe, expect, it } from "vitest";
import { reconcileSyntheticProjectMilestones } from "../src/domain/future-projects";

const base = {
  recordId: "source-a",
  canonicalProjectId: "hdb:punggol-point-cove:phase-2",
  projectName: "Punggol Point Cove",
  phase: "2",
  planningArea: "Punggol",
  milestone: "land_sale" as const,
  month: "2024-02",
  provenance: "synthetic_fixture_only" as const,
  linkedClusterIds: [] as string[],
};

describe("Gate 3 future-project identity boundary", () => {
  it("counts one project across distinct milestones without treating land sale as completion or occupancy", () => {
    const result = reconcileSyntheticProjectMilestones([
      base,
      { ...base, recordId: "source-b", milestone: "projected_completion", month: "2027-05" },
      { ...base, recordId: "source-c", milestone: "occupancy_start", month: "2027-11" },
    ]);
    expect(result).toEqual({
      basis: "synthetic_fixture_only",
      projects: [{
        canonicalProjectId: base.canonicalProjectId,
        projectName: base.projectName,
        phase: "2",
        planningArea: "Punggol",
        linkedClusterIds: [],
        milestones: [
          { recordId: "source-a", milestone: "land_sale", month: "2024-02" },
          { recordId: "source-b", milestone: "projected_completion", month: "2027-05" },
          { recordId: "source-c", milestone: "occupancy_start", month: "2027-11" },
        ],
      }],
    });
    expect(reconcileSyntheticProjectMilestones([
      { ...base, recordId: "source-c", milestone: "occupancy_start", month: "2027-11" },
      base,
      { ...base, recordId: "source-b", milestone: "projected_completion", month: "2027-05" },
    ])).toEqual(result);
  });

  it("rejects duplicate projected-completion records for one project even with different record IDs", () => {
    const events = [
      { ...base, milestone: "projected_completion", month: "2027-05" },
      { ...base, recordId: "other-publisher", milestone: "projected_completion", month: "2027-06" },
    ];
    expect(() => reconcileSyntheticProjectMilestones(events)).toThrow(/duplicate.*milestone/i);
  });

  it("rejects conflicting canonical identities and same-project aliases", () => {
    expect(() => reconcileSyntheticProjectMilestones([
      base,
      { ...base, recordId: "source-b", projectName: "Different Project", milestone: "projected_completion" },
    ])).toThrow(/identity|conflict/i);
    expect(() => reconcileSyntheticProjectMilestones([
      base,
      { ...base, recordId: "source-b", canonicalProjectId: "hdb:alternate-id", milestone: "projected_completion" },
    ])).toThrow(/alias|identity|duplicate/i);
  });

  it("keeps distinct phases separate and rejects cluster joins or observed claims", () => {
    const phase1 = { ...base, recordId: "phase-1", canonicalProjectId: "hdb:punggol-point-cove:phase-1", phase: "1" };
    expect(reconcileSyntheticProjectMilestones([base, phase1]).projects).toHaveLength(2);
    expect(() => reconcileSyntheticProjectMilestones([{ ...base, linkedClusterIds: ["cluster-a"] }])).toThrow(/cluster/i);
    expect(() => reconcileSyntheticProjectMilestones([{ ...base, provenance: "observed" as never }])).toThrow(/synthetic/i);
  });

  it("rejects invalid months, repeated record IDs, and sparse event arrays", () => {
    expect(() => reconcileSyntheticProjectMilestones([{ ...base, month: "2027-13" }])).toThrow(/month/i);
    expect(() => reconcileSyntheticProjectMilestones([base, { ...base, milestone: "occupancy_start" }])).toThrow(/record id/i);
    const sparse = new Array(2);
    sparse[1] = base;
    expect(() => reconcileSyntheticProjectMilestones(sparse)).toThrow(/missing|sparse/i);
  });

  it("rejects formatting variants that would make project display identity depend on event order", () => {
    expect(() => reconcileSyntheticProjectMilestones([
      base,
      { ...base, recordId: "source-b", projectName: "punggol point cove", milestone: "projected_completion" },
    ])).toThrow(/identity|conflict/i);
  });

  it("does not alias distinct identity fields containing delimiter characters", () => {
    const result = reconcileSyntheticProjectMilestones([
      { ...base, projectName: "A|B", phase: "C", canonicalProjectId: "hdb:one" },
      { ...base, recordId: "source-b", projectName: "A", phase: "B|C", canonicalProjectId: "hdb:two" },
    ]);
    expect(result.projects).toHaveLength(2);
  });

  it("sorts project IDs by code point rather than locale collation", () => {
    const result = reconcileSyntheticProjectMilestones([
      { ...base, canonicalProjectId: "hdb:a", projectName: "A" },
      { ...base, recordId: "source-b", canonicalProjectId: "hdb:B", projectName: "B" },
    ]);
    expect(result.projects.map(project => project.canonicalProjectId)).toEqual(["hdb:B", "hdb:a"]);
  });
});
