import { describe, expect, it } from 'vitest';
import { envFeature } from '../src/features/env.js';

function getFileContent(files: Array<{ path: string; content: string }>, path: string): string {
  const file = files.find((entry) => entry.path === path);
  expect(file, `expected generated file ${path}`).toBeDefined();
  return file!.content;
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

    expect(envContent).toContain('DATABASE_URL=postgresql://postgres:postgres@localhost:5432/demo-app');
    expect(envContent).toContain('AZURE_POSTGRESQL_HOST=');
    expect(envContent).toContain('AZURE_POSTGRESQL_DATABASE=');
    expect(envContent).toContain('AZURE_CLIENT_ID=');
    expect(envContent).toContain('AZURE_TENANT_ID=');

    expect(exampleContent).toContain('DATABASE_URL=postgresql://USER:PASSWORD@localhost:5432/DBNAME');
    expect(exampleContent).toContain('AZURE_POSTGRESQL_HOST=');
    expect(exampleContent).toContain('AZURE_CLIENT_ID=');

    expect(feature.files.map((file) => file.path)).not.toContain('.npmrc');
    expect(feature.scripts).toMatchObject({
      setup: 'npm install && docker compose up -d && npm run install:api && npm run install:web && npm run build:api && npm run db:generate && npm run db:migrate && npm run db:seed',
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

    expect(envContent).not.toContain('DATABASE_URL=');
    expect(envContent).not.toContain('AZURE_POSTGRESQL_HOST=');
    expect(envContent).not.toContain('AZURE_CLIENT_ID=');
    expect(exampleContent.trim()).toBe('');

    expect(feature.scripts).toMatchObject({
      setup: 'yarn install && yarn install:api && yarn install:web && yarn build:api',
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

    expect(getFileContent(feature.files, '.npmrc')).toBe('node-linker=hoisted\n');
    expect(feature.scripts?.setup).toContain('pnpm install');
    expect(feature.scripts?.setup).toContain('pnpm run db:generate');
  });
});