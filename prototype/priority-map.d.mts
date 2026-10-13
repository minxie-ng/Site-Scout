export type PriorityMapView = { overview: string; local: string; choices: string; detail: string; coverage: string };
export function validatePriorityMapFeed(feed: unknown): any;
export function verifyPriorityMapFeed(rawText: string): Promise<any>;
export function isVerifiedPriorityMapFeed(feed: unknown): boolean;
export function priorityMapView(feed: unknown, selected: number): PriorityMapView;
export function mountPriorityMap(root: unknown, feed: unknown, onSelect?: (selected: number) => void): void;
