import type { Feature } from '../composer.js';

type Framework = 'nextjs' | 'vite-react' | 'sveltekit';
type PackageManager = 'npm' | 'pnpm' | 'yarn';

interface CicdOptions {
  projectName: string;
  framework: Framework;
  packageManager: PackageManager;
}

export function cicdFeature(config: CicdOptions): Feature {
  return {
    name: 'cicd',
    files: [
      {
        path: '.github/workflows/deploy.yml',
        content: deployWorkflow(config),
      },
      {
        path: '.github/workflows/provision.yml',
        content: provisionWorkflow(config),
      },
    ],
    dependencies: {},
    devDependencies: {},
    scripts: {},
  };
}

// ---------------------------------------------------------------------------
// Deploy workflow — prod on push to main, preview on PR
// ---------------------------------------------------------------------------

function deployWorkflow(config: CicdOptions): string {
  const outputLocation =
    config.framework === 'nextjs' ? 'out'
    : config.framework === 'vite-react' ? 'dist'
    : 'build';

  const installCmd =
    config.packageManager === 'yarn' ? 'yarn install --frozen-lockfile'
    : config.packageManager === 'pnpm' ? 'pnpm install --frozen-lockfile'
    : 'npm ci';

  const buildCmd =
    config.packageManager === 'yarn' ? 'yarn build'
    : `${config.packageManager} run build`;

  return `name: Deploy

on:
  push:
    branches: [main]
  pull_request:
    types: [opened, synchronize, reopened, closed]

permissions:
  contents: read
  pull-requests: write

jobs:
  build-and-deploy:
    if: github.event_name == 'push' || (github.event_name == 'pull_request' && github.event.action != 'closed')
    runs-on: ubuntu-latest
    name: Build and Deploy
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: ${installCmd}

      - name: Build
        run: ${buildCmd}

      - name: Deploy to Azure Static Web Apps
        uses: Azure/static-web-apps-deploy@v1
        with:
          azure_static_web_apps_api_token: \${{ secrets.AZURE_STATIC_WEB_APPS_API_TOKEN }}
          repo_token: \${{ secrets.GITHUB_TOKEN }}
          action: upload
          app_location: src/web
          api_location: src/api
          output_location: ${outputLocation}
          skip_app_build: true
          skip_api_build: true

  close-preview:
    if: github.event_name == 'pull_request' && github.event.action == 'closed'
    runs-on: ubuntu-latest
    name: Close Preview Environment
    steps:
      - name: Close preview
        uses: Azure/static-web-apps-deploy@v1
        with:
          azure_static_web_apps_api_token: \${{ secrets.AZURE_STATIC_WEB_APPS_API_TOKEN }}
          action: close
`;
}

// ---------------------------------------------------------------------------
// Provision workflow — infrastructure via azd
// ---------------------------------------------------------------------------

function provisionWorkflow(config: CicdOptions): string {
  return `name: Provision Infrastructure

on:
  workflow_dispatch:
  push:
    branches: [main]
    paths:
      - 'infra/**'
      - 'azure.yaml'

permissions:
  id-token: write
  contents: read

jobs:
  provision:
    runs-on: ubuntu-latest
    name: Provision Azure Resources
    environment: production
    steps:
      - uses: actions/checkout@v4

      - name: Log in to Azure
        uses: azure/login@v2
        with:
          client-id: \${{ secrets.AZURE_CLIENT_ID }}
          tenant-id: \${{ secrets.AZURE_TENANT_ID }}
          subscription-id: \${{ secrets.AZURE_SUBSCRIPTION_ID }}

      - name: Install azd
        uses: Azure/setup-azd@v2

      - name: Provision infrastructure
        run: azd provision --no-prompt
        env:
          AZURE_ENV_NAME: ${config.projectName}
          AZURE_LOCATION: \${{ secrets.AZURE_LOCATION }}
          AZURE_SUBSCRIPTION_ID: \${{ secrets.AZURE_SUBSCRIPTION_ID }}
`;
}
