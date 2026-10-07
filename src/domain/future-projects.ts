type Milestone = "land_sale" | "projected_completion" | "occupancy_start";

interface SyntheticEvent {
  recordId: string;
  canonicalProjectId: string;
  projectName: string;
  phase: string;
  planningArea: string;
  milestone: Milestone;
  month: string;
  provenance: "synthetic_fixture_only";
  linkedClusterIds: [];
}

interface ReconciledProject {
  canonicalProjectId: string;
  projectName: string;
  phase: string;
  planningArea: string;
  linkedClusterIds: [];
  milestones: Array<Pick<SyntheticEvent, "recordId" | "milestone" | "month">>;
}

const milestoneOrder: Milestone[] = ["land_sale", "projected_completion", "occupancy_start"];
const identityPart = (value: string) => value.trim().replace(/\s+/g, " ").toLowerCase();

function nonempty(value: unknown, name: string): string {
  if (typeof value !== "string" || value.trim() !== value || !value) {
    throw new Error(`Invalid ${name}`);
  }
  return value;
}

function parseEvent(raw: unknown): SyntheticEvent {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("Invalid event");
  const event = raw as Record<string, unknown>;
  const recordId = nonempty(event.recordId, "record id");
  const canonicalProjectId = nonempty(event.canonicalProjectId, "canonical project id");
  const projectName = nonempty(event.projectName, "project name");
  const phase = nonempty(event.phase, "phase");
  const planningArea = nonempty(event.planningArea, "planning area");
  if (!milestoneOrder.includes(event.milestone as Milestone)) throw new Error("Invalid milestone");
  const month = nonempty(event.month, "month");
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new Error("Invalid month");
  if (event.provenance !== "synthetic_fixture_only") throw new Error("Only synthetic events are admitted");
  if (!Array.isArray(event.linkedClusterIds) || event.linkedClusterIds.length !== 0) {
    throw new Error("Synthetic project cannot join a cluster");
  }
  return { recordId, canonicalProjectId, projectName, phase, planningArea,
    milestone: event.milestone as Milestone, month, provenance: "synthetic_fixture_only", linkedClusterIds: [] };
}

export function reconcileSyntheticProjectMilestones(input: unknown): {
  basis: "synthetic_fixture_only";
  projects: ReconciledProject[];
} {
  if (!Array.isArray(input) || input.length === 0) throw new Error("Missing events");
  const projects = new Map<string, ReconciledProject>();
  const aliases = new Map<string, string>();
  const recordIds = new Set<string>();
  for (let index = 0; index < input.length; index++) {
    if (!(index in input)) throw new Error("Sparse event array has a missing item");
    const event = parseEvent(input[index]);
    if (recordIds.has(event.recordId)) throw new Error("Duplicate record id");
    recordIds.add(event.recordId);
    const identity = JSON.stringify([event.projectName, event.phase, event.planningArea].map(identityPart));
    const alias = aliases.get(identity);
    if (alias && alias !== event.canonicalProjectId) throw new Error("Project identity alias conflict");
    aliases.set(identity, event.canonicalProjectId);
    let project = projects.get(event.canonicalProjectId);
    if (project) {
      if (project.projectName !== event.projectName || project.phase !== event.phase ||
        project.planningArea !== event.planningArea) throw new Error("Canonical project identity conflict");
      if (project.milestones.some(item => item.milestone === event.milestone)) {
        throw new Error("Duplicate project milestone");
      }
    } else {
      project = { canonicalProjectId: event.canonicalProjectId, projectName: event.projectName,
        phase: event.phase, planningArea: event.planningArea, linkedClusterIds: [], milestones: [] };
      projects.set(event.canonicalProjectId, project);
    }
    project.milestones.push({ recordId: event.recordId, milestone: event.milestone, month: event.month });
  }
  return {
    basis: "synthetic_fixture_only",
    projects: [...projects.values()].sort((a, b) => a.canonicalProjectId < b.canonicalProjectId ? -1 : a.canonicalProjectId > b.canonicalProjectId ? 1 : 0)
      .map(project => ({ ...project, milestones: project.milestones.sort((a, b) =>
        milestoneOrder.indexOf(a.milestone) - milestoneOrder.indexOf(b.milestone)) })),
  };
}
