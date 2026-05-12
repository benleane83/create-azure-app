import type { Feature } from '../composer.js';
import type { PackageManager } from '../utils.js';
import { pmRun, pmInstall } from '../utils.js';

interface EnvConfigOptions {
  projectName: string;
  orm: 'prisma' | 'drizzle';
  includeDatabase: boolean;
  includeAuth: boolean;
  packageManager: PackageManager;
}

function getSetupCommands(config: EnvConfigOptions): string[] {
  return [
    pmInstall(config.packageManager),
    ...(config.includeDatabase ? ['docker compose up -d'] : []),
    pmRun(config.packageManager, 'install:api'),
    pmRun(config.packageManager, 'install:web'),
    pmRun(config.packageManager, 'build:api'),
    ...(config.includeDatabase ? [
      pmRun(config.packageManager, 'db:migrate'),
      pmRun(config.packageManager, 'db:seed'),
    ] : []),
  ];
}

function buildSetupScriptContent(config: EnvConfigOptions): string {
  const lines = [
    "import { execSync } from 'node:child_process';",
    ...(config.includeDatabase ? ["import { copyFileSync, existsSync } from 'node:fs';"] : []),
    ...(config.includeDatabase ? ["import { join } from 'node:path';"] : []),
    "import { fileURLToPath } from 'node:url';",
    '',
    `const commands = ${JSON.stringify(getSetupCommands(config), null, 2)};`,
    '',
    ...(config.includeDatabase ? [
      'export function ensureDockerEnvFile(projectDir = process.cwd()) {',
      "  const dockerEnvPath = join(projectDir, '.env.docker');",
      '',
      '  if (!existsSync(dockerEnvPath)) {',
      "    copyFileSync(join(projectDir, '.env.docker.example'), dockerEnvPath);",
      '  }',
      '}',
      '',
    ] : []),
    'export function getSetupCommands() {',
    '  return [...commands];',
    '}',
    '',
    'export function runSetup() {',
    ...(config.includeDatabase ? [
      '  ensureDockerEnvFile();',
      '',
    ] : []),
    '  for (const command of commands) {',
    '    console.log(`> ${command}`);',
    "    execSync(command, { stdio: 'inherit', shell: true });",
    '  }',
    '}',
    '',
    'if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {',
    '  runSetup();',
    '}',
    '',
  ];

  return lines.join('\n');
}

function buildEnvContent(config: EnvConfigOptions): string {
  const lines: string[] = [];

  if (config.includeDatabase) {
    lines.push(
      '# Database (local Docker Compose defaults)',
      `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/${config.projectName}`,
      '',
      '# Azure (populated by azd)',
      'AZURE_POSTGRESQL_HOST=',
      'AZURE_POSTGRESQL_DATABASE=',
    );
  }

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
  const lines: string[] = [];

  if (config.includeDatabase) {
    lines.push(
      '# Database',
      'DATABASE_URL=postgresql://USER:PASSWORD@localhost:5432/DBNAME',
      '',
      '# Azure (populated by azd)',
      'AZURE_POSTGRESQL_HOST=',
      'AZURE_POSTGRESQL_DATABASE=',
    );
  }

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
    {
      path: 'scripts/setup.mjs',
      content: buildSetupScriptContent(config),
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
      setup: 'node ./scripts/setup.mjs',
      dev: 'swa start',
    },
  };
}
