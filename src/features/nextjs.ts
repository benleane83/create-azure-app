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
                ...(config.includeTailwind ? {
                  tailwindcss: '^4.0.0',
                  '@tailwindcss/postcss': '^4.0.0',
                } : {}),
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
        content: `'use client';
import { useEffect, useState } from 'react';

interface Item {
  id: number;
  title: string;
  description: string | null;
  completed: boolean;
}

export default function Home() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/items')
      .then((res) => {
        if (!res.ok) throw new Error(\`HTTP \${res.status}\`);
        return res.json();
      })
      .then((data) => setItems(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <main>
      <h1>${projectName}</h1>
      <p>Your Azure full-stack app is ready.</p>
      <nav>
        <a href="/api/health">API Health Check</a>
      </nav>
      <section className="items-section">
        <h2>Items</h2>
        {loading && <p className="items-status">Loading items...</p>}
        {error && (
          <p className="items-status items-error">Could not load items: {error}</p>
        )}
        {!loading && !error && items.length === 0 && (
          <p className="items-status">
            No items yet. Run <code>npm run db:seed</code> to add sample data.
          </p>
        )}
        {items.length > 0 && (
          <ul className="items-grid">
            {items.map((item) => (
              <li key={item.id} className="item-card">
                <span
                  className={\`badge \${
                    item.completed ? 'badge-done' : 'badge-todo'
                  }\`}
                >
                  {item.completed ? 'Done' : 'Todo'}
                </span>
                <h3>{item.title}</h3>
                {item.description && <p>{item.description}</p>}
              </li>
            ))}
          </ul>
        )}
      </section>
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

.items-section {
  margin-top: 2.5rem;
  border-top: 1px solid #e5e7eb;
  padding-top: 1.5rem;
}

.items-section h2 {
  font-size: 1.5rem;
  font-weight: 600;
  margin-bottom: 1rem;
}

.items-status {
  color: #6b7280;
  font-size: 0.875rem;
}

.items-error {
  color: #dc2626;
}

.items-grid {
  list-style: none;
  display: grid;
  gap: 0.75rem;
}

.item-card {
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
  padding: 1rem;
}

.item-card h3 {
  font-size: 1rem;
  font-weight: 600;
  margin: 0.25rem 0;
}

.item-card p {
  font-size: 0.875rem;
  color: #6b7280;
  margin: 0;
}

.badge {
  display: inline-block;
  font-size: 0.75rem;
  font-weight: 500;
  padding: 0.125rem 0.5rem;
  border-radius: 9999px;
}

.badge-done {
  background: #d1fae5;
  color: #065f46;
}

.badge-todo {
  background: #fef3c7;
  color: #92400e;
}

code {
  background: #f3f4f6;
  padding: 0.125rem 0.375rem;
  border-radius: 0.25rem;
  font-size: 0.875rem;
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
