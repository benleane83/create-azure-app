import type { Feature } from '../composer.js';
import type { PackageManager } from '../utils.js';
import { pmRun } from '../utils.js';

type Framework = 'nextjs' | 'vite-react' | 'sveltekit';

interface SwaConfigOptions {
  framework: Framework;
  packageManager: PackageManager;
}

interface SwaCliConfig {
  configurations: {
    default: {
      appLocation: string;
      apiLocation: string;
      outputLocation: string;
      appDevserverUrl: string;
      apiLanguage: string;
      apiVersion: string;
      run?: string;
      host: string;
      port: number;
    };
  };
}

function buildSwaConfig(framework: Framework, packageManager: PackageManager): SwaCliConfig {
  const base = {
    appLocation: 'src/web',
    apiLocation: 'src/api',
    host: 'localhost',
    port: 4280,
    apiLanguage: 'node',
    apiVersion: '20',
  };

  switch (framework) {
    case 'nextjs':
      return {
        configurations: {
          default: {
            ...base,
            outputLocation: 'out',
            appDevserverUrl: 'http://localhost:3000',
            run: pmRun(packageManager, 'dev'),
          },
        },
      };

    case 'vite-react':
      return {
        configurations: {
          default: {
            ...base,
            outputLocation: 'dist',
            appDevserverUrl: 'http://localhost:5173',
            run: pmRun(packageManager, 'dev'),
          },
        },
      };

    case 'sveltekit':
      return {
        configurations: {
          default: {
            ...base,
            outputLocation: 'build',
            appDevserverUrl: 'http://localhost:5173',
            run: pmRun(packageManager, 'dev'),
          },
        },
      };
  }
}

/**
 * SWA CLI config feature — generates swa-cli.config.json with
 * framework-specific dev server settings.
 */
export function swaConfigFeature(config: SwaConfigOptions): Feature {
  const swaConfig = buildSwaConfig(config.framework, config.packageManager);

  return {
    name: 'swa-config',
    files: [
      {
        path: 'swa-cli.config.json',
        content: JSON.stringify(swaConfig, null, 2) + '\n',
      },
    ],
  };
}
