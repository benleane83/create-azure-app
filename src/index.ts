#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { execFile } from 'node:child_process';
import * as p from '@clack/prompts';
import pc from 'picocolors';
import { compose, writeProject } from './composer.js';
import { baseFeature, buildRootPackageJson } from './features/base.js';
import { pmRun, pmInstall, type PackageManager } from './utils.js';
import { nextjsFeature } from './features/nextjs.js';
import { viteReactFeature } from './features/vite-react.js';
import { sveltekitFeature } from './features/sveltekit.js';
import { apiFeature } from './features/api.js';
import { databaseFeature } from './features/database.js';
import { authFeature } from './features/auth.js';
import { dockerFeature } from './features/docker.js';
import { swaConfigFeature } from './features/swa-config.js';
import { envFeature } from './features/env.js';
import { infraFeature } from './features/infra.js';
import { cicdFeature } from './features/cicd.js';
import { tailwindFeature } from './features/tailwind.js';
import { copilotInstructionsFeature } from './features/copilot-instructions.js';

export type Framework = 'nextjs' | 'vite-react' | 'sveltekit';
export type ORM = 'prisma' | 'drizzle';

export interface ProjectConfig {
  projectName: string;
  framework: Framework;
  orm: ORM;
  includeAuth: boolean;
  includeTailwind: boolean;
  packageManager: PackageManager;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (args.includes('--version') || args.includes('-v')) {
    const pkgPath = new URL('../package.json', import.meta.url);
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
    console.log(pkg.version);
    process.exit(0);
  }
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`Usage: create-azure-app [project-name] [options]

Options:
  -v, --version  Show version number
  -h, --help     Show help

Run without options for the interactive setup wizard.`);
    process.exit(0);
  }

  // Extract positional project name (first arg that doesn't start with -)
  const positionalName = args.find((a) => !a.startsWith('-'));

  p.intro(pc.bgCyan(pc.black(' create-azure-app ')));

  const answers = await p.group(
    {
      projectName: () =>
        positionalName
          ? Promise.resolve(positionalName)
          : p.text({
              message: 'What is your project name?',
              placeholder: 'my-azure-app',
              defaultValue: 'my-azure-app',
              validate: (value) => {
                if (!value) return 'Project name is required.';
                if (!/^[a-z0-9-]+$/.test(value))
                  return 'Project name must be lowercase alphanumeric with hyphens only.';
              },
            }),

      framework: () =>
        p.select({
          message: 'Which frontend framework?',
          options: [
            { value: 'nextjs' as const, label: 'Next.js' },
            { value: 'vite-react' as const, label: 'Vite + React' },
            { value: 'sveltekit' as const, label: 'SvelteKit' },
          ],
          initialValue: 'nextjs' as const,
        }),

      orm: () =>
        p.select({
          message: 'Which ORM?',
          options: [
            { value: 'prisma' as const, label: 'Prisma' },
            { value: 'drizzle' as const, label: 'Drizzle' },
          ],
          initialValue: 'prisma' as const,
        }),

      includeAuth: () =>
        p.confirm({
          message: 'Include authentication (Entra ID via SWA Easy Auth)?',
          initialValue: true,
        }),

      includeTailwind: () =>
        p.confirm({
          message: 'Include Tailwind CSS?',
          initialValue: true,
        }),

      packageManager: () =>
        p.select({
          message: 'Which package manager?',
          options: [
            { value: 'npm' as const, label: 'npm' },
            { value: 'pnpm' as const, label: 'pnpm' },
            { value: 'yarn' as const, label: 'yarn' },
          ],
          initialValue: 'npm' as const,
        }),
    },
    {
      onCancel: () => {
        p.cancel('Operation cancelled.');
        process.exit(0);
      },
    }
  );

  const config: ProjectConfig = {
    projectName: answers.projectName as string,
    framework: answers.framework as Framework,
    orm: answers.orm as ORM,
    includeAuth: answers.includeAuth as boolean,
    includeTailwind: answers.includeTailwind as boolean,
    packageManager: answers.packageManager as PackageManager,
  };

  p.note(
    [
      `${pc.bold('Project:')}      ${config.projectName}`,
      `${pc.bold('Framework:')}    ${formatFramework(config.framework)}`,
      `${pc.bold('ORM:')}          ${formatORM(config.orm)}`,
      `${pc.bold('Auth:')}         ${config.includeAuth ? 'Yes (Entra ID)' : 'No'}`,
      `${pc.bold('Tailwind:')}     ${config.includeTailwind ? 'Yes (v4)' : 'No'}`,
      `${pc.bold('Pkg Manager:')}  ${config.packageManager}`,
    ].join('\n'),
    'Project Configuration'
  );

  // Assemble features based on user choices
  const frameworkFeature =
    config.framework === 'nextjs' ? nextjsFeature(config) :
    config.framework === 'vite-react' ? viteReactFeature(config) :
    sveltekitFeature(config);

  const features = [
    baseFeature(config.projectName, config.packageManager),
    frameworkFeature,
    apiFeature(config),
    databaseFeature({ orm: config.orm, projectName: config.projectName }),
    dockerFeature({ projectName: config.projectName }),
    swaConfigFeature({ framework: config.framework, packageManager: config.packageManager, includeAuth: config.includeAuth }),
    envFeature({ projectName: config.projectName, orm: config.orm, includeAuth: config.includeAuth, packageManager: config.packageManager }),
    infraFeature(config),
    cicdFeature({ projectName: config.projectName, framework: config.framework, packageManager: config.packageManager }),
    copilotInstructionsFeature(config),
  ];

  if (config.includeTailwind) {
    features.push(tailwindFeature({ framework: config.framework }));
  }

  if (config.includeAuth) {
    features.push(authFeature(config));
  }

  // Compose all features into a unified project
  const composed = compose(features);
  const rootPkgContent = buildRootPackageJson(config.projectName, composed, config.packageManager);
  const allFiles = [
    ...composed.files,
    { path: 'package.json', content: rootPkgContent },
  ];

  // Resolve output directory and check for existing
  const projectDir = resolve(process.cwd(), config.projectName);

  if (existsSync(projectDir)) {
    const shouldOverwrite = await p.confirm({
      message: `Directory ./${config.projectName} already exists. Overwrite?`,
      initialValue: false,
    });

    if (p.isCancel(shouldOverwrite) || !shouldOverwrite) {
      p.cancel('Project generation cancelled.');
      process.exit(0);
    }
  }

  // Generate project files
  const s = p.spinner();
  s.start('Generating project files...');

  await writeProject(projectDir, allFiles);

  s.stop(`Generated ${allFiles.length} files.`);

  // Initialize git repo
  await new Promise<void>((res) => {
    execFile('git', ['init', '-b', 'main'], { cwd: projectDir }, (err) => {
      if (err) {
        p.log.warn('Could not initialize git repository. Is git installed?');
      } else {
        p.log.success('Initialized git repository.');
      }
      res();
    });
  });

  // Success!
  p.note(
    [
      `cd ${config.projectName}`,
      `${pmInstall(config.packageManager)}         # Install root dependencies`,
      `${pmRun(config.packageManager, 'setup')}    # Start Docker + install sub-projects + migrations + seed`,
      `${pmRun(config.packageManager, 'dev')}      # Start dev server on localhost:4280`,
    ].join('\n'),
    'Next steps'
  );

  p.outro(pc.green(`✅ Project created at ./${config.projectName}`));
}

function formatFramework(fw: Framework): string {
  const labels: Record<Framework, string> = {
    'nextjs': 'Next.js',
    'vite-react': 'Vite + React',
    'sveltekit': 'SvelteKit',
  };
  return labels[fw];
}

function formatORM(orm: ORM): string {
  const labels: Record<ORM, string> = {
    prisma: 'Prisma',
    drizzle: 'Drizzle',
  };
  return labels[orm];
}

main().catch((err) => {
  p.log.error('Unexpected error:');
  console.error(err);
  process.exit(1);
});
