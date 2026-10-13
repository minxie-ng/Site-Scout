import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';

it('starts with blank owner input before sampled research and keeps the Punggol study secondary', () => {
  const page = readFileSync('prototype/index.html', 'utf8');
  const positions = ['id="owner-intake"', 'id="priority-map"', 'id="owner-journey"',
    'id="scenario"', 'id="study-path"', 'id="research-progress"'].map(id => page.indexOf(id));
  expect(positions.every(position => position >= 0)).toBe(true);
  expect(positions).toEqual([...positions].sort((a, b) => a - b));
  expect(page).toContain('<a class="primary-action" href="#owner-intake">');
  expect(page).toContain('Owner-entered figures first');
  expect(page).toContain('OPTIONAL SYNTHETIC EXAMPLE');
  expect(page).not.toContain('class="profile-panel"');
  expect(page).toContain('name="businessFormat" type="text" placeholder="Group reformer Pilates" required');
  expect(page).not.toContain('name="businessFormat" type="text" value=');
});
