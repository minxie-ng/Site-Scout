export type ResearchFactor = {
  id: string;
  title: string;
  status: "research_only";
  summary: string;
  blocker: string;
  scope: string;
  sourceName: string;
  sourceUrl: string;
  retrievedOn: string;
  linkedClusterIds: string[];
};

export function factorCards(factors: ResearchFactor[]): string;
