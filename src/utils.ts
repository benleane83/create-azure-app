export type PackageManager = 'npm' | 'pnpm' | 'yarn';

/**
 * Returns the command to run a package.json script.
 * npm:  "npm run dev"
 * pnpm: "pnpm run dev"
 * yarn: "yarn dev"
 */
export function pmRun(pm: PackageManager, script: string): string {
  if (pm === 'yarn') return `yarn ${script}`;
  return `${pm} run ${script}`;
}

/**
 * Returns the install command for the given package manager.
 */
export function pmInstall(pm: PackageManager): string {
  return `${pm} install`;
}
