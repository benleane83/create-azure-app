import { describe, expect, it } from 'vitest';
import { infraFeature } from '../src/features/infra.js';

function getFileContent(files: Array<{ path: string; content: string }>, path: string): string {
  const file = files.find((entry) => entry.path === path);
  expect(file, `expected generated file ${path}`).toBeDefined();
  return file!.content;
}

describe('infra feature generation', () => {
  it('generates the no-database Azure shape without postgres/keyvault artifacts', () => {
    const feature = infraFeature({
      projectName: 'demo-app',
      orm: 'prisma',
      includeAuth: true,
      includeDatabase: false,
      framework: 'vite-react',
      packageManager: 'npm',
    });

    const paths = feature.files.map((file) => file.path);
    const mainBicep = getFileContent(feature.files, 'infra/main.bicep');
    const azureYaml = getFileContent(feature.files, 'azure.yaml');

    expect(paths).not.toContain('infra/modules/postgres.bicep');
    expect(paths).not.toContain('infra/modules/keyvault.bicep');
    expect(paths).not.toContain('scripts/migrate.sh');
    expect(mainBicep).not.toContain('dbAdminPassword');
    expect(mainBicep).not.toContain('module postgres');
    expect(mainBicep).toContain('output AZURE_SWA_NAME string');
    expect(azureYaml).toContain('dist: dist');
    expect(azureYaml).not.toContain('postprovision:');
  });

  it('generates postgres/keyvault resources and migration hooks when database support is enabled', () => {
    const feature = infraFeature({
      projectName: 'demo-app',
      orm: 'drizzle',
      includeAuth: true,
      includeDatabase: true,
      framework: 'nextjs',
      packageManager: 'npm',
    });

    const paths = feature.files.map((file) => file.path);
    const mainBicep = getFileContent(feature.files, 'infra/main.bicep');
    const params = JSON.parse(getFileContent(feature.files, 'infra/main.parameters.json')) as {
      parameters: Record<string, { value: string }>;
    };
    const azureYaml = getFileContent(feature.files, 'azure.yaml');
    const migrateScript = getFileContent(feature.files, 'scripts/migrate.sh');

    expect(paths).toContain('infra/modules/postgres.bicep');
    expect(paths).toContain('infra/modules/keyvault.bicep');
    expect(paths).toContain('scripts/migrate.sh');
    expect(paths).toContain('scripts/seed.ps1');

    expect(mainBicep).toContain('module postgres');
    expect(mainBicep).toContain('module keyvault');
    expect(mainBicep).toContain('databaseUrl: \'postgresql://');
    expect(params.parameters).toMatchObject({
      dbAdminPassword: { value: '${AZURE_DB_ADMIN_PASSWORD}' },
      deployerPrincipalId: { value: '${AZURE_PRINCIPAL_ID}' },
    });
    expect(azureYaml).toContain('dist: out');
    expect(azureYaml).toContain('postprovision:');
    expect(migrateScript).toContain('az keyvault secret show');
    expect(migrateScript).toContain('az postgres flexible-server firewall-rule create');
    expect(migrateScript).toContain('npx drizzle-kit migrate');
    expect(migrateScript).not.toContain('drizzle-kit push');
  });

  it('adds prisma-specific packaging hooks only for prisma projects', () => {
    const prisma = infraFeature({
      projectName: 'demo-app',
      orm: 'prisma',
      includeAuth: true,
      includeDatabase: true,
      framework: 'sveltekit',
      packageManager: 'pnpm',
    });
    const drizzle = infraFeature({
      projectName: 'demo-app',
      orm: 'drizzle',
      includeAuth: true,
      includeDatabase: true,
      framework: 'sveltekit',
      packageManager: 'pnpm',
    });

    const prismaYaml = getFileContent(prisma.files, 'azure.yaml');
    const drizzleYaml = getFileContent(drizzle.files, 'azure.yaml');

    expect(prismaYaml).toContain('pnpm run db:generate');
    expect(prismaYaml).toContain('node scripts/sync-prisma-client.mjs');
    expect(prismaYaml).toContain('node scripts/slim-swa-api-package.mjs');

    expect(drizzleYaml).not.toContain('db:generate');
    expect(drizzleYaml).not.toContain('sync-prisma-client');
    expect(drizzleYaml).not.toContain('slim-swa-api-package');
    expect(prismaYaml).toContain('dist: build');
    expect(drizzleYaml).toContain('dist: build');
  });

  it('generates ORM-aware Azure seed script paths for POSIX and PowerShell', () => {
    const prisma = infraFeature({
      projectName: 'demo-app',
      orm: 'prisma',
      includeAuth: true,
      includeDatabase: true,
      framework: 'vite-react',
      packageManager: 'npm',
    });
    const drizzle = infraFeature({
      projectName: 'demo-app',
      orm: 'drizzle',
      includeAuth: true,
      includeDatabase: true,
      framework: 'vite-react',
      packageManager: 'npm',
    });

    const prismaSeedSh = getFileContent(prisma.files, 'scripts/seed.sh');
    const prismaSeedPs1 = getFileContent(prisma.files, 'scripts/seed.ps1');
    const drizzleSeedSh = getFileContent(drizzle.files, 'scripts/seed.sh');
    const drizzleSeedPs1 = getFileContent(drizzle.files, 'scripts/seed.ps1');

    expect(prismaSeedSh).toContain('npx tsx db/seed.ts');
    expect(prismaSeedPs1).toContain('npx tsx db/seed.ts');
    expect(drizzleSeedSh).toContain('npx tsx src/api/src/db/seed.ts');
    expect(drizzleSeedPs1).toContain('npx tsx src/api/src/db/seed.ts');
  });
});