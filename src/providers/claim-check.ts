export type ClaimCheckInput = {
  claim: string;
  quote: string;
  passage: string;
};

export type ClaimVerdict = 'supported' | 'contradicted' | 'not_established' | 'review';

export type ClaimCheckResult = {
  verdict: ClaimVerdict;
  provider: 'typesafe_jev' | 'openrouter_jev' | 'deterministic';
  model?: string;
  confidence?: number;
  suggestion?: Exclude<ClaimVerdict, 'review'>;
  reason?: string;
};

export interface ClaimCheckProvider {
  check(input: ClaimCheckInput): Promise<ClaimCheckResult>;
}

function normalized(text: string): string {
  return text.replace(/\s+/g, ' ').trim().toLowerCase();
}

function numericTokens(text: string): string[] {
  return (text.match(/\b\d[\d,]*(?:\.\d+)?\b/g) ?? []).map((value) => value.replaceAll(',', ''));
}

function hasInvalidIsoDate(text: string): boolean {
  for (const match of text.matchAll(/\b(\d{4})-(\d{2})-(\d{2})\b/g)) {
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
    if (month < 1 || month > 12 || day < 1 || day > lastDay) return true;
  }
  return false;
}

export function precheckClaim(input: ClaimCheckInput): ClaimCheckResult | null {
  if (!input.claim.trim() || !input.quote.trim() || !input.passage.trim()) {
    return { verdict: 'review', provider: 'deterministic', reason: 'empty_input' };
  }
  if (input.claim.length > 1000 || input.quote.length > 2000 || input.passage.length > 12000) {
    return { verdict: 'review', provider: 'deterministic', reason: 'input_too_large' };
  }
  if (!normalized(input.passage).includes(normalized(input.quote))) {
    return { verdict: 'not_established', provider: 'deterministic', reason: 'quote_not_found' };
  }
  if (hasInvalidIsoDate(input.claim) || hasInvalidIsoDate(input.quote) || hasInvalidIsoDate(input.passage)) {
    return { verdict: 'not_established', provider: 'deterministic', reason: 'invalid_date' };
  }
  const passageNumbers = new Set(numericTokens(input.passage));
  if (numericTokens(input.claim).some((number) => !passageNumbers.has(number))) {
    return { verdict: 'not_established', provider: 'deterministic', reason: 'number_not_found' };
  }
  return null;
}
