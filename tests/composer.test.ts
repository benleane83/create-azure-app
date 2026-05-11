import { describe, expect, it } from 'vitest';
import { compose, type Feature } from '../src/composer.js';
import { apiFeature } from '../src/features/api.js';
import { baseFeature, buildRootPackageJson } from '../src/features/base.js';
import { infraFeature } from '../src/features/infra.js';
import { nextjsFeature } from '../src/features/nextjs.js';
import type { ProjectConfig } from '../src/index.js';

function getFixtureConfig(): ProjectConfig {
  return {
    projectName: 'demo-app',
    framework: 'nextjs',
    orm: 'prisma',
    includeAuth: true,
    includeDatabase: true,
    includeTailwind: true,
    packageManager: 'npm',
  };
}

describe('template composition engine', () => {
  it('produces all files and metadata from a single feature', () => {
    const feature: Feature = {
      name: 'single',
      files: [{ path: 'src/index.ts', content: 'export const ok = true;\n' }],
      dependencies: { react: '^19.0.0' },
      devDependencies: { typescript: '^5.8.0' },
      scripts: { build: 'tsc' },
    };

    const result = compose([feature]);

    expect(result.files).toEqual(feature.files);
    expect(result.dependencies).toEqual({ react: '^19.0.0' });
    expect(result.devDependencies).toEqual({ typescript: '^5.8.0' });
    expect(result.scripts).toEqual({ build: 'tsc' });
  });

  it('merges dependencies, devDependencies, and scripts across features', () => {
    const base: Feature = {
      name: 'base',
      files: [{ path: '.gitignore', content: 'node_modules\n' }],
      dependencies: { react: '^19.0.0' },
      devDependencies: { typescript: '^5.8.0' },
      scripts: { build: 'tsc' },
    };
    const addon: Feature = {
      name: 'addon',
      files: [{ path: 'src/app.ts', content: 'export {};\n' }],
      dependencies: { zod: '^3.23.0' },
      devDependencies: { vitest: '^3.2.0' },
      scripts: { test: 'vitest run' },
    };

    const result = compose([base, addon]);

    expect(result.files.map((file) => file.path)).toEqual(['.gitignore', 'src/app.ts']);
    expect(result.dependencies).toEqual({ react: '^19.0.0', zod: '^3.23.0' });
    expect(result.devDependencies).toEqual({ typescript: '^5.8.0', vitest: '^3.2.0' });
    expect(result.scripts).toEqual({ build: 'tsc', test: 'vitest run' });
  });

  it('uses the last feature when multiple features write the same file path', () => {
    const result = compose([
      {
        name: 'first',
        files: [{ path: 'README.md', content: '# First\n' }],
      },
      {
        name: 'second',
        files: [{ path: 'README.md', content: '# Second\n' }],
      },
    ]);

    expect(result.files).toEqual([{ path: 'README.md', content: '# Second\n' }]);
  });

  it('builds a composed project with root azure.yaml and web/api trees', () => {
    const config = getFixtureConfig();
    const result = compose([
      baseFeature(config.projectName, config.packageManager, config.includeDatabase),
      nextjsFeature(config),
      apiFeature(config),
      infraFeature(config),
    ]);

    const paths = result.files.map((file) => file.path);

    expect(paths).toContain('azure.yaml');
    expect(paths).toContain('src/web/package.json');
    expect(paths).toContain('src/api/package.json');
  });

  it('buildRootPackageJson merges composed metadata into the final root package', () => {
    const rootPkg = JSON.parse(
      buildRootPackageJson(
        'demo-app',
        {
          files: [],
          dependencies: { zod: '^3.23.0', react: '^19.0.0' },
          devDependencies: { vitest: '^3.2.0', typescript: '^5.8.0' },
          scripts: { test: 'vitest run' },
        },
        'npm'
      )
    ) as {
      name: string;
      scripts: Record<string, string>;
      dependencies: Record<string, string>;
      devDependencies: Record<string, string>;
      type: string;
      private: boolean;
    };

    expect(rootPkg.name).toBe('demo-app');
    expect(rootPkg.type).toBe('module');
    expect(rootPkg.private).toBe(true);
    expect(rootPkg.scripts).toMatchObject({
      build: 'npm run build:web && npm run build:api',
      test: 'vitest run',
    });
    expect(Object.keys(rootPkg.dependencies)).toEqual(['react', 'zod']);
    expect(Object.keys(rootPkg.devDependencies)).toEqual(['typescript', 'vitest']);
  });
});
