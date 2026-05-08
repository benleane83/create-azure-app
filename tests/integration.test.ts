/**
 * Integration tests: generate pairwise template combinations, install, and build.
 *
 * These tests exercise the full CLI pipeline without a database. They validate
 * that every generated project compiles successfully. The pairwise set covers
 * all option pairs with a minimal number of combinations (6 tests).
 *
 * Skips: Docker/Postgres, Azure deploy, CI/CD.
 * Validates: file generation, npm install, TypeScript compilation, framework build.
 */

import { describe, it, afterAll } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execSync } from 'node:child_process';
import { compose, writeProject } from '../src/composer.js';
import { baseFeature, buildRootPackageJson } from '../src/features/base.js';
import { nextjsFeature } from '../src/features/nextjs.js';
import { viteReactFeature } from '../src/features/vite-react.js';
import { sveltekitFeature } from '../src/features/sveltekit.js';
import { apiFeature } from '../src/features/api.js';
import { databaseFeature } from '../src/features/database.js';
import { authFeature } from '../src/features/auth.js';
import { dockerFeature } from '../src/features/docker.js';
import { swaConfigFeature } from '../src/features/swa-config.js';
import { envFeature } from '../src/features/env.js';
import { infraFeature } from '../src/features/infra.js';
import { cicdFeature } from '../src/features/cicd.js';
import { tailwindFeature } from '../src/features/tailwind.js';
import { copilotInstructionsFeature } from '../src/features/copilot-instructions.js';
import type { ProjectConfig } from '../src/index.js';

// ─── Pairwise covering set ──────────────────────────────────────────────────
// Factors: framework(3) × orm(2) × auth(2) × tailwind(2) — pkg manager fixed to npm.
// This 6-row set covers every pair of option values at least once.

const PAIRWISE_CONFIGS: Omit<ProjectConfig, 'projectName'>[] = [
  { framework: 'nextjs',     orm: 'prisma',  includeDatabase: true,  includeAuth: true,  includeTailwind: true,  packageManager: 'npm' },
  { framework: 'nextjs',     orm: 'drizzle', includeDatabase: true,  includeAuth: false, includeTailwind: false, packageManager: 'npm' },
  { framework: 'vite-react', orm: 'prisma',  includeDatabase: true,  includeAuth: false, includeTailwind: true,  packageManager: 'npm' },
  { framework: 'vite-react', orm: 'drizzle', includeDatabase: true,  includeAuth: true,  includeTailwind: false, packageManager: 'npm' },
  { framework: 'sveltekit',  orm: 'prisma',  includeDatabase: true,  includeAuth: true,  includeTailwind: false, packageManager: 'npm' },
  { framework: 'sveltekit',  orm: 'drizzle', includeDatabase: true,  includeAuth: false, includeTailwind: true,  packageManager: 'npm' },
  // No-database variant
  { framework: 'nextjs',     orm: 'prisma',  includeDatabase: false, includeAuth: false, includeTailwind: false, packageManager: 'npm' },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function configLabel(cfg: Omit<ProjectConfig, 'projectName'>): string {
  const parts = [
    cfg.framework,
    cfg.includeDatabase ? cfg.orm : 'no-database',
    cfg.includeAuth ? 'auth' : 'no-auth',
    cfg.includeTailwind ? 'tailwind' : 'no-tailwind',
  ];
  return parts.join(' + ');
}

function generateProject(projectDir: string, config: ProjectConfig) {
  const frameworkFeature =
    config.framework === 'nextjs' ? nextjsFeature(config) :
    config.framework === 'vite-react' ? viteReactFeature(config) :
    sveltekitFeature(config);

  const features = [
    baseFeature(config.projectName, config.packageManager, config.includeDatabase),
    frameworkFeature,
    apiFeature(config),
    ...(config.includeDatabase ? [
      databaseFeature({ orm: config.orm, projectName: config.projectName }),
      dockerFeature({ projectName: config.projectName }),
    ] : []),
    swaConfigFeature({ framework: config.framework, packageManager: config.packageManager }),
    envFeature({ projectName: config.projectName, orm: config.orm, includeDatabase: config.includeDatabase, includeAuth: config.includeAuth, packageManager: config.packageManager }),
    infraFeature(config),
    cicdFeature({ projectName: config.projectName, framework: config.framework, packageManager: config.packageManager, orm: config.orm, includeDatabase: config.includeDatabase }),
    copilotInstructionsFeature(config),
  ];

  if (config.includeTailwind) {
    features.push(tailwindFeature({ framework: config.framework }));
  }
  if (config.includeAuth) {
    features.push(authFeature(config));
  }

  const composed = compose(features);
  const rootPkgContent = buildRootPackageJson(config.projectName, composed, config.packageManager);
  const allFiles = [
    ...composed.files,
    { path: 'package.json', content: rootPkgContent },
  ];

  return writeProject(projectDir, allFiles);
}

function run(cmd: string, cwd: string) {
  try {
    execSync(cmd, { cwd, stdio: 'pipe', timeout: 180_000 });
  } catch (err: any) {
    const stderr = err.stderr?.toString() || '';
    const stdout = err.stdout?.toString() || '';
    throw new Error(
      `Command failed: ${cmd}\n` +
      `Exit code: ${err.status}\n` +
      `--- stderr (last 2000 chars) ---\n${stderr.slice(-2000)}\n` +
      `--- stdout (last 2000 chars) ---\n${stdout.slice(-2000)}`
    );
  }
}

// ─── Test Suite ──────────────────────────────────────────────────────────────

const tempDirs: string[] = [];

afterAll(async () => {
  // Clean up all temp directories
  await Promise.allSettled(
    tempDirs.map((dir) => rm(dir, { recursive: true, force: true }))
  );
});

describe('integration: pairwise template builds', () => {
  for (const cfg of PAIRWISE_CONFIGS) {
    const label = configLabel(cfg);

    it(
      label,
      async () => {
        // 1. Create temp directory
        const tmpBase = await mkdtemp(join(tmpdir(), 'caa-test-'));
        tempDirs.push(tmpBase);
        const projectName = 'test-app';
        const projectDir = join(tmpBase, projectName);

        const config: ProjectConfig = { projectName, ...cfg };

        // 2. Generate project files
        await generateProject(projectDir, config);

        // 3. Install root dependencies
        run('npm install', projectDir);

        // 4. Install sub-project dependencies
        run('npm run install:api', projectDir);
        run('npm run install:web', projectDir);

        // 5. For Prisma: generate client (no DB needed)
        if (config.includeDatabase && config.orm === 'prisma') {
          run('npx prisma generate --schema=../../db/schema.prisma', join(projectDir, 'src/api'));
        }

        // 6. Build API (tsc)
        run('npm run build:api', projectDir);

        // 7. Build web (framework build)
        run('npm run build:web', projectDir);

        // 8. Verify .github/copilot-instructions.md
        const copilotInstructionsPath = join(projectDir, '.github', 'copilot-instructions.md');
        expect(existsSync(copilotInstructionsPath), '.github/copilot-instructions.md should exist').toBe(true);

        const copilotInstructions = readFileSync(copilotInstructionsPath, 'utf-8');

        // Contains the project name
        expect(copilotInstructions, 'should contain project name').toContain(projectName);

        // Framework-specific content
        const frameworkLabel =
          config.framework === 'nextjs' ? 'Next.js'
          : config.framework === 'vite-react' ? 'Vite + React'
          : 'SvelteKit';
        expect(copilotInstructions, `should contain framework label '${frameworkLabel}'`).toContain(frameworkLabel);

        // ORM-specific schema file path (only when DB is included)
        if (config.includeDatabase) {
          const schemaFile =
            config.orm === 'prisma' ? 'db/schema.prisma' : 'src/api/src/db/schema.ts';
          expect(copilotInstructions, `should contain schema path '${schemaFile}'`).toContain(schemaFile);
        }

        // Database-specific assertions
        if (config.includeDatabase) {
          expect(existsSync(join(projectDir, 'docker-compose.yml')), 'docker-compose.yml should exist').toBe(true);
          expect(existsSync(join(projectDir, 'infra', 'modules', 'postgres.bicep')), 'postgres.bicep should exist').toBe(true);
          expect(existsSync(join(projectDir, 'infra', 'modules', 'keyvault.bicep')), 'keyvault.bicep should exist').toBe(true);
          const envContent = readFileSync(join(projectDir, '.env'), 'utf-8');
          expect(envContent, '.env should contain DATABASE_URL').toContain('DATABASE_URL=');
        } else {
          expect(existsSync(join(projectDir, 'docker-compose.yml')), 'docker-compose.yml should NOT exist').toBe(false);
          expect(existsSync(join(projectDir, 'infra', 'modules', 'postgres.bicep')), 'postgres.bicep should NOT exist').toBe(false);
          expect(existsSync(join(projectDir, 'infra', 'modules', 'keyvault.bicep')), 'keyvault.bicep should NOT exist').toBe(false);
          const envContent = readFileSync(join(projectDir, '.env'), 'utf-8');
          expect(envContent, '.env should NOT contain DATABASE_URL').not.toContain('DATABASE_URL=');
          const itemsContent = readFileSync(join(projectDir, 'src', 'api', 'src', 'functions', 'items.ts'), 'utf-8');
          expect(itemsContent, 'items.ts should use in-memory store when no DB').toContain('In-memory store');
          expect(copilotInstructions, 'copilot instructions should not mention docker-compose').not.toContain('docker-compose.yml');
          expect(copilotInstructions, 'copilot instructions should not mention DB singleton').not.toContain('DB singleton');
        }

        // Auth-specific header rule
        if (config.includeAuth) {
          expect(copilotInstructions, 'should contain x-ms-client-principal when auth is enabled').toContain('x-ms-client-principal');
        } else {
          expect(copilotInstructions, 'should NOT contain x-ms-client-principal when auth is disabled').not.toContain('x-ms-client-principal');
        }

        // Files to Leave Alone table
        expect(copilotInstructions, 'should contain Files to Leave Alone table').toContain('Files to Leave Alone');
      },
      300_000, // 5 minutes per combo — install + build is slow
    );
  }
});
