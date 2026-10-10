// Provider renderers consume one validation plan; deployment is a separate concern.
const runtimes = ['22.22.2', '22', '24', '26'];
export const checks = [
  { id: 'quality', runtimes, commands: ['npm run lint:css', 'npm run typecheck', 'npm test', 'npm run build'] },
  { id: 'browser', runtimes: ['26'], commands: ['npx playwright install --with-deps chromium', 'npm run test:e2e'] },
];
