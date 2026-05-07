import type { Feature } from '../composer.js';
import type { PackageManager } from '../utils.js';
import { pmRun, pmInstall } from '../utils.js';

interface EnvConfigOptions {
  projectName: string;
  orm: 'prisma' | 'drizzle';
  includeAuth: boolean;
  packageManager: PackageManager;
}

function buildEnvContent(config: EnvConfigOptions): string {
  const lines: string[] = [
    '# Database (local Docker Compose defaults)',
    `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/${config.projectName}`,
    '',
    '# Azure (populated by azd)',
    'AZURE_POSTGRESQL_HOST=',
    'AZURE_POSTGRESQL_DATABASE=',
  ];

  if (config.includeAuth) {
    lines.push(
      '',
      '# Auth (Azure SWA Easy Auth — configured via staticwebapp.config.json)',
      'AZURE_CLIENT_ID=',
      'AZURE_TENANT_ID=',
    );
  }

  lines.push(''); // trailing newline
  return lines.join('\n');
}

function buildEnvExampleContent(config: EnvConfigOptions): string {
  const lines: string[] = [
    '# Database (local Docker Compose defaults)',
    `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/${config.projectName}`,
    '',
    '# Azure (populated by azd)',
    'AZURE_POSTGRESQL_HOST=',
    'AZURE_POSTGRESQL_DATABASE=',
  ];

  if (config.includeAuth) {
    lines.push(
      '',
      '# Auth (Azure SWA Easy Auth — configured via staticwebapp.config.json)',
      'AZURE_CLIENT_ID=',
      'AZURE_TENANT_ID=',
    );
  }

  lines.push(''); // trailing newline
  return lines.join('\n');
}

/**
 * Environment config feature — generates .env / .env.example with DB connection
 * strings and Azure resource placeholders, plus wires up the dev/setup npm scripts
 * and SWA CLI + func CLI as devDependencies.
 */
export function envFeature(config: EnvConfigOptions): Feature {
  const files = [
    {
      path: '.env.example',
      content: buildEnvExampleContent(config),
    },
    {
      path: '.env',
      content: buildEnvContent(config),
    },
  ];

  // pnpm uses symlinks for node_modules which Azure Functions Core Tools
  // can't resolve. Use hoisted layout so func start works correctly.
  if (config.packageManager === 'pnpm') {
    files.push({
      path: '.npmrc',
      content: 'node-linker=hoisted\n',
    });
  }

  return {
    name: 'env',
    files,
    dependencies: {},
    devDependencies: {
      '@azure/static-web-apps-cli': '^2.0.0',
      'azure-functions-core-tools': '^4.0.0',
    },
    scripts: {
      setup: `${pmInstall(config.packageManager)} && docker compose up -d && ${pmRun(config.packageManager, 'install:api')} && ${pmRun(config.packageManager, 'install:web')} && ${pmRun(config.packageManager, 'build:api')} && ${pmRun(config.packageManager, 'db:push')} && ${pmRun(config.packageManager, 'db:seed')}`,
      dev: 'swa start',
    },
  };
}
