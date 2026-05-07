import type { Feature } from '../composer.js';
import type { ProjectConfig } from '../index.js';
import { pmRun, pmInstall } from '../utils.js';

export function apiFeature(config: ProjectConfig): Feature {
  const { projectName } = config;

  const isPrisma = config.orm === 'prisma';

  const apiScripts: Record<string, string> = {
    build: 'tsc',
    watch: 'tsc -w',
    start: 'func start',
    prestart: 'tsc',
  };

  if (isPrisma) {
    apiScripts['generate:prisma'] = 'prisma generate --schema=../../db/schema.prisma';
    apiScripts['sync:prisma'] = 'node ../../scripts/sync-prisma-client.mjs';
    apiScripts['prestart'] = 'npm run generate:prisma && npm run sync:prisma && tsc';
  }

  return {
    name: 'api',
    files: [
      {
        path: 'src/api/package.json',
        content:
          JSON.stringify(
            {
              name: `${projectName}-api`,
              version: '0.1.0',
              private: true,
              type: 'module',
              main: isPrisma ? 'dist/src/functions/*.js' : 'dist/src/api/src/functions/*.js',
              scripts: apiScripts,
              dependencies: {
                '@azure/functions': '^4.6.0',
              },
              devDependencies: {
                '@types/node': '^22.0.0',
                typescript: '^5.8.0',
              },
            },
            null,
            2
          ) + '\n',
      },
      {
        path: 'src/api/tsconfig.json',
        content:
          JSON.stringify(
            {
              compilerOptions: {
                target: 'ES2022',
                module: 'Node16',
                moduleResolution: 'Node16',
                outDir: 'dist',
                rootDir: isPrisma ? '.' : '../..',
                strict: true,
                esModuleInterop: true,
                skipLibCheck: true,
                forceConsistentCasingInFileNames: true,
                resolveJsonModule: true,
                sourceMap: true,
              },
              include: isPrisma
                ? ['src/**/*.ts']
                : ['src/**/*.ts', '../../db/**/*.ts'],
            },
            null,
            2
          ) + '\n',
      },
      {
        path: 'src/api/host.json',
        content:
          JSON.stringify(
            {
              version: '2.0',
              logging: {
                applicationInsights: {
                  samplingSettings: {
                    isEnabled: true,
                    excludedTypes: 'Request',
                  },
                },
              },
              extensionBundle: {
                id: 'Microsoft.Azure.Functions.ExtensionBundle',
                version: '[4.*, 5.0.0)',
              },
            },
            null,
            2
          ) + '\n',
      },
      {
        path: 'src/api/local.settings.json',
        content:
          JSON.stringify(
            {
              IsEncrypted: false,
              Values: {
                FUNCTIONS_WORKER_RUNTIME: 'node',
                AzureWebJobsStorage: '',
              },
            },
            null,
            2
          ) + '\n',
      },
      {
        path: 'src/api/src/functions/health.ts',
        content: `import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from '@azure/functions';

app.http('health', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'health',
  handler: async (
    request: HttpRequest,
    context: InvocationContext
  ): Promise<HttpResponseInit> => {
    context.log('Health check requested');

    return {
      jsonBody: {
        status: 'ok',
        timestamp: new Date().toISOString(),
      },
    };
  },
});
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

interface Item {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

// In-memory store — the database feature module replaces this
// with a real ORM client (Prisma or Drizzle).
const items: Item[] = [
  {
    id: '1',
    name: 'Sample item',
    description: 'This is a sample item created by the scaffolder.',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  },
];
let nextId = 2;

// GET /api/items
app.http('listItems', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'items',
  handler: async (
    request: HttpRequest,
    context: InvocationContext
  ): Promise<HttpResponseInit> => {
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
    const id = request.params.id;
    const item = items.find((i) => i.id === id);

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
      name?: string;
      description?: string;
    };

    if (!body.name) {
      return { status: 400, jsonBody: { error: 'Name is required' } };
    }

    const now = new Date().toISOString();
    const item: Item = {
      id: String(nextId++),
      name: body.name,
      description: body.description ?? '',
      createdAt: now,
      updatedAt: now,
    };
    items.push(item);

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
    const id = request.params.id;
    const index = items.findIndex((i) => i.id === id);

    if (index === -1) {
      return { status: 404, jsonBody: { error: 'Item not found' } };
    }

    const body = (await request.json()) as {
      name?: string;
      description?: string;
    };

    items[index] = {
      ...items[index],
      ...(body.name !== undefined && { name: body.name }),
      ...(body.description !== undefined && { description: body.description }),
      updatedAt: new Date().toISOString(),
    };

    return { jsonBody: items[index] };
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
    const id = request.params.id;
    const index = items.findIndex((i) => i.id === id);

    if (index === -1) {
      return { status: 404, jsonBody: { error: 'Item not found' } };
    }

    items.splice(index, 1);
    return { status: 204 };
  },
});
`,
      },
      {
        path: 'src/api/src/lib/db.ts',
        content: `/**
 * Database client placeholder.
 *
 * This module exports a getDb() function that the API functions use
 * for data access. The database feature module (Prisma or Drizzle)
 * replaces this file with a real ORM client and connection.
 *
 * Until the db feature is wired up, API functions use the in-memory
 * array in items.ts as a placeholder.
 */

export interface DbClient {
  // Placeholder interface — the db feature module provides the real type
}

let client: DbClient | null = null;

export function getDb(): DbClient {
  if (!client) {
    throw new Error(
      'Database not configured. Run the db feature module to wire up Prisma or Drizzle.'
    );
  }
  return client;
}

export function initDb(dbClient: DbClient): void {
  client = dbClient;
}
`,
      },
      {
        path: 'src/api/.funcignore',
        content: `local.settings.json
src/
tsconfig.json
package-lock.json
*.map
`,
      },
    ],
    scripts: {
      'install:api': `cd src/api && ${pmInstall(config.packageManager)}`,
      'dev:api': `cd src/api && ${pmRun(config.packageManager, 'start')}`,
      'build:api': `cd src/api && ${pmRun(config.packageManager, 'build')}`,
    },
  };
}
