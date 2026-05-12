import { describe, expect, it } from 'vitest';
import { baseFeature, buildRootPackageJson } from '../../src/features/base.js';

function getFileContent(files: Array<{ path: string; content: string }>, path: string): string {
  const file = files.find((entry) => entry.path === path);
  expect(file, `expected generated file ${path}`).toBeDefined();
  return file!.content;
}

describe('base feature module', () => {
  it('produces the expected root files and excludes framework-specific config', () => {
    const feature = baseFeature('test-app', 'npm', true);
    const paths = feature.files.map((file) => file.path);

    expect(paths).toEqual(['.gitignore', 'README.md', 'tsconfig.json']);
    expect(paths).not.toContain('next.config.js');
    expect(paths).not.toContain('vite.config.ts');
    expect(paths).not.toContain('svelte.config.js');
  });

  it('includes critical ignore patterns for secrets and build artifacts', () => {
    const feature = baseFeature('test-app', 'npm', true);
    const gitignore = getFileContent(feature.files, '.gitignore');

    expect(gitignore).toContain('node_modules/');
    expect(gitignore).toContain('dist/');
    expect(gitignore).toContain('.env');
    expect(gitignore).toContain('.env.local');
    expect(gitignore).toContain('.azure/');
  });

  it('includes database-specific quick start guidance only when the database is enabled', () => {
    const withDb = getFileContent(baseFeature('test-app', 'npm', true).files, 'README.md');
    const withoutDb = getFileContent(baseFeature('test-app', 'npm', false).files, 'README.md');

    expect(withDb).toContain('docker-compose.yml');
    expect(withDb).toContain('start local PostgreSQL');
    expect(withoutDb).not.toContain('docker-compose.yml');
    expect(withoutDb).not.toContain('start local PostgreSQL');
  });

  it('documents the local auth seed principal only for auth-enabled no-database apps', () => {
    const authNoDb = getFileContent(baseFeature('test-app', 'pnpm', false, true).files, 'README.md');
    const authWithDb = getFileContent(baseFeature('test-app', 'pnpm', true, true).files, 'README.md');
    const noAuthNoDb = getFileContent(baseFeature('test-app', 'pnpm', false, false).files, 'README.md');

    expect(authNoDb).toContain('local-dev-user');
    expect(authNoDb).toContain('starter API seeds four in-memory items');
    expect(authWithDb).not.toContain('local-dev-user');
    expect(noAuthNoDb).not.toContain('local-dev-user');
  });

  it('references the web and api workspaces in the root tsconfig', () => {
    const tsconfig = JSON.parse(getFileContent(baseFeature('test-app', 'npm', true).files, 'tsconfig.json')) as {
      references: Array<{ path: string }>;
      compilerOptions: { module: string; moduleResolution: string; target: string };
    };

    expect(tsconfig.references).toEqual([{ path: './src/web' }, { path: './src/api' }]);
    expect(tsconfig.compilerOptions).toMatchObject({
      target: 'ES2022',
      module: 'Node16',
      moduleResolution: 'Node16',
    });
  });

  it('builds a root package.json with merged scripts and sorted dependencies', () => {
    const pkg = JSON.parse(
      buildRootPackageJson(
        'my-cool-app',
        {
          files: [],
          dependencies: { zod: '^3.23.0', react: '^19.0.0' },
          devDependencies: { vitest: '^3.2.0', typescript: '^5.8.0' },
          scripts: { lint: 'eslint .' },
        },
        'pnpm'
      )
    ) as {
      name: string;
      type: string;
      private: boolean;
      scripts: Record<string, string>;
      dependencies: Record<string, string>;
      devDependencies: Record<string, string>;
    };

    expect(pkg.name).toBe('my-cool-app');
    expect(pkg.type).toBe('module');
    expect(pkg.private).toBe(true);
    expect(pkg.scripts).toMatchObject({
      build: 'pnpm run build:web && pnpm run build:api',
      lint: 'eslint .',
    });
    expect(Object.keys(pkg.dependencies)).toEqual(['react', 'zod']);
    expect(Object.keys(pkg.devDependencies)).toEqual(['typescript', 'vitest']);
  });
});
