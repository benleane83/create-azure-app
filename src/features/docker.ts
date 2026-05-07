import type { Feature } from '../composer.js';

/**
 * Docker Compose feature — generates a docker-compose.yml with PostgreSQL 16
 * for local development. The container uses env vars from .env so passwords
 * are never hardcoded in the compose file itself.
 */
export function dockerFeature(config: { projectName: string }): Feature {
  const composeContent = `volumes:
  postgres_data:

services:
  postgres:
    image: postgres:16-alpine
    restart: unless-stopped
    ports:
      - "5432:5432"
    env_file:
      - .env.docker
    environment:
      POSTGRES_DB: ${config.projectName}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5
`;

  return {
    name: 'docker',
    files: [
      {
        path: 'docker-compose.yml',
        content: composeContent,
      },
      {
        path: '.env.docker',
        content: `POSTGRES_USER=postgres\nPOSTGRES_PASSWORD=postgres\n`,
      },
    ],
  };
}
