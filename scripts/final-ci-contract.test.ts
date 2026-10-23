import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

import { expect, test } from 'vitest';
import { parse } from 'yaml';

const read = (name: string) =>
  parse(readFileSync(new URL(`../.github/workflows/${name}.yml`, import.meta.url), 'utf8'));

test('all selective validation lanes offer weekly and manual broad verification', () => {
  for (const name of ['project', 'generator', 'website', 'browser-oxfmt']) {
    const workflow = read(name);
    expect(workflow.on).toHaveProperty('workflow_dispatch');
    expect(workflow.on.schedule).toHaveLength(1);
    expect(workflow.on.pull_request ?? {}).not.toHaveProperty('paths');
  }
});

test('website required summary permits only intentional skips and rejects failures', () => {
  const workflow = read('website');
  const summary = workflow.jobs.validation;
  expect(summary).toBeDefined();
  expect(summary.if).toBe('always()');
  expect([...summary.needs].sort()).toEqual(
    Object.keys(workflow.jobs)
      .filter((id) => id !== 'validation')
      .sort(),
  );
  const command = summary.steps[0].run.match(/node -e '(.*)'/)[1];
  const result = (selected: string, event: string, overrides: Record<string, string> = {}) => {
    const deployed = selected === 'true' && event === 'push';
    const needs = Object.fromEntries(
      summary.needs.map((id: string) => [
        id,
        {
          result:
            id === 'impact'
              ? 'success'
              : ['deploy', 'smoke-deployed'].includes(id)
                ? deployed
                  ? 'success'
                  : 'skipped'
                : selected === 'true'
                  ? 'success'
                  : 'skipped',
        },
      ]),
    );
    for (const [id, status] of Object.entries(overrides)) needs[id] = { result: status };
    return spawnSync(process.execPath, ['-e', command], {
      env: {
        ...process.env,
        NEEDS: JSON.stringify(needs),
        SELECTED: selected,
        FULL_BROWSERS: 'true',
        EVENT: event,
        REF: 'refs/heads/main',
      },
    }).status;
  };
  for (const event of ['pull_request', 'push', 'schedule', 'workflow_dispatch']) {
    for (const selected of ['true', 'false']) expect(result(selected, event)).toBe(0);
    expect(result('true', event, { build: 'failure' })).toBe(1);
    expect(result('true', event, { 'browser-tests': 'cancelled' })).toBe(1);
    expect(result('true', event, { lighthouse: 'skipped' })).toBe(1);
    expect(result('false', event, { impact: 'failure' })).toBe(1);
    expect(result('', event)).toBe(1);
  }
  expect(result('false', 'pull_request', { build: 'success' })).toBe(1);
  expect(result('true', 'push', { deploy: 'skipped' })).toBe(1);
  expect(result('true', 'push', { 'smoke-deployed': 'failure' })).toBe(1);
});
