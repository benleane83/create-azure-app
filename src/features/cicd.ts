import type { Feature } from '../composer.js';
import type { PackageManager } from '../utils.js';
import type { Framework } from '../index.js';

interface CicdOptions {
  projectName: string;
  framework: Framework;
  packageManager: PackageManager;
  orm?: 'prisma' | 'drizzle';
  includeDatabase?: boolean;
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
  const isDrizzle = config.includeDatabase && config.orm === 'drizzle';

  const installCmd =
    config.packageManager === 'yarn' ? 'yarn install --frozen-lockfile'
    : config.packageManager === 'pnpm' ? 'pnpm install --frozen-lockfile'
    : 'npm ci';

  const installSubdirs = isDrizzle
    ? (config.packageManager === 'yarn' ? 'yarn install:web' : `${config.packageManager} run install:web`)
    : (config.packageManager === 'yarn' ? 'yarn install:web && yarn install:api'
      : `${config.packageManager} run install:web && ${config.packageManager} run install:api`);

  const buildCmd = isDrizzle
    ? (config.packageManager === 'yarn' ? 'yarn build:web' : `${config.packageManager} run build:web`)
    : (config.packageManager === 'yarn' ? 'yarn build' : `${config.packageManager} run build`);

  const appLocation = config.framework === 'nextjs' ? 'src/web/out'
    : config.framework === 'vite-react' ? 'src/web/dist'
    : 'src/web/build';

  return `name: Deploy

on:
  push:
    branches: [main]
  pull_request:
    types: [opened, synchronize, reopened, closed]

permissions:
  id-token: write
  contents: read
  pull-requests: write

jobs:
  build-and-deploy:
    if: github.event_name == 'push' || (github.event_name == 'pull_request' && github.event.action != 'closed')
    runs-on: ubuntu-latest
    name: Build and Deploy
    steps:
      - uses: actions/checkout@v4

      - name: Log in to Azure
        uses: azure/login@v2
        with:
          client-id: \${{ vars.AZURE_CLIENT_ID }}
          tenant-id: \${{ vars.AZURE_TENANT_ID }}
          subscription-id: \${{ vars.AZURE_SUBSCRIPTION_ID }}

      - name: Get SWA deployment token
        id: swa-token
        run: |
          SWA_NAME=$(az staticwebapp list --resource-group rg-\${{ vars.AZURE_ENV_NAME || '${config.projectName}' }} --query "[0].name" -o tsv)
          TOKEN=$(az staticwebapp secrets list --name "$SWA_NAME" --query "properties.apiKey" -o tsv)
          echo "::add-mask::$TOKEN"
          echo "token=$TOKEN" >> "$GITHUB_OUTPUT"

      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: |
          ${installCmd}
          ${installSubdirs}

      - name: Build
        run: ${buildCmd}

      - name: Deploy to Azure Static Web Apps
        uses: Azure/static-web-apps-deploy@v1
        with:
          azure_static_web_apps_api_token: \${{ steps.swa-token.outputs.token }}
          repo_token: \${{ secrets.GITHUB_TOKEN }}
          action: upload
          app_location: ${appLocation}
          api_location: src/api
          skip_app_build: true
${isDrizzle ? '' : '          skip_api_build: true\n'}
  close-preview:
    if: github.event_name == 'pull_request' && github.event.action == 'closed'
    runs-on: ubuntu-latest
    name: Close Preview Environment
    steps:
      - name: Log in to Azure
        uses: azure/login@v2
        with:
          client-id: \${{ vars.AZURE_CLIENT_ID }}
          tenant-id: \${{ vars.AZURE_TENANT_ID }}
          subscription-id: \${{ vars.AZURE_SUBSCRIPTION_ID }}

      - name: Get SWA deployment token
        id: swa-token
        run: |
          SWA_NAME=$(az staticwebapp list --resource-group rg-\${{ vars.AZURE_ENV_NAME || '${config.projectName}' }} --query "[0].name" -o tsv)
          TOKEN=$(az staticwebapp secrets list --name "$SWA_NAME" --query "properties.apiKey" -o tsv)
          echo "::add-mask::$TOKEN"
          echo "token=$TOKEN" >> "$GITHUB_OUTPUT"

      - name: Close preview
        uses: Azure/static-web-apps-deploy@v1
        with:
          azure_static_web_apps_api_token: \${{ steps.swa-token.outputs.token }}
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
    inputs:
      environment:
        description: 'Azure environment name'
        required: false
        default: '${config.projectName}'

permissions:
  id-token: write
  contents: read

jobs:
  provision:
    runs-on: ubuntu-latest
    name: Provision Azure Resources
    steps:
      - uses: actions/checkout@v4

      - name: Log in to Azure
        uses: azure/login@v2
        with:
          client-id: \${{ vars.AZURE_CLIENT_ID }}
          tenant-id: \${{ vars.AZURE_TENANT_ID }}
          subscription-id: \${{ vars.AZURE_SUBSCRIPTION_ID }}

      - name: Install azd
        uses: Azure/setup-azd@v2

      - name: Provision infrastructure
        run: azd provision --no-prompt
        env:
          AZURE_ENV_NAME: \${{ inputs.environment || '${config.projectName}' }}
          AZURE_LOCATION: \${{ vars.AZURE_LOCATION }}
          AZURE_SUBSCRIPTION_ID: \${{ vars.AZURE_SUBSCRIPTION_ID }}
`;
}
