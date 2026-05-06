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
        content: `<main>
  <h1>${projectName}</h1>
  <p>Your Azure full-stack app is ready.</p>
  <nav>
    <a href="/api/health">API Health Check</a>
  </nav>
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
