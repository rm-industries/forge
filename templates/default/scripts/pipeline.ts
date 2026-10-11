import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { siteWork, workOrder } from './ci/model.ts';

const arguments_ = process.argv.slice(2);
const target = arguments_.find((argument) => !argument.startsWith('--')) ?? 'quality';
if (arguments_.includes('--list')) {
  console.log(Object.keys(siteWork).join('\n'));
  process.exit(0);
}
const targets = target === 'quality' ? Object.keys(siteWork) : [target];
const order = workOrder(siteWork, targets);
const dryRun = arguments_.includes('--dry-run');
const cwd = fileURLToPath(new URL('../', import.meta.url));
const installed = new Set<string>();
for (const id of order) {
  const work = siteWork[id]!;
  console.log(`${id}: ${work.commands.join(' && ')}`);
  if (dryRun) continue;
  const browsers = work.browsers.filter((browser) => !installed.has(browser));
  if (browsers.length) {
    execFileSync('npm', ['exec', '--', 'playwright', 'install', '--with-deps', ...browsers], { cwd, stdio: 'inherit' });
    browsers.forEach((browser) => installed.add(browser));
  }
  for (const command of work.commands) execFileSync(command, { cwd, shell: true, stdio: 'inherit' });
}
