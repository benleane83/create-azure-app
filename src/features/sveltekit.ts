import type { Feature } from '../composer.js';
import type { ProjectConfig } from '../index.js';
import { pmRun, pmInstall } from '../utils.js';

export function sveltekitFeature(config: ProjectConfig): Feature {
  const { projectName } = config;

  return {
    name: 'sveltekit',
    files: [
      {
        path: 'src/web/package.json',
        content:
          JSON.stringify(
            {
              name: `${projectName}-web`,
              version: '0.1.0',
              private: true,
              type: 'module',
              scripts: {
                dev: 'vite dev',
                build: 'vite build',
                preview: 'vite preview',
                check: 'svelte-kit sync && svelte-check --tsconfig ./tsconfig.json',
              },
              devDependencies: {
                '@sveltejs/adapter-static': '^3.0.0',
                '@sveltejs/kit': '^2.15.0',
                '@sveltejs/vite-plugin-svelte': '^5.0.0',
                svelte: '^5.0.0',
                'svelte-check': '^4.0.0',
                typescript: '^5.8.0',
                vite: '^6.3.0',
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
              extends: './.svelte-kit/tsconfig.json',
              compilerOptions: {
                allowJs: true,
                checkJs: true,
                esModuleInterop: true,
                forceConsistentCasingInFileNames: true,
                resolveJsonModule: true,
                skipLibCheck: true,
                sourceMap: true,
                strict: true,
                moduleResolution: 'bundler',
              },
            },
            null,
            2
          ) + '\n',
      },
      {
        path: 'src/web/svelte.config.js',
        content: `import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter({
      fallback: 'index.html',
    }),
  },
};

export default config;
`,
      },
      {
        path: 'src/web/vite.config.ts',
        content: `import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [sveltekit()],
});
`,
      },
      {
        path: 'src/web/src/app.d.ts',
        content: `// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
  namespace App {
    // interface Error {}
    // interface Locals {}
    // interface PageData {}
    // interface PageState {}
    // interface Platform {}
  }
}

export {};
`,
      },
      {
        path: 'src/web/src/app.html',
        content: `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    %sveltekit.head%
  </head>
  <body>
    <div style="display: contents">%sveltekit.body%</div>
  </body>
</html>
`,
      },
      {
        path: 'src/web/src/routes/+layout.svelte',
        content: `<script lang="ts">
  let { children } = $props();
</script>

{@render children()}
`,
      },
      {
        path: 'src/web/src/routes/+page.svelte',
        content: `<script lang="ts">
  import { onMount } from 'svelte';

  interface Item {
    id: number;
    title: string;
    description: string | null;
    completed: boolean;
  }

  let items = $state<Item[]>([]);
  let loading = $state(true);
  let error = $state<string | null>(null);

  onMount(async () => {
    try {
      const res = await fetch('/api/items');
      if (!res.ok) throw new Error(\`HTTP \${res.status}\`);
      items = await res.json();
    } catch (e) {
      error = e instanceof Error ? e.message : 'Unknown error';
    } finally {
      loading = false;
    }
  });
</script>

<main>
  <h1>${projectName}</h1>
  <p>Your Azure full-stack app is ready.</p>
  <nav>
    <a href="/api/health">API Health Check</a>
  </nav>

  <section class="items-section">
    <h2>Items</h2>
    {#if loading}
      <p class="items-status">Loading items...</p>
    {:else if error}
      <p class="items-status items-error">Could not load items: {error}</p>
    {:else if items.length === 0}
      <p class="items-status">No items yet. Run <code>npm run db:seed</code> to add sample data.</p>
    {:else}
      <ul class="items-grid">
        {#each items as item (item.id)}
          <li class="item-card">
            <span class="badge {item.completed ? 'badge-done' : 'badge-todo'}">
              {item.completed ? 'Done' : 'Todo'}
            </span>
            <h3>{item.title}</h3>
            {#if item.description}
              <p>{item.description}</p>
            {/if}
          </li>
        {/each}
      </ul>
    {/if}
  </section>
</main>

<style>
  *,
  *::before,
  *::after {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  :global(body) {
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
</style>
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
