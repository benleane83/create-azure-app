import type { Feature, ComposedProject } from '../composer.js';
import type { PackageManager } from '../utils.js';
import { pmRun, pmInstall } from '../utils.js';

const GITIGNORE = `# Dependencies
node_modules/

# Build output
dist/
.next/
build/
.svelte-kit/

# Environment
.env
.env.local
.env.*.local
.env.docker

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Azure
.azure/
`;

/**
 * Build the root package.json content by merging deps/scripts from all composed features.
 */
export function buildRootPackageJson(
  projectName: string,
  composed: ComposedProject,
  packageManager: PackageManager
): string {
  const pkg = {
    name: projectName,
    version: '0.1.0',
    private: true,
    type: 'module' as const,
    scripts: {
      build: `${pmRun(packageManager, 'build:web')} && ${pmRun(packageManager, 'build:api')}`,
      ...composed.scripts,
    },
    dependencies: sortObject(composed.dependencies),
    devDependencies: sortObject(composed.devDependencies),
  };

  return JSON.stringify(pkg, null, 2) + '\n';
}

function sortObject(obj: Record<string, string>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(obj).sort(([a], [b]) => a.localeCompare(b))
  );
}

/**
 * The base feature provides root-level project files that every generated project gets.
 * The root package.json is NOT included here — it's generated separately via
 * buildRootPackageJson() after all features are composed, so it can merge all deps/scripts.
 */
export function baseFeature(projectName: string, packageManager: PackageManager): Feature {
  return {
    name: 'base',
    files: [
      {
        path: '.gitignore',
        content: GITIGNORE,
      },
      {
        path: 'README.md',
        content: `# ${projectName}

Built with [create-azure-app](https://github.com/bradygaster/create-azure-app).

## Quick Start (Local Development)

\`\`\`bash
# Install root dependencies
${pmInstall(packageManager)}

# Start local services (PostgreSQL via Docker) + install sub-projects
${pmRun(packageManager, 'setup')}

# Start development server
${pmRun(packageManager, 'dev')}
\`\`\`

## Deploy to Azure

### First-time setup

\`\`\`bash
# 1. Provision Azure infrastructure (SWA, PostgreSQL, Key Vault, etc.)
azd up

# 2. Push your code to GitHub
git remote add origin https://github.com/YOUR_USER/${projectName}.git
git push -u origin main

# 3. Configure OIDC credentials for GitHub Actions
azd pipeline config --provider github
\`\`\`

\`azd pipeline config\` creates a service principal with federated credentials and
stores \`AZURE_CLIENT_ID\`, \`AZURE_TENANT_ID\`, \`AZURE_SUBSCRIPTION_ID\`,
\`AZURE_ENV_NAME\`, and \`AZURE_LOCATION\` as GitHub **repository variables**
automatically — no manual setup needed.

### After setup

Every push to \`main\` triggers the **Deploy** workflow automatically. That's it.

To re-provision infrastructure (e.g., after changing Bicep files), run the
**Provision** workflow manually from the Actions tab.

## CI/CD Workflows

| Workflow | Trigger | What it does |
|----------|---------|--------------|
| **deploy.yml** | Push to \`main\`, PR open/sync | Builds the app, deploys to Azure Static Web Apps |
| **deploy.yml** | PR closed | Tears down preview environment |
| **provision.yml** | Manual (\`workflow_dispatch\`) | Runs \`azd provision\` to create/update infrastructure |

- **Push to \`main\`** → deploys to your **production** Static Web App
- **Pull request** → deploys to a **preview environment** with a unique URL
- **PR closed** → automatically tears down the preview environment

The deploy workflow uses OIDC to authenticate with Azure and fetches the SWA
deployment token dynamically — no static secrets to manage.

## Project Structure

\`\`\`
├── .github/workflows/
│   ├── deploy.yml        # Build + deploy (prod & preview)
│   └── provision.yml     # Azure infra provisioning (manual)
├── src/
│   ├── web/              # Frontend application
│   └── api/              # Azure Functions API
├── db/
│   ├── migrations/       # Database migrations
│   └── schema.*          # ORM schema
├── infra/                # Bicep infrastructure modules
├── azure.yaml            # AZD manifest
└── docker-compose.yml    # Local PostgreSQL
\`\`\`
`,
      },
      {
        path: 'tsconfig.json',
        content: JSON.stringify(
          {
            compilerOptions: {
              target: 'ES2022',
              module: 'Node16',
              moduleResolution: 'Node16',
              strict: true,
              esModuleInterop: true,
              skipLibCheck: true,
              forceConsistentCasingInFileNames: true,
              resolveJsonModule: true,
            },
            references: [
              { path: './src/web' },
              { path: './src/api' },
            ],
            files: [],
          },
          null,
          2
        ) + '\n',
      },
    ],
    dependencies: {},
    devDependencies: {},
    scripts: {},
  };
}
