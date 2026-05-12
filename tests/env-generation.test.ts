import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import { dockerFeature } from '../src/features/docker.js';
import { envFeature } from '../src/features/env.js';

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.allSettled(
    tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true }))
  );
});

function getFileContent(files: Array<{ path: string; content: string }>, path: string): string {
  const file = files.find((entry) => entry.path === path);
  expect(file, `expected generated file ${path}`).toBeDefined();
  return file!.content;
}

async function loadSetupModule(setupScript: string, projectDir: string): Promise<{
  ensureDockerEnvFile?: (projectDir?: string) => void;
  getSetupCommands: () => string[];
}> {
  const setupScriptPath = join(projectDir, 'scripts', 'setup.mjs');
  await mkdir(dirname(setupScriptPath), { recursive: true });
  await writeFile(setupScriptPath, setupScript, 'utf-8');

  return import(`${pathToFileURL(setupScriptPath).href}?t=${Date.now()}`) as Promise<{
    ensureDockerEnvFile?: (projectDir?: string) => void;
    getSetupCommands: () => string[];
  }>;
}

describe('env feature generation', () => {
  it('includes local database, Azure placeholders, auth placeholders, and setup scripts when db+auth are enabled', () => {
    const feature = envFeature({
      projectName: 'demo-app',
      orm: 'prisma',
      includeDatabase: true,
      includeAuth: true,
      packageManager: 'npm',
    });

    const envContent = getFileContent(feature.files, '.env');
    const exampleContent = getFileContent(feature.files, '.env.example');
    const setupScriptContent = getFileContent(feature.files, 'scripts/setup.mjs');

    expect(envContent).toContain('DATABASE_URL=postgresql://postgres:postgres@localhost:5432/demo-app');
    expect(envContent).toContain('AZURE_POSTGRESQL_HOST=');
    expect(envContent).toContain('AZURE_POSTGRESQL_DATABASE=');
    expect(envContent).toContain('AZURE_CLIENT_ID=');
    expect(envContent).toContain('AZURE_TENANT_ID=');

    expect(exampleContent).toContain('DATABASE_URL=postgresql://USER:PASSWORD@localhost:5432/DBNAME');
    expect(exampleContent).toContain('AZURE_POSTGRESQL_HOST=');
    expect(exampleContent).toContain('AZURE_CLIENT_ID=');
    expect(setupScriptContent).toContain("copyFileSync(join(projectDir, '.env.docker.example'), dockerEnvPath);");
    expect(setupScriptContent).toContain('docker compose up -d');
    expect(setupScriptContent).toContain('npm run db:migrate');
    expect(setupScriptContent).toContain('npm run db:seed');

    expect(feature.files.map((file) => file.path)).not.toContain('.npmrc');
    expect(feature.scripts).toMatchObject({
      setup: 'node ./scripts/setup.mjs',
      dev: 'swa start',
    });
  });

  it('omits db/auth placeholders and docker bootstrap when db+auth are disabled', () => {
    const feature = envFeature({
      projectName: 'demo-app',
      orm: 'drizzle',
      includeDatabase: false,
      includeAuth: false,
      packageManager: 'yarn',
    });

    const envContent = getFileContent(feature.files, '.env');
    const exampleContent = getFileContent(feature.files, '.env.example');
    const setupScriptContent = getFileContent(feature.files, 'scripts/setup.mjs');

    expect(envContent).not.toContain('DATABASE_URL=');
    expect(envContent).not.toContain('AZURE_POSTGRESQL_HOST=');
    expect(envContent).not.toContain('AZURE_CLIENT_ID=');
    expect(exampleContent.trim()).toBe('');
    expect(setupScriptContent).toContain('yarn install');
    expect(setupScriptContent).not.toContain('.env.docker.example');
    expect(setupScriptContent).not.toContain('db:migrate');

    expect(feature.scripts).toMatchObject({
      setup: 'node ./scripts/setup.mjs',
      dev: 'swa start',
    });
  });

  it('adds a hoisted node-linker config for pnpm projects', () => {
    const feature = envFeature({
      projectName: 'demo-app',
      orm: 'prisma',
      includeDatabase: true,
      includeAuth: false,
      packageManager: 'pnpm',
    });

    const setupScriptContent = getFileContent(feature.files, 'scripts/setup.mjs');

    expect(getFileContent(feature.files, '.npmrc')).toBe('node-linker=hoisted\n');
    expect(feature.scripts?.setup).toBe('node ./scripts/setup.mjs');
    expect(setupScriptContent).toContain('pnpm install');
    expect(setupScriptContent).toContain('.env.docker.example');
    expect(setupScriptContent).toContain('pnpm run db:migrate');
    expect(setupScriptContent).not.toContain('pnpm run db:generate');
  });

  it('ships a docker env template instead of a tracked live docker env file', () => {
    const feature = dockerFeature({ projectName: 'demo-app' });

    expect(getFileContent(feature.files, '.env.docker.example')).toContain('POSTGRES_PASSWORD=postgres');
    expect(feature.files.map((file) => file.path)).not.toContain('.env.docker');
  });

  it('creates .env.docker from the example file only when the file is missing', async () => {
    const env = envFeature({
      projectName: 'demo-app',
      orm: 'prisma',
      includeDatabase: true,
      includeAuth: false,
      packageManager: 'npm',
    });
    const docker = dockerFeature({ projectName: 'demo-app' });
    const projectDir = await mkdtemp(join(tmpdir(), 'create-azure-app-env-docker-'));
    const setupModule = await loadSetupModule(
      getFileContent(env.files, 'scripts/setup.mjs'),
      projectDir
    );
    const exampleContent = getFileContent(docker.files, '.env.docker.example');
    const dockerEnvPath = join(projectDir, '.env.docker');

    tempDirs.push(projectDir);

    await writeFile(join(projectDir, '.env.docker.example'), exampleContent, 'utf-8');

    expect(setupModule.ensureDockerEnvFile).toBeTypeOf('function');
    setupModule.ensureDockerEnvFile!(projectDir);

    await expect(readFile(dockerEnvPath, 'utf-8')).resolves.toBe(exampleContent);

    const existingContent = 'POSTGRES_USER=existing\nPOSTGRES_PASSWORD=existing\n';
    await writeFile(dockerEnvPath, existingContent, 'utf-8');

    setupModule.ensureDockerEnvFile!(projectDir);

    await expect(readFile(dockerEnvPath, 'utf-8')).resolves.toBe(existingContent);
  });
});