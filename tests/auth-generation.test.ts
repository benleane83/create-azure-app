import { describe, expect, it } from 'vitest';
import type { ProjectConfig } from '../src/index.js';
import { apiFeature } from '../src/features/api.js';
import { databaseFeature } from '../src/features/database.js';

function getFileContent(files: Array<{ path: string; content: string }>, path: string): string {
  const file = files.find((entry) => entry.path === path);
  expect(file, `expected generated file ${path}`).toBeDefined();
  return file!.content;
}

describe('authenticated API template generation', () => {
  it('scopes the in-memory API template to the authenticated principal', () => {
    const config: ProjectConfig = {
      projectName: 'demo-app',
      framework: 'nextjs',
      orm: 'prisma',
      includeAuth: true,
      includeDatabase: false,
      includeTailwind: true,
      packageManager: 'npm',
    };

    const feature = apiFeature(config);
    const itemsContent = getFileContent(feature.files, 'src/api/src/functions/items.ts');

    expect(itemsContent).toContain("import { requireAuth } from '../lib/auth.js';");
    expect(itemsContent).toContain('ownerId: currentUser.userId');
    expect(itemsContent).toContain('item.ownerId === currentUser.userId');
    expect(itemsContent).not.toContain('userId?: number');
  });

  it('generates Prisma handlers that derive ownership from the current principal', () => {
    const feature = databaseFeature({
      orm: 'prisma',
      projectName: 'demo-app',
      includeAuth: true,
    });

    const schemaContent = getFileContent(feature.files, 'db/schema.prisma');
    const itemsContent = getFileContent(feature.files, 'src/api/src/functions/items.ts');

    expect(schemaContent).toMatch(/externalId\s+String\s+@unique/);
    expect(itemsContent).toContain("import { requireAuth } from '../lib/auth.js';");
    expect(itemsContent).toContain('where: { externalId: authUser.userId }');
    expect(itemsContent).toContain('where: { userId: currentUser.id }');
    expect(itemsContent).not.toContain('userId?: number');
    expect(itemsContent).not.toContain("'userId is required'");
  });

  it('generates Drizzle handlers that scope reads and writes to the current principal', () => {
    const feature = databaseFeature({
      orm: 'drizzle',
      projectName: 'demo-app',
      includeAuth: true,
    });

    const schemaContent = getFileContent(feature.files, 'src/api/src/db/schema.ts');
    const itemsContent = getFileContent(feature.files, 'src/api/src/functions/items.ts');

    expect(schemaContent).toContain("externalId: varchar('external_id', { length: 255 }).notNull().unique()");
    expect(itemsContent).toContain("import { requireAuth } from '../lib/auth.js';");
    expect(itemsContent).toContain('target: users.externalId');
    expect(itemsContent).toContain('eq(items.userId, currentUser.id)');
    expect(itemsContent).not.toContain('userId?: number');
    expect(itemsContent).not.toContain("'userId is required'");
  });
});