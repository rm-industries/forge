import type { ActionResolver } from './github.ts';
import type { GithubJob } from './schema.ts';

// Provider-specific security, automation, and Pages behavior stays explicit.
export function createGithubExtras(
  pins: ActionResolver,
): Record<'pages' | 'security' | 'automation', Record<string, GithubJob>> {
  return {
    pages: {
      deploy: {
        name: 'Deploy GitHub Pages',
        needs: ['project'],
        if: "github.event_name == 'push' && github.ref == 'refs/heads/main'",
        'runs-on': 'ubuntu-latest',
        permissions: {
          pages: 'write',
          'id-token': 'write',
        },
        environment: {
          name: 'github-pages',
          url: '${{ steps.deployment.outputs.page_url }}',
        },
        outputs: {
          'page-url': '${{ steps.deployment.outputs.page_url }}',
        },
        steps: [
          {
            name: 'Deploy GitHub Pages',
            id: 'deployment',
            uses: pins('actions/deploy-pages').ref,
          },
        ],
      },
      'smoke-deployed': {
        name: 'Verify deployed website',
        needs: ['deploy'],
        if: "github.event_name == 'push' && github.ref == 'refs/heads/main'",
        'runs-on': 'ubuntu-latest',
        permissions: {
          contents: 'read',
        },
        steps: [
          {
            name: 'Install Chromium',
            run: 'npx playwright install --with-deps chromium',
          },
          {
            name: 'Verify deployed routes, assets, and mobile layout',
            env: {
              DEPLOYMENT_URL: '${{ needs.deploy.outputs.page-url }}',
            },
            run: 'npm run test:smoke',
          },
          {
            name: 'Upload deployed smoke failure evidence',
            if: 'failure()',
            uses: pins('actions/upload-artifact').ref,
            with: {
              name: 'deployed-smoke-results',
              path: 'playwright-report\ntest-results\n',
              'if-no-files-found': 'ignore',
              'retention-days': 7,
            },
          },
        ],
      },
    },
    security: {
      'code-analysis': {
        name: 'Analyze (${{ matrix.language }})',
        'runs-on': 'ubuntu-latest',
        permissions: {
          actions: 'read',
          contents: 'read',
          'security-events': 'write',
        },
        strategy: {
          'fail-fast': false,
          matrix: {
            language: ['actions', 'javascript-typescript'],
          },
        },
        steps: [
          {
            name: 'Checkout repository',
            uses: pins('actions/checkout').ref,
            with: {
              'persist-credentials': false,
            },
          },
          {
            name: 'Initialize CodeQL',
            uses: pins('github/codeql-action/init').ref,
            with: {
              'build-mode': 'none',
              languages: '${{ matrix.language }}',
              queries: 'security-extended,security-and-quality',
            },
          },
          {
            name: 'Perform CodeQL analysis',
            uses: pins('github/codeql-action/analyze').ref,
          },
        ],
      },
      'dependency-review': {
        name: 'Review dependencies',
        if: "github.event_name == 'pull_request'",
        'runs-on': 'ubuntu-latest',
        permissions: {
          contents: 'read',
        },
        steps: [
          {
            name: 'Checkout repository',
            uses: pins('actions/checkout').ref,
            with: {
              'persist-credentials': false,
            },
          },
          {
            name: 'Review dependency changes',
            'continue-on-error': true,
            uses: pins('actions/dependency-review-action').ref,
            with: {
              'fail-on-severity': 'high',
            },
          },
        ],
      },
    },
    automation: {
      security: {
        name: 'Workflow security',
        'runs-on': 'ubuntu-latest',
        permissions: {
          contents: 'read',
          'security-events': 'write',
        },
        steps: [
          {
            name: 'Checkout repository',
            uses: pins('actions/checkout').ref,
            with: {
              'persist-credentials': false,
            },
          },
          {
            name: 'Scan workflows',
            uses: pins('zizmorcore/zizmor-action').ref,
            with: {
              'advanced-security': true,
              collect: 'all',
            },
          },
        ],
      },
      syntax: {
        name: 'Workflow syntax',
        'runs-on': 'ubuntu-latest',
        permissions: {
          contents: 'read',
        },
        steps: [
          {
            name: 'Checkout repository',
            uses: pins('actions/checkout').ref,
            with: {
              'persist-credentials': false,
            },
          },
          {
            name: 'Validate workflows',
            uses: pins('raven-actions/actionlint').ref,
          },
        ],
      },
    },
  };
}
