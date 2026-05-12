import { describe, expect, it } from 'vitest';
import { databaseFeature } from '../src/features/database.js';

function getFileContent(files: Array<{ path: string; content: string }>, path: string): string {
  const file = files.find((entry) => entry.path === path);
  expect(file, `expected generated file ${path}`).toBeDefined();
  return file!.content;
}

describe('database feature generation', () => {
  it('ships Prisma starter migrations and apply-only runtime scripts', () => {
    const feature = databaseFeature({
      orm: 'prisma',
      projectName: 'demo-app',
      includeAuth: true,
    });

    const migrationLock = getFileContent(feature.files, 'db/migrations/migration_lock.toml');
    const starterMigration = getFileContent(feature.files, 'db/migrations/0001_init/migration.sql');

    expect(migrationLock).toContain('provider = "postgresql"');
    expect(starterMigration).toContain('CREATE TABLE "User"');
    expect(starterMigration).toContain('CREATE TABLE "Item"');
    expect(starterMigration).toContain('CREATE UNIQUE INDEX "User_externalId_key"');

    expect(feature.scripts).toMatchObject({
      'db:generate': 'prisma generate --schema=db/schema.prisma',
      'db:migrate': 'prisma migrate deploy --schema=db/schema.prisma && prisma generate --schema=db/schema.prisma',
      'db:migrate:dev': 'prisma migrate dev --schema=db/schema.prisma',
    });
  });

  it('ships Drizzle starter migrations and keeps authoring scripts separate from apply scripts', () => {
    const feature = databaseFeature({
      orm: 'drizzle',
      projectName: 'demo-app',
      includeAuth: true,
    });

    const starterMigration = getFileContent(feature.files, 'db/migrations/0000_initial.sql');
    const journal = JSON.parse(getFileContent(feature.files, 'db/migrations/meta/_journal.json')) as {
      entries: Array<{ tag: string }>;
    };
    const snapshot = JSON.parse(getFileContent(feature.files, 'db/migrations/meta/0000_snapshot.json')) as {
      tables: Record<string, unknown>;
    };

    expect(starterMigration).toContain('CREATE TABLE "items"');
    expect(starterMigration).toContain('CREATE TABLE "users"');
    expect(journal.entries.map((entry) => entry.tag)).toEqual(['0000_initial']);
    expect(snapshot.tables).toHaveProperty('public.items');
    expect(snapshot.tables).toHaveProperty('public.users');

    expect(feature.scripts).toMatchObject({
      'db:generate': 'drizzle-kit generate',
      'db:migrate': 'drizzle-kit migrate',
      'db:push': 'drizzle-kit push',
    });
  });
});