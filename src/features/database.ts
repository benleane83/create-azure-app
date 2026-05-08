import type { Feature } from '../composer.js';

export function databaseFeature(config: {
  orm: 'prisma' | 'drizzle';
  projectName: string;
}): Feature {
  if (config.orm === 'prisma') {
    return prismaFeature(config.projectName);
  }
  return drizzleFeature(config.projectName);
}

// ─── Prisma ──────────────────────────────────────────────────────────────────

function prismaFeature(projectName: string): Feature {
  return {
    name: 'database-prisma',
    files: [
      {
        path: 'db/schema.prisma',
        content: `// Prisma schema for ${projectName}
// Docs: https://pris.ly/d/prisma-schema

generator client {
  provider      = "prisma-client-js"
  binaryTargets = ["native", "windows", "debian-openssl-3.0.x", "debian-openssl-1.1.x"]
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id        Int      @id @default(autoincrement())
  email     String   @unique
  name      String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  items Item[]
}

model Item {
  id          Int      @id @default(autoincrement())
  title       String
  description String?
  completed   Boolean  @default(false)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  userId Int
  user   User @relation(fields: [userId], references: [id])
}
`,
      },
      {
        path: 'db/seed.ts',
        content: `import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  console.log('🌱 Seeding database...');

  const alice = await prisma.user.upsert({
    where: { email: 'alice@example.com' },
    update: {},
    create: {
      email: 'alice@example.com',
      name: 'Alice',
      items: {
        create: [
          { title: 'Create your app', description: 'Choose your frontend framework, ORM, and auth preferences to generate your Azure project.', completed: true },
          { title: 'Develop locally', description: 'Run your full stack locally with Docker PostgreSQL, SWA CLI, and hot reload across frontend and API.', completed: true },
        ],
      },
    },
  });

  const bob = await prisma.user.upsert({
    where: { email: 'bob@example.com' },
    update: {},
    create: {
      email: 'bob@example.com',
      name: 'Bob',
      items: {
        create: [
          { title: 'Deploy to Azure', description: 'Provision infrastructure and deploy your app in one command with azd up.', completed: false },
          { title: 'Set up CI/CD', description: 'Configure GitHub Actions with OIDC to auto-deploy on push with azd pipeline config.', completed: false },
        ],
      },
    },
  });

  console.log(\`✅ Seeded \${alice.name} and \${bob.name}\`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
`,
      },
      {
        path: 'src/api/src/lib/db.ts',
        content: `import { PrismaClient } from '@prisma/client';

let _prisma: PrismaClient | null = null;

export function getPrisma(): PrismaClient {
  if (!_prisma) {
    _prisma = new PrismaClient();
  }
  return _prisma;
}

export default { get client() { return getPrisma(); } };
`,
      },
      {
        path: 'src/api/src/functions/items.ts',
        content: `import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from '@azure/functions';
import { getPrisma } from '../lib/db.js';

// GET /api/items
app.http('listItems', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'items',
  handler: async (
    request: HttpRequest,
    context: InvocationContext
  ): Promise<HttpResponseInit> => {
    const prisma = getPrisma();
    const items = await prisma.item.findMany({ orderBy: { createdAt: 'desc' } });
    return { jsonBody: items };
  },
});

// GET /api/items/{id}
app.http('getItem', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'items/{id}',
  handler: async (
    request: HttpRequest,
    context: InvocationContext
  ): Promise<HttpResponseInit> => {
    const id = Number(request.params.id);
    if (isNaN(id)) {
      return { status: 400, jsonBody: { error: 'Invalid item ID' } };
    }

    const prisma = getPrisma();
    const item = await prisma.item.findUnique({ where: { id } });
    if (!item) {
      return { status: 404, jsonBody: { error: 'Item not found' } };
    }

    return { jsonBody: item };
  },
});

// POST /api/items
app.http('createItem', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'items',
  handler: async (
    request: HttpRequest,
    context: InvocationContext
  ): Promise<HttpResponseInit> => {
    const body = (await request.json()) as {
      title?: string;
      description?: string;
      userId?: number;
    };

    if (!body.title) {
      return { status: 400, jsonBody: { error: 'Title is required' } };
    }
    if (!body.userId) {
      return { status: 400, jsonBody: { error: 'userId is required' } };
    }

    const prisma = getPrisma();
    const item = await prisma.item.create({
      data: {
        title: body.title,
        description: body.description ?? null,
        userId: body.userId,
      },
    });

    return { status: 201, jsonBody: item };
  },
});

// PUT /api/items/{id}
app.http('updateItem', {
  methods: ['PUT'],
  authLevel: 'anonymous',
  route: 'items/{id}',
  handler: async (
    request: HttpRequest,
    context: InvocationContext
  ): Promise<HttpResponseInit> => {
    const id = Number(request.params.id);
    if (isNaN(id)) {
      return { status: 400, jsonBody: { error: 'Invalid item ID' } };
    }

    const prisma = getPrisma();
    const existing = await prisma.item.findUnique({ where: { id } });
    if (!existing) {
      return { status: 404, jsonBody: { error: 'Item not found' } };
    }

    const body = (await request.json()) as {
      title?: string;
      description?: string;
      completed?: boolean;
    };

    const item = await prisma.item.update({
      where: { id },
      data: {
        ...(body.title !== undefined && { title: body.title }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.completed !== undefined && { completed: body.completed }),
      },
    });

    return { jsonBody: item };
  },
});

// DELETE /api/items/{id}
app.http('deleteItem', {
  methods: ['DELETE'],
  authLevel: 'anonymous',
  route: 'items/{id}',
  handler: async (
    request: HttpRequest,
    context: InvocationContext
  ): Promise<HttpResponseInit> => {
    const id = Number(request.params.id);
    if (isNaN(id)) {
      return { status: 400, jsonBody: { error: 'Invalid item ID' } };
    }

    const prisma = getPrisma();
    const existing = await prisma.item.findUnique({ where: { id } });
    if (!existing) {
      return { status: 404, jsonBody: { error: 'Item not found' } };
    }

    await prisma.item.delete({ where: { id } });
    return { status: 204 };
  },
});
`,
      },
      {
        path: 'scripts/sync-prisma-client.mjs',
        content: `#!/usr/bin/env node
/**
 * sync-prisma-client.mjs
 *
 * Copies the generated Prisma client from the repo root into the
 * Azure Functions sub-project so \`func start\` can resolve it.
 *
 * Run from src/api/:  node ../../scripts/sync-prisma-client.mjs
 */
import { cpSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');

const pairs = [
  ['node_modules/@prisma/client', 'src/api/node_modules/@prisma/client'],
  ['node_modules/.prisma',        'src/api/node_modules/.prisma'],
];

for (const [src, dest] of pairs) {
  const srcPath  = resolve(repoRoot, src);
  const destPath = resolve(repoRoot, dest);

  if (!existsSync(srcPath)) {
    console.warn(\`⚠  source not found, skipping: \${srcPath}\`);
    continue;
  }

  mkdirSync(dirname(destPath), { recursive: true });
  cpSync(srcPath, destPath, { recursive: true, force: true });
  console.log(\`✔  \${src} → \${dest}\`);
}
`,
      },
      {
        path: 'scripts/slim-swa-api-package.mjs',
        content: `#!/usr/bin/env node
/**
 * slim-swa-api-package.mjs
 *
 * Trims non-runtime Prisma artefacts from src/api so SWA deploy
 * doesn't exceed the 100 MB limit.
 *
 * Run from repo root:  node scripts/slim-swa-api-package.mjs
 */
import { rmSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');
const apiDir   = resolve(repoRoot, 'src/api');

const removePaths = [
  'node_modules/.prisma/client/libquery_engine-debian-openssl-3.0.x.so.node',
  'node_modules/.prisma/client/libquery_engine-windows.dll.node',
  'node_modules/@prisma/engines',
  'node_modules/prisma',
  'node_modules/@prisma/client/generator-build',
  // Dev dependencies \u2013 not needed at runtime
  'node_modules/typescript',
  'node_modules/@types',
];

for (const rel of removePaths) {
  const full = resolve(apiDir, rel);
  if (existsSync(full)) {
    rmSync(full, { recursive: true, force: true });
    console.log(\`✔  removed \${rel}\`);
  }
}
`,
      },
    ],
    dependencies: {
      '@prisma/client': '^6.2.0',
    },
    devDependencies: {
      prisma: '^6.2.0',
      tsx: '^4.19.0',
    },
    scripts: {
      'db:generate': 'prisma generate --schema=db/schema.prisma',
      'db:migrate': 'prisma migrate dev --schema=db/schema.prisma',
      'db:seed': 'tsx --env-file=.env db/seed.ts',
      'db:seed:azure': 'pwsh scripts/seed.ps1',
      'db:seed:azure:posix': 'bash scripts/seed.sh',
      'db:push': 'prisma db push --schema=db/schema.prisma',
    },
  };
}

// ─── Drizzle ─────────────────────────────────────────────────────────────────

function drizzleFeature(projectName: string): Feature {
  return {
    name: 'database-drizzle',
    files: [
      {
        path: 'src/api/src/db/schema.ts',
        content: `// Drizzle schema for ${projectName}
// Docs: https://orm.drizzle.team/docs/sql-schema-declaration

import { serial, varchar, text, boolean, timestamp, integer, pgTable } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  name: varchar('name', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const items = pgTable('items', {
  id: serial('id').primaryKey(),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  completed: boolean('completed').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id),
});
`,
      },
      {
        path: 'src/api/src/db/seed.ts',
        content: `import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema.js';

async function main(): Promise<void> {
  const pool = new Pool({ connectionString: process.env['DATABASE_URL'] });
  const db = drizzle(pool, { schema });

  console.log('🌱 Seeding database...');

  const [alice] = await db
    .insert(schema.users)
    .values({ email: 'alice@example.com', name: 'Alice' })
    .onConflictDoNothing()
    .returning();

  const [bob] = await db
    .insert(schema.users)
    .values({ email: 'bob@example.com', name: 'Bob' })
    .onConflictDoNothing()
    .returning();

  if (alice) {
    await db.insert(schema.items).values([
      { title: 'Create your app', description: 'Choose your frontend framework, ORM, and auth preferences to generate your Azure project.', completed: false, userId: alice.id },
      { title: 'Develop locally', description: 'Run your full stack locally with Docker PostgreSQL, SWA CLI, and hot reload across frontend and API.', completed: false, userId: alice.id },
    ]).onConflictDoNothing();
  }

  if (bob) {
    await db.insert(schema.items).values([
      { title: 'Deploy to Azure', description: 'Provision infrastructure and deploy your app in one command with azd up.', completed: false, userId: bob.id },
      { title: 'Set up CI/CD', description: 'Configure GitHub Actions to auto-deploy on push with azd pipeline config.', completed: false, userId: bob.id },
    ]).onConflictDoNothing();
  }

  console.log('✅ Seeded sample users and items');
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
`,
      },
      {
        path: 'drizzle.config.ts',
        content: `import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/api/src/db/schema.ts',
  out: './db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env['DATABASE_URL']!,
  },
});
`,
      },
      {
        path: 'src/api/src/lib/db.ts',
        content: `import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from '../db/schema.js';

const pool = new Pool({
  connectionString: process.env['DATABASE_URL'],
});

export const db = drizzle(pool, { schema });
export default db;
`,
      },
      {
        path: 'src/api/src/functions/items.ts',
        content: `import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from '@azure/functions';
import { eq } from 'drizzle-orm';
import db from '../lib/db.js';
import { items } from '../db/schema.js';

// GET /api/items
app.http('listItems', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'items',
  handler: async (
    request: HttpRequest,
    context: InvocationContext
  ): Promise<HttpResponseInit> => {
    const rows = await db.select().from(items).orderBy(items.createdAt);
    return { jsonBody: rows };
  },
});

// GET /api/items/{id}
app.http('getItem', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'items/{id}',
  handler: async (
    request: HttpRequest,
    context: InvocationContext
  ): Promise<HttpResponseInit> => {
    const id = Number(request.params.id);
    if (isNaN(id)) {
      return { status: 400, jsonBody: { error: 'Invalid item ID' } };
    }

    const [item] = await db.select().from(items).where(eq(items.id, id));
    if (!item) {
      return { status: 404, jsonBody: { error: 'Item not found' } };
    }

    return { jsonBody: item };
  },
});

// POST /api/items
app.http('createItem', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'items',
  handler: async (
    request: HttpRequest,
    context: InvocationContext
  ): Promise<HttpResponseInit> => {
    const body = (await request.json()) as {
      title?: string;
      description?: string;
      userId?: number;
    };

    if (!body.title) {
      return { status: 400, jsonBody: { error: 'Title is required' } };
    }
    if (!body.userId) {
      return { status: 400, jsonBody: { error: 'userId is required' } };
    }

    const [item] = await db
      .insert(items)
      .values({
        title: body.title,
        description: body.description ?? null,
        userId: body.userId,
      })
      .returning();

    return { status: 201, jsonBody: item };
  },
});

// PUT /api/items/{id}
app.http('updateItem', {
  methods: ['PUT'],
  authLevel: 'anonymous',
  route: 'items/{id}',
  handler: async (
    request: HttpRequest,
    context: InvocationContext
  ): Promise<HttpResponseInit> => {
    const id = Number(request.params.id);
    if (isNaN(id)) {
      return { status: 400, jsonBody: { error: 'Invalid item ID' } };
    }

    const [existing] = await db.select().from(items).where(eq(items.id, id));
    if (!existing) {
      return { status: 404, jsonBody: { error: 'Item not found' } };
    }

    const body = (await request.json()) as {
      title?: string;
      description?: string;
      completed?: boolean;
    };

    const [updated] = await db
      .update(items)
      .set({
        ...(body.title !== undefined && { title: body.title }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.completed !== undefined && { completed: body.completed }),
        updatedAt: new Date(),
      })
      .where(eq(items.id, id))
      .returning();

    return { jsonBody: updated };
  },
});

// DELETE /api/items/{id}
app.http('deleteItem', {
  methods: ['DELETE'],
  authLevel: 'anonymous',
  route: 'items/{id}',
  handler: async (
    request: HttpRequest,
    context: InvocationContext
  ): Promise<HttpResponseInit> => {
    const id = Number(request.params.id);
    if (isNaN(id)) {
      return { status: 400, jsonBody: { error: 'Invalid item ID' } };
    }

    const [existing] = await db.select().from(items).where(eq(items.id, id));
    if (!existing) {
      return { status: 404, jsonBody: { error: 'Item not found' } };
    }

    await db.delete(items).where(eq(items.id, id));
    return { status: 204 };
  },
});
`,
      },
    ],
    dependencies: {},
    devDependencies: {
      'drizzle-orm': '^0.45.2',
      pg: '^8.13.0',
      'drizzle-kit': '^0.30.0',
      '@types/pg': '^8.11.0',
      tsx: '^4.19.0',
    },
    scripts: {
      'db:generate': 'drizzle-kit generate',
      'db:migrate': 'drizzle-kit migrate',
      'db:seed': 'tsx --env-file=.env src/api/src/db/seed.ts',
      'db:push': 'drizzle-kit push',
    },
  };
}
