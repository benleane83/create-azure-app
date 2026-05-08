import type { Feature } from '../composer.js';
import type { ProjectConfig } from '../index.js';
import { pmRun } from '../utils.js';

export function copilotInstructionsFeature(config: ProjectConfig): Feature {
  const frameworkLabel =
    config.framework === 'nextjs' ? 'Next.js'
    : config.framework === 'vite-react' ? 'Vite + React'
    : 'SvelteKit';

  const ormLabel = config.orm === 'prisma' ? 'Prisma' : 'Drizzle';

  const authAddition = config.includeAuth ? ' · Entra ID (SWA Easy Auth)' : '';

  const staticExportNote =
    config.framework === 'nextjs'
      ? "The frontend uses `output: 'export'` (Next.js static export)"
      : config.framework === 'vite-react'
        ? 'The frontend builds to a static `dist/` folder'
        : 'The frontend uses `adapter-static` (SvelteKit static adapter)';

  const schemaFile =
    config.orm === 'prisma' ? 'db/schema.prisma' : 'src/api/src/db/schema.ts';

  const migrateCmd = pmRun(config.packageManager, 'db:migrate');
  const seedCmd = pmRun(config.packageManager, 'db:seed');

  const pageNote =
    config.framework === 'nextjs'
      ? "All pages must be Client Components (`'use client'`) since the app uses static export"
      : config.framework === 'vite-react'
        ? 'Edit or create components in `src/web/src/`'
        : 'Create new routes in `src/web/src/routes/`';

  const authRule = config.includeAuth
    ? `
6. **Auth is header-based** — SWA injects \`x-ms-client-principal\` on API requests. Use \`getUser()\` / \`requireAuth()\` from \`src/api/src/lib/auth.ts\`. Frontend auth via \`useAuth()\` from \`src/web/lib/auth.ts\` (calls \`/.auth/me\`). Do not add a custom auth provider.`
    : '';

  const content = `# Copilot Instructions — ${config.projectName}

This app was scaffolded by \`create-azure-app\`. It runs on Azure Static Web Apps (frontend) + Azure Functions v4 (API) + PostgreSQL, with local dev via SWA CLI and Docker Compose.

**Stack:** ${frameworkLabel} · ${ormLabel} · Azure Functions v4 · PostgreSQL${authAddition}

## Architecture Rules — Do Not Break These

1. **API routes at \`/api/*\`** — SWA proxies these to Azure Functions. Never change this prefix. New endpoints go in \`src/api/src/functions/\`.

2. **Azure Functions v4 pattern** — Every endpoint uses \`app.http('uniqueName', { ... })\`. Never use v3 \`function.json\` style.

3. **DB connection singleton** — Always import from \`src/api/src/lib/db.ts\`. Never instantiate a second client.

4. **Static export only** — ${staticExportNote}. No server-side rendering. All data fetching goes through the Azure Functions API at \`/api/*\`.

5. **\`staticwebapp.config.json\`** — Controls SWA routing and auth. You can add route rules but do not remove \`navigationFallback\` or \`platform.apiRuntime\`.${authRule}

## Customizing This App

The template ships with a generic \`User + Item\` schema. Replace it with your domain:

### 1. Update the schema
Edit \`${schemaFile}\` — rename or replace the \`Item\` model with your domain entities.

### 2. Migrate and seed
\`\`\`bash
${migrateCmd}
${seedCmd}
\`\`\`

### 3. Replace the API endpoints
Edit or replace \`src/api/src/functions/items.ts\`. Pattern for a new endpoint:

\`\`\`typescript
import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import db from '../lib/db.js';

app.http('myEndpoint', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'my-resource',
  handler: async (req: HttpRequest, ctx: InvocationContext): Promise<HttpResponseInit> => {
    return { jsonBody: { ok: true } };
  },
});
\`\`\`

### 4. Replace the frontend
Edit \`src/web/app/page.tsx\` with your UI. ${pageNote}.

## Files to Change

| File | Purpose |
|------|---------|
| \`${schemaFile}\` | Replace \`Item\` with your domain entities |
| \`db/seed.ts\` | Replace sample data |
| \`src/api/src/functions/items.ts\` | Replace with your API endpoints |
| \`src/web/app/page.tsx\` | Replace placeholder UI |
| \`src/web/app/globals.css\` | Customize theme and colors |
| \`src/web/app/layout.tsx\` | Update page title and metadata |

## Files to Leave Alone

| File | Why |
|------|-----|
| \`src/api/src/lib/db.ts\` | DB singleton — a second instance causes connection leaks |
| \`src/api/host.json\` | Azure Functions host config |
| \`staticwebapp.config.json\` | SWA routing and auth — only add rules, don't remove existing |
| \`swa-cli.config.json\` | Local dev proxy config |
| \`docker-compose.yml\` | Local PostgreSQL setup |
| \`infra/\` | Bicep IaC — only modify to add Azure resources |
| \`azure.yaml\` | AZD project config |
`;

  return {
    name: 'copilot-instructions',
    files: [{ path: '.github/copilot-instructions.md', content }],
    dependencies: {},
    devDependencies: {},
    scripts: {},
  };
}
