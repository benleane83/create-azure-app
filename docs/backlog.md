# Feature and bug backlog for create-azure-app

- Migrate to OpenTelemetry native logging
- Add Redis for optional caching
- Add Blob Storage for files and assets
- Add optional deployment of separate Azure Functions resource

PNPM Specific:
- pnpm install skips builds unless pnpm approve-builds is run
- tsx was missing from devDependencies on pnpm app