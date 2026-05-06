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
  composed: ComposedProject
): string {
  const pkg = {
    name: projectName,
    version: '0.1.0',
    private: true,
    type: 'module' as const,
    scripts: {
      dev: 'echo "TODO: wire up swa-cli dev"',
      build: 'echo "TODO: build all workspaces"',
      setup: 'docker compose up -d && echo "TODO: run migrations + seed"',
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
