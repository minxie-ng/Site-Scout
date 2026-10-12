export type MemoInputs = { seats: number; classesPerWeek: number; priceSgd: number; rentSgd: number; utilisationPercent: number; openingMonths: number };
export type MemoCandidate = { id: string; name: string; blocks: string[]; sources: Array<{ block: string; oneMapUrl: string; oneMapRetrievedAt: string; hdbUrl: string; hdbRetrievedAt: string }>; sourceDates: { oneMap: string[]; hdb: string[] }; outcome: 'insufficient_evidence'; rank: null };
export type StudyMemo = { snapshotDate: string; profileStatus: 'synthetic_assumption'; decision: 'insufficient_evidence'; inputs: MemoInputs; monthlyOperatingSurplusSgd: number; economicCondition: string; candidates: MemoCandidate[]; nextInvestigation: string };
export function buildStudyMemo(feed: unknown, inputs: MemoInputs): StudyMemo;
