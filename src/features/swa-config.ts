import type { Feature } from '../composer.js';
import type { PackageManager } from '../utils.js';
import { pmRun } from '../utils.js';
import type { Framework } from '../index.js';

interface SwaConfigOptions {
  framework: Framework;
  packageManager: PackageManager;
  includeAuth: boolean;
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
 * framework-specific dev server settings, and staticwebapp.config.json
 * with routing/platform config (auth-aware).
 */
export function swaConfigFeature(config: SwaConfigOptions): Feature {
  const swaConfig = buildSwaConfig(config.framework, config.packageManager);
  const staticDir =
    config.framework === 'sveltekit' ? 'src/web/static' : 'src/web/public';
  const appConfig = config.includeAuth ? authSwaAppConfig() : baseSwaAppConfig();

  return {
    name: 'swa-config',
    files: [
      {
        path: 'swa-cli.config.json',
        content: JSON.stringify(swaConfig, null, 2) + '\n',
      },
      { path: 'staticwebapp.config.json', content: appConfig },
      { path: `${staticDir}/staticwebapp.config.json`, content: appConfig },
    ],
  };
}

function baseSwaAppConfig(): string {
  return JSON.stringify(
    {
      navigationFallback: {
        rewrite: '/index.html',
        exclude: ['/images/*.{png,jpg,gif}', '/css/*', '/api/*'],
      },
      platform: {
        apiRuntime: 'node:20',
      },
    },
    null,
    2
  ) + '\n';
}

function authSwaAppConfig(): string {
  return JSON.stringify(
    {
      routes: [
        {
          route: '/login',
          redirect: '/.auth/login/aad',
        },
        {
          route: '/logout',
          redirect: '/.auth/logout',
        },
        {
          route: '/api/*',
          allowedRoles: ['authenticated'],
        },
        {
          route: '/*',
          allowedRoles: ['authenticated'],
        },
      ],
      responseOverrides: {
        '401': {
          redirect: '/.auth/login/aad',
          statusCode: 302,
        },
      },
      navigationFallback: {
        rewrite: '/index.html',
        exclude: ['/images/*.{png,jpg,gif}', '/css/*', '/api/*'],
      },
      platform: {
        apiRuntime: 'node:20',
      },
    },
    null,
    2
  ) + '\n';
}
