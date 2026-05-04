# Plan: Azure Full-Stack App Scaffolder ("create-azure-app")

Build a `create-azure-app` interactive CLI (inspired by `create-t3-app`) that scaffolds an AZD-compatible full-stack project with opinionated defaults. The generated project uses **Azure Static Web Apps + Azure Functions + PostgreSQL Flexible Server + Entra ID auth**, with a local dev story powered by Docker Compose + SWA CLI. Users run `npx create-azure-app`, answer a few questions, and get a deployable full-stack app via `azd up`.

---

## Key Research Findings

**What makes Vercel + Supabase compelling:**
- Git push → live preview URL in 30s (per-PR preview environments)
- Local = production parity (real Postgres via Docker)
- Type-safe DB client auto-generated from schema
- Auth pre-configured and working out of the box
- Environment variables auto-wired between services
- Zero DevOps — hosting + infra fully managed

**Azure service mapping:**

| Vercel+Supabase | Azure Equivalent | Notes |
|---|---|---|
| Vercel hosting | Azure Static Web Apps (SWA) | CDN, auto-SSL, PR previews, GitHub integration |
| Serverless functions | Azure Functions (SWA-managed) | HTTP triggers, integrated routing via SWA |
| Supabase Postgres | PostgreSQL Flexible Server | Burstable B1ms ~$15/mo dev tier, Entra ID passwordless |
| Supabase Auth | SWA Easy Auth + Entra ID | GitHub, Entra, Google via custom OIDC |
| Supabase client SDK | Prisma / Drizzle ORM | Type-safe DB access + schema migrations |
| Local dev | Docker Compose + SWA CLI + func CLI | Local Postgres + SWA proxy on :4280 |

**Critical finding:** SWA Database Connections feature was **retired Nov 2025**. Must use Azure Functions as API layer.

**AZD capability discovered:** The new `resources` block in `azure.yaml` supports declarative resource definitions (`db.postgres`, `storage`, `keyvault`, etc.) without writing Bicep manually — significantly reduces boilerplate.

---

## Approaches Considered

| Approach | Description | Verdict |
|---|---|---|
| **A: Custom CLI scaffolder** | `create-t3-app`-style CLI → generates AZD-compatible project | **Recommended** — most modular, closest to target DX |
| B: Single AZD template | Rich template with post-init hooks | No interactivity for feature selection |
| C: VS Code extension | Guided wizard in IDE | High complexity, VS Code dependency |
| D: Template family + thin CLI | Multiple templates, CLI selects one | Combinatorial explosion of templates |

**Recommended: Option A.** The CLI generates an AZD-compatible project, so users still get full `azd up` / `azd deploy` workflows. Best of both worlds.

---

## Architecture

**Generated project structure:**
```
my-app/
├── azure.yaml                  # AZD manifest (services + resources block)
├── infra/
│   ├── main.bicep              # Root Bicep template
│   └── modules/
│       ├── swa.bicep           # Static Web App + managed Functions
│       ├── postgres.bicep      # PostgreSQL Flexible Server
│       └── monitoring.bicep    # App Insights
├── src/
│   ├── web/                    # Frontend (Next.js | React+Vite | SvelteKit)
│   └── api/                    # Azure Functions API (TypeScript v4 model)
│       └── src/
│           ├── functions/      # HTTP trigger endpoints (CRUD examples)
│           └── lib/
│               ├── db.ts       # Prisma/Drizzle client
│               └── auth.ts     # Reads SWA x-ms-client-principal header
├── db/
│   ├── migrations/             # Schema migrations
│   ├── schema.prisma           # (or Drizzle schema)
│   └── seed.ts
├── docker-compose.yml          # Local Postgres
├── swa-cli.config.json         # SWA CLI local dev config
├── staticwebapp.config.json    # SWA auth routes + guards
├── .github/workflows/          # CI/CD pipeline
├── scripts/
│   └── migrate.sh              # DB migration hook for azd
└── .env.example
```

**Developer workflow (target):**
```
npx create-azure-app my-app     # Interactive: pick framework, ORM, auth
cd my-app && npm run setup      # Docker Compose (Postgres) + migrate + seed
npm run dev                     # SWA CLI proxies everything on :4280
# ...develop...
azd up                          # Provision Azure resources + deploy
# Push to GitHub → automatic PR preview environments
```

---

## Steps

### Phase 1: Core CLI scaffolder
1. Initialize CLI project as TypeScript Node.js package (publish as `create-azure-app`)
2. Implement interactive prompts (using `clack` for modern CLI UX):
   - Project name, frontend framework (Next.js default | Vite | SvelteKit), ORM (Prisma default | Drizzle), auth (yes/no), package manager
3. Implement template composition engine — each feature (auth, db, functions) is a composable module that injects files and modifies shared config

### Phase 2: Starter templates (the generated code)
4. Create base frontend templates per framework — *parallel with step 5*
5. Create Azure Functions API template: TypeScript v4 model, health check, CRUD example, DB client, auth middleware
6. Create database setup: Prisma/Drizzle schema with User + example model, migrations, seed script, Docker Compose for local Postgres
7. Create auth integration: `staticwebapp.config.json` with route guards, frontend auth hooks, API auth middleware (reads `x-ms-client-principal`)

### Phase 3: Infrastructure-as-Code — *depends on Phase 2*
8. Create Bicep modules: SWA, PostgreSQL Flexible Server (Entra ID auth + managed identity), App Insights, Key Vault
9. Create `azure.yaml` with `resources` block + service definitions + deploy hooks (DB migration)
10. Create parameterized `main.bicep` that conditionally includes modules

### Phase 4: Local dev experience — *parallel with Phase 3*
11. Create `swa-cli.config.json` templates for each frontend framework
12. Create `docker-compose.yml` for Postgres (health checks, persistent volume)
13. Create `npm run dev` / `npm run setup` scripts, `.env.example` with env-loading

### Phase 5: CI/CD & deployment — *depends on Phase 3*
14. Create GitHub Actions workflow: PR preview deploys (SWA native), production deploy on merge, DB migration step
15. Wire `azd pipeline config` support

### Phase 6: Polish
16. Generate README with getting-started instructions
17. Publish to npm

---

## Verification
1. `npx create-azure-app my-test-app` → prompts work, project generated with correct structure
2. `npm run setup` → Docker Compose starts Postgres, migrations run, seed succeeds
3. `npm run dev` → SWA CLI serves on :4280, frontend renders, API responds, auth emulator works
4. `azd up` → resources provision, app deploys, endpoint is live
5. Push PR to GitHub → SWA creates preview environment automatically
6. Auth flow: login via Entra ID → protected routes work → API receives auth context
7. DB flow: CRUD through API → data persists in PostgreSQL
8. `azd down` → clean teardown

---

## Decisions
- **SWA over App Service**: SWA provides built-in PR previews, CDN, auth, and managed Functions — closest to Vercel DX
- **Functions over Container Apps**: Functions integrate natively with SWA (managed functions), simpler for API workloads. ACA is better for long-running backends (future module)
- **SWA Easy Auth over custom auth**: Zero-code auth with Entra ID, GitHub, Google. Less flexible than Supabase Auth but zero setup
- **Prisma as default ORM**: Wider adoption, robust migration tooling, type generation. Drizzle as opt-in alternative
- **Custom CLI over AZD-only**: AZD doesn't support interactive feature selection during `init`. CLI generates AZD-compatible output
- **Not using SWA Database Connections**: Retired Nov 2025

---

## Further Considerations

1. **Email/password auth gap**: SWA Easy Auth doesn't support email/password natively. Options: (A) Azure AD B2C as custom OIDC provider — adds complexity + cost, (B) Accept social + Entra-only for MVP. **Choice: B for MVP, A as follow-up module.**

2. **Database cost floor**: PostgreSQL Flexible Server minimum ~$12-15/mo vs Supabase free tier. **Choice: Accept — target is enterprise/team users, not indie devs. This is an advantage for production workloads.**

3. **Real-time capabilities**: Supabase offers real-time subscriptions out of the box. Azure equivalent requires Azure SignalR Service. **Choice: Out of scope for MVP, add as optional module later.**
