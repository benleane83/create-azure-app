import type { Feature } from '../composer.js';
import type { ProjectConfig } from '../index.js';
import { pmRun, pmInstall } from '../utils.js';

export function nextjsFeature(config: ProjectConfig): Feature {
  const { projectName } = config;

  return {
    name: 'nextjs',
    files: [
      {
        path: 'src/web/package.json',
        content:
          JSON.stringify(
            {
              name: `${projectName}-web`,
              version: '0.1.0',
              private: true,
              scripts: {
                dev: 'next dev',
                build: 'next build',
                start: 'next start',
                lint: 'next lint',
              },
              dependencies: {
                next: '^15.3.0',
                react: '^19.1.0',
                'react-dom': '^19.1.0',
              },
              devDependencies: {
                '@types/node': '^22.0.0',
                '@types/react': '^19.1.0',
                '@types/react-dom': '^19.1.0',
                typescript: '^5.8.0',
              },
            },
            null,
            2
          ) + '\n',
      },
      {
        path: 'src/web/tsconfig.json',
        content:
          JSON.stringify(
            {
              compilerOptions: {
                target: 'ES2017',
                lib: ['dom', 'dom.iterable', 'esnext'],
                allowJs: true,
                skipLibCheck: true,
                strict: true,
                noEmit: true,
                esModuleInterop: true,
                module: 'esnext',
                moduleResolution: 'bundler',
                resolveJsonModule: true,
                isolatedModules: true,
                jsx: 'preserve',
                incremental: true,
                plugins: [{ name: 'next' }],
                paths: { '@/*': ['./*'] },
              },
              include: [
                'next-env.d.ts',
                '**/*.ts',
                '**/*.tsx',
                '.next/types/**/*.ts',
              ],
              exclude: ['node_modules'],
            },
            null,
            2
          ) + '\n',
      },
      {
        path: 'src/web/next.config.js',
        content: `/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
};

module.exports = nextConfig;
`,
      },
      {
        path: 'src/web/app/layout.tsx',
        content: `import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '${projectName}',
  description: 'Built with create-azure-app',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
`,
      },
      {
        path: 'src/web/app/page.tsx',
        content: `export default function Home() {
  return (
    <main>
      <h1>${projectName}</h1>
      <p>Your Azure full-stack app is ready.</p>
      <nav>
        <a href="/api/health">API Health Check</a>
      </nav>
    </main>
  );
}
`,
      },
      {
        path: 'src/web/app/globals.css',
        content: `*,
*::before,
*::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto,
    sans-serif;
  line-height: 1.6;
  color: #111827;
  max-width: 48rem;
  margin: 0 auto;
  padding: 2rem 1rem;
}

h1 {
  font-size: 2.25rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
}

p {
  margin-bottom: 1.5rem;
  color: #4b5563;
}

a {
  color: #2563eb;
  text-decoration: none;
}

a:hover {
  text-decoration: underline;
}

nav {
  display: flex;
  gap: 1rem;
}
`,
      },
    ],
    scripts: {
      'install:web': `cd src/web && ${pmInstall(config.packageManager)}`,
      'dev:web': `cd src/web && ${pmRun(config.packageManager, 'dev')}`,
      'build:web': `cd src/web && ${pmRun(config.packageManager, 'build')}`,
    },
  };
}
