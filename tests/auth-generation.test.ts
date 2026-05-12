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
  it('keeps auth enabled for the in-memory API template without scoping items to the current principal', () => {
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
    expect(itemsContent).toContain('requireAuth(request);');
    expect(itemsContent).toContain('return { jsonBody: items };');
    expect(itemsContent).not.toContain('ownerId');
    expect(itemsContent).not.toContain('userId?: number');
    expect(itemsContent).toContain("title: 'Create your app'");
    expect(itemsContent).toContain("title: 'Set up CI/CD'");
    expect(itemsContent).toContain('let nextId = 5;');
  });

  it('generates Prisma handlers that require auth without filtering items to the current principal', () => {
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
    expect(itemsContent).toContain("const items = await prisma.item.findMany({ orderBy: { createdAt: 'desc' } });");
    expect(itemsContent).toContain("const item = await prisma.item.findUnique({ where: { id } });");
    expect(itemsContent).toContain('userId: currentUser.id');
    expect(itemsContent).not.toContain('where: { userId: currentUser.id }');
    expect(itemsContent).not.toContain('findFirst({');
    expect(itemsContent).not.toContain('userId?: number');
    expect(itemsContent).not.toContain("'userId is required'");
  });

  it('generates Drizzle handlers that require auth without filtering items to the current principal', () => {
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
    expect(itemsContent).toContain('.where(eq(items.id, id));');
    expect(itemsContent).not.toContain('eq(items.userId, currentUser.id)');
    expect(itemsContent).not.toContain('and(eq(items.id, id), eq(items.userId, currentUser.id))');
    expect(itemsContent).not.toContain('userId?: number');
    expect(itemsContent).not.toContain("'userId is required'");
  });
});