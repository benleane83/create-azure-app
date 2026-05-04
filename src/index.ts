#!/usr/bin/env node

import * as p from '@clack/prompts';
import pc from 'picocolors';

type Framework = 'nextjs' | 'vite-react' | 'sveltekit';
type ORM = 'prisma' | 'drizzle';
type PackageManager = 'npm' | 'pnpm' | 'yarn';

export interface ProjectConfig {
  projectName: string;
  framework: Framework;
  orm: ORM;
  includeAuth: boolean;
  packageManager: PackageManager;
}

async function main(): Promise<void> {
  p.intro(pc.bgCyan(pc.black(' create-azure-app ')));

  const answers = await p.group(
    {
      projectName: () =>
        p.text({
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
            { value: 'nextjs' as const, label: 'Next.js', hint: 'recommended' },
            { value: 'vite-react' as const, label: 'Vite + React' },
            { value: 'sveltekit' as const, label: 'SvelteKit' },
          ],
          initialValue: 'nextjs' as const,
        }),

      orm: () =>
        p.select({
          message: 'Which ORM?',
          options: [
            { value: 'prisma' as const, label: 'Prisma', hint: 'recommended' },
            { value: 'drizzle' as const, label: 'Drizzle' },
          ],
          initialValue: 'prisma' as const,
        }),

      includeAuth: () =>
        p.confirm({
          message: 'Include authentication (Entra ID via SWA Easy Auth)?',
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
    packageManager: answers.packageManager as PackageManager,
  };

  p.note(
    [
      `${pc.bold('Project:')}      ${config.projectName}`,
      `${pc.bold('Framework:')}    ${formatFramework(config.framework)}`,
      `${pc.bold('ORM:')}          ${formatORM(config.orm)}`,
      `${pc.bold('Auth:')}         ${config.includeAuth ? 'Yes (Entra ID)' : 'No'}`,
      `${pc.bold('Pkg Manager:')}  ${config.packageManager}`,
    ].join('\n'),
    'Project Configuration'
  );

  // TODO: Phase 2 — compose features and write project to disk
  p.log.info('Project generation not yet implemented — feature modules coming in Phase 2.');

  p.outro(pc.green('Done! Configuration captured successfully.'));
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
