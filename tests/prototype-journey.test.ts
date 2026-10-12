import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, it } from 'vitest';

it('offers a clear replay study path without pretending to run live agents', () => {
  const page = readFileSync(resolve('prototype/index.html'), 'utf8');
  expect(page).toContain('href="#scenario"');
  expect(page).toContain('id="comparison"');
  expect(page).toContain('id="scenario"');
  expect(page).toContain('id="scenario-form"');
  expect(page).toContain('id="scenario-result"');
  expect(page).toContain('Synthetic studio profile');
  expect(page).toContain('Research gaps');
  expect(page).toContain('Dated replay');
  expect(page).not.toMatch(/agents working|live analysis in progress/i);
});
