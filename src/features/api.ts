import type { Feature } from '../composer.js';
import type { ProjectConfig } from '../index.js';
import { pmRun, pmInstall } from '../utils.js';

export function apiFeature(config: ProjectConfig): Feature {
  const { projectName } = config;

  const isPrisma = config.includeDatabase && config.orm === 'prisma';
  const isDrizzle = config.includeDatabase && config.orm === 'drizzle';

  const apiScripts: Record<string, string> = {
    build: 'tsc',
    watch: 'tsc -w',
    start: 'func start',
    prestart: 'tsc',
  };

  if (isPrisma) {
    apiScripts['generate:prisma'] = 'prisma generate --schema=../../db/schema.prisma';
    apiScripts['sync:prisma'] = 'node ../../scripts/sync-prisma-client.mjs';
    apiScripts['prestart'] = 'npx prisma generate --schema=../../db/schema.prisma && node ../../scripts/sync-prisma-client.mjs && tsc';
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
              version: '0.1.2',
              private: true,
              type: 'module',
              main: isDrizzle ? 'dist/functions/*.js' : 'dist/src/functions/*.js',
              scripts: apiScripts,
              dependencies: {
                '@azure/functions': '^4.6.0',
                ...(isDrizzle ? {
                  'drizzle-orm': '^0.45.2',
                  pg: '^8.13.0',
                } : {}),
              },
              devDependencies: {
                '@types/node': '^22.0.0',
                typescript: '^5.8.0',
                ...(isDrizzle ? {
                  '@types/pg': '^8.11.0',
                } : {}),
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
                rootDir: isDrizzle ? 'src' : '.',
                strict: true,
                esModuleInterop: true,
                skipLibCheck: true,
                forceConsistentCasingInFileNames: true,
                resolveJsonModule: true,
                sourceMap: true,
                types: ['node'],
              },
              include: ['src/**/*.ts'],
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
                ...(config.includeDatabase ? {
                  DATABASE_URL: `postgresql://postgres:postgres@localhost:5432/${projectName}`,
                } : {}),
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
  title: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

// In-memory store — the database feature module replaces this
// with a real ORM client (Prisma or Drizzle).
const items: Item[] = [
  {
    id: '1',
    title: 'Create your app',
    description: 'Choose your frontend framework, ORM, and auth preferences to generate your Azure project.',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  },
  {
    id: '2',
    title: 'Develop locally',
    description: 'Run your full stack locally with SWA CLI and hot reload across frontend and API.',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  },
  {
    id: '3',
    title: 'Deploy to Azure',
    description: 'Provision infrastructure and deploy your app in one command with azd up.',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  },
  {
    id: '4',
    title: 'Set up CI/CD',
    description: 'Configure GitHub Actions with OIDC to auto-deploy on push with azd pipeline config.',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  },
];
let nextId = 5;

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
      title?: string;
      description?: string;
    };

    if (!body.title) {
      return { status: 400, jsonBody: { error: 'Title is required' } };
    }

    const now = new Date().toISOString();
    const item: Item = {
      id: String(nextId++),
      title: body.title,
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
      title?: string;
      description?: string;
    };

    items[index] = {
      ...items[index],
      ...(body.title !== undefined && { title: body.title }),
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
