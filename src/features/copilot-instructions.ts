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
  const dbAddition = config.includeDatabase ? ` · ${ormLabel} · PostgreSQL` : '';

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
6. **Auth is header-based** — SWA injects \`x-ms-client-principal\` on API requests. Use \`getUser()\` / \`requireAuth()\` from \`src/api/src/lib/auth.ts\`. Frontend auth via \`useAuth()\` from \`src/web/lib/auth.ts\` (calls \`/.auth/me\`). Do not add a custom auth provider.

7. **Ownership comes from the signed-in principal** — Never accept \`userId\`, \`ownerId\`, or similar ownership fields from API clients. Derive the acting user on the server from \`requireAuth()\` and scope queries/mutations to that user.`
    : '';

  const dbRule = config.includeDatabase
    ? `\n\n3. **DB connection singleton** — Always import from \`src/api/src/lib/db.ts\`. Never instantiate a second client.`
    : '';

  const dbCustomization = config.includeDatabase ? `

## Customizing This App

The template ships with a generic \`User + Item\` schema. Replace it with your domain:

### 1. Update the schema
Edit \`${schemaFile}\` — rename or replace the \`Item\` model with your domain entities.

### 2. Migrate and seed
\`\`\`bash
${migrateCmd}
${seedCmd}
\`\`\`

### 3. Replace the API endpoints` : `

## Customizing This App

### 1. Replace the API endpoints`;

  const dbFilesToChange = config.includeDatabase ? `| \`${schemaFile}\` | Replace \`Item\` with your domain entities |
| \`db/seed.ts\` | Replace sample data |
` : '';

  const dbFilesToLeaveAlone = config.includeDatabase ? `| \`src/api/src/lib/db.ts\` | DB singleton — a second instance causes connection leaks |
| \`docker-compose.yml\` | Local PostgreSQL setup |
` : '';

  const dbEndpointImport = config.includeDatabase
    ? `import db from '../lib/db.js';\n\n`
    : '';

  const content = `# Copilot Instructions — ${config.projectName}

This app was scaffolded by \`create-azure-app\`. It runs on Azure Static Web Apps (frontend) + Azure Functions v4 (API)${config.includeDatabase ? ' + PostgreSQL' : ''}, with local dev via SWA CLI${config.includeDatabase ? ' and Docker Compose' : ''}.

**Stack:** ${frameworkLabel} · Azure Functions v4${dbAddition}${authAddition}

## Architecture Rules — Do Not Break These

1. **API routes at \`/api/*\`** — SWA proxies these to Azure Functions. Never change this prefix. New endpoints go in \`src/api/src/functions/\`.

2. **Azure Functions v4 pattern** — Every endpoint uses \`app.http('uniqueName', { ... })\`. Never use v3 \`function.json\` style.${dbRule}

${config.includeDatabase ? '4' : '3'}. **Static export only** — ${staticExportNote}. No server-side rendering. All data fetching goes through the Azure Functions API at \`/api/*\`.

${config.includeDatabase ? '5' : '4'}. **\`staticwebapp.config.json\`** — Controls SWA routing and auth. You can add route rules but do not remove \`navigationFallback\` or \`platform.apiRuntime\`.${authRule}
${dbCustomization}
Edit or replace \`src/api/src/functions/items.ts\`. Pattern for a new endpoint:

\`\`\`typescript
import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
${dbEndpointImport}app.http('myEndpoint', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'my-resource',
  handler: async (req: HttpRequest, ctx: InvocationContext): Promise<HttpResponseInit> => {
    return { jsonBody: { ok: true } };
  },
});
\`\`\`

${config.includeDatabase ? '### 4.' : '### 2.'} Replace the frontend
Edit \`src/web/app/page.tsx\` with your UI. ${pageNote}.

## Files to Change

| File | Purpose |
|------|---------|
${dbFilesToChange}| \`src/api/src/functions/items.ts\` | Replace with your API endpoints |
| \`src/web/app/page.tsx\` | Replace placeholder UI |
| \`src/web/app/globals.css\` | Customize theme and colors |
| \`src/web/app/layout.tsx\` | Update page title and metadata |

## Files to Leave Alone

| File | Why |
|------|-----|
${dbFilesToLeaveAlone}| \`src/api/host.json\` | Azure Functions host config |
| \`staticwebapp.config.json\` | SWA routing and auth — only add rules, don't remove existing |
| \`swa-cli.config.json\` | Local dev proxy config |
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
