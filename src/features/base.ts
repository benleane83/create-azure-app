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

## Getting Started

\`\`\`bash
# Install root dependencies
${pmInstall(packageManager)}

# Start local services (PostgreSQL via Docker) + install sub-projects
${pmRun(packageManager, 'setup')}

# Start development server
${pmRun(packageManager, 'dev')}

# Deploy to Azure
azd up
\`\`\`

## Project Structure

\`\`\`
├── .github/
│   └── workflows/
│       ├── deploy.yml      # Build + deploy (prod & preview)
│       └── provision.yml   # Azure infrastructure provisioning
├── src/
│   ├── web/          # Frontend application
│   └── api/          # Azure Functions API
├── db/
│   ├── migrations/   # Database migrations
│   └── schema.*      # ORM schema
├── infra/            # Bicep infrastructure
├── azure.yaml        # AZD manifest
└── docker-compose.yml
\`\`\`

## CI/CD

This project includes GitHub Actions workflows that mirror the Vercel deployment model:

- **Push to \`main\`** → deploys to your **production** Static Web App
- **Pull request** → deploys to a **preview environment** with a unique URL
- **PR closed** → automatically tears down the preview environment

### Setup

1. **Provision infrastructure** (one-time):
   \`\`\`bash
   azd up
   \`\`\`

2. **Get the SWA deployment token**:
   \`\`\`bash
   az staticwebapp secrets list --name <your-swa-name> --query "properties.apiKey" -o tsv
   \`\`\`

3. **Add repository secrets** in GitHub → Settings → Secrets and variables → Actions:
   | Secret | Description |
   |--------|-------------|
   | \`AZURE_STATIC_WEB_APPS_API_TOKEN\` | SWA deployment token from step 2 |
   | \`AZURE_CLIENT_ID\` | App registration client ID (for OIDC) |
   | \`AZURE_TENANT_ID\` | Entra ID tenant ID |
   | \`AZURE_SUBSCRIPTION_ID\` | Azure subscription ID |
   | \`AZURE_LOCATION\` | Azure region (e.g. \`eastus2\`) |

4. **Configure OIDC federated credentials** on your Entra app registration:
   - Subject: \`repo:<owner>/<repo>:environment:production\`
   - Issuer: \`https://token.actions.githubusercontent.com\`

Once configured, every push to \`main\` deploys automatically, and every PR gets its own preview URL.
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
